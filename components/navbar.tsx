'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function Navbar() {
  return (
    <div className="w-full h-14 flex items-center justify-between px-6 bg-white border-b border-border">
      {/* Logo - Left */}
      <div className="flex items-center gap-3">
        <img
          src="/images/logo-ark-ai.png"
          alt="ark-ai"
          className="h-8 w-auto"
        />
      </div>

      {/* Search Bar - Center */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search..."
            className="w-full h-9 pl-9 pr-16 text-sm bg-muted/30 border-border hover:bg-muted/50 focus-visible:ring-1 focus-visible:ring-ring transition-colors"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            /
          </kbd>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* AI Button */}
        <button className="h-9 flex items-center">
          <img
            src="/images/ai-button.png"
            alt="AI"
            className="h-9 w-auto"
          />
        </button>

        {/* Settings Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-9 flex items-center">
              <img
                src="/images/menu-button.png"
                alt="Menu"
                className="h-9 w-auto"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Help</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
