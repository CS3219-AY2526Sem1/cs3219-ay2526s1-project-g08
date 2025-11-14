import React, { useState, useEffect, useRef } from "react"; 
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
  LinearProgress, //added for queue progress bar 
  Typography,
  Chip,
  Dialog, //added for match found
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Alert,
  Divider,
} from "@mui/material";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { TbHome, TbUser, TbLogout, TbShieldCheck } from "react-icons/tb";
import { useAuth } from "../hooks/useAuth";
import { stopTokenRefreshTimer } from "../utils/tokenRefresh";
import { useMatchmakingContext } from "../hooks/MatchmakingGlobal";

const SIDEBAR_WIDTH = 240;

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, user } = useAuth(); //need user object to check ID

  const {
    match,
    question,
    isFinding,
    timeProgress,
    acceptMatch,
    declineMatch,
    isAccepting,
    resetMatch, //for clearing declined state
    currentUserId, //to use in acceptance msg 
  } = useMatchmakingContext();

  const peerId =
  match?.users.find((id) => id !== currentUserId) ??
  match?.users[0] ??
  "Another user";

  const declinedByMe = match?.decliningUserId === currentUserId;

  const [matchTimeLeft, setMatchTimeLeft] = useState(15);

  const menuItems = [
    { path: "/home", label: "Home", icon: <TbHome /> },
    { path: "/profile", label: "Profile", icon: <TbUser /> },
  ];

  const pendingDeadlineRef = useRef<number | null>(null); //store remaining time left on timer
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  useEffect(() => {
    if (match && match.sessionId && match.status === "accepted") {
      console.log("Match accepted, navigating to:", match.sessionId);
      navigate(`/collaboration/${match.sessionId}`);
    }
  }, [match, navigate]);

  useEffect(() => {
    if (match?.status !== "pending") {
      pendingDeadlineRef.current = null; 
      setMatchTimeLeft(15); //reset timer to default 15s to give users to accept match
      if(timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return; 
    }

    if (!pendingDeadlineRef.current || pendingDeadlineRef.current.matchId !== match.id){
      pendingDeadlineRef.current = { matchId: match.id, deadline: Date.now() + 15000};
    }

    const deadline = pendingDeadlineRef.current.deadline;

    if(timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        setMatchTimeLeft(remaining); 
        if (remaining === 0){
          clearInterval(timerRef.current!);
          timerRef.current = null; 
          declineMatch(); //decline match since time to accept has ended
        }
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
  }, [match?.id, match?.status, declineMatch]); // declineMatch is a stable context function

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

        {isFinding && (
          <Box sx={{ px: 2, pb: 1 }}>
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                Searching… {timeProgress}s
              </Typography>
              <LinearProgress />
            </Stack>
          </Box>
        )}

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

    {/* added from Home.tsx to be handled now globally instead */}
    {match && match.status === "pending" && (
        <Dialog open maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", }} >
              <span>🎉 Match Found!</span>
              <Chip
                label={`${matchTimeLeft}s`}
                color={matchTimeLeft <= 5 ? "error" : "primary"}
                size="small"
              />
            </Box>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {/* Acceptance Status */}
              <Alert severity="info" sx={{ display: "flex", alignItems: "center", "& .MuiAlert-message": { width: "100%" }, }} >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", }} >
                  <Typography variant="body2">Acceptance Status</Typography>
                  <Chip label={`${match.acceptedCount || 0}/2 accepted`} color={match.acceptedCount === 1 ? "warning" : "default"} size="small" />
                </Box>
              </Alert>

              {/* Peer Information */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Matched with:</Typography>
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                  {/* {match.users.find((id) => id !== (user?.userId || "user123")) || "Another user"} */}
                  {peerId}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  User ID: {peerId} {/* {match.users.find((id) => id !== (user?.userId || "user123"))}  */} 
                </Typography>
              </Box>

              <Divider />

              {/* Question Information */}
              {question ? (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Question:</Typography>
                  <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>{question.title}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <Chip label={question.difficulty} size="small" color={question.difficulty === "easy" ? "success" : question.difficulty === "medium" ? "warning" : "error"} />
                    {/* ⚠️ NOTE: Language is hardcoded as we don't have that state here. */}
                    <Chip label={"Language"} size="small" variant="outlined" /> 
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Topics:</strong> {question.topics.join(", ")}
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Typography variant="body2" color="text.secondary">Loading question details...</Typography>
                </Box>
              )}
              <Divider />
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                Both users must accept to start the collaboration session.
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={declineMatch} variant="outlined" color="error">Decline</Button>
            <Button
              onClick={acceptMatch}
              variant="contained"
              disabled={isAccepting || !match || match.status !== "pending"}
            >
              {isAccepting ? "Accepting..." : "Accept"}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* ADD: Persistent Match Declined/Timed Out Dialog */}
      {match && match.status === "declined" && (
        <Dialog open maxWidth="sm" fullWidth>
          <DialogTitle>
            {declinedByMe 
              ? "Match Declined"
              : "Match Ended"}
          </DialogTitle>
          <DialogContent>
            <Alert severity={declinedByMe ? "info" : "warning"} >
              <Typography variant="body1">
                {declinedByMe
                  ? "You declined the match. Click close to search again."
                  : "The match was declined by your peer or timed out. Click close to search again."}
              </Typography>
            </Alert>
          </DialogContent>
          <DialogActions>
            {/* NOTE: Use resetMatch from context to clear state */}
            <Button onClick={resetMatch} autoFocus>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
