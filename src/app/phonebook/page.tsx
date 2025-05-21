
import { ResponsiveAppLayout } from "@/components/layout/responsive-app-layout";
import type { Metadata } from 'next';
import type { MenuItemType } from '@/types/layout';
import { handleLogoutAction } from "../actions";

export const metadata: Metadata = {
  title: 'Phonebook | Priority Connect',
  description: 'Access contact information.',
};

const menuItems: MenuItemType[] = [
  { name: 'Dashboard', iconName: 'LayoutDashboard', path: '/' },
  { name: 'Invoices', iconName: 'FileText', path: '/invoices' },
  { name: 'Customers', iconName: 'Users', path: '/customers' },
  { name: 'Phonebook', iconName: 'PhoneCall', path: '/phonebook' },
  { name: 'Settings', iconName: 'SettingsIcon', path: '/settings' },
];

export default function PhonebookPage() {
  return (
    <ResponsiveAppLayout 
      menuItems={menuItems} 
      onLogout={handleLogoutAction}
      appName="Priority Connect"
      logoSrc="https://placehold.co/64x64.png"
    >
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">Phonebook Page</h1>
        <p className="text-lg">This is placeholder content for the Phonebook page.</p>
        {/* Add phonebook-specific components and content here */}
      </div>
    </ResponsiveAppLayout>
  );
}
