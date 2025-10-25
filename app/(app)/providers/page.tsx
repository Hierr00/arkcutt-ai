'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Star,
  TrendingUp,
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Providers</h1>
              <p className="text-muted-foreground mt-1">
                External service providers and suppliers
              </p>
            </div>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Provider
            </Button>
          </div>

          {/* Search & Stats */}
          <div className="flex items-center gap-4 mt-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search providers or services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-4">
              <Card className="border-none shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total</p>
                      <p className="text-xl font-bold">{stats.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active</p>
                      <p className="text-xl font-bold">{stats.active}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                      <Star className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">High Quality</p>
                      <p className="text-xl font-bold">{stats.highReliability}</p>
                    </div>
                  </div>
                </CardContent>
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
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProviders.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No providers found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {searchQuery
                  ? `No providers match "${searchQuery}"`
                  : 'No providers have been added yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProviders.map((provider) => (
              <Card
                key={provider.id}
                className={cn(
                  'group hover:shadow-md transition-all duration-200 border-none shadow-sm',
                  provider.blacklisted && 'opacity-50'
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold line-clamp-1">{provider.name}</h3>
                    </div>
                    {provider.reliability_score !== null && (
                      <Badge
                        variant={provider.reliability_score > 0.7 ? 'default' : 'secondary'}
                        className="gap-1"
                      >
                        <Star className="h-3 w-3" />
                        {(provider.reliability_score * 100).toFixed(0)}%
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
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
                        <span className="truncate">Website</span>
                      </a>
                    )}
                  </div>

                  {/* Services */}
                  {provider.services.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Services</p>
                      <div className="flex flex-wrap gap-1">
                        {provider.services.slice(0, 3).map((service) => (
                          <Badge key={service} variant="outline" className="text-xs">
                            {service}
                          </Badge>
                        ))}
                        {provider.services.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{provider.services.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t text-xs">
                    <div>
                      <p className="text-muted-foreground">RFQs Sent</p>
                      <p className="text-lg font-semibold mt-1">
                        {provider.total_quotes_requested}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Response Rate</p>
                      <p className="text-lg font-semibold mt-1">
                        {provider.response_rate !== null
                          ? `${(provider.response_rate * 100).toFixed(0)}%`
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Action */}
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
