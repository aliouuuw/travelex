import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export type CreateSignupRequestData = {
  full_name: string;
  email: string;
  message?: string;
};

// Function to create signup request (for use in forms)
// export const createSignupRequest = async (_data: CreateSignupRequestData) => {
//   // This function signature is maintained for compatibility
//   // but the actual implementation will be through the hook
//   throw new Error("Use useCreateSignupRequest hook instead");
// };

// React hooks for Convex operations
export const useCreateSignupRequest = () => {
  return useMutation(api.signupRequests.createSignupRequest);
};

export const useGetSignupRequests = () => {
  return useQuery(api.signupRequests.getSignupRequests);
};

export const useGetPendingSignupRequests = () => {
  return useQuery(api.signupRequests.getPendingSignupRequests);
};

export const useUpdateSignupRequestStatus = () => {
  return useMutation(api.signupRequests.updateSignupRequestStatus);
}; 