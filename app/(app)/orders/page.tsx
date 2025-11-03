'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { QuotationDetailModal } from '@/components/quotation-detail-modal';
import {
  CheckCircle2,
  Search,
  AlertCircle,
  TrendingUp,
  Mail,
  Building2,
  Package,
  Calendar,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuotationRequest {
  id: string;
  customer_email: string;
  customer_name: string | null;
  customer_company: string | null;
  parts_description: string | null;
  material_requested: string | null;
  quantity: number | null;
  status: string;
  missing_info: string[] | null;
  created_at: string;
  updated_at: string;
  agent_analysis?: {
    confidence?: number;
    complexity?: string;
    flags?: string[];
  };
}

interface Stats {
  total: number;
  pending: number;
  ready_for_human: number;
  gathering_info: number;
  waiting_providers: number;
  quoted: number;
}

const statusConfig = {
  pending: {
    label: 'Pending',
    color: 'text-gray-600 bg-gray-50 border-gray-200',
  },
  ready_for_human: {
    label: 'Ready',
    color: 'text-green-600 bg-green-50 border-green-200',
  },
  gathering_info: {
    label: 'Gathering info',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  waiting_providers: {
    label: 'Finding providers',
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  quoted: {
    label: 'Quoted',
    color: 'text-purple-600 bg-purple-50 border-purple-200',
  },
};

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function OrdersContent() {
  const searchParams = useSearchParams();
  const view = searchParams?.get('view') || 'active';

  const [quotations, setQuotations] = useState<QuotationRequest[]>([]);
  const [filteredQuotations, setFilteredQuotations] = useState<QuotationRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null); // null = all
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    ready_for_human: 0,
    gathering_info: 0,
    waiting_providers: 0,
    quoted: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationRequest | null>(null);

  useEffect(() => {
    loadQuotations();
    const interval = setInterval(loadQuotations, 30000);
    return () => clearInterval(interval);
  }, [view]);

  async function loadQuotations() {
    try {
      setLoading(true);
      const statusParam = view === 'active'
        ? 'active'
        : view === 'completed'
        ? 'quoted'
        : view;

      const res = await fetch(`/api/quotations?status=${statusParam}`);
      const data = await res.json();

      if (data.quotations) {
        setQuotations(data.quotations);
        setFilteredQuotations(data.quotations);
      }

      if (data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading quotations:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let filtered = quotations;

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter((q) => q.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((q) => {
        return (
          q.customer_name?.toLowerCase().includes(query) ||
          q.customer_email?.toLowerCase().includes(query) ||
          q.customer_company?.toLowerCase().includes(query) ||
          q.parts_description?.toLowerCase().includes(query) ||
          q.material_requested?.toLowerCase().includes(query)
        );
      });
    }

    setFilteredQuotations(filtered);
  }, [searchQuery, quotations, statusFilter]);

  const getViewTitle = () => {
    switch (view) {
      case 'active':
        return { title: 'Active orders', description: 'Orders currently being processed' };
      case 'ready_for_human':
        return { title: 'Ready for quote', description: 'Orders ready for quotation' };
      case 'gathering_info':
        return { title: 'Gathering information', description: 'AI is collecting required information' };
      case 'waiting_providers':
        return { title: 'Finding providers', description: 'AI is searching for providers' };
      case 'completed':
        return { title: 'Completed', description: 'Quoted orders' };
      default:
        return { title: 'All orders', description: 'Complete order history' };
    }
  };

  const viewInfo = getViewTitle();

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border bg-white">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1 flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">{viewInfo.title}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{viewInfo.description}</p>
              </div>
              {statusFilter && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted border border-border">
                  <span className="text-xs font-medium">
                    Showing: {statusConfig[statusFilter as keyof typeof statusConfig]?.label || statusFilter}
                  </span>
                  <button
                    onClick={() => setStatusFilter(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-64 rounded-md border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              {(searchQuery || statusFilter) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter(null);
                  }}
                  className="text-xs"
                >
                  Clear filters
                </Button>
              )}
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                New order
              </Button>
            </div>
          </div>

          {/* Stats - Clickable Filters */}
          <div className="grid grid-cols-5 gap-4">
            <Card
              className={cn(
                "p-4 border cursor-pointer transition-all hover:shadow-md",
                statusFilter === 'pending'
                  ? "border-gray-500 bg-gray-50 ring-2 ring-gray-200"
                  : "border-border bg-white"
              )}
              onClick={() => setStatusFilter(statusFilter === 'pending' ? null : 'pending')}
            >
              <div className="text-xs text-muted-foreground mb-1">Pending</div>
              <div className="text-2xl font-semibold">{stats.pending || 0}</div>
            </Card>
            <Card
              className={cn(
                "p-4 border cursor-pointer transition-all hover:shadow-md",
                statusFilter === 'ready_for_human'
                  ? "border-green-500 bg-green-50 ring-2 ring-green-200"
                  : "border-border bg-white"
              )}
              onClick={() => setStatusFilter(statusFilter === 'ready_for_human' ? null : 'ready_for_human')}
            >
              <div className="text-xs text-muted-foreground mb-1">Ready</div>
              <div className="text-2xl font-semibold">{stats.ready_for_human}</div>
            </Card>
            <Card
              className={cn(
                "p-4 border cursor-pointer transition-all hover:shadow-md",
                statusFilter === 'gathering_info'
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                  : "border-border bg-white"
              )}
              onClick={() => setStatusFilter(statusFilter === 'gathering_info' ? null : 'gathering_info')}
            >
              <div className="text-xs text-muted-foreground mb-1">Gathering</div>
              <div className="text-2xl font-semibold">{stats.gathering_info}</div>
            </Card>
            <Card
              className={cn(
                "p-4 border cursor-pointer transition-all hover:shadow-md",
                statusFilter === 'waiting_providers'
                  ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200"
                  : "border-border bg-white"
              )}
              onClick={() => setStatusFilter(statusFilter === 'waiting_providers' ? null : 'waiting_providers')}
            >
              <div className="text-xs text-muted-foreground mb-1">Finding</div>
              <div className="text-2xl font-semibold">{stats.waiting_providers}</div>
            </Card>
            <Card
              className={cn(
                "p-4 border cursor-pointer transition-all hover:shadow-md",
                statusFilter === 'quoted'
                  ? "border-purple-500 bg-purple-50 ring-2 ring-purple-200"
                  : "border-border bg-white"
              )}
              onClick={() => setStatusFilter(statusFilter === 'quoted' ? null : 'quoted')}
            >
              <div className="text-xs text-muted-foreground mb-1">Completed</div>
              <div className="text-2xl font-semibold">{stats.quoted}</div>
            </Card>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : filteredQuotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
              <Mail className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-semibold mb-1">
              {(searchQuery || statusFilter) ? 'No results found' : 'No orders found'}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {searchQuery || statusFilter
                ? `No orders match your filters. Try adjusting your search or filters.`
                : view === 'active'
                ? 'No active orders at the moment'
                : `No orders in this category yet`}
            </p>
            {(searchQuery || statusFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter(null);
                }}
                className="mt-4"
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredQuotations.map((quotation) => {
              const config = statusConfig[quotation.status as keyof typeof statusConfig];
              if (!config) return null;

              return (
                <Card
                  key={quotation.id}
                  className="p-5 border border-border bg-white hover:bg-muted/20 transition-all duration-200 cursor-pointer group"
                  onClick={() => setSelectedQuotation(quotation)}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Main Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-base">
                          {quotation.customer_name || quotation.customer_email}
                        </span>
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-md border font-medium",
                          config.color
                        )}>
                          {config.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {getRelativeTime(quotation.created_at)}
                        </span>
                      </div>

                      {quotation.parts_description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {quotation.parts_description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {quotation.customer_company && (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5" />
                            {quotation.customer_company}
                          </div>
                        )}
                        {quotation.material_requested && (
                          <div className="flex items-center gap-1.5">
                            <Package className="h-3.5 w-3.5" />
                            {quotation.material_requested}
                          </div>
                        )}
                        {quotation.quantity && (
                          <div>Qty: {quotation.quantity}</div>
                        )}
                      </div>

                      {quotation.missing_info && quotation.missing_info.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">Missing:</span>
                          {quotation.missing_info.map((info) => (
                            <span key={info} className="text-xs px-2 py-0.5 rounded border border-border bg-background">
                              {info}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Confidence */}
                    {quotation.agent_analysis?.confidence && (
                      <div className="text-xs text-muted-foreground">
                        {Math.round(quotation.agent_analysis.confidence * 100)}% confidence
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedQuotation && (
        <QuotationDetailModal
          quotationId={selectedQuotation.id}
          onClose={() => setSelectedQuotation(null)}
        />
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <OrdersContent />
    </Suspense>
  );
}
