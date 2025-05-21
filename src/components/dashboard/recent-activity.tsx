
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ListChecks, MessageSquare, Info, AlertTriangle } from "lucide-react";
import type { Invoice } from "@/types/invoice";
import type { InvoiceRemark, ActivityItem } from "@/types/dashboard";
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { Skeleton } from '../ui/skeleton';

interface RecentActivityProps {
  invoices: Invoice[];
  remarksMap: Map<string, InvoiceRemark[]>;
  isLoading: boolean;
}

const MAX_ACTIVITIES = 7;

const getStatusBadgeVariant = (status?: InvoiceRemark['status']): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'שולם': return 'default'; // Primary color (usually green-ish or blue-ish by theme)
    case 'שולם חלקית': return 'outline'; // Accent color (usually orange-ish or teal)
    case 'לא שולם': return 'destructive'; // Destructive color (usually red)
    case 'בוטל': return 'secondary'; // Muted/secondary color
    default: return 'secondary';
  }
};

const getIconForActivity = (type: ActivityItem['type'], status?: InvoiceRemark['status']): React.ElementType => {
  if (type === 'status_change') {
    if (status === 'שולם') return ListChecks; // CheckCircle2 could also work
    if (status === 'שולם חלקית') return ListChecks;
  }
  return MessageSquare; // Default for remarks or other statuses
};


export function RecentActivity({ invoices, remarksMap, isLoading }: RecentActivityProps) {
  const activityItems = useMemo((): ActivityItem[] => {
    if (!invoices || invoices.length === 0 || remarksMap.size === 0) return [];

    const allActivities: ActivityItem[] = [];
    const invoiceMap = new Map(invoices.map(inv => [inv.IVNUM, inv]));

    remarksMap.forEach((remarksList) => {
      remarksList.forEach(remark => {
        const invoice = invoiceMap.get(remark.invoiceId);
        if (invoice) {
          allActivities.push({
            id: remark.id,
            invoiceId: invoice.IVNUM,
            customerName: invoice.ACCNAME,
            invoiceNumber: invoice.IVNUM,
            date: format(parseISO(remark.createdAt), "dd/MM/yyyy HH:mm", { locale: he }),
            type: remark.text ? 'remark' : 'status_change',
            iconName: remark.text ? 'MessageSquare' : 'ListChecks', // Placeholder, will be resolved
            description: remark.text || `סטטוס עודכן ל: ${remark.status}`,
            status: remark.status,
          });
        }
      });
    });

    // Sort by date, most recent first
    allActivities.sort((a, b) => parseISO(remarksMap.get(b.invoiceId)?.[0]?.createdAt || '1970-01-01T00:00:00Z').getTime() - parseISO(remarksMap.get(a.invoiceId)?.[0]?.createdAt || '1970-01-01T00:00:00Z').getTime());
    
    // This sort seems to be using the first remark of an invoice, which is not what we want for individual activities.
    // Let's sort based on the 'createdAt' of each remark itself.
    allActivities.sort((a,b) => {
        const remarkA = Array.from(remarksMap.values()).flat().find(r => r.id === a.id);
        const remarkB = Array.from(remarksMap.values()).flat().find(r => r.id === b.id);
        const dateA = remarkA ? parseISO(remarkA.createdAt).getTime() : 0;
        const dateB = remarkB ? parseISO(remarkB.createdAt).getTime() : 0;
        return dateB - dateA;
    });


    return allActivities.slice(0, MAX_ACTIVITIES);
  }, [invoices, remarksMap]);

  if (isLoading) {
    return (
       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Info className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0 text-primary" />
            פעילות אחרונה
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start space-x-3 rtl:space-x-reverse">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activityItems.length === 0) {
    return (
      <Card className="shadow-lg h-[400px]">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Info className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0 text-primary" />
            פעילות אחרונה
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-full text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">אין פעילות אחרונה להצגה.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Info className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0 text-primary" />
          פעילות אחרונה
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[350px]">
          <ul className="space-y-4">
            {activityItems.map((item) => {
              const IconComponent = getIconForActivity(item.type, item.status);
              return (
                <li key={item.id} className="flex items-start space-x-3 rtl:space-x-reverse p-1">
                  <div className="flex-shrink-0 pt-1">
                    <IconComponent className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.customerName} (חשבונית: {item.invoiceNumber})
                    </p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">{item.date}</span>
                        {item.status && (
                          <Badge variant={getStatusBadgeVariant(item.status)} className="text-xs">
                            {item.status}
                          </Badge>
                        )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
