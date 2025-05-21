
"use client";

import type { Invoice } from "@/types/invoice";
import type { InvoiceRemark, PaymentStatus, PaymentStatusOption } from "@/types/dashboard";
import { PAYMENT_STATUS_OPTIONS } from "@/types/dashboard";
import React, { useState } from "react";
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
import { formatDateString } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUp, ArrowDown, ChevronsUpDown, Edit3, Save, X } from "lucide-react";
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
  { key: "ACCDES", label: "מ. לקוח", isSortable: true, className: "min-w-[200px]" },
  { key: "ACCNAME", label: "שם לקוח", isSortable: true, className: "min-w-[180px]" },
  { key: "IVNUM", label: "מספר חשבונית", isSortable: true, className: "min-w-[120px]" },
  { key: "CURDATE", label: "תאריך חשבונית", isSortable: true, className: "min-w-[100px]" },
  { key: "FNCDATE", label: "תאריך פרעון", isSortable: true, className: "min-w-[100px]" },
  { key: "SUM", label: "סכום", isSortable: true, className: "min-w-[100px]" }, 

  { key: "payment_status", label: "סטטוס תשלום", isSortable: true, isRemarkField: true, className: "min-w-[180px]" },
  { key: "status_date", label: "תאריך סטטוס", isSortable: true, isRemarkField: true, className: "min-w-[180px]" },
  { key: "text", label: "הערות", isSortable: false, isRemarkField: true, className: "min-w-[250px]" },
  { key: "follow_up_date", label: "תאריך מעקב", isSortable: true, isRemarkField: true, className: "min-w-[180px]" },
  
].reverse();


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
  
  const [editingCell, setEditingCell] = useState<{ invoiceId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<any>(null);

  const handleCellClick = (invoiceId: string, field: string, currentValue: any) => {
    setEditingCell({ invoiceId, field });
    setEditValue(currentValue);
  };

  const handleSaveEdit = async (invoiceId: string, field: string) => {
    if (editingCell && editingCell.invoiceId === invoiceId && editingCell.field === field) {
      let updatePayload: Partial<InvoiceRemark> = { [field]: editValue };
      if (field === 'status') { 
        updatePayload.status_date = formatISO(new Date());
      }
      await onUpdateRemark(invoiceId, updatePayload);
      setEditingCell(null);
      setEditValue(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue(null);
  };


  const renderSortIcon = (columnKey: string) => {
    if (sortKey !== columnKey) {
      return <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground/50 rtl:mr-2 rtl:ml-0" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0" /> : <ArrowDown className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0" />;
  };
  
  const defaultRemark = (invoiceId: string): InvoiceRemark => ({
    id: invoiceId, 
    invoiceId,
    status: 'לא שולם',
    createdAt: formatISO(new Date()),
    status_date: formatISO(new Date()),
    text: '',
  });

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">נתוני חשבוניות</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] w-full rounded-md border">
          <Table>
            <TableCaption className="py-4">
              {isLoading
                ? "טוען חשבוניות..."
                : invoices.length === 0
                ? "לא נמצאו חשבוניות התואמות את החיפוש."
                : `מציג ${invoices.length} חשבוניות.`}
            </TableCaption>
            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
              <TableRow>
                {columnConfiguration.map((col) => (
                  <TableHead 
                    key={col.key} 
                    className={`whitespace-nowrap text-right px-2 py-3 ${col.className || ''} ${col.isSortable ? 'cursor-pointer' : ''}`}
                    onClick={col.isSortable ? () => onSort(col.key) : undefined}
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
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={columnConfiguration.length} className="h-24 text-center">
                    <div className="flex justify-center items-center">
                       <LoadingSpinner size={32} />
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columnConfiguration.length} className="h-24 text-center text-muted-foreground">
                    אין נתונים להצגה.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                invoices.map((invoice) => {
                  const remark = remarksMap.get(invoice.IVNUM) || defaultRemark(invoice.IVNUM);
                  const isUpdatingThisRemark = updatingRemarksIvs.has(invoice.IVNUM);

                  return (
                    <TableRow key={`${invoice.IVNUM}-${invoice.KLINE}`} className="transition-opacity duration-300 ease-in-out hover:bg-muted/50">
                      {columnConfiguration.map((col) => {
                        let displayData: React.ReactNode;
                        const isCurrentlyEditing = editingCell?.invoiceId === invoice.IVNUM && editingCell?.field === col.key;

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
                          displayData = cellData === null || cellData === undefined ? "" : cellData;

                          if (col.key === "CURDATE" || col.key === "FNCDATE") {
                            displayData = formatDateString(cellData as string);
                          } else if (col.key === "SUM") {
                            displayData = typeof cellData === 'number' ? (cellData as number).toLocaleString('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
                          }
                        }
                        
                        return (
                          <TableCell 
                            key={`${invoice.IVNUM}-${col.key}`}
                            className={`px-2 py-1.5 text-right ${col.className || ''}`}
                          >
                            {displayData}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
