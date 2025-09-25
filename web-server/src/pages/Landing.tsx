import { Box, Button, Typography, Container } from "@mui/material";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "http://localhost:3002/auth/github";
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)",
      }}
    >
      <Container maxWidth="sm">
        <Box
          sx={{
            textAlign: "center",
            bgcolor: "background.paper",
            p: 6,
            borderRadius: 2,
            boxShadow: 3,
          }}
        >
          <Typography
            variant="h1"
            component="div"
            gutterBottom
            fontWeight="bold"
            color="primary"
          >
            PeerPrep
          </Typography>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            fontWeight="bold"
          >
            Ace your technical interviews with PeerPrep
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            gutterBottom
            fontWeight={400}
          >
            Fret and fear not - <br />
            real time collaboration,
            <br />
            curated questions and smarter practice.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleLogin}
            sx={{ mt: 3, px: 6, py: 2 }}
          >
            Login with Github
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
