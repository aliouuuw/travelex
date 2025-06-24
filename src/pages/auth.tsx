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

const formSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormData = z.infer<typeof formSchema>;

export default function AuthPage() {
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
            // TODO: Redirect to dashboard
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
        <div className="flex items-center justify-center min-h-screen">
            <Tabs defaultValue="login" className="w-[400px]">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                    <Card>
                        <CardHeader>
                            <CardTitle>Login</CardTitle>
                            <CardDescription>
                                Welcome back! Please enter your details to login.
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
                        <CardHeader>
                            <CardTitle>Sign Up</CardTitle>
                            <CardDescription>
                                Create an account to get started.
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
    );
} 