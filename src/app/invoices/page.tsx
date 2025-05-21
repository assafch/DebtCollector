
"use client"; 

import React, { useState, useEffect, useCallback } from 'react';
import { ResponsiveAppLayout } from "@/components/layout/responsive-app-layout";
import { InvoiceDashboard } from "@/components/invoices/invoice-dashboard";
import { 
  fetchOpenInvoicesAction, 
  handleLogoutAction,
  fetchInvoiceRemarksAction,
  updateInvoiceRemarkAction 
} from "../actions";
import type { Metadata } from 'next';
import type { MenuItemType } from '@/types/layout';
import type { Invoice } from '@/types/invoice';
import type { InvoiceRemark } from '@/types/dashboard';
import { useToast } from "@/hooks/use-toast";
import { formatISO } from 'date-fns';

// export const metadata: Metadata = { // Metadata should be defined in Server Components or layout.tsx
//   title: 'Invoices | Priority Connect',
//   description: 'View, filter, and manage invoices and remarks.',
// };

const menuItems: MenuItemType[] = [
  { name: 'Dashboard', iconName: 'LayoutDashboard', path: '/' },
  { name: 'Invoices', iconName: 'FileText', path: '/invoices' },
  { name: 'Customers', iconName: 'Users', path: '/customers' },
  { name: 'Phonebook', iconName: 'PhoneCall', path: '/phonebook' },
  { name: 'Settings', iconName: 'SettingsIcon', path: '/settings' },
];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [remarksMap, setRemarksMap] = useState<Map<string, InvoiceRemark>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | undefined>(undefined);
  const [updatingRemarks, setUpdatingRemarks] = useState<Set<string>>(new Set()); // Tracks IVNUMs of remarks being updated

  const { toast } = useToast();

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setPageError(undefined);
    try {
      const invoicesResult = await fetchOpenInvoicesAction();
      if (invoicesResult.error) throw new Error(invoicesResult.error);
      const fetchedInvoices = invoicesResult.data || [];
      setInvoices(fetchedInvoices);

      if (fetchedInvoices.length > 0) {
        const remarksResult = await fetchInvoiceRemarksAction(fetchedInvoices);
        if (remarksResult.error) throw new Error(remarksResult.error);
        
        const newRemarksMap = new Map<string, InvoiceRemark>();
        (remarksResult.data || []).forEach(remark => {
          newRemarksMap.set(remark.invoiceId, remark);
        });
        setRemarksMap(newRemarksMap);
      } else {
        setRemarksMap(new Map());
      }

    } catch (e: any) {
      console.error("Error loading invoices page data:", e);
      setPageError(e.message || "Failed to load invoice data.");
      toast({
        variant: "destructive",
        title: "Error loading data",
        description: e.message || "Could not fetch invoice details.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleRefreshData = () => {
    loadInitialData();
  };

  const handleUpdateRemark = useCallback(async (invoiceId: string, updates: Partial<Omit<InvoiceRemark, 'id' | 'invoiceId'>>) => {
    setUpdatingRemarks(prev => new Set(prev).add(invoiceId));
    
    const currentRemark = remarksMap.get(invoiceId);
    const remarkToUpdate: InvoiceRemark = {
      id: currentRemark?.id || invoiceId, // Use existing ID or IVNUM if new
      invoiceId: invoiceId,
      status: currentRemark?.status || 'לא שולם',
      createdAt: currentRemark?.createdAt || formatISO(new Date()),
      text: currentRemark?.text,
      status_date: currentRemark?.status_date || formatISO(new Date()), // Ensure status_date is set
      ...updates,
    };

    // Optimistic update
    const newRemarksMap = new Map(remarksMap);
    newRemarksMap.set(invoiceId, remarkToUpdate);
    setRemarksMap(newRemarksMap);

    try {
      const result = await updateInvoiceRemarkAction(invoiceId, remarkToUpdate);
      if (result.error || !result.data) {
        throw new Error(result.error || "Failed to save remark.");
      }
      // Update with confirmed data from server (if different, e.g., new ID or server-generated fields)
      setRemarksMap(prevMap => {
        const confirmedMap = new Map(prevMap);
        confirmedMap.set(invoiceId, result.data!);
        return confirmedMap;
      });
      toast({
        title: "הערה עודכנה",
        description: `ההערה לחשבונית ${invoiceId} נשמרה בהצלחה.`,
      });
    } catch (e: any) {
      // Revert optimistic update on error
      setRemarksMap(prevMap => {
        const revertedMap = new Map(prevMap);
        if (currentRemark) {
          revertedMap.set(invoiceId, currentRemark);
        } else {
          // If it was a new remark that failed to save, consider removing it or marking as error
          // For simplicity, we revert to the an empty-ish default or remove if this was an "ensure" case
           const defaultRemark: InvoiceRemark = {
            id: invoiceId, invoiceId, status: 'לא שולם', createdAt: formatISO(new Date()), status_date: formatISO(new Date())
          };
          revertedMap.set(invoiceId, defaultRemark);
        }
        return revertedMap;
      });
      toast({
        variant: "destructive",
        title: "שגיאה בעדכון",
        description: e.message || "לא ניתן היה לשמור את השינויים בהערה.",
      });
    } finally {
      setUpdatingRemarks(prev => {
        const newSet = new Set(prev);
        newSet.delete(invoiceId);
        return newSet;
      });
    }
  }, [remarksMap, toast]);
  
  return (
    <ResponsiveAppLayout 
      menuItems={menuItems} 
      onLogout={handleLogoutAction}
      appName="Priority Connect"
      logoSrc="https://placehold.co/64x64.png"
      data-ai-hint="logo abstract"
    >
      <InvoiceDashboard 
        initialInvoices={invoices} 
        remarksMap={remarksMap}
        onUpdateRemark={handleUpdateRemark}
        updatingRemarksIvs={updatingRemarks}
        error={pageError} 
        onRefreshData={handleRefreshData}
        isLoading={isLoading}
      />
    </ResponsiveAppLayout>
  );
}
