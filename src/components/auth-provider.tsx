import { useEffect, useState } from "react";
import { supabase } from "@/services/supabase";
import { AuthContext } from "@/context/auth-context";
import type { Session, User } from "@supabase/supabase-js";

// Define the structure of the user profile
interface UserProfile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  role?: "admin" | "driver" | "passenger";
  email?: string;
  phone?: string;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<(User & { profile: UserProfile | null }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordSetup, setIsPasswordSetup] = useState(false);

  useEffect(() => {
    const getSessionAndProfile = async () => {
      setIsLoading(true);
      const { data: { session }, } = await supabase.auth.getSession();
      setSession(session);

      if (session) {
        const hasPassword = session.user.identities?.some(
          (i) => i.provider === 'email'
        );
        setIsPasswordSetup(!!hasPassword);

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setUser({ ...session.user, profile });
      } else {
        setUser(null);
        setIsPasswordSetup(false);
      }
      setIsLoading(false);
    };

    getSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session) {
          const hasPassword = session.user.identities?.some(
            (i) => i.provider === 'email'
          );
          setIsPasswordSetup(!!hasPassword);
          // Use setTimeout to avoid deadlock as recommended by Supabase docs
          setTimeout(async () => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .single();
            setUser({ ...session.user, profile });
            setIsLoading(false);
          }, 0);
        } else {
          setUser(null);
          setIsPasswordSetup(false);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, isLoading, isPasswordSetup, signOut }}>
      {children}
    </AuthContext.Provider>
  );
} 