import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { updateUserPassword } from "@/services/auth";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Loader2 } from "lucide-react";

const passwordFormSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type PasswordFormData = z.infer<typeof passwordFormSchema>;

const UpdatePasswordForm = () => {
    const form = useForm<PasswordFormData>({
        defaultValues: {
            password: "",
        },
    });

    const { mutate: updatePassword, isPending } = useMutation({
        mutationFn: updateUserPassword,
        onSuccess: () => {
            toast.success("Password updated successfully!");
            form.reset();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const onSubmit = (data: PasswordFormData) => {
        updatePassword(data.password);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Update Password</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-1">
                        <Label htmlFor="password">New Password</Label>
                        <Input {...form.register("password")} id="password" type="password" />
                        {form.formState.errors.password && <p className="text-red-500 text-xs">{form.formState.errors.password.message}</p>}
                    </div>
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Update Password
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}

export default function DriverDashboard() {
  const { user } = useAuth();

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Welcome, {user?.profile?.full_name ?? 'Driver'}!</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Rides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completed Rides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
          </CardContent>
        </Card>
      </div>
      <div className="max-w-md">
        <UpdatePasswordForm />
      </div>
    </div>
  );
} 