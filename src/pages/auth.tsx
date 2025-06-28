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
import { signIn, signUp, resetPassword, updateUserPassword } from "@/services/auth";
import { createSignupRequest } from "@/services/signup-requests";
import { supabase } from "@/services/supabase";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Car, Shield, CheckCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";

const signupFormSchema = z.object({
    full_name: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.string().email(),
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
    const { user, isLoading } = useAuth();
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode');
    const [activeTab, setActiveTab] = useState("login");

    useEffect(() => {
        if (user && !isLoading) {
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
    }, [user, isLoading, navigate]);

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
        mutationFn: signIn,
        onSuccess: () => {
            toast.success("Welcome back to TravelEx!");
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const { mutate: signupMutation, isPending: isSigningUp } = useMutation({
        mutationFn: createSignupRequest,
        onSuccess: () => {
            toast.success("Application submitted successfully! An admin will review your request and send you an invitation if approved.");
            signupForm.reset();
        },
        onError: (error) => {
            if (error instanceof Error) {
                if (error.message.includes("duplicate key")) {
                    toast.error("An application with this email already exists.");
                } else {
                    toast.error(error.message);
                }
            }
        },
    });

    const { mutate: resetPasswordMutation, isPending: isResettingPassword } = useMutation({
        mutationFn: resetPassword,
        onSuccess: () => {
            toast.success("Password reset email sent! Please check your inbox.");
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const { mutate: setPasswordMutation, isPending: isSettingPassword } = useMutation({
        mutationFn: updateUserPassword,
        onSuccess: () => {
            toast.success("Password set successfully! Welcome to TravelEx!");
            setPasswordForm.reset();
            
            // Clear any URL parameters and navigate
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Navigate immediately
            navigate("/driver/dashboard", { replace: true });
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
        resetPasswordMutation(data.email);
    };

    const onSetPasswordSubmit = (data: SetPasswordFormData) => {
        setPasswordMutation(data.password);
    };

    // Set the active tab based on URL mode
    useEffect(() => {
        if (mode === 'reset-password') {
            setActiveTab('reset-password');
        } else if (mode === 'driver-setup') {
            setActiveTab('driver-setup');
        }
    }, [mode]);

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

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList>
                            <TabsTrigger value="login">
                                Sign In
                            </TabsTrigger>
                            <TabsTrigger value="signup">
                                Apply as Driver
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="login" className="space-y-4">
                            <Card className="premium-card border-0 shadow-premium">
                                <CardHeader className="text-center space-y-2 pb-6">
                                    <CardTitle className="font-heading text-2xl text-foreground">Welcome Back</CardTitle>
                                    <CardDescription className="text-muted-foreground">
                                        Sign in to your TravelEx account
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                                            <Input 
                                                {...loginForm.register("email")} 
                                                id="login-email" 
                                                type="email" 
                                                placeholder="your@email.com"
                                                className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                                            />
                                            {loginForm.formState.errors.email && (
                                                <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
                                            <Input 
                                                {...loginForm.register("password")} 
                                                id="login-password" 
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
                                                className="w-full h-11 bg-brand-orange hover:bg-brand-orange-600 text-white shadow-brand hover:shadow-brand-hover transition-all font-medium"
                                            >
                                                {isLoggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Sign In
                                            </Button>
                                        </div>
                                    </form>
                                    
                                    <div className="text-center">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('reset-password')}
                                            className="text-sm text-brand-orange hover:text-brand-orange/80 transition-colors font-medium"
                                        >
                                            Forgot your password?
                                        </button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="signup" className="space-y-4">
                            <Card className="premium-card border-0 shadow-premium">
                                <CardHeader className="text-center space-y-2 pb-6">
                                    <CardTitle className="font-heading text-2xl text-foreground">Apply to Become a Driver</CardTitle>
                                    <CardDescription className="text-muted-foreground">
                                        Submit your application to become a TravelEx driver. An admin will review and contact you.
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
                                                Submit Application
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="reset-password" className="space-y-4">
                            <Card className="premium-card border-0 shadow-premium">
                                <CardHeader className="text-center space-y-2 pb-6">
                                    <CardTitle className="font-heading text-2xl text-foreground">Reset Password</CardTitle>
                                    <CardDescription className="text-muted-foreground">
                                        Enter your email address and we'll send you a password reset link.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <form onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="reset-email" className="text-sm font-medium">Email</Label>
                                            <Input 
                                                {...resetPasswordForm.register("email")} 
                                                id="reset-email" 
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
                                                className="w-full h-11 bg-brand-orange hover:bg-brand-orange-600 text-white shadow-brand hover:shadow-brand-hover transition-all font-medium"
                                             >
                                                {isResettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Send Reset Link
                                            </Button>
                                        </div>
                                    </form>
                                    
                                    <div className="text-center">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('login')}
                                            className="text-sm text-brand-orange hover:text-brand-orange/80 transition-colors font-medium"
                                        >
                                            Back to Login
                                        </button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="driver-setup" className="space-y-4">
                            <Card className="premium-card border-0 shadow-premium">
                                <CardHeader className="text-center space-y-2 pb-6">
                                    <CardTitle className="font-heading text-2xl text-foreground">Welcome to TravelEx!</CardTitle>
                                    <CardDescription className="text-muted-foreground">
                                        Please set your password to complete your driver account setup.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <form onSubmit={setPasswordForm.handleSubmit(onSetPasswordSubmit)} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="new-password" className="text-sm font-medium">New Password</Label>
                                            <Input 
                                                {...setPasswordForm.register("password")} 
                                                id="new-password" 
                                                type="password"
                                                className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                                            />
                                            {setPasswordForm.formState.errors.password && (
                                                <p className="text-xs text-destructive">{setPasswordForm.formState.errors.password.message}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirm-password" className="text-sm font-medium">Confirm Password</Label>
                                            <Input 
                                                {...setPasswordForm.register("confirmPassword")} 
                                                id="confirm-password" 
                                                type="password"
                                                className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                                            />
                                            {setPasswordForm.formState.errors.confirmPassword && (
                                                <p className="text-xs text-destructive">{setPasswordForm.formState.errors.confirmPassword.message}</p>
                                            )}
                                        </div>
                                        <div className="pt-2 space-y-2">
                                            <Button 
                                                type="submit" 
                                                disabled={isSettingPassword} 
                                                className="w-full h-11 bg-brand-orange hover:bg-brand-orange-600 text-white shadow-brand hover:shadow-brand-hover transition-all font-medium"
                                            >
                                                {isSettingPassword ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Setting Password...
                                                    </>
                                                ) : (
                                                    "Set Password & Continue"
                                                )}
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
} 