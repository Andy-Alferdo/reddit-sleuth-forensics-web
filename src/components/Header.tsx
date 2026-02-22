import { SidebarTrigger } from '@/components/ui/sidebar';

const Header = () => {
  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-center px-6 shadow-sm">
      <div className="text-center">
        <h1 className="text-xl font-bold text-foreground">Intel Reddit</h1>
        <p className="text-xs text-muted-foreground">Open-Source Intelligence Platform</p>
      </div>
    </header>
  );
};

export default Header;