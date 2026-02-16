import { Link } from 'react-router-dom';
import { ArrowRight, Rocket } from 'lucide-react';
import helmIcon from '@/assets/helm-icon.png';
import helmLogo from '@/assets/helm-logo.png';
import { Button } from '@/components/ui/button';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Nav */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src={helmIcon} alt="HelmAI" className="h-9 w-9 rounded-lg object-contain" />
            <span className="text-lg font-bold tracking-tight">HelmAI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <Link to="/product" className="hover:text-foreground transition-colors">Product</Link>
            <Link to="/about" className="hover:text-foreground transition-colors">About Us</Link>
          </nav>
          <Button asChild size="sm">
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-6 py-24 md:py-32">
        <div className="max-w-3xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Rocket className="h-3.5 w-3.5" />
            <span>AI-Powered Implementation Intelligence</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            AI-Powered Execution{' '}
            <span className="text-primary">for SaaS</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            The first 90 days determine retention. Helm makes customer delivery intelligent — aligning teams, surfacing risk early, and turning launches into long-term revenue.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button asChild size="lg" className="gap-2">
              <Link to="/waitlist">
                Join Our Waitlist <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/product">Learn More</Link>
            </Button>
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
              <a href="#" className="hover:text-foreground transition-colors">Cookie Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
              <a href="#" className="hover:text-foreground transition-colors">Status</a>
            </nav>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            © {new Date().getFullYear()} HelmAI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>);

}