import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import logo from '@/assets/intel-reddit-logo.png';

const Header = () => {
  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center space-x-4">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        <img src={logo} alt="Intel Reddit" className="w-10 h-10" />
      </div>
      
      <div className="text-center">
        <h1 className="text-xl font-bold text-primary">Intel Reddit</h1>
        <p className="text-xs text-muted-foreground">Digital Forensics Suite</p>
      </div>
      
      <Avatar className="w-8 h-8">
        <AvatarImage src="" />
        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
          FS
        </AvatarFallback>
      </Avatar>
    </header>
  );
};

export default Header;