import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Save, X, Info } from "lucide-react";
import {
  createLuggagePolicy,
  updateLuggagePolicy,
  type LuggagePolicy,

} from "@/services/luggage-policies";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Validation schema
const luggagePolicySchema = z.object({
  name: z.string()
    .min(1, "Policy name is required")
    .max(100, "Policy name must be less than 100 characters"),
  description: z.string().optional(),
  maxWeight: z.number()
    .positive("Maximum weight must be greater than 0")
    .max(1000, "Maximum weight cannot exceed 1000kg")
    .optional(),
  freeWeight: z.number()
    .min(0, "Free weight allowance cannot be negative")
    .max(1000, "Free weight cannot exceed 1000kg")
    .optional(),
  feePerExcessKg: z.number()
    .min(0, "Fee per excess kg cannot be negative")
    .max(100, "Fee per kg cannot exceed $100")
    .optional(),
  maxBags: z.number()
    .positive("Maximum bags must be greater than 0")
    .max(20, "Maximum bags cannot exceed 20")
    .optional(),
  maxBagSize: z.string()
    .max(200, "Bag size description must be less than 200 characters")
    .optional(),
  isDefault: z.boolean().optional()
}).refine((data) => {
  if (data.maxWeight && data.freeWeight && data.freeWeight > data.maxWeight) {
    return false;
  }
  return true;
}, {
  message: "Free weight allowance cannot exceed maximum weight",
  path: ["freeWeight"]
});

type FormData = z.infer<typeof luggagePolicySchema>;

interface LuggagePolicyFormProps {
  policy?: LuggagePolicy;
  onClose: () => void;
}

