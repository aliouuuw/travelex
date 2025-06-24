import { supabase } from './supabase';
import type { SignInWithPasswordCredentials } from '@supabase/supabase-js';

// Define a new type for sign-up credentials, including full_name
interface SignUpCredentials {
    email: string;
    password: string;
    full_name: string;
}

export const signUp = async (credentials: SignUpCredentials) => {
    const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
            data: {
                full_name: credentials.full_name,
            },
        },
    });

    if (error) throw error;
    return data;
};

export const signIn = async (credentials: SignInWithPasswordCredentials) => {
    const { data, error } = await supabase.auth.signInWithPassword(credentials);

    if (error) throw error;
    return data;
};

export const signOut = async () => {
    const response = await supabase.auth.signOut();
    return response;
}; 