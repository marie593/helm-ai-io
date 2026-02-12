import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Calendar,
  LineChart,
  Settings,
  LogOut,
  Zap,
  ChevronDown,
  Plug,
} from 'lucide-react';
import helmIcon from '@/assets/helm-icon.png';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, adminOnly: false },
  { name: 'Customers', href: '/customers', icon: Users, adminOnly: true },
  { name: 'Projects', href: '/projects', icon: FolderKanban, adminOnly: false },
  { name: 'Calendar', href: '/calendar', icon: Calendar, adminOnly: false },
  { name: 'Insights', href: '/insights', icon: LineChart, adminOnly: true },
  { name: 'Integrations', href: '/integrations', icon: Plug, adminOnly: true },
  { name: 'Settings', href: '/settings', icon: Settings, adminOnly: true },
];

export function AppSidebar() {
  const location = useLocation();
  const { profile, signOut, isVendorAdmin, isVendorStaff, licenseType } = useAuth();

  const visibleNavigation = navigation.filter(
    (item) => !item.adminOnly || isVendorStaff
  );

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b border-sidebar-border">
        <img src={helmIcon} alt="HelmAI" className="h-8 w-8 rounded-lg object-contain" />
        <span className="text-lg font-semibold text-sidebar-foreground">
          HelmAI
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleNavigation.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User menu */}
      <div className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-3 py-2 h-auto text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium truncate">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {licenseType === 'admin' ? (isVendorAdmin ? 'Admin' : 'Team Member') : 'Collaborator'}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-sidebar-foreground/60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {isVendorStaff && (
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
            )}
            {isVendorStaff && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
