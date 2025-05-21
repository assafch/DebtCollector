
"use client";

import type { Invoice } from "@/types/invoice";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { InvoiceFiltersBar, type Filters } from "./invoice-filters-bar";
import { InvoiceDataTable } from "./invoice-data-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InvoiceDashboardProps {
  initialInvoices: Invoice[];
  error?: string;
}

const initialFiltersState: Filters = {
  customerName: "",
  invoiceNumber: "",
  startDate: undefined,
  endDate: undefined,
};

export function InvoiceDashboard({ initialInvoices, error: initialError }: InvoiceDashboardProps) {
  const [allInvoices, setAllInvoices] = useState<Invoice[]>(initialInvoices || []);
  const [filters, setFilters] = useState<Filters>(initialFiltersState);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(initialError);
  const { toast } = useToast();

  const [sortConfig, setSortConfig] = useState<{ key: keyof Invoice | string | null; direction: 'asc' | 'desc' }>({
    key: 'ACCNAME', // Default sort column
    direction: 'asc',
  });

  useEffect(() => {
    if (initialError) {
      toast({
        variant: "destructive",
        title: "Error loading invoices",
        description: initialError,
      });
    }
  }, [initialError, toast]);

  const handleFilterChange = useCallback((newFilters: Filters) => {
    setIsLoading(true);
    setFilters(newFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setIsLoading(true);
    setFilters(initialFiltersState);
    setSortConfig({ key: 'ACCNAME', direction: 'asc' }); // Reset sort on clear
  }, []);

  const handleSort = useCallback((keyToSort: keyof Invoice | string) => {
    setIsLoading(true);
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

  const sortedAndFilteredInvoices = useMemo(() => {
    if (!sortConfig.key) {
      return filteredInvoices;
    }

    const sortableInvoices = [...filteredInvoices];

    sortableInvoices.sort((a, b) => {
      const aValue = a[sortConfig.key as keyof Invoice];
      const bValue = b[sortConfig.key as keyof Invoice];
      let comparison = 0;

      // Handle null or undefined values by pushing them to the end for asc, beginning for desc
      if (aValue === null || aValue === undefined) comparison = 1;
      else if (bValue === null || bValue === undefined) comparison = -1;
      else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        if (sortConfig.key === 'CURDATE' || sortConfig.key === 'FNCDATE') {
          const dateA = new Date(aValue.split("T")[0] || 0).getTime();
          const dateB = new Date(bValue.split("T")[0] || 0).getTime();
          if (isNaN(dateA) && isNaN(dateB)) comparison = 0;
          else if (isNaN(dateA)) comparison = 1; // Push NaN to end
          else if (isNaN(dateB)) comparison = -1; // Push NaN to end
          else comparison = dateA - dateB;
        } else {
          comparison = aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' });
        }
      } else {
        // Fallback for mixed types or other types
        comparison = String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: 'base' });
      }
      
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
    return sortableInvoices;
  }, [filteredInvoices, sortConfig]);
  
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [sortedAndFilteredInvoices, isLoading]);


  if (error && (!allInvoices || allInvoices.length === 0)) {
    return (
      <Alert variant="destructive" className="mt-6">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error Fetching Data</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 py-6">
      <InvoiceFiltersBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        isLoading={isLoading}
      />
      <InvoiceDataTable 
        invoices={sortedAndFilteredInvoices} 
        isLoading={isLoading}
        onSort={handleSort}
        sortKey={sortConfig.key}
        sortDirection={sortConfig.direction}
      />
    </div>
  );
}
