import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  TextField,
  Alert,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  OutlinedInput,
  SelectChangeEvent,
  Divider,
} from "@mui/material";
import { useMatchmaking } from "../hooks/useMatchmaking";
import { getAllTopics } from "../services/questionService";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Home() {
  const { user } = useAuth();
  const [userId, setUserId] = useState(user?.userId || "user123");
  const [difficulty, setDifficulty] = useState("easy");
  const [language, setLanguage] = useState("python");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [lastTopicRefresh, setLastTopicRefresh] = useState<Date | null>(null);
  const [matchTimeLeft, setMatchTimeLeft] = useState(15);
  const navigate = useNavigate();

  // Update userId when user data becomes available
  useEffect(() => {
    if (user?.userId) {
      setUserId(user.userId);
    }
  }, [user]);

  const {
    match,
    question,
    findMatch,
    cancelSearch,
    acceptMatch,
    declineMatch,
    isFinding,
    isAccepting,
    timeProgress,
    error,
  } = useMatchmaking(userId, difficulty, language, selectedTopics, 60);

  // Fetch available topics from database on component mount and refresh periodically
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const topics = await getAllTopics();
        setAvailableTopics(topics);
        setLoadingTopics(false);
        setLastTopicRefresh(new Date());

        // Remove any selected topics that are no longer available
        setSelectedTopics((prev) =>
          prev.filter((topic) => topics.includes(topic))
        );
      } catch (err) {
        console.error("Failed to fetch topics:", err);
        setLoadingTopics(false);
      }
    };

    // Initial fetch
    fetchTopics();

    // Poll for updates every 30 seconds to detect new topics added by admin
    const intervalId = setInterval(fetchTopics, 30000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  const handleManualRefresh = async () => {
    setLoadingTopics(true);
    try {
      const topics = await getAllTopics();
      setAvailableTopics(topics);
      setLastTopicRefresh(new Date());

      // Remove any selected topics that are no longer available
      setSelectedTopics((prev) =>
        prev.filter((topic) => topics.includes(topic))
      );
    } catch (err) {
      console.error("Failed to fetch topics:", err);
    } finally {
      setLoadingTopics(false);
    }
  };

  const handleTopicChange = (
    event: SelectChangeEvent<typeof selectedTopics>
  ) => {
    const {
      target: { value },
    } = event;
    setSelectedTopics(typeof value === "string" ? value.split(",") : value);
  };

  // Navigate to collaboration only when match is accepted
  useEffect(() => {
    if (match && match.sessionId && match.status === "accepted") {
      // Both users have accepted, navigate to session
      console.log("Match accepted, navigating to:", match.sessionId);
      navigate(`/collaboration/${match.sessionId}`);
    }
  }, [match, navigate]);

  // Countdown timer for match acceptance (15 seconds)
  useEffect(() => {
    if (match && match.status === "pending") {
      setMatchTimeLeft(15);

      const timer = setInterval(() => {
        setMatchTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Auto-decline when time runs out
            declineMatch();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [match?.id]); // Only trigger when match ID changes

  const handleFindMatch = async () => {
    await findMatch();
  };

  return (
    <Box sx={{ p: 3, maxWidth: 400 }}>
      <Typography variant="h4" gutterBottom>
        Welcome to PeerPrep
      </Typography>

      <TextField
        label="User ID"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        fullWidth
        sx={{ mb: 3 }}
      />

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="difficulty-label">Difficulty</InputLabel>
        <Select
          labelId="difficulty-label"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <MenuItem value="easy">Easy</MenuItem>
          <MenuItem value="medium">Medium</MenuItem>
          <MenuItem value="hard">Hard</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="language-label">Language</InputLabel>
        <Select
          labelId="language-label"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <MenuItem value="python">Python</MenuItem>
          <MenuItem value="java">Java</MenuItem>
          <MenuItem value="c++">C++</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="topics-label">Topics</InputLabel>
        <Select
          labelId="topics-label"
          multiple
          value={selectedTopics}
          onChange={handleTopicChange}
          input={<OutlinedInput label="Topics" />}
          renderValue={(selected) => (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {selected.map((value) => (
                <Chip
                  key={value}
                  label={value}
                  size="small"
                  onDelete={() => {
                    setSelectedTopics((prev) =>
                      prev.filter((t) => t !== value)
                    );
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                />
              ))}
            </Box>
          )}
          disabled={loadingTopics || availableTopics.length === 0}
        >
          {loadingTopics ? (
            <MenuItem disabled>Loading topics...</MenuItem>
          ) : availableTopics.length === 0 ? (
            <MenuItem disabled>No topics available</MenuItem>
          ) : (
            availableTopics.map((topic) => (
              <MenuItem key={topic} value={topic}>
                {topic}
              </MenuItem>
            ))
          )}
        </Select>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mt: 0.5,
          }}
        >
          <Button
            size="small"
            onClick={handleManualRefresh}
            disabled={loadingTopics}
            sx={{ minWidth: "auto", px: 1, py: 0.5, fontSize: "0.75rem" }}
          >
            {loadingTopics ? "Refreshing..." : "↻ Refresh"}
          </Button>
          {lastTopicRefresh && (
            <Typography variant="caption" color="text.secondary">
              Topics updated: {lastTopicRefresh.toLocaleTimeString()}{" "}
              (auto-refresh every 30s)
            </Typography>
          )}
        </Box>
      </FormControl>

      <Stack direction="row" spacing={2}>
        <Button
          variant="contained"
          onClick={handleFindMatch}
          disabled={isFinding || !!match}
        >
          {match
            ? "Matched!"
            : isFinding
            ? `Finding (${timeProgress}s)`
            : "Find Match"}
        </Button>

        {isFinding && (
          <Button variant="outlined" color="error" onClick={cancelSearch}>
            Cancel
          </Button>
        )}
      </Stack>

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
                  {match.users.find((id) => id !== userId) || "Another user"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  User ID: {match.users.find((id) => id !== userId)}
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
                    <Chip label={language} size="small" variant="outlined" />
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

      {match && match.status === "declined" && (
        <Dialog open maxWidth="sm" fullWidth>
          <DialogTitle>
            {match.decliningUserId === userId
              ? "Match Declined"
              : "Match Declined by Peer"}
          </DialogTitle>
          <DialogContent>
            <Alert
              severity={match.decliningUserId === userId ? "info" : "warning"}
            >
              <Typography variant="body1">
                {match.decliningUserId === userId
                  ? "You declined the match. You can search again."
                  : "Your peer declined the match. Searching for another match..."}
              </Typography>
            </Alert>
          </DialogContent>
        </Dialog>
      )}

      {selectedTopics.length === 0 && !isFinding && !match && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          No topic selected — you may be matched with any category.
        </Alert>
      )}

      {match && match.status !== "pending" && (
        <Alert severity="success" sx={{ mt: 2 }}>
          <Typography variant="body1" sx={{ fontWeight: "bold", mb: 1 }}>
            Match Found! Users: {match.users.join(", ")}
          </Typography>
          {question ? (
            <Box
              sx={{ mt: 2, p: 2, bgcolor: "background.paper", borderRadius: 1 }}
            >
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: "bold", mb: 1 }}
              >
                📝 Selected Question: {question.title}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 0.5 }}
              >
                <strong>Difficulty:</strong> {question.difficulty}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 0.5 }}
              >
                <strong>Topics:</strong> {question.topics.join(", ")}
              </Typography>
              {match.matchedTopics && match.matchedTopics.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  <strong>Matched Topics:</strong>{" "}
                  {match.matchedTopics.join(", ")}
                </Typography>
              )}
            </Box>
          ) : (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Loading question details...
            </Typography>
          )}
        </Alert>
      )}

      {isFinding && !match && (
        <Typography variant="body2" color="text.secondary">
          Searching for peer... progressed {timeProgress}s
        </Typography>
      )}

      {error && <Alert severity="error">{error}</Alert>}
    </Box>
  );
}
