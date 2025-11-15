import { useState, useEffect, useCallback } from "react";
import { Box, Typography, Paper, CircularProgress, Alert } from "@mui/material";
import { FiClock, FiMessageSquare, FiUser } from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import config from "../config/environment";

interface HistoryItem {
  sessionId: string;
  questionTitle: string;
  difficulty: "easy" | "medium" | "hard";
  topics: string[];
  completedAt: string;
  participants: string[];
}

interface QuestionDetails {
  _id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  topics: string[];
}

// Helper function to format date
const formatDate = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-GB") + " " + date.toLocaleTimeString();
};

export default function HistoryPage() {
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const { token, getToken, user } = useAuth();
  const resolveAuthToken = useCallback(async () => {
    const authToken = token ?? (await getToken());
    return authToken;
  }, [token, getToken]);

  useEffect(() => {
    let isMounted = true;

    const fetchHistory = async () => {
      setLoadingList(true);
      setHistoryError(null);

      try {
        const authToken = await resolveAuthToken();
        if (!authToken) {
          throw new Error("Missing authentication token");
        }

        const res = await fetch(
          `${config.api.collaborationService}user/history`,
          {
            credentials: "include",
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error(`Failed to fetch history: ${res.status}`);
        }

        const resData = (await res.json()) as { success: boolean; data: any[] };
        const sortedList = resData.data.sort(
          (a, b) =>
            new Date(b.completedAt).getTime() -
            new Date(a.completedAt).getTime()
        );

        // Fetch question titles
        const formattedListPromises = sortedList.map(async (item) => {
          let questionTitle = `Question ${item.questionId}`;

          try {
            const questionRes = await fetch(
              `${config.api.questionService}${item.questionId}`
            );
            if (questionRes.ok) {
              const questionData =
                (await questionRes.json()) as QuestionDetails;
              questionTitle = questionData.title;
            }
          } catch (err) {
            console.error(`Failed to fetch question ${item.questionId}:`, err);
          }

          return {
            sessionId: item.sessionId,
            questionTitle,
            difficulty: (item.difficulty ??
              "easy") as HistoryItem["difficulty"],
            topics: Array.isArray(item.topics) ? item.topics : [],
            completedAt: item.updatedAt ?? new Date().toISOString(),
            participants: Array.isArray(item.participants)
              ? item.participants
              : [],
          };
        });

        const formattedList = await Promise.all(formattedListPromises);

        if (isMounted) {
          setHistoryList(formattedList);
        }
      } catch (err) {
        console.error("Failed to fetch collaboration history:", err);
        if (isMounted) {
          setHistoryList([]);
          setHistoryError(
            "Unable to load your session history. Please make sure you are signed in and try again."
          );
        }
      } finally {
        if (isMounted) {
          setLoadingList(false);
        }
      }
    };

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [resolveAuthToken]);

  const handleQuestionClick = (item: HistoryItem) => {
    window.open(`/history/${item.sessionId}`, "_blank");
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
        {/* Page Title */}
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
            Collaboration History
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              lineHeight: 1.6,
              fontSize: { xs: "1.125rem", md: "1.25rem" }, // 18-20px
            }}
          >
            View your past interview sessions
          </Typography>
        </Box>

        {/* History List */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1.5,
            bgcolor: "#181818",
          }}
        >
          {loadingList ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : historyError ? (
            <Alert
              severity="error"
              sx={{ fontSize: { xs: "0.875rem", md: "0.9375rem" } }}
            >
              {historyError}
            </Alert>
          ) : historyList.length === 0 ? (
            <Typography
              color="text.secondary"
              sx={{
                textAlign: "center",
                py: 4,
                fontSize: { xs: "1rem", md: "1.0625rem" },
              }}
            >
              No questions completed yet.
            </Typography>
          ) : (
            <Box>
              {historyList.map((item) => (
                <Paper
                  key={item.sessionId}
                  elevation={0}
                  onClick={() => handleQuestionClick(item)}
                  sx={{
                    p: 2.5,
                    mb: 2,
                    bgcolor: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 1,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      bgcolor: "rgba(255, 255, 255, 0.05)",
                      borderColor: "primary.main",
                    },
                    "&:last-child": {
                      mb: 0,
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1.5,
                    }}
                  >
                    <FiMessageSquare size={18} />
                    <Typography
                      sx={{
                        fontSize: { xs: "1.0625rem", md: "1.125rem" }, // 17-18px
                        fontWeight: 600,
                      }}
                    >
                      {item.questionTitle}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <FiClock size={16} />
                    <Typography
                      color="text.secondary"
                      sx={{
                        fontSize: { xs: "0.875rem", md: "0.9375rem" }, // 14-15px
                      }}
                    >
                      {formatDate(item.completedAt)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <FiUser size={16} />
                    <Typography
                      color="text.secondary"
                      sx={{
                        fontSize: { xs: "0.875rem", md: "0.9375rem" }, // 14-15px
                      }}
                    >
                      {item.participants.filter((p) => p !== user?.userId)[0]}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
