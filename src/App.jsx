import { Route, Routes } from "react-router-dom";
import "./App.css";
import { supabase } from "./lib/supabaseClient";

import Index from "./Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import Home from "./pages/Home";
import News from "./pages/News";
import NewsDetails from "./pages/NewsDetails";
import AdminNews from "./pages/admin/AdminNews";
import Layout from "./components/Layout";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Community from "./pages/Community";

function App() {
  console.log("Supabase client:", supabase);

  return (
    <Routes>
      {/* LANDING */}
      <Route path="/" element={<Index />} />

      {/* AUTH */}
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />

      {/* USER PAGES WITH SHARED HEADER + FOOTER */}
      <Route
        path="/home"
        element={
          <Layout>
            <Home />
          </Layout>
        }
      />

      <Route
        path="/news"
        element={
          <Layout>
            <News />
          </Layout>
        }
      />

      <Route
        path="/news/:id"
        element={
          <Layout>
            <NewsDetails />
          </Layout>
        }
      />

      {/* ADMIN */}
      <Route path="/admin" element={<AdminDashboard />} />

      <Route
        path="/admin/news"
        element={<AdminNews />}
      />
      <Route
  path="/profile"
  element={
    <Layout>
      <Profile />
    </Layout>
  }
/>
<Route
  path="/settings"
  element={
    <Layout>
      <Settings />
    </Layout>
  }
/>
  <Route
        path="/notifications"
        element={
          <Layout>
            <Notifications />
          </Layout>
        }
      />
      <Route
        path="/community"
        element={
          <Layout>
            <Community />
          </Layout>
        }
      />
    </Routes>
    
  );
}

export default App;