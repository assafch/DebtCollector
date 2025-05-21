
import { ResponsiveAppLayout } from "@/components/layout/responsive-app-layout";
import { InvoiceDashboard } from "@/components/invoices/invoice-dashboard";
import { fetchOpenInvoicesAction, handleLogoutAction } from "../actions"; // Import actions
import type { Metadata } from 'next';
import type { MenuItemType } from '@/types/layout';

export const metadata: Metadata = {
  title: 'Invoices | Priority Connect',
  description: 'View and filter open invoices from the Priority API.',
};

const menuItems: MenuItemType[] = [
  { name: 'Dashboard', iconName: 'LayoutDashboard', path: '/' },
  { name: 'Invoices', iconName: 'FileText', path: '/invoices' },
  { name: 'Customers', iconName: 'Users', path: '/customers' },
  { name: 'Phonebook', iconName: 'PhoneCall', path: '/phonebook' },
  { name: 'Settings', iconName: 'SettingsIcon', path: '/settings' },
];

export default async function InvoicesPage() {
  const { data: initialInvoices, error } = await fetchOpenInvoicesAction();

  return (
    <ResponsiveAppLayout 
      menuItems={menuItems} 
      onLogout={handleLogoutAction}
      appName="Priority Connect"
      logoSrc="https://placehold.co/64x64.png"
    >
      <InvoiceDashboard initialInvoices={initialInvoices || []} error={error} />
    </ResponsiveAppLayout>
  );
}
