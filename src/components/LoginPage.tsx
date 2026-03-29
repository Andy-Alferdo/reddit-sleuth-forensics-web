import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import mascotLogo from '@/assets/reddit-sleuth-mascot.png';
import { Mail, Lock, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
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
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-center items-center p-12 text-white"
        style={{
          background: 'linear-gradient(145deg, #0a0f1e 0%, #0d1b3e 40%, #0f2347 70%, #081428 100%)',
        }}
      >
        {/* Dot grid pattern */}
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)`,
          backgroundSize: '28px 28px',
        }} />

        {/* Network line accents */}
        <div className="absolute inset-0 opacity-[0.04]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="network" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
                <line x1="0" y1="60" x2="120" y2="60" stroke="white" strokeWidth="0.5" />
                <line x1="60" y1="0" x2="60" y2="120" stroke="white" strokeWidth="0.5" />
                <circle cx="60" cy="60" r="2" fill="white" opacity="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#network)" />
          </svg>
        </div>

        {/* Primary glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[420px] h-[420px] rounded-full blur-[140px]"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)' }}
        />
        {/* Secondary glow */}
        <div className="absolute bottom-1/4 left-1/3 w-[280px] h-[280px] rounded-full blur-[100px]"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 max-w-md text-center space-y-8">
          {/* Logo with glow */}
          <div className="relative inline-block">
            <div className="absolute inset-0 blur-[40px] opacity-40 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.6) 0%, transparent 70%)' }}
            />
            <img
              src={mascotLogo}
              alt="Intel Reddit Logo"
              className="h-24 w-auto mx-auto relative z-10 drop-shadow-[0_0_24px_rgba(59,130,246,0.4)]"
            />
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent">
              Welcome to Intel Reddit
            </h1>
            <p className="text-blue-300/90 text-base font-medium tracking-wide">
              Open-Source Intelligence Platform
            </p>
          </div>

          {/* Tagline */}
          <div className="space-y-4">
            <p className="text-blue-200/70 text-sm font-semibold tracking-[0.2em] uppercase">
              Monitor · Analyze · Investigate
            </p>
            <div className="w-16 h-px mx-auto bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
            <p className="text-slate-400/80 leading-relaxed text-sm max-w-sm mx-auto">
              Transform Reddit data into actionable intelligence with advanced analytics, sentiment analysis, and community monitoring.
            </p>
          </div>
        </div>

        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
      </div>

      {/* Right Login Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10"
        style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}
      >
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex justify-center lg:hidden mb-8">
            <img
              src={mascotLogo}
              alt="Intel Reddit Logo"
              className="h-20 w-auto"
            />
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] border border-slate-200/60 p-8 space-y-7">
            <div className="space-y-1.5 text-center lg:text-left">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Log in to your account</h2>
              <p className="text-sm text-slate-500">Enter your credentials to continue</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-700 text-sm font-medium">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder=""
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white rounded-xl text-slate-900 placeholder:text-slate-400 transition-all duration-200"
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
                    placeholder=""
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-10 pr-10 h-11 bg-slate-50/50 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white rounded-xl text-slate-900 placeholder:text-slate-400 transition-all duration-200"
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
                className="w-full h-11 rounded-xl font-semibold shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 text-white"
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%)',
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Accessing...
                  </>
                ) : (
                  'Access Platform'
                )}
              </Button>
            </form>

            <div className="flex items-center justify-center gap-1.5 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-xs text-slate-400">Authorized access only</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
