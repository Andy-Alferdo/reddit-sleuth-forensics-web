import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import logo from '@/assets/intel-reddit-logo.png';

const Header = () => {
  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shadow-sm">
      <div className="w-8 h-8" />
      
      <div className="text-center">
        <h1 className="text-xl font-bold text-primary">Intel Reddit</h1>
        <p className="text-xs text-muted-foreground">Digital Forensics Suite</p>
      </div>
      
      <div className="w-8 h-8" />
    </header>
  );
};

export default Header;