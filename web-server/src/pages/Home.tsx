import { useState } from "react";
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
  Stack
} from "@mui/material";
import { useMatchmaking } from "../hooks/useMatchmaking";

export default function Home() {
  const [userId, setUserId] = useState("user123");
  const [difficulty, setDifficulty] = useState("easy");
  const [language, setLanguage] = useState("python");

  const { match, findMatch, isFinding, timeProgress, error, resetMatch } = useMatchmaking(userId, difficulty, language, [
    "arrays",
  ], 60);

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

      <Stack direction="row" spacing={2}>
        <Button 
          variant="contained" 
          onClick={handleFindMatch}
          disabled={isFinding || !!match}>
            
          {match 
            ? "Matched!"
            : isFinding
            ? 'Finding (${timeProgress}s)'
            : "Find Match"}
        </Button>

        { (match || error) && (
          <Button variant='outlined' onClick={resetMatch}>
            Find Again
          </Button>
        )}
      </Stack>

      {match && (
        <Alert severity="success">
          Match Found! Users: {match.users.join(", ")}
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
