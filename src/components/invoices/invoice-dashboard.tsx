
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
    setIsLoading(true); // Set loading true when filter operation starts
    setFilters(newFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setIsLoading(true); // Set loading true when clear operation starts
    setFilters(initialFiltersState);
  }, []);

  const filteredInvoices = useMemo(() => {
    // Filtering logic is pure; isLoading is handled by event handlers and useEffect
    let invoicesToFilter = allInvoices;

    if (!Array.isArray(invoicesToFilter)) {
        // This case should ideally not be hit if initialInvoices is always an array
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
          if (!invoiceDateStr) return false; // Skip if CURDATE is missing or invalid
          const invoiceCurDate = new Date(invoiceDateStr);
          // Check if date is valid before comparison
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
          if (!invoiceDateStr) return false; // Skip if CURDATE is missing or invalid
          const invoiceCurDate = new Date(invoiceDateStr);
          // Check if date is valid before comparison
          return !isNaN(invoiceCurDate.getTime()) && invoiceCurDate <= endDateWithoutTime;
        } catch { 
          return false; 
        }
      });
    }
    
    return invoicesToFilter; // Correctly return the filtered array
  }, [allInvoices, filters]);
  
  // Effect to turn off loading after a delay, once filtering is complete and if isLoading is true.
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 300); // Minimum display time for loading spinner
      return () => clearTimeout(timer); // Cleanup timer if component unmounts or dependencies change
    }
  }, [filteredInvoices, isLoading]); // Re-run if filteredInvoices is computed or isLoading changes


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
      <InvoiceDataTable invoices={filteredInvoices} isLoading={isLoading} />
    </div>
  );
}
