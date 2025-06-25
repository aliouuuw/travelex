import { supabase } from './supabase';

export type SignupRequest = {
    id: string;
    full_name: string;
    email: string;
    message?: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    updated_at: string;
    reviewed_by?: string;
    reviewed_at?: string;
};

export type CreateSignupRequestData = {
    full_name: string;
    email: string;
    message?: string;
};

export const createSignupRequest = async (data: CreateSignupRequestData): Promise<SignupRequest> => {
    const { data: result, error } = await supabase
        .from('signup_requests')
        .insert(data)
        .select()
        .single();

    if (error) {
        console.error('Error creating signup request:', error);
        throw new Error(error.message);
    }

    return result;
};

export const getSignupRequests = async (): Promise<SignupRequest[]> => {
    // Verify user is admin before allowing access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error('Authentication required');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        throw new Error('Admin access required');
    }

    const { data, error } = await supabase
        .from('signup_requests')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching signup requests:', error);
        throw new Error(error.message);
    }

    return data;
};

export const getPendingSignupRequests = async (): Promise<SignupRequest[]> => {
    const { data, error } = await supabase
        .from('signup_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching pending signup requests:', error);
        throw new Error(error.message);
    }

    return data;
};

export const updateSignupRequestStatus = async (
    id: string, 
    status: 'approved' | 'rejected'
): Promise<SignupRequest> => {
    // Verify user is admin before allowing update
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error('Authentication required');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        throw new Error('Admin access required');
    }

    const { data: result, error } = await supabase
        .from('signup_requests')
        .update({
            status,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating signup request:', error);
        throw new Error(error.message);
    }

    return result;
}; 