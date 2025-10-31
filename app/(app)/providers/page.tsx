'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Search,
  Plus,
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

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProviders();
  }, []);

  async function loadProviders() {
    try {
      setLoading(true);
      const res = await fetch('/api/providers');
      const data = await res.json();

      if (data.providers) {
        setProviders(data.providers);
      }
    } catch (error) {
      console.error('Error loading providers:', error);
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

  const stats = {
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
                Manage your external service providers
              </p>
            </div>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add supplier
            </Button>
          </div>

          {/* Search & Stats */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers or services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/30 border-border hover:bg-muted/50 focus-visible:ring-1 focus-visible:ring-ring transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <Card className="p-3 border border-border bg-white">
                <div className="text-xs text-muted-foreground mb-0.5">Total</div>
                <div className="text-xl font-semibold">{stats.total}</div>
              </Card>

              <Card className="p-3 border border-border bg-white">
                <div className="text-xs text-muted-foreground mb-0.5">Active</div>
                <div className="text-xl font-semibold">{stats.active}</div>
              </Card>

              <Card className="p-3 border border-border bg-white">
                <div className="text-xs text-muted-foreground mb-0.5">High quality</div>
                <div className="text-xl font-semibold">{stats.highReliability}</div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
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
            <h3 className="text-base font-semibold mb-1">No suppliers found</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {searchQuery
                ? `No suppliers match "${searchQuery}"`
                : 'No suppliers have been added yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProviders.map((provider) => (
              <Card
                key={provider.id}
                className={cn(
                  'p-5 border border-border bg-white hover:bg-muted/20 transition-all duration-200',
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
      </div>
    </div>
  );
}
