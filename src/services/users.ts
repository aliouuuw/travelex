import { supabase } from './supabase';

export type Driver = {
    id: string;
    full_name: string;
    email: string;
    role: string;
    created_at: string;
};

export const getDrivers = async (): Promise<Driver[]> => {
    const { data, error } = await supabase.rpc('get_drivers');

    if (error) {
        console.error('Error fetching drivers:', error);
        throw new Error(error.message);
    }

    return data;
} 