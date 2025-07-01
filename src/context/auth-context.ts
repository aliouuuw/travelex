import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  role?: "admin" | "driver" | "passenger";
  email?: string;
  phone?: string;
}

export type AuthContextType = {
  session: Session | null;
  user: (User & { profile: UserProfile | null }) | null;
  isLoading: boolean;
  isPasswordSetup: boolean;
  signOut: () => void;
};

export const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  isPasswordSetup: false,
  signOut: () => {},
}); 
