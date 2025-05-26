
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
import { ArrowUp, ArrowDown, ChevronsUpDown, Pencil, Mail, MessageSquareText, Printer, FileSpreadsheet, ChevronDown as ChevronDownIcon, ChevronRight as ChevronRightIcon } from "lucide-react";
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
  key: keyof Invoice | keyof InvoiceRemark | string;
  label: string;
  isSortable?: boolean;
  isRemarkField?: boolean;
  className?: string;
}

const columnConfiguration: ColumnDefinition[] = [
  { key: "actions", label: "פעולות", isSortable: false, className: "min-w-[80px] text-center" },
  { key: "follow_up_date", label: "תאריך מעקב", isSortable: true, isRemarkField: true, className: "min-w-[180px] text-right" },
  { key: "text", label: "הערות", isSortable: false, isRemarkField: true, className: "min-w-[250px] text-right" },
  { key: "status_date", label: "תאריך סטטוס", isSortable: true, isRemarkField: true, className: "min-w-[180px] text-right" },
  { key: "payment_status", label: "סטטוס תשלום", isSortable: true, isRemarkField: true, className: "min-w-[180px] text-right" },
  { key: "SUM", label: "סכום", isSortable: true, className: "min-w-[100px] text-right" },
  { key: "FNCDATE", label: "תאריך פרעון", isSortable: true, className: "min-w-[100px] text-right" },
  { key: "CURDATE", label: "תאריך חשבונית", isSortable: true, className: "min-w-[100px] text-right" },
  { key: "IVNUM", label: "מספר חשבונית", isSortable: true, className: "min-w-[120px] text-right" },
  { key: "ACCNAME", label: "שם לקוח", isSortable: true, className: "min-w-[180px] sticky right-[220px] bg-card z-20 text-right" },
  { key: "ACCDES", label: "מ. לקוח", isSortable: true, className: "min-w-[220px] sticky right-0 bg-card z-20 text-right" },
].reverse();


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

  const expandAllGroups = () => {
    const allExpanded: Record<string, boolean> = {};
    invoices.forEach(inv => {
      // Group by ACCDES as per current grouping logic
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

  const handleGroupSelect = (groupKey: string, groupInv: Invoice[], checked: boolean) => {
     // Ensure groupInv is derived correctly based on ACCDES
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
          <TableCell colSpan={columnConfiguration.length + 1} className="h-24 text-center">
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
          <TableCell colSpan={columnConfiguration.length + 1} className="h-24 text-center text-muted-foreground">
            אין נתונים להצגה.
          </TableCell>
        </TableRow>
      );
    }

    const rows: JSX.Element[] = [];
    let currentCustomerAccDesc: string | null = null;
    let currentGroupInvoices: Invoice[] = [];

    invoices.forEach((invoice, idx) => {
      const customerAccDesc = invoice.ACCDES; // Grouping by ACCDES

      if (customerAccDesc !== currentCustomerAccDesc) {
        // Render subtotal for previous group if it exists
        if (currentCustomerAccDesc !== null && currentGroupInvoices.length > 0) {
          const subtotals = calculateGroupSubtotals(currentGroupInvoices, remarksMap);
          rows.push(
            <TableRow key={`subtotal-${currentCustomerAccDesc}`} className="bg-muted/50 font-semibold">
              <TableCell
                colSpan={2}
                className="text-right px-2 py-3 sticky right-0 bg-muted/50 z-10"
                style={{ right: '0px' }} // Adjusted for checkbox column
              >
                 סה"כ {currentCustomerAccDesc}:
              </TableCell>
              <TableCell className="sticky right-[220px] bg-muted/50 z-10 text-right"></TableCell> {/* Placeholder for ACCNAME */}
              <TableCell className="text-right"></TableCell> {/* IVNUM */}
              <TableCell className="text-right"></TableCell> {/* CURDATE */}
              <TableCell className="text-right"></TableCell> {/* FNCDATE */}
              <TableCell className="text-right px-2 py-3">{formatCurrency(subtotals.totalAmount)} ({subtotals.totalCount} חשב')</TableCell>
              <TableCell className="text-right px-2 py-3 text-destructive">{formatCurrency(subtotals.openAmount)} ({subtotals.openCount} פתוחות)</TableCell>
              <TableCell colSpan={columnConfiguration.length - 8} className="text-right"></TableCell>
            </TableRow>
          );
        }

        // Start new group
        currentCustomerAccDesc = customerAccDesc;
        currentGroupInvoices = []; // Reset for new group

        // Group header row
        rows.push(
          <TableRow
            key={`header-${customerAccDesc}-${idx}`} // Added idx for more unique key
            className="bg-secondary/70 text-secondary-foreground hover:bg-secondary/90"
          >
            <TableCell className="px-2 py-2 sticky right-0 bg-secondary/70 z-10 w-12 text-center">
                <Checkbox
                  checked={invoices.filter(i => i.ACCDES === customerAccDesc).every(inv => selectedInvoices[inv.IVNUM]) && invoices.filter(i => i.ACCDES === customerAccDesc).length > 0}
                  onCheckedChange={(checked) => handleGroupSelect(customerAccDesc, invoices.filter(i => i.ACCDES === customerAccDesc), !!checked)}
                  aria-label={`בחר את כל החשבוניות של ${customerAccDesc}`}
                />
            </TableCell>
            <TableCell
              className="text-right font-bold px-2 py-2 text-lg sticky right-[48px] bg-secondary/70 z-10 cursor-pointer"
              onClick={() => toggleGroup(customerAccDesc)}
              colSpan={columnConfiguration.length}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                    {expandedGroups[customerAccDesc] ? <ChevronDownIcon className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0" /> : <ChevronRightIcon className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0" />}
                    {customerAccDesc} (לקוח: {invoice.ACCNAME})
                </div>
              </div>
            </TableCell>
          </TableRow>
        );
      }

      currentGroupInvoices.push(invoice);

      if (expandedGroups[customerAccDesc]) {
        const remark = remarksMap.get(invoice.IVNUM) || defaultRemark(invoice.IVNUM);
        const isUpdatingThisRemark = updatingRemarksIvs.has(invoice.IVNUM);

        rows.push(
          <TableRow key={`${invoice.IVNUM}-${invoice.KLINE}`} className="transition-colors duration-100 ease-in-out hover:bg-muted/30 data-[selected=true]:bg-blue-100 dark:data-[selected=true]:bg-blue-900/30" data-selected={selectedInvoices[invoice.IVNUM]}>
            <TableCell className="px-2 py-1.5 text-center sticky right-0 bg-card z-10 w-12">
                <Checkbox
                    checked={!!selectedInvoices[invoice.IVNUM]}
                    onCheckedChange={(checked) => handleInvoiceSelect(invoice.IVNUM, !!checked)}
                    aria-label={`בחר חשבונית ${invoice.IVNUM}`}
                />
            </TableCell>
            {columnConfiguration.map((col) => {
              let displayData: React.ReactNode;
              const isSticky = col.key === "ACCDES" || col.key === "ACCNAME";
               // ACCDES is right-most (0px), ACCNAME is to its left.
              const stickyOffset = col.key === "ACCDES" ? "48px" : col.key === "ACCNAME" ? "268px" : undefined;


              if (col.key === "actions") {
                displayData = (
                  <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(invoice)} className="h-7 w-7">
                    <Pencil className="h-4 w-4" />
                  </Button>
                );
              } else if (col.isRemarkField) {
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
                  );
                } else if (col.key === "status_date") {
                    const dateVal = remark.status_date && isValid(parseISO(remark.status_date)) ? parseISO(remark.status_date) : undefined;
                    displayData = isUpdatingThisRemark ? <LoadingSpinner size={16} /> : (
                      <DatePicker
                        date={dateVal}
                        setDate={(date) => {
                          onUpdateRemark(invoice.IVNUM, { status_date: date ? formatISO(date) : undefined });
                        }}
                        placeholder="בחר תאריך"
                        className="w-full min-w-[150px] h-9 text-xs text-right"
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
                  const dateVal = remark.follow_up_date && isValid(parseISO(remark.follow_up_date)) ? parseISO(remark.follow_up_date) : undefined;
                  displayData = isUpdatingThisRemark ? <LoadingSpinner size={16} /> : (
                      <DatePicker
                        date={dateVal}
                        setDate={(date) => {
                          onUpdateRemark(invoice.IVNUM, { follow_up_date: date ? formatISO(date) : undefined });
                        }}
                        placeholder="בחר תאריך"
                        className="w-full min-w-[150px] h-9 text-xs text-right"
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
                  className={`px-2 py-1.5 text-right text-xs ${col.className || ''} ${isSticky ? 'bg-card' : 'bg-background dark:bg-card'}`}
                  style={isSticky ? { position: 'sticky', right: stickyOffset, zIndex: 10 } : {}}
                >
                  {displayData}
                </TableCell>
              );
            })}
          </TableRow>
        );
      }
    });

    // Render subtotal for the last group
    if (currentCustomerAccDesc !== null && currentGroupInvoices.length > 0) {
      const subtotals = calculateGroupSubtotals(currentGroupInvoices, remarksMap);
      rows.push(
        <TableRow key={`subtotal-${currentCustomerAccDesc}-final`} className="bg-muted/50 font-semibold">
              <TableCell
                colSpan={2}
                className="text-right px-2 py-3 sticky right-0 bg-muted/50 z-10"
                style={{ right: '0px' }} // Adjusted for checkbox column
              >
                 סה"כ {currentCustomerAccDesc}:
              </TableCell>
              <TableCell className="sticky right-[220px] bg-muted/50 z-10 text-right"></TableCell> {/* Placeholder for ACCNAME */}
              <TableCell className="text-right"></TableCell> {/* IVNUM */}
              <TableCell className="text-right"></TableCell> {/* CURDATE */}
              <TableCell className="text-right"></TableCell> {/* FNCDATE */}
              <TableCell className="text-right px-2 py-3">{formatCurrency(subtotals.totalAmount)} ({subtotals.totalCount} חשב')</TableCell>
              <TableCell className="text-right px-2 py-3 text-destructive">{formatCurrency(subtotals.openAmount)} ({subtotals.openCount} פתוחות)</TableCell>
              <TableCell colSpan={columnConfiguration.length - 8} className="text-right"></TableCell>
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
                <Button variant="outline" size="sm" onClick={expandAllGroups}>הרחב הכל</Button>
                <Button variant="outline" size="sm" onClick={collapseAllGroups}>כווץ הכל</Button>
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
        <ScrollArea className="h-[calc(100vh-300px)] w-full rounded-md border" dir="rtl">
          <Table>
            <TableCaption className="py-4">
              {isLoading && invoices.length === 0
                ? "טוען חשבוניות..."
                : !isLoading && invoices.length === 0
                ? "לא נמצאו חשבוניות התואמות את החיפוש."
                : `מציג ${invoices.length} חשבוניות.`}
            </TableCaption>
            <TableHeader className="sticky top-0 bg-card z-30 shadow-sm">
              <TableRow>
                <TableHead className="w-12 px-2 py-3 text-center sticky right-0 bg-card z-31">
                    <Checkbox
                        checked={allFilteredInvoicesSelected}
                        onCheckedChange={(checked) => handleSelectAllFiltered(!!checked)}
                        aria-label="בחר את כל החשבוניות"
                    />
                </TableHead>
                {columnConfiguration.map((col) => (
                  <TableHead
                    key={col.key}
                    className={`whitespace-nowrap text-right px-2 py-3 ${col.className || ''} ${col.isSortable ? 'cursor-pointer' : ''} ${col.key === "ACCDES" || col.key === "ACCNAME" ? 'bg-card' : ''}`}
                    onClick={col.isSortable ? () => onSort(col.key) : undefined}
                     // Adjust sticky positioning for ACCDES (rightmost after checkbox) and ACCNAME
                    style={col.key === "ACCDES" ? { position: 'sticky', right: '48px', zIndex: 31 } : col.key === "ACCNAME" ? { position: 'sticky', right: '268px', zIndex: 31 } : {}}
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
                  date={editingInvoiceData.remark.status_date && isValid(parseISO(editingInvoiceData.remark.status_date)) ? parseISO(editingInvoiceData.remark.status_date) : undefined}
                  setDate={(date) => handleEditDialogInputChange('status_date', date)}
                  className="col-span-3 h-9 text-right"
                  id="status_date_dialog"
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
                  date={editingInvoiceData.remark.follow_up_date && isValid(parseISO(editingInvoiceData.remark.follow_up_date)) ? parseISO(editingInvoiceData.remark.follow_up_date) : undefined}
                  setDate={(date) => handleEditDialogInputChange('follow_up_date', date)}
                  className="col-span-3 h-9 text-right"
                  id="follow_up_date_dialog"
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

