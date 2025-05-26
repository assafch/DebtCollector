
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { AlertCircle, CreditCard, Mail, MapPin, Phone, RefreshCw, Search, User, Users, Calendar as CalendarIconLucide } from 'lucide-react';
import { ResponsiveAppLayout } from "@/components/layout/responsive-app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { 
  fetchCustomersAction, 
  fetchOpenInvoicesAction, 
  fetchInvoiceRemarksAction,
} from "../actions";
import type { Customer, CustomerStats, FetchCustomersResult } from "@/types/customer";
import type { Invoice } from '@/types/invoice';
import type { InvoiceRemark, PaymentStatus } from '@/types/dashboard';
import { PAYMENT_STATUS_OPTIONS } from '@/types/dashboard';
import { cn, formatDateString, formatCurrency } from "@/lib/utils";
import type { MenuItemType } from '@/types/layout';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';

const menuItems: MenuItemType[] = [
  { name: 'Dashboard', iconName: 'LayoutDashboard', path: '/' },
  { name: 'Invoices', iconName: 'FileText', path: '/invoices' },
  { name: 'Customers', iconName: 'Users', path: '/customers' },
  { name: 'Phonebook', iconName: 'PhoneCall', path: '/phonebook' },
  { name: 'Settings', iconName: 'SettingsIcon', path: '/settings' },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [remarksMap, setRemarksMap] = useState<Map<string, InvoiceRemark>>(new Map());
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(true); 
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  // const { user, loading: authLoading } = useAuth(); 

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const customerResult = await fetchCustomersAction();
      if (customerResult.error) throw new Error(`Customer Data: ${customerResult.error}`);
      setCustomers(customerResult.data || []);

      const invoiceResult = await fetchOpenInvoicesAction();
      if (invoiceResult.error) throw new Error(`Invoice Data: ${invoiceResult.error}`);
      const fetchedInvoices = invoiceResult.data || [];
      setAllInvoices(fetchedInvoices);
      
      if (fetchedInvoices.length > 0) {
          const remarksResult = await fetchInvoiceRemarksAction(fetchedInvoices);
          if (remarksResult.error) throw new Error(`Remarks Data: ${remarksResult.error}`);
          const newRemarksMap = new Map<string, InvoiceRemark>();
          (remarksResult.data || []).forEach(remark => {
              newRemarksMap.set(remark.invoiceId, remark);
          });
          setRemarksMap(newRemarksMap);
      } else {
          setRemarksMap(new Map());
      }

      if (isManualRefresh) {
        toast({ title: "מידע התרענן", description: "נתוני הלקוחות והחשבוניות עודכנו." });
      }
    } catch (err: any) {
      const errorMessage = err.message || 'שגיאה בטעינת נתוני לקוחות.';
      setError(errorMessage);
      toast({ variant: "destructive", title: "שגיאה בטעינה", description: errorMessage });
    } finally {
      setIsLoading(false);
      if (isManualRefresh) {
        setIsRefreshing(false);
      }
    }
  }, [toast]);

  useEffect(() => {
    // if (!authLoading && user) { 
        loadData(false);
    // } else if (!authLoading && !user) {
    //     setIsLoading(false);
    //     setCustomers([]); 
    //     setAllInvoices([]);
    //     setRemarksMap(new Map());
    // }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Removed authLoading, user from dependency array

  const handleRefreshData = () => {
    // if (user) { 
        loadData(true);
    // } else {
    //     toast({ title: "נדרשת התחברות", description: "יש להתחבר למערכת על מנת לרענן נתונים."});
    // }
  };

  const getCustomerStats = useCallback((
    customerName: string, 
    invoicesToList: Invoice[], 
    currentRemarksMap: Map<string, InvoiceRemark>
  ): CustomerStats => {
    const customerInvoices = invoicesToList.filter(inv => inv.ACCDES === customerName);
    let unpaidInvoices = 0;
    let unpaidAmount = 0;
    let totalAmount = 0;

    customerInvoices.forEach(invoice => {
      totalAmount += invoice.SUM;
      const remark = currentRemarksMap.get(invoice.IVNUM);
      const status = remark?.status || 'לא שולם';
      if (status !== 'שולם' && status !== 'בוטל') {
        unpaidInvoices++;
        unpaidAmount += invoice.SUM;
      }
    });
    return { unpaidAmount, unpaidInvoices, totalAmount, totalInvoices: customerInvoices.length };
  }, []);

  const searchTermLower = searchTerm.toLowerCase();
  const filteredCustomers = useMemo(() => {
    if (!Array.isArray(customers)) return [];
    return customers
      .filter((customer) => {
        const nameMatch = customer.name?.toLowerCase().includes(searchTermLower);
        const idMatch = customer.customer_id?.toLowerCase().includes(searchTermLower);
        return nameMatch || idMatch;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'he'));
  }, [customers, searchTermLower]);

  const selectedCustomerInvoices = useMemo(() => {
    if (!selectedCustomer || !Array.isArray(allInvoices)) return [];
    return allInvoices
      .filter(invoice => invoice.ACCDES === selectedCustomer.name)
      .sort((a, b) => new Date(b.CURDATE).getTime() - new Date(a.CURDATE).getTime());
  }, [selectedCustomer, allInvoices]);

  const getPaymentStatusVariant = (status: PaymentStatus | undefined): "default" | "secondary" | "destructive" | "outline" => {
    const option = PAYMENT_STATUS_OPTIONS.find(opt => opt.value === status);
    return option ? option.badgeVariant : 'secondary';
  };
  
  // if (authLoading) {
  //   return (
  //     <ResponsiveAppLayout 
  //       menuItems={menuItems} 
  //       appName="Priority Connect"
  //       logoSrc="https://placehold.co/64x64.png"
  //       data-ai-hint="logo office"
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
  //       data-ai-hint="logo office"
  //     >
  //       <div className="container mx-auto py-10 px-4 text-center">
  //          <Alert>
  //           <AlertCircle className="h-4 w-4" />
  //           <AlertTitle>נדרשת התחברות</AlertTitle>
  //           <AlertDescription>
  //             יש להתחבר למערכת על מנת לצפות בנתוני לקוחות.
  //           </AlertDescription>
  //         </Alert>
  //       </div>
  //     </ResponsiveAppLayout>
  //   )
  // }

  if (isLoading && !customers.length && !isRefreshing) {
    return (
      <ResponsiveAppLayout 
        menuItems={menuItems} 
        appName="Priority Connect"
        logoSrc="https://placehold.co/64x64.png"
        data-ai-hint="logo office"
      >
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner size={48} />
        </div>
      </ResponsiveAppLayout>
    );
  }

  if (error && !customers.length && !isRefreshing) {
    return (
      <ResponsiveAppLayout 
        menuItems={menuItems} 
        appName="Priority Connect"
        logoSrc="https://placehold.co/64x64.png"
        data-ai-hint="logo office"
      >
        <div className="container mx-auto py-10 px-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>שגיאה בטעינת עמוד לקוחות</AlertTitle>
            <AlertDescription>
              {error}
              <Button onClick={handleRefreshData} variant="link" className="p-0 h-auto ml-2 rtl:mr-2 rtl:ml-0">נסה שוב</Button>
            </AlertDescription>
          </Alert>
        </div>
      </ResponsiveAppLayout>
    );
  }

  return (
    <ResponsiveAppLayout 
      menuItems={menuItems} 
      appName="Priority Connect"
      logoSrc="https://placehold.co/64x64.png"
      data-ai-hint="logo office"
    >
      <div className="container mx-auto py-6 px-4 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-foreground">לקוחות</h1>
            <p className="text-muted-foreground">ניהול לקוחות וצפייה בחובות לפי לקוח.</p>
          </div>
          <Button onClick={handleRefreshData} disabled={isLoading || isRefreshing}>
            {isRefreshing ? <LoadingSpinner size={18} className="mr-2 rtl:ml-2 rtl:mr-0" /> : <RefreshCw className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />}
            רענן נתונים
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Pane: Customer List & Search */}
          <Card className="lg:col-span-1 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">רשימת לקוחות</CardTitle>
              <CardDescription>בחר לקוח לצפייה בפרטים.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
                <Input
                  type="search"
                  placeholder="חפש לפי שם או מספר לקוח..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rtl:pr-10 rtl:pl-3 bg-background"
                  disabled={isLoading}
                />
              </div>
              <ScrollArea className="h-[550px] border rounded-md">
                <div className="p-2 space-y-1">
                  {isLoading && customers.length === 0 && !isRefreshing ? (
                    <div className="flex justify-center items-center h-full">
                       <LoadingSpinner/>
                    </div>
                  ) : filteredCustomers.length > 0 ? (
                    filteredCustomers.map(customer => {
                      const stats = getCustomerStats(customer.name, allInvoices, remarksMap);
                      return (
                        <Button
                          key={customer.id}
                          variant="ghost"
                          className={cn(
                            "w-full justify-start text-right p-3 h-auto flex flex-col items-start space-y-1",
                            selectedCustomer?.id === customer.id && "bg-muted hover:bg-muted"
                          )}
                          onClick={() => setSelectedCustomer(customer)}
                        >
                          <div className="flex justify-between w-full items-center">
                            <span className="font-semibold text-sm text-foreground">{customer.name}</span>
                            <Badge variant={stats.unpaidInvoices > 0 ? "destructive" : "default"} className="text-xs whitespace-nowrap">
                              {stats.unpaidInvoices} חשב. פתוחות
                            </Badge>
                          </div>
                          <div className="flex justify-between w-full text-xs text-muted-foreground">
                            <span>מזהה: {customer.customer_id}</span>
                            <span>חוב: {formatCurrency(stats.unpaidAmount)}</span>
                          </div>
                        </Button>
                      );
                    })
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      {searchTerm ? "לא נמצאו לקוחות התואמים לחיפוש." : "אין לקוחות להצגה."}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right Pane: Selected Customer Details & Invoices */}
          {selectedCustomer ? (
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">פרטי לקוח</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <div className="flex items-start"><User className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 mt-0.5 text-primary" /><span className="font-medium">שם לקוח:</span><span className="mr-1 rtl:ml-1 rtl:mr-0">{selectedCustomer.name || "-"}</span></div>
                  <div className="flex items-start"><CreditCard className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 mt-0.5 text-primary" /><span className="font-medium">מספר לקוח:</span><span className="mr-1 rtl:ml-1 rtl:mr-0">{selectedCustomer.customer_id || "-"}</span></div>
                  <div className="flex items-start"><Phone className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 mt-0.5 text-primary" /><span className="font-medium">טלפון:</span><span className="mr-1 rtl:ml-1 rtl:mr-0">{selectedCustomer.phone || "-"}</span></div>
                  <div className="flex items-start"><Mail className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 mt-0.5 text-primary" /><span className="font-medium">דוא"ל:</span><span className="mr-1 rtl:ml-1 rtl:mr-0">{selectedCustomer.email || "-"}</span></div>
                  <div className="flex items-start"><User className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 mt-0.5 text-primary" /><span className="font-medium">איש קשר:</span><span className="mr-1 rtl:ml-1 rtl:mr-0">{selectedCustomer.contact_person || "-"}</span></div>
                  <div className="flex items-start"><CalendarIconLucide className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 mt-0.5 text-primary" /><span className="font-medium">תנאי תשלום:</span><span className="mr-1 rtl:ml-1 rtl:mr-0">{selectedCustomer.payment_terms || "-"}</span></div>
                  <div className="flex items-start md:col-span-2"><MapPin className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 mt-0.5 text-primary" /><span className="font-medium">כתובת:</span><span className="mr-1 rtl:ml-1 rtl:mr-0">{selectedCustomer.address || "-"}</span></div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">חשבוניות פתוחות ({selectedCustomerInvoices.filter(inv => (remarksMap.get(inv.IVNUM)?.status || 'לא שולם') !== 'שולם').length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] border rounded-md">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow>
                          <TableHead className="text-right">מס׳ חשבונית</TableHead>
                          <TableHead className="text-right">תאריך</TableHead>
                          <TableHead className="text-right">לתשלום עד</TableHead>
                          <TableHead className="text-right">סכום</TableHead>
                          <TableHead className="text-right">סטטוס</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedCustomerInvoices.length > 0 ? (
                          selectedCustomerInvoices.map(invoice => {
                            const remark = remarksMap.get(invoice.IVNUM);
                            const status = remark?.status || 'לא שולם';
                            if (status === 'שולם' || status === 'בוטל') return null; 
                            return (
                              <TableRow key={invoice.IVNUM}>
                                <TableCell className="text-right">{invoice.IVNUM}</TableCell>
                                <TableCell className="text-right">{formatDateString(invoice.CURDATE)}</TableCell>
                                <TableCell className="text-right">{formatDateString(invoice.FNCDATE)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(invoice.SUM)}</TableCell>
                                <TableCell className="text-right">
                                  <Badge variant={getPaymentStatusVariant(status)} className="text-xs">
                                    {status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          }).filter(Boolean) 
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              אין חשבוניות פתוחות ללקוח זה.
                            </TableCell>
                          </TableRow>
                        )}
                         {selectedCustomerInvoices.length > 0 && selectedCustomerInvoices.filter(inv => (remarksMap.get(inv.IVNUM)?.status || 'לא שולם') !== 'שולם' && (remarksMap.get(inv.IVNUM)?.status || 'לא שולם') !== 'בוטל').length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                אין חשבוניות פתוחות ללקוח זה.
                                </TableCell>
                            </TableRow>
                        )}
                      </TableBody>
                      <TableCaption>
                        {selectedCustomerInvoices.filter(inv => (remarksMap.get(inv.IVNUM)?.status || 'לא שולם') !== 'שולם' && (remarksMap.get(inv.IVNUM)?.status || 'לא שולם') !== 'בוטל').length > 0 
                          ? `מציג ${selectedCustomerInvoices.filter(inv => (remarksMap.get(inv.IVNUM)?.status || 'לא שולם') !== 'שולם' && (remarksMap.get(inv.IVNUM)?.status || 'לא שולם') !== 'בוטל').length} חשבוניות פתוחות.`
                          : ""}
                      </TableCaption>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="lg:col-span-2 flex items-center justify-center h-full min-h-[300px] shadow-lg">
              <CardContent className="text-center p-6">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground">בחר לקוח מהרשימה להצגת הפרטים.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ResponsiveAppLayout>
  );
}
