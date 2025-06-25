
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
  onUpdateRemark: (invoiceId: string, updates: Partial<InvoiceRemark>) => Promise<void>;
  updatingRemarksIvs: Set<string>;
  isLoading: boolean;
  onSort: (sortKey: keyof Invoice | string) => void;
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

const defaultRemark = (invoiceId: string): InvoiceRemark => ({
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
  remarks: Map<string, InvoiceRemark>
): GroupSubtotal => {
  let openAmount = 0;
  let openCount = 0;
  let totalAmount = 0;
  let totalCount = groupInvoices.length;

  groupInvoices.forEach(inv => {
    totalAmount += inv.SUM;
    const remark = remarks.get(inv.IVNUM) || defaultRemark(inv.IVNUM);
    if (remark.status !== 'שולם' && remark.status !== 'בוטל') {
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

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({}); // New state for individual row expansion
  const [selectedInvoices, setSelectedInvoices] = useState<Record<string, boolean>>({});
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingInvoiceData, setEditingInvoiceData] = useState<{invoice: Invoice | null, remark: InvoiceRemark | null}>({invoice: null, remark: null});

  const allFilteredInvoicesSelected = useMemo(() => {
    if (invoices.length === 0) return false;
    return invoices.every(inv => selectedInvoices[inv.IVNUM]);
  }, [invoices, selectedInvoices]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const toggleRowExpansion = (invoiceId: string) => {
    setExpandedRows(prev => ({ ...prev, [invoiceId]: !prev[invoiceId] }));
  };

  const expandAllGroups = () => {
    const allExpanded: Record<string, boolean> = {};
    invoices.forEach(inv => {
      if (inv.ACCDES) allExpanded[inv.ACCDES] = true;
    });
    setExpandedGroups(allExpanded);
  };

  const collapseAllGroups = () => {
    setExpandedGroups({});
  };

  const handleSelectAllFiltered = (checked: boolean) => {
    const newSelected: Record<string, boolean> = {};
    if (checked) {
      invoices.forEach(inv => newSelected[inv.IVNUM] = true);
    }
    setSelectedInvoices(newSelected);
  };

  const handleGroupSelect = (groupKey: string, checked: boolean) => {
    const invoicesInGroup = invoices.filter(i => i.ACCDES === groupKey);
    setSelectedInvoices(prev => {
      const newSelected = { ...prev };
      invoicesInGroup.forEach(inv => newSelected[inv.IVNUM] = checked);
      return newSelected;
    });
  };

  const handleInvoiceSelect = (invoiceId: string, checked: boolean) => {
    setSelectedInvoices(prev => ({ ...prev, [invoiceId]: checked }));
  };

  const handleOpenEditDialog = (invoice: Invoice) => {
    const remark = remarksMap.get(invoice.IVNUM) || defaultRemark(invoice.IVNUM);
    setEditingInvoiceData({ invoice, remark });
    setIsEditDialogOpen(true);
  };

  const handleSaveEditDialog = async () => {
    if (!editingInvoiceData.invoice || !editingInvoiceData.remark) return;
    const { id, invoiceId, ...updatePayload } = editingInvoiceData.remark;
    await onUpdateRemark(editingInvoiceData.invoice.IVNUM, updatePayload as Partial<InvoiceRemark>);
    setIsEditDialogOpen(false);
    setEditingInvoiceData({invoice: null, remark: null});
  };

  const handleEditDialogInputChange = (field: keyof InvoiceRemark, value: string | PaymentStatus | Date | undefined) => {
    if (editingInvoiceData.remark) {
      let processedValue = value;
      if ((field === 'status_date' || field === 'follow_up_date') && value instanceof Date) {
        processedValue = formatISO(value);
      } else if ((field === 'status_date' || field === 'follow_up_date') && value === undefined){
        processedValue = undefined;
      }
      setEditingInvoiceData(prev => ({
        ...prev,
        remark: {
          ...prev.remark!,
          [field]: processedValue,
          ...(field === 'status' && !prev.remark!.status_date && { status_date: formatISO(new Date()) })
        }
      }));
    }
  };

  const renderSortIcon = (columnKey: string) => {
    if (sortKey !== columnKey) {
      return <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground/50 rtl:mr-2 rtl:ml-0" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0" /> : <ArrowDown className="ml-2 h-4 w-4 rtl:mr-2 rtl:ml-0" />;
  };

  const renderTableRows = () => {
    if (isLoading && invoices.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={columnConfiguration.length + 2} className="h-24 text-center"> {/* +2 for checkbox & expander */}
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
          <TableCell colSpan={columnConfiguration.length + 2} className="h-24 text-center text-muted-foreground"> {/* +2 */}
            אין נתונים להצגה.
          </TableCell>
        </TableRow>
      );
    }

    const rows: JSX.Element[] = [];
    let currentCustomerAccDesc: string | null = null;
    let currentGroupInvoices: Invoice[] = [];

    invoices.forEach((invoice, idx) => {
      const customerAccDesc = invoice.ACCDES;

      if (customerAccDesc !== currentCustomerAccDesc) {
        if (currentCustomerAccDesc !== null && currentGroupInvoices.length > 0) {
          const subtotals = calculateGroupSubtotals(currentGroupInvoices, remarksMap);
          rows.push(
            <TableRow key={`subtotal-${currentCustomerAccDesc}`} className="bg-muted/50 font-semibold">
              <TableCell className="px-2 py-1.5 text-center"></TableCell> {/* Checkbox placeholder */}
              <TableCell className="px-2 py-1.5 text-center"></TableCell> {/* Expander placeholder */}
              <TableCell colSpan={4} className="text-right px-2 py-3"> {/* ACCDES, ACCNAME, IVNUM, CURDATE, FNCDATE (actually 5, but use 4 here as sum is next) */}
                סה"כ {currentCustomerAccDesc}:
              </TableCell>
              <TableCell className="text-right px-2 py-3">{formatCurrency(subtotals.totalAmount)} ({subtotals.totalCount} חשב')</TableCell> {/* SUM */}
              <TableCell className="text-right px-2 py-3 text-destructive">{formatCurrency(subtotals.openAmount)} ({subtotals.openCount} פתוחות)</TableCell> {/* payment_status used for open amount */}
              <TableCell className="text-right px-2 py-3"></TableCell> {/* Actions placeholder */}
            </TableRow>
          );
        }
        currentCustomerAccDesc = customerAccDesc;
        currentGroupInvoices = [];

        rows.push(
          <TableRow
            key={`header-${customerAccDesc}-${idx}`}
            className="bg-secondary/70 text-secondary-foreground hover:bg-secondary/90"
          >
            <TableCell className="px-2 py-2 text-center w-12">
                <Checkbox
                  checked={invoices.filter(i => i.ACCDES === customerAccDesc).every(inv => selectedInvoices[inv.IVNUM]) && invoices.filter(i => i.ACCDES === customerAccDesc).length > 0}
                  onCheckedChange={(checked) => handleGroupSelect(customerAccDesc, !!checked)}
                  aria-label={`בחר את כל החשבוניות של ${customerAccDesc}`}
                  onClick={(e) => e.stopPropagation()}
                />
            </TableCell>
            <TableCell className="px-2 py-2 text-center w-12"> {/* Expander column header placeholder */}
                 <Button variant="ghost" size="icon" onClick={() => toggleGroup(customerAccDesc)} className="h-7 w-7" aria-label={expandedGroups[customerAccDesc] ? "כווץ קבוצה" : "הרחב קבוצה"}>
                    {expandedGroups[customerAccDesc] ? <ChevronDownIcon className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
                  </Button>
            </TableCell>
            <TableCell
              className="text-right font-bold px-2 py-2 text-lg cursor-pointer"
              onClick={() => toggleGroup(customerAccDesc)}
              colSpan={columnConfiguration.length} 
            >
              {customerAccDesc} (לקוח: {invoice.ACCNAME})
            </TableCell>
          </TableRow>
        );
      }

      currentGroupInvoices.push(invoice);

      if (expandedGroups[customerAccDesc]) {
        const remark = remarksMap.get(invoice.IVNUM) || defaultRemark(invoice.IVNUM);
        const isUpdatingThisRemark = updatingRemarksIvs.has(invoice.IVNUM);
        const isRowExpanded = !!expandedRows[invoice.IVNUM];

        rows.push(
          <Fragment key={`${invoice.IVNUM}-${invoice.KLINE}-fragment`}>
            <TableRow 
              className="transition-colors duration-100 ease-in-out hover:bg-muted/30 data-[selected=true]:bg-blue-100 dark:data-[selected=true]:bg-blue-900/30" 
              data-selected={selectedInvoices[invoice.IVNUM]}
              onClick={(e) => {
                 const target = e.target as HTMLElement;
                 if (target.closest('[data-no-expand="true"]')) return;
                 toggleRowExpansion(invoice.IVNUM);
              }}
            >
              <TableCell className="px-2 py-1.5 text-center w-12" data-no-expand="true">
                  <Checkbox
                      checked={!!selectedInvoices[invoice.IVNUM]}
                      onCheckedChange={(checked) => handleInvoiceSelect(invoice.IVNUM, !!checked)}
                      aria-label={`בחר חשבונית ${invoice.IVNUM}`}
                  />
              </TableCell>
              <TableCell className="px-2 py-1.5 text-center w-12" data-no-expand="true">
                <Button variant="ghost" size="icon" onClick={() => toggleRowExpansion(invoice.IVNUM)} className="h-7 w-7" aria-label={isRowExpanded ? "כווץ שורה" : "הרחב שורה"}>
                  {isRowExpanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                </Button>
              </TableCell>
              {columnConfiguration.map((col) => {
                let displayData: React.ReactNode;
                if (col.key === "actions") {
                  displayData = (
                    <div data-no-expand="true">
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenEditDialog(invoice);}} className="h-7 w-7">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                } else if (col.key === "payment_status") {
                    displayData = isUpdatingThisRemark ? <LoadingSpinner size={16} /> : (
                      <div data-no-expand="true" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={remark.status}
                          onValueChange={(value: PaymentStatus) => {
                            onUpdateRemark(invoice.IVNUM, { status: value, status_date: formatISO(new Date()) });
                          }}
                          disabled={isUpdatingThisRemark}
                          dir="rtl"
                        >
                          <SelectTrigger className="w-full min-w-[150px] h-9 text-xs text-right">
                            <SelectValue placeholder="בחר סטטוס" />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_STATUS_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <Badge variant={opt.badgeVariant} className="mr-2 rtl:ml-2 rtl:mr-0 w-3 h-3 p-0 rounded-full" />
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
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
                  <TableCell
                    key={`${invoice.IVNUM}-${col.key}`}
                    className={`px-2 py-1.5 text-right text-xs ${col.className || ''} ${isRowExpanded ? '' : 'cursor-pointer'}`}
                  >
                    {displayData}
                  </TableCell>
                );
              })}
            </TableRow>
            {isRowExpanded && (
              <TableRow key={`${invoice.IVNUM}-details`} className="bg-muted/5 dark:bg-muted/10">
                <TableCell className="px-2 py-1.5 text-center"></TableCell> {/* Checkbox placeholder offset */}
                <TableCell className="px-2 py-1.5 text-center"></TableCell> {/* Expander placeholder offset */}
                <TableCell colSpan={columnConfiguration.length} className="p-0">
                  <div className="p-3 space-y-3 bg-background dark:bg-card rounded-md m-1 border">
                    <h4 className="text-sm font-semibold mb-1 text-foreground">פרטים נוספים:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3 text-xs">
                      <div className="space-y-1">
                        <Label htmlFor={`follow_up_date-${invoice.IVNUM}`} className="text-muted-foreground">תאריך מעקב</Label>
                        <DatePicker 
                          id={`follow_up_date-${invoice.IVNUM}`} 
                          date={remark.follow_up_date && isValid(parseISO(remark.follow_up_date)) ? parseISO(remark.follow_up_date) : undefined}
                          setDate={(date) => onUpdateRemark(invoice.IVNUM, { follow_up_date: date ? formatISO(date) : undefined })}
                          placeholder="בחר תאריך"
                          className="w-full h-9 text-xs"
                          disabled={isUpdatingThisRemark}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`status_date-${invoice.IVNUM}`} className="text-muted-foreground">תאריך סטטוס</Label>
                        <DatePicker
                          id={`status_date-${invoice.IVNUM}`}
                          date={remark.status_date && isValid(parseISO(remark.status_date)) ? parseISO(remark.status_date) : undefined}
                          setDate={(date) => onUpdateRemark(invoice.IVNUM, { status_date: date ? formatISO(date) : undefined })}
                          placeholder="בחר תאריך"
                          className="w-full h-9 text-xs"
                          disabled={isUpdatingThisRemark}
                        />
                      </div>
                       <div className="md:col-span-3 space-y-1">
                        <Label htmlFor={`text-${invoice.IVNUM}`} className="text-muted-foreground">הערות</Label>
                        <Textarea
                          id={`text-${invoice.IVNUM}`}
                          defaultValue={remark.text || ""}
                          onBlur={(e) => onUpdateRemark(invoice.IVNUM, { text: e.target.value })}
                          placeholder="הזן הערה..."
                          className="min-w-full text-xs h-auto py-1.5 px-2.5"
                          rows={2}
                          disabled={isUpdatingThisRemark}
                        />
                      </div>
                    </div>
                    {isUpdatingThisRemark && <div className="flex justify-center pt-2"><LoadingSpinner size={20} /></div>}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        );
      }
    });

    if (currentCustomerAccDesc !== null && currentGroupInvoices.length > 0) {
      const subtotals = calculateGroupSubtotals(currentGroupInvoices, remarksMap);
      rows.push(
         <TableRow key={`subtotal-${currentCustomerAccDesc}-final`} className="bg-muted/50 font-semibold">
              <TableCell className="px-2 py-1.5 text-center"></TableCell> {/* Checkbox placeholder */}
              <TableCell className="px-2 py-1.5 text-center"></TableCell> {/* Expander placeholder */}
              <TableCell colSpan={4} className="text-right px-2 py-3"> {/* ACCDES, ACCNAME, IVNUM, CURDATE, FNCDATE (actually 5, but use 4 here as sum is next) */}
                סה"כ {currentCustomerAccDesc}:
              </TableCell>
              <TableCell className="text-right px-2 py-3">{formatCurrency(subtotals.totalAmount)} ({subtotals.totalCount} חשב')</TableCell> {/* SUM */}
              <TableCell className="text-right px-2 py-3 text-destructive">{formatCurrency(subtotals.openAmount)} ({subtotals.openCount} פתוחות)</TableCell> {/* payment_status used for open amount */}
              <TableCell className="text-right px-2 py-3"></TableCell> {/* Actions placeholder */}
        </TableRow>
      );
    }
    return rows;
  };

  const hasSelected = Object.values(selectedInvoices).some(Boolean);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">נתוני חשבוניות</CardTitle>
        <div className="flex justify-between items-center pt-2">
            <div className="flex space-x-2 rtl:space-x-reverse">
                <Button variant="outline" size="sm" onClick={expandAllGroups}>הרחב קבוצות</Button>
                <Button variant="outline" size="sm" onClick={collapseAllGroups}>כווץ קבוצות</Button>
            </div>
            <div className="flex space-x-2 rtl:space-x-reverse">
                <Button variant="outline" size="sm" disabled={!hasSelected} onClick={() => alert('שליחת מייל - לא מיושם')}>
                    <Mail className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0"/>שלח מייל
                </Button>
                <Button variant="outline" size="sm" disabled={!hasSelected} onClick={() => alert('שליחת SMS - לא מיושם')}>
                    <MessageSquareText className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0"/>שלח SMS
                </Button>
                <Button variant="outline" size="sm" disabled={!hasSelected} onClick={() => alert('הדפסה - לא מיושם')}>
                    <Printer className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0"/>הדפסה
                </Button>
                <Button variant="outline" size="sm" disabled={!hasSelected} onClick={() => alert('ייצוא לאקסל - לא מיושם')}>
                    <FileSpreadsheet className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0"/>ייצוא לאקסל
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-320px)] w-full rounded-md border" dir="rtl"> {/* Adjusted height slightly */}
          <Table>
            <TableCaption className="py-4">
              {isLoading && invoices.length === 0
                ? "טוען חשבוניות..."
                : !isLoading && invoices.length === 0
                ? "לא נמצאו חשבוניות התואמות את החיפוש."
                : `מציג ${invoices.length} חשבוניות.`}
            </TableCaption>
            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm"> {/* Reduced z-index, sticky positioning removed from individual THs */}
              <TableRow>
                <TableHead className="w-12 px-2 py-3 text-center">
                    <Checkbox
                        checked={allFilteredInvoicesSelected}
                        onCheckedChange={(checked) => handleSelectAllFiltered(!!checked)}
                        aria-label="בחר את כל החשבוניות"
                    />
                </TableHead>
                <TableHead className="w-12 px-2 py-3 text-center"> {/* Header for expander column */}
                </TableHead>
                {columnConfiguration.map((col) => (
                  <TableHead
                    key={col.key}
                    className={`whitespace-nowrap text-right px-2 py-3 ${col.className || ''} ${col.isSortable ? 'cursor-pointer' : ''}`}
                    onClick={col.isSortable ? () => onSort(col.key) : undefined}
                  >
                     <div className="flex items-center justify-end rtl:justify-start">
                        <span className="text-right">{col.label}</span>
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

      {isEditDialogOpen && editingInvoiceData.invoice && editingInvoiceData.remark && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>עריכת הערה לחשבונית {editingInvoiceData.invoice.IVNUM}</DialogTitle>
              <DialogDescription>
                לקוח: {editingInvoiceData.invoice.ACCDES} ({editingInvoiceData.invoice.ACCNAME})
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="payment_status_dialog" className="text-right col-span-1">סטטוס תשלום</Label>
                <Select
                  value={editingInvoiceData.remark.status}
                  onValueChange={(value: PaymentStatus) => handleEditDialogInputChange('status', value)}
                  dir="rtl"
                >
                  <SelectTrigger id="payment_status_dialog" className="col-span-3 h-9 text-right">
                    <SelectValue placeholder="בחר סטטוס" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status_date_dialog" className="text-right col-span-1">תאריך סטטוס</Label>
                <DatePicker
                  id="status_date_dialog"
                  date={editingInvoiceData.remark.status_date && isValid(parseISO(editingInvoiceData.remark.status_date)) ? parseISO(editingInvoiceData.remark.status_date) : undefined}
                  setDate={(date) => handleEditDialogInputChange('status_date', date)}
                  className="col-span-3 h-9 text-right"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="remarks_text_dialog" className="text-right col-span-1">הערות</Label>
                <Textarea
                  id="remarks_text_dialog"
                  value={editingInvoiceData.remark.text || ""}
                  onChange={(e) => handleEditDialogInputChange('text', e.target.value)}
                  className="col-span-3 min-h-[80px] text-right"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="follow_up_date_dialog" className="text-right col-span-1">תאריך מעקב</Label>
                 <DatePicker
                  id="follow_up_date_dialog"
                  date={editingInvoiceData.remark.follow_up_date && isValid(parseISO(editingInvoiceData.remark.follow_up_date)) ? parseISO(editingInvoiceData.remark.follow_up_date) : undefined}
                  setDate={(date) => handleEditDialogInputChange('follow_up_date', date)}
                  className="col-span-3 h-9 text-right"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>ביטול</Button>
              <Button onClick={handleSaveEditDialog} disabled={updatingRemarksIvs.has(editingInvoiceData.invoice.IVNUM)}>
                {updatingRemarksIvs.has(editingInvoiceData.invoice.IVNUM) && <LoadingSpinner size={16} className="mr-2 rtl:ml-2 rtl:mr-0"/>}
                שמור שינויים
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

    