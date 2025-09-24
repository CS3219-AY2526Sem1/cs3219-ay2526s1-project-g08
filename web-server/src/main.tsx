import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppTheme } from "./theme";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Layout from "./components/Layout";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppTheme>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route element={<Layout />}>
            <Route path="home" element={<Home />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppTheme>
  </React.StrictMode>
);
