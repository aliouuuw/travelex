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
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";

const signupFormSchema = z.object({
    full_name: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
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
            password: "",
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
        mutationFn: signUp,
        onSuccess: () => {
            toast.success("Account created successfully! Please check your email to verify.");
        },
        onError: (error) => {
            if (error instanceof Error) {
                if (error.message.includes("User already registered")) {
                    toast.error("An account with this email already exists. Please log in.");
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
        mutationFn: (password: string) => updateUserPassword(password),
        onSuccess: () => {
            toast.success("Password set successfully!");
            navigate("/driver/dashboard");
        },
        onError: (error) => {
            toast.error(error.message);
        },
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
                            <TabsTrigger value="signup">Sign Up</TabsTrigger>
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
                                    <CardTitle>Create an Account</CardTitle>
                                    <CardDescription>
                                        Enter your details below to create your account.
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
                                            <Label htmlFor="password">Password</Label>
                                            <Input {...signupForm.register("password")} id="password" type="password" />
                                            {signupForm.formState.errors.password && <p className="text-red-500 text-xs">{signupForm.formState.errors.password.message}</p>}
                                        </div>
                                        <div className="pt-2">
                                            <Button type="submit" className="w-full" disabled={isSigningUp}>
                                                {isSigningUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Create Account
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
                                        <div className="pt-2">
                                            <Button type="submit" className="w-full" disabled={isSettingPassword}>
                                                {isSettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Set Password & Continue
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