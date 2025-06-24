import { supabase } from './supabase';
import type { SignInWithPasswordCredentials, SignUpWithPasswordCredentials } from '@supabase/supabase-js';

export const signUp = async (credentials: SignUpWithPasswordCredentials) => {
    const response = await supabase.auth.signUp(credentials);
    return response;
};

export const signIn = async (credentials: SignInWithPasswordCredentials) => {
    const response = await supabase.auth.signInWithPassword(credentials);
    return response;
};

export const signOut = async () => {
    const response = await supabase.auth.signOut();
    return response;
}; 