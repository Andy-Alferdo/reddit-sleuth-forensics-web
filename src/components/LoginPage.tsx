import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MovingBackground from '@/components/MovingBackground';
import mascotLogo from '@/assets/reddit-sleuth-mascot.png';
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage = ({ onLogin }: LoginPageProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Show success message when coming from signup
  useEffect(() => {
    if (location.state?.fromSignup) {
      toast({
        title: "Account Created Successfully!",
        description: "Please login with your credentials.",
      });
      window.history.replaceState({}, document.title);
    }
    if (location.state?.passwordReset) {
      toast({
        title: "Password Reset",
        description: "Your password has been reset by an administrator. Please login with your new password.",
      });
      window.history.replaceState({}, document.title);
    }
  }, [location.state, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Missing Fields",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

        if (data.user) {
          toast({
            title: "Login Successful",
            description: "Welcome back to Intel Reddit!",
          });
          onLogin();

          const from = (location.state as any)?.from;
          if (from?.pathname) {
            navigate(from.pathname + (from.search || ''), {
              replace: true,
              state: from.state,
            });
          } else {
            navigate('/', { replace: true });
          }
        }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-forensic-dark to-forensic-darker flex items-center justify-center relative">
      <MovingBackground />
      
      <div className="relative z-10 w-full max-w-sm p-6">
        <div className="backdrop-blur-sm bg-card/90 border border-primary/20 shadow-2xl rounded-2xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src={mascotLogo} 
              alt="Reddit Sleuth Logo" 
              className="h-24 w-auto object-contain drop-shadow-[0_0_15px_rgba(255,85,0,0.5)]"
            />
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Input */}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="pl-12 h-12 bg-background/50 border-foreground/30 focus:border-foreground rounded-full"
              />
            </div>
            
            {/* Password Input */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="pl-12 pr-12 h-12 bg-background/50 border-foreground/30 focus:border-foreground rounded-full"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            
            {/* Login Button */}
            <Button 
              type="submit" 
              className="w-full h-12 mt-6 rounded-full bg-foreground hover:bg-foreground/90 text-background font-semibold shadow-lg transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Logging In...
                </>
              ) : (
                'Login'
              )}
            </Button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;