import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import AdminLogin from "./components/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import ResetPassword from "./pages/ResetPassword";
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
import { InvestigationProvider } from "./contexts/InvestigationContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = () => {
    // Session will be updated by onAuthStateChange
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  const isLoggedIn = !!session;

  return (
    <QueryClientProvider client={queryClient}>
      <InvestigationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={
                isLoggedIn ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={handleLogin} />
              } />
              <Route path="/register" element={
                isLoggedIn ? <Navigate to="/dashboard" replace /> : <RegisterPage onLogin={handleLogin} />
              } />
              <Route path="/reset-password" element={<ResetPassword />} />
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
      </InvestigationProvider>
    </QueryClientProvider>
  );
};

export default App;
