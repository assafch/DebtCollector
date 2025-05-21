
"use client";

import type { Invoice } from "@/types/invoice";
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
import { formatDateString } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react"; // Added ChevronsUpDown for neutral state

interface InvoiceDataTableProps {
  invoices: Invoice[];
  isLoading: boolean;
  onSort: (sortKey: keyof Invoice | string) => void;
  sortKey: keyof Invoice | string | null;
  sortDirection: 'asc' | 'desc';
}

const columnHeaders: Array<{ key: keyof Invoice | (string & {}), label: string }> = [
  { key: "ACCNAME", label: "Account Name" },
  { key: "ACCDES", label: "Description" },
  { key: "CURDATE", label: "Date" },
  { key: "FNCDATE", label: "Finance Date" },
  { key: "IVNUM", label: "Invoice #" },
  { key: "SUM", label: "Amount" },
  { key: "FNCPATNAME", label: "Payment Method" },
  { key: "INVOICEFLAG", label: "Flag" },
  { key: "FNCTRANS", label: "Transaction ID" },
  { key: "KLINE", label: "Line" },
].reverse(); // Reversed for RTL display - Account Name is first (rightmost in RTL)

export function InvoiceDataTable({ invoices, isLoading, onSort, sortKey, sortDirection }: InvoiceDataTableProps) {
  
  const renderSortIcon = (columnKey: keyof Invoice | string) => {
    if (sortKey !== columnKey) {
      return <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Invoice Data</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] w-full rounded-md border">
          <Table>
            <TableCaption className="py-4">
              {isLoading
                ? "Loading invoices..."
                : invoices.length === 0
                ? "No invoices found matching your criteria."
                : `Showing ${invoices.length} invoices.`}
            </TableCaption>
            <TableHeader className="sticky top-0 bg-secondary z-10">
              <TableRow>
                {columnHeaders.map((col) => (
                  <TableHead key={col.key} className="whitespace-nowrap text-right px-2 py-3"> {/* Ensure padding for button */}
                    <Button
                      variant="ghost"
                      onClick={() => onSort(col.key)}
                      className="px-1 py-0.5 h-auto w-full justify-end hover:bg-muted/80" // RTL: justify-end
                    >
                      {col.label}
                      {renderSortIcon(col.key)}
                    </Button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={columnHeaders.length} className="h-24 text-center">
                    <div className="flex justify-center items-center">
                       <LoadingSpinner size={32} />
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columnHeaders.length} className="h-24 text-center text-muted-foreground">
                    No data available.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                invoices.map((invoice, index) => (
                  <TableRow key={`${invoice.IVNUM}-${invoice.KLINE}-${index}`} className="transition-opacity duration-300 ease-in-out hover:bg-muted/50">
                    {columnHeaders.map((col) => {
                      const cellData = invoice[col.key as keyof Invoice];
                      let displayData: React.ReactNode = cellData === null || cellData === undefined ? "" : cellData;

                      if (col.key === "CURDATE" || col.key === "FNCDATE") {
                        displayData = formatDateString(cellData as string);
                      } else if (col.key === "SUM") {
                        displayData = typeof cellData === 'number' ? (cellData as number).toFixed(2) : "";
                      } else if (col.key === "INVOICEFLAG") {
                        displayData = <Badge variant={(cellData as string) === 'Y' ? 'default' : 'secondary'}>{cellData as string}</Badge>;
                      }
                      
                      return (
                        <TableCell 
                          key={col.key} 
                          className={`whitespace-nowrap px-2 py-3 ${col.key === "SUM" || col.key === "KLINE" ? "text-left" : "text-right"}`}
                        >
                          {displayData}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
