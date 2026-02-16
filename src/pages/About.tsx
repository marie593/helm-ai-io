import { Link } from 'react-router-dom';
import { ArrowLeft, Linkedin } from 'lucide-react';
import mariePhoto from '@/assets/marie-widmer.jpeg';
import helmIcon from '@/assets/helm-icon.png';
import { Button } from '@/components/ui/button';

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Nav */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src={helmIcon} alt="HelmAI" className="h-9 w-9 rounded-lg object-contain" />
            <span className="text-lg font-bold tracking-tight">HelmAI</span>
          </Link>
          <Button asChild size="sm">
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      </header>

      {/* Back link */}
      <div className="max-w-6xl mx-auto w-full px-6 pt-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>

      {/* About Content */}
      <section className="flex-1 px-6 py-16">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">About Us</h1>
          <p className="text-muted-foreground leading-relaxed">
            HelmAI was born from the frustration of managing complex SaaS implementations with spreadsheets and scattered tools.
            {'\n\n'}
            We believe onboarding shouldn't feel chaotic — for customers or for the teams responsible for delivering value. That's why we're building Implementation Intelligence: a new layer that turns conversations, milestones, and commitments into structured execution.
            {'\n\n'}
            Our mission is simple: make predictable customer success the default, not the exception.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4">
            <img
              src={mariePhoto}
              alt="Marie Widmer, Founder of HelmAI"
              className="h-28 w-28 rounded-full object-cover border-2 border-primary/20"
            />
            <div className="text-center space-y-1">
              <h3 className="font-semibold text-lg">Marie Widmer</h3>
              <div className="flex items-center justify-center gap-2">
                <p className="text-sm text-primary font-medium">Founder</p>
                <a href="https://www.linkedin.com/in/mariewidmer" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <Linkedin className="h-4 w-4" />
                </a>
              </div>
              <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                HelmAI is founded by a lawyer-turned-ops lead who spent 10+ years implementing SaaS. Across dozens of implementations, the same friction appeared: misaligned expectations, manual tracking, and unclear wins at renewal. The problem wasn't the product — it was the lack of execution intelligence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-secondary/30 px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <img src={helmIcon} alt="HelmAI" className="h-7 w-7 rounded-md object-contain" />
              <span className="text-sm font-semibold">HelmAI</span>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </nav>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            © {new Date().getFullYear()} HelmAI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
