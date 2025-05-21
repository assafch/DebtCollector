import { AppHeader } from "@/components/layout/app-header";
import { InvoiceDashboard } from "@/components/invoices/invoice-dashboard";
import { fetchOpenInvoicesAction } from "./actions";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Invoice Viewer | Priority Connect',
  description: 'View and filter open invoices from the Priority API.',
};

export default async function HomePage() {
  const { data: initialInvoices, error } = await fetchOpenInvoicesAction();

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4">
        <InvoiceDashboard initialInvoices={initialInvoices || []} error={error} />
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} Priority Connect Viewer. All rights reserved.
      </footer>
    </div>
  );
}
