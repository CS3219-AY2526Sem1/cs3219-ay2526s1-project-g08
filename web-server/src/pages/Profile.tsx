import { useState, useEffect } from "react";
import { Box, Typography, Paper } from "@mui/material";
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
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
      }}
    >
      <Box sx={{ maxWidth: "800px", width: "100%" }}>
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
            Profile
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              lineHeight: 1.6,
              fontSize: { xs: "1.125rem", md: "1.25rem" }, // 18-20px
            }}
          >
            Your account information
          </Typography>
        </Box>

        {/* Profile Card */}
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
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Box>
              <Typography
                variant="body2"
                sx={{
                  mb: 1,
                  fontWeight: 500,
                  color: "text.secondary",
                  fontSize: { xs: "0.875rem", md: "0.9375rem" }, // 14-15px
                }}
              >
                User ID
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontSize: { xs: "1rem", md: "1.0625rem" }, // 16-17px
                  fontWeight: 500,
                }}
              >
                {userId || "Loading..."}
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="body2"
                sx={{
                  mb: 1,
                  fontWeight: 500,
                  color: "text.secondary",
                  fontSize: { xs: "0.875rem", md: "0.9375rem" }, // 14-15px
                }}
              >
                Display Name
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontSize: { xs: "1rem", md: "1.0625rem" }, // 16-17px
                  fontWeight: 500,
                }}
              >
                {name || "Loading..."}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
