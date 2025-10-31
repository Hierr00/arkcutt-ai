'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Package,
  Users,
  ArrowUpRight,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface DashboardStats {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
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
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
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

      if (quotationsData.quotations) {
        setRecentOrders(quotationsData.quotations.slice(0, 5));
      }

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready_for_human':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'gathering_info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'waiting_providers':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'quoted':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border bg-white">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Overview of your quotations and suppliers
              </p>
            </div>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New order
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-5 border border-border bg-white">
              <div className="text-sm text-muted-foreground mb-1">Total orders</div>
              <div className="text-3xl font-semibold">{stats.totalOrders}</div>
            </Card>
            <Card className="p-5 border border-border bg-white">
              <div className="text-sm text-muted-foreground mb-1">Active</div>
              <div className="text-3xl font-semibold">{stats.activeOrders}</div>
            </Card>
            <Card className="p-5 border border-border bg-white">
              <div className="text-sm text-muted-foreground mb-1">Completed</div>
              <div className="text-3xl font-semibold">{stats.completedOrders}</div>
            </Card>
            <Card className="p-5 border border-border bg-white">
              <div className="text-sm text-muted-foreground mb-1">Success rate</div>
              <div className="text-3xl font-semibold">{stats.successRate.toFixed(0)}%</div>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Orders */}
            <Card className="border border-border bg-white">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Recent orders</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {stats.totalOrders} total
                  </p>
                </div>
                <Link href="/orders">
                  <Button variant="ghost" size="sm" className="gap-1">
                    View all
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : recentOrders.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
                      <Package className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.5} />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">No orders yet</p>
                    <p className="text-xs text-muted-foreground">Orders will appear here once you receive them</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/20 transition-all duration-200 cursor-pointer group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {order.customer_name || order.customer_email}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {order.parts_description || 'No description'}
                          </p>
                        </div>
                        <span className={cn(
                          "text-xs px-2.5 py-1 rounded-md border font-medium",
                          getStatusColor(order.status)
                        )}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Suppliers */}
            <Card className="border border-border bg-white">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Suppliers</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {stats.totalSuppliers} total
                  </p>
                </div>
                <Link href="/suppliers">
                  <Button variant="ghost" size="sm" className="gap-1">
                    View all
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
              <div className="p-6">
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : providers.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
                      <Users className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.5} />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">No suppliers yet</p>
                    <p className="text-xs text-muted-foreground">Add suppliers to start managing them</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {providers.map((provider) => (
                      <div
                        key={provider.id}
                        className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/20 transition-all duration-200 cursor-pointer group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{provider.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {provider.email || 'No email'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {provider.is_active && (
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                          )}
                          <span className="text-xs text-muted-foreground font-medium">
                            {provider.total_quotes_requested} RFQs
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
