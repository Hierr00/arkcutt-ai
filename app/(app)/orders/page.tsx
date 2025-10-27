'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { QuotationDetailModal } from '@/components/quotation-detail-modal';
import {
  CheckCircle2,
  Clock,
  Search,
  AlertCircle,
  FileCheck,
  Mail,
  TrendingUp,
  Building2,
  Package,
  Calendar,
  ArrowRight,
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
  ready_for_human: number;
  gathering_info: number;
  waiting_providers: number;
  pending: number;
  quoted: number;
}

const statusConfig = {
  ready_for_human: {
    label: 'Ready for Quote',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300',
    icon: AlertCircle,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    priority: 1,
  },
  gathering_info: {
    label: 'Gathering Info',
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300',
    icon: Search,
    iconColor: 'text-blue-600 dark:text-blue-400',
    priority: 2,
  },
  waiting_providers: {
    label: 'Finding Providers',
    color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300',
    icon: TrendingUp,
    iconColor: 'text-amber-600 dark:text-amber-400',
    priority: 3,
  },
  pending: {
    label: 'Needs Review',
    color: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300',
    icon: Clock,
    iconColor: 'text-slate-600 dark:text-slate-400',
    priority: 4,
  },
  quoted: {
    label: 'Quoted',
    color: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300',
    icon: FileCheck,
    iconColor: 'text-violet-600 dark:text-violet-400',
    priority: 5,
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

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const view = searchParams?.get('view') || 'active';

  const [quotations, setQuotations] = useState<QuotationRequest[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    ready_for_human: 0,
    gathering_info: 0,
    waiting_providers: 0,
    pending: 0,
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

  const getViewTitle = () => {
    switch (view) {
      case 'active':
        return { title: 'Active Orders', description: 'Orders where the AI is actively working' };
      case 'ready_for_human':
        return { title: 'Ready for Quote', description: 'Orders ready for human quotation' };
      case 'gathering_info':
        return { title: 'Gathering Information', description: 'AI is collecting required information' };
      case 'waiting_providers':
        return { title: 'Finding Providers', description: 'AI is searching for external providers' };
      case 'completed':
        return { title: 'Completed Orders', description: 'Orders that have been quoted' };
      default:
        return { title: 'All Orders', description: 'Complete order history' };
    }
  };

  const viewInfo = getViewTitle();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{viewInfo.title}</h1>
              <p className="text-muted-foreground mt-1">{viewInfo.description}</p>
            </div>
            <Button size="sm" className="gap-2">
              <Mail className="h-4 w-4" />
              Process New Emails
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ready for Quote</p>
                    <p className="text-2xl font-bold mt-1">{stats.ready_for_human}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Gathering Info</p>
                    <p className="text-2xl font-bold mt-1">{stats.gathering_info}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                    <Search className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Finding Providers</p>
                    <p className="text-2xl font-bold mt-1">{stats.waiting_providers}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold mt-1">{stats.quoted}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-violet-100 dark:bg-violet-950 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : quotations.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No orders found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {view === 'active'
                  ? 'There are no active orders at the moment. New orders will appear here automatically.'
                  : `No orders in this category yet.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {quotations.map((quotation) => {
              const config = statusConfig[quotation.status as keyof typeof statusConfig];
              if (!config) return null;

              const Icon = config.icon;

              return (
                <Card
                  key={quotation.id}
                  className="group hover:shadow-md transition-all duration-200 cursor-pointer border-none shadow-sm"
                  onClick={() => setSelectedQuotation(quotation)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn('gap-1.5', config.color)}>
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {getRelativeTime(quotation.created_at)}
                        </span>
                      </div>
                      {quotation.agent_analysis?.confidence && (
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(quotation.agent_analysis.confidence * 100)}%
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Customer Info */}
                    <div>
                      <p className="font-semibold text-lg">
                        {quotation.customer_name || 'Unknown Customer'}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" />
                          {quotation.customer_email}
                        </div>
                        {quotation.customer_company && (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5" />
                            {quotation.customer_company}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Parts Description */}
                    {quotation.parts_description && (
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-sm line-clamp-2">{quotation.parts_description}</p>
                      </div>
                    )}

                    {/* Technical Details */}
                    <div className="flex items-center gap-4 text-sm">
                      {quotation.material_requested && (
                        <div className="flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{quotation.material_requested}</span>
                        </div>
                      )}
                      {quotation.quantity && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">Qty:</span>
                          <span className="font-medium">{quotation.quantity}</span>
                        </div>
                      )}
                    </div>

                    {/* Missing Info */}
                    {quotation.missing_info && quotation.missing_info.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs text-muted-foreground">Missing:</span>
                        {quotation.missing_info.map((info) => (
                          <Badge key={info} variant="outline" className="text-xs">
                            {info}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Action */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        Updated {getRelativeTime(quotation.updated_at)}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      >
                        View Details
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
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
