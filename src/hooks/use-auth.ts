import { useConvexAuth } from "@/services/convex/auth";

export type AuthContextType = {
	user: {
		profile: {
			fullName?: string;
			role?: "admin" | "driver" | "passenger";
			email?: string;
			phone?: string;
		} | null;
	} | null;
	session: {
		user: {
			profile: {
				fullName?: string;
				role?: "admin" | "driver" | "passenger";
				email?: string;
				phone?: string;
			} | null;
		} | null;
	};
	isLoading: boolean;
	isPasswordSetup: boolean;
	signOut: () => Promise<{ success: boolean }>;
};

export const useAuth = () => {
	const { currentUser, isAuthenticated, isLoading, signOut } = useConvexAuth();
	
	// Map Convex profile structure
	const profile = currentUser?.profile ? {
		id: currentUser.profile._id,
		fullName: currentUser.profile.fullName,
		avatarUrl: currentUser.profile.avatarUrl,
		role: currentUser.profile.role,
		email: currentUser.profile.email,
		phone: currentUser.profile.phone,
	} : null;

	// Create user object that matches old Supabase pattern
	const user = currentUser ? {
		id: currentUser._id,
		email: currentUser.email || '',
		profile,
	} : null;
	
	// Return object that matches old Supabase auth interface
	return {
		user,
		session: user ? { user } : null, // Mock session for compatibility
		isLoading,
		isPasswordSetup: isAuthenticated, // For Convex, being authenticated means password is set
		signOut,
	};
}; 