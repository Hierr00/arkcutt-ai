'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Brain,
  Database,
  Mail,
  MapPin,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Settings,
  ExternalLink,
  AlertCircle,
  Plug,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Integration {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'error';
  icon: string;
  category: string;
  configured: boolean;
  requiredEnvVars: string[];
}

interface IntegrationStats {
  total: number;
  connected: number;
  disconnected: number;
}

const iconMap: Record<string, any> = {
  brain: Brain,
  database: Database,
  mail: Mail,
  'map-pin': MapPin,
  'shield-alert': ShieldAlert,
};

const categoryColors: Record<string, string> = {
  ai: 'text-purple-600 bg-purple-50 border-purple-200',
  database: 'text-blue-600 bg-blue-50 border-blue-200',
  communication: 'text-green-600 bg-green-50 border-green-200',
  location: 'text-orange-600 bg-orange-50 border-orange-200',
  monitoring: 'text-red-600 bg-red-50 border-red-200',
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [stats, setStats] = useState<IntegrationStats>({
    total: 0,
    connected: 0,
    disconnected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  async function loadIntegrations() {
    try {
      setLoading(true);
      const res = await fetch('/api/integrations');
      const data = await res.json();

      if (data.success) {
        setIntegrations(data.integrations);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading integrations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function testIntegration(integrationId: string) {
    try {
      setTestingId(integrationId);
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId, action: 'test' }),
      });
      const data = await res.json();

      if (data.success && data.test.success) {
        // Reload integrations to update status
        await loadIntegrations();
      }
    } catch (error) {
      console.error('Error testing integration:', error);
    } finally {
      setTestingId(null);
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'error':
        return 'Error';
      default:
        return 'Not configured';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border bg-white">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-foreground">Integrations</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage and monitor your service integrations
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={loadIntegrations}
              disabled={loading}
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 border border-border bg-white">
              <div className="text-xs text-muted-foreground mb-1">Total</div>
              <div className="text-2xl font-semibold">{stats.total}</div>
            </Card>
            <Card className="p-4 border border-border bg-white">
              <div className="text-xs text-muted-foreground mb-1">Connected</div>
              <div className="text-2xl font-semibold text-green-600">
                {stats.connected}
              </div>
            </Card>
            <Card className="p-4 border border-border bg-white">
              <div className="text-xs text-muted-foreground mb-1">Disconnected</div>
              <div className="text-2xl font-semibold text-gray-600">
                {stats.disconnected}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : integrations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
              <Plug className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-semibold mb-1">No integrations found</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Unable to load integrations. Please try refreshing the page.
            </p>
          </div>
        ) : (
          <div className="max-w-4xl space-y-3">
            {integrations.map((integration) => {
              const Icon = iconMap[integration.icon] || Plug;
              const categoryColor = categoryColors[integration.category] || categoryColors.ai;

              return (
                <Card
                  key={integration.id}
                  className="p-6 border border-border bg-white hover:bg-muted/20 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Icon and Info */}
                    <div className="flex items-start gap-4 flex-1">
                      <div
                        className={cn(
                          'h-12 w-12 rounded-lg border flex items-center justify-center',
                          categoryColor
                        )}
                      >
                        <Icon className="h-6 w-6" strokeWidth={1.5} />
                      </div>

                      <div className="flex-1 space-y-3">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-base">{integration.name}</h3>
                            <span
                              className={cn(
                                'text-xs px-2 py-1 rounded-md border font-medium',
                                getStatusColor(integration.status)
                              )}
                            >
                              {getStatusLabel(integration.status)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {integration.description}
                          </p>
                        </div>

                        {/* Environment Variables */}
                        {integration.requiredEnvVars.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              Required environment variables:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {integration.requiredEnvVars.map((envVar) => (
                                <span
                                  key={envVar}
                                  className="text-xs px-2 py-1 rounded border border-border bg-background font-mono"
                                >
                                  {envVar}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {getStatusIcon(integration.status)}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-2"
                        onClick={() => testIntegration(integration.id)}
                        disabled={testingId === integration.id}
                      >
                        {testingId === integration.id ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <Settings className="h-4 w-4" />
                            Test
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Help Section */}
        {!loading && integrations.length > 0 && (
          <div className="max-w-4xl mt-6">
            <Card className="p-6 border border-border bg-muted/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Configuration Help</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    To configure integrations, update your <span className="font-mono text-xs">.env.local</span> file
                    with the required environment variables. After making changes, restart the
                    development server for them to take effect.
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <Button size="sm" variant="outline" className="gap-2 h-8" asChild>
                      <a
                        href="https://github.com/anthropics/arkcutt-ai#setup"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        View documentation
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
