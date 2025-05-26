
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
  Settings as SettingsLucide,
  Sun,
  Moon,
  type LucideIcon 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { MenuItemType as MenuItemPropType } from '@/types/layout';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { LoginWithGoogleButton } from '@/components/auth/LoginWithGoogleButton'; // Import LoginButton
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // For user avatar

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  FileText,
  Users,
  PhoneCall,
  SettingsIcon: SettingsLucide,
};

interface ResponsiveAppLayoutProps {
  menuItems: MenuItemPropType[];
  // onLogout prop is removed as logout is handled by AuthContext
  children: React.ReactNode;
  logoSrc?: string;
  appName: string;
}

export function ResponsiveAppLayout({
  menuItems,
  children,
  logoSrc,
  appName
}: ResponsiveAppLayoutProps) {
  const pathname = usePathname();
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [currentPageTitle, setCurrentPageTitle] = useState('');
  const [theme, setTheme] = useState('light');

  const { user, loading: authLoading, logout } = useAuth(); // Get user and logout from AuthContext

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark')) {
      setTheme(storedTheme);
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const activeItem = menuItems.find(item => pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path + '/')));
    setCurrentPageTitle(activeItem ? activeItem.name : appName);
  }, [pathname, menuItems, appName]);

  const handleLinkClick = useCallback(() => {
    if (isMobileSheetOpen) {
      setIsMobileSheetOpen(false);
    }
  }, [isMobileSheetOpen]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    await logout();
    if (isMobileSheetOpen) {
      setIsMobileSheetOpen(false);
    }
  };

  const sidebarNavigation = (
    <nav className="flex-grow p-4 space-y-1 overflow-y-auto">
      {menuItems.map((item) => {
        const IconComponent = iconMap[item.iconName];
        if (!IconComponent) {
          console.warn(`Icon not found for name: ${item.iconName}`);
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
        {logoSrc && <Image data-ai-hint="logo office" src={logoSrc} alt={`${appName} Logo`} width={32} height={32} className="rounded"/>}
        <h1 className="text-xl font-semibold text-foreground">{appName}</h1>
      </div>
      {user && (
         <div className="p-4 border-b border-border flex items-center space-x-3 rtl:space-x-reverse">
            <Avatar>
              <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
              <AvatarFallback>{user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">{user.displayName || "User"}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
        </div>
      )}
      {sidebarNavigation}
      <div className="p-4 mt-auto border-t border-border space-y-2">
        <Button variant="outline" className="w-full justify-center" onClick={toggleTheme}>
          {theme === 'light' ? <Moon className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0" /> : <Sun className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0" />}
          {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        </Button>
        {!authLoading && (
          user ? (
            <Button variant="outline" className="w-full justify-start text-left" onClick={handleLogout}>
              <LogOut className="mr-2 rtl:ml-2 rtl:mr-0 h-5 w-5" />
              Logout
            </Button>
          ) : (
            <LoginWithGoogleButton />
          )
        )}
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
          <div className="w-10 h-10">
             {/* Placeholder for mobile theme toggle or other actions if needed */}
          </div>
        </header>

        <main className="flex-grow p-4 md:p-6 overflow-y-auto">
          {/* Conditionally render children based on auth state if needed, or protect routes */}
          {authLoading ? (
            <div className="flex justify-center items-center h-full">
              <p>Loading user...</p> {/* Replace with a proper spinner/loader */}
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
