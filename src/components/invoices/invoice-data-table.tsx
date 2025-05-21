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

const columnHeaders = [
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
];

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
                  <TableHead key={col.key} className="whitespace-nowrap">{col.label}</TableHead>
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
                    <TableCell className="font-medium whitespace-nowrap">{invoice.ACCNAME}</TableCell>
                    <TableCell className="whitespace-nowrap">{invoice.ACCDES}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateString(invoice.CURDATE)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateString(invoice.FNCDATE)}</TableCell>
                    <TableCell className="whitespace-nowrap">{invoice.IVNUM}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{invoice.SUM.toFixed(2)}</TableCell>
                    <TableCell className="whitespace-nowrap">{invoice.FNCPATNAME}</TableCell>
                    <TableCell><Badge variant={invoice.INVOICEFLAG === 'Y' ? 'default' : 'secondary'}>{invoice.INVOICEFLAG}</Badge></TableCell>
                    <TableCell className="whitespace-nowrap">{invoice.FNCTRANS}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{invoice.KLINE}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
