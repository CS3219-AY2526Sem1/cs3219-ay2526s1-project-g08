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
import { useMatchmaking } from "../hooks/useMatchmaking";
import { getAllTopics } from "../services/questionService";

export default function Home() {
  const [userId, setUserId] = useState("user123");
  const [difficulty, setDifficulty] = useState("easy");
  const [language, setLanguage] = useState("python");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [lastTopicRefresh, setLastTopicRefresh] = useState<Date | null>(null);

  const { match, question, findMatch, isFinding, timeProgress, error, resetMatch } =
    useMatchmaking(userId, difficulty, language, selectedTopics, 60);

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

        {(match || error) && (
          <Button variant="outlined" onClick={resetMatch}>
            Find Again
          </Button>
        )}
      </Stack>

      {selectedTopics.length === 0 && !isFinding && !match && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          No topic selected — you may be matched with any category.
        </Alert>
      )}

      {match && (
        <Alert severity="success">
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
