import { useState, useEffect } from "react";
import { Monitor, BarChart3, User, FileText, LogOut, LayoutDashboard, Home } from "lucide-react";
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
  { title: "Case Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Monitoring", url: "/monitoring", icon: Monitor },
  { title: "Analysis", url: "/analysis", icon: BarChart3 },
  { title: "User Profiling", url: "/user-profiling", icon: User },
  { title: "Report", url: "/report", icon: FileText },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";
  
  // Check if a case is selected
  const [selectedCase, setSelectedCase] = useState<string | null>(null);

  useEffect(() => {
    const storedCase = localStorage.getItem('selectedCase');
    setSelectedCase(storedCase);

    const handleStorageChange = () => {
      setSelectedCase(localStorage.getItem('selectedCase'));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const hasSelectedCase = selectedCase !== null;

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary/20 text-primary font-medium border-r-2 border-primary" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground";

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

        {/* Home Link */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/" 
                    end 
                    className={({ isActive }) => getNavCls({ isActive })}
                  >
                    <Home className="h-4 w-4" />
                    {!isCollapsed && <span>Home</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Navigation Menu - Only show when case is selected */}
        {hasSelectedCase && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-foreground font-semibold">
              {!isCollapsed && <span>Investigation</span>}
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
