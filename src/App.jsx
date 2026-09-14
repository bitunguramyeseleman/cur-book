import { Route, Routes, Navigate } from "react-router-dom";
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
import OnlineUsers from "./pages/OnlineUsers";
import Groups from "./pages/Groups";
import GroupChat from "./pages/GroupChat";

function App() {
  console.log("Supabase client:", supabase);

  return (
    <Routes>
   
      <Route path="/" element={<Index />} />

      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />

    
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/news" element={<AdminNews />} />

    
      <Route element={<Layout />}>
        <Route path="/home" element={<Home />} />
        <Route path="/news" element={<News />} />
        <Route path="/news/:id" element={<NewsDetails />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/notifications" element={<Notifications />} />

        {/* Community */}
        <Route path="/community" element={<Community />} />
        <Route path="/community/online" element={<OnlineUsers />} />
        <Route path="/community/groups" element={<Groups />} />
        <Route path="/community/group/:groupId" element={<GroupChat />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;