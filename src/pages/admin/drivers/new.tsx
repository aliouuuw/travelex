import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../../convex/_generated/api";

const newDriverFormSchema = z.object({
    full_name: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.string().email(),
});

type NewDriverFormData = z.infer<typeof newDriverFormSchema>;

export default function NewDriverPage() {
    const navigate = useNavigate();
    const form = useForm<NewDriverFormData>({
        resolver: zodResolver(newDriverFormSchema),
        defaultValues: {
            full_name: "",
            email: "",
        },
    });

    const createInvitation = useMutation(api.invitations.createInvitation);

    const onSubmit = async (data: NewDriverFormData) => {
        try {
            await createInvitation({
                email: data.email,
                fullName: data.full_name,
                role: "driver",
            });
            toast.success("Driver invitation sent successfully!");
            navigate("/admin/drivers");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to send invitation");
        }
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Add New Driver</h1>
            <Card className="max-w-md">
                <CardHeader>
                    <CardTitle>Driver Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="full_name">Full Name</Label>
                            <Input {...form.register("full_name")} id="full_name" type="text" placeholder="John Doe" />
                            {form.formState.errors.full_name && <p className="text-red-500 text-xs">{form.formState.errors.full_name.message}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="email">Email</Label>
                            <Input {...form.register("email")} id="email" type="email" placeholder="driver@example.com" />
                            {form.formState.errors.email && <p className="text-red-500 text-xs">{form.formState.errors.email.message}</p>}
                        </div>
                        <div className="pt-2">
                            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Invitation
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
} 