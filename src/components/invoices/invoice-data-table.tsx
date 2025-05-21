
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
import { formatDateString } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InvoiceDataTableProps {
  invoices: Invoice[];
  isLoading: boolean;
}

// Reversed for RTL display
const columnHeaders: Array<{ key: keyof Invoice | (string & {}), label: string }> = [
  { key: "KLINE", label: "Line" },
  { key: "FNCTRANS", label: "Transaction ID" },
  { key: "INVOICEFLAG", label: "Flag" },
  { key: "FNCPATNAME", label: "Payment Method" },
  { key: "SUM", label: "Amount" },
  { key: "IVNUM", label: "Invoice #" },
  { key: "FNCDATE", label: "Finance Date" },
  { key: "CURDATE", label: "Date" },
  { key: "ACCDES", label: "Description" },
  { key: "ACCNAME", label: "Account Name" },
].reverse(); // Ensure Account Name is first (rightmost in RTL)

export function InvoiceDataTable({ invoices, isLoading }: InvoiceDataTableProps) {
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
                  <TableHead key={col.key} className="whitespace-nowrap text-right"> {/* Added text-right for header */}
                    {col.label}
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
                      let displayData: React.ReactNode = cellData;

                      if (col.key === "CURDATE" || col.key === "FNCDATE") {
                        displayData = formatDateString(cellData as string);
                      } else if (col.key === "SUM") {
                        displayData = (cellData as number).toFixed(2);
                      } else if (col.key === "INVOICEFLAG") {
                        displayData = <Badge variant={(cellData as string) === 'Y' ? 'default' : 'secondary'}>{cellData as string}</Badge>;
                      }
                      
                      return (
                        <TableCell 
                          key={col.key} 
                          className={`whitespace-nowrap ${col.key === "SUM" || col.key === "KLINE" ? "text-left" : "text-right"}`} // Align numbers to left in RTL, others to right
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
