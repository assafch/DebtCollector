
import type { LucideIcon } from 'lucide-react';
import type { Invoice } from './invoice';

// Defines the possible payment statuses for an invoice remark
export type PaymentStatus = 'שולם' | 'לא שולם' | 'שולם חלקית' | 'בוטל' | 'בתהליך גבייה';

// Represents an option for the payment status, used in Select components and filters
export interface PaymentStatusOption {
  value: PaymentStatus;
  label: string;
  // Defines the visual style for badges or other UI elements representing the status
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
  // Optional icon for the status, e.g., for display in a Select component
  icon?: React.ElementType; 
}

// Readonly array of available payment status options
// Used to populate dropdowns and for consistent status representation
export const PAYMENT_STATUS_OPTIONS: readonly PaymentStatusOption[] = [
  { value: 'לא שולם', label: 'לא שולם', badgeVariant: 'destructive' },
  { value: 'בתהליך גבייה', label: 'בתהליך גבייה', badgeVariant: 'outline' },
  { value: 'שולם חלקית', label: 'שולם חלקית', badgeVariant: 'default' }, // 'default' often implies primary/accent color
  { value: 'שולם', label: 'שולם', badgeVariant: 'default' }, // Typically a success-like style
  { value: 'בוטל', label: 'בוטל', badgeVariant: 'secondary' },
] as const;

// Represents a remark or status update associated with an invoice
export interface InvoiceRemark {
  id: string; // Unique identifier for the remark; can be invoice.IVNUM if one main remark per invoice
  invoiceId: string; // Corresponds to Invoice.IVNUM, linking the remark to an invoice
  status: PaymentStatus; // The current payment status of the invoice
  text?: string; // Free-form textual notes or comments about the invoice/payment
  createdAt: string; // ISO Date string: When the remark was initially created
  status_date?: string; // ISO Date string: When the current 'status' was set
  follow_up_date?: string; // ISO Date string: Optional date for follow-up actions
  // updatedBy?: string; // Optional: Identifier for the user who made the last update
  // updatedAt?: string; // Optional: ISO Date string for when the remark was last updated
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
  remarksMap: Map<string, InvoiceRemark[]>; // Changed from Map<string, InvoiceRemark> for dashboard
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

export interface Filters {
  customerName: string;
  invoiceNumber: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  fncStartDate: Date | undefined;
  fncEndDate: Date | undefined;
  paymentStatus?: PaymentStatus[]; // Changed to array for multiselect
}
