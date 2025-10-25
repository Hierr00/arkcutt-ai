'use client';

import { LayoutNavigation } from '../layout-navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ConfigPage() {
  return (
    <div className="min-h-screen bg-background">
      <LayoutNavigation />

      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Configuration - AI Playbook</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-12 text-center">
              <h3 className="text-lg font-medium mb-2">AI Configuration</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure AI agent capabilities and business rules
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Coming soon:</p>
                <p>• Internal services configuration</p>
                <p>• External services that require providers</p>
                <p>• Stock and capacity management</p>
                <p>• Business rules and pricing</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
