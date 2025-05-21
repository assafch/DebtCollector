
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  Menu, 
  X, 
  LogOut, 
  LayoutDashboard, 
  FileText, 
  Users, 
  PhoneCall, 
  Settings as SettingsLucide, // Alias for clarity if 'Settings' is used as key
  type LucideIcon 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { MenuItemType as MenuItemPropType } from '@/types/layout'; // Ensure this matches the prop structure

// Map string icon names to actual Lucide icon components
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  FileText,
  Users,
  PhoneCall,
  SettingsIcon: SettingsLucide, // Key 'SettingsIcon' maps to the imported Settings component
};

interface ResponsiveAppLayoutProps {
  menuItems: MenuItemPropType[]; // Expects MenuItemType with iconName: string
  onLogout: () => void | Promise<void>; // Can be a standard function or a server action
  children: React.ReactNode;
  logoSrc?: string;
  appName: string;
}

export function ResponsiveAppLayout({
  menuItems,
  onLogout,
  children,
  logoSrc,
  appName
}: ResponsiveAppLayoutProps) {
  const pathname = usePathname();
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [currentPageTitle, setCurrentPageTitle] = useState('');

  useEffect(() => {
    const activeItem = menuItems.find(item => pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path + '/')));
    setCurrentPageTitle(activeItem ? activeItem.name : appName);
  }, [pathname, menuItems, appName]);

  const handleLinkClick = useCallback(() => {
    if (isMobileSheetOpen) {
      setIsMobileSheetOpen(false);
    }
  }, [isMobileSheetOpen]);

  const sidebarNavigation = (
    <nav className="flex-grow p-4 space-y-1 overflow-y-auto">
      {menuItems.map((item) => {
        const IconComponent = iconMap[item.iconName];
        if (!IconComponent) {
          console.warn(`Icon not found for name: ${item.iconName}`);
          // Optionally render a placeholder or null
          return null; 
        }
        const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path + '/'));
        return (
          <Link
            key={item.name}
            href={item.path}
            onClick={handleLinkClick}
            className={cn(
              "flex items-center space-x-3 rtl:space-x-reverse p-2.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-medium",
              isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-muted"
            )}
          >
            <IconComponent className="h-5 w-5" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-card text-card-foreground shadow-lg">
      <div className="p-4 border-b border-border flex items-center space-x-3 rtl:space-x-reverse">
        {logoSrc && <Image data-ai-hint="logo abstract" src={logoSrc} alt={`${appName} Logo`} width={32} height={32} className="rounded"/>}
        <h1 className="text-xl font-semibold text-foreground">{appName}</h1>
      </div>
      {sidebarNavigation}
      <div className="p-4 mt-auto border-t border-border">
        <Button variant="outline" className="w-full justify-start text-left" onClick={async () => {
          await onLogout(); // Call the passed onLogout function (could be a server action)
          if (isMobileSheetOpen) setIsMobileSheetOpen(false);
        }}>
          <LogOut className="mr-2 rtl:ml-2 rtl:mr-0 h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
      <aside className="hidden md:block w-64 h-screen sticky top-0 shadow-lg z-30">
        {sidebarContent}
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden sticky top-0 z-20 bg-card shadow-sm p-3 flex items-center justify-between border-b border-border">
          <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation menu">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-0 bg-transparent border-none">
              {sidebarContent}
            </SheetContent>
          </Sheet>
          <h2 className="text-lg font-semibold text-foreground">{currentPageTitle}</h2>
          <div className="w-10 h-10"></div> 
        </header>

        <main className="flex-grow p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
