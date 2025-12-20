import { useState } from "react";
import { Monitor, BarChart3, User, Network, FileText, Users, ArrowLeft, LogOut, LayoutDashboard, FolderOpen, Plus } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import logo from '@/assets/intel-reddit-logo.png';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Monitoring", url: "/monitoring", icon: Monitor },
  { title: "Analysis", url: "/analysis", icon: BarChart3 },
  { title: "User Profiling", url: "/user-profiling", icon: User },
  { title: "Report", url: "/report", icon: FileText },
];

const savedCases = [
  { id: 1, name: "Case #2023-001", description: "Reddit harassment investigation", date: "2023-10-15", status: "Active" },
  { id: 2, name: "Case #2023-002", description: "Fraud detection analysis", date: "2023-10-12", status: "Closed" },
  { id: 3, name: "Case #2023-003", description: "Missing person social media trace", date: "2023-10-08", status: "Pending" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";
  
  // Check if a case is selected
  const selectedCase = localStorage.getItem('selectedCase');
  const hasSelectedCase = selectedCase !== null;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary/20 text-primary font-medium border-r-2 border-primary" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground";

  const handleSelectCase = (caseData: typeof savedCases[0]) => {
    localStorage.setItem('selectedCase', JSON.stringify(caseData));
    navigate('/');
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      navigate('/login');
    } catch (error) {
      toast({
        title: "Logout Failed",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Sidebar
      collapsible="icon"
    >
      <SidebarContent className="border-r border-border">
        {/* Top Icon Section - Logo and Toggle */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <img src={logo} alt="Intel Reddit" className="w-8 h-8" />
          <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        </div>

        {/* Cases Section - Always Visible */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary font-semibold flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            {!isCollapsed && <span>Cases</span>}
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {/* Create New Case Button */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate('/new-case')} className="hover:bg-primary/10 text-primary hover:text-primary">
                  <Plus className="h-4 w-4" />
                  {!isCollapsed && <span>New Case</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* List of Cases */}
              {savedCases.map((caseItem) => (
                <SidebarMenuItem key={caseItem.id}>
                  <SidebarMenuButton 
                    onClick={() => handleSelectCase(caseItem)}
                    className={
                      hasSelectedCase && JSON.parse(selectedCase).id === caseItem.id
                        ? "bg-primary/20 text-primary font-medium border-r-2 border-primary"
                        : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                    }
                  >
                    <FolderOpen className="h-4 w-4" />
                    {!isCollapsed && (
                      <div className="flex flex-col items-start overflow-hidden">
                        <span className="text-sm font-medium truncate w-full">{caseItem.name}</span>
                        <span className="text-xs text-muted-foreground truncate w-full">{caseItem.status}</span>
                      </div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Navigation Menu - Only show when case is selected */}
        {hasSelectedCase && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-foreground font-semibold">
              {!isCollapsed && <span>Navigation</span>}
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        end 
                        className={({ isActive }) => getNavCls({ isActive })}
                      >
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Logout Button */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} className="hover:bg-destructive/20 text-destructive hover:text-destructive">
                  <LogOut className="h-4 w-4" />
                  {!isCollapsed && <span>Logout</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}