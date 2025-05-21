"use client";

import type * as React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Search, XCircle } from "lucide-react";

export interface Filters {
  customerName: string;
  invoiceNumber: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
}

interface InvoiceFiltersBarProps {
  filters: Filters;
  onFilterChange: (newFilters: Filters) => void;
  onClearFilters: () => void;
  isLoading?: boolean;
}

export function InvoiceFiltersBar({ filters, onFilterChange, onClearFilters, isLoading }: InvoiceFiltersBarProps) {
  const handleInputChange = (field: keyof Filters, value: string | Date | undefined) => {
    onFilterChange({ ...filters, [field]: value });
  };

  return (
    <Card className="mb-6 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <Search className="mr-2 h-5 w-5 text-primary" />
          Filter Invoices
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label htmlFor="customerName">Customer Name</Label>
            <Input
              id="customerName"
              placeholder="e.g. John Doe"
              value={filters.customerName}
              onChange={(e) => handleInputChange("customerName", e.target.value)}
              disabled={isLoading}
              className="bg-background"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="invoiceNumber">Invoice Number</Label>
            <Input
              id="invoiceNumber"
              placeholder="e.g. INV-001"
              value={filters.invoiceNumber}
              onChange={(e) => handleInputChange("invoiceNumber", e.target.value)}
              disabled={isLoading}
              className="bg-background"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="startDate">Start Date (CURDATE)</Label>
            <DatePicker
              date={filters.startDate}
              setDate={(date) => handleInputChange("startDate", date)}
              placeholder="Select start date"
              className="bg-background"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="endDate">End Date (CURDATE)</Label>
            <DatePicker
              date={filters.endDate}
              setDate={(date) => handleInputChange("endDate", date)}
              placeholder="Select end date"
              className="bg-background"
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onClearFilters} variant="outline" disabled={isLoading} className="ml-auto">
          <XCircle className="mr-2 h-4 w-4" />
          Clear Filters
        </Button>
      </CardFooter>
    </Card>
  );
}

// Need to import Card components if not already available globally (e.g. from specific invoice components)
// Assuming Card, CardHeader, CardTitle, CardContent, CardFooter, Label are available from @/components/ui
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