export default function LuggagePolicyForm({ policy, onClose }: LuggagePolicyFormProps) {
  const [previewFee, setPreviewFee] = useState<number | null>(null);
  const [previewWeight, setPreviewWeight] = useState<string>('');
  const queryClient = useQueryClient();
  const isEditing = !!policy;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(luggagePolicySchema),
    defaultValues: {
      name: policy?.name || '',
      description: policy?.description || '',
      maxWeight: policy?.maxWeight || undefined,
      freeWeight: policy?.freeWeight || 0,
      feePerExcessKg: policy?.feePerExcessKg || 0,
      maxBags: policy?.maxBags || undefined,
      maxBagSize: policy?.maxBagSize || '',
      isDefault: policy?.isDefault || false
    }
  });

  // Watch form values for live preview
  const watchedValues = watch();

  // Mutation for creating/updating policy
  const savePolicyMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (isEditing && policy) {
        return updateLuggagePolicy({ ...data, id: policy.id });
      } else {
        return createLuggagePolicy(data);
      }
    },
    onSuccess: () => {
      toast.success(`Luggage policy ${isEditing ? 'updated' : 'created'} successfully!`);
      queryClient.invalidateQueries({ queryKey: ['driver-luggage-policies'] });
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} policy: ${error.message}`);
    }
  });

  const onSubmit = (data: FormData) => {
    savePolicyMutation.mutate(data);
  };

  // Calculate preview fee
  const calculatePreviewFee = () => {
    const weight = parseFloat(previewWeight);
    if (!weight || weight <= 0) {
      setPreviewFee(null);
      return;
    }

    const freeWeight = watchedValues.freeWeight ?? 0;
    const feePerKg = watchedValues.feePerExcessKg ?? 0;
    const excessWeight = Math.max(0, weight - freeWeight);
    const fee = excessWeight * feePerKg;
    setPreviewFee(fee);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-xl font-semibold text-foreground">
            {isEditing ? 'Edit Luggage Policy' : 'Create New Luggage Policy'}
          </h3>
          <p className="text-sm text-muted-foreground">
            Define your luggage allowances and pricing structure
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          className="hover:bg-muted/50"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Policy Name *
              </Label>
              <Input
                {...register('name')}
                id="name"
                placeholder="e.g., Standard Luggage, Premium Package"
                className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Input
                {...register('description')}
                id="description"
                placeholder="Optional description of this policy"
                className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxBagSize" className="text-sm font-medium">
                Maximum Bag Size
              </Label>
              <Input
                {...register('maxBagSize')}
                id="maxBagSize"
                placeholder="e.g., 50cm x 40cm x 20cm"
                className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
              />
              {errors.maxBagSize && (
                <p className="text-xs text-destructive">{errors.maxBagSize.message}</p>
              )}
            </div>
          </div>

          {/* Weight and Pricing */}
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="freeWeight" className="text-sm font-medium">
                  Free Weight (kg)
                </Label>
                <Input
                  {...register('freeWeight', { valueAsNumber: true })}
                  id="freeWeight"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                />
                {errors.freeWeight && (
                  <p className="text-xs text-destructive">{errors.freeWeight.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxWeight" className="text-sm font-medium">
                  Max Weight (kg)
                </Label>
                <Input
                  {...register('maxWeight', { valueAsNumber: true })}
                  id="maxWeight"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="Optional"
                  className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                />
                {errors.maxWeight && (
                  <p className="text-xs text-destructive">{errors.maxWeight.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="feePerExcessKg" className="text-sm font-medium">
                  Fee per Excess kg ($)
                </Label>
                <Input
                  {...register('feePerExcessKg', { valueAsNumber: true })}
                  id="feePerExcessKg"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                />
                {errors.feePerExcessKg && (
                  <p className="text-xs text-destructive">{errors.feePerExcessKg.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxBags" className="text-sm font-medium">
                  Max Bags
                </Label>
                <Input
                  {...register('maxBags', { valueAsNumber: true })}
                  id="maxBags"
                  type="number"
                  min="1"
                  placeholder="Optional"
                  className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
                />
                {errors.maxBags && (
                  <p className="text-xs text-destructive">{errors.maxBags.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Default Policy Setting */}
        <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border/40">
          <input
            {...register('isDefault')}
            type="checkbox"
            id="isDefault"
            className="w-4 h-4 text-brand-orange border-border/60 rounded focus:ring-brand-orange"
          />
          <div className="flex-1">
            <Label htmlFor="isDefault" className="text-sm font-medium cursor-pointer">
              Set as default policy
            </Label>
            <p className="text-xs text-muted-foreground">
              This policy will be automatically applied to new trips
            </p>
          </div>
        </div>

        {/* Live Preview */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                <Info className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h4 className="font-medium text-blue-900">Policy Preview</h4>
                  <p className="text-sm text-blue-700">
                    {(watchedValues.freeWeight ?? 0) > 0 && `Free allowance: ${watchedValues.freeWeight}kg`}
                    {(watchedValues.freeWeight ?? 0) > 0 && (watchedValues.feePerExcessKg ?? 0) > 0 && ' • '}
                    {(watchedValues.feePerExcessKg ?? 0) > 0 && `$${watchedValues.feePerExcessKg}/kg excess`}
                    {watchedValues.maxWeight && ` • Max: ${watchedValues.maxWeight}kg`}
                    {watchedValues.maxBags && ` • Max ${watchedValues.maxBags} bags`}
                  </p>
                </div>

                {/* Fee Calculator */}
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Test weight (kg)"
                    value={previewWeight}
                    onChange={(e) => setPreviewWeight(e.target.value)}
                    onBlur={calculatePreviewFee}
                    className="w-32 h-8 text-sm bg-white"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={calculatePreviewFee}
                    className="h-8 text-xs"
                  >
                    Calculate
                  </Button>
                  {previewFee !== null && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      Fee: ${previewFee.toFixed(2)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={savePolicyMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isValid || savePolicyMutation.isPending}
            className="bg-brand-orange hover:bg-brand-orange-600 text-white"
          >
            {savePolicyMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEditing ? 'Update Policy' : 'Create Policy'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
} 