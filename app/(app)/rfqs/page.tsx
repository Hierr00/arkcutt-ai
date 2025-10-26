'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RFQDetailModal } from '@/components/rfq-detail-modal';
import {
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Calendar,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExternalQuotation {
  id: string;
  provider_name: string;
  provider_email: string | null;
  provider_phone: string | null;
  service_type: string;
  service_details: any;
  status: string;
  provider_response: any;
  email_sent_at: string | null;
  email_received_at: string | null;
  created_at: string;
  expires_at: string | null;
  quotation_requests: {
    id: string;
    customer_email: string;
    customer_name: string | null;
    parts_description: string | null;
    quantity: number | null;
    material_requested: string | null;
    status: string;
  };
}

const statusConfig = {
  pending: {
    label: 'Pending',
    color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300',
    icon: Clock,
  },
  sent: {
    label: 'Sent',
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300',
    icon: Mail,
  },
  received: {
    label: 'Received',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300',
    icon: CheckCircle2,
  },
  expired: {
    label: 'Expired',
    color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300',
    icon: XCircle,
  },
  declined: {
    label: 'Declined',
    color: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300',
    icon: XCircle,
  },
};

function getRelativeTime(dateString: string | null): string {
  if (!dateString) return 'N/A';
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

export default function RFQsPage() {
  const [rfqs, setRfqs] = useState<ExternalQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRFQ, setSelectedRFQ] = useState<ExternalQuotation | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    received: 0,
    pending: 0,
  });

  useEffect(() => {
    loadRFQs();
    const interval = setInterval(loadRFQs, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadRFQs() {
    try {
      setLoading(true);
      const res = await fetch('/api/rfqs');
      const data = await res.json();

      if (data.rfqs) {
        setRfqs(data.rfqs);
        // Calculate stats
        const stats = {
          total: data.rfqs.length,
          sent: data.rfqs.filter((r: ExternalQuotation) => r.status === 'sent').length,
          received: data.rfqs.filter((r: ExternalQuotation) => r.status === 'received').length,
          pending: data.rfqs.filter((r: ExternalQuotation) => r.status === 'pending').length,
        };
        setStats(stats);
      }
    } catch (error) {
      console.error('Error loading RFQs:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">RFQs to Providers</h1>
              <p className="text-muted-foreground mt-1">
                Request for quotations sent to external providers
              </p>
            </div>
            <Button size="sm" className="gap-2">
              <Building2 className="h-4 w-4" />
              Search Providers
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total RFQs</p>
                    <p className="text-2xl font-bold mt-1">{stats.total}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Sent</p>
                    <p className="text-2xl font-bold mt-1">{stats.sent}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                    <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Received</p>
                    <p className="text-2xl font-bold mt-1">{stats.received}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold mt-1">{stats.pending}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
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
        ) : rfqs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No RFQs found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                No requests for quotations have been sent to providers yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {rfqs.map((rfq) => {
              const config = statusConfig[rfq.status as keyof typeof statusConfig];
              if (!config) return null;

              const Icon = config.icon;

              return (
                <Card
                  key={rfq.id}
                  className="group hover:shadow-md transition-all duration-200 cursor-pointer border-none shadow-sm"
                  onClick={() => setSelectedRFQ(rfq)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <Badge variant="outline" className={cn('gap-1.5', config.color)}>
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {getRelativeTime(rfq.created_at)}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Provider Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <p className="font-semibold">{rfq.provider_name}</p>
                      </div>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {rfq.provider_email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" />
                            <span className="truncate">{rfq.provider_email}</span>
                          </div>
                        )}
                        {rfq.provider_phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" />
                            {rfq.provider_phone}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Service Type */}
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground mb-1">Service Requested</p>
                      <p className="text-sm font-medium capitalize">{rfq.service_type}</p>
                    </div>

                    {/* Customer Order */}
                    {rfq.quotation_requests && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Related Order</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="truncate">{rfq.quotation_requests.customer_email}</span>
                          </div>
                          {rfq.quotation_requests.material_requested && (
                            <div className="flex items-center gap-2">
                              <Package className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{rfq.quotation_requests.material_requested}</span>
                              {rfq.quotation_requests.quantity && (
                                <span className="text-muted-foreground">× {rfq.quotation_requests.quantity}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Timing */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                      {rfq.email_sent_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Sent {getRelativeTime(rfq.email_sent_at)}
                        </div>
                      )}
                      {rfq.email_received_at && (
                        <Badge variant="secondary" className="text-xs">
                          Replied {getRelativeTime(rfq.email_received_at)}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRFQ && (
        <RFQDetailModal
          rfqId={selectedRFQ.id}
          onClose={() => setSelectedRFQ(null)}
          onUpdate={loadRFQs}
        />
      )}
    </div>
  );
}
