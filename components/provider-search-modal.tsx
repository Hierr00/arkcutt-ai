'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Building2, MapPin, Phone, Mail, Globe, Plus } from 'lucide-react';

interface Props {
  onClose: () => void;
  onProviderSelected?: (provider: any) => void;
}

interface SearchResult {
  name: string;
  address: string;
  city: string;
  phone?: string;
  website?: string;
  rating?: number;
  googlePlaceId: string;
}

export function ProviderSearchModal({ onClose, onProviderSelected }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceType, setServiceType] = useState('anodizado');
  const [location, setLocation] = useState('Madrid');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<SearchResult | null>(null);

  const handleSearch = async () => {
    if (!searchQuery && !serviceType) return;

    setSearching(true);
    try {
      const response = await fetch('/api/providers/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: serviceType || searchQuery,
          location,
          radius: 50,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResults(data.providers || []);
      }
    } catch (error) {
      console.error('Error searching providers:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleAddProvider = async (provider: SearchResult) => {
    try {
      const response = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: provider.name,
          address: provider.address,
          city: provider.city,
          phone: provider.phone,
          website: provider.website,
          google_place_id: provider.googlePlaceId,
          services: [serviceType],
          is_active: true,
        }),
      });

      const data = await response.json();
      if (data.success) {
        if (onProviderSelected) {
          onProviderSelected(data.provider);
        }
        onClose();
      }
    } catch (error) {
      console.error('Error adding provider:', error);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <Card
        className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="border-b sticky top-0 bg-card z-10">
          <div className="flex items-center justify-between">
            <CardTitle>Search for Providers</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Search Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="service">Service Type</Label>
                <Input
                  id="service"
                  placeholder="e.g. anodizado, cromado"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="City or region"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="query">Additional Keywords</Label>
                <Input
                  id="query"
                  placeholder="Optional"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <Button onClick={handleSearch} disabled={searching} className="w-full">
              {searching ? (
                <>
                  <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"></div>
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search Providers
                </>
              )}
            </Button>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  Found {results.length} provider{results.length !== 1 ? 's' : ''}
                </h3>
              </div>

              <div className="space-y-2">
                {results.map((provider, idx) => (
                  <Card
                    key={idx}
                    className={`cursor-pointer hover:border-primary transition-colors ${
                      selectedProvider?.googlePlaceId === provider.googlePlaceId
                        ? 'border-primary bg-primary/5'
                        : ''
                    }`}
                    onClick={() => setSelectedProvider(provider)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <h4 className="font-semibold">{provider.name}</h4>
                            {provider.rating && (
                              <Badge variant="outline" className="ml-2">
                                ⭐ {provider.rating.toFixed(1)}
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{provider.address}</span>
                            </div>
                            {provider.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3" />
                                {provider.phone}
                              </div>
                            )}
                            {provider.website && (
                              <div className="flex items-center gap-2">
                                <Globe className="h-3 w-3" />
                                <a
                                  href={provider.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline truncate"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {provider.website}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddProvider(provider);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {!searching && results.length === 0 && searchQuery && (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No providers found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your search criteria
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
