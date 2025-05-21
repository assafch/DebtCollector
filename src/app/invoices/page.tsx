
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
import type { MenuItemType } from '@/types/layout';
import type { Invoice } from '@/types/invoice';
import type { InvoiceRemark } from '@/types/dashboard';
import { useToast } from "@/hooks/use-toast";
import { formatISO } from 'date-fns';
import { LoadingStatusDialog } from '@/components/layout/loading-status-dialog';

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
  
  const [loadingProgress, setLoadingProgress] = useState<{
    active: boolean;
    message: string;
    progressVal: number;
  }>({ active: true, message: 'מתחיל טעינה...', progressVal: 0 }); // Start active

  const [pageError, setPageError] = useState<string | undefined>(undefined);
  const [updatingRemarks, setUpdatingRemarks] = useState<Set<string>>(new Set());

  const { toast } = useToast();

  const loadInitialData = useCallback(async (isManualRefresh = false) => {
    if (!isManualRefresh) {
      setLoadingProgress({ active: true, message: 'טוען חשבוניות מהשרת...', progressVal: 10 });
    } else {
      // For manual refresh, we might not want the full modal, but a smaller indicator.
      // For now, manual refresh will also use the modal if it's quick.
      // Or, we can set a flag here to show a different type of loading for refresh.
      setLoadingProgress({ active: true, message: 'מרענן נתונים...', progressVal: 10 });
    }
    setPageError(undefined);

    try {
      const invoicesResult = await fetchOpenInvoicesAction();
      if (invoicesResult.error) throw new Error(invoicesResult.error);
      const fetchedInvoices = invoicesResult.data || [];
      setInvoices(fetchedInvoices);

      if (!isManualRefresh) {
        setLoadingProgress(prev => ({ ...prev, message: 'מעבד הערות ותזכורות...', progressVal: 50 }));
      } else {
        setLoadingProgress(prev => ({ ...prev, message: 'מעדכן הערות...', progressVal: 50 }));
      }

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

      setLoadingProgress({ active: true, message: 'סיום טעינה!', progressVal: 100 });
      setTimeout(() => setLoadingProgress({ active: false, message: '', progressVal: 0 }), 700);
      
      if (isManualRefresh) {
        toast({ title: "מידע התרענן", description: "נתוני החשבוניות עודכנו."});
      }

    } catch (e: any) {
      console.error("Error loading invoices page data:", e);
      setPageError(e.message || "Failed to load invoice data.");
      toast({
        variant: "destructive",
        title: "Error loading data",
        description: e.message || "Could not fetch invoice details.",
      });
      setLoadingProgress({ active: false, message: '', progressVal: 0 });
    }
  }, [toast]);

  useEffect(() => {
    loadInitialData(false); // Initial fetch
  }, [loadInitialData]);

  const handleRefreshData = () => {
    loadInitialData(true); // Manual refresh
  };

  const handleUpdateRemark = useCallback(async (invoiceId: string, updates: Partial<Omit<InvoiceRemark, 'id' | 'invoiceId'>>) => {
    setUpdatingRemarks(prev => new Set(prev).add(invoiceId));
    
    const currentRemark = remarksMap.get(invoiceId);
    const remarkToUpdate: InvoiceRemark = {
      id: currentRemark?.id || invoiceId, 
      invoiceId: invoiceId,
      status: currentRemark?.status || 'לא שולם',
      createdAt: currentRemark?.createdAt || formatISO(new Date()),
      text: currentRemark?.text,
      status_date: currentRemark?.status_date || formatISO(new Date()),
      ...updates,
    };

    const newRemarksMap = new Map(remarksMap);
    newRemarksMap.set(invoiceId, remarkToUpdate);
    setRemarksMap(newRemarksMap);

    try {
      const result = await updateInvoiceRemarkAction(invoiceId, remarkToUpdate);
      if (result.error || !result.data) {
        throw new Error(result.error || "Failed to save remark.");
      }
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
      setRemarksMap(prevMap => {
        const revertedMap = new Map(prevMap);
        if (currentRemark) {
          revertedMap.set(invoiceId, currentRemark);
        } else {
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
  
  // Determine if the main content should be rendered or if the page is in an error state without data
  const showContent = !pageError || invoices.length > 0;
  // The page is effectively loading if the progress dialog is active OR if there's no error yet and no invoices loaded.
  const isPageLoading = loadingProgress.active || (!pageError && invoices.length === 0 && !loadingProgress.active);


  return (
    <ResponsiveAppLayout 
      menuItems={menuItems} 
      onLogout={handleLogoutAction}
      appName="Priority Connect"
      logoSrc="https://placehold.co/64x64.png"
      data-ai-hint="logo abstract"
    >
      <LoadingStatusDialog 
        isOpen={loadingProgress.active} 
        title="טוען נתוני חשבוניות" 
        description={loadingProgress.message} 
        progress={loadingProgress.progressVal} 
      />
      {showContent && (
        <InvoiceDashboard 
          initialInvoices={invoices} 
          remarksMap={remarksMap}
          onUpdateRemark={handleUpdateRemark}
          updatingRemarksIvs={updatingRemarks}
          error={pageError} 
          onRefreshData={handleRefreshData}
          isLoading={isPageLoading} // This isLoading is for the InvoiceDashboard's internal loading state (e.g. during filtering)
        />
      )}
      {!showContent && pageError && ( // Only show page-level error if content can't be displayed
         <div className="container mx-auto py-10">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>שגיאה בטעינת הדף</AlertTitle>
              <AlertDescription>
                {pageError}
                <Button onClick={handleRefreshData} variant="link" className="p-0 h-auto ml-2 rtl:mr-2 rtl:ml-0">נסה שוב</Button>
              </AlertDescription>
            </Alert>
        </div>
      )}
    </ResponsiveAppLayout>
  );
}
