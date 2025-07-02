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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useConvexAuth } from "@/services/convex/auth";
import { useCreateSignupRequest } from "@/services/convex/signup-requests";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Car, Shield, CheckCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";

const signupFormSchema = z.object({
    full_name: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.string().email(),
    password: z.string().optional(),
    message: z.string().optional(),
});

const loginFormSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

const resetPasswordFormSchema = z.object({
    email: z.string().email(),
});

const setPasswordFormSchema = z.object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupFormSchema>;
type LoginFormData = z.infer<typeof loginFormSchema>;
type ResetPasswordFormData = z.infer<typeof resetPasswordFormSchema>;
type SetPasswordFormData = z.infer<typeof setPasswordFormSchema>;

export default function AuthPage() {
    const navigate = useNavigate();
    const { user, isLoading, isPasswordSetup } = useAuth();
    const { signIn: convexSignIn, signUp: convexSignUp, isFirstUser, adminSignUp } = useConvexAuth();
    const createSignupRequestMutation = useCreateSignupRequest();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState("login");

    useEffect(() => {
        if (user && !isLoading) {
            if (!isPasswordSetup) {
                setActiveTab('driver-setup');
                return;
            }
            const role = user.profile?.role;
            switch (role) {
                case "admin":
                    navigate("/admin/dashboard");
                    break;
                case "driver":
                    navigate("/driver/dashboard");
                    break;
                default:
                    navigate("/dashboard");
                    break;
            }
        }
    }, [user, isLoading, isPasswordSetup, navigate]);

    const loginForm = useForm<LoginFormData>({
        resolver: zodResolver(loginFormSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const signupForm = useForm<SignupFormData>({
        resolver: zodResolver(signupFormSchema),
        defaultValues: {
            full_name: "",
            email: "",
            password: "",
            message: "",
        },
    });

    const resetPasswordForm = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordFormSchema),
        defaultValues: {
            email: "",
        },
    });

    const setPasswordForm = useForm<SetPasswordFormData>({
        resolver: zodResolver(setPasswordFormSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    const { mutate: loginMutation, isPending: isLoggingIn } = useMutation({
        mutationFn: async (data: LoginFormData) => {
            return await convexSignIn(data);
        },
        onSuccess: () => {
            toast.success("Welcome back to TravelEx!");
        },
        onError: (error) => {
            if (error.message.includes("InvalidAccountId")) {
                toast.error("Invalid account. Please try again.");
            } else if (error.message.includes("InvalidSecret")) {
                toast.error("Invalid password. Please try again."); 
            } else {
                console.error(error);
                toast.error("An error occurred. Please enter valid credentials and try again.");
            }
        },
    });

    const { mutate: signupMutation, isPending: isSigningUp } = useMutation({
        mutationFn: async (data: SignupFormData) => {
            if (isFirstUser) {
                // First user gets to create account directly and becomes admin
                if (!data.password || data.password.length < 8) {
                    throw new Error("Password must be at least 8 characters for admin signup");
                }
                return await adminSignUp({
                    email: data.email,
                    password: data.password,
                    full_name: data.full_name,
                });
            } else {
                // Subsequent users submit signup requests
                return await createSignupRequestMutation({
                    fullName: data.full_name,
                    email: data.email,
                });
            }
        },
        onSuccess: () => {
            if (isFirstUser) {
                toast.success("Admin account created successfully! Welcome to TravelEx!");
            } else {
                toast.success("Application submitted successfully! An admin will review your request and send you an invitation if approved.");
            }
            signupForm.reset();
        },
        onError: (error) => {
            if (error instanceof Error) {
                if (error.message.includes("already exists")) {
                    toast.error("An application with this email already exists.");
                } else {
                    toast.error(error.message);
                }
            }
        },
    });

    const { mutate: resetPasswordMutation, isPending: isResettingPassword } = useMutation({
        mutationFn: async (data: ResetPasswordFormData) => {
            // TODO: Implement password reset with Convex Auth - will use data.email when implemented
            console.log('Reset password requested for:', data.email);
            throw new Error("Password reset not yet implemented for Convex");
        },
        onSuccess: () => {
            toast.success("Password reset email sent! Please check your inbox.");
            resetPasswordForm.reset();
            setActiveTab('login');
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const { mutate: setPasswordMutation, isPending: isSettingPassword } = useMutation({
        mutationFn: async (data: SetPasswordFormData) => {
            if (!user) {
                throw new Error("No user found");
            }
            
            await convexSignUp({
                email: user.email,
                password: data.password,
                full_name: user.profile?.fullName || '',
            });
        },
        onSuccess: () => {
            toast.success("Password set successfully! Welcome to TravelEx!");
            setPasswordForm.reset();
            
            // Clear any URL parameters and navigate
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Navigate based on user role
            if (user?.profile?.role === 'driver') {
                navigate("/driver/dashboard", { replace: true });
            } else {
                navigate("/dashboard", { replace: true });
            }
        },
        onError: (error) => {
            console.error('Password update failed:', error);
            toast.error(`Failed to update password: ${error.message}`);
        },
        retry: false,
    });

    const onLoginSubmit = (data: LoginFormData) => {
        loginMutation(data);
    };

    const onSignupSubmit = (data: SignupFormData) => {
        signupMutation(data);
    };

    const onResetPasswordSubmit = (data: ResetPasswordFormData) => {
        resetPasswordMutation(data);
    };

    const onSetPasswordSubmit = (data: SetPasswordFormData) => {
        setPasswordMutation(data);
    };

    // Set the active tab based on URL mode or password status
    useEffect(() => {
        const mode = searchParams.get('mode');
        if (mode === 'reset-password') {
            setActiveTab('reset-password');
        } else if (user && !isPasswordSetup) {
            setActiveTab('driver-setup');
        }
    }, [searchParams, user, isPasswordSetup]);

    // Determine which view to show
    const showPasswordSetup = user && !isPasswordSetup;

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            {/* Left Panel - Brand & Testimonial */}
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
                            Premium Inter-City Travel Platform
                        </h1>
                        <p className="text-lg text-white/90 leading-relaxed">
                            Join our network of professional drivers or experience seamless travel with verified, quality service.
                        </p>
                    </div>

                    <div className="space-y-4 pt-8">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-white/90" />
                            <span className="text-white/90">Verified professional drivers</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Shield className="w-5 h-5 text-white/90" />
                            <span className="text-white/90">Secure payment processing</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-white/90" />
                            <span className="text-white/90">Premium customer service</span>
                        </div>
                    </div>
                </div>

                <blockquote className="space-y-4">
                    <p className="text-lg italic text-white/95">
                        "TravelEx has transformed my driving business. The platform is intuitive, 
                        the support is excellent, and I've connected with amazing passengers."
                    </p>
                    <footer className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                            <span className="text-sm font-semibold">SD</span>
                        </div>
                        <div>
                            <div className="font-medium">Sofia Davis</div>
                            <div className="text-sm text-white/80">Professional Driver</div>
                        </div>
                    </footer>
                </blockquote>
            </div>

            {/* Right Panel - Auth Forms */}
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

                    {showPasswordSetup ? (
                        <Card className="premium-card border-0 shadow-premium">
                            <CardHeader className="text-center space-y-2 pb-6">
                                <CardTitle className="font-heading text-2xl text-foreground">Set Your Password</CardTitle>
                                <CardDescription className="text-muted-foreground">
                                    Welcome! To secure your account, please create a new password.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={setPasswordForm.handleSubmit(onSetPasswordSubmit)} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="password">New Password</Label>
                                        <Input
                                            {...setPasswordForm.register("password")}
                                            id="password"
                                            type="password"
                                            placeholder="••••••••"
                                            className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                                        />
                                        {setPasswordForm.formState.errors.password && (
                                            <p className="text-xs text-destructive">
                                                {setPasswordForm.formState.errors.password.message}
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                        <Input
                                            {...setPasswordForm.register("confirmPassword")}
                                            id="confirmPassword"
                                            type="password"
                                            placeholder="••••••••"
                                            className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                                        />
                                        {setPasswordForm.formState.errors.confirmPassword && (
                                            <p className="text-xs text-destructive">
                                                {setPasswordForm.formState.errors.confirmPassword.message}
                                            </p>
                                        )}
                                    </div>
                                    <div className="pt-2">
                                        <Button
                                            type="submit"
                                            disabled={isSettingPassword}
                                            className="w-full h-11 bg-brand-orange hover:bg-brand-orange-600 text-white shadow-brand hover:shadow-brand-hover transition-all font-medium"
                                        >
                                            {isSettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Set Password & Continue
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    ) : (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="login">Login</TabsTrigger>
                                <TabsTrigger value="signup">{isFirstUser ? "Create Admin Account" : "Driver Application"}</TabsTrigger>
                            </TabsList>
                            <TabsContent value="login">
                                <Card className="premium-card border-0 shadow-premium">
                                    <CardHeader className="text-center space-y-2 pb-6">
                                        <CardTitle className="font-heading text-2xl text-foreground">Driver Login</CardTitle>
                                        <CardDescription className="text-muted-foreground">
                                            Enter your credentials to access your driver dashboard.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="email">Email</Label>
                                                <Input
                                                    {...loginForm.register("email")}
                                                    id="email"
                                                    type="email"
                                                    placeholder="m@example.com"
                                                    className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                                                />
                                                {loginForm.formState.errors.email && (
                                                    <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor="password">Password</Label>
                                                    <a
                                                        href="#"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setActiveTab('reset-password');
                                                        }}
                                                        className="text-sm font-medium text-brand-orange hover:underline"
                                                    >
                                                        Forgot password?
                                                    </a>
                                                </div>
                                                <Input
                                                    {...loginForm.register("password")}
                                                    id="password"
                                                    type="password"
                                                    className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                                                />
                                                {loginForm.formState.errors.password && (
                                                    <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                                                )}
                                            </div>
                                            <div className="pt-2">
                                                <Button
                                                    type="submit"
                                                    disabled={isLoggingIn}
                                                    className="w-full h-11 bg-brand-dark-blue hover:bg-brand-dark-blue/90 text-white shadow-lg"
                                                >
                                                    {isLoggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    Sign In
                                                </Button>
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="signup">
                                <Card className="premium-card border-0 shadow-premium">
                                    <CardHeader className="text-center space-y-2 pb-6">
                                        <CardTitle className="font-heading text-2xl text-foreground">
                                            {isFirstUser ? "Create Admin Account" : "Apply to Become a Driver"}
                                        </CardTitle>
                                        <CardDescription className="text-muted-foreground">
                                            {isFirstUser 
                                                ? "As the first user, you'll become the system administrator with full access."
                                                : "Submit your application to become a TravelEx driver. An admin will review and contact you."
                                            }
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="full_name" className="text-sm font-medium">Full Name</Label>
                                                <Input
                                                    {...signupForm.register("full_name")}
                                                    id="full_name"
                                                    type="text"
                                                    placeholder="John Doe"
                                                    className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                                                />
                                                {signupForm.formState.errors.full_name && (
                                                    <p className="text-xs text-destructive">{signupForm.formState.errors.full_name.message}</p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                                                <Input
                                                    {...signupForm.register("email")}
                                                    id="email"
                                                    type="email"
                                                    placeholder="m@example.com"
                                                    className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                                                />
                                                {signupForm.formState.errors.email && (
                                                    <p className="text-xs text-destructive">{signupForm.formState.errors.email.message}</p>
                                                )}
                                            </div>
                                            {isFirstUser && (
                                                <div className="space-y-2">
                                                    <Label htmlFor="signup_password" className="text-sm font-medium">Password</Label>
                                                    <Input
                                                        {...signupForm.register("password")}
                                                        id="signup_password"
                                                        type="password"
                                                        placeholder="••••••••"
                                                        className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                                                    />
                                                    {signupForm.formState.errors.password && (
                                                        <p className="text-xs text-destructive">{signupForm.formState.errors.password.message}</p>
                                                    )}
                                                    <p className="text-xs text-muted-foreground">
                                                        As the first user, you'll become the admin. Choose a strong password (min 8 characters).
                                                    </p>
                                                </div>
                                            )}
                                            <div className="space-y-2">
                                                <Label htmlFor="message" className="text-sm font-medium">Why do you want to be a driver? (Optional)</Label>
                                                <Input
                                                    {...signupForm.register("message")}
                                                    id="message"
                                                    type="text"
                                                    placeholder="Tell us why you'd like to join as a driver..."
                                                    className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                                                />
                                                {signupForm.formState.errors.message && (
                                                    <p className="text-xs text-destructive">{signupForm.formState.errors.message.message}</p>
                                                )}
                                            </div>
                                            <div className="pt-2">
                                                                                             <Button
                                                    type="submit"
                                                    disabled={isSigningUp}
                                                    className="w-full h-11 bg-brand-orange hover:bg-brand-orange-600 text-white shadow-brand hover:shadow-brand-hover transition-all font-medium"
                                                 >
                                                    {isSigningUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    {isFirstUser ? "Create Admin Account" : "Submit Application"}
                                                </Button>
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="reset-password">
                                <Card className="premium-card border-0 shadow-premium">
                                    <CardHeader className="text-center space-y-2 pb-6">
                                        <CardTitle className="font-heading text-2xl text-foreground">Reset Password</CardTitle>
                                        <CardDescription className="text-muted-foreground">
                                            Enter your email and we'll send you a link to reset your password.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="email">Email</Label>
                                                <Input
                                                    {...resetPasswordForm.register("email")}
                                                    id="email"
                                                    type="email"
                                                    placeholder="m@example.com"
                                                    className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                                                />
                                                {resetPasswordForm.formState.errors.email && (
                                                    <p className="text-xs text-destructive">{resetPasswordForm.formState.errors.email.message}</p>
                                                )}
                                            </div>
                                            <div className="pt-2">
                                                <Button
                                                    type="submit"
                                                    disabled={isResettingPassword}
                                                    className="w-full h-11 bg-brand-dark-blue hover:bg-brand-dark-blue/90 text-white"
                                                >
                                                    {isResettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    Send Reset Link
                                                </Button>
                                            </div>
                                        </form>
                                        <div className="mt-4 text-center text-sm">
                                            <a
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setActiveTab('login');
                                                }}
                                                className="font-medium text-brand-orange hover:underline"
                                            >
                                                Back to Login
                                            </a>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    )}
                </div>
            </div>
        </div>
    );
} 