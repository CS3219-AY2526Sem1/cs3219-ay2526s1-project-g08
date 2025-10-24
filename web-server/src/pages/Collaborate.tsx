import { useParams, useLocation } from "react-router-dom";
import { Box, Typography } from "@mui/material";
// @ts-ignore , to ignore error of unable to infer jsx file type
import CollaborativeEditor from "../components/CollaborativeEditor";
import { getAuthToken } from "../services/auth";

export default function Collaborate() {
    const { sessionId } = useParams();
    const location = useLocation();
    const { question, match } = location.state || {};

    if (!sessionId) return <div>Invalid session</div>;

    return (
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                <Typography variant="h6">
                    {question?.title || "Collaborative Coding Session"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Session ID: {sessionId}
                </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
                <CollaborativeEditor
                    sessionId={sessionId}
                    authToken={getAuthToken()}
                    language={match?.language || "python"}
                />
            </Box>
        </Box>
    );
}
