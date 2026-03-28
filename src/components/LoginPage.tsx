import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import mascotLogo from '@/assets/reddit-sleuth-mascot.png';
import { Mail, Lock, Loader2, Eye, EyeOff, Shield } from 'lucide-react';
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
    <div className="min-h-screen flex">
      {/* Left Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex-col justify-center items-center p-12 text-white">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }} />
        {/* Glow accent */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[120px]" />

        <div className="relative z-10 max-w-md text-center space-y-8">
          <img
            src={mascotLogo}
            alt="Intel Reddit Logo"
            className="h-28 w-auto mx-auto drop-shadow-[0_0_30px_rgba(59,130,246,0.35)]"
          />
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight">Welcome to Intel Reddit</h1>
            <p className="text-blue-300 text-lg font-medium">Open-Source Intelligence &amp; Investigation Platform</p>
          </div>
          <p className="text-slate-400 leading-relaxed text-sm max-w-sm">
            Empowering analysts to uncover insights, monitor communities, and transform data into actionable intelligence.
          </p>
        </div>
      </div>

      {/* Right Login Panel */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="flex justify-center lg:hidden">
            <img
              src={mascotLogo}
              alt="Intel Reddit Logo"
              className="h-20 w-auto"
            />
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in to your account</h2>
            <p className="text-sm text-slate-500">Enter your credentials to access the platform</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-700 text-sm font-medium">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@organization.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pl-10 h-11 bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-700 text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pl-10 pr-10 h-11 bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-slate-900 placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-colors"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400">
            <Shield className="inline w-3 h-3 mr-1 -mt-0.5" />
            Secure access for authorized investigators only
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
