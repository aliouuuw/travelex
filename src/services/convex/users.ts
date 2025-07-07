import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

// React hooks for Convex user operations
export const useGetCurrentUser = () => {
  return useQuery(api.users.getCurrentUser);
};

export const useUpdateUserProfile = () => {
  return useMutation(api.users.updateUserProfile);
};

export const useCreateUserProfile = () => {
  return useMutation(api.users.createUserProfile);
};

export const useGetUserByEmail = (args?: { email: string }) => {
  return useQuery(api.users.getUserByEmail, args || "skip");
};

export const useUpdateUserRole = () => {
  return useMutation(api.users.updateUserRole);
};

export const useGetProfileById = (args?: { profileId: Id<"profiles"> }) => {
  return useQuery(api.users.getProfileById, args || "skip");
};

// Avatar upload hooks
export const useGenerateAvatarUploadUrl = () => {
  return useMutation(api.users.generateAvatarUploadUrl);
};

export const useSaveAvatar = () => {
  return useMutation(api.users.saveAvatar);
};

// Hook for changing password
export const useChangePassword = () => {
  return useMutation(api.users.changePassword);
};

// Hook to get all drivers for admin use
export const useGetAllDrivers = () => {
  return useQuery(api.users.getAllDrivers);
};

// Hook to send password reset email to driver
export const useSendDriverPasswordReset = () => {
  return useMutation(api.users.sendDriverPasswordReset);
};

// Driver type for TypeScript
export interface Driver {
  id: Id<"profiles">;
  full_name: string;
  email: string;
  phone?: string;
  rating?: number;
  created_at: number;
  role: string;
}

// Function to get all drivers (for backward compatibility)
export const getDrivers = async (): Promise<Driver[]> => {
  throw new Error('Use useGetAllDrivers hook instead');
};

// Function to send password reset (for backward compatibility)
export const resetPassword = async (): Promise<void> => {
  throw new Error('Use useSendDriverPasswordReset hook instead');
};

// Helper function to upload avatar image using Convex file storage
export const uploadAvatarImage = async (
  file: File,
  generateUploadUrl: () => Promise<string>,
  saveAvatar: (args: { storageId: Id<"_storage"> }) => Promise<string>
): Promise<void> => {
  try {
    // Step 1: Generate upload URL
    const postUrl = await generateUploadUrl();
    
    // Step 2: Upload file to Convex storage
    const result = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    
    if (!result.ok) {
      throw new Error("Failed to upload image");
    }
    
    // Step 3: Get storage ID and save to profile
    const { storageId } = await result.json();
    await saveAvatar({ storageId });
    
  } catch (error) {
    console.error("Avatar upload failed:", error);
    throw new Error("Failed to upload avatar image");
  }
}; 