import { useState, useEffect, useRef } from "react";
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
import {
  TbHome,
  TbUser,
  TbLogout,
  TbShieldCheck,
  TbHistory,
} from "react-icons/tb";
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

  // Debug log for notification state
  useEffect(() => {
    console.log("🔔 Snackbar state changed:", {
      showDeclineNotification,
      notificationMessage,
    });
  }, [showDeclineNotification, notificationMessage]);

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
    console.log("📢 Notification useEffect triggered:", {
      matchStatus: match?.status,
      declinedByMe,
      error,
      showDeclineNotification,
    });

    // Check for peer-related errors that should show notifications
    if (error?.includes("didn't respond")) {
      console.log("→ Case: Peer didn't respond");
      // Peer didn't respond, user accepted - show notification
      setNotificationMessage(
        "The other user didn't respond. Rejoining the queue…"
      );
      setShowDeclineNotification(true);
    } else if (error?.includes("declined by peer")) {
      console.log("→ Case: Peer declined");
      // Peer declined - show notification
      setNotificationMessage(
        "Your peer declined the match. Rejoining the queue…"
      );
      setShowDeclineNotification(true);
    }
  }, [error]);

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
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    sx: { fontSize: { xs: "0.9375rem", md: "1rem" } }, // 15-16px
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        {isFinding && (
          <Box sx={{ px: 2, pb: 1 }}>
            <Stack spacing={1}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: { xs: "0.875rem", md: "0.9375rem" } }} // 14-15px
              >
                Searching… {timeProgress}s
              </Typography>
              <LinearProgress />
              <Button
                fullWidth
                variant="outlined"
                color="error"
                size="small"
                onClick={cancelSearch}
                sx={{ fontSize: { xs: "0.875rem", md: "0.9375rem" } }} // 14-15px
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
            sx={{ fontSize: { xs: "0.9375rem", md: "1rem" } }} // 15-16px
          >
            Logout
          </Button>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, overflow: "auto" }}>
        <Outlet />
      </Box>

      {/* Match Found Modal - Redesigned to match homepage */}
      {match && match.status === "pending" && (
        <Dialog
          open
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: "#181818",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 1.5,
              backgroundImage: "none",
            },
          }}
        >
          <DialogTitle sx={{ pb: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: "1.25rem", md: "1.375rem" }, // 20-22px
                }}
              >
                🎉 Match Found!
              </Typography>
              <Chip
                label={`${matchTimeLeft}s`}
                color={matchTimeLeft <= 5 ? "error" : "primary"}
                size="small"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.875rem", // 14px
                }}
              />
            </Box>
          </DialogTitle>

          <DialogContent sx={{ pt: 0 }}>
            <Stack spacing={2.5}>
              {/* Acceptance Status Card */}
              <Box
                sx={{
                  p: 2,
                  bgcolor: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 1,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      fontSize: { xs: "0.875rem", md: "0.9375rem" }, // 14-15px
                    }}
                  >
                    Acceptance Status
                  </Typography>
                  <Chip
                    label={`${match.acceptedCount || 0}/2 accepted`}
                    size="small"
                    sx={{
                      bgcolor:
                        match.acceptedCount === 1
                          ? "rgba(255, 152, 0, 0.15)"
                          : "rgba(255, 255, 255, 0.08)",
                      color:
                        match.acceptedCount === 1
                          ? "warning.main"
                          : "text.secondary",
                      fontWeight: 500,
                      fontSize: "0.875rem", // 14px
                      border:
                        match.acceptedCount === 1
                          ? "1px solid rgba(255, 152, 0, 0.3)"
                          : "none",
                    }}
                  />
                </Box>
              </Box>

              <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }} />

              {/* Peer Information */}
              <Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  gutterBottom
                  sx={{
                    fontWeight: 500,
                    fontSize: { xs: "0.875rem", md: "0.9375rem" }, // 14-15px
                    mb: 1,
                  }}
                >
                  Matched with
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: "1rem", md: "1.125rem" }, // 16-18px
                    mb: 0.5,
                  }}
                >
                  {peerId}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: "0.875rem" }} // 14px
                >
                  GitHub: {peerId}
                </Typography>
              </Box>

              <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }} />

              {/* Question Information */}
              {question ? (
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                    sx={{
                      fontWeight: 500,
                      fontSize: { xs: "0.875rem", md: "0.9375rem" }, // 14-15px
                      mb: 1,
                    }}
                  >
                    Question
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      mb: 1.5,
                      fontSize: { xs: "1rem", md: "1.125rem" }, // 16-18px
                    }}
                  >
                    {question.title}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.5,
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 10,
                        bgcolor:
                          question.difficulty === "easy"
                            ? "rgba(76, 175, 80, 0.15)"
                            : question.difficulty === "medium"
                            ? "rgba(255, 152, 0, 0.15)"
                            : "rgba(244, 67, 54, 0.15)",
                        border: "1px solid",
                        borderColor:
                          question.difficulty === "easy"
                            ? "rgba(76, 175, 80, 0.3)"
                            : question.difficulty === "medium"
                            ? "rgba(255, 152, 0, 0.3)"
                            : "rgba(244, 67, 54, 0.3)",
                      }}
                    >
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          bgcolor:
                            question.difficulty === "easy"
                              ? "#4caf50"
                              : question.difficulty === "medium"
                              ? "#ff9800"
                              : "#f44336",
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 500,
                          fontSize: "0.875rem", // 14px
                          color:
                            question.difficulty === "easy"
                              ? "#4caf50"
                              : question.difficulty === "medium"
                              ? "#ff9800"
                              : "#f44336",
                          textTransform: "capitalize",
                        }}
                      >
                        {question.difficulty}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.5,
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 10,
                        bgcolor: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 500,
                          fontSize: "0.875rem", // 14px
                          color: "text.secondary",
                        }}
                      >
                        Language
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: { xs: "0.875rem", md: "0.9375rem" } }} // 14-15px
                  >
                    <Box component="span" sx={{ fontWeight: 500 }}>
                      Topics:
                    </Box>{" "}
                    {question.topics.join(", ")}
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: { xs: "0.875rem", md: "0.9375rem" } }} // 14-15px
                  >
                    Loading question details...
                  </Typography>
                </Box>
              )}

              <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }} />

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontStyle: "italic",
                  fontSize: { xs: "0.875rem", md: "0.9375rem" }, // 14-15px
                }}
              >
                Both users must accept to start the collaboration session.
              </Typography>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ p: 3, pt: 2 }}>
            <Button
              onClick={declineMatch}
              variant="outlined"
              sx={{
                borderColor: "rgba(244, 67, 54, 0.5)",
                color: "#f44336",
                fontSize: { xs: "1rem", md: "1.0625rem" }, // 16-17px
                textTransform: "uppercase",
                fontWeight: 600,
                px: 3,
                "&:hover": {
                  borderColor: "#f44336",
                  bgcolor: "rgba(244, 67, 54, 0.08)",
                },
              }}
            >
              Decline
            </Button>
            <Button
              onClick={acceptMatch}
              variant="contained"
              disabled={isAccepting || !match || match.status !== "pending"}
              sx={{
                fontSize: { xs: "1rem", md: "1.0625rem" }, // 16-17px
                textTransform: "uppercase",
                fontWeight: 600,
                px: 3,
              }}
            >
              {isAccepting ? "Accepting..." : "Accept"}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Match Declined / Timeout Modal - Redesigned */}
      {match &&
        match.status === "declined" &&
        (declinedByMe || error?.includes("didn't accept in time")) && (
          <Dialog
            open
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                bgcolor: "#181818",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 1.5,
                backgroundImage: "none",
              },
            }}
          >
            <DialogTitle sx={{ pb: 2 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: "1.25rem", md: "1.375rem" }, // 20-22px
                  color: declinedByMe ? "#f44336" : "#ff9800",
                }}
              >
                {declinedByMe ? "Match Declined" : "Match Timed Out"}
              </Typography>
            </DialogTitle>
            <DialogContent sx={{ pt: 0 }}>
              <Box
                sx={{
                  p: 2.5,
                  bgcolor: declinedByMe
                    ? "rgba(244, 67, 54, 0.08)"
                    : "rgba(255, 152, 0, 0.08)",
                  border: "1px solid",
                  borderColor: declinedByMe
                    ? "rgba(244, 67, 54, 0.2)"
                    : "rgba(255, 152, 0, 0.2)",
                  borderRadius: 1,
                }}
              >
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: { xs: "1rem", md: "1.0625rem" }, // 16-17px
                    lineHeight: 1.6,
                  }}
                >
                  {declinedByMe
                    ? "You declined the match. Click close to search again."
                    : "You didn't accept in time. Click close to search again."}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 2 }}>
              <Button
                onClick={resetMatch}
                variant="contained"
                autoFocus
                sx={{
                  fontSize: { xs: "1rem", md: "1.0625rem" }, // 16-17px
                  textTransform: "uppercase",
                  fontWeight: 600,
                  px: 3,
                }}
              >
                Close
              </Button>
            </DialogActions>
          </Dialog>
        )}

      {/* Notification for peer decline or timeout */}
      <Snackbar
        open={showDeclineNotification}
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
