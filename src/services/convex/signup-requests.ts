import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

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

// New hooks for the invitation system
export const useApproveAndInvite = () => {
  return useMutation(api.signupRequests.approveAndInvite);
};

export const useGetSignupRequestById = (args?: { requestId: Id<"signupRequests"> }) => {
  return useQuery(api.signupRequests.getSignupRequestById, args || "skip");
};

// Invitation management hooks
export const useCreateInvitation = () => {
  return useMutation(api.invitations.createInvitation);
};

export const useValidateInvitationToken = (args?: { token: string }) => {
  return useQuery(api.invitations.validateInvitationToken, args || "skip");
};

export const useGetInvitationByToken = (args?: { token: string }) => {
  return useQuery(api.invitations.getInvitationByToken, args || "skip");
};

export const useAcceptInvitation = () => {
  return useMutation(api.invitations.acceptInvitation);
};



// Password reset hooks
export const useRequestPasswordReset = () => {
  return useMutation(api.passwordReset.requestPasswordReset);
};

export const useValidateResetToken = (args?: { token: string }) => {
  return useQuery(api.passwordReset.validateResetToken, args || "skip");
};

// Hook to create profile from invitation token
export const useCreateProfileFromInvitation = () => {
  return useMutation(api.invitations.createProfileFromInvitation);
}; 