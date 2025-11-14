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
  Chip,
  OutlinedInput,
  SelectChangeEvent,
} from "@mui/material";

import { getAllTopics } from "../services/questionService";
import { useAuth } from "../hooks/useAuth";
import { useMatchmakingContext } from "../hooks/MatchmakingGlobal";

export default function Home() {
  const { user } = useAuth();

  const [localUserId, setLocalUserId] = useState(user?.userId || "user123");
  const [localDifficulty, setLocalDifficulty] = useState("easy");
  const [localLanguage, setLocalLanguage] = useState("python");
  const [localSelectedTopics, setLocalSelectedTopics] = useState<string[]>([]);

  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [lastTopicRefresh, setLastTopicRefresh] = useState<Date | null>(null);

  // Update userId when user data becomes available
  useEffect(() => {
    if (user?.userId) {
      setLocalUserId(user.userId);
    }
  }, [user?.userId]);

  const {
    match,
    findMatch,
    cancelSearch,
    isFinding,
    timeProgress,
    error,
    setMatchParams, //new setter added to matchmaking
  } = useMatchmakingContext();

  // useEffect to send arguments to persistent context
  useEffect(() => {
    setMatchParams({
      userId: localUserId,
      difficulty: localDifficulty,
      language: localLanguage,
      topics: localSelectedTopics,
    });
  }, [
    localUserId,
    localDifficulty,
    localLanguage,
    localSelectedTopics,
    setMatchParams,
  ]);

  // Fetch available topics from database on component mount and refresh periodically
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const topics = await getAllTopics();
        setAvailableTopics(topics);
        setLoadingTopics(false);
        setLastTopicRefresh(new Date());

        // Remove any selected topics that are no longer available
        setLocalSelectedTopics((prev) =>
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
      setLocalSelectedTopics((prev) =>
        prev.filter((topic) => topics.includes(topic))
      );
    } catch (err) {
      console.error("Failed to fetch topics:", err);
    } finally {
      setLoadingTopics(false);
    }
  };

  const handleTopicChange = (
    event: SelectChangeEvent<typeof localSelectedTopics>
  ) => {
    const {
      target: { value },
    } = event;
    setLocalSelectedTopics(
      typeof value === "string" ? value.split(",") : value
    );
  };

  //to be called by MatchMaking global
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
        value={localUserId}
        onChange={(e) => setLocalUserId(e.target.value)}
        fullWidth
        sx={{ mb: 3 }}
      />

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="difficulty-label">Difficulty</InputLabel>
        <Select
          labelId="difficulty-label"
          value={localDifficulty}
          onChange={(e) => setLocalDifficulty(e.target.value)}
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
          value={localLanguage}
          onChange={(e) => setLocalLanguage(e.target.value)}
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
          value={localSelectedTopics}
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
                    setLocalSelectedTopics((prev) =>
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

      {localSelectedTopics.length === 0 && !isFinding && !match && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          No topic selected — you may be matched with any category.
        </Alert>
      )}

      {isFinding && !match && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Searching for peer...
        </Typography>
      )}

      {error && !error.includes("declined") && !error.includes("didn't") && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
