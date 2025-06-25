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
  fncStartDate: Date | undefined;
  fncEndDate: Date | undefined;
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
          סינון חשבוניות
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label htmlFor="customerName">שם לקוח</Label>
            <Input
              id="customerName"
              placeholder="לדוגמה: ישראל ישראלי"
              value={filters.customerName}
              onChange={(e) => handleInputChange("customerName", e.target.value)}
              disabled={isLoading}
              className="bg-background"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="invoiceNumber">מספר חשבונית</Label>
            <Input
              id="invoiceNumber"
              placeholder="לדוגמה: 12345"
              value={filters.invoiceNumber}
              onChange={(e) => handleInputChange("invoiceNumber", e.target.value)}
              disabled={isLoading}
              className="bg-background"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="startDate">תאריך התחלה (ת.ערך)</Label>
            <DatePicker
              date={filters.startDate}
              setDate={(date) => handleInputChange("startDate", date)}
              placeholder="בחר תאריך התחלה"
              className="bg-background"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="endDate">תאריך סיום (ת.ערך)</Label>
            <DatePicker
              date={filters.endDate}
              setDate={(date) => handleInputChange("endDate", date)}
              placeholder="בחר תאריך סיום"
              className="bg-background"
            />
          </div>
           <div className="space-y-1">
            <Label htmlFor="fncStartDate">תאריך התחלה (ת.פרעון)</Label>
            <DatePicker
              date={filters.fncStartDate}
              setDate={(date) => handleInputChange("fncStartDate", date)}
              placeholder="בחר תאריך התחלה"
              className="bg-background"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fncEndDate">תאריך סיום (ת.פרעון)</Label>
            <DatePicker
              date={filters.fncEndDate}
              setDate={(date) => handleInputChange("fncEndDate", date)}
              placeholder="בחר תאריך סיום"
              className="bg-background"
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onClearFilters} variant="outline" disabled={isLoading} className="ml-auto">
          <XCircle className="mr-2 h-4 w-4" />
          נקה סינונים
        </Button>
      </CardFooter>
    </Card>
  );
}

// Need to import Card components if not already available globally (e.g. from specific invoice components)
// Assuming Card, CardHeader, CardTitle, CardContent, CardFooter, Label are available from @/components/ui
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
