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
  Snackbar, //added for auto-dismissing notification
} from "@mui/material";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { TbHome, TbUser, TbLogout, TbShieldCheck, TbHistory } from "react-icons/tb";
import { useAuth } from "../hooks/useAuth";
import { stopTokenRefreshTimer } from "../utils/tokenRefresh";
import { useMatchmakingContext } from "../hooks/MatchmakingGlobal";

const SIDEBAR_WIDTH = 240;

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();

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
    cancelSearch, //for cancel button in global searching bar
    error, //to detect timeout case
    hasAccepted, //to check if user accepted before timeout
  } = useMatchmakingContext();

  const peerId =
    match?.users.find((id) => id !== currentUserId) ??
    match?.users[0] ??
    "Another user";

  const declinedByMe = match?.decliningUserId === currentUserId;

  const [matchTimeLeft, setMatchTimeLeft] = useState(15);
  const [showDeclineNotification, setShowDeclineNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");

  const menuItems = [
    { path: "/home", label: "Home", icon: <TbHome /> },
    { path: "/profile", label: "Profile", icon: <TbUser /> },
    { path: "/history", label: "Collaboration History", icon: <TbHistory /> },
  ];

  const pendingDeadlineRef = useRef<{
    matchId: string;
    deadline: number;
  } | null>(null); //store match info and deadline
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

  // Show notification when peer declines or timeout occurs
  useEffect(() => {
    if (match?.status === "declined" && !declinedByMe) {
      // Check if it's a timeout or peer decline
      if (error?.includes("didn't respond")) {
        // Peer didn't respond, user accepted - show notification
        setNotificationMessage(
          "The other user didn't respond. Rejoining the queue…"
        );
        setShowDeclineNotification(true);

        // Auto-hide after 3 seconds
        const timer = setTimeout(() => {
          setShowDeclineNotification(false);
        }, 3000);
        return () => clearTimeout(timer);
      } else if (error?.includes("didn't accept in time")) {
        // User didn't accept in time - don't show notification, modal will handle it
        setShowDeclineNotification(false);
      } else {
        // Peer declined - show notification
        setNotificationMessage(
          "Your peer declined the match. Rejoining the queue…"
        );
        setShowDeclineNotification(true);

        // Auto-hide after 3 seconds
        const timer = setTimeout(() => {
          setShowDeclineNotification(false);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [match?.status, match?.id, declinedByMe, error]);

  useEffect(() => {
    if (match?.status !== "pending") {
      pendingDeadlineRef.current = null;
      setMatchTimeLeft(15); //reset timer to default 15s to give users to accept match
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (
      !pendingDeadlineRef.current ||
      pendingDeadlineRef.current.matchId !== match.id
    ) {
      pendingDeadlineRef.current = {
        matchId: match.id,
        deadline: Date.now() + 15000,
      };
    }

    const deadline = pendingDeadlineRef.current.deadline;

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setMatchTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        // Only decline if user hasn't accepted yet
        // If user accepted, backend will handle the timeout
        if (!hasAccepted) {
          declineMatch(); //decline match since time to accept has ended
        }
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [match?.id, match?.status, declineMatch, hasAccepted]); // Added hasAccepted to dependencies

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
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary">
                Searching… {timeProgress}s
              </Typography>
              <LinearProgress />
              <Button
                fullWidth
                variant="outlined"
                color="error"
                size="small"
                onClick={cancelSearch}
              >
                Cancel Search
              </Button>
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
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
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
              <Alert
                severity="info"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  "& .MuiAlert-message": { width: "100%" },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <Typography variant="body2">Acceptance Status</Typography>
                  <Chip
                    label={`${match.acceptedCount || 0}/2 accepted`}
                    color={match.acceptedCount === 1 ? "warning" : "default"}
                    size="small"
                  />
                </Box>
              </Alert>

              {/* Peer Information */}
              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Matched with:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                  {/* {match.users.find((id) => id !== (user?.userId || "user123")) || "Another user"} */}
                  {peerId}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  GitHub User ID: {peerId}{" "}
                  {/* {match.users.find((id) => id !== (user?.userId || "user123"))}  */}
                </Typography>
              </Box>

              <Divider />

              {/* Question Information */}
              {question ? (
                <Box>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Question:
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                    {question.title}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <Chip
                      label={question.difficulty}
                      size="small"
                      color={
                        question.difficulty === "easy"
                          ? "success"
                          : question.difficulty === "medium"
                          ? "warning"
                          : "error"
                      }
                    />
                    {/* ⚠️ NOTE: Language is hardcoded as we don't have that state here. */}
                    <Chip label={"Language"} size="small" variant="outlined" />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Topics:</strong> {question.topics.join(", ")}
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Loading question details...
                  </Typography>
                </Box>
              )}
              <Divider />
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontStyle: "italic" }}
              >
                Both users must accept to start the collaboration session.
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={declineMatch} variant="outlined" color="error">
              Decline
            </Button>
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

      {/* ADD: Persistent Match Declined Dialog - For user's own decline or timeout */}
      {match &&
        match.status === "declined" &&
        (declinedByMe || error?.includes("didn't accept in time")) && (
          <Dialog open maxWidth="sm" fullWidth>
            <DialogTitle>
              {declinedByMe ? "Match Declined" : "Match Timed Out"}
            </DialogTitle>
            <DialogContent>
              <Alert severity="info">
                <Typography variant="body1">
                  {declinedByMe
                    ? "You declined the match. Click close to search again."
                    : "You didn't accept in time. Click close to search again."}
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

      {/* Auto-dismissing notification for peer decline or timeout */}
      <Snackbar
        open={showDeclineNotification}
        autoHideDuration={3000}
        onClose={() => setShowDeclineNotification(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity="warning"
          onClose={() => setShowDeclineNotification(false)}
          sx={{ width: "100%" }}
        >
          {notificationMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
