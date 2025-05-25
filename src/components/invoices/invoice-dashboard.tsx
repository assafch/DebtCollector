
"use client";

import type { Invoice } from "@/types/invoice";
import type { InvoiceRemark, PaymentStatus } from "@/types/dashboard"; // Added PaymentStatus
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { InvoiceFiltersBar, type Filters } from "./invoice-filters-bar";
import { InvoiceDataTable } from "./invoice-data-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCw, Terminal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface InvoiceDashboardProps {
  initialInvoices: Invoice[];
  remarksMap: Map<string, InvoiceRemark>;
  onUpdateRemark: (invoiceId: string, updates: Partial<InvoiceRemark>) => Promise<void>;
  updatingRemarksIvs: Set<string>;
  error?: string;
  onRefreshData: () => void;
  isLoading: boolean; // page level loading
}

const initialFiltersState: Filters = {
  customerName: "",
  invoiceNumber: "",
  startDate: undefined,
  endDate: undefined,
};

export function InvoiceDashboard({ 
  initialInvoices, 
  remarksMap,
  onUpdateRemark,
  updatingRemarksIvs,
  error: initialError, 
  onRefreshData,
  isLoading: isPageLoading 
}: InvoiceDashboardProps) {
  const [allInvoices, setAllInvoices] = useState<Invoice[]>(initialInvoices || []);
  const [filters, setFilters] = useState<Filters>(initialFiltersState);
  const [isProcessing, setIsProcessing] = useState<boolean>(false); // For filter/sort processing
  const [error, setError] = useState<string | undefined>(initialError);
  const { toast } = useToast();

  useEffect(() => {
    setAllInvoices(initialInvoices || []);
  }, [initialInvoices]);

  const [sortConfig, setSortConfig] = useState<{ key: keyof Invoice | string | null; direction: 'asc' | 'desc' }>({
    key: 'ACCDES', // Default sort by customer name for grouping
    direction: 'asc',
  });

  useEffect(() => {
    if (initialError) {
      setError(initialError); 
      toast({
        variant: "destructive",
        title: "Error loading invoices",
        description: initialError,
      });
    } else {
      setError(undefined); 
    }
  }, [initialError, toast]);

  const handleFilterChange = useCallback((newFilters: Filters) => {
    setIsProcessing(true);
    setFilters(newFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setIsProcessing(true);
    setFilters(initialFiltersState);
    setSortConfig({ key: 'ACCDES', direction: 'asc' }); 
  }, []);

  const handleSort = useCallback((keyToSort: keyof Invoice | string) => {
    setIsProcessing(true); 
    setSortConfig(currentSortConfig => {
      let direction: 'asc' | 'desc' = 'asc';
      if (currentSortConfig.key === keyToSort && currentSortConfig.direction === 'asc') {
        direction = 'desc';
      }
      return { key: keyToSort, direction };
    });
  }, []);

  const filteredInvoices = useMemo(() => {
    let invoicesToFilter = allInvoices;

    if (!Array.isArray(invoicesToFilter)) {
        invoicesToFilter = []; 
    }

    if (filters.customerName) {
      const searchTerm = filters.customerName.toLowerCase();
      invoicesToFilter = invoicesToFilter.filter(
        (invoice) =>
          (invoice.ACCNAME && invoice.ACCNAME.toLowerCase().includes(searchTerm)) ||
          (invoice.ACCDES && invoice.ACCDES.toLowerCase().includes(searchTerm))
      );
    }

    if (filters.invoiceNumber) {
      const searchTerm = filters.invoiceNumber.toLowerCase();
      invoicesToFilter = invoicesToFilter.filter((invoice) =>
        invoice.IVNUM && invoice.IVNUM.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.startDate) {
      const startDateWithoutTime = new Date(filters.startDate.setHours(0,0,0,0));
      invoicesToFilter = invoicesToFilter.filter((invoice) => {
        try {
          const invoiceDateStr = invoice.CURDATE?.split("T")[0];
          if (!invoiceDateStr) return false;
          const invoiceCurDate = new Date(invoiceDateStr);
          return !isNaN(invoiceCurDate.getTime()) && invoiceCurDate >= startDateWithoutTime;
        } catch { 
          return false; 
        }
      });
    }
    
    if (filters.endDate) {
      const endDateWithoutTime = new Date(filters.endDate.setHours(23,59,59,999));
      invoicesToFilter = invoicesToFilter.filter((invoice) => {
        try {
          const invoiceDateStr = invoice.CURDATE?.split("T")[0];
          if (!invoiceDateStr) return false;
          const invoiceCurDate = new Date(invoiceDateStr);
          return !isNaN(invoiceCurDate.getTime()) && invoiceCurDate <= endDateWithoutTime;
        } catch { 
          return false; 
        }
      });
    }
    
    return invoicesToFilter;
  }, [allInvoices, filters]);

  const sortedAndGroupedInvoices = useMemo(() => {
    if (!sortConfig.key) {
      return filteredInvoices;
    }

    const sortableInvoices = [...filteredInvoices];

    sortableInvoices.sort((a, b) => {
      let comparison = 0;
      
      // Primary sort: always by Customer Name (ACCDES) for grouping, unless sorting by ACCDES/ACCNAME itself
      if (sortConfig.key !== 'ACCDES' && sortConfig.key !== 'ACCNAME') {
        const customerA = a.ACCDES || '';
        const customerB = b.ACCDES || '';
        comparison = customerA.localeCompare(customerB, 'he', { sensitivity: 'base' });
        if (comparison !== 0) {
          return sortConfig.direction === 'asc' ? comparison : -comparison; // Early return if customer names differ for primary group sort
        }
      }
      
      // Secondary sort (or primary if by customer field)
      let aValue: any;
      let bValue: any;

      if (sortConfig.key === 'payment_status') {
        const remarkA = remarksMap.get(a.IVNUM);
        const remarkB = remarksMap.get(b.IVNUM);
        aValue = remarkA?.status || 'לא שולם';
        bValue = remarkB?.status || 'לא שולם';
      } else if (sortConfig.key === 'status_date') {
        const remarkA = remarksMap.get(a.IVNUM);
        const remarkB = remarksMap.get(b.IVNUM);
        aValue = remarkA?.status_date ? new Date(remarkA.status_date).getTime() : 0;
        bValue = remarkB?.status_date ? new Date(remarkB.status_date).getTime() : 0;
      } else if (sortConfig.key === 'follow_up_date') {
        const remarkA = remarksMap.get(a.IVNUM);
        const remarkB = remarksMap.get(b.IVNUM);
        aValue = remarkA?.follow_up_date ? new Date(remarkA.follow_up_date).getTime() : 0;
        bValue = remarkB?.follow_up_date ? new Date(remarkB.follow_up_date).getTime() : 0;
      }
       else {
        aValue = a[sortConfig.key as keyof Invoice];
        bValue = b[sortConfig.key as keyof Invoice];
      }
      
      let secondaryComparison = 0;
      if (aValue === null || aValue === undefined) secondaryComparison = 1;
      else if (bValue === null || bValue === undefined) secondaryComparison = -1;
      else if (typeof aValue === 'number' && typeof bValue === 'number') {
        secondaryComparison = aValue - bValue;
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        if (sortConfig.key === 'CURDATE' || sortConfig.key === 'FNCDATE') {
          const dateA = new Date(aValue.split("T")[0] || 0).getTime();
          const dateB = new Date(bValue.split("T")[0] || 0).getTime();
          if (isNaN(dateA) && isNaN(dateB)) secondaryComparison = 0;
          else if (isNaN(dateA)) secondaryComparison = 1;
          else if (isNaN(dateB)) secondaryComparison = -1;
          else secondaryComparison = dateA - dateB;
        } else { 
          secondaryComparison = aValue.localeCompare(bValue, 'he', { sensitivity: 'base' });
        }
      } else {
        secondaryComparison = String(aValue).localeCompare(String(bValue), 'he', { sensitivity: 'base' });
      }
      
      // If primary sort by customer was already done and was equal, use secondary.
      // Or if sorting by customer field, this is the primary comparison.
      comparison = secondaryComparison;

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
    return sortableInvoices;
  }, [filteredInvoices, sortConfig, remarksMap]);
  
  useEffect(() => {
    if (isProcessing) {
      const timer = setTimeout(() => {
        setIsProcessing(false);
      }, 300); 
      return () => clearTimeout(timer);
    }
  }, [sortedAndGroupedInvoices, isProcessing]);


  if (isPageLoading && allInvoices.length === 0) { 
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size={48} />
      </div>
    );
  }
  
  if (error && (!allInvoices || allInvoices.length === 0)) {
    return (
      <Alert variant="destructive" className="mt-6">
        <Terminal className="h-4 w-4" />
        <AlertTitle>שגיאה בטעינת נתונים</AlertTitle>
        <AlertDescription>
          {error}
          <Button onClick={onRefreshData} variant="link" className="p-0 h-auto ml-2">נסה שוב</Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 py-6">
       <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">חשבוניות לקוח</h1>
        <Button onClick={onRefreshData} disabled={isPageLoading || isProcessing} variant="outline">
          {(isPageLoading && allInvoices.length === 0) || isProcessing ? <LoadingSpinner size={18} className="mr-2 rtl:ml-2 rtl:mr-0" /> : <RefreshCw className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />}
          רענן נתונים
        </Button>
      </div>
      <InvoiceFiltersBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        isLoading={isProcessing}
      />
      <InvoiceDataTable 
        invoices={sortedAndGroupedInvoices} 
        remarksMap={remarksMap}
        onUpdateRemark={onUpdateRemark}
        updatingRemarksIvs={updatingRemarksIvs}
        isLoading={isProcessing || (isPageLoading && allInvoices.length > 0)} 
        onSort={handleSort}
        sortKey={sortConfig.key}
        sortDirection={sortConfig.direction}
      />
    </div>
  );
}

