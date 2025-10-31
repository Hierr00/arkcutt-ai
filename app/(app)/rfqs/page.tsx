'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RFQDetailModal } from '@/components/rfq-detail-modal';
import {
  Building2,
  Clock,
  CheckCircle2,
  Mail,
  Phone,
  Package,
  Plus,
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
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  sent: {
    label: 'Sent',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  received: {
    label: 'Received',
    color: 'text-green-600 bg-green-50 border-green-200',
  },
  expired: {
    label: 'Expired',
    color: 'text-red-600 bg-red-50 border-red-200',
  },
  declined: {
    label: 'Declined',
    color: 'text-gray-600 bg-gray-50 border-gray-200',
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
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border bg-white">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">RFQs to providers</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Quotation requests sent to external providers
              </p>
            </div>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Search providers
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4 border border-border bg-white">
              <div className="text-xs text-muted-foreground mb-1">Total</div>
              <div className="text-2xl font-semibold">{stats.total}</div>
            </Card>
            <Card className="p-4 border border-border bg-white">
              <div className="text-xs text-muted-foreground mb-1">Sent</div>
              <div className="text-2xl font-semibold">{stats.sent}</div>
            </Card>
            <Card className="p-4 border border-border bg-white">
              <div className="text-xs text-muted-foreground mb-1">Received</div>
              <div className="text-2xl font-semibold">{stats.received}</div>
            </Card>
            <Card className="p-4 border border-border bg-white">
              <div className="text-xs text-muted-foreground mb-1">Pending</div>
              <div className="text-2xl font-semibold">{stats.pending}</div>
            </Card>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : rfqs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-semibold mb-1">No RFQs found</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              No requests for quotations have been sent yet
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rfqs.map((rfq) => {
              const config = statusConfig[rfq.status as keyof typeof statusConfig];
              if (!config) return null;

              return (
                <Card
                  key={rfq.id}
                  className="p-5 border border-border bg-white hover:bg-muted/20 transition-all duration-200 cursor-pointer"
                  onClick={() => setSelectedRFQ(rfq)}
                >
                  <div className="flex items-start justify-between gap-6">
                    {/* Main Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                        <span className="font-medium">{rfq.provider_name}</span>
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-md border font-medium",
                          config.color
                        )}>
                          {config.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {getRelativeTime(rfq.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
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

                      <div className="text-sm">
                        <span className="text-muted-foreground">Service:</span>{' '}
                        <span className="font-medium capitalize">{rfq.service_type}</span>
                      </div>

                      {rfq.quotation_requests && (
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" />
                            {rfq.quotation_requests.customer_email}
                          </div>
                          {rfq.quotation_requests.material_requested && (
                            <div className="flex items-center gap-1.5">
                              <Package className="h-3.5 w-3.5" />
                              {rfq.quotation_requests.material_requested}
                              {rfq.quotation_requests.quantity && ` × ${rfq.quotation_requests.quantity}`}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Timing */}
                    <div className="text-right text-xs text-muted-foreground">
                      {rfq.email_sent_at && (
                        <div>Sent {getRelativeTime(rfq.email_sent_at)}</div>
                      )}
                      {rfq.email_received_at && (
                        <div className="mt-1">Replied {getRelativeTime(rfq.email_received_at)}</div>
                      )}
                    </div>
                  </div>
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
