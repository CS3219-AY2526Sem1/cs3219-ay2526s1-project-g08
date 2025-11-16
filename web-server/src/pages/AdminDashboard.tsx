import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  CircularProgress,
} from "@mui/material";
import { TbPlus, TbTrash, TbX, TbEdit, TbEye } from "react-icons/tb";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  getAllQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  Question,
  CreateQuestionData,
  UpdateQuestionData,
} from "../services/questionService";

type ChipColor =
  | "default"
  | "primary"
  | "secondary"
  | "error"
  | "info"
  | "success"
  | "warning";
type Difficulty = "easy" | "medium" | "hard";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdmin, profile } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(
    null
  );
  const [isEditMode, setIsEditMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateQuestionData>({
    title: "",
    description: "",
    difficulty: "easy",
    topics: [],
  });
  const [topicInput, setTopicInput] = useState("");

  // Secondary security check - redirect if not admin
  useEffect(() => {
    if (profile && !isAdmin) {
      navigate("/home");
    }
  }, [profile, isAdmin, navigate]);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const data = await getAllQuestions();
      setQuestions(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch questions"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestion = async () => {
    try {
      if (!formData.title.trim() || !formData.description.trim()) {
        setError("Title and description are required");
        return;
      }

      if (formData.topics.length === 0) {
        setError("At least one topic is required");
        return;
      }

      if (isEditMode && selectedQuestion) {
        // Update existing question
        const updates: UpdateQuestionData = {
          description: formData.description,
          difficulty: formData.difficulty,
          topics: formData.topics,
        };

        // If title changed, include newTitle in update
        if (formData.title !== selectedQuestion.title) {
          updates.newTitle = formData.title;
        }

        await updateQuestion(selectedQuestion._id, updates);
        setSuccess("Question updated successfully!");
      } else {
        // Create new question
        await createQuestion(formData);
        setSuccess("Question created successfully!");
      }

      setError(null);
      setOpenDialog(false);
      resetForm();
      fetchQuestions();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEditMode
          ? "Failed to update question"
          : "Failed to create question"
      );
      setSuccess(null);
    }
  };

  const handleEditQuestion = (question: Question) => {
    setSelectedQuestion(question);
    setFormData({
      title: question.title,
      description: question.description,
      difficulty: question.difficulty,
      topics: [...question.topics],
    });
    setIsEditMode(true);
    setOpenDialog(true);
  };

  const handleViewQuestion = (question: Question) => {
    setSelectedQuestion(question);
    setOpenViewDialog(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      difficulty: "easy",
      topics: [],
    });
    setTopicInput("");
    setSelectedQuestion(null);
    setIsEditMode(false);
  };

  const handleOpenAddDialog = () => {
    resetForm();
    setOpenDialog(true);
  };

  const handleDeleteQuestion = async (questionId: string, title: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${title}"?\n\n` +
          `This will mark the question as deleted. Active collaboration sessions using this question can continue, ` +
          `but it will not be available for new sessions.`
      )
    ) {
      return;
    }

    try {
      await deleteQuestion(questionId);
      setSuccess("Question marked as deleted successfully!");
      setError(null);
      fetchQuestions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete question"
      );
      setSuccess(null);
    }
  };

  const handleAddTopic = () => {
    if (topicInput.trim() && !formData.topics.includes(topicInput.trim())) {
      setFormData({
        ...formData,
        topics: [...formData.topics, topicInput.trim()],
      });
      setTopicInput("");
    }
  };

  const handleRemoveTopic = (topic: string) => {
    setFormData({
      ...formData,
      topics: formData.topics.filter((t) => t !== topic),
    });
  };

  const getDifficultyColor = (difficulty: Difficulty): ChipColor => {
    switch (difficulty) {
      case "easy":
        return "success";
      case "medium":
        return "warning";
      case "hard":
        return "error";
      default:
        return "default";
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        p: 3,
      }}
    >
      <Box sx={{ maxWidth: "1400px", mx: "auto" }}>
        {/* Page Header */}
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
            Admin Dashboard
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              lineHeight: 1.6,
              fontSize: { xs: "1.125rem", md: "1.25rem" }, // 18-20px
              mb: 0.5,
            }}
          >
            Manage interview questions
          </Typography>
          {profile && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: { xs: "0.875rem", md: "0.9375rem" } }}
            >
              Logged in as: {profile.name} ({profile.role})
            </Typography>
          )}
        </Box>

        {/* Add Button */}
        <Box sx={{ mb: 3, display: "flex", justifyContent: "center" }}>
          <Button
            variant="contained"
            startIcon={<TbPlus />}
            onClick={handleOpenAddDialog}
            sx={{
              fontSize: { xs: "1rem", md: "1.0625rem" }, // 16-17px
              textTransform: "uppercase",
              fontWeight: 600,
              px: 3,
              py: 1.5,
            }}
          >
            Add Question
          </Button>
        </Box>

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 2,
              "& .MuiAlert-message": {
                fontSize: { xs: "0.875rem", md: "0.9375rem" },
              },
            }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            severity="success"
            sx={{
              mb: 2,
              "& .MuiAlert-message": {
                fontSize: { xs: "0.875rem", md: "0.9375rem" },
              },
            }}
            onClose={() => setSuccess(null)}
          >
            {success}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            {questions.map((question) => (
              <Box
                key={question._id}
                sx={{
                  width: {
                    xs: "100%",
                    md: "calc(50% - 8px)",
                    lg: "calc(33.333% - 11px)",
                  },
                }}
              >
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    bgcolor: "#181818",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 1.5,
                    backgroundImage: "none",
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                    <Box sx={{ mb: 2 }}>
                      <Typography
                        variant="h6"
                        gutterBottom
                        sx={{
                          fontSize: { xs: "1.125rem", md: "1.25rem" }, // 18-20px
                          fontWeight: 600,
                        }}
                      >
                        {question.title}
                      </Typography>
                      <Chip
                        label={question.difficulty.toUpperCase()}
                        color={getDifficultyColor(question.difficulty)}
                        size="small"
                        sx={{
                          mb: 1,
                          fontSize: { xs: "0.75rem", md: "0.8125rem" },
                          fontWeight: 600,
                        }}
                      />
                    </Box>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        fontSize: { xs: "0.875rem", md: "0.9375rem" },
                      }}
                    >
                      {question.description}
                    </Typography>

                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {question.topics.map((topic, index) => (
                        <Chip
                          key={index}
                          label={topic}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: { xs: "0.75rem", md: "0.8125rem" } }}
                        />
                      ))}
                    </Box>
                  </CardContent>

                  <CardActions sx={{ pt: 0, pb: 2, px: 2 }}>
                    <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<TbEye />}
                        onClick={() => handleViewQuestion(question)}
                        sx={{
                          fontSize: { xs: "0.875rem", md: "0.9375rem" },
                          textTransform: "capitalize",
                        }}
                      >
                        View
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<TbEdit />}
                        onClick={() => handleEditQuestion(question)}
                        sx={{
                          fontSize: { xs: "0.875rem", md: "0.9375rem" },
                          textTransform: "capitalize",
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        startIcon={<TbTrash />}
                        onClick={() =>
                          handleDeleteQuestion(question._id, question.title)
                        }
                        sx={{
                          fontSize: { xs: "0.875rem", md: "0.9375rem" },
                          textTransform: "capitalize",
                        }}
                      >
                        Delete
                      </Button>
                    </Box>
                  </CardActions>
                </Card>
              </Box>
            ))}
          </Box>
        )}

        {/* Add/Edit Question Dialog */}
        <Dialog
          open={openDialog}
          onClose={() => {
            setOpenDialog(false);
            resetForm();
          }}
          maxWidth="md"
          fullWidth
          sx={{ zIndex: 1300 }}
          PaperProps={{
            sx: {
              bgcolor: "#181818",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 1.5,
              backgroundImage: "none",
            },
          }}
        >
          <DialogTitle
            sx={{
              fontSize: { xs: "1.25rem", md: "1.375rem" }, // 20-22px
              fontWeight: 600,
            }}
          >
            {isEditMode ? "Edit Question" : "Add New Question"}
          </DialogTitle>
          <DialogContent>
            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  zIndex: 1400,
                  "& .MuiAlert-message": {
                    fontSize: { xs: "0.875rem", md: "0.9375rem" },
                  },
                }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                label="Question Title"
                fullWidth
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                sx={{
                  "& .MuiInputLabel-root": {
                    fontSize: { xs: "0.875rem", md: "0.9375rem" },
                  },
                  "& .MuiInputBase-input": {
                    fontSize: { xs: "1rem", md: "1.0625rem" },
                  },
                }}
              />

              <TextField
                label="Description"
                fullWidth
                multiline
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
                sx={{
                  "& .MuiInputLabel-root": {
                    fontSize: { xs: "0.875rem", md: "0.9375rem" },
                  },
                  "& .MuiInputBase-input": {
                    fontSize: { xs: "1rem", md: "1.0625rem" },
                  },
                }}
              />

              <FormControl fullWidth>
                <InputLabel
                  sx={{ fontSize: { xs: "0.875rem", md: "0.9375rem" } }}
                >
                  Difficulty
                </InputLabel>
                <Select
                  value={formData.difficulty}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      difficulty: e.target.value as "easy" | "medium" | "hard",
                    })
                  }
                  label="Difficulty"
                  sx={{
                    "& .MuiInputBase-input": {
                      fontSize: { xs: "1rem", md: "1.0625rem" },
                    },
                  }}
                >
                  <MenuItem
                    value="easy"
                    sx={{ fontSize: { xs: "1rem", md: "1.0625rem" } }}
                  >
                    Easy
                  </MenuItem>
                  <MenuItem
                    value="medium"
                    sx={{ fontSize: { xs: "1rem", md: "1.0625rem" } }}
                  >
                    Medium
                  </MenuItem>
                  <MenuItem
                    value="hard"
                    sx={{ fontSize: { xs: "1rem", md: "1.0625rem" } }}
                  >
                    Hard
                  </MenuItem>
                </Select>
              </FormControl>

              <Box>
                <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                  <TextField
                    label="Add Topic *"
                    size="small"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTopic();
                      }
                    }}
                    sx={{
                      flex: 1,
                      "& .MuiInputLabel-root": {
                        fontSize: { xs: "0.875rem", md: "0.9375rem" },
                      },
                      "& .MuiInputBase-input": {
                        fontSize: { xs: "1rem", md: "1.0625rem" },
                      },
                    }}
                  />
                  <Button
                    variant="outlined"
                    onClick={handleAddTopic}
                    sx={{
                      fontSize: { xs: "0.875rem", md: "0.9375rem" },
                      textTransform: "capitalize",
                    }}
                  >
                    Add
                  </Button>
                </Box>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {formData.topics.map((topic, index) => (
                    <Chip
                      key={index}
                      label={topic}
                      onDelete={() => handleRemoveTopic(topic)}
                      deleteIcon={<TbX />}
                      sx={{ fontSize: { xs: "0.75rem", md: "0.8125rem" } }}
                    />
                  ))}
                </Box>
              </Box>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={() => {
                setOpenDialog(false);
                resetForm();
              }}
              sx={{
                fontSize: { xs: "0.875rem", md: "0.9375rem" },
                textTransform: "capitalize",
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleCreateQuestion}
              sx={{
                fontSize: { xs: "1rem", md: "1.0625rem" },
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              {isEditMode ? "Update Question" : "Create Question"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Question Details Dialog */}
        <Dialog
          open={openViewDialog}
          onClose={() => {
            setOpenViewDialog(false);
            setSelectedQuestion(null);
          }}
          maxWidth="md"
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
          <DialogTitle
            sx={{
              fontSize: { xs: "1.25rem", md: "1.375rem" }, // 20-22px
              fontWeight: 600,
            }}
          >
            Question Details
          </DialogTitle>
          <DialogContent>
            {selectedQuestion && (
              <Stack spacing={3} sx={{ mt: 1 }}>
                <Box>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                    sx={{ fontSize: { xs: "0.875rem", md: "0.9375rem" } }}
                  >
                    Title
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontSize: { xs: "1.125rem", md: "1.25rem" },
                      fontWeight: 600,
                    }}
                  >
                    {selectedQuestion.title}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                    sx={{ fontSize: { xs: "0.875rem", md: "0.9375rem" } }}
                  >
                    Difficulty
                  </Typography>
                  <Chip
                    label={selectedQuestion.difficulty.toUpperCase()}
                    color={getDifficultyColor(selectedQuestion.difficulty)}
                    size="small"
                    sx={{
                      fontSize: { xs: "0.75rem", md: "0.8125rem" },
                      fontWeight: 600,
                    }}
                  />
                </Box>

                <Box>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                    sx={{ fontSize: { xs: "0.875rem", md: "0.9375rem" } }}
                  >
                    Description
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontSize: { xs: "1rem", md: "1.0625rem" },
                    }}
                  >
                    {selectedQuestion.description}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                    sx={{ fontSize: { xs: "0.875rem", md: "0.9375rem" } }}
                  >
                    Topics
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {selectedQuestion.topics.map((topic, index) => (
                      <Chip
                        key={index}
                        label={topic}
                        variant="outlined"
                        sx={{ fontSize: { xs: "0.75rem", md: "0.8125rem" } }}
                      />
                    ))}
                  </Box>
                </Box>

                <Box>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                    sx={{ fontSize: { xs: "0.875rem", md: "0.9375rem" } }}
                  >
                    Created At
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontSize: { xs: "0.875rem", md: "0.9375rem" } }}
                  >
                    {new Date(selectedQuestion.createdAt).toLocaleString()}
                  </Typography>
                </Box>
              </Stack>
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={() => {
                setOpenViewDialog(false);
                setSelectedQuestion(null);
              }}
              sx={{
                fontSize: { xs: "0.875rem", md: "0.9375rem" },
                textTransform: "capitalize",
              }}
            >
              Close
            </Button>
            {selectedQuestion && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<TbEdit />}
                  onClick={() => {
                    setOpenViewDialog(false);
                    handleEditQuestion(selectedQuestion);
                  }}
                  sx={{
                    fontSize: { xs: "0.875rem", md: "0.9375rem" },
                    textTransform: "capitalize",
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<TbTrash />}
                  onClick={() => {
                    setOpenViewDialog(false);
                    handleDeleteQuestion(
                      selectedQuestion._id,
                      selectedQuestion.title
                    );
                  }}
                  sx={{
                    fontSize: { xs: "0.875rem", md: "0.9375rem" },
                    textTransform: "capitalize",
                  }}
                >
                  Delete
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
