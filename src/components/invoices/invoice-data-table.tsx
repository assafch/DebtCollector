
"use client";

import type { Invoice } from "@/types/invoice";
import type { InvoiceRemark, PaymentStatus, PaymentStatusOption } from "@/types/dashboard";
import { PAYMENT_STATUS_OPTIONS } from "@/types/dashboard";
import React, { useState, Fragment } from "react"; // Added Fragment
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateString, formatCurrency } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { formatISO, parseISO } from 'date-fns';

interface InvoiceDataTableProps {
  invoices: Invoice[];
  remarksMap: Map<string, InvoiceRemark>;
  onUpdateRemark: (invoiceId: string, updates: Partial<InvoiceRemark>) => Promise<void>;
  updatingRemarksIvs: Set<string>;
  isLoading: boolean;
  onSort: (sortKey: keyof Invoice | string) => void;
  sortKey: keyof Invoice | string | null;
  sortDirection: 'asc' | 'desc';
}

interface ColumnDefinition {
  key: keyof Invoice | keyof InvoiceRemark | string; 
  label: string;
  isSortable?: boolean;
  isRemarkField?: boolean; 
  className?: string; 
}

const columnConfiguration: ColumnDefinition[] = [
  { key: "ACCDES", label: "מ. לקוח", isSortable: true, className: "min-w-[200px] sticky right-0 bg-card z-20" }, // Sticky
  { key: "ACCNAME", label: "שם לקוח", isSortable: true, className: "min-w-[180px] sticky right-[200px] bg-card z-20" }, // Sticky
  { key: "IVNUM", label: "מספר חשבונית", isSortable: true, className: "min-w-[120px]" },
  { key: "CURDATE", label: "תאריך חשבונית", isSortable: true, className: "min-w-[100px]" },
  { key: "FNCDATE", label: "תאריך פרעון", isSortable: true, className: "min-w-[100px]" },
  { key: "SUM", label: "סכום", isSortable: true, className: "min-w-[100px] text-right" }, 
  { key: "payment_status", label: "סטטוס תשלום", isSortable: true, isRemarkField: true, className: "min-w-[180px]" },
  { key: "status_date", label: "תאריך סטטוס", isSortable: true, isRemarkField: true, className: "min-w-[180px]" },
  { key: "text", label: "הערות", isSortable: false, isRemarkField: true, className: "min-w-[250px]" },
  { key: "follow_up_date", label: "תאריך מעקב", isSortable: true, isRemarkField: true, className: "min-w-[180px]" },
].reverse();


const defaultRemark = (invoiceId: string): InvoiceRemark => ({
  id: invoiceId, 
  invoiceId,
  status: 'לא שולם',
  createdAt: formatISO(new Date()),
  status_date: formatISO(new Date()),
  text: '',
});

interface GroupSubtotal {
  openAmount: number;
  openCount: number;
}

const calculateGroupSubtotals = (
  groupInvoices: Invoice[],
  remarks: Map<string, InvoiceRemark>
): GroupSubtotal => {
  let openAmount = 0;
  let openCount = 0;
  groupInvoices.forEach(inv => {
    const remark = remarks.get(inv.IVNUM) || defaultRemark(inv.IVNUM);
    if (remark.status !== 'שולם' && remark.status !== 'בוטל') {
      openAmount += inv.SUM;
      openCount++;
    }
  });
  return { openAmount, openCount };
};


