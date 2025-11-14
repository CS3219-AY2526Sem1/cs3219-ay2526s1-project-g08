import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
} from "@mui/material";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { TbHome, TbUser, TbLogout, TbShieldCheck, TbHistory } from "react-icons/tb";
import { useAuth } from "../hooks/useAuth";
import { stopTokenRefreshTimer } from "../utils/tokenRefresh";

const SIDEBAR_WIDTH = 240;

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();

  const menuItems = [
    { path: "/home", label: "Home", icon: <TbHome /> },
    { path: "/profile", label: "Profile", icon: <TbUser /> },
    { path: "/history", label: "Collaboration History", icon: <TbHistory /> },
  ];

  // Add admin dashboard for admin users
  if (isAdmin) {
    menuItems.splice(1, 0, {
      path: "/admin",
      label: "Admin Dashboard",
      icon: <TbShieldCheck />,
    });
  }

  const handleLogout = async () => {
    // Stop token refresh timer
    stopTokenRefreshTimer();

    // Clean up WebSocket connection if it exists
    const ws = window.matchmakingWS;
    if (ws && ws.readyState === WebSocket.OPEN) {
      // Just close the connection - backend handles queue cleanup
      ws.close();
      delete window.matchmakingWS;
    }

    // Call backend logout to revoke refresh token
    try {
      await fetch("http://localhost:3002/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      console.log("✓ Logout successful");
    } catch (error) {
      console.error("Logout request failed:", error);
    }

    // Clear local storage
    localStorage.removeItem("user");

    // Always navigate to landing page
    navigate("/");
  };

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <Box
        sx={{
          width: SIDEBAR_WIDTH,
          bgcolor: "background.paper",
          borderRight: 1,
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ p: 2 }}>
          <h2>PeerPrep</h2>
        </Box>

        <List sx={{ flex: 1 }}>
          {menuItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => navigate(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Box sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<TbLogout />}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, overflow: "auto" }}>
        <Outlet />
      </Box>
    </Box>
  );
}
