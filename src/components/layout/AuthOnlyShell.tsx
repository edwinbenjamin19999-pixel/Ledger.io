import { Outlet } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";

/**
 * Lightweight provider wrapper for routes that need useAuth() but don't
 * need the full ProtectedAppShell (no sidebar, no tenant resolution,
 * no redirects). The page itself decides what to do when user is null.
 */
export const AuthOnlyShell = () => (
  <AuthProvider>
    <ThemeProvider>
      <Outlet />
    </ThemeProvider>
  </AuthProvider>
);

export default AuthOnlyShell;
