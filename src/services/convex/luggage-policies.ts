import { api } from "../../../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";

// TypeScript types for bag-based luggage policies
export interface LuggagePolicy {
  _id: Id<"luggagePolicies">;
  driverId: Id<"profiles">;
  name: string;
  description?: string;
  freeWeightKg: number; // Weight per bag (including free bag)
  excessFeePerKg: number; // Fee per additional bag (legacy field name)
  maxBags: number; // Max bags allowed (including free bag)
  maxBagSize?: string;
  isDefault?: boolean;
  _creationTime: number;
  
  // Computed properties for backward compatibility
  weightPerBag?: number;
  feePerAdditionalBag?: number;
  maxAdditionalBags?: number;
}

export interface CreateLuggagePolicyInput {
  name: string;
  description?: string;
  freeWeightKg: number;
  excessFeePerKg: number;
  maxBags: number;
  maxBagSize?: string;
  isDefault?: boolean;
}

export interface UpdateLuggagePolicyInput extends CreateLuggagePolicyInput {
  _id: Id<"luggagePolicies">;
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

// React hooks for luggage policies
export const useDriverLuggagePolicies = () => {
  return useQuery(api.luggagePolicies.getDriverLuggagePolicies);
};

export const useLuggagePolicyById = (policyId: Id<"luggagePolicies">) => {
  return useQuery(api.luggagePolicies.getLuggagePolicyById, { policyId });
};

export const useCreateLuggagePolicy = () => {
  return useMutation(api.luggagePolicies.createLuggagePolicy);
};

export const useUpdateLuggagePolicy = () => {
  return useMutation(api.luggagePolicies.updateLuggagePolicy);
};

export const useDeleteLuggagePolicy = () => {
  return useMutation(api.luggagePolicies.deleteLuggagePolicy);
};

export const useSetDefaultLuggagePolicy = () => {
  return useMutation(api.luggagePolicies.setDefaultLuggagePolicy);
};

export const useCalculateLuggageFeeByBags = (policyId: Id<"luggagePolicies">, numberOfBags: number) => {
  return useQuery(api.luggagePolicies.calculateLuggageFeeByBags, { policyId, numberOfBags });
};

// Service functions (for compatibility with existing code)

/**
 * Get all luggage policies for the authenticated driver
 */
export async function getDriverLuggagePolicies(): Promise<LuggagePolicy[]> {
  throw new Error('Use useDriverLuggagePolicies hook instead');
}

/**
 * Create a new luggage policy
 */
// export async function createLuggagePolicy(input: CreateLuggagePolicyInput | LegacyCreateLuggagePolicyInput): Promise<LuggagePolicy> {
//   throw new Error('Use useCreateLuggagePolicy hook instead');
// }

// /**
//  * Update an existing luggage policy
//  */
// export async function updateLuggagePolicy(input: UpdateLuggagePolicyInput): Promise<LuggagePolicy> {
//   throw new Error('Use useUpdateLuggagePolicy hook instead');
// }

// /**
//  * Delete a luggage policy
//  */
// export async function deleteLuggagePolicy(policyId: Id<"luggagePolicies">): Promise<boolean> {
//   throw new Error('Use useDeleteLuggagePolicy hook instead');
// }

// /**
//  * Set default luggage policy
//  */
// export async function setDefaultLuggagePolicy(policyId: Id<"luggagePolicies">): Promise<boolean> {
//   throw new Error('Use useSetDefaultLuggagePolicy hook instead');
// }

// /**
//  * Calculate luggage fee by number of bags
//  */
// export async function calculateLuggageFeeByBags(policyId: Id<"luggagePolicies">, numberOfBags: number): Promise<number> {
//   throw new Error('Use useCalculateLuggageFeeByBags hook instead');
// }

// /**
//  * Legacy: Calculate luggage fee by weight
//  */
// export async function calculateLuggageFee(policyId: Id<"luggagePolicies">, luggageWeight: number): Promise<number> {
//   throw new Error('Use useCalculateLuggageFeeByBags hook instead');
// }

// Utility functions
export function calculateBagFee(policy: LuggagePolicy, numberOfBags: number): number {
  // First bag is free, additional bags incur fee
  const additionalBags = Math.max(0, numberOfBags - 1);
  const maxAdditionalBags = policy.maxBags - 1; // Subtract 1 for the free bag
  
  if (additionalBags > maxAdditionalBags) {
    throw new Error(`Maximum ${policy.maxBags} bags allowed`);
  }

  return additionalBags * policy.excessFeePerKg;
}

export function formatLuggagePolicy(policy: LuggagePolicy): string {
  return `${policy.name} - ${policy.freeWeightKg}kg per bag, $${policy.excessFeePerKg} per additional bag (max ${policy.maxBags} bags)`;
}

export function getPolicyDisplaySummary(policy: LuggagePolicy): {
  freeBagWeight: number;
  additionalBagFee: number;
  maxAdditionalBags: number;
  formattedSummary: string;
} {
  const freeBagWeight = policy.freeWeightKg;
  const additionalBagFee = policy.excessFeePerKg;
  const maxAdditionalBags = policy.maxBags - 1;
  
  const formattedSummary = `Free bag: ${freeBagWeight}kg | Additional bags: $${additionalBagFee} each | Max additional: ${maxAdditionalBags}`;
  
  return {
    freeBagWeight,
    additionalBagFee,
    maxAdditionalBags,
    formattedSummary,
  };
}

export function validateLuggagePolicyInput(input: CreateLuggagePolicyInput): string[] {
  const errors: string[] = [];
  
  if (!input.name || input.name.trim().length === 0) {
    errors.push('Name is required');
  }
  
  if (input.freeWeightKg <= 0) {
    errors.push('Free weight per bag must be greater than 0');
  }
  
  if (input.excessFeePerKg < 0) {
    errors.push('Additional bag fee cannot be negative');
  }
  
  if (input.maxBags <= 0) {
    errors.push('Maximum bags must be greater than 0');
  }
  
  if (input.maxBags > 10) {
    errors.push('Maximum bags cannot exceed 10');
  }
  
  return errors;
}

// Legacy policy interface for transformation
interface LegacyPolicyData {
  _id: Id<"luggagePolicies">;
  driverId: Id<"profiles">;
  name?: string;
  description?: string;
  freeWeightKg?: number;
  excessFeePerKg?: number;
  maxBags?: number;
  maxBagSize?: string;
  isDefault?: boolean;
  _creationTime: number;
}

/**
 * Transform legacy policy data to new bag-based format
 */
export function transformLegacyPolicy(policy: LegacyPolicyData): LuggagePolicy {
  return {
    _id: policy._id,
    driverId: policy.driverId,
    name: policy.name || 'Legacy Policy',
    description: policy.description,
    freeWeightKg: policy.freeWeightKg || 23,
    excessFeePerKg: policy.excessFeePerKg || 5,
    maxBags: policy.maxBags || 3,
    maxBagSize: policy.maxBagSize,
    isDefault: policy.isDefault || false,
    _creationTime: policy._creationTime,
    
    // Computed properties for backward compatibility
    weightPerBag: policy.freeWeightKg || 23,
    feePerAdditionalBag: policy.excessFeePerKg || 5,
    maxAdditionalBags: (policy.maxBags || 3) - 1,
  };
}

/**
 * Normalize input to handle both new and legacy formats
 */
export function normalizeInput(input: CreateLuggagePolicyInput | LegacyCreateLuggagePolicyInput): CreateLuggagePolicyInput {
  // If it's already in the new format
  if ('freeWeightKg' in input && 'excessFeePerKg' in input && 'maxBags' in input) {
    return input as CreateLuggagePolicyInput;
  }

  // Convert from legacy format
  const legacyInput = input as LegacyCreateLuggagePolicyInput;
  return {
    name: legacyInput.name,
    description: legacyInput.description,
    freeWeightKg: legacyInput.freeWeight || 23,
    excessFeePerKg: legacyInput.feePerExcessKg || 5,
    maxBags: legacyInput.maxBags || 3,
    maxBagSize: legacyInput.maxBagSize,
    isDefault: legacyInput.isDefault
  };
} 