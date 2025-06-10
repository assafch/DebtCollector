
"use client";

import type { Invoice } from "@/types/invoice";
import type { InvoiceRemark, PaymentStatus, PaymentStatusOption } from "@/types/dashboard";
import { PAYMENT_STATUS_OPTIONS } from "@/types/dashboard";
import React, { useState, Fragment, useEffect, useMemo } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDateString, formatCurrency } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUp, ArrowDown, ChevronsUpDown, Pencil, Mail, MessageSquareText, Printer, FileSpreadsheet, ChevronDown as ChevronDownIcon, ChevronRight as ChevronRightIcon, ChevronUp as ChevronUpIcon } from "lucide-react";
import { formatISO, parseISO, isValid } from 'date-fns';

interface InvoiceDataTableProps {
  invoices: Invoice[];
  remarksMap: Map<string, InvoiceRemark>;
  onUpdateRemark: (invoiceId: string, updates: Partial<InvoiceRemark>) => Promise&lt;void&gt;;
  updatingRemarksIvs: Set&lt;string&gt;;
  isLoading: boolean;
  onSort: (sortKey: keyof Invoice | string) =&gt; void;
  sortKey: keyof Invoice | string | null;
  sortDirection: 'asc' | 'desc';
}

interface ColumnDefinition {
  key: keyof Invoice | keyof InvoiceRemark | string; // Includes 'actions' or 'expander'
  label: string;
  isSortable?: boolean;
  isRemarkField?: boolean; // Still useful to identify fields coming from remark object
  className?: string;
}

// New column order for RTL display:
// ACCDES | ACCNAME | IVNUM | CURDATE | FNCDATE | SUM | payment_status | actions
// (Rightmost)                                                   (Leftmost)
// The array should be in this visual order for RTL when dir="rtl" is applied to the table/container.
const columnConfiguration: ColumnDefinition[] = [
  { key: "ACCDES", label: "מ. לקוח", isSortable: true, className: "min-w-[110px] text-right" },
  { key: "ACCNAME", label: "שם לקוח", isSortable: true, className: "min-w-[160px] text-right" },
  { key: "IVNUM", label: "מספר חשבונית", isSortable: true, className: "min-w-[100px] text-right" },
  { key: "CURDATE", label: "תאריך חשבונית", isSortable: true, className: "min-w-[100px] text-right" },
  { key: "FNCDATE", label: "תאריך פרעון", isSortable: true, className: "min-w-[100px] text-right" },
  { key: "SUM", label: "סכום", isSortable: true, className: "min-w-[90px] text-right" },
  { key: "payment_status", label: "סטטוס תשלום", isSortable: true, isRemarkField: true, className: "min-w-[160px] text-right" },
  { key: "actions", label: "פעולות", isSortable: false, className: "min-w-[70px] text-center" },
];

const defaultRemark = (invoiceId: string): InvoiceRemark =&gt; ({
  id: invoiceId,
  invoiceId,
  status: 'לא שולם',
  createdAt: formatISO(new Date()),
  status_date: formatISO(new Date()),
  text: '',
  follow_up_date: undefined,
});

interface GroupSubtotal {
  openAmount: number;
  openCount: number;
  totalAmount: number;
  totalCount: number;
}

