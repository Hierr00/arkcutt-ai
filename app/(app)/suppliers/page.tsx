'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RFQDetailModal } from '@/components/rfq-detail-modal';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Search,
  Plus,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Provider {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  services: string[];
  total_quotes_requested: number;
  total_quotes_received: number;
  response_rate: number | null;
  avg_response_time_hours: number | null;
  reliability_score: number | null;
  is_active: boolean;
  blacklisted: boolean;
}

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
    color: 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-900',
  },
  sent: {
    label: 'Sent',
    color: 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-900',
  },
  received: {
    label: 'Received',
    color: 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/30 dark:border-green-900',
  },
  expired: {
    label: 'Expired',
    color: 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-900',
  },
  declined: {
    label: 'Declined',
    color: 'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-950/30 dark:border-gray-900',
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

export default function SuppliersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [rfqs, setRfqs] = useState<ExternalQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRFQ, setSelectedRFQ] = useState<ExternalQuotation | null>(null);
  const [rfqStats, setRfqStats] = useState({
    total: 0,
    sent: 0,
    received: 0,
    pending: 0,
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [providersRes, rfqsRes] = await Promise.all([
        fetch('/api/providers'),
        fetch('/api/rfqs'),
      ]);

      const providersData = await providersRes.json();
      const rfqsData = await rfqsRes.json();

      if (providersData.providers) {
        setProviders(providersData.providers);
      }

      if (rfqsData.rfqs) {
        setRfqs(rfqsData.rfqs);
        const stats = {
          total: rfqsData.rfqs.length,
          sent: rfqsData.rfqs.filter((r: ExternalQuotation) => r.status === 'sent').length,
          received: rfqsData.rfqs.filter((r: ExternalQuotation) => r.status === 'received').length,
          pending: rfqsData.rfqs.filter((r: ExternalQuotation) => r.status === 'pending').length,
        };
        setRfqStats(stats);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredProviders = providers.filter((provider) =>
    provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    provider.services.some((service) =>
      service.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const providerStats = {
    total: providers.length,
    active: providers.filter((p) => p.is_active).length,
    highReliability: providers.filter((p) => (p.reliability_score || 0) > 0.8).length,
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border bg-white">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Suppliers</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage your external service providers and RFQs
              </p>
            </div>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add supplier
            </Button>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="providers" className="w-full">
            <TabsList>
              <TabsTrigger value="providers">Suppliers</TabsTrigger>
              <TabsTrigger value="rfqs">RFQs</TabsTrigger>
            </TabsList>

            {/* Providers Tab */}
            <TabsContent value="providers" className="mt-6">
              {/* Search & Stats */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search suppliers or services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex gap-3">
                  <Card className="p-3 border border-border bg-white">
                    <div className="text-xs text-muted-foreground mb-0.5">Total</div>
                    <div className="text-xl font-semibold">{providerStats.total}</div>
                  </Card>

                  <Card className="p-3 border border-border bg-white">
                    <div className="text-xs text-muted-foreground mb-0.5">Active</div>
                    <div className="text-xl font-semibold">{providerStats.active}</div>
                  </Card>

                  <Card className="p-3 border border-border bg-white">
                    <div className="text-xs text-muted-foreground mb-0.5">High quality</div>
                    <div className="text-xl font-semibold">{providerStats.highReliability}</div>
                  </Card>
                </div>
              </div>

              {/* Providers Grid */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-64 w-full" />
                  ))}
                </div>
              ) : filteredProviders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
                    <Building2 className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-base font-semibold mb-1">
                    {searchQuery ? 'No results found' : 'No suppliers found'}
                  </h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm">
                    {searchQuery
                      ? `No suppliers match "${searchQuery}". Try a different search term.`
                      : 'No suppliers have been added yet. Add your first supplier to get started.'}
                  </p>
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchQuery('')}
                      className="mt-4"
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProviders.map((provider) => (
                    <Card
                      key={provider.id}
                      className={cn(
                        'p-5 border border-border bg-white hover:bg-muted/20 transition-all duration-200 group',
                        provider.blacklisted && 'opacity-50'
                      )}
                    >
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                            <h3 className="font-medium line-clamp-1">{provider.name}</h3>
                          </div>
                          {provider.reliability_score !== null && (
                            <span className="text-xs text-muted-foreground">
                              {(provider.reliability_score * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-2 text-sm">
                          {provider.email && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate">{provider.email}</span>
                            </div>
                          )}
                          {provider.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                              {provider.phone}
                            </div>
                          )}
                          {provider.city && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                              {provider.city}
                            </div>
                          )}
                          {provider.website && (
                            <a
                              href={provider.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate text-xs">Website</span>
                            </a>
                          )}
                        </div>

                        {/* Services */}
                        {provider.services.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Services</p>
                            <div className="flex flex-wrap gap-1.5">
                              {provider.services.slice(0, 3).map((service) => (
                                <span
                                  key={service}
                                  className="text-xs px-2 py-0.5 rounded border border-border bg-background"
                                >
                                  {service}
                                </span>
                              ))}
                              {provider.services.length > 3 && (
                                <span className="text-xs px-2 py-0.5 rounded border border-border bg-background">
                                  +{provider.services.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                          <div>
                            <p className="text-xs text-muted-foreground">RFQs sent</p>
                            <p className="text-lg font-semibold mt-0.5">
                              {provider.total_quotes_requested}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Response rate</p>
                            <p className="text-lg font-semibold mt-0.5">
                              {provider.response_rate !== null
                                ? `${(provider.response_rate * 100).toFixed(0)}%`
                                : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* RFQs Tab */}
            <TabsContent value="rfqs" className="mt-6">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <Card className="p-4 border border-border bg-card">
                  <div className="text-xs text-muted-foreground mb-1">Total</div>
                  <div className="text-2xl font-semibold">{rfqStats.total}</div>
                </Card>
                <Card className="p-4 border border-border bg-card">
                  <div className="text-xs text-muted-foreground mb-1">Sent</div>
                  <div className="text-2xl font-semibold">{rfqStats.sent}</div>
                </Card>
                <Card className="p-4 border border-border bg-card">
                  <div className="text-xs text-muted-foreground mb-1">Received</div>
                  <div className="text-2xl font-semibold">{rfqStats.received}</div>
                </Card>
                <Card className="p-4 border border-border bg-card">
                  <div className="text-xs text-muted-foreground mb-1">Pending</div>
                  <div className="text-2xl font-semibold">{rfqStats.pending}</div>
                </Card>
              </div>

              {/* RFQs List */}
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-40 w-full" />
                  ))}
                </div>
              ) : rfqs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
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
                        className="p-5 border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
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
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRFQ && (
        <RFQDetailModal
          rfqId={selectedRFQ.id}
          onClose={() => setSelectedRFQ(null)}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}
