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
    try {
        console.log('updateUserPassword: Starting password update process');
        
        // First check if user is properly authenticated
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.error('Session error:', sessionError);
            throw new Error(`Session error: ${sessionError.message}`);
        }
        
        if (!sessionData.session?.user) {
            console.error('No active session found');
            throw new Error('No active session. Please log in again.');
        }
        
        console.log('updateUserPassword: Session verified, updating password for user:', sessionData.session.user.id);
        
        const { data, error } = await supabase.auth.updateUser({ password });

        if (error) {
            console.error('Supabase password update error:', error);
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

        console.log('Password updated successfully for user:', data.user.id);
        return data;
    } catch (error) {
        console.error('Password update service error:', error);
        throw error;
    }
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