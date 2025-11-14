import { useState, useEffect } from "react";
import { Box, Typography, Card, CardContent } from "@mui/material";
import config from "../config/environment";

export default function Profile() {
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    fetch(config.auth.profile, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        setUserId(data.userId);
        setName(data.name);
      })
      .catch((err) => console.error("Error fetching user:", err));
  }, []);

  return (
    <Box sx={{ p: 3, maxWidth: 600 }}>
      <Typography variant="h4" gutterBottom>
        Profile
      </Typography>

      <Card>
        <CardContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <Typography variant="subtitle2">User ID</Typography>
              <Typography variant="body1">{userId || "Loading..."}</Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2">Display Name</Typography>
              <Typography variant="body1">{name || "Loading..."}</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
