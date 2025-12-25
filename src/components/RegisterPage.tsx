import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MovingBackground from '@/components/MovingBackground';
import logo from '@/assets/intel-reddit-logo.png';
import { Mail, Lock, Loader2, Eye, EyeOff, User, Check, X, Info, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RegisterPageProps {
  onLogin: () => void;
}

const RegisterPage = ({ onLogin }: RegisterPageProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [inviteChecking, setInviteChecking] = useState(true);

  const passwordRequirements = [
    { label: 'At least 8 characters', test: (pwd: string) => pwd.length >= 8 },
    { label: 'One uppercase letter', test: (pwd: string) => /[A-Z]/.test(pwd) },
    { label: 'One lowercase letter', test: (pwd: string) => /[a-z]/.test(pwd) },
    { label: 'One number', test: (pwd: string) => /[0-9]/.test(pwd) },
    { label: 'One special character (!@#$%^&*)', test: (pwd: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd) },
  ];

  const validatePassword = (pwd: string): string | null => {
    for (const req of passwordRequirements) {
      if (!req.test(pwd)) {
        return req.label + " is required.";
      }
    }
    return null;
  };

  const allRequirementsMet = passwordRequirements.every(req => req.test(password));

  // Check invite token on mount
  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setInviteChecking(false);
      setInviteValid(false);
      return;
    }

    setInviteToken(token);
    checkInviteToken(token);
  }, [searchParams]);

  const checkInviteToken = async (token: string) => {
    try {
      const { data, error } = await supabase
        .from('user_invites')
        .select('*')
        .eq('invite_token', token)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setInviteValid(true);
        setEmail(data.email);
      } else {
        setInviteValid(false);
      }
    } catch (error) {
      console.error('Error checking invite:', error);
      setInviteValid(false);
    } finally {
      setInviteChecking(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteToken || !inviteValid) {
      toast({
        title: "Invalid Invite",
        description: "You need a valid invite link to register.",
        variant: "destructive",
      });
      return;
    }

    if (!email || !password) {
      toast({
        title: "Missing Fields",
        description: "Please enter email and password.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      toast({
        title: "Weak Password",
        description: passwordError,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Get invite details for role assignment
      const { data: inviteData } = await supabase
        .from('user_invites')
        .select('*')
        .eq('invite_token', inviteToken)
        .maybeSingle();

      if (!inviteData) {
        throw new Error('Invite not found or expired');
      }

      // Create user account
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Mark invite as used
        await supabase
          .from('user_invites')
          .update({ used_at: new Date().toISOString() })
          .eq('invite_token', inviteToken);

        // Sign out immediately to force user to login with credentials
        await supabase.auth.signOut();
        
        navigate('/login', { state: { fromSignup: true } });
      }
    } catch (error: any) {
      let message = error.message;
      if (error.message?.includes('already registered')) {
        message = "This email is already registered. Please log in instead.";
      }
      toast({
        title: "Signup Failed",
        description: message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking invite
  if (inviteChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-forensic-dark to-forensic-darker flex items-center justify-center relative">
        <MovingBackground />
        <div className="relative z-10 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying invite...</p>
        </div>
      </div>
    );
  }

  // Show error if no valid invite
  if (!inviteValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-forensic-dark to-forensic-darker flex items-center justify-center relative">
        <MovingBackground />
        <div className="relative z-10 w-full max-w-sm p-6">
          <div className="backdrop-blur-sm bg-card/90 border border-destructive/50 shadow-2xl rounded-2xl p-8 text-center">
            <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-2">Registration Restricted</h1>
            <p className="text-muted-foreground mb-6">
              Public registration is disabled. You need a valid invite link from an administrator to create an account.
            </p>
            <Button onClick={() => navigate('/login')} variant="outline" className="w-full">
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-forensic-dark to-forensic-darker flex items-center justify-center relative">
      <MovingBackground />
      
      <div className="relative z-10 w-full max-w-sm p-6">
        <div className="backdrop-blur-sm bg-card/90 border border-primary/20 shadow-2xl rounded-2xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <img 
              src={logo} 
              alt="Intel Reddit Logo" 
              className="w-20 h-20 animate-glow-pulse"
            />
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold text-center text-foreground mb-2">Create Account</h1>
          <p className="text-center text-sm text-muted-foreground mb-6">
            You've been invited to join as an investigator
          </p>

          {/* Register Form */}
          <form onSubmit={handleSignUp} className="space-y-4">
            {/* Full Name Input */}
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isLoading}
                className="pl-12 h-12 bg-background/50 border-primary/30 focus:border-primary rounded-full"
              />
            </div>

            {/* Email Input - Pre-filled from invite */}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={true} // Email is locked to invite
                className="pl-12 h-12 bg-background/50 border-primary/30 focus:border-primary rounded-full opacity-75"
              />
            </div>
            
            {/* Password Input */}
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pl-12 pr-20 h-12 bg-background/50 border-primary/30 focus:border-primary rounded-full"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRequirements(!showRequirements)}
                    className={`text-muted-foreground hover:text-foreground transition-colors ${showRequirements ? 'text-primary' : ''}`}
                    title="Password requirements"
                  >
                    <Info className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              {/* Password Strength Indicator */}
              {showRequirements && (
                <div className="px-4 py-3 bg-background/30 rounded-xl border border-primary/20 space-y-1.5">
                  <p className="text-xs font-medium text-foreground mb-2">Password Requirements:</p>
                  {passwordRequirements.map((req, index) => {
                    const isMet = req.test(password);
                    return (
                      <div 
                        key={index} 
                        className={`flex items-center gap-2 text-xs transition-colors ${
                          isMet ? 'text-green-500' : 'text-muted-foreground'
                        }`}
                      >
                        {isMet ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        <span>{req.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Confirm Password Input */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                className="pl-12 pr-12 h-12 bg-background/50 border-primary/30 focus:border-primary rounded-full"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {/* Sign Up Button */}
            <Button 
              type="submit" 
              className="w-full h-12 mt-6 rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-400 hover:via-blue-400 hover:to-purple-400 text-white font-semibold shadow-lg shadow-blue-500/25 transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Sign Up'
              )}
            </Button>
          </form>

          {/* Login Link */}
          <p className="text-center mt-6 text-sm text-muted-foreground">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 font-semibold hover:from-cyan-300 hover:to-purple-300 transition-all"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;