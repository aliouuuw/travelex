import { supabase } from './supabase';

// TypeScript types for bag-based luggage policies
export interface LuggagePolicy {
  id: string;
  name: string;
  description?: string;
  // New bag-based fields
  weightPerBag: number; // kg limit per bag
  freeWeightKg?: number; // Legacy: maps to weightPerBag
  feePerAdditionalBag: number; // flat fee per additional bag
  feePerExcessKg?: number; // Legacy: maps to feePerAdditionalBag
  maxAdditionalBags: number; // max additional bags allowed
  maxBags?: number; // Legacy: maps to maxAdditionalBags
  maxBagSize?: string; // optional size description
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLuggagePolicyInput {
  name: string;
  description?: string;
  weightPerBag: number;
  feePerAdditionalBag: number;
  maxAdditionalBags: number;
  maxBagSize?: string;
  isDefault?: boolean;
}

export interface UpdateLuggagePolicyInput extends CreateLuggagePolicyInput {
  id: string;
}

// Legacy interface for backward compatibility
export interface LegacyCreateLuggagePolicyInput {
  name: string;
  description?: string;
  maxWeight?: number;
  freeWeight?: number;
  feePerExcessKg?: number;
  maxBags?: number;
  maxBagSize?: string;
  isDefault?: boolean;
}

/**
 * Get all luggage policies for the authenticated driver
 */
export async function getDriverLuggagePolicies(): Promise<LuggagePolicy[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.rpc('get_driver_luggage_policies', {
    driver_uuid: user.id
  });

  if (error) {
    console.error('Error fetching luggage policies:', error);
    throw new Error(`Failed to fetch luggage policies: ${error.message}`);
  }

  // Transform legacy data to new format
  return (data || []).map(transformLegacyPolicy);
}

/**
 * Transform legacy policy data to new bag-based format
 */
function transformLegacyPolicy(policy: Partial<LuggagePolicy> & {
  free_weight_kg?: number;
  excess_fee_per_kg?: number;
  max_bags?: number;
}): LuggagePolicy {
  return {
    id: policy.id || '',
    name: policy.name || 'Legacy Policy',
    description: policy.description,
    weightPerBag: policy.freeWeightKg || policy.free_weight_kg || 23,
    feePerAdditionalBag: policy.feePerExcessKg || policy.excess_fee_per_kg || 5,
    maxAdditionalBags: policy.maxBags || policy.max_bags || 3,
    isDefault: policy.isDefault || false,
    createdAt: policy.createdAt || new Date().toISOString(),
    updatedAt: policy.updatedAt || new Date().toISOString(),
    freeWeightKg: policy.freeWeightKg || policy.free_weight_kg,
    feePerExcessKg: policy.feePerExcessKg || policy.excess_fee_per_kg,
    maxBags: policy.maxBags || policy.max_bags,
    maxBagSize: policy.maxBagSize
  };
}

/**
 * Create a new luggage policy
 */
export async function createLuggagePolicy(input: CreateLuggagePolicyInput | LegacyCreateLuggagePolicyInput): Promise<LuggagePolicy> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Handle both new and legacy input formats
  const normalizedInput = normalizeInput(input);

  const { data, error } = await supabase.rpc('save_luggage_policy', {
    p_driver_id: user.id,
    p_name: normalizedInput.name,
    p_id: null, // null for new policy
    p_description: normalizedInput.description || null,
    p_max_weight: null, // No longer used in bag-based model
    p_free_weight: normalizedInput.weightPerBag,
    p_fee_per_excess_kg: normalizedInput.feePerAdditionalBag,
    p_max_bags: normalizedInput.maxAdditionalBags,
    p_max_bag_size: normalizedInput.maxBagSize || null,
    p_is_default: normalizedInput.isDefault || false
  });

  if (error) {
    console.error('Error creating luggage policy:', error);
    throw new Error(`Failed to create luggage policy: ${error.message}`);
  }

  if (!data) {
    throw new Error('No data returned from luggage policy creation');
  }

  return transformLegacyPolicy(data);
}

/**
 * Update an existing luggage policy
 */
export async function updateLuggagePolicy(input: UpdateLuggagePolicyInput): Promise<LuggagePolicy> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const normalizedInput = normalizeInput(input);

  const { data, error } = await supabase.rpc('save_luggage_policy', {
    p_driver_id: user.id,
    p_name: normalizedInput.name,
    p_id: input.id,
    p_description: normalizedInput.description || null,
    p_max_weight: null, // No longer used
    p_free_weight: normalizedInput.weightPerBag,
    p_fee_per_excess_kg: normalizedInput.feePerAdditionalBag,
    p_max_bags: normalizedInput.maxAdditionalBags,
    p_max_bag_size: normalizedInput.maxBagSize || null,
    p_is_default: normalizedInput.isDefault || false
  });

  if (error) {
    console.error('Error updating luggage policy:', error);
    throw new Error(`Failed to update luggage policy: ${error.message}`);
  }

  if (!data) {
    throw new Error('No data returned from luggage policy update');
  }

  return transformLegacyPolicy(data);
}

/**
 * Normalize input to handle both new and legacy formats
 */
function normalizeInput(input: CreateLuggagePolicyInput | LegacyCreateLuggagePolicyInput): CreateLuggagePolicyInput {
  // If it's already in the new format
  if ('weightPerBag' in input && 'feePerAdditionalBag' in input && 'maxAdditionalBags' in input) {
    return input as CreateLuggagePolicyInput;
  }

  // Convert from legacy format
  const legacyInput = input as LegacyCreateLuggagePolicyInput;
  return {
    name: legacyInput.name,
    description: legacyInput.description,
    weightPerBag: legacyInput.freeWeight || 23,
    feePerAdditionalBag: legacyInput.feePerExcessKg || 5,
    maxAdditionalBags: legacyInput.maxBags || 3,
    maxBagSize: legacyInput.maxBagSize,
    isDefault: legacyInput.isDefault
  };
}

/**
 * Delete a luggage policy
 */
export async function deleteLuggagePolicy(policyId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.rpc('delete_luggage_policy', {
    p_policy_id: policyId,
    p_driver_id: user.id
  });

  if (error) {
    console.error('Error deleting luggage policy:', error);
    throw new Error(`Failed to delete luggage policy: ${error.message}`);
  }

  return data === true;
}

/**
 * Set a luggage policy as the default
 */
export async function setDefaultLuggagePolicy(policyId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.rpc('set_default_luggage_policy', {
    p_policy_id: policyId,
    p_driver_id: user.id
  });

  if (error) {
    console.error('Error setting default luggage policy:', error);
    throw new Error(`Failed to set default luggage policy: ${error.message}`);
  }

  return data === true;
}

/**
 * Calculate luggage fee based on policy and number of bags
 */
export async function calculateLuggageFeeByBags(policyId: string, numberOfBags: number): Promise<number> {
  if (numberOfBags <= 1) {
    return 0; // First bag is always free
  }

  // For now, call the legacy function but interpret it differently
  // TODO: Create a new database function for bag-based calculation
  const { data, error } = await supabase.rpc('calculate_luggage_fee', {
    p_policy_id: policyId,
    p_luggage_weight: numberOfBags // Temporarily using weight parameter for bag count
  });

  if (error) {
    console.error('Error calculating luggage fee:', error);
    throw new Error(`Failed to calculate luggage fee: ${error.message}`);
  }

  return data || 0;
}

/**
 * Calculate luggage fee based on policy and weight (legacy)
 */
export async function calculateLuggageFee(policyId: string, luggageWeight: number): Promise<number> {
  const { data, error } = await supabase.rpc('calculate_luggage_fee', {
    p_policy_id: policyId,
    p_luggage_weight: luggageWeight
  });

  if (error) {
    console.error('Error calculating luggage fee:', error);
    throw new Error(`Failed to calculate luggage fee: ${error.message}`);
  }

  return data || 0;
}

/**
 * Calculate fee for additional bags using policy data directly
 */
export function calculateBagFee(policy: LuggagePolicy, numberOfBags: number): number {
  if (numberOfBags <= 1) {
    return 0; // First bag is free
  }

  const additionalBags = numberOfBags - 1;
  const maxAllowed = policy.maxAdditionalBags;
  
  if (additionalBags > maxAllowed) {
    throw new Error(`Maximum ${maxAllowed} additional bags allowed`);
  }

  return additionalBags * policy.feePerAdditionalBag;
}

/**
 * Utility function to format luggage policy for display
 */
export function formatLuggagePolicy(policy: LuggagePolicy): string {
  const parts: string[] = [];
  
  // Free bag with weight limit
  parts.push(`1 free bag up to ${policy.weightPerBag}kg`);
  
  // Additional bag fee
  if (policy.feePerAdditionalBag > 0) {
    parts.push(`$${policy.feePerAdditionalBag} per additional bag`);
  }
  
  // Maximum additional bags
  if (policy.maxAdditionalBags > 0) {
    parts.push(`Max ${policy.maxAdditionalBags} additional bags`);
  }
  
  return parts.join(' • ');
}

/**
 * Utility function to get policy display summary
 */
export function getPolicyDisplaySummary(policy: LuggagePolicy): {
  freeBagWeight: number;
  additionalBagFee: number;
  maxAdditionalBags: number;
  formattedSummary: string;
} {
  return {
    freeBagWeight: policy.weightPerBag,
    additionalBagFee: policy.feePerAdditionalBag,
    maxAdditionalBags: policy.maxAdditionalBags,
    formattedSummary: formatLuggagePolicy(policy)
  };
}

/**
 * Utility function to validate luggage policy input
 */
export function validateLuggagePolicyInput(input: CreateLuggagePolicyInput): string[] {
  const errors: string[] = [];
  
  if (!input.name || input.name.trim().length === 0) {
    errors.push('Policy name is required');
  }
  
  if (input.name && input.name.trim().length > 100) {
    errors.push('Policy name must be less than 100 characters');
  }
  
  if (input.weightPerBag <= 0) {
    errors.push('Weight per bag must be greater than 0');
  }
  
  if (input.weightPerBag > 50) {
    errors.push('Weight per bag cannot exceed 50kg');
  }
  
  if (input.feePerAdditionalBag < 0) {
    errors.push('Fee per additional bag cannot be negative');
  }
  
  if (input.maxAdditionalBags <= 0) {
    errors.push('Maximum additional bags must be greater than 0');
  }
  
  if (input.maxAdditionalBags > 10) {
    errors.push('Maximum additional bags cannot exceed 10');
  }
  
  return errors;
} 