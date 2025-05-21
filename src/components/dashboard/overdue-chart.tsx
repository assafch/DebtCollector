
"use client";

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, PieChart as PieChartIcon } from "lucide-react";
import type { Invoice } from "@/types/invoice";
import type { InvoiceRemark } from "@/types/dashboard";
import { differenceInDays, isPast } from 'date-fns';
import { Skeleton } from '../ui/skeleton';

interface OverdueChartProps {
  invoices: Invoice[];
  remarksMap: Map<string, InvoiceRemark[]>;
  isLoading: boolean;
}

const COLORS = ['#FFBB28', '#FF8042', '#FF4F5B', '#DD2A3B']; // Muted Teal, Soft Blue, Orange, Red for buckets

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null; // Don't render label if slice is too small

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-medium">
      {`${name} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const totalOverdue = payload.reduce((sum: number, entry: any) => sum + entry.payload.value, 0);
    const percentage = totalOverdue > 0 ? (data.value / totalOverdue * 100) : 0;
    
    return (
      <div className="bg-popover p-3 rounded-md shadow-lg border border-border text-popover-foreground">
        <p className="font-semibold">{`${data.name}`}</p>
        <p>{`סכום: ${new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(data.value)}`}</p>
        <p>{`אחוז מהסך הכל: ${percentage.toFixed(1)}%`}</p>
      </div>
    );
  }
  return null;
};


export function OverdueChart({ invoices, remarksMap, isLoading }: OverdueChartProps) {
  const chartData = useMemo(() => {
    if (!invoices || invoices.length === 0) return [];

    const buckets = {
      '1-30 ימים': { total: 0, count: 0 },
      '31-60 ימים': { total: 0, count: 0 },
      '61-90 ימים': { total: 0, count: 0 },
      '90+ ימים': { total: 0, count: 0 },
    };

    const today = new Date();
    invoices.forEach(invoice => {
      const invoiceRemarks = remarksMap.get(invoice.IVNUM) || [];
      const isPaid = invoiceRemarks.some(r => r.status === 'שולם');
      const isCancelled = invoiceRemarks.some(r => r.status === 'בוטל');

      if (isPaid || isCancelled) return;

      const dueDate = new Date(invoice.FNCDATE);
      if (isPast(dueDate)) {
        const daysOverdue = differenceInDays(today, dueDate);
        const amount = invoice.SUM;

        if (daysOverdue >= 1 && daysOverdue <= 30) {
          buckets['1-30 ימים'].total += amount;
          buckets['1-30 ימים'].count++;
        } else if (daysOverdue >= 31 && daysOverdue <= 60) {
          buckets['31-60 ימים'].total += amount;
          buckets['31-60 ימים'].count++;
        } else if (daysOverdue >= 61 && daysOverdue <= 90) {
          buckets['61-90 ימים'].total += amount;
          buckets['61-90 ימים'].count++;
        } else if (daysOverdue > 90) {
          buckets['90+ ימים'].total += amount;
          buckets['90+ ימים'].count++;
        }
      }
    });
    
    return Object.entries(buckets)
      .map(([name, data], index) => ({
        name: `${name} (${data.count})`, // Add count to label
        value: data.total,
        fill: COLORS[index % COLORS.length],
      }))
      .filter(item => item.value > 0);
  }, [invoices, remarksMap]);

  const totalOverdueAmount = useMemo(() => chartData.reduce((sum, item) => sum + item.value, 0), [chartData]);

  if (isLoading) {
    return (
      <Card className="shadow-lg h-[400px]">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <PieChartIcon className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0 text-primary" />
            חשבוניות בחריגה
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-full">
          <Skeleton className="w-full h-64 rounded-md" />
        </CardContent>
      </Card>
    );
  }
  
  if (chartData.length === 0) {
    return (
      <Card className="shadow-lg h-[400px]">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <PieChartIcon className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0 text-primary" />
            חשבוניות בחריגה
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-full text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">אין חובות באיחור כרגע.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <PieChartIcon className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0 text-primary" />
          חשבוניות בחריגה לפי תקופת איחור
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[350px] p-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={100}
              innerRadius={50} // For Donut shape
              fill="#8884d8"
              dataKey="value"
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value, entry) => {
                const { color } = entry;
                // Extract only the bucket name for the legend (e.g., "1-30 ימים")
                const bucketName = value.substring(0, value.lastIndexOf('(')).trim();
                return <span style={{ color }}>{bucketName}</span>;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
      <div className="text-center pb-4 text-sm font-semibold text-foreground">
        סך כל החובות באיחור: {new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(totalOverdueAmount)}
      </div>
    </Card>
  );
}
