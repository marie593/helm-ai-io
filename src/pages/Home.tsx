import { useState } from 'react';
import { HomeHeader } from '@/components/home/HomeHeader';
import { ChatPane } from '@/components/home/ChatPane';
import { RightRail } from '@/components/home/RightRail';
import { AppSidebar } from '@/components/layout/AppSidebar';

interface SelectedWorkspace {
  id: string;
  name: string;
}

export default function Home() {
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedWorkspace | null>(null);

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <HomeHeader selectedCustomer={selectedCustomer} onSelectCustomer={setSelectedCustomer} />
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0">
            <ChatPane />
          </div>
          <aside className="hidden lg:block w-80 border-l border-border bg-card/40">
            <RightRail />
          </aside>
        </div>
      </div>
    </div>
  );
}
