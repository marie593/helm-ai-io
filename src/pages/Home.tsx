import { HomeHeader } from '@/components/home/HomeHeader';
import { ChatPane } from '@/components/home/ChatPane';
import { RightRail } from '@/components/home/RightRail';
import { AppSidebar } from '@/components/layout/AppSidebar';

export default function Home() {
  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <HomeHeader />
        <div className="flex-1 flex overflow-hidden">
          {/* Chat — dominant center */}
          <div className="flex-1 flex flex-col min-w-0">
            <ChatPane />
          </div>
          {/* Right rail */}
          <aside className="hidden lg:block w-80 border-l border-border bg-card/40">
            <RightRail />
          </aside>
        </div>
      </div>
    </div>
  );
}
