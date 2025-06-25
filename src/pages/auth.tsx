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
import { Loader2 } from "lucide-react";
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
            toast.success("Login successful!");
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

    const { mutate: setPasswordMutation, isPending: isSettingPassword, isError, error } = useMutation({
        mutationFn: async (password: string) => {
            console.log('Starting password update...');
            const session = await supabase.auth.getSession();
            console.log('Current user session:', session);
            
            if (!session.data.session?.user) {
                throw new Error('No authenticated user found. Please log in again.');
            }
            
            // Add a timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Password update timed out')), 10000);
            });
            
            try {
                const result = await Promise.race([
                    updateUserPassword(password),
                    timeoutPromise
                ]);
                console.log('Password update completed successfully:', result);
                return result;
            } catch (err) {
                console.error('Password update failed in mutationFn:', err);
                throw err;
            }
        },
        onSuccess: (data) => {
            console.log('Password update mutation succeeded:', data);
            toast.success("Password set successfully! Welcome to TravelEx!");
            setPasswordForm.reset();
            
            // Clear any URL parameters and navigate
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Wait a moment for the password update to be processed and then navigate
            setTimeout(() => {
                console.log('Navigating to driver dashboard...');
                navigate("/driver/dashboard", { replace: true });
            }, 1500);
        },
        onError: (error) => {
            console.error('Password update mutation failed:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            toast.error(`Failed to update password: ${error.message}`);
        },
        onSettled: (data, error) => {
            console.log('Password update mutation settled');
            console.log('Settled with data:', data);
            console.log('Settled with error:', error);
            console.log('isPending:', isSettingPassword);
        },
        retry: false, // Don't retry to avoid confusion
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
        console.log('Form submitted with data:', { password: '***' });
        console.log('Calling setPasswordMutation...');
        setPasswordMutation(data.password);
    };

    // Set the active tab based on URL mode
    useEffect(() => {
        console.log('URL mode detected:', mode);
        console.log('Current URL:', window.location.href);
        console.log('Search params:', Object.fromEntries(searchParams.entries()));
        
        if (mode === 'reset-password') {
            setActiveTab('reset-password');
        } else if (mode === 'driver-setup') {
            setActiveTab('driver-setup');
        }
    }, [mode, searchParams]);

    // Debug current authentication state
    useEffect(() => {
        const checkAuthState = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();
            console.log('Current auth session:', session);
            console.log('Auth error:', error);
            
            if (session?.user) {
                console.log('User is authenticated:', {
                    id: session.user.id,
                    email: session.user.email,
                    created_at: session.user.created_at,
                    confirmed_at: session.user.confirmed_at,
                    email_confirmed_at: session.user.email_confirmed_at
                });
            }
        };
        
        if (mode === 'driver-setup') {
            checkAuthState();
        }
    }, [mode]);

    return (
        <div className="container relative h-full flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
            {/* Left Panel */}
            <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
                <div className="absolute inset-0 bg-primary" />
                <div className="relative z-20 flex items-center text-lg font-medium">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2 h-6 w-6"
                    >
                        <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
                    </svg>
                    TravelEx
                </div>
                <div className="relative z-20 mt-auto">
                    <blockquote className="space-y-2">
                        <p className="text-lg">
                            &ldquo;This platform has streamlined my travel business and connected me with amazing passengers. Highly recommended!&rdquo;
                        </p>
                        <footer className="text-sm">Sofia Davis, TravelEx Driver</footer>
                    </blockquote>
                </div>
            </div>

            {/* Right Panel (Auth Form) */}
            <div className="lg:p-8 flex items-center justify-center">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="login">Login</TabsTrigger>
                            <TabsTrigger value="signup">Apply as Driver</TabsTrigger>
                        </TabsList>
                        <TabsContent value="login">
                            <Card>
                                <CardHeader className="text-center">
                                    <CardTitle>Welcome Back!</CardTitle>
                                    <CardDescription>
                                        Enter your credentials to access your account.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-2">
                                        <div className="space-y-1">
                                            <Label htmlFor="email">Email</Label>
                                            <Input {...loginForm.register("email")} id="email" type="email" placeholder="m@example.com" />
                                            {loginForm.formState.errors.email && <p className="text-red-500 text-xs">{loginForm.formState.errors.email.message}</p>}
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="password">Password</Label>
                                            <Input {...loginForm.register("password")} id="password" type="password" />
                                            {loginForm.formState.errors.password && <p className="text-red-500 text-xs">{loginForm.formState.errors.password.message}</p>}
                                        </div>
                                        <div className="pt-2">
                                            <Button type="submit" className="w-full" disabled={isLoggingIn}>
                                                {isLoggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Login
                                            </Button>
                                        </div>
                                        <div className="text-center">
                                            <Button 
                                                type="button" 
                                                variant="link" 
                                                onClick={() => setActiveTab('reset-password')}
                                                className="text-sm"
                                            >
                                                Forgot your password?
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="signup">
                            <Card>
                                <CardHeader className="text-center">
                                    <CardTitle>Apply to Become a Driver</CardTitle>
                                    <CardDescription>
                                        Submit your application to become a TravelEx driver. An admin will review and contact you.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-2">
                                        <div className="space-y-1">
                                            <Label htmlFor="full_name">Full Name</Label>
                                            <Input {...signupForm.register("full_name")} id="full_name" type="text" placeholder="John Doe" />
                                            {signupForm.formState.errors.full_name && <p className="text-red-500 text-xs">{signupForm.formState.errors.full_name.message}</p>}
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="email">Email</Label>
                                            <Input {...signupForm.register("email")} id="email" type="email" placeholder="m@example.com" />
                                            {signupForm.formState.errors.email && <p className="text-red-500 text-xs">{signupForm.formState.errors.email.message}</p>}
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="message">Why do you want to be a driver? (Optional)</Label>
                                            <Input {...signupForm.register("message")} id="message" type="text" placeholder="Tell us why you'd like to join as a driver..." />
                                            {signupForm.formState.errors.message && <p className="text-red-500 text-xs">{signupForm.formState.errors.message.message}</p>}
                                        </div>
                                        <div className="pt-2">
                                            <Button type="submit" className="w-full" disabled={isSigningUp}>
                                                {isSigningUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Submit Application
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="reset-password">
                            <Card>
                                <CardHeader className="text-center">
                                    <CardTitle>Reset Password</CardTitle>
                                    <CardDescription>
                                        Enter your email address and we'll send you a password reset link.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)} className="space-y-4">
                                        <div className="space-y-1">
                                            <Label htmlFor="reset-email">Email</Label>
                                            <Input {...resetPasswordForm.register("email")} id="reset-email" type="email" placeholder="m@example.com" />
                                            {resetPasswordForm.formState.errors.email && <p className="text-red-500 text-xs">{resetPasswordForm.formState.errors.email.message}</p>}
                                        </div>
                                        <div className="pt-2">
                                            <Button type="submit" className="w-full" disabled={isResettingPassword}>
                                                {isResettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Send Reset Link
                                            </Button>
                                        </div>
                                        <div className="text-center">
                                            <Button 
                                                type="button" 
                                                variant="link" 
                                                onClick={() => setActiveTab('login')}
                                                className="text-sm"
                                            >
                                                Back to Login
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="driver-setup">
                            <Card>
                                <CardHeader className="text-center">
                                    <CardTitle>Welcome to TravelEx!</CardTitle>
                                    <CardDescription>
                                        Please set your password to complete your driver account setup.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={setPasswordForm.handleSubmit(onSetPasswordSubmit)} className="space-y-4">
                                        <div className="space-y-1">
                                            <Label htmlFor="new-password">New Password</Label>
                                            <Input {...setPasswordForm.register("password")} id="new-password" type="password" />
                                            {setPasswordForm.formState.errors.password && <p className="text-red-500 text-xs">{setPasswordForm.formState.errors.password.message}</p>}
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="confirm-password">Confirm Password</Label>
                                            <Input {...setPasswordForm.register("confirmPassword")} id="confirm-password" type="password" />
                                            {setPasswordForm.formState.errors.confirmPassword && <p className="text-red-500 text-xs">{setPasswordForm.formState.errors.confirmPassword.message}</p>}
                                        </div>
                                        <div className="pt-2 space-y-2">
                                            <Button type="submit" className="w-full" disabled={isSettingPassword}>
                                                {isSettingPassword ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Setting Password...
                                                    </>
                                                ) : (
                                                    "Set Password & Continue"
                                                )}
                                            </Button>
                                            {isError && (
                                                <div className="text-center">
                                                    <p className="text-red-500 text-sm mb-2">
                                                        Failed to update password. Please try again.
                                                    </p>
                                                    <Button 
                                                        type="button" 
                                                        variant="outline" 
                                                        size="sm"
                                                        onClick={() => {
                                                            const formData = setPasswordForm.getValues();
                                                            if (formData.password && formData.confirmPassword) {
                                                                setPasswordMutation(formData.password);
                                                            }
                                                        }}
                                                        disabled={isSettingPassword}
                                                    >
                                                        Retry
                                                    </Button>
                                                </div>
                                            )}
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