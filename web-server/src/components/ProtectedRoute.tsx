import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Box, CircularProgress, Typography } from "@mui/material";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({
  children,
  requireAdmin = false,
}: ProtectedRouteProps) {
  const { isLoggedIn, isAdmin, profile, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography color="text.secondary">Loading...</Typography>
      </Box>
    );
  }

  // Redirect to landing if not logged in
  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  // Show loading while fetching profile for admin routes
  if (requireAdmin && profile === null) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography color="text.secondary">Verifying permissions...</Typography>
      </Box>
    );
  }

  // If admin access is required, check admin role
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
