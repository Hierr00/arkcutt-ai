'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  TrendingUp,
  TrendingDown,
  Mail,
  Package,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Plus,
  MoreVertical,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardStats {
  emailDeliverability: number;
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  avgResponseTime: number;
  successRate: number;
  totalSuppliers: number;
  activeSuppliers: number;
}

interface Provider {
  id: string;
  name: string;
  email: string | null;
  services: string[];
  is_active: boolean;
  total_quotes_requested: number;
  response_rate: number | null;
}

interface Order {
  id: string;
  customer_email: string;
  customer_name: string | null;
  parts_description: string | null;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    emailDeliverability: 13.2,
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    avgResponseTime: 0,
    successRate: 0,
    totalSuppliers: 0,
    activeSuppliers: 0,
  });
  const [providers, setProviders] = useState<Provider[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      const [quotationsRes, providersRes] = await Promise.all([
        fetch('/api/quotations?status=active'),
        fetch('/api/providers'),
      ]);

      const quotationsData = await quotationsRes.json();
      const providersData = await providersRes.json();

      // Set stats
      if (quotationsData.stats) {
        setStats((prev) => ({
          ...prev,
          totalOrders: quotationsData.stats.total || 0,
          activeOrders:
            (quotationsData.stats.ready_for_human || 0) +
            (quotationsData.stats.gathering_info || 0) +
            (quotationsData.stats.waiting_providers || 0),
          completedOrders: quotationsData.stats.quoted || 0,
          successRate: quotationsData.stats.total > 0
            ? ((quotationsData.stats.quoted / quotationsData.stats.total) * 100)
            : 0,
        }));
      }

      // Set recent orders
      if (quotationsData.quotations) {
        setRecentOrders(quotationsData.quotations.slice(0, 5));
      }

      // Set providers
      if (providersData.providers) {
        setProviders(providersData.providers.slice(0, 5));
        setStats((prev) => ({
          ...prev,
          totalSuppliers: providersData.providers.length,
          activeSuppliers: providersData.providers.filter((p: any) => p.is_active).length,
        }));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                AI Performance metrics and system overview
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                AI
              </Button>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                New Record
              </Button>
              <Button variant="ghost" size="sm">
                <span className="text-sm font-mono">⌘K</span>
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-4 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search"
                className="pl-10 bg-background"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-muted-foreground font-mono">
                /
              </kbd>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Email Deliverability - Cyan */}
            <Card className="border-2 border-cyan-200 dark:border-cyan-800 bg-gradient-to-br from-cyan-50/50 to-white dark:from-cyan-950/20 dark:to-background">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-cyan-500" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Email Deliverability
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.emailDeliverability} %</div>
                <div className="mt-4 h-12">
                  <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <path
                      d="M 0,20 L 20,18 L 40,22 L 60,15 L 80,25 L 100,20"
                      fill="none"
                      stroke="hsl(var(--cyan-300))"
                      strokeWidth="2"
                    />
                    <path
                      d="M 0,20 L 20,18 L 40,22 L 60,15 L 80,25 L 100,20 L 100,40 L 0,40 Z"
                      fill="hsl(var(--cyan-100))"
                      opacity="0.3"
                    />
                  </svg>
                </div>
              </CardContent>
            </Card>

            {/* Success Rate - Pink */}
            <Card className="border-2 border-pink-200 dark:border-pink-800 bg-gradient-to-br from-pink-50/50 to-white dark:from-pink-950/20 dark:to-background">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-pink-500" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Success Rate
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.successRate.toFixed(1)} %</div>
                <div className="mt-4 h-12">
                  <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <path
                      d="M 0,25 L 20,20 L 40,18 L 60,15 L 80,12 L 100,10"
                      fill="none"
                      stroke="hsl(var(--pink-200))"
                      strokeWidth="2"
                    />
                    <path
                      d="M 0,25 L 20,20 L 40,18 L 60,15 L 80,12 L 100,10 L 100,40 L 0,40 Z"
                      fill="hsl(var(--pink-100))"
                      opacity="0.3"
                    />
                  </svg>
                </div>
              </CardContent>
            </Card>

            {/* Active Orders - Yellow */}
            <Card className="border-2 border-expression-200 dark:border-expression-300 bg-gradient-to-br from-expression-100/50 to-white dark:from-expression-300/10 dark:to-background">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-expression-300" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Orders
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.activeOrders}</div>
                <div className="mt-4 h-12">
                  <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <path
                      d="M 0,30 L 20,25 L 40,20 L 60,22 L 80,18 L 100,20"
                      fill="none"
                      stroke="hsl(var(--expression-200))"
                      strokeWidth="2"
                    />
                    <path
                      d="M 0,30 L 20,25 L 40,20 L 60,22 L 80,18 L 100,20 L 100,40 L 0,40 Z"
                      fill="hsl(var(--expression-100))"
                      opacity="0.3"
                    />
                  </svg>
                </div>
              </CardContent>
            </Card>

            {/* Total Orders - Green */}
            <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50/50 to-white dark:from-green-950/20 dark:to-background">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Orders
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalOrders}</div>
                <div className="mt-4 h-12">
                  <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <path
                      d="M 0,35 L 20,30 L 40,28 L 60,25 L 80,20 L 100,15"
                      fill="none"
                      stroke="hsl(145 60% 50%)"
                      strokeWidth="2"
                    />
                    <path
                      d="M 0,35 L 20,30 L 40,28 L 60,25 L 80,20 L 100,15 L 100,40 L 0,40 Z"
                      fill="hsl(145 60% 50%)"
                      opacity="0.2"
                    />
                  </svg>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Suppliers Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Suppliers</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Recently found suppliers ({stats.totalSuppliers} total)
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1" asChild>
                    <a href="/suppliers">
                      View All
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : providers.length === 0 ? (
                  <div className="py-8 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No suppliers found yet</p>
                    <Button variant="outline" size="sm" className="mt-3 gap-2">
                      <Plus className="h-4 w-4" />
                      Find Suppliers
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {providers.map((provider) => (
                      <div
                        key={provider.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-cyan-100 dark:bg-cyan-950 flex items-center justify-center flex-shrink-0">
                            <Users className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{provider.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {provider.email || 'No email'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {provider.is_active && (
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {provider.total_quotes_requested} RFQs
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {providers.length >= 5 && (
                      <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
                        <a href="/suppliers">
                          View all {stats.totalSuppliers} suppliers →
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Orders Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Orders</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Recent quotation requests ({stats.totalOrders} total)
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1" asChild>
                    <a href="/orders">
                      View All
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : recentOrders.length === 0 ? (
                  <div className="py-8 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No orders yet</p>
                    <Button className="mt-3 gap-2 bg-cyan-500 hover:bg-cyan-600" size="sm">
                      <CheckCircle2 className="h-4 w-4" />
                      Process New Emails
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                            order.status === 'ready_for_human' && "bg-emerald-100 dark:bg-emerald-950",
                            order.status === 'gathering_info' && "bg-blue-100 dark:bg-blue-950",
                            order.status === 'waiting_providers' && "bg-amber-100 dark:bg-amber-950",
                            order.status === 'quoted' && "bg-violet-100 dark:bg-violet-950"
                          )}>
                            <Package className={cn(
                              "h-4 w-4",
                              order.status === 'ready_for_human' && "text-emerald-600 dark:text-emerald-400",
                              order.status === 'gathering_info' && "text-blue-600 dark:text-blue-400",
                              order.status === 'waiting_providers' && "text-amber-600 dark:text-amber-400",
                              order.status === 'quoted' && "text-violet-600 dark:text-violet-400"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {order.customer_name || order.customer_email}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {order.parts_description || 'No description'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              order.status === 'ready_for_human' && "bg-emerald-100 text-emerald-700",
                              order.status === 'gathering_info' && "bg-blue-100 text-blue-700",
                              order.status === 'waiting_providers' && "bg-amber-100 text-amber-700",
                              order.status === 'quoted' && "bg-violet-100 text-violet-700"
                            )}
                          >
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {recentOrders.length >= 5 && (
                      <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
                        <a href="/orders">
                          View all {stats.totalOrders} orders →
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
