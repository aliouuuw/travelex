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
import { signIn, signUp } from "@/services/auth";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const formSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormData = z.infer<typeof formSchema>;

export default function AuthPage() {
    const navigate = useNavigate();

    const loginForm = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const signupForm = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const { mutate: loginMutation, isPending: isLoggingIn } = useMutation({
        mutationFn: signIn,
        onSuccess: () => {
            toast.success("Login successful!");
            navigate("/dashboard");
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
            toast.error(error.message);
        },
    });

    const onLoginSubmit = (data: FormData) => {
        loginMutation(data);
    };

    const onSignupSubmit = (data: FormData) => {
        signupMutation(data);
    };

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
                    <Tabs defaultValue="login" className="w-full">
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
                                    </form>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="signup">
                            <Card>
                                <CardHeader className="text-center">
                                    <CardTitle>Create an Account</CardTitle>
                                    <CardDescription>
                                        Enter your email and password to get started.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-2">
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
                    </Tabs>
                </div>
            </div>
        </div>
    );
} 