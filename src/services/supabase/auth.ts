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

export const updateUserPassword = async (password: string) => {
    // First check if user is properly authenticated
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
        throw new Error(`Session error: ${sessionError.message}`);
    }
    
    if (!sessionData.session?.user) {
        console.error('No active session. Please log in again.' + sessionData);
        throw new Error('No active session. Please log in again.');
    }
    
    const { data, error } = await supabase.auth.updateUser({ password });

    if (error) {
        // Provide more specific error messages
        if (error.message.includes('same password')) {
            throw new Error('New password must be different from your current password');
        }
        throw new Error(`Password update failed: ${error.message}`);
    }

    // Verify the update was successful
    if (!data.user) {
        throw new Error('Password update failed: No user data returned');
    }

    return data;
};

export const resetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset-password`,
    });

    if (error) {
        throw new Error(error.message);
    }

    return data;
}; 