import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BarChart3, Users, Calendar, MessageSquare, Shield, Rocket } from 'lucide-react';
import helmIcon from '@/assets/helm-icon.png';
import dashboardPreview from '@/assets/dashboard-preview.png';
import { Button } from '@/components/ui/button';

export default function Product() {
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

      {/* Dashboard Preview */}
      <section className="px-6 py-16">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <p className="text-lg md:text-xl font-bold text-primary">See your implementation progress at a glance</p>
          <div className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
            <img
              src={dashboardPreview}
              alt="HelmAI Dashboard - Project overview with health scores, roadmap milestones, and activity feed"
              className="w-full h-auto"
            />
          </div>
        </div>
      </section>

      {/* Feature Tiles */}
      <section className="border-t border-border bg-secondary/30 px-6 py-20">
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

      {/* CTA */}
      <section className="px-6 py-20 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl font-bold tracking-tight">Ready to streamline your implementations?</h2>
          <p className="text-muted-foreground">Join the waitlist and be the first to experience HelmAI.</p>
          <Button asChild size="lg" className="gap-2">
            <Link to="/waitlist">
              Join Our Waitlist <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
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
