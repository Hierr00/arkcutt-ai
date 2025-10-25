'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  title: string;
  href: string;
  icon: any;
  badge?: number;
  variant?: 'default' | 'secondary' | 'outline';
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function AppSidebar() {
  const pathname = usePathname();
  const [stats, setStats] = useState({
    active: 0,
    ready_for_human: 0,
    gathering_info: 0,
    waiting_providers: 0,
    completed: 0,
    rfqs: 0,
  });

  useEffect(() => {
    // Load stats
    async function loadStats() {
      try {
        const [quotationsRes, rfqsRes] = await Promise.all([
          fetch('/api/quotations?status=active'),
          fetch('/api/rfqs'),
        ]);

        const quotationsData = await quotationsRes.json();
        const rfqsData = await rfqsRes.json();

        if (quotationsData.stats) {
          setStats({
            active:
              (quotationsData.stats.ready_for_human || 0) +
              (quotationsData.stats.gathering_info || 0) +
              (quotationsData.stats.waiting_providers || 0),
            ready_for_human: quotationsData.stats.ready_for_human || 0,
            gathering_info: quotationsData.stats.gathering_info || 0,
            waiting_providers: quotationsData.stats.waiting_providers || 0,
            completed: quotationsData.stats.quoted || 0,
            rfqs: rfqsData.rfqs?.length || 0,
          });
        }
      } catch (error) {
        console.error('Error loading sidebar stats:', error);
      }
    }

    loadStats();
    const interval = setInterval(loadStats, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const navSections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        {
          title: 'Dashboard',
          href: '/dashboard',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: 'Orders',
      items: [
        {
          title: 'Active Orders',
          href: '/dashboard?view=active',
          icon: TrendingUp,
          badge: stats.active,
        },
        {
          title: 'Ready for Quote',
          href: '/dashboard?view=ready_for_human',
          icon: AlertCircle,
          badge: stats.ready_for_human,
          variant: 'default',
        },
        {
          title: 'Gathering Info',
          href: '/dashboard?view=gathering_info',
          icon: Clock,
          badge: stats.gathering_info,
        },
        {
          title: 'Completed',
          href: '/dashboard?view=completed',
          icon: CheckCircle2,
          badge: stats.completed,
        },
      ],
    },
    {
      title: 'Management',
      items: [
        {
          title: 'RFQs',
          href: '/rfqs',
          icon: FileText,
          badge: stats.rfqs,
        },
        {
          title: 'Providers',
          href: '/providers',
          icon: Users,
        },
        {
          title: 'Settings',
          href: '/settings',
          icon: Settings,
        },
      ],
    },
  ];

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-primary" />
          <span className="text-lg font-semibold">Arkcutt AI</span>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-6">
          {navSections.map((section, idx) => (
            <div key={idx}>
              {section.title && (
                <h4 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.title}
                </h4>
              )}
              <nav className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href ||
                    (item.href.includes('?') && pathname + (typeof window !== 'undefined' ? window.location.search : '') === item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-secondary text-secondary-foreground'
                          : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </div>
                      {item.badge !== undefined && item.badge > 0 && (
                        <Badge
                          variant={item.variant || 'secondary'}
                          className="ml-auto h-5 min-w-[20px] px-1.5 text-xs"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="rounded-lg bg-muted p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">AI Status</span>
            <div className="flex items-center space-x-1">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-medium">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
