
"use client"; // This page now heavily relies on client-side hooks and data processing

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
  handleLogoutAction
} from "./actions";
import type { Invoice } from '@/types/invoice';
import type { InvoiceRemark, ErpConfig, DashboardMetrics } from '@/types/dashboard';
import type { MenuItemType } from '@/types/layout';
import {
  RefreshCw, FileText, BarChart3, Users, TrendingUp, TrendingDown, AlertCircle,
  CalendarClock, CreditCard, DollarSign, ListChecks, PieChart as PieChartLucideIcon, Activity
} from 'lucide-react';
import { differenceInDays, isPast, isFuture, addDays, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

const menuItems: MenuItemType[] = [
  { name: 'Dashboard', iconName: 'LayoutDashboard', path: '/' },
  { name: 'Invoices', iconName: 'FileText', path: '/invoices' },
  { name: 'Customers', iconName: 'Users', path: '/customers' },
  { name: 'Phonebook', iconName: 'PhoneCall', path: '/phonebook' },
  { name: 'Settings', iconName: 'SettingsIcon', path: '/settings' },
];

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [remarks, setRemarks] = useState<InvoiceRemark[]>([]);
  const [remarksMap, setRemarksMap] = useState<Map<string, InvoiceRemark[]>>(new Map());
  const [erpConfig, setErpConfig] = useState<ErpConfig | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const fetchData = useCallback(async () => {
    setError(undefined);
    setIsLoading(true);

    try {
      const [invoicesResult, erpConfigResult] = await Promise.all([
        fetchOpenInvoicesAction(),
        fetchErpConfigAction()
      ]);

      if (invoicesResult.error) throw new Error(invoicesResult.error);
      if (erpConfigResult.error) throw new Error(erpConfigResult.error);
      
      const fetchedInvoices = invoicesResult.data || [];
      setInvoices(fetchedInvoices);
      setErpConfig(erpConfigResult.data);

      if (fetchedInvoices.length > 0) {
        const remarksResult = await fetchInvoiceRemarksAction(fetchedInvoices);
        if (remarksResult.error) throw new Error(remarksResult.error);
        const fetchedRemarks = remarksResult.data || [];
        setRemarks(fetchedRemarks);

        const rMap = new Map<string, InvoiceRemark[]>();
        fetchedRemarks.forEach(remark => {
          const list = rMap.get(remark.invoiceId) || [];
          list.push(remark);
          // Sort remarks for each invoice by date, most recent first
          list.sort((a,b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
          rMap.set(remark.invoiceId, list);
        });
        setRemarksMap(rMap);
      } else {
        setRemarks([]);
        setRemarksMap(new Map());
      }

    } catch (e: any) {
      setError(e.message || "שגיאה בטעינת נתוני הלוח בקרה");
      console.error("Dashboard fetch error:", e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefreshData = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const metrics = useMemo((): DashboardMetrics => {
    const today = new Date();
    const startOfThisWeek = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
    const endOfThisWeek = endOfWeek(today, { weekStartsOn: 0 }); // Saturday

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
        if (isPast(dueDate) && differenceInDays(today, dueDate) > 0) { // Ensure it's truly past, not today
          overdueInvoicesCount++;
          overdueAmount += invoice.SUM;
        }
        
        if (isFuture(dueDate) || differenceInDays(dueDate, today) === 0) { // Include today
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
      avgPaymentTime: "35 ימים" // Placeholder
    };
  }, [invoices, remarksMap]);

  if (error && !isLoading) {
    return (
      <ResponsiveAppLayout 
        menuItems={menuItems} 
        onLogout={handleLogoutAction}
        appName="Priority Connect"
        logoSrc="https://placehold.co/64x64.png"
        data-ai-hint="logo abstract"
      >
        <div className="container mx-auto py-10">
           <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>שגיאה</AlertTitle>
            <AlertDescription>
              {error}
              <Button onClick={handleRefreshData} variant="link" className="p-0 h-auto ml-2">נסה שוב</Button>
            </AlertDescription>
          </Alert>
        </div>
      </ResponsiveAppLayout>
    );
  }
  
  // Placeholder for trend data - replace with actual logic if available
  const placeholderTrend = {
    icon: TrendingUp,
    label: "+2.5% מהחודש הקודם",
    color: "text-green-500"
  };


  return (
    <ResponsiveAppLayout 
      menuItems={menuItems} 
      onLogout={handleLogoutAction}
      appName="Priority Connect"
      logoSrc="https://placehold.co/64x64.png"
      data-ai-hint="logo abstract"
    >
      <div className="container mx-auto py-6 px-4 md:px-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-foreground">לוח בקרה</h1>
            <p className="text-muted-foreground">ניהול וסקירת חשבוניות ותשלומים</p>
          </div>
          <div className="flex space-x-2 rtl:space-x-reverse">
            <Button onClick={handleRefreshData} disabled={isRefreshing || isLoading}>
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

        {/* Statistics Section */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="סך חובות פתוחים"
            value={formatCurrency(metrics.totalOpenAmount)}
            subValue={`${metrics.totalOpenInvoicesCount} חשבוניות פתוחות`}
            icon={CreditCard}
            color="bg-primary"
            isLoading={isLoading}
          />
          <StatCard 
            title="חובות באיחור"
            value={formatCurrency(metrics.overdueAmount)}
            subValue={`${metrics.overdueInvoicesCount} חשבוניות באיחור`}
            icon={AlertCircle}
            color="bg-destructive"
            isLoading={isLoading}
          />
          <StatCard 
            title="לתשלום השבוע"
            value={formatCurrency(metrics.amountDueThisWeek)}
            subValue={`${metrics.invoicesDueThisWeekCount} חשבוניות`}
            icon={CalendarClock}
            color="bg-yellow-500" // Example color
            isLoading={isLoading}
          />
          <StatCard 
            title="זמן תשלום ממוצע"
            value={metrics.avgPaymentTime || "N/A"}
            subValue="על בסיס חשבוניות ששולמו"
            icon={DollarSign} // Changed from BarChart3 for variety
            color="bg-green-500" // Example color
            isLoading={isLoading}
            // trend={placeholderTrend} // Example trend
          />
        </div>

        {/* Detailed Visualizations Section */}
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          <OverdueChart invoices={invoices} remarksMap={remarksMap} isLoading={isLoading}/>
          <RecentActivity invoices={invoices} remarksMap={remarksMap} isLoading={isLoading}/>
        </div>
      </div>
    </ResponsiveAppLayout>
  );
}
