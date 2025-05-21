
"use server";

import type { Invoice, PriorityApiResponse, FetchInvoicesResult } from "@/types/invoice";
import type { InvoiceRemark, ErpConfig } from "@/types/dashboard";
import { addDays, formatISO } from 'date-fns';

const API_URL = 'https://p.priority-connect.online/odata/Priority/tabp008h.ini/a051014/TFNCITEMS2ONE';
// IMPORTANT: In a real application, this key should come from environment variables.
const API_KEY_PAT = "4136A6C2563840AA91B56F869C2550BB:PAT";

export async function fetchOpenInvoicesAction(): Promise<FetchInvoicesResult> {
  const encodedCredentials = Buffer.from(API_KEY_PAT).toString('base64');
  
  const options = {
    method: "GET",
    headers: {
      "Authorization": "Basic " + encodedCredentials,
      "Accept": "application/json",
      "User-Agent": "PostmanRuntime/7.36.3", 
    },
    // cache: 'no-store' as RequestCache, // Uncomment if fresh data is always needed
  };

  try {
    console.log("Fetching Open Invoices from URL: " + API_URL);
    const response = await fetch(API_URL, options);
    const responseText = await response.text();

    if (!response.ok) {
      console.error(`API request failed with status ${response.status}: ${responseText}`);
      return { error: `API request failed with status ${response.status}. Check server logs.` };
    }

    console.log("Response Code: " + response.status);
    const data = JSON.parse(responseText) as PriorityApiResponse;

    if (data && data.value && Array.isArray(data.value)) {
      const invoices: Invoice[] = data.value.map(item => ({
        ACCNAME: String(item.ACCNAME || ''),
        ACCDES: String(item.ACCDES || ''),
        CURDATE: String(item.CURDATE || ''), // Invoice creation date
        FNCDATE: String(item.FNCDATE || ''), // Due date
        IVNUM: String(item.IVNUM || ''),
        SUM: Number(item.SUM || 0), // Amount
        FNCPATNAME: String(item.FNCPATNAME || ''),
        INVOICEFLAG: String(item.INVOICEFLAG || ''),
        FNCTRANS: String(item.FNCTRANS || ''),
        KLINE: Number(item.KLINE || 0),
      }));
      return { data: invoices };
    } else {
      console.error("Parsed JSON does not have the expected 'value' array structure.");
      return { error: "Received data from API, but it's not in the expected format." };
    }
  } catch (e: any) {
    console.error('Fetch error: %s', e.toString());
    return { error: `Failed to fetch or process invoice data: ${e.message}. Check server logs.` };
  }
}

export async function fetchInvoiceRemarksAction(invoices: Invoice[]): Promise<{ data?: InvoiceRemark[]; error?: string }> {
  // MOCK IMPLEMENTATION
  // In a real app, this would fetch from an API or database
  console.log("Fetching mock invoice remarks...");
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

  if (!invoices || invoices.length === 0) {
    return { data: [] };
  }

  const today = new Date();
  const remarks: InvoiceRemark[] = invoices.slice(0, 15).map((invoice, index) => {
    let status: InvoiceRemark['status'] = 'לא שולם';
    let text: string | undefined = undefined;
    const daysAgo = Math.floor(Math.random() * 30); // remarks from last 30 days
    
    const remarkDate = addDays(today, -daysAgo);

    if (index % 5 === 0) {
      status = 'שולם';
      text = 'התשלום התקבל במלואו, תודה.';
    } else if (index % 5 === 1 && invoice.SUM > 1000) {
      status = 'שולם חלקית';
      text = `שולם ${Math.floor(invoice.SUM / 2)}₪. יתרה לתשלום.`;
    } else if (index % 5 === 2) {
       status = 'לא שולם';
       text = 'ממתין לתשלום מהלקוח.';
    } else if (index % 5 === 3 && index < 5) {
        status = 'בוטל';
        text = 'החשבונית בוטלה לבקשת הלקוח.';
    }
    // else default 'לא שולם' without text

    return {
      id: `remark-${invoice.IVNUM}-${index}`,
      invoiceId: invoice.IVNUM,
      status,
      text: text,
      createdAt: formatISO(remarkDate),
    };
  });

  return { data: remarks };
}

export async function fetchErpConfigAction(): Promise<{ data?: ErpConfig; error?: string }> {
  // MOCK IMPLEMENTATION
  console.log("Fetching mock ERP config...");
  await new Promise(resolve => setTimeout(resolve, 200)); // Simulate network delay
  return { data: { refreshInterval: 60000 } }; // e.g., refresh every 60 seconds
}


export async function handleLogoutAction() {
  "use server";
  console.log("Logout action triggered (Server Action from actions.ts)");
  // Add actual server-side logout logic here
  // e.g., clearing cookies, invalidating session, redirecting
  // For this example, it just logs to the server console.
}
