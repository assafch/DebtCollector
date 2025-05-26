
"use client"; // Added "use client"

import { ResponsiveAppLayout } from "@/components/layout/responsive-app-layout";
import type { Metadata } from 'next';
import type { MenuItemType } from '@/types/layout';
// handleLogoutAction is no longer passed to ResponsiveAppLayout directly
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { LoadingSpinner } from '@/components/ui/loading-spinner'; // Import LoadingSpinner
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';


// export const metadata: Metadata = { // Metadata can't be used in client components directly
//   title: 'Settings | Priority Connect',
//   description: 'Configure application settings.',
// };

const menuItems: MenuItemType[] = [
  { name: 'Dashboard', iconName: 'LayoutDashboard', path: '/' },
  { name: 'Invoices', iconName: 'FileText', path: '/invoices' },
  { name: 'Customers', iconName: 'Users', path: '/customers' },
  { name: 'Phonebook', iconName: 'PhoneCall', path: '/phonebook' },
  { name: 'Settings', iconName: 'SettingsIcon', path: '/settings' },
];

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth(); // Get user and authLoading state
  
  if (authLoading) {
    return (
      <ResponsiveAppLayout 
        menuItems={menuItems} 
        appName="Priority Connect"
        logoSrc="https://placehold.co/64x64.png"
      >
        <div className="flex justify-center items-center h-screen">
          <LoadingSpinner size={48} />
          <p className="ml-4 rtl:mr-4">טוען נתוני משתמש...</p>
        </div>
      </ResponsiveAppLayout>
    );
  }

  if (!user) {
     return (
       <ResponsiveAppLayout 
        menuItems={menuItems} 
        appName="Priority Connect"
        logoSrc="https://placehold.co/64x64.png"
      >
        <div className="container mx-auto py-10 px-4 text-center">
           <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>נדרשת התחברות</AlertTitle>
            <AlertDescription>
              יש להתחבר למערכת על מנת לגשת להגדרות.
            </AlertDescription>
          </Alert>
        </div>
      </ResponsiveAppLayout>
    )
  }

  return (
    <ResponsiveAppLayout 
      menuItems={menuItems} 
      appName="Priority Connect"
      logoSrc="https://placehold.co/64x64.png"
    >
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">Settings Page</h1>
        <p className="text-lg">This is placeholder content for the Settings page.</p>
        {/* Add settings-specific components and content here */}
      </div>
    </ResponsiveAppLayout>
  );
}
