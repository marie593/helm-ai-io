import { Link } from 'react-router-dom';
import { Sailboat, ArrowRight, BarChart3, Users, Calendar, MessageSquare, Shield, Rocket, Linkedin } from 'lucide-react';
import mariePhoto from '@/assets/marie-widmer.jpeg';
import { Button } from '@/components/ui/button';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Nav */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Sailboat className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">HelmAI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#product" className="hover:text-foreground transition-colors">Product</a>
            <a href="#about" className="hover:text-foreground transition-colors">About Us</a>
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
            AI-Powered Implementation Management
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Ship customer implementations{' '}
            <span className="text-primary">faster</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            HelmAI helps SaaS teams streamline customer onboarding with intelligent roadmaps, real-time collaboration, and AI-driven insights — so every launch lands on time.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button asChild size="lg" className="gap-2">
              <Link to="/auth">
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#product">Learn More</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Product */}
      <section id="product" className="border-t border-border bg-secondary/30 px-6 py-20">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">Everything you need to manage implementations</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">From kickoff to go-live, HelmAI keeps your team and customers aligned at every milestone.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: BarChart3, title: 'Smart Roadmaps', desc: 'AI-generated project plans tailored to each customer\'s needs.' },
              { icon: Users, title: 'Collaboration Hub', desc: 'Shared workspace for vendor teams and customer stakeholders.' },
              { icon: Calendar, title: 'Calendar & Scheduling', desc: 'Built-in booking and calendar sync to keep meetings on track.' },
              { icon: MessageSquare, title: 'Feedback Tracking', desc: 'Capture, categorize, and act on customer feedback in real time.' },
              { icon: Shield, title: 'Health Scoring', desc: 'Proactive risk detection with AI-powered health scores.' },
              { icon: Rocket, title: 'Insights & Digests', desc: 'Automated weekly digests and cross-project product insights.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-border bg-card p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="border-t border-border px-6 py-20">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-bold tracking-tight">About Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            HelmAI was born from the frustration of managing complex SaaS implementations with spreadsheets and scattered tools. We believe every customer deserves a smooth, transparent onboarding experience — and every implementation team deserves intelligent tools that remove busywork and surface what matters. Our mission is to make customer success the default outcome, not the exception.
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
                <a href="https://www.linkedin.com/in/mariewidmer/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <Linkedin className="h-4 w-4" />
                </a>
              </div>
              <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                Lawyer turned Ops Lead who spent 10+ years implementing software for legal teams — seeing all of the challenges and surprises, including missed expectations, manual tracking and unclear wins.
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
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <Sailboat className="h-4 w-4 text-primary-foreground" />
              </div>
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
    </div>
  );
}