const calculateGroupSubtotals = (
  groupInvoices: Invoice[],
  remarks: Map&lt;string, InvoiceRemark&gt;
): GroupSubtotal =&gt; {
  let openAmount = 0;
  let openCount = 0;
  let totalAmount = 0;
  let totalCount = groupInvoices.length;

  groupInvoices.forEach(inv =&gt; {
    totalAmount += inv.SUM;
    const remark = remarks.get(inv.IVNUM) || defaultRemark(inv.IVNUM);
    if (remark.status !== 'שולם' &amp;&amp; remark.status !== 'בוטל') {
      openAmount += inv.SUM;
      openCount++;
    }
  });
  return { openAmount, openCount, totalAmount, totalCount };
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

  const [expandedGroups, setExpandedGroups] = useState&lt;Record&lt;string, boolean&gt;&gt;({});
  const [expandedRows, setExpandedRows] = useState&lt;Record&lt;string, boolean&gt;&gt;({}); // New state for individual row expansion
  const [selectedInvoices, setSelectedInvoices] = useState&lt;Record&lt;string, boolean&gt;&gt;({});
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingInvoiceData, setEditingInvoiceData] = useState&lt;{invoice: Invoice | null, remark: InvoiceRemark | null}&gt;({invoice: null, remark: null});

  const allFilteredInvoicesSelected = useMemo(() =&gt; {
    if (invoices.length === 0) return false;
    return invoices.every(inv =&gt; selectedInvoices[inv.IVNUM]);
  }, [invoices, selectedInvoices]);

  const toggleGroup = (groupKey: string) =&gt; {
    setExpandedGroups(prev =&gt; ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const toggleRowExpansion = (invoiceId: string) =&gt; {
    setExpandedRows(prev =&gt; ({ ...prev, [invoiceId]: !prev[invoiceId] }));
  };

  const expandAllGroups = () =&gt; {
    const allExpanded: Record&lt;string, boolean&gt; = {};
    invoices.forEach(inv =&gt; {
      if (inv.ACCDES) allExpanded[inv.ACCDES] = true;
    });
    setExpandedGroups(allExpanded);
  };

  const collapseAllGroups = () =&gt; {
    setExpandedGroups({});
  };

  const handleSelectAllFiltered = (checked: boolean) =&gt; {
    const newSelected: Record&lt;string, boolean&gt; = {};
    if (checked) {
      invoices.forEach(inv =&gt; newSelected[inv.IVNUM] = true);
    }
    setSelectedInvoices(newSelected);
  };

  const handleGroupSelect = (groupKey: string, checked: boolean) =&gt; {
    const invoicesInGroup = invoices.filter(i =&gt; i.ACCDES === groupKey);
    setSelectedInvoices(prev =&gt; {
      const newSelected = { ...prev };
      invoicesInGroup.forEach(inv =&gt; newSelected[inv.IVNUM] = checked);
      return newSelected;
    });
  };

  const handleInvoiceSelect = (invoiceId: string, checked: boolean) =&gt; {
    setSelectedInvoices(prev =&gt; ({ ...prev, [invoiceId]: checked }));
  };

  const handleOpenEditDialog = (invoice: Invoice) =&gt; {
    const remark = remarksMap.get(invoice.IVNUM) || defaultRemark(invoice.IVNUM);
    setEditingInvoiceData({ invoice, remark });
    setIsEditDialogOpen(true);
  };

  const handleSaveEditDialog = async () =&gt; {
    if (!editingInvoiceData.invoice || !editingInvoiceData.remark) return;
    const { id, invoiceId, ...updatePayload } = editingInvoiceData.remark;
    await onUpdateRemark(editingInvoiceData.invoice.IVNUM, updatePayload as Partial&lt;InvoiceRemark&gt;);
    setIsEditDialogOpen(false);
    setEditingInvoiceData({invoice: null, remark: null});
  };

  const handleEditDialogInputChange = (field: keyof InvoiceRemark, value: string | PaymentStatus | Date | undefined) =&gt; {
    if (editingInvoiceData.remark) {
      let processedValue = value;
      if ((field === 'status_date' || field === 'follow_up_date') &amp;&amp; value instanceof Date) {
        processedValue = formatISO(value);
      } else if ((field === 'status_date' || field === 'follow_up_date') &amp;&amp; value === undefined){
        processedValue = undefined;
      }
      setEditingInvoiceData(prev =&gt; ({
        ...prev,
        remark: {
          ...prev.remark!,
          [field]: processedValue,
          ...(field === 'status' &amp;&amp; !prev.remark!.status_date &amp;&amp; { status_date: formatISO(new Date()) })
        }
      }));
    }
  };

  const renderSortIcon = (columnKey: string) =&gt; {
    if (sortKey !== columnKey) {
      return &lt;ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground/50 rtl:mr-2 rtl:ml-0" /&gt;;
    }
    return sortDirection === 'asc' ? &lt;ArrowUp className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0" /&gt; : &lt;ArrowDown className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0" /&gt;;
  };

  const renderTableRows = () =&gt; {
    if (isLoading &amp;&amp; invoices.length === 0) {
      return (
        &lt;TableRow&gt;
          &lt;TableCell colSpan={columnConfiguration.length + 2} className="h-24 text-center"&gt; {/* +2 for checkbox &amp; expander */}
            &lt;div className="flex justify-center items-center"&gt;
               &lt;LoadingSpinner size={32} /&gt;
            &lt;/div&gt;
          &lt;/TableCell&gt;
        &lt;/TableRow&gt;
      );
    }
    if (!isLoading &amp;&amp; invoices.length === 0) {
      return (
        &lt;TableRow&gt;
          &lt;TableCell colSpan={columnConfiguration.length + 2} className="h-24 text-center text-muted-foreground"&gt; {/* +2 */}
            אין נתונים להצגה.
          &lt;/TableCell&gt;
        &lt;/TableRow&gt;
      );
    }

    const rows: JSX.Element[] = [];
    let currentCustomerAccDesc: string | null = null;
    let currentGroupInvoices: Invoice[] = [];

    invoices.forEach((invoice, idx) =&gt; {
      const customerAccDesc = invoice.ACCDES;

      if (customerAccDesc !== currentCustomerAccDesc) {
        if (currentCustomerAccDesc !== null &amp;&amp; currentGroupInvoices.length &gt; 0) {
          const subtotals = calculateGroupSubtotals(currentGroupInvoices, remarksMap);
          rows.push(
            &lt;TableRow key={`subtotal-${currentCustomerAccDesc}`} className="bg-muted/50 font-semibold"&gt;
              &lt;TableCell className="px-2 py-1.5 text-center"&gt;&lt;/TableCell&gt; {/* Checkbox placeholder */}
              &lt;TableCell className="px-2 py-1.5 text-center"&gt;&lt;/TableCell&gt; {/* Expander placeholder */}
              &lt;TableCell colSpan={4} className="text-right px-2 py-3"&gt; {/* ACCDES, ACCNAME, IVNUM, CURDATE, FNCDATE (actually 5, but use 4 here as sum is next) */}
                סה"כ {currentCustomerAccDesc}:
              &lt;/TableCell&gt;
              &lt;TableCell className="text-right px-2 py-3"&gt;{formatCurrency(subtotals.totalAmount)} ({subtotals.totalCount} חשב')&lt;/TableCell&gt; {/* SUM */}
              &lt;TableCell className="text-right px-2 py-3 text-destructive"&gt;{formatCurrency(subtotals.openAmount)} ({subtotals.openCount} פתוחות)&lt;/TableCell&gt; {/* payment_status used for open amount */}
              &lt;TableCell className="text-right px-2 py-3"&gt;&lt;/TableCell&gt; {/* Actions placeholder */}
            &lt;/TableRow&gt;
          );
        }
        currentCustomerAccDesc = customerAccDesc;
        currentGroupInvoices = [];

        rows.push(
          &lt;TableRow
            key={`header-${customerAccDesc}-${idx}`}
            className="bg-secondary/70 text-secondary-foreground hover:bg-secondary/90"
          &gt;
            &lt;TableCell className="px-2 py-2 text-center w-12"&gt;
                &lt;Checkbox
                  checked={invoices.filter(i =&gt; i.ACCDES === customerAccDesc).every(inv =&gt; selectedInvoices[inv.IVNUM]) &amp;&amp; invoices.filter(i =&gt; i.ACCDES === customerAccDesc).length &gt; 0}
                  onCheckedChange={(checked) =&gt; handleGroupSelect(customerAccDesc, !!checked)}
                  aria-label={`בחר את כל החשבוניות של ${customerAccDesc}`}
                  onClick={(e) =&gt; e.stopPropagation()}
                /&gt;
            &lt;/TableCell&gt;
            &lt;TableCell className="px-2 py-2 text-center w-12"&gt; {/* Expander column header placeholder */}
                 &lt;Button variant="ghost" size="icon" onClick={() =&gt; toggleGroup(customerAccDesc)} className="h-7 w-7" aria-label={expandedGroups[customerAccDesc] ? "כווץ קבוצה" : "הרחב קבוצה"}&gt;
                    {expandedGroups[customerAccDesc] ? &lt;ChevronDownIcon className="h-5 w-5" /&gt; : &lt;ChevronRightIcon className="h-5 w-5" /&gt;}
                  &lt;/Button&gt;
            &lt;/TableCell&gt;
            &lt;TableCell
              className="text-right font-bold px-2 py-2 text-lg cursor-pointer"
              onClick={() =&gt; toggleGroup(customerAccDesc)}
              colSpan={columnConfiguration.length} 
            &gt;
              {customerAccDesc} (לקוח: {invoice.ACCNAME})
            &lt;/TableCell&gt;
          &lt;/TableRow&gt;
        );
      }

      currentGroupInvoices.push(invoice);

      if (expandedGroups[customerAccDesc]) {
        const remark = remarksMap.get(invoice.IVNUM) || defaultRemark(invoice.IVNUM);
        const isUpdatingThisRemark = updatingRemarksIvs.has(invoice.IVNUM);
        const isRowExpanded = !!expandedRows[invoice.IVNUM];

        rows.push(
          &lt;Fragment key={`${invoice.IVNUM}-${invoice.KLINE}-fragment`}&gt;
            &lt;TableRow 
              className="transition-colors duration-100 ease-in-out hover:bg-muted/30 data-[selected=true]:bg-blue-100 dark:data-[selected=true]:bg-blue-900/30" 
              data-selected={selectedInvoices[invoice.IVNUM]}
              onClick={(e) =&gt; {
                 const target = e.target as HTMLElement;
                 if (target.closest('[data-no-expand="true"]')) return;
                 toggleRowExpansion(invoice.IVNUM);
              }}
            &gt;
              &lt;TableCell className="px-2 py-1.5 text-center w-12" data-no-expand="true"&gt;
                  &lt;Checkbox
                      checked={!!selectedInvoices[invoice.IVNUM]}
                      onCheckedChange={(checked) =&gt; handleInvoiceSelect(invoice.IVNUM, !!checked)}
                      aria-label={`בחר חשבונית ${invoice.IVNUM}`}
                  /&gt;
              &lt;/TableCell&gt;
              &lt;TableCell className="px-2 py-1.5 text-center w-12" data-no-expand="true"&gt;
                &lt;Button variant="ghost" size="icon" onClick={() =&gt; toggleRowExpansion(invoice.IVNUM)} className="h-7 w-7" aria-label={isRowExpanded ? "כווץ שורה" : "הרחב שורה"}&gt;
                  {isRowExpanded ? &lt;ChevronUpIcon className="h-4 w-4" /&gt; : &lt;ChevronDownIcon className="h-4 w-4" /&gt;}
                &lt;/Button&gt;
              &lt;/TableCell&gt;
              {columnConfiguration.map((col) =&gt; {
                let displayData: React.ReactNode;
                if (col.key === "actions") {
                  displayData = (
                    &lt;div data-no-expand="true"&gt;
                      &lt;Button variant="ghost" size="icon" onClick={(e) =&gt; { e.stopPropagation(); handleOpenEditDialog(invoice);}} className="h-7 w-7"&gt;
                        &lt;Pencil className="h-4 w-4" /&gt;
                      &lt;/Button&gt;
                    &lt;/div&gt;
                  );
                } else if (col.key === "payment_status") {
                    displayData = isUpdatingThisRemark ? &lt;LoadingSpinner size={16} /&gt; : (
                      &lt;div data-no-expand="true" onClick={(e) =&gt; e.stopPropagation()}&gt;
                        &lt;Select
                          value={remark.status}
                          onValueChange={(value: PaymentStatus) =&gt; {
                            onUpdateRemark(invoice.IVNUM, { status: value, status_date: formatISO(new Date()) });
                          }}
                          disabled={isUpdatingThisRemark}
                          dir="rtl"
                        &gt;
                          &lt;SelectTrigger className="w-full min-w-[150px] h-9 text-xs text-right"&gt;
                            &lt;SelectValue placeholder="בחר סטטוס" /&gt;
                          &lt;/SelectTrigger&gt;
                          &lt;SelectContent&gt;
                            {PAYMENT_STATUS_OPTIONS.map(opt =&gt; (
                              &lt;SelectItem key={opt.value} value={opt.value}&gt;
                                &lt;Badge variant={opt.badgeVariant} className="mr-2 rtl:ml-2 rtl:mr-0 w-3 h-3 p-0 rounded-full" /&gt;
                                {opt.label}
                              &lt;/SelectItem&gt;
                            ))}
                          &lt;/SelectContent&gt;
                        &lt;/Select&gt;
                      &lt;/div&gt;
                    );
                } else { // For other master columns
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
                  &lt;TableCell
                    key={`${invoice.IVNUM}-${col.key}`}
                    className={`px-2 py-1.5 text-right text-xs ${col.className || ''} ${isRowExpanded ? '' : 'cursor-pointer'}`}
                  &gt;
                    {displayData}
                  &lt;/TableCell&gt;
                );
              })}
            &lt;/TableRow&gt;
            {isRowExpanded &amp;&amp; (
              &lt;TableRow key={`${invoice.IVNUM}-details`} className="bg-muted/5 dark:bg-muted/10"&gt;
                &lt;TableCell className="px-2 py-1.5 text-center"&gt;&lt;/TableCell&gt; {/* Checkbox placeholder offset */}
                &lt;TableCell className="px-2 py-1.5 text-center"&gt;&lt;/TableCell&gt; {/* Expander placeholder offset */}
                &lt;TableCell colSpan={columnConfiguration.length} className="p-0"&gt;
                  &lt;div className="p-3 space-y-3 bg-background dark:bg-card rounded-md m-1 border"&gt;
                    &lt;h4 className="text-sm font-semibold mb-1 text-foreground"&gt;פרטים נוספים:&lt;/h4&gt;
                    &lt;div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3 text-xs"&gt;
                      &lt;div className="space-y-1"&gt;
                        &lt;Label htmlFor={`follow_up_date-${invoice.IVNUM}`} className="text-muted-foreground"&gt;תאריך מעקב&lt;/Label&gt;
                        &lt;DatePicker 
                          id={`follow_up_date-${invoice.IVNUM}`} 
                          date={remark.follow_up_date &amp;&amp; isValid(parseISO(remark.follow_up_date)) ? parseISO(remark.follow_up_date) : undefined}
                          setDate={(date) =&gt; onUpdateRemark(invoice.IVNUM, { follow_up_date: date ? formatISO(date) : undefined })}
                          placeholder="בחר תאריך"
                          className="w-full h-9 text-xs"
                          disabled={isUpdatingThisRemark}
                        /&gt;
                      &lt;/div&gt;
                      &lt;div className="space-y-1"&gt;
                        &lt;Label htmlFor={`status_date-${invoice.IVNUM}`} className="text-muted-foreground"&gt;תאריך סטטוס&lt;/Label&gt;
                        &lt;DatePicker
                          id={`status_date-${invoice.IVNUM}`}
                          date={remark.status_date &amp;&amp; isValid(parseISO(remark.status_date)) ? parseISO(remark.status_date) : undefined}
                          setDate={(date) =&gt; onUpdateRemark(invoice.IVNUM, { status_date: date ? formatISO(date) : undefined })}
                          placeholder="בחר תאריך"
                          className="w-full h-9 text-xs"
                          disabled={isUpdatingThisRemark}
                        /&gt;
                      &lt;/div&gt;
                       &lt;div className="md:col-span-3 space-y-1"&gt;
                        &lt;Label htmlFor={`text-${invoice.IVNUM}`} className="text-muted-foreground"&gt;הערות&lt;/Label&gt;
                        &lt;Textarea
                          id={`text-${invoice.IVNUM}`}
                          defaultValue={remark.text || ""}
                          onBlur={(e) =&gt; onUpdateRemark(invoice.IVNUM, { text: e.target.value })}
                          placeholder="הזן הערה..."
                          className="min-w-full text-xs h-auto py-1.5 px-2.5"
                          rows={2}
                          disabled={isUpdatingThisRemark}
                        /&gt;
                      &lt;/div&gt;
                    &lt;/div&gt;
                    {isUpdatingThisRemark &amp;&amp; &lt;div className="flex justify-center pt-2"&gt;&lt;LoadingSpinner size={20} /&gt;&lt;/div&gt;}
                  &lt;/div&gt;
                &lt;/TableCell&gt;
              &lt;/TableRow&gt;
            )}
          &lt;/Fragment&gt;
        );
      }
    });

    if (currentCustomerAccDesc !== null &amp;&amp; currentGroupInvoices.length &gt; 0) {
      const subtotals = calculateGroupSubtotals(currentGroupInvoices, remarksMap);
      rows.push(
         &lt;TableRow key={`subtotal-${currentCustomerAccDesc}-final`} className="bg-muted/50 font-semibold"&gt;
              &lt;TableCell className="px-2 py-1.5 text-center"&gt;&lt;/TableCell&gt; {/* Checkbox placeholder */}
              &lt;TableCell className="px-2 py-1.5 text-center"&gt;&lt;/TableCell&gt; {/* Expander placeholder */}
              &lt;TableCell colSpan={4} className="text-right px-2 py-3"&gt; {/* ACCDES, ACCNAME, IVNUM, CURDATE, FNCDATE (actually 5, but use 4 here as sum is next) */}
                סה"כ {currentCustomerAccDesc}:
              &lt;/TableCell&gt;
              &lt;TableCell className="text-right px-2 py-3"&gt;{formatCurrency(subtotals.totalAmount)} ({subtotals.totalCount} חשב')&lt;/TableCell&gt; {/* SUM */}
              &lt;TableCell className="text-right px-2 py-3 text-destructive"&gt;{formatCurrency(subtotals.openAmount)} ({subtotals.openCount} פתוחות)&lt;/TableCell&gt; {/* payment_status used for open amount */}
              &lt;TableCell className="text-right px-2 py-3"&gt;&lt;/TableCell&gt; {/* Actions placeholder */}
        &lt;/TableRow&gt;
      );
    }
    return rows;
  };

  const hasSelected = Object.values(selectedInvoices).some(Boolean);

  return (
    &lt;Card className="shadow-lg"&gt;
      &lt;CardHeader&gt;
        &lt;CardTitle className="text-xl"&gt;נתוני חשבוניות&lt;/CardTitle&gt;
        &lt;div className="flex justify-between items-center pt-2"&gt;
            &lt;div className="flex space-x-2 rtl:space-x-reverse"&gt;
                &lt;Button variant="outline" size="sm" onClick={expandAllGroups}&gt;הרחב קבוצות&lt;/Button&gt;
                &lt;Button variant="outline" size="sm" onClick={collapseAllGroups}&gt;כווץ קבוצות&lt;/Button&gt;
            &lt;/div&gt;
            &lt;div className="flex space-x-2 rtl:space-x-reverse"&gt;
                &lt;Button variant="outline" size="sm" disabled={!hasSelected} onClick={() =&gt; alert('שליחת מייל - לא מיושם')}&gt;
                    &lt;Mail className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0"/&gt;שלח מייל
                &lt;/Button&gt;
                &lt;Button variant="outline" size="sm" disabled={!hasSelected} onClick={() =&gt; alert('שליחת SMS - לא מיושם')}&gt;
                    &lt;MessageSquareText className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0"/&gt;שלח SMS
                &lt;/Button&gt;
                &lt;Button variant="outline" size="sm" disabled={!hasSelected} onClick={() =&gt; alert('הדפסה - לא מיושם')}&gt;
                    &lt;Printer className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0"/&gt;הדפסה
                &lt;/Button&gt;
                &lt;Button variant="outline" size="sm" disabled={!hasSelected} onClick={() =&gt; alert('ייצוא לאקסל - לא מיושם')}&gt;
                    &lt;FileSpreadsheet className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0"/&gt;ייצוא לאקסל
                &lt;/Button&gt;
            &lt;/div&gt;
        &lt;/div&gt;
      &lt;/CardHeader&gt;
      &lt;CardContent&gt;
        &lt;ScrollArea className="h-[calc(100vh-320px)] w-full rounded-md border" dir="rtl"&gt; {/* Adjusted height slightly */}
          &lt;Table&gt;
            &lt;TableCaption className="py-4"&gt;
              {isLoading &amp;&amp; invoices.length === 0
                ? "טוען חשבוניות..."
                : !isLoading &amp;&amp; invoices.length === 0
                ? "לא נמצאו חשבוניות התואמות את החיפוש."
                : `מציג ${invoices.length} חשבוניות.`}
            &lt;/TableCaption&gt;
            &lt;TableHeader className="sticky top-0 bg-card z-10 shadow-sm"&gt; {/* Reduced z-index, sticky positioning removed from individual THs */}
              &lt;TableRow&gt;
                &lt;TableHead className="w-12 px-2 py-3 text-center"&gt;
                    &lt;Checkbox
                        checked={allFilteredInvoicesSelected}
                        onCheckedChange={(checked) =&gt; handleSelectAllFiltered(!!checked)}
                        aria-label="בחר את כל החשבוניות"
                    /&gt;
                &lt;/TableHead&gt;
                &lt;TableHead className="w-12 px-2 py-3 text-center"&gt; {/* Header for expander column */}
                &lt;/TableHead&gt;
                {columnConfiguration.map((col) =&gt; (
                  &lt;TableHead
                    key={col.key}
                    className={`whitespace-nowrap text-right px-2 py-3 ${col.className || ''} ${col.isSortable ? 'cursor-pointer' : ''}`}
                    onClick={col.isSortable ? () =&gt; onSort(col.key) : undefined}
                  &gt;
                     &lt;div className="flex items-center justify-end rtl:justify-start"&gt;
                        &lt;span className="text-right"&gt;{col.label}&lt;/span&gt;
                        {col.isSortable &amp;&amp; renderSortIcon(col.key)}
                    &lt;/div&gt;
                  &lt;/TableHead&gt;
                ))}
              &lt;/TableRow&gt;
            &lt;/TableHeader&gt;
            &lt;TableBody&gt;
              {renderTableRows()}
            &lt;/TableBody&gt;
          &lt;/Table&gt;
        &lt;/ScrollArea&gt;
      &lt;/CardContent&gt;

      {isEditDialogOpen &amp;&amp; editingInvoiceData.invoice &amp;&amp; editingInvoiceData.remark &amp;&amp; (
        &lt;Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}&gt;
          &lt;DialogContent className="sm:max-w-lg"&gt;
            &lt;DialogHeader&gt;
              &lt;DialogTitle&gt;עריכת הערה לחשבונית {editingInvoiceData.invoice.IVNUM}&lt;/DialogTitle&gt;
              &lt;DialogDescription&gt;
                לקוח: {editingInvoiceData.invoice.ACCDES} ({editingInvoiceData.invoice.ACCNAME})
              &lt;/DialogDescription&gt;
            &lt;/DialogHeader&gt;
            &lt;div className="grid gap-4 py-4"&gt;
              &lt;div className="grid grid-cols-4 items-center gap-4"&gt;
                &lt;Label htmlFor="payment_status_dialog" className="text-right col-span-1"&gt;סטטוס תשלום&lt;/Label&gt;
                &lt;Select
                  value={editingInvoiceData.remark.status}
                  onValueChange={(value: PaymentStatus) =&gt; handleEditDialogInputChange('status', value)}
                  dir="rtl"
                &gt;
                  &lt;SelectTrigger id="payment_status_dialog" className="col-span-3 h-9 text-right"&gt;
                    &lt;SelectValue placeholder="בחר סטטוס" /&gt;
                  &lt;/SelectTrigger&gt;
                  &lt;SelectContent&gt;
                    {PAYMENT_STATUS_OPTIONS.map(opt =&gt; (
                      &lt;SelectItem key={opt.value} value={opt.value}&gt;{opt.label}&lt;/SelectItem&gt;
                    ))}
                  &lt;/SelectContent&gt;
                &lt;/Select&gt;
              &lt;/div&gt;
              &lt;div className="grid grid-cols-4 items-center gap-4"&gt;
                &lt;Label htmlFor="status_date_dialog" className="text-right col-span-1"&gt;תאריך סטטוס&lt;/Label&gt;
                &lt;DatePicker
                  id="status_date_dialog"
                  date={editingInvoiceData.remark.status_date &amp;&amp; isValid(parseISO(editingInvoiceData.remark.status_date)) ? parseISO(editingInvoiceData.remark.status_date) : undefined}
                  setDate={(date) =&gt; handleEditDialogInputChange('status_date', date)}
                  className="col-span-3 h-9 text-right"
                /&gt;
              &lt;/div&gt;
              &lt;div className="grid grid-cols-4 items-center gap-4"&gt;
                &lt;Label htmlFor="remarks_text_dialog" className="text-right col-span-1"&gt;הערות&lt;/Label&gt;
                &lt;Textarea
                  id="remarks_text_dialog"
                  value={editingInvoiceData.remark.text || ""}
                  onChange={(e) =&gt; handleEditDialogInputChange('text', e.target.value)}
                  className="col-span-3 min-h-[80px] text-right"
                  rows={3}
                /&gt;
              &lt;/div&gt;
              &lt;div className="grid grid-cols-4 items-center gap-4"&gt;
                &lt;Label htmlFor="follow_up_date_dialog" className="text-right col-span-1"&gt;תאריך מעקב&lt;/Label&gt;
                 &lt;DatePicker
                  id="follow_up_date_dialog"
                  date={editingInvoiceData.remark.follow_up_date &amp;&amp; isValid(parseISO(editingInvoiceData.remark.follow_up_date)) ? parseISO(editingInvoiceData.remark.follow_up_date) : undefined}
                  setDate={(date) =&gt; handleEditDialogInputChange('follow_up_date', date)}
                  className="col-span-3 h-9 text-right"
                /&gt;
              &lt;/div&gt;
            &lt;/div&gt;
            &lt;DialogFooter&gt;
              &lt;Button variant="outline" onClick={() =&gt; setIsEditDialogOpen(false)}&gt;ביטול&lt;/Button&gt;
              &lt;Button onClick={handleSaveEditDialog} disabled={updatingRemarksIvs.has(editingInvoiceData.invoice.IVNUM)}&gt;
                {updatingRemarksIvs.has(editingInvoiceData.invoice.IVNUM) &amp;&amp; &lt;LoadingSpinner size={16} className="mr-2 rtl:ml-2 rtl:mr-0"/&gt;}
                שמור שינויים
              &lt;/Button&gt;
            &lt;/DialogFooter&gt;
          &lt;/DialogContent&gt;
        &lt;/Dialog&gt;
      )}
    &lt;/Card&gt;
  );
}

    