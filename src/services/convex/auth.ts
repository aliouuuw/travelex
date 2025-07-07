import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

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
  const isAuthenticated = useQuery(api.users.isAuthenticated);
  const isFirstUser = useQuery(api.users.isFirstUser);
  const createUserProfile = useMutation(api.users.createUserProfile);

  const adminSignUp = async (credentials: SignUpCredentials) => {
    try {
      await convexSignIn("password", {
        email: credentials.email,
        password: credentials.password,
        name: credentials.full_name,
        flow: "signUp",
      });
      
      // Retry logic for profile creation (in case of timing issues)
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          await new Promise(resolve => setTimeout(resolve, 200 * (retryCount + 1))); // Increasing delay
          
          await createUserProfile({
            fullName: credentials.full_name,
            email: credentials.email,
            role: "admin",
          });
          
          return { success: true };
        } catch (profileError) {
          retryCount++;
          
          const errorMessage = profileError instanceof Error ? profileError.message : String(profileError);
          
          if (errorMessage.includes("Profile already exists")) {
            // Profile already exists, this is actually success
            return { success: true };
          }
          
          if (retryCount >= maxRetries) {
            throw profileError;
          }
          
          console.log(`Profile creation attempt ${retryCount} failed, retrying...`);
        }
      }
      
      return { success: true };
    } catch (error) {
      throw error;
    }
  };  
  

  const signUp = async (credentials: SignUpCredentials) => {
    try {
      // Sign up with Convex Auth
      await convexSignIn("password", {
        email: credentials.email,
        password: credentials.password,
        name: credentials.full_name,
        flow: "signUp",
      });
      // Profile is now created automatically on the backend via newUser
      return { success: true };
    } catch (error) {
      throw error;
    }
  };

  const signIn = async (credentials: SignInCredentials) => {
    try {
      // The `newUser` hook in `convex/auth.ts` will handle creating a profile
      // for the first user automatically upon sign-up.
      await convexSignIn("password", {
        email: credentials.email,
        password: credentials.password,
        flow: "signIn", // Note: use "signIn" for login
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
    isFirstUser: isFirstUser ?? true,
    adminSignUp,
  };
}

// Note: Individual auth functions removed - use useConvexAuth() hook instead
// This ensures proper React context and real-time updates 