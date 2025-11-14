import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppTheme } from "./theme";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import CollaborativeSession from "./pages/CollaborativeSession";
import Layout from "./components/Layout";
import AuthCallback from "./pages/AuthCallback";
import ProtectedRoute from "./components/ProtectedRoute";
import HistoryPage from "./pages/HistoryPage";
import { MatchmakingProvider } from "./hooks/MatchmakingGlobal"; // Import the new provider
import { useAuth } from "./hooks/useAuth"; // Assuming useAuth is available for userId

//wrapper Component to access useAuth to use UserID for matchmaking 
const ProtectedLayout = () => {
    const { user } = useAuth(); // Get user from Auth context
    if (!user) return <Layout />; // Or a loading spinner

    return (
        <MatchmakingProvider userId={user.userId || "guest"}>
            <Layout />
        </MatchmakingProvider>
    );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppTheme>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* using ProtectedLayout based in wrapper above */}
          <Route element={<ProtectedLayout />}> 
            <Route
              path="home"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="history"
              element={
                <ProtectedRoute>
                  <HistoryPage />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route
            path="collaboration/:sessionId"
            element={
              <ProtectedRoute>
                <CollaborativeSession />
              </ProtectedRoute>
            }
          />
          <Route
            path="history/:sessionId"
            element={
              <ProtectedRoute>
                <CollaborativeSession viewMode="viewer" />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AppTheme>
  </React.StrictMode>
);
