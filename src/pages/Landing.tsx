import { Link } from 'react-router-dom';
import { ArrowRight, Rocket, BarChart3, Users, Calendar, MessageSquare, Shield } from 'lucide-react';
import helmIcon from '@/assets/helm-icon.png';
import dashboardPreview from '@/assets/dashboard-preview.png';
import projectPreview from '@/assets/project-preview.png';
import insightsPreview from '@/assets/insights-preview.png';
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
          <nav className="flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Product</a>
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
            <span>The CS Intelligence Layer</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            AI-Powered Execution{' '}
            <span className="text-primary">for SaaS</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">HelmAI turns customer conversations into strategic intelligence —automatically surfacing insights for product, engineering, and sales so you can proactively win the renewal. 

          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button asChild size="lg" className="gap-2">
              <Link to="/waitlist">
                Join Our Waitlist <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#features">Learn More</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Feature Tiles */}
      <section id="features" className="bg-secondary/30 px-6 py-20">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">Everything you need to manage implementations</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">From conversation to action —automatically.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
            { icon: BarChart3, title: 'Smart Roadmaps', desc: 'AI-generated roadmaps that update in real time as customer conversations evolve. No manual updates.' },
            { icon: Users, title: 'Customer Personas', desc: 'Clean transfer of context from sales to implementation. No dropped promises, no repeated discovery.' },
            { icon: Calendar, title: 'Calendar & Scheduling', desc: 'Meetings auto-scheduled and synced based on project milestones and customer signals.' },
            { icon: MessageSquare, title: 'Signal Routing', desc: 'Bugs go to engineering. Product feedback goes to roadmap. Upsells go to sales. Automatically.' },
            { icon: Shield, title: 'Health Scoring', desc: 'AI-powered risk detection that flags churn signals before they become problems.' },
            { icon: Rocket, title: 'Cross-Team Intelligence', desc: 'Weekly digests that give product, GTM, and leadership a clear view of what customers are saying.' }].
            map(({ icon: Icon, title, desc }) =>
            <div key={title} className="rounded-xl border border-border bg-card p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="border-t border-border px-6 py-16">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <p className="text-lg md:text-xl font-bold text-primary">See your implementation progress at a glance</p>
          <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            <img src={dashboardPreview} alt="HelmAI Dashboard - Project overview with health scores, roadmap milestones, and activity feed" className="w-full h-auto rounded-2xl" />
          </div>
        </div>
      </section>

      {/* Customer Project Preview */}
      <section className="border-t border-border bg-secondary/30 px-6 py-16">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <p className="text-lg md:text-xl font-bold text-primary">Track every customer project from kickoff to go-live</p>
          <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            <img src={projectPreview} alt="HelmAI Customer Project - Milestone timeline, task list, calendar, and team collaboration" className="w-full h-auto rounded-2xl" />
          </div>
        </div>
      </section>

      {/* Insights Preview */}
      <section className="border-t border-border px-6 py-16">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <p className="text-lg md:text-xl font-bold text-primary">Turn feedback into actionable product insights</p>
          <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            <img src={insightsPreview} alt="HelmAI Product Insights - Sentiment analysis, feedback themes, and trend tracking" className="w-full h-auto rounded-2xl" />
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