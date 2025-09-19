import { useState } from 'react';
import { Box, Typography, TextField, Button, Card, CardContent } from '@mui/material';

export default function Profile() {
    const [displayName, setDisplayName] = useState('John Doe');
    const [githubUsername] = useState('johndoe');

    const handleSave = () => {
        // Save profile logic here
        alert('Profile saved!');
    };

    return (
        <Box sx={{ p: 3, maxWidth: 600 }}>
            <Typography variant="h4" gutterBottom>
                Profile
            </Typography>

            <Card>
                <CardContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <TextField
                            label="GitHub Username"
                            value={githubUsername}
                            fullWidth
                            InputProps={{ readOnly: true }}
                        />

                        <TextField
                            label="Display Name"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            fullWidth
                        />

                        <Button variant="contained" onClick={handleSave}>
                            Save Profile
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}