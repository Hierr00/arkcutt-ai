'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  Users,
  Settings,
  HelpCircle,
  Plug,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';

interface NavItem {
  title: string;
  href: string;
  icon: any;
  badge?: number;
}

export function AppSidebar() {
  const pathname = usePathname();
  const [stats, setStats] = useState({
    orders: 0,
    suppliers: 0,
  });

  useEffect(() => {
    // Load stats
    async function loadStats() {
      try {
        const [quotationsRes, rfqsRes] = await Promise.all([
          fetch('/api/quotations?status=active'),
          fetch('/api/providers'),
        ]);

        const quotationsData = await quotationsRes.json();
        const providersData = await rfqsRes.json();

        if (quotationsData.stats) {
          setStats({
            orders:
              (quotationsData.stats.ready_for_human || 0) +
              (quotationsData.stats.gathering_info || 0) +
              (quotationsData.stats.waiting_providers || 0),
            suppliers: providersData.providers?.length || 0,
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

  const navItems: NavItem[] = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Orders',
      href: '/orders',
      icon: Package,
      badge: stats.orders,
    },
    {
      title: 'Suppliers',
      href: '/suppliers',
      icon: Users,
      badge: stats.suppliers,
    },
    {
      title: 'Integrations',
      href: '/integrations',
      icon: Plug,
    },
    {
      title: 'Help',
      href: '/help',
      icon: HelpCircle,
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ];

  return (
    <div className="flex h-full w-64 flex-col bg-background border-r border-border">
      {/* Logo */}
      <div className="flex h-14 items-center px-4 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex items-center justify-center">
            <span className="text-base font-bold">ark-ai</span>
          </div>
        </Link>
      </div>

      {/* Attention Agent Banner */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 border border-border">
          <span className="text-xs text-muted-foreground">Attention's agent</span>
          <button className="text-muted-foreground hover:text-foreground">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-2">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center justify-between gap-3 px-3 py-2.5 text-sm rounded-lg transition-all',
                  isActive
                    ? 'bg-secondary text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.title}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-5 min-w-[20px] px-1.5 text-xs font-medium"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Free Trial Card */}
      <div className="p-4 border-t border-border">
        <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20 border-cyan-200 dark:border-cyan-800">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-1">Free Trial</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Contacta con nuestro equipo de ventas para conseguir tu prueba gratuita.
            </p>
            <Link
              href="/contact"
              className="text-xs text-primary hover:underline font-medium"
            >
              Ver Planes →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
