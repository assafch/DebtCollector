
"use client"; 

import React, { useState, useEffect, useCallback } from 'react';
import { ResponsiveAppLayout } from "@/components/layout/responsive-app-layout";
import { InvoiceDashboard } from "@/components/invoices/invoice-dashboard";
import { 
  fetchOpenInvoicesAction, 
  fetchInvoiceRemarksAction,
  updateInvoiceRemarkAction 
} from "../actions";
import type { MenuItemType } from '@/types/layout';
import type { Invoice } from '@/types/invoice';
import type { InvoiceRemark } from '@/types/dashboard';
import { useToast } from "@/hooks/use-toast";
import { formatISO } from 'date-fns';
import { LoadingStatusDialog } from '@/components/layout/loading-status-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext'; 
import { LoadingSpinner } from '@/components/ui/loading-spinner';

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
  }>({ active: true, message: 'מתחיל טעינה...', progressVal: 0 }); 

  const [pageError, setPageError] = useState<string | undefined>(undefined);
  const [updatingRemarks, setUpdatingRemarks] = useState<Set<string>>(new Set());

  const { toast } = useToast();
  // const { user, loading: authLoading } = useAuth(); 

  const loadInitialData = useCallback(async (isManualRefresh = false) => {
    if (!isManualRefresh) {
      setLoadingProgress({ active: true, message: 'טוען חשבוניות מהשרת...', progressVal: 10 });
    } else {
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
      const errorMessage = e.message || "שגיאה בטעינת נתוני חשבוניות.";
      setPageError(errorMessage);
      toast({
        variant: "destructive",
        title: "שגיאה בטעינה",
        description: errorMessage,
      });
      setLoadingProgress({ active: false, message: '', progressVal: 0 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  useEffect(() => {
    // if (!authLoading && user) { 
      loadInitialData(false);
    // } else if (!authLoading && !user) {
    //   setLoadingProgress({ active: false, message: '', progressVal: 0 });
    //   setInvoices([]); 
    //   setRemarksMap(new Map());
    // }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Removed authLoading, user from dependency array

  const handleRefreshData = () => {
    // if (user) { 
      loadInitialData(true);
    // } else {
    //    toast({ title: "נדרשת התחברות", description: "יש להתחבר למערכת על מנת לרענן נתונים."});
    // }
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
  
  // if (authLoading) {
  //   return (
  //     <ResponsiveAppLayout 
  //       menuItems={menuItems} 
  //       appName="Priority Connect"
  //       logoSrc="https://placehold.co/64x64.png"
  //       data-ai-hint="logo abstract"
  //     >
  //       <div className="flex justify-center items-center h-screen">
  //         <LoadingSpinner size={48} />
  //         <p className="ml-4 rtl:mr-4">טוען נתוני משתמש...</p>
  //       </div>
  //     </ResponsiveAppLayout>
  //   );
  // }

  // if (!user) {
  //    return (
  //      <ResponsiveAppLayout 
  //       menuItems={menuItems} 
  //       appName="Priority Connect"
  //       logoSrc="https://placehold.co/64x64.png"
  //       data-ai-hint="logo abstract"
  //     >
  //       <div className="container mx-auto py-10 px-4 text-center">
  //          <Alert>
  //           <AlertCircle className="h-4 w-4" />
  //           <AlertTitle>נדרשת התחברות</AlertTitle>
  //           <AlertDescription>
  //             יש להתחבר למערכת על מנת לצפות בחשבוניות.
  //           </AlertDescription>
  //         </Alert>
  //       </div>
  //     </ResponsiveAppLayout>
  //   )
  // }

  const showContent = !pageError || invoices.length > 0;
  const isPageLoading = loadingProgress.active || (!pageError && invoices.length === 0 && !loadingProgress.active);


  return (
    <ResponsiveAppLayout 
      menuItems={menuItems} 
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
          isLoading={isPageLoading} 
        />
      )}
      {!showContent && pageError && ( 
         <div className="container mx-auto py-10 px-4">
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