export function InvoiceDataTable({ 
  invoices, 
  remarksMap,
  onUpdateRemark,
  updatingRemarksIvs,
  isLoading, 
  onSort, 
  sortKey, 
  sortDirection 
}: InvoiceDataTableProps) {
  
  const renderSortIcon = (columnKey: string) => {
    if (sortKey !== columnKey) {
      return <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground/50 rtl:mr-2 rtl:ml-0" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0" /> : <ArrowDown className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0" />;
  };

  const renderTableRows = () => {
    if (isLoading && invoices.length === 0) { // Only show full table spinner if truly no data yet during initial load
      return (
        <TableRow>
          <TableCell colSpan={columnConfiguration.length} className="h-24 text-center">
            <div className="flex justify-center items-center">
               <LoadingSpinner size={32} />
            </div>
          </TableCell>
        </TableRow>
      );
    }
    if (!isLoading && invoices.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={columnConfiguration.length} className="h-24 text-center text-muted-foreground">
            אין נתונים להצגה.
          </TableCell>
        </TableRow>
      );
    }

    const rows: JSX.Element[] = [];
    let currentCustomerAccName: string | null = null;
    let currentGroupInvoices: Invoice[] = [];

    invoices.forEach((invoice, index) => {
      const customerAccName = invoice.ACCDES; // Using ACCDES for grouping name

      if (customerAccName !== currentCustomerAccName) {
        if (currentCustomerAccName !== null && currentGroupInvoices.length > 0) {
          // Render subtotal for previous group
          const subtotals = calculateGroupSubtotals(currentGroupInvoices, remarksMap);
          rows.push(
            <TableRow key={`subtotal-${currentCustomerAccName}`} className="bg-muted/50 font-semibold">
              <TableCell 
                className="text-right px-2 py-3 sticky right-0 bg-muted/50 z-10" // sticky for ACCDES
                style={{ right: columnConfiguration.findIndex(c => c.key === "ACCDES") === 0 ? '0px' : undefined }}
              >
                סה"כ פתוח ללקוח {currentCustomerAccName}:
              </TableCell>
              <TableCell className="text-right px-2 py-3 sticky right-[200px] bg-muted/50 z-10"></TableCell> 
              <TableCell></TableCell> 
              <TableCell></TableCell> 
              <TableCell></TableCell> 
              <TableCell className="text-right px-2 py-3">{formatCurrency(subtotals.openAmount)}</TableCell>
              <TableCell className="text-right px-2 py-3">{subtotals.openCount} חשבניות</TableCell>
              <TableCell colSpan={columnConfiguration.length - 7}></TableCell> 
            </TableRow>
          );
        }
        // Render group header for new group
        rows.push(
          <TableRow key={`header-${customerAccName}`} className="bg-secondary text-secondary-foreground">
            <TableCell 
              colSpan={columnConfiguration.length} 
              className="text-right font-bold px-2 py-3 text-lg sticky right-0 bg-secondary z-10"
              style={{ right: '0px' }}
            >
              {customerAccName} (לקוח: {invoice.ACCNAME})
            </TableCell>
          </TableRow>
        );
        currentCustomerAccName = customerAccName;
        currentGroupInvoices = [];
      }

      currentGroupInvoices.push(invoice);
      const remark = remarksMap.get(invoice.IVNUM) || defaultRemark(invoice.IVNUM);
      const isUpdatingThisRemark = updatingRemarksIvs.has(invoice.IVNUM);

      // Render invoice row
      rows.push(
        <TableRow key={`${invoice.IVNUM}-${invoice.KLINE}`} className="transition-opacity duration-300 ease-in-out hover:bg-muted/50">
          {columnConfiguration.map((col) => {
            let displayData: React.ReactNode;
            const isSticky = col.key === "ACCDES" || col.key === "ACCNAME";
            const stickyOffset = col.key === "ACCDES" ? "0px" : col.key === "ACCNAME" ? "200px" : undefined;


            if (col.isRemarkField) {
                if (col.key === "payment_status") {
                displayData = isUpdatingThisRemark ? <LoadingSpinner size={16} /> : (
                  <Select
                    value={remark.status}
                    onValueChange={(value: PaymentStatus) => {
                      onUpdateRemark(invoice.IVNUM, { status: value, status_date: formatISO(new Date()) });
                    }}
                    disabled={isUpdatingThisRemark}
                    dir="rtl"
                  >
                    <SelectTrigger className="w-full min-w-[150px] h-9 text-xs">
                      <SelectValue placeholder="בחר סטטוס" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_STATUS_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              } else if (col.key === "status_date") {
                  displayData = isUpdatingThisRemark ? <LoadingSpinner size={16} /> : (
                    <DatePicker
                      date={remark.status_date ? parseISO(remark.status_date) : undefined}
                      setDate={(date) => {
                        onUpdateRemark(invoice.IVNUM, { status_date: date ? formatISO(date) : undefined });
                      }}
                      placeholder="בחר תאריך"
                      className="w-full min-w-[150px] h-9 text-xs"
                      disabled={isUpdatingThisRemark}
                    />
                  );
              } else if (col.key === "text") {
                displayData = isUpdatingThisRemark ? <LoadingSpinner size={16} /> : (
                  <Textarea
                    defaultValue={remark.text || ""}
                    onBlur={(e) => onUpdateRemark(invoice.IVNUM, { text: e.target.value })}
                    placeholder="הזן הערה..."
                    className="min-w-[200px] text-xs h-auto py-1 px-2 text-right" 
                    rows={1} 
                    disabled={isUpdatingThisRemark}
                  />
                );
              } else if (col.key === "follow_up_date") {
                displayData = isUpdatingThisRemark ? <LoadingSpinner size={16} /> : (
                    <DatePicker
                      date={remark.follow_up_date ? parseISO(remark.follow_up_date) : undefined}
                      setDate={(date) => {
                        onUpdateRemark(invoice.IVNUM, { follow_up_date: date ? formatISO(date) : undefined });
                      }}
                      placeholder="בחר תאריך"
                      className="w-full min-w-[150px] h-9 text-xs"
                      disabled={isUpdatingThisRemark}
                    />
                  );
              } else {
                displayData = (remark as any)[col.key as keyof InvoiceRemark] || "";
              }
            } else {
              const cellData = (invoice as any)[col.key as keyof Invoice];
              if (col.key === "CURDATE" || col.key === "FNCDATE") {
                displayData = formatDateString(cellData as string);
              } else if (col.key === "SUM") {
                displayData = typeof cellData === 'number' ? formatCurrency(cellData as number) : "";
              } else {
                 displayData = cellData === null || cellData === undefined ? "" : String(cellData);
              }
            }
            
            return (
              <TableCell 
                key={`${invoice.IVNUM}-${col.key}`}
                className={`px-2 py-1.5 text-right ${col.className || ''} ${isSticky ? 'bg-card' : ''}`} // Keep bg-card for sticky cells to overlay
                style={isSticky ? { position: 'sticky', right: stickyOffset, zIndex: 10 } : {}}
              >
                {displayData}
              </TableCell>
            );
          })}
        </TableRow>
      );
    });

    // Render subtotal for the last group
    if (currentCustomerAccName !== null && currentGroupInvoices.length > 0) {
      const subtotals = calculateGroupSubtotals(currentGroupInvoices, remarksMap);
      rows.push(
        <TableRow key={`subtotal-${currentCustomerAccName}-final`} className="bg-muted/50 font-semibold">
            <TableCell 
                className="text-right px-2 py-3 sticky right-0 bg-muted/50 z-10"
                style={{ right: columnConfiguration.findIndex(c => c.key === "ACCDES") === 0 ? '0px' : undefined }}
              >
                סה"כ פתוח ללקוח {currentCustomerAccName}:
              </TableCell>
            <TableCell className="text-right px-2 py-3 sticky right-[200px] bg-muted/50 z-10"></TableCell>
            <TableCell></TableCell>
            <TableCell></TableCell>
            <TableCell></TableCell>
            <TableCell className="text-right px-2 py-3">{formatCurrency(subtotals.openAmount)}</TableCell>
            <TableCell className="text-right px-2 py-3">{subtotals.openCount} חשבונות</TableCell>
            <TableCell colSpan={columnConfiguration.length - 7}></TableCell>
        </TableRow>
      );
    }
    return rows;
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">נתוני חשבוניות</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] w-full rounded-md border">
          <Table>
            <TableCaption className="py-4">
              {isLoading && invoices.length === 0
                ? "טוען חשבוניות..."
                : !isLoading && invoices.length === 0
                ? "לא נמצאו חשבוניות התואמות את החיפוש."
                : `מציג ${invoices.length} חשבוניות.`}
            </TableCaption>
            <TableHeader className="sticky top-0 bg-card z-30 shadow-sm"> {/* Increased z-index for header */}
              <TableRow>
                {columnConfiguration.map((col) => (
                  <TableHead 
                    key={col.key} 
                    className={`whitespace-nowrap text-right px-2 py-3 ${col.className || ''} ${col.isSortable ? 'cursor-pointer' : ''} ${col.key === "ACCDES" || col.key === "ACCNAME" ? 'bg-card' : ''}`}
                    onClick={col.isSortable ? () => onSort(col.key) : undefined}
                    style={col.key === "ACCDES" ? { position: 'sticky', right: '0px', zIndex: 31 } : col.key === "ACCNAME" ? { position: 'sticky', right: '200px', zIndex: 31 } : {}}
                  >
                     <div className="flex items-center justify-end rtl:justify-start"> 
                        <span>{col.label}</span>
                        {col.isSortable && renderSortIcon(col.key)}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderTableRows()}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

