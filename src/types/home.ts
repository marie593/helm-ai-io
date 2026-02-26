// Mock data models for the Home chat-first UI

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

export interface HomeTask {
  id: string;
  title: string;
  projectName: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'blocked';
}

export interface Flag {
  id: string;
  title: string;
  projectName: string;
  severity: 'warning' | 'critical';
  createdAt: string;
  resolved: boolean;
}

export interface Signal {
  id: string;
  title: string;
  source: 'email' | 'chat' | 'call' | 'ticket';
  projectName: string;
  timestamp: string;
  read: boolean;
}

// --- Mock data ---

export const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    role: 'system',
    content: 'Session started — 3 projects active, 2 flags require attention.',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '2',
    role: 'assistant',
    content:
      "Good morning! Here's your daily briefing:\n\n- **Acme Corp** onboarding is 80% complete, but milestone \"API Integration\" is 3 days overdue.\n- **Globex Inc** flagged a blocker on SSO setup — I've drafted a response.\n- 2 new feature requests came in overnight from **Initech**.\n\nWant me to summarize the Globex blocker or update the Acme roadmap?",
    timestamp: new Date(Date.now() - 3500000).toISOString(),
  },
];

export const MOCK_TASKS: HomeTask[] = [
  { id: 't1', title: 'Review SSO config', projectName: 'Globex Inc', dueDate: new Date(Date.now() + 86400000).toISOString(), priority: 'high', status: 'todo' },
  { id: 't2', title: 'Send onboarding recap', projectName: 'Acme Corp', dueDate: new Date(Date.now() + 172800000).toISOString(), priority: 'medium', status: 'in_progress' },
  { id: 't3', title: 'Schedule kickoff call', projectName: 'Initech', dueDate: new Date(Date.now() + 259200000).toISOString(), priority: 'low', status: 'todo' },
];

export const MOCK_FLAGS: Flag[] = [
  { id: 'f1', title: 'SSO integration blocked', projectName: 'Globex Inc', severity: 'critical', createdAt: new Date(Date.now() - 7200000).toISOString(), resolved: false },
  { id: 'f2', title: 'API milestone overdue by 3 days', projectName: 'Acme Corp', severity: 'warning', createdAt: new Date(Date.now() - 86400000).toISOString(), resolved: false },
];

export const MOCK_SIGNALS: Signal[] = [
  { id: 's1', title: 'New feature request: bulk import', source: 'email', projectName: 'Initech', timestamp: new Date(Date.now() - 1800000).toISOString(), read: false },
  { id: 's2', title: 'Positive feedback on dashboard', source: 'call', projectName: 'Acme Corp', timestamp: new Date(Date.now() - 5400000).toISOString(), read: false },
  { id: 's3', title: 'Question about data export', source: 'chat', projectName: 'Globex Inc', timestamp: new Date(Date.now() - 10800000).toISOString(), read: true },
];
