import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Button,
  Alert,
  Stack,
  Chip,
  OutlinedInput,
  SelectChangeEvent,
  Paper,
  Grid,
} from "@mui/material";
import {
  TbStar,
  TbAlertTriangle,
  TbCode,
  TbUser,
  TbCircleCheck,
} from "react-icons/tb";
import { SiCplusplus } from "react-icons/si";
import { FaJava, FaPython } from "react-icons/fa";

import { getAllTopics } from "../services/questionService";
import { useAuth } from "../hooks/useAuth";
import { useMatchmakingContext } from "../hooks/MatchmakingGlobal";

export default function Home() {
  const { user, checkInSession } = useAuth();

  const [localDifficulty, setLocalDifficulty] = useState("easy");
  const [localLanguage, setLocalLanguage] = useState("python");
  const [localSelectedTopics, setLocalSelectedTopics] = useState<string[]>([]);

  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);

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
    if (!user?.userId) return;

    setMatchParams({
      userId: user.userId,
      difficulty: localDifficulty,
      language: localLanguage,
      topics: localSelectedTopics,
    });
  }, [
    user?.userId,
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
    // Check if user is currently in a session before allowing them to find a match
    console.log("Checking if user is in session before finding match...");
    const inSession = await checkInSession();
    console.log("User inSession status:", inSession);
    
    if (inSession) {
      // Show an error message to the user
      console.log("User is in session - blocking queue entry");
      alert("You are currently in an active session. Please leave your current session before searching for a new match.");
      return;
    }
    
    console.log("User is not in session - allowing queue entry");
    await findMatch();
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
      }}
    >
      <Box sx={{ maxWidth: "1200px", width: "100%" }}>
        {/* Top Section - Welcome Text */}
        <Box sx={{ mb: 3, textAlign: "center" }}>
          <Typography
            variant="h3"
            gutterBottom
            sx={{
              fontWeight: 600,
              mb: 1,
              fontSize: { xs: "2rem", md: "2.25rem" }, // 36-40px
            }}
          >
            Welcome to PeerPrep
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              lineHeight: 1.6,
              fontSize: { xs: "1.125rem", md: "1.25rem" }, // 18-20px
            }}
          >
            Choose your preferences and get matched with another candidate for a
            live interview session.
          </Typography>
        </Box>

        {/* Bottom Section - Form and Illustration */}
        <Grid container spacing={4} alignItems="flex-start">
          {/* Left side - Form */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 4,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1.5, // Reduced from 2
              }}
            >
              <Typography
                variant="h5"
                gutterBottom
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: "1.25rem", md: "1.375rem" }, // 20-22px
                  mb: 3,
                }}
              >
                Start a Practice Session
              </Typography>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <Typography
                  variant="body2"
                  sx={{
                    mb: 1,
                    fontWeight: 500,
                    color: "text.secondary",
                    fontSize: { xs: "0.875rem", md: "0.9375rem" }, // 14-15px
                  }}
                >
                  Difficulty
                </Typography>
                <Select
                  value={localDifficulty}
                  onChange={(e) => setLocalDifficulty(e.target.value)}
                  disabled={isFinding || !!match}
                  displayEmpty
                  sx={{
                    "& .MuiSelect-select": {
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      fontSize: { xs: "1rem", md: "1.0625rem" }, // 16-17px
                    },
                  }}
                >
                  <MenuItem value="easy">
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <TbStar size={18} style={{ color: "#4caf50" }} />
                      Easy
                    </Box>
                  </MenuItem>
                  <MenuItem value="medium">
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <TbStar size={18} style={{ color: "#ff9800" }} />
                      Medium
                    </Box>
                  </MenuItem>
                  <MenuItem value="hard">
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <TbStar size={18} style={{ color: "#f44336" }} />
                      Hard
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <Typography
                  variant="body2"
                  sx={{
                    mb: 1,
                    fontWeight: 500,
                    color: "text.secondary",
                    fontSize: { xs: "0.875rem", md: "0.9375rem" }, // 14-15px
                  }}
                >
                  Language
                </Typography>
                <Select
                  value={localLanguage}
                  onChange={(e) => setLocalLanguage(e.target.value)}
                  disabled={isFinding || !!match}
                  sx={{
                    "& .MuiSelect-select": {
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      fontSize: { xs: "1rem", md: "1.0625rem" }, // 16-17px
                    },
                  }}
                >
                  <MenuItem value="python">
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <FaPython size={20} style={{ color: "#3776ab" }} />
                      Python
                    </Box>
                  </MenuItem>
                  <MenuItem value="java">
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <FaJava size={20} style={{ color: "#007396" }} />
                      Java
                    </Box>
                  </MenuItem>
                  <MenuItem value="c++">
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <SiCplusplus size={18} style={{ color: "#00599C" }} />
                      C++
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <Typography
                  variant="body2"
                  sx={{
                    mb: 1,
                    fontWeight: 500,
                    color: "text.secondary",
                    fontSize: { xs: "0.875rem", md: "0.9375rem" }, // 14-15px
                  }}
                >
                  Topics
                </Typography>
                <Select
                  multiple
                  value={localSelectedTopics}
                  onChange={handleTopicChange}
                  displayEmpty
                  input={<OutlinedInput />}
                  sx={{
                    "& .MuiSelect-select": {
                      fontSize: { xs: "1rem", md: "1.0625rem" }, // 16-17px
                    },
                  }}
                  renderValue={(selected) => {
                    if (selected.length === 0) {
                      return (
                        <Typography
                          color="text.secondary"
                          sx={{ fontSize: { xs: "1rem", md: "1.0625rem" } }}
                        >
                          Select...
                        </Typography>
                      );
                    }
                    return (
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
                    );
                  }}
                  disabled={
                    isFinding ||
                    !!match ||
                    loadingTopics ||
                    availableTopics.length === 0
                  }
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
              </FormControl>

              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleFindMatch}
                disabled={isFinding || !!match}
                sx={{
                  py: 1.5,
                  textTransform: "uppercase",
                  fontWeight: 600,
                  fontSize: { xs: "1rem", md: "1.0625rem" }, // 16-17px
                  letterSpacing: 0.5,
                }}
              >
                {match
                  ? "Matched!"
                  : isFinding
                  ? `Finding (${timeProgress}s)`
                  : "Find Match"}
              </Button>

              {isFinding && (
                <Button
                  variant="outlined"
                  color="error"
                  size="large"
                  fullWidth
                  onClick={cancelSearch}
                  sx={{ mt: 2, py: 1.5 }}
                >
                  Cancel
                </Button>
              )}

              {localSelectedTopics.length === 0 && !isFinding && !match && (
                <Alert
                  severity="warning"
                  icon={<TbAlertTriangle size={20} />}
                  sx={{
                    mt: 2,
                    bgcolor: "rgba(255, 152, 0, 0.1)",
                    border: "1px solid",
                    borderColor: "warning.main",
                    "& .MuiAlert-message": {
                      color: "text.primary",
                      fontSize: { xs: "0.875rem", md: "0.9375rem" }, // 14-15px
                    },
                  }}
                >
                  No topic selected, You may be matched with any category.
                </Alert>
              )}

              {error &&
                !error.includes("declined") &&
                !error.includes("didn't") && (
                  <Alert
                    severity="error"
                    sx={{
                      mt: 2,
                      "& .MuiAlert-message": {
                        fontSize: { xs: "0.875rem", md: "0.9375rem" }, // 14-15px
                      },
                    }}
                  >
                    {error}
                  </Alert>
                )}
            </Paper>
          </Grid>

          {/* Right side - Illustration */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                minHeight: { xs: 400, md: 600 },
              }}
            >
              <Box
                sx={{
                  width: "100%",
                  maxWidth: 500,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                {/* Modern Corporate Illustration */}
                <Box
                  sx={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 4,
                    p: 4,
                  }}
                >
                  {/* Top Section - Success Icon */}
                  <Box
                    sx={{
                      width: 100,
                      height: 100,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 8px 32px rgba(25, 118, 210, 0.25)",
                      animation: "float 3s ease-in-out infinite",
                      "@keyframes float": {
                        "0%, 100%": { transform: "translateY(0px)" },
                        "50%": { transform: "translateY(-20px)" },
                      },
                    }}
                  >
                    <TbCircleCheck size={60} color="white" />
                  </Box>

                  {/* Code Brackets Section */}
                  <Box
                    sx={{
                      display: "flex",
                      gap: 6,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography
                      variant="h1"
                      sx={{
                        fontFamily: "monospace",
                        fontWeight: 300,
                        fontSize: { xs: "4rem", md: "6rem" },
                        color: "primary.main",
                        opacity: 0.2,
                        lineHeight: 1,
                      }}
                    >
                      {"{"}
                    </Typography>

                    <Box
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: 2,
                        bgcolor: "background.paper",
                        border: "2px solid",
                        borderColor: "primary.main",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                      }}
                    >
                      <TbCode size={40} color="#1976d2" />
                    </Box>

                    <Typography
                      variant="h1"
                      sx={{
                        fontFamily: "monospace",
                        fontWeight: 300,
                        fontSize: { xs: "4rem", md: "6rem" },
                        color: "primary.main",
                        opacity: 0.2,
                        lineHeight: 1,
                      }}
                    >
                      {"}"}
                    </Typography>
                  </Box>

                  {/* Person Icon with Laptop */}
                  <Box
                    sx={{
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    {/* Person */}
                    <Box
                      sx={{
                        width: 120,
                        height: 120,
                        borderRadius: "50%",
                        bgcolor: "primary.light",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "4px solid",
                        borderColor: "background.paper",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                      }}
                    >
                      <TbUser size={70} color="#1976d2" />
                    </Box>

                    {/* Laptop/Code Window */}
                    <Box
                      sx={{
                        width: 280,
                        bgcolor: "background.paper",
                        borderRadius: 2,
                        border: "2px solid",
                        borderColor: "divider",
                        overflow: "hidden",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      }}
                    >
                      {/* Window Header */}
                      <Box
                        sx={{
                          height: 32,
                          bgcolor: "grey.100",
                          borderBottom: "1px solid",
                          borderColor: "divider",
                          display: "flex",
                          alignItems: "center",
                          px: 1.5,
                          gap: 0.75,
                        }}
                      >
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            bgcolor: "#ff5f57",
                          }}
                        />
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            bgcolor: "#febc2e",
                          }}
                        />
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            bgcolor: "#28c840",
                          }}
                        />
                      </Box>

                      {/* Code Lines */}
                      <Box sx={{ p: 2 }}>
                        <Stack spacing={1.5}>
                          <Box
                            sx={{
                              height: 8,
                              bgcolor: "primary.main",
                              borderRadius: 1,
                              width: "100%",
                              opacity: 0.6,
                            }}
                          />
                          <Box
                            sx={{
                              height: 8,
                              bgcolor: "primary.main",
                              borderRadius: 1,
                              width: "75%",
                              opacity: 0.5,
                            }}
                          />
                          <Box
                            sx={{
                              height: 8,
                              bgcolor: "primary.main",
                              borderRadius: 1,
                              width: "90%",
                              opacity: 0.4,
                            }}
                          />
                          <Box
                            sx={{
                              height: 8,
                              bgcolor: "primary.main",
                              borderRadius: 1,
                              width: "60%",
                              opacity: 0.5,
                            }}
                          />
                        </Stack>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
