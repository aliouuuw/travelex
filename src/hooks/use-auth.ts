import { useContext } from "react";
import { AuthContext } from "@/context/auth-context";

export type AuthContextType = {
	user: {
		profile: {
			full_name?: string;
			// ... other profile properties
		};
	} | null;
	// ... other auth context properties
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}; 