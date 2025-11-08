import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppTheme } from "./theme";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import CollaborationDemo from "./pages/CollaborationDemo";
import CollaborativeSession from "./pages/CollaborativeSession";
import Layout from "./components/Layout";
import AuthCallback from "./pages/AuthCallback";
import ProtectedRoute from "./components/ProtectedRoute";
import HistoryPage from "./pages/HistoryPage";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppTheme>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route element={<Layout />}>
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
              path="collaboration"
              element={
                <ProtectedRoute>
                  <CollaborationDemo />
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
        </Routes>
      </BrowserRouter>
    </AppTheme>
  </React.StrictMode>
);
