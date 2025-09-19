import { useState } from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

export default function Home() {
    const [difficulty, setDifficulty] = useState('easy');
    const [language, setLanguage] = useState('python');

    return (
        <Box sx={{ p: 3, maxWidth: 400 }}>
            <Typography variant="h4" gutterBottom>
                Welcome to PeerPrep
            </Typography>

            <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="difficulty-label">Difficulty</InputLabel>
                <Select
                    labelId="difficulty-label"
                    value={difficulty}
                    label="Difficulty"
                    onChange={(e) => setDifficulty(e.target.value)}
                >
                    <MenuItem value="easy">Easy</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="hard">Hard</MenuItem>
                </Select>
            </FormControl>

            <FormControl fullWidth>
                <InputLabel id="language-label">Language</InputLabel>
                <Select
                    labelId="language-label"
                    value={language}
                    label="Language"
                    onChange={(e) => setLanguage(e.target.value)}
                >
                    <MenuItem value="python">Python</MenuItem>
                    <MenuItem value="java">Java</MenuItem>
                    <MenuItem value="c++">C++</MenuItem>
                </Select>
            </FormControl>
        </Box>
    );
}