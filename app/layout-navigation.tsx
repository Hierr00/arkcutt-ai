'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function LayoutNavigation() {
  const pathname = usePathname();

  return (
    <div className="border-b bg-background">
      <div className="container mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Arkcutt AI Agent</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Automated quotation processing with human oversight
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={pathname} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="/dashboard" asChild>
              <Link href="/dashboard">Orders</Link>
            </TabsTrigger>
            <TabsTrigger value="/rfqs" asChild>
              <Link href="/rfqs">RFQs</Link>
            </TabsTrigger>
            <TabsTrigger value="/settings" asChild>
              <Link href="/settings">Settings</Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
