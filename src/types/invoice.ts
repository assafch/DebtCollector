export interface Invoice {
  ACCNAME: string;
  ACCDES: string;
  CURDATE: string; // Date string, e.g., "2023-10-26T00:00:00"
  FNCDATE: string; // Date string
  IVNUM: string;
  SUM: number;
  FNCPATNAME: string;
  INVOICEFLAG: string;
  FNCTRANS: string;
  KLINE: number;
}

export interface PriorityApiResponse {
  "@odata.context": string;
  value: Invoice[];
}

export interface FetchInvoicesResult {
  data?: Invoice[];
  error?: string;
}
