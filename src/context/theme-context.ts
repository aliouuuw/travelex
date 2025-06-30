import { createContext, useContext } from "react";

type ThemeProviderState = {
  theme: string;
  setTheme: (theme: string) => void;
};

export const ThemeProviderContext = createContext<ThemeProviderState>({
  theme: "system",
  setTheme: () => null,
});

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}; 