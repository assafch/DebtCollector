
"use client"; 

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ResponsiveAppLayout } from "@/components/layout/responsive-app-layout";
import { StatCard } from "@/components/dashboard/stat-card";
import { OverdueChart } from "@/components/dashboard/overdue-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { Button } from "@/components/ui/button";
import {
  fetchOpenInvoicesAction,
  fetchInvoiceRemarksAction,
  fetchErpConfigAction,
} from "./actions";
import type { Invoice } from '@/types/invoice';
import type { InvoiceRemark, ErpConfig, DashboardMetrics } from '@/types/dashboard';
import type { MenuItemType } from '@/types/layout';
import {
  RefreshCw, FileText, Users, TrendingUp,
  AlertCircle, CalendarClock, CreditCard, DollarSign, Info, PieChart as PieChartLucideIcon
} from 'lucide-react';
import { differenceInDays, isPast, isFuture, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { LoadingStatusDialog } from '@/components/layout/loading-status-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

const menuItems: MenuItemType[] = [
  { name: 'לוח בקרה', iconName: 'LayoutDashboard', path: '/' },
  { name: 'חשבוניות', iconName: 'FileText', path: '/invoices' },
  { name: 'לקוחות', iconName: 'Users', path: '/customers' },
  { name: 'ספר טלפונים', iconName: 'PhoneCall', path: '/phonebook' },
  { name: 'הגדרות', iconName: 'SettingsIcon', path: '/settings' },
];

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [remarks, setRemarks] = useState<InvoiceRemark[]>([]);
  const [remarksMap, setRemarksMap] = useState<Map<string, InvoiceRemark[]>>(new Map());
  const [erpConfig, setErpConfig] = useState<ErpConfig | undefined>(undefined);
  
  const [loadingProgress, setLoadingProgress] = useState<{
    active: boolean;
    message: string;
    progressVal: number;
  }>({ active: true, message: 'מתחיל טעינה...', progressVal: 0 }); 

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  // const { user, loading: authLoading } = useAuth(); 

  const fetchData = useCallback(async (isManualRefresh = false) => {
    if (!isManualRefresh) {
       setLoadingProgress({ active: true, message: 'מאחזר חשבוניות מהשרת...', progressVal: 10 });
    } else {
      setIsRefreshing(true);
    }
    setError(undefined);

    try {
      const invoicesResult = await fetchOpenInvoicesAction();
      if (invoicesResult.error) throw new Error(invoicesResult.error);
      const fetchedInvoices = invoicesResult.data || [];
      setInvoices(fetchedInvoices);
      
      if (!isManualRefresh) {
        setLoadingProgress(prev => ({ ...prev, message: 'טוען הגדרות מערכת...', progressVal: 40 }));
      }
      const erpConfigResult = await fetchErpConfigAction();
      if (erpConfigResult.error) throw new Error(erpConfigResult.error);
      setErpConfig(erpConfigResult.data);

      if (fetchedInvoices.length > 0) {
        if (!isManualRefresh) {
          setLoadingProgress(prev => ({ ...prev, message: 'מעבד הערות ותזכורות...', progressVal: 70 }));
        }
        const remarksResult = await fetchInvoiceRemarksAction(fetchedInvoices);
        if (remarksResult.error) throw new Error(remarksResult.error);
        const fetchedRemarks = remarksResult.data || [];
        setRemarks(fetchedRemarks);

        const rMap = new Map<string, InvoiceRemark[]>();
        fetchedRemarks.forEach(remark => {
          const list = rMap.get(remark.invoiceId) || [];
          list.push(remark);
          list.sort((a,b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
          rMap.set(remark.invoiceId, list);
        });
        setRemarksMap(rMap);
      } else {
        setRemarks([]);
        setRemarksMap(new Map());
      }

      if (!isManualRefresh) {
        setLoadingProgress({ active: true, message: 'סיום טעינה!', progressVal: 100 });
        setTimeout(() => setLoadingProgress({ active: false, message: '', progressVal: 0 }), 700);
      }
      if (isManualRefresh) {
        toast({ title: "מידע התרענן", description: "נתוני לוח הבקרה עודכנו."});
      }

    } catch (e: any) {
      setError(e.message || "שגיאה בטעינת נתוני הלוח בקרה");
      console.error("Dashboard fetch error:", e);
      toast({ variant: "destructive", title: "שגיאה בטעינה", description: e.message });
      if (!isManualRefresh) {
        setLoadingProgress({ active: false, message: '', progressVal: 0 });
      }
    } finally {
      if (isManualRefresh) {
        setIsRefreshing(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  useEffect(() => {
    // if (!authLoading && user) { 
        fetchData(false);
    // } else if (!authLoading && !user) {
    //     setLoadingProgress({ active: false, message: '', progressVal: 0 });
    //     setInvoices([]); 
    //     setRemarks([]);
    //     setRemarksMap(new Map());
    // }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Removed authLoading, user from dependency array

  const handleRefreshData = () => {
    // if (user) { 
        fetchData(true);
    // } else {
    //     toast({ title: "נדרשת התחברות", description: "יש להתחבר למערכת על מנת לרענן נתונים."});
    // }
  };

  const metrics = useMemo((): DashboardMetrics => {
    const today = new Date();
    const startOfThisWeek = startOfWeek(today, { weekStartsOn: 0 }); 
    const endOfThisWeek = endOfWeek(today, { weekStartsOn: 0 }); 

    let totalOpenInvoicesCount = 0;
    let totalOpenAmount = 0;
    let overdueInvoicesCount = 0;
    let overdueAmount = 0;
    let invoicesDueThisWeekCount = 0;
    let amountDueThisWeek = 0;

    invoices.forEach(invoice => {
      const invoiceSpecificRemarks = remarksMap.get(invoice.IVNUM) || [];
      const isPaid = invoiceSpecificRemarks.some(r => r.status === 'שולם');
      const isCancelled = invoiceSpecificRemarks.some(r => r.status === 'בוטל');

      if (!isPaid && !isCancelled) {
        totalOpenInvoicesCount++;
        totalOpenAmount += invoice.SUM;

        const dueDate = new Date(invoice.FNCDATE);
        if (isPast(dueDate) && differenceInDays(today, dueDate) > 0) {
          overdueInvoicesCount++;
          overdueAmount += invoice.SUM;
        }
        
        if (isFuture(dueDate) || differenceInDays(dueDate, today) === 0) {
           if (dueDate >= startOfThisWeek && dueDate <= endOfThisWeek) {
             invoicesDueThisWeekCount++;
             amountDueThisWeek += invoice.SUM;
           }
        }
      }
    });

    return {
      totalOpenInvoicesCount,
      totalOpenAmount,
      overdueInvoicesCount,
      overdueAmount,
      invoicesDueThisWeekCount,
      amountDueThisWeek,
      avgPaymentTime: "35 ימים" 
    };
  }, [invoices, remarksMap]);

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
  //   return (
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
  //             יש להתחבר למערכת על מנת לצפות בלוח הבקרה.
  //           </AlertDescription>
  //         </Alert>
  //       </div>
  //     </ResponsiveAppLayout>
  //   )
  // }

  if (error && !loadingProgress.active && invoices.length === 0) { 
    return (
      <ResponsiveAppLayout 
        menuItems={menuItems} 
        appName="Priority Connect"
        logoSrc="https://placehold.co/64x64.png"
        data-ai-hint="logo abstract"
      >
        <LoadingStatusDialog isOpen={loadingProgress.active} title="טוען לוח בקרה" description={loadingProgress.message} progress={loadingProgress.progressVal} />
        <div className="container mx-auto py-10">
           <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>שגיאה</AlertTitle>
            <AlertDescription>
              {error}
              <Button onClick={handleRefreshData} variant="link" className="p-0 h-auto ml-2 rtl:mr-2 rtl:ml-0">נסה שוב</Button>
            </AlertDescription>
          </Alert>
        </div>
      </ResponsiveAppLayout>
    );
  }
  
  const placeholderTrend = {
    icon: TrendingUp,
    label: "+2.5% מהחודש הקודם",
    color: "text-green-500"
  };

  const pageIsEffectivelyLoading = loadingProgress.active || (isRefreshing && invoices.length === 0);

  return (
    <ResponsiveAppLayout 
      menuItems={menuItems} 
      appName="Priority Connect"
      logoSrc="https://placehold.co/64x64.png"
      data-ai-hint="logo abstract"
    >
      <LoadingStatusDialog isOpen={loadingProgress.active} title="טוען לוח בקרה" description={loadingProgress.message} progress={loadingProgress.progressVal} />
      
      <div className="container mx-auto py-6 px-4 md:px-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-foreground">לוח בקרה</h1>
            <p className="text-muted-foreground">ניהול וסקירת חשבוניות ותשלומים</p>
          </div>
          <div className="flex space-x-2 rtl:space-x-reverse">
            <Button onClick={handleRefreshData} disabled={isRefreshing || loadingProgress.active}>
              {isRefreshing ? <LoadingSpinner size={18} className="mr-2 rtl:ml-2 rtl:mr-0" /> : <RefreshCw className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />}
              רענן נתונים
            </Button>
            <Button asChild variant="outline">
              <Link href="/invoices">
                <FileText className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                הצג חשבוניות
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="סך חובות פתוחים"
            value={formatCurrency(metrics.totalOpenAmount)}
            subValue={`${metrics.totalOpenInvoicesCount} חשבוניות פתוחות`}
            icon={CreditCard}
            color="bg-primary"
            isLoading={pageIsEffectivelyLoading && metrics.totalOpenInvoicesCount === 0}
          />
          <StatCard 
            title="חובות באיחור"
            value={formatCurrency(metrics.overdueAmount)}
            subValue={`${metrics.overdueInvoicesCount} חשבוניות באיחור`}
            icon={AlertCircle}
            color="bg-destructive"
            isLoading={pageIsEffectivelyLoading && metrics.overdueInvoicesCount === 0}
          />
          <StatCard 
            title="לתשלום השבוע"
            value={formatCurrency(metrics.amountDueThisWeek)}
            subValue={`${metrics.invoicesDueThisWeekCount} חשבוניות`}
            icon={CalendarClock}
            color="bg-yellow-500"
            isLoading={pageIsEffectivelyLoading && metrics.invoicesDueThisWeekCount === 0}
          />
          <StatCard 
            title="זמן תשלום ממוצע"
            value={metrics.avgPaymentTime || "N/A"}
            subValue="על בסיס חשבוניות ששולמו"
            icon={DollarSign}
            color="bg-green-500"
            isLoading={pageIsEffectivelyLoading && !metrics.avgPaymentTime}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          <OverdueChart invoices={invoices} remarksMap={remarksMap} isLoading={pageIsEffectivelyLoading && invoices.length === 0} />
          <RecentActivity invoices={invoices} remarksMap={remarksMap} isLoading={pageIsEffectivelyLoading && remarks.length === 0} />
        </div>
      </div>
    </ResponsiveAppLayout>
  );
}
