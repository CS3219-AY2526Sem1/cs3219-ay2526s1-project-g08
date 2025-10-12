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
} from "@mui/material";
import { TbPlus, TbTrash, TbX, TbEdit, TbEye } from "react-icons/tb";
import {
  getAllQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  Question,
  CreateQuestionData,
  UpdateQuestionData,
} from "../services/questionService";

export default function AdminDashboard() {
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
        err instanceof Error ? err.message : isEditMode 
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

  const getDifficultyColor = (difficulty: string) => {
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
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h4">Admin Dashboard</Typography>
        <Button
          variant="contained"
          startIcon={<TbPlus />}
          onClick={handleOpenAddDialog}
        >
          Add Question
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {loading ? (
        <Typography>Loading questions...</Typography>
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
                  position: "relative"
                }}
              >
                <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      {question.title}
                    </Typography>
                    <Chip
                      label={question.difficulty.toUpperCase()}
                      color={getDifficultyColor(question.difficulty) as any}
                      size="small"
                      sx={{ mb: 1 }}
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
                    >
                      View
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<TbEdit />}
                      onClick={() => handleEditQuestion(question)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      startIcon={<TbTrash />}
                      onClick={() => handleDeleteQuestion(question._id, question.title)}
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
        sx={{ zIndex: 1300 }} // Ensure dialog is above other elements
      >
        <DialogTitle>
          {isEditMode ? "Edit Question" : "Add New Question"}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 2, zIndex: 1400 }} 
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
            />

            <FormControl fullWidth>
              <InputLabel>Difficulty</InputLabel>
              <Select
                value={formData.difficulty}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    difficulty: e.target.value as "easy" | "medium" | "hard",
                  })
                }
                label="Difficulty"
              >
                <MenuItem value="easy">Easy</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="hard">Hard</MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                <TextField
                  label="Add Topic"
                  size="small"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTopic();
                    }
                  }}
                  sx={{ flex: 1 }}
                />
                <Button variant="outlined" onClick={handleAddTopic}>
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
                  />
                ))}
              </Box>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => {
            setOpenDialog(false);
            resetForm();
          }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreateQuestion}>
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
      >
        <DialogTitle>Question Details</DialogTitle>
        <DialogContent>
          {selectedQuestion && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Title
                </Typography>
                <Typography variant="h6">{selectedQuestion.title}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Difficulty
                </Typography>
                <Chip
                  label={selectedQuestion.difficulty.toUpperCase()}
                  color={getDifficultyColor(selectedQuestion.difficulty) as any}
                  size="small"
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Description
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word"
                  }}
                >
                  {selectedQuestion.description}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Topics
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {selectedQuestion.topics.map((topic, index) => (
                    <Chip key={index} label={topic} variant="outlined" />
                  ))}
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Created At
                </Typography>
                <Typography variant="body2">
                  {new Date(selectedQuestion.createdAt).toLocaleString()}
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => {
            setOpenViewDialog(false);
            setSelectedQuestion(null);
          }}>
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
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<TbTrash />}
                onClick={() => {
                  setOpenViewDialog(false);
                  handleDeleteQuestion(selectedQuestion._id, selectedQuestion.title);
                }}
              >
                Delete
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
