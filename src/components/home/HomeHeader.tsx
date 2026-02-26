import { Search, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import helmLogo from '@/assets/helm-logo.png';

export function HomeHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-6">
      <div className="flex items-center gap-4">
        <img src={helmLogo} alt="Helm" className="h-6" />
        <Button variant="ghost" size="sm" className="gap-1.5 text-sm font-medium text-foreground">
          All Workspaces
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>
      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search anything…"
          className="pl-9 h-9 bg-secondary/50 border-transparent focus-visible:border-border"
        />
      </div>
    </header>
  );
}
