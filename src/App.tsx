import React, { Component } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./components/LoginPage";
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

const queryClient = new QueryClient();

/**
 * App State Interface
 */
interface AppState {
  isLoggedIn: boolean;
}

/**
 * App Component - Main Application Class
 * Implements OOP principles with React Class Component
 */
class App extends Component<{}, AppState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      isLoggedIn: false
    };
    
    // Bind methods to instance
    this.handleLogin = this.handleLogin.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
  }

  /**
   * Handle user login
   */
  public handleLogin(): void {
    this.setState({ isLoggedIn: true });
  }

  /**
   * Handle user logout
   */
  public handleLogout(): void {
    this.setState({ isLoggedIn: false });
  }

  /**
   * Render protected routes layout
   */
  private renderProtectedLayout(): JSX.Element {
    return (
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
    );
  }

  /**
   * Render method - Main render
   */
  public render(): JSX.Element {
    const { isLoggedIn } = this.state;

    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage onLogin={this.handleLogin} />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              
              {/* Protected main app routes - with sidebar */}
              {isLoggedIn ? (
                <Route path="/*" element={this.renderProtectedLayout()} />
              ) : (
                <Route path="*" element={<Navigate to="/login" replace />} />
              )}
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }
}

export default App;
