'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Mail, Building2, Shield } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border bg-white">
        <div className="px-8 py-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configure your AI agent and workflow
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl space-y-6">
          {/* AI Configuration */}
          <Card className="border border-border bg-white">
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                <div>
                  <h2 className="font-semibold">AI configuration</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Configure how the AI processes orders
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <p className="font-medium text-sm">Auto-processing</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Automatically process new emails every 5 minutes
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Enabled
                </Button>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <p className="font-medium text-sm">Confidence threshold</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Minimum confidence to handle orders automatically
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  75%
                </Button>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-sm">Provider search</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Automatically search for providers using Google Places
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Enabled
                </Button>
              </div>
            </div>
          </Card>

          {/* Email Integration */}
          <Card className="border border-border bg-white">
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                <div>
                  <h2 className="font-semibold">Email integration</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Gmail API configuration
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <p className="font-medium text-sm">Gmail connection</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Status of Gmail API integration
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-sm">Email processing</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Read unread emails from inbox
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </div>
            </div>
          </Card>

          {/* Company Settings */}
          <Card className="border border-border bg-white">
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                <div>
                  <h2 className="font-semibold">Company settings</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Your company information and services
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <p className="font-medium text-sm">Company name</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Arkcutt AI</p>
                </div>
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <p className="font-medium text-sm">Internal services</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Services you can provide in-house
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  Manage
                </Button>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-sm">External services</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Services requiring external providers
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  Manage
                </Button>
              </div>
            </div>
          </Card>

          {/* Security */}
          <Card className="border border-border bg-white">
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                <div>
                  <h2 className="font-semibold">Security</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    API keys and security settings
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <p className="font-medium text-sm">OpenAI API key</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    For AI processing and analysis
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  Update
                </Button>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-sm">Google Places API key</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    For provider search
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  Update
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
