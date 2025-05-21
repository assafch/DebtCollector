import type { LucideIcon } from 'lucide-react';
import type { Invoice } from './invoice';

export interface InvoiceRemark {
  id: string;
  invoiceId: string; // Corresponds to Invoice.IVNUM
  status: 'שולם' | 'לא שולם' | 'שולם חלקית' | 'בוטל';
  text?: string;
  createdAt: string; // ISO Date string, e.g., "2023-10-27T10:00:00Z"
}

export interface ErpConfig {
  refreshInterval?: number;
  // Add other configurations if needed
}

export interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon; // Direct component
  color: string; // Tailwind background color class e.g. 'bg-blue-600'
  subValue?: string;
  trend?: {
    icon: LucideIcon; // Direct component
    label: string;
    color: string; // Tailwind text color class e.g. 'text-green-500'
  };
  isLoading?: boolean;
  className?: string;
}


export interface ChartDataItem {
  name: string;
  value: number;
  fill: string;
}

export interface ActivityItem {
  id: string;
  invoiceId: string;
  customerName: string;
  invoiceNumber: string;
  date: string; // Formatted date
  type: 'remark' | 'status_change';
  iconName: keyof typeof import('lucide-react'); // For dynamic icon rendering
  description: string;
  status?: InvoiceRemark['status'];
}

// Helper types for dashboard calculations
export interface ProcessedInvoices {
  allInvoices: Invoice[];
  remarksMap: Map<string, InvoiceRemark[]>;
  erpConfig?: ErpConfig;
  isLoading: boolean;
  error?: string;
}

export interface DashboardMetrics {
  totalOpenInvoicesCount: number;
  totalOpenAmount: number;
  overdueInvoicesCount: number;
  overdueAmount: number;
  invoicesDueThisWeekCount: number;
  amountDueThisWeek: number;
  avgPaymentTime?: string; // Placeholder
}