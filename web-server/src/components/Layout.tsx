import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Button } from '@mui/material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { TbHome, TbUser, TbLogout } from 'react-icons/tb';

const SIDEBAR_WIDTH = 240;

export default function Layout() {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { path: '/home', label: 'Home', icon: <TbHome /> },
        { path: '/profile', label: 'Profile', icon: <TbUser /> },
    ];

    const handleLogout = () => {
        navigate('/');
    };

    return (
        <Box sx={{ display: 'flex', height: '100vh' }}>
            {/* Sidebar */}
            <Box
                sx={{
                    width: SIDEBAR_WIDTH,
                    bgcolor: 'background.paper',
                    borderRight: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Box sx={{ p: 2 }}>
                    <h2>PeerPrep</h2>
                </Box>

                <List sx={{ flex: 1 }}>
                    {menuItems.map((item) => (
                        <ListItem key={item.path} disablePadding>
                            <ListItemButton
                                selected={location.pathname === item.path}
                                onClick={() => navigate(item.path)}
                            >
                                <ListItemIcon>{item.icon}</ListItemIcon>
                                <ListItemText primary={item.label} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>

                <Box sx={{ p: 2 }}>
                    <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<TbLogout />}
                        onClick={handleLogout}
                    >
                        Logout
                    </Button>
                </Box>
            </Box>

            {/* Main Content */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <Outlet />
            </Box>
        </Box>
    );
}