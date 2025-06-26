import { supabase } from './supabase';

// TypeScript types for luggage policies
export interface LuggagePolicy {
  id: string;
  name: string;
  description?: string;
  maxWeight?: number; // kg
  freeWeight: number; // kg of free allowance
  feePerExcessKg: number; // fee per kg over free allowance
  maxBags?: number; // optional bag count limit
  maxBagSize?: string; // optional size description
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLuggagePolicyInput {
  name: string;
  description?: string;
  maxWeight?: number;
  freeWeight?: number;
  feePerExcessKg?: number;
  maxBags?: number;
  maxBagSize?: string;
  isDefault?: boolean;
}

export interface UpdateLuggagePolicyInput extends CreateLuggagePolicyInput {
  id: string;
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

  return data || [];
}

/**
 * Create a new luggage policy
 */
export async function createLuggagePolicy(input: CreateLuggagePolicyInput): Promise<LuggagePolicy> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.rpc('save_luggage_policy', {
    p_driver_id: user.id,
    p_name: input.name,
    p_id: null, // null for new policy
    p_description: input.description || null,
    p_max_weight: input.maxWeight || null,
    p_free_weight: input.freeWeight || 0,
    p_fee_per_excess_kg: input.feePerExcessKg || 0,
    p_max_bags: input.maxBags || null,
    p_max_bag_size: input.maxBagSize || null,
    p_is_default: input.isDefault || false
  });

  if (error) {
    console.error('Error creating luggage policy:', error);
    throw new Error(`Failed to create luggage policy: ${error.message}`);
  }

  if (!data) {
    throw new Error('No data returned from luggage policy creation');
  }

  return data;
}

/**
 * Update an existing luggage policy
 */
export async function updateLuggagePolicy(input: UpdateLuggagePolicyInput): Promise<LuggagePolicy> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.rpc('save_luggage_policy', {
    p_driver_id: user.id,
    p_name: input.name,
    p_id: input.id,
    p_description: input.description || null,
    p_max_weight: input.maxWeight || null,
    p_free_weight: input.freeWeight || 0,
    p_fee_per_excess_kg: input.feePerExcessKg || 0,
    p_max_bags: input.maxBags || null,
    p_max_bag_size: input.maxBagSize || null,
    p_is_default: input.isDefault || false
  });

  if (error) {
    console.error('Error updating luggage policy:', error);
    throw new Error(`Failed to update luggage policy: ${error.message}`);
  }

  if (!data) {
    throw new Error('No data returned from luggage policy update');
  }

  return data;
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
 * Calculate luggage fee based on policy and weight
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
 * Utility function to format luggage policy for display
 */
export function formatLuggagePolicy(policy: LuggagePolicy): string {
  const parts: string[] = [];
  
  if (policy.freeWeight > 0) {
    parts.push(`Free: ${policy.freeWeight}kg`);
  }
  
  if (policy.feePerExcessKg > 0) {
    parts.push(`$${policy.feePerExcessKg}/kg excess`);
  }
  
  if (policy.maxWeight) {
    parts.push(`Max: ${policy.maxWeight}kg`);
  }
  
  if (policy.maxBags) {
    parts.push(`Max ${policy.maxBags} bags`);
  }
  
  return parts.length > 0 ? parts.join(' • ') : 'No restrictions';
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
  
  if (input.freeWeight !== undefined && input.freeWeight < 0) {
    errors.push('Free weight allowance cannot be negative');
  }
  
  if (input.feePerExcessKg !== undefined && input.feePerExcessKg < 0) {
    errors.push('Fee per excess kg cannot be negative');
  }
  
  if (input.maxWeight !== undefined && input.maxWeight <= 0) {
    errors.push('Maximum weight must be greater than 0');
  }
  
  if (input.maxBags !== undefined && input.maxBags <= 0) {
    errors.push('Maximum bags must be greater than 0');
  }
  
  if (input.freeWeight !== undefined && input.maxWeight !== undefined && input.freeWeight > input.maxWeight) {
    errors.push('Free weight allowance cannot exceed maximum weight');
  }
  
  return errors;
} 