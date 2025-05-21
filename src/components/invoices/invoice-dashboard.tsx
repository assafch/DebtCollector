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
  const [allInvoices, setAllInvoices] = useState<Invoice[]>(initialInvoices);
  const [filters, setFilters] = useState<Filters>(initialFiltersState);
  const [isLoading, setIsLoading] = useState<boolean>(false); // For client-side operations if any become async
  const [error, setError] = useState<string | undefined>(initialError);
  const { toast } = useToast();

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
    setFilters(newFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(initialFiltersState);
  }, []);

  const filteredInvoices = useMemo(() => {
    setIsLoading(true); // Simulate loading for filter application
    let
     invoicesToFilter = allInvoices;

    if (filters.customerName) {
      const searchTerm = filters.customerName.toLowerCase();
      invoicesToFilter = invoicesToFilter.filter(
        (invoice) =>
          invoice.ACCNAME.toLowerCase().includes(searchTerm) ||
          invoice.ACCDES.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.invoiceNumber) {
      const searchTerm = filters.invoiceNumber.toLowerCase();
      invoicesToFilter = invoicesToFilter.filter((invoice) =>
        invoice.IVNUM.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.startDate) {
      const startDateWithoutTime = new Date(filters.startDate.setHours(0,0,0,0));
      invoicesToFilter = invoicesToFilter.filter((invoice) => {
        try {
          const invoiceCurDate = new Date(invoice.CURDATE.split("T")[0]);
          return invoiceCurDate >= startDateWithoutTime;
        } catch { return false; }
      });
    }
    
    if (filters.endDate) {
      const endDateWithoutTime = new Date(filters.endDate.setHours(23,59,59,999));
      invoicesToFilter = invoicesToFilter.filter((invoice) => {
        try {
          const invoiceCurDate = new Date(invoice.CURDATE.split("T")[0]);
          return invoiceCurDate <= endDateWithoutTime;
        } catch { return false; }
      });
    }
    
    // Simulate a short delay for filter application for UX
    // In a real app with very large datasets, this could be an actual async operation or debounced
    const timer = setTimeout(() => setIsLoading(false), 300); 
    // Clear timeout if component unmounts or dependencies change
    // This is a simple way to show transition. A more robust way might involve CSS transitions on table rows.
    return () => clearTimeout(timer);

    // setIsLoading(false); // Set loading false after filtering
    return invoicesToFilter;
  }, [allInvoices, filters]);
  
   // Effect to turn off loading after filteredInvoices is computed
  useEffect(() => {
    setIsLoading(false);
  }, [filteredInvoices]);


  if (error && !initialInvoices.length) {
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
      <InvoiceDataTable invoices={filteredInvoices} isLoading={isLoading} />
    </div>
  );
}
