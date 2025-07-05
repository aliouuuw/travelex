import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Save, X, Package } from "lucide-react";
import {
  type LuggagePolicy,
  useCreateLuggagePolicy,
  useUpdateLuggagePolicy,
} from "@/services/convex/luggage-policies";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Updated validation schema for bag-based model
const luggagePolicySchema = z.object({
  name: z.string()
    .min(1, "Policy name is required")
    .max(100, "Policy name must be less than 100 characters"),
  description: z.string().optional(),
  weightPerBag: z.number()
    .positive("Weight per bag must be greater than 0")
    .max(50, "Weight per bag cannot exceed 50kg"),
  feePerAdditionalBag: z.number()
    .min(0, "Fee per additional bag cannot be negative")
    .max(100, "Fee per bag cannot exceed $100"),
  maxAdditionalBags: z.number()
    .positive("Maximum additional bags must be greater than 0")
    .max(10, "Maximum additional bags cannot exceed 10"),
  maxBagSize: z.string()
    .max(200, "Bag size description must be less than 200 characters")
    .optional(),
  isDefault: z.boolean().optional()
});

type FormData = z.infer<typeof luggagePolicySchema>;

interface LuggagePolicyFormProps {
  policy?: LuggagePolicy;
  onClose: () => void;
}

export default function LuggagePolicyForm({ policy, onClose }: LuggagePolicyFormProps) {
  const [previewBags, setPreviewBags] = useState<string>('');
  const [previewFee, setPreviewFee] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!policy;

  const createLuggagePolicy = useCreateLuggagePolicy();
  const updateLuggagePolicy = useUpdateLuggagePolicy();

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
      // Convert from old weight-based model to new bag-based model
      weightPerBag: policy?.freeWeightKg || 23, // Default to 23kg per bag
      feePerAdditionalBag: 5, // Default $5 per additional bag
      maxAdditionalBags: policy?.maxBags || 3, // Default max 3 additional bags
      maxBagSize: policy?.maxBagSize || '',
      isDefault: policy?.isDefault || false
    }
  });

  // Watch form values for live preview
  const watchedValues = watch();

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const convertedData = {
        name: data.name,
        description: data.description,
        freeWeightKg: data.weightPerBag,
        excessFeePerKg: data.feePerAdditionalBag,
        maxBags: data.maxAdditionalBags + 1, // Add 1 for the free bag
        maxBagSize: data.maxBagSize,
        isDefault: data.isDefault,
      };
      
      if (isEditing && policy) {
        await updateLuggagePolicy({ 
          policyId: policy._id,
          ...convertedData
        });
      } else {
        await createLuggagePolicy(convertedData);
      }
      
      toast.success(`Luggage policy ${isEditing ? 'updated' : 'created'} successfully!`);
      onClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} policy: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate preview fee for additional bags
  const calculatePreviewFee = () => {
    const bags = parseInt(previewBags);
    if (!bags || bags <= 1) {
      setPreviewFee(0);
      return;
    }

    const additionalBags = bags - 1; // First bag is free
    const feePerBag = watchedValues.feePerAdditionalBag ?? 0;
    const fee = additionalBags * feePerBag;
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
            Define your bag allowances and pricing structure
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

          {/* Bag-Based Pricing Configuration */}
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-blue-600" />
                <h4 className="font-medium text-blue-900">Bag-Based Policy</h4>
              </div>
              <p className="text-xs text-blue-700">
                Simple and clear: 1 free bag with weight limit, flat fee for additional bags
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weightPerBag" className="text-sm font-medium">
                Weight Limit per Bag (kg) *
              </Label>
              <Input
                {...register('weightPerBag', { valueAsNumber: true })}
                id="weightPerBag"
                type="number"
                step="0.1"
                min="0.1"
                placeholder="23"
                className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
              />
              <p className="text-xs text-muted-foreground">
                Each bag (including the free one) cannot exceed this weight
              </p>
              {errors.weightPerBag && (
                <p className="text-xs text-destructive">{errors.weightPerBag.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="feePerAdditionalBag" className="text-sm font-medium">
                Fee per Additional Bag ($) *
              </Label>
              <Input
                {...register('feePerAdditionalBag', { valueAsNumber: true })}
                id="feePerAdditionalBag"
                type="number"
                step="0.01"
                min="0"
                placeholder="5.00"
                className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
              />
              <p className="text-xs text-muted-foreground">
                Flat fee charged for each bag beyond the first free bag
              </p>
              {errors.feePerAdditionalBag && (
                <p className="text-xs text-destructive">{errors.feePerAdditionalBag.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxAdditionalBags" className="text-sm font-medium">
                Maximum Additional Bags *
              </Label>
              <Input
                {...register('maxAdditionalBags', { valueAsNumber: true })}
                id="maxAdditionalBags"
                type="number"
                min="1"
                max="10"
                placeholder="3"
                className="h-11 border-border/60 focus:border-brand-orange focus:ring-brand-orange/20"
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of additional bags allowed (beyond the free bag)
              </p>
              {errors.maxAdditionalBags && (
                <p className="text-xs text-destructive">{errors.maxAdditionalBags.message}</p>
              )}
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
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
                <Package className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h4 className="font-medium text-green-900">Policy Preview</h4>
                  <p className="text-sm text-green-700">
                    1 free bag up to {watchedValues.weightPerBag || 0}kg • ${watchedValues.feePerAdditionalBag || 0} per additional bag • Max {watchedValues.maxAdditionalBags || 0} additional bags
                  </p>
                </div>

                {/* Fee Calculator */}
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Total bags"
                    value={previewBags}
                    onChange={(e) => setPreviewBags(e.target.value)}
                    onBlur={calculatePreviewFee}
                    className="w-32 h-8 text-sm bg-white"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={calculatePreviewFee}
                    className="h-8 bg-white text-xs"
                  >
                    Calculate
                  </Button>
                  {previewFee !== null && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Fee: ${previewFee.toFixed(2)}
                    </Badge>
                  )}
                </div>
                
                {previewBags && parseInt(previewBags) > 0 && (
                  <div className="text-xs text-green-600">
                    Example: {previewBags} bag{parseInt(previewBags) > 1 ? 's' : ''} = 
                    1 free + {Math.max(0, parseInt(previewBags) - 1)} additional × $
                    {watchedValues.feePerAdditionalBag || 0}
                  </div>
                )}
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
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isValid || isLoading}
            className="bg-brand-orange text-white hover:bg-brand-orange/90"
          >
            {isLoading ? (
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