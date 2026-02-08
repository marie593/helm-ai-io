import { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { Card, CardContent } from '@/components/ui/card';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const inviteEmail = searchParams.get('email');
  
  const [isLogin, setIsLogin] = useState(!inviteToken);
  const { user } = useAuth();

  // If there's an invite token, default to signup mode
  useEffect(() => {
    if (inviteToken) {
      setIsLogin(false);
    }
  }, [inviteToken]);

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="flex justify-center mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/10">
              <Zap className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-primary-foreground mb-4">
            HelmAI
          </h1>
          <p className="text-lg text-primary-foreground/80">
            AI-powered implementation management for SaaS teams. Streamline your customer onboarding with intelligent roadmaps and insights.
          </p>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:hidden mb-8">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
                <Zap className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">HelmAI</h1>
          </div>

          {inviteToken && !isLogin && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <p className="text-sm text-center">
                  <span className="font-medium">You've been invited!</span>
                  <br />
                  <span className="text-muted-foreground">
                    Create an account to accept your invitation.
                  </span>
                </p>
              </CardContent>
            </Card>
          )}

          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {isLogin
                ? "Sign in to manage your implementations"
                : 'Start managing your SaaS implementations'}
            </p>
          </div>

          {isLogin ? (
            <LoginForm />
          ) : (
            <SignupForm 
              onSuccess={() => setIsLogin(true)} 
              inviteToken={inviteToken || undefined}
              defaultEmail={inviteEmail || undefined}
            />
          )}

          <div className="text-center">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
