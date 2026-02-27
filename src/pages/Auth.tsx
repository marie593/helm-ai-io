import { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { DemoRequestForm } from '@/components/auth/DemoRequestForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { Card, CardContent } from '@/components/ui/card';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const inviteEmail = searchParams.get('email');

  // Only show signup if there's an invite token
  const [mode, setMode] = useState<'login' | 'signup' | 'demo' | 'forgot'>(
    inviteToken ? 'signup' : 'login'
  );
  const { user } = useAuth();
  const { toast } = useToast();
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Google sign-in failed',
        description: error.message || 'Something went wrong',
      });
      setGoogleLoading(false);
    }
  };
  useEffect(() => {
    if (inviteToken) {
      setMode('signup');
    }
  }, [inviteToken]);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-16">
        <div className="max-w-sm text-center space-y-6">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-foreground/10 backdrop-blur-sm">
              <Zap className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-primary-foreground tracking-tight">
              HelmAI
            </h1>
            <p className="text-base text-primary-foreground/70 leading-relaxed">
              AI-powered implementation management for SaaS teams.
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile logo */}
          <div className="text-center lg:hidden">
            <div className="flex justify-center mb-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-foreground">HelmAI</h1>
          </div>

          {mode === 'signup' && inviteToken && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-3 px-4">
                <p className="text-sm text-center">
                  <span className="font-medium">You've been invited!</span>{' '}
                  <span className="text-muted-foreground">Create an account to accept.</span>
                </p>
              </CardContent>
            </Card>
          )}

          {/* Header */}
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">
              {mode === 'login' && 'Sign in'}
              {mode === 'signup' && 'Create account'}
              {mode === 'demo' && 'Request a demo'}
              {mode === 'forgot' && 'Reset password'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === 'login' && 'Welcome back to HelmAI'}
              {mode === 'signup' && 'Get started with your implementations'}
              {mode === 'demo' && "We'll reach out to schedule a walkthrough"}
              {mode === 'forgot' && "We'll send you a reset link"}
            </p>
          </div>

          {/* Forms */}
          <div className="space-y-4">
            {mode === 'login' && (
              <>
                <LoginForm />
                <div className="flex items-center justify-end -mt-2">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setMode('forgot')}
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full h-10"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </Button>
              </>
            )}

            {mode === 'forgot' && <ForgotPasswordForm onBack={() => setMode('login')} />}

            {mode === 'signup' && (
              <SignupForm
                onSuccess={() => setMode('login')}
                inviteToken={inviteToken || undefined}
                defaultEmail={inviteEmail || undefined}
              />
            )}

            {mode === 'demo' && <DemoRequestForm />}
          </div>

          {/* Footer links */}
          <div className="text-center pt-2">
            {mode === 'login' && (
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMode('demo')}
              >
                No account? <span className="text-primary font-medium">Request a demo</span>
              </button>
            )}
            {(mode === 'demo' || mode === 'signup') && (
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMode('login')}
              >
                Already have an account? <span className="text-primary font-medium">Sign in</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
