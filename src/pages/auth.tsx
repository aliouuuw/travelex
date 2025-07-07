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
import { useAuthActions } from "@convex-dev/auth/react";
import { useCreateSignupRequest } from "@/services/convex/signup-requests";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Car, Shield, CheckCircle, Eye, EyeOff, Check, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";

const passwordSchema = z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const signupFormSchema = z.object({
    full_name: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.string().email(),
    password: passwordSchema.optional(),
    message: z.string().optional(),
});

const loginFormSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

const resetRequestFormSchema = z.object({
    email: z.string().email(),
});

const resetCodeFormSchema = z.object({
    code: z.string().min(1, "Code is required"),
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

const setPasswordFormSchema = z.object({
    password: passwordSchema,
    confirmPassword: passwordSchema,
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupFormSchema>;
type LoginFormData = z.infer<typeof loginFormSchema>;
type ResetRequestFormData = z.infer<typeof resetRequestFormSchema>;
type ResetCodeFormData = z.infer<typeof resetCodeFormSchema>;
type SetPasswordFormData = z.infer<typeof setPasswordFormSchema>;

// Password Input Component with show/hide functionality
const PasswordInput = ({ 
    register, 
    name, 
    placeholder, 
    error, 
    showPassword, 
    setShowPassword,
    ...props 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}: any) => (
    <div className="relative">
        <Input
            {...register(name)}
            type={showPassword ? "text" : "password"}
            placeholder={placeholder}
            className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20 pr-10"
            {...props}
        />
        <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        {error && (
            <p className="text-xs text-destructive mt-1">{error}</p>
        )}
    </div>
);

// Password Match Indicator Component
const PasswordMatchIndicator = ({ password, confirmPassword }: { password: string; confirmPassword: string }) => {
    if (!password || !confirmPassword) return null;
    
    const matches = password === confirmPassword;
    return (
        <div className={`flex items-center gap-2 text-xs mt-1 ${matches ? 'text-green-600' : 'text-red-500'}`}>
            {matches ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            <span>{matches ? 'Passwords match' : 'Passwords do not match'}</span>
        </div>
    );
};

// Password Requirements Indicator Component
const PasswordRequirements = ({ password }: { password: string }) => {
    if (!password) return null;
    
    const requirements = [
        { test: password.length >= 8, text: 'At least 8 characters' },
        { test: /[A-Z]/.test(password), text: 'One uppercase letter' },
        { test: /[0-9]/.test(password), text: 'One number' },
        { test: /[^A-Za-z0-9]/.test(password), text: 'One special character' },
    ];
    
    return (
        <div className="text-xs mt-1 space-y-1">
            {requirements.map((req, index) => (
                <div key={index} className={`flex items-center gap-2 ${req.test ? 'text-green-600' : 'text-gray-400'}`}>
                    {req.test ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    <span>{req.text}</span>
                </div>
            ))}
        </div>
    );
};

export default function AuthPage() {
    const navigate = useNavigate();
    const { user, isLoading, isPasswordSetup } = useAuth();
    const { signIn: convexSignIn, signUp: convexSignUp, isFirstUser, adminSignUp } = useConvexAuth();
    const { signIn } = useAuthActions();
    const createSignupRequestMutation = useCreateSignupRequest();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState("login");
    const [resetStep, setResetStep] = useState<"forgot" | { email: string }>("forgot");
    
    // Password visibility states
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [showSignupPassword, setShowSignupPassword] = useState(false);
    const [showSetPassword, setShowSetPassword] = useState(false);
    const [showSetConfirmPassword, setShowSetConfirmPassword] = useState(false);
    const [showResetNewPassword, setShowResetNewPassword] = useState(false);
    const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);

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
            message: "",
        },
    });

    const resetRequestForm = useForm<ResetRequestFormData>({
        resolver: zodResolver(resetRequestFormSchema),
        defaultValues: {
            email: "",
        },
    });

    const resetCodeForm = useForm<ResetCodeFormData>({
        resolver: zodResolver(resetCodeFormSchema),
        defaultValues: {
            code: "",
            newPassword: "",
            confirmPassword: "",
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
                if (!data.password) {
                    throw new Error("Password is required for admin signup");
                }
                // Validate password strength
                const passwordValidation = passwordSchema.safeParse(data.password);
                if (!passwordValidation.success) {
                    throw new Error(passwordValidation.error.errors[0].message);
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
                    message: data.message,
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

    // Password reset step 1: Request reset code
    const { mutate: resetRequestMutation, isPending: isRequestingReset } = useMutation({
        mutationFn: async (data: ResetRequestFormData) => {
            const formData = new FormData();
            formData.append("email", data.email);
            formData.append("flow", "reset");
            await signIn("password", formData);
        },
        onSuccess: (_, variables) => {
            toast.success("Reset code sent! Please check your email.");
            setResetStep({ email: variables.email });
            resetRequestForm.reset();
        },
        onError: (error) => {
            if (error.message.includes("InvalidAccountId")) {
                toast.error("Invalid account. Please try again.");
            } else {
                console.error(error);
                toast.error("An error occurred. Please enter valid credentials and try again.");
            } 
        },
    });

    // Password reset step 2: Verify code and set new password
    const { mutate: resetCodeMutation, isPending: isResettingPassword } = useMutation({
        mutationFn: async (data: ResetCodeFormData) => {
            if (resetStep === "forgot") throw new Error("Invalid reset state");
            
            const formData = new FormData();
            formData.append("email", resetStep.email);
            formData.append("code", data.code);
            formData.append("newPassword", data.newPassword);
            formData.append("flow", "reset-verification");
            await signIn("password", formData);
        },
        onSuccess: () => {
            toast.success("Password reset successfully! You can now log in with your new password.");
            setResetStep("forgot");
            resetCodeForm.reset();
            setActiveTab('login');
        },
        onError: (error) => {
            if (error.message.includes("InvalidAccountId")) {
                toast.error("Invalid account. Please try again.");
            } else {
                console.error(error);
                toast.error("An error occurred. Please enter valid credentials and try again.");
            }
        },
    });

    const { mutate: setPasswordMutation, isPending: isSettingPassword } = useMutation({
        mutationFn: async (data: SetPasswordFormData) => {
            if (user) {
                // Regular password setup for invited users
                await convexSignUp({
                    email: user.email,
                    password: data.password,
                    full_name: user.profile?.fullName || '',
                });
                return null;
            } else {
                throw new Error("No user found");
            }
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
            if (error.message.includes("InvalidAccountId")) {
                toast.error("Invalid account. Please try again.");
            } else {
                console.error(error);
                toast.error("An error occurred. Please enter valid credentials and try again.");
            }
        },
        retry: false,
    });

    const onLoginSubmit = (data: LoginFormData) => {
        loginMutation(data);
    };

    const onSignupSubmit = (data: SignupFormData) => {
        signupMutation(data);
    };

    const onResetRequestSubmit = (data: ResetRequestFormData) => {
        resetRequestMutation(data);
    };

    const onResetCodeSubmit = (data: ResetCodeFormData) => {
        resetCodeMutation(data);
    };

    const onSetPasswordSubmit = (data: SetPasswordFormData) => {
        setPasswordMutation(data);
    };

    // Set the active tab based on URL mode or password status
    useEffect(() => {
        const mode = searchParams.get('mode');
        const token = searchParams.get('token');
        if (mode === 'invitation' && token) {
            // Redirect to invitation page
            navigate(`/invitation?token=${token}`);
        } else if (user && !isPasswordSetup) {
            setActiveTab('driver-setup');
        }
    }, [searchParams, user, isPasswordSetup, navigate]);

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
                                        <PasswordInput
                                            register={setPasswordForm.register}
                                            name="password"
                                            placeholder="••••••••"
                                            autoComplete="current-password"
                                            error={setPasswordForm.formState.errors.password?.message}
                                            showPassword={showSetPassword}
                                            setShowPassword={setShowSetPassword}
                                            id="password"
                                        />
                                        <PasswordRequirements password={setPasswordForm.watch("password") || ""} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                        <PasswordInput
                                            register={setPasswordForm.register}
                                            name="confirmPassword"
                                            placeholder="••••••••"
                                            error={setPasswordForm.formState.errors.confirmPassword?.message}
                                            showPassword={showSetConfirmPassword}
                                            setShowPassword={setShowSetConfirmPassword}
                                            id="confirmPassword"
                                        />
                                        <PasswordMatchIndicator 
                                            password={setPasswordForm.watch("password") || ""} 
                                            confirmPassword={setPasswordForm.watch("confirmPassword") || ""} 
                                        />
                                    </div>
                                    <div className="pt-2">
                                        <Button 
                                            type="submit" 
                                            className="w-full h-11 bg-brand-orange hover:bg-brand-orange-600 text-white shadow-brand hover:shadow-brand-hover transition-all font-medium"
                                            disabled={isSettingPassword}
                                        >
                                            {isSettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Set Password
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
                                        <CardTitle className="font-heading text-2xl text-foreground">Welcome to TravelEx</CardTitle>
                                        <CardDescription className="text-muted-foreground">
                                            Enter your credentials to access your account.
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
                                                    autoComplete="email"
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
                                                <PasswordInput
                                                    register={loginForm.register}
                                                    name="password"
                                                    placeholder="••••••••"
                                                    autoComplete="current-password"
                                                    error={loginForm.formState.errors.password?.message}
                                                    showPassword={showLoginPassword}
                                                    setShowPassword={setShowLoginPassword}
                                                    id="password"
                                                />
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
                                                    autoComplete="name"
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
                                                    autoComplete="email"
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
                                                    <PasswordInput
                                                        register={signupForm.register}
                                                        name="password"
                                                        placeholder="••••••••"
                                                        error={signupForm.formState.errors.password?.message}
                                                        showPassword={showSignupPassword}
                                                        setShowPassword={setShowSignupPassword}
                                                        id="signup_password"
                                                    />
                                                    <PasswordRequirements password={signupForm.watch("password") || ""} />
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        As the first user, you'll become the admin.
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
                                        <CardTitle className="font-heading text-2xl text-foreground">
                                            {resetStep === "forgot" ? "Reset Password" : "Enter Reset Code"}
                                        </CardTitle>
                                        <CardDescription className="text-muted-foreground">
                                            {resetStep === "forgot" 
                                                ? "Enter your email and we'll send you a reset code."
                                                : `Enter the code sent to ${resetStep.email} and your new password.`
                                            }
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {resetStep === "forgot" ? (
                                            <form onSubmit={resetRequestForm.handleSubmit(onResetRequestSubmit)} className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="reset_email">Email</Label>
                                                    <Input
                                                        {...resetRequestForm.register("email")}
                                                        id="reset_email"
                                                        type="email"
                                                        autoComplete="email"
                                                        placeholder="m@example.com"
                                                        className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                                                    />
                                                    {resetRequestForm.formState.errors.email && (
                                                        <p className="text-xs text-destructive">{resetRequestForm.formState.errors.email.message}</p>
                                                    )}
                                                </div>
                                                <div className="pt-2">
                                                    <Button
                                                        type="submit"
                                                        disabled={isRequestingReset}
                                                        className="w-full h-11 bg-brand-dark-blue hover:bg-brand-dark-blue/90 text-white"
                                                    >
                                                        {isRequestingReset && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                        Send Reset Code
                                                    </Button>
                                                </div>
                                            </form>
                                        ) : (
                                            <form onSubmit={resetCodeForm.handleSubmit(onResetCodeSubmit)} className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="reset_code">Reset Code</Label>
                                                    <Input
                                                        {...resetCodeForm.register("code")}
                                                        id="reset_code"
                                                        type="text"
                                                        placeholder="Enter 6-digit code"
                                                        className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                                                    />
                                                    {resetCodeForm.formState.errors.code && (
                                                        <p className="text-xs text-destructive">{resetCodeForm.formState.errors.code.message}</p>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="new_password">New Password</Label>
                                                    <PasswordInput
                                                        register={resetCodeForm.register}
                                                        name="newPassword"
                                                        placeholder="••••••••"
                                                        autoComplete="new-password"
                                                        error={resetCodeForm.formState.errors.newPassword?.message}
                                                        showPassword={showResetNewPassword}
                                                        setShowPassword={setShowResetNewPassword}
                                                        id="new_password"
                                                    />
                                                    <PasswordRequirements password={resetCodeForm.watch("newPassword") || ""} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="confirm_new_password">Confirm New Password</Label>
                                                    <PasswordInput
                                                        register={resetCodeForm.register}
                                                        name="confirmPassword"
                                                        placeholder="••••••••"
                                                        autoComplete="new-password"
                                                        error={resetCodeForm.formState.errors.confirmPassword?.message}
                                                        showPassword={showResetConfirmPassword}
                                                        setShowPassword={setShowResetConfirmPassword}
                                                        id="confirm_new_password"
                                                    />
                                                    <PasswordMatchIndicator 
                                                        password={resetCodeForm.watch("newPassword") || ""} 
                                                        confirmPassword={resetCodeForm.watch("confirmPassword") || ""} 
                                                    />
                                                </div>
                                                <div className="pt-2">
                                                    <Button
                                                        type="submit"
                                                        disabled={isResettingPassword}
                                                        className="w-full h-11 bg-brand-dark-blue hover:bg-brand-dark-blue/90 text-white"
                                                    >
                                                        {isResettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                        Reset Password
                                                    </Button>
                                                </div>
                                            </form>
                                        )}
                                        <div className="mt-4 text-center text-sm">
                                            {resetStep === "forgot" ? (
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
                                            ) : (
                                                <a
                                                    href="#"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setResetStep("forgot");
                                                    }}
                                                    className="font-medium text-brand-orange hover:underline"
                                                >
                                                    Try different email
                                                </a>
                                            )}
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