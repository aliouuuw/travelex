import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, AlertTriangle, Car, Shield } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { 
  useValidateInvitationToken, 
  useGetInvitationByToken, 
  useCreateProfileFromInvitation
} from "@/services/convex/signup-requests";
import { useConvexAuth } from "@/services/convex/auth";

const signupFormSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupFormSchema>;

export default function InvitationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [isValidating, setIsValidating] = useState(true);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    error?: string;
    invitation?: {
      email: string;
      fullName: string;
      role: string;
    };
  } | null>(null);

  const { signUp, currentUser, isAuthenticated } = useConvexAuth();
  const createProfileFromInvitationHook = useCreateProfileFromInvitation();

  const { mutate: createProfile, isPending: isCreatingProfile } = useMutation({
    mutationFn: async (data: { token: string }) => {
      return await createProfileFromInvitationHook(data);
    },
  });

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Validate token on component mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setValidationResult({
          valid: false,
          error: "No invitation token provided",
        });
        setIsValidating(false);
        return;
      }

      try {
        setIsValidating(false);
      } catch (error) {
        console.error("Error validating token:", error);
        setValidationResult({
          valid: false,
          error: "Failed to validate invitation token",
        });
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  // Watch for authentication state change after signup
  useEffect(() => {
    if (isSigningUp && isAuthenticated && currentUser && !currentUser.profile && token) {
      // User is authenticated but doesn't have a profile yet, create it
      createProfile(
        { token },
        {
          onSuccess: () => {
            toast.success(`Welcome to TravelEx, ${validationResult?.invitation?.fullName}!`);
            
            // Navigate based on role
            if (validationResult?.invitation?.role === "admin") {
              navigate("/admin/dashboard");
            } else if (validationResult?.invitation?.role === "driver") {
              navigate("/driver/dashboard");
            } else {
              navigate("/dashboard");
            }
            setIsSigningUp(false);
          },
          onError: (error) => {
            console.error("Profile creation failed:", error);
            toast.error("Failed to create profile");
            setIsSigningUp(false);
          },
        }
      );
    }
  }, [isSigningUp, isAuthenticated, currentUser, token, createProfile, navigate, validationResult]);

  const handleAcceptInvitation = async (data: SignupFormData) => {
    if (!token || !validationResult?.invitation) {
      toast.error("Invalid invitation token");
      return;
    }

    try {
      setIsSigningUp(true);
      
      // Create the user account with Convex Auth
      await signUp({
        email: validationResult.invitation.email,
        password: data.password,
        full_name: validationResult.invitation.fullName,
      });

      // Profile creation will be handled in useEffect when auth state updates
      
    } catch (error) {
      console.error("Signup failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create account");
      setIsSigningUp(false);
    }
  };

  // Use hooks with token parameter
  const tokenValidation = useValidateInvitationToken(token ? { token } : undefined);
  const invitationData = useGetInvitationByToken(token ? { token } : undefined);

  // Update validation result when hook data changes
  useEffect(() => {
    if (token && tokenValidation !== undefined) {
      setValidationResult(tokenValidation);
      setIsValidating(false);
    }
  }, [tokenValidation, token]);

  if (!token) {
    return (
      <div className="min-h-screen grid lg:grid-cols-2">
        {/* Left Panel - Brand */}
        <div className="relative hidden lg:flex flex-col justify-between p-12 bg-brand-dark-blue text-white">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm">
                <Car className="w-7 h-7 text-white" />
              </div>
              <span className="font-heading text-2xl font-bold">TravelEx</span>
            </div>
            <div className="space-y-4">
              <h1 className="font-heading text-4xl font-bold leading-tight">
                Professional Travel Network
              </h1>
              <p className="text-lg text-white/90 leading-relaxed">
                Join our community of verified drivers and experience premium transportation services.
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel - Error */}
        <div className="flex items-center justify-center p-6 lg:p-12 bg-background">
          <div className="w-full max-w-md">
            <Card className="premium-card border-0 shadow-premium">
              <CardHeader className="text-center space-y-2 pb-6">
                <div className="flex justify-center mb-4">
                  <AlertTriangle className="h-12 w-12 text-red-500" />
                </div>
                <CardTitle className="font-heading text-2xl text-foreground">Invalid Invitation</CardTitle>
                <CardDescription className="text-muted-foreground">
                  No invitation token was provided in the URL.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate("/auth")} 
                  className="w-full h-11 bg-brand-orange hover:bg-brand-orange-600 text-white shadow-brand hover:shadow-brand-hover transition-all font-medium"
                >
                  Go to Login
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (isValidating) {
    return (
      <div className="min-h-screen grid lg:grid-cols-2">
        {/* Left Panel - Brand */}
        <div className="relative hidden lg:flex flex-col justify-between p-12 bg-brand-dark-blue text-white">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm">
                <Car className="w-7 h-7 text-white" />
              </div>
              <span className="font-heading text-2xl font-bold">TravelEx</span>
            </div>
            <div className="space-y-4">
              <h1 className="font-heading text-4xl font-bold leading-tight">
                Professional Travel Network
              </h1>
              <p className="text-lg text-white/90 leading-relaxed">
                Join our community of verified drivers and experience premium transportation services.
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel - Loading */}
        <div className="flex items-center justify-center p-6 lg:p-12 bg-background">
          <div className="w-full max-w-md">
            <Card className="premium-card border-0 shadow-premium">
              <CardContent className="p-6">
                <div className="flex flex-col items-center gap-4 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
                  <p className="text-muted-foreground">Validating your invitation...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!validationResult?.valid) {
    return (
      <div className="min-h-screen grid lg:grid-cols-2">
        {/* Left Panel - Brand */}
        <div className="relative hidden lg:flex flex-col justify-between p-12 bg-brand-dark-blue text-white">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm">
                <Car className="w-7 h-7 text-white" />
              </div>
              <span className="font-heading text-2xl font-bold">TravelEx</span>
            </div>
            <div className="space-y-4">
              <h1 className="font-heading text-4xl font-bold leading-tight">
                Professional Travel Network
              </h1>
              <p className="text-lg text-white/90 leading-relaxed">
                Join our community of verified drivers and experience premium transportation services.
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel - Error */}
        <div className="flex items-center justify-center p-6 lg:p-12 bg-background">
          <div className="w-full max-w-md">
            <Card className="premium-card border-0 shadow-premium">
              <CardHeader className="text-center space-y-2 pb-6">
                <div className="flex justify-center mb-4">
                  <AlertTriangle className="h-12 w-12 text-red-500" />
                </div>
                <CardTitle className="font-heading text-2xl text-foreground">Invalid Invitation</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {validationResult?.error || "This invitation is no longer valid."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate("/auth")} 
                  className="w-full h-11 bg-brand-orange hover:bg-brand-orange-600 text-white shadow-brand hover:shadow-brand-hover transition-all font-medium"
                >
                  Go to Login
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const invitation = invitationData || validationResult.invitation;

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Panel - Brand & Features */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-brand-dark-blue text-white">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm">
              <Car className="w-7 h-7 text-white" />
            </div>
            <span className="font-heading text-2xl font-bold">TravelEx</span>
          </div>
          
          <div className="space-y-4">
            <h1 className="font-heading text-4xl font-bold leading-tight">
              Welcome to TravelEx!
            </h1>
            <p className="text-lg text-white/90 leading-relaxed">
              Join our network of professional drivers and experience seamless travel with verified, quality service.
            </p>
          </div>

          <div className="space-y-4 pt-8">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-white/90" />
              <span className="text-white/90">Verified professional drivers</span>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-white/90" />
              <span className="text-white/90">Secure account setup</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-white/90" />
              <span className="text-white/90">Premium customer service</span>
            </div>
          </div>
        </div>

        <blockquote className="space-y-4">
          <p className="text-lg italic text-white/95">
            "Welcome aboard! You're joining a professional network that values quality, safety, and exceptional service."
          </p>
          <footer className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-sm font-semibold">TX</span>
            </div>
            <div>
              <div className="font-medium">TravelEx Team</div>
              <div className="text-sm text-white/80">Professional Network</div>
            </div>
          </footer>
        </blockquote>
      </div>

      {/* Right Panel - Invitation Form */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md space-y-6 animate-slide-up">
          <div className="text-center space-y-2 lg:hidden">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-orange">
                <Car className="w-5 h-5 text-white" />
              </div>
              <span className="font-heading text-xl font-bold text-brand-dark-blue">TravelEx</span>
            </div>
          </div>

          <Card className="premium-card border-0 shadow-premium">
            <CardHeader className="text-center space-y-2 pb-6">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <CardTitle className="font-heading text-2xl text-foreground">Complete Your Setup</CardTitle>
              <CardDescription className="text-muted-foreground">
                Create your password to get started as a {invitation?.role}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="text-sm text-orange-800 space-y-1">
                  <p><strong>Name:</strong> {invitation?.fullName}</p>
                  <p><strong>Email:</strong> {invitation?.email}</p>
                  <p><strong>Role:</strong> {invitation?.role}</p>
                </div>
              </div>

              <form onSubmit={form.handleSubmit(handleAcceptInvitation)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Create Password</Label>
                  <Input
                    {...form.register("password")}
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                  />
                  {form.formState.errors.password && (
                    <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                  <Input
                    {...form.register("confirmPassword")}
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                  />
                  {form.formState.errors.confirmPassword && (
                    <p className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <div className="pt-2">
                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-brand-orange hover:bg-brand-orange-600 text-white shadow-brand hover:shadow-brand-hover transition-all font-medium"
                    disabled={isSigningUp || isCreatingProfile}
                  >
                                          {isSigningUp || isCreatingProfile ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {isSigningUp ? "Creating account..." : "Setting up profile..."}
                        </>
                      ) : (
                        "Complete Setup"
                      )}
                  </Button>
                </div>
              </form>

              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Button variant="link" onClick={() => navigate("/auth")} className="p-0 h-auto text-brand-orange hover:text-brand-orange-600">
                  Sign in here
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 