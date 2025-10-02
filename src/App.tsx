import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import AdminLogin from "./components/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import Dashboard from "./pages/Dashboard";
import NewCase from "./pages/NewCase";
import Monitoring from "./pages/Monitoring";
import Analysis from "./pages/Analysis";
import UserProfiling from "./pages/UserProfiling";
import LinkAnalysis from "./pages/LinkAnalysis";
import CommunityAnalysis from "./pages/CommunityAnalysis";
import Report from "./pages/Report";
import NotFound from "./pages/NotFound";
import Header from "./components/Header";
import { AppSidebar } from "./components/AppSidebar";
import { useState } from "react";

const queryClient = new QueryClient();

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage onLogin={() => setIsLoggedIn(true)} />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            
            {/* Protected main app routes - with sidebar */}
            {isLoggedIn ? (
              <Route path="/*" element={
                <SidebarProvider>
                  <div className="min-h-screen flex w-full bg-background">
                    <AppSidebar />
                    <div className="flex-1 flex flex-col">
                      <Header />
                      <main className="flex-1 overflow-auto">
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/new-case" element={<NewCase />} />
                          <Route path="/monitoring" element={<Monitoring />} />
                          <Route path="/analysis" element={<Analysis />} />
                          <Route path="/user-profiling" element={<UserProfiling />} />
                          <Route path="/link-analysis" element={<LinkAnalysis />} />
                          <Route path="/community-analysis" element={<CommunityAnalysis />} />
                          <Route path="/report" element={<Report />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </main>
                    </div>
                  </div>
                </SidebarProvider>
              } />
            ) : (
              <Route path="*" element={<Navigate to="/login" replace />} />
            )}
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
