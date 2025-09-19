import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import React from 'react';

const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#667eea',
        },
        secondary: {
            main: '#764ba2',
        },
        background: {
            default: '#121212',
            paper: '#1e1e1e',
        },
    },
});

export function AppTheme({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
        </ThemeProvider>
    );
}