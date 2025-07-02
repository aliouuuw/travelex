import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

// Sign up credentials interface
interface SignUpCredentials {
  email: string;
  password: string;
  full_name: string;
}

// Sign in credentials interface  
interface SignInCredentials {
  email: string;
  password: string;
}

// Auth hook for managing authentication state
export function useConvexAuth() {
  const { signIn: convexSignIn, signOut: convexSignOut } = useAuthActions();
  const currentUser = useQuery(api.users.getCurrentUser);
  const createProfile = useMutation(api.users.createUserProfile);
  const isAuthenticated = useQuery(api.users.isAuthenticated);

  const signUp = async (credentials: SignUpCredentials) => {
    try {
      // Sign up with Convex Auth
      await convexSignIn("password", {
        email: credentials.email,
        password: credentials.password,
        flow: "signUp",
      });

      // Create user profile after successful signup
      await createProfile({
        fullName: credentials.full_name,
        email: credentials.email,
        role: "passenger", // Default role
      });

      return { success: true };
    } catch (error) {
      throw error;
    }
  };

  const signIn = async (credentials: SignInCredentials) => {
    try {
      await convexSignIn("password", {
        email: credentials.email,
        password: credentials.password,
        flow: "signIn",
      });
      return { success: true };
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await convexSignOut();
      return { success: true };
    } catch (error) {
      throw error;
    }
  };

  return {
    signUp,
    signIn,
    signOut,
    currentUser,
    isAuthenticated: isAuthenticated ?? false,
    isLoading: currentUser === undefined,
  };
}

// Note: Individual auth functions removed - use useConvexAuth() hook instead
// This ensures proper React context and real-time updates 