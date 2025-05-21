
"use server";

import type { Invoice, PriorityApiResponse, FetchInvoicesResult } from "@/types/invoice";
import type { Customer, FetchCustomersResult } from "@/types/customer"; // Added Customer types
import type { InvoiceRemark, ErpConfig, PaymentStatus } from "@/types/dashboard";
import { addDays, formatISO, subDays } from 'date-fns';

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

// Ensures that every invoice has a corresponding remark, creating a default if one doesn't exist.
export async function fetchInvoiceRemarksAction(invoices: Invoice[]): Promise<{ data?: InvoiceRemark[]; error?: string }> {
  console.log("Fetching/Generating mock invoice remarks for supplied invoices...");
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

  if (!invoices) {
    return { data: [] };
  }

  const today = new Date();
  const allRemarks: InvoiceRemark[] = invoices.map((invoice, index) => {
    // Simulate some invoices not having pre-existing remarks to test default creation logic
    // For this mock, let's say 1 in 4 invoices initially might not have a remark from a "backend"
    // and would get a default one generated here.
    // In a real scenario, you'd query your remarks data source.

    let status: PaymentStatus = 'לא שולם';
    let text: string | undefined = undefined;
    const daysAgo = Math.floor(Math.random() * 30); // remarks from last 30 days
    const remarkDate = subDays(today, daysAgo); // Use subDays for past dates
    let statusDate = remarkDate;

    // Mock existing remarks for some invoices
    if (index % 7 === 0 && index > 0) { // Some paid
      status = 'שולם';
      text = 'התשלום התקבל במלואו, תודה.';
      statusDate = subDays(today, Math.floor(Math.random() * 5)); // Paid recently
    } else if (index % 7 === 1 && invoice.SUM > 1000 && index > 0) { // Some partially paid
      status = 'שולם חלקית';
      text = `שולם ${Math.floor(invoice.SUM / 2)}₪. יתרה לתשלום.`;
      statusDate = subDays(today, Math.floor(Math.random() * 10));
    } else if (index % 7 === 2 && index > 0) { // Some with notes but unpaid
       status = 'לא שולם';
       text = 'ממתין לתשלום מהלקוח.';
    } else if (index % 7 === 3 && index < 10 && index > 0) { // Some cancelled
        status = 'בוטל';
        text = 'החשבונית בוטלה לבקשת הלקוח.';
        statusDate = subDays(today, Math.floor(Math.random() * 15));
    } else if (index % 7 === 4 && index > 0) { // Some in collection process
        status = 'בתהליך גבייה';
        text = 'נשלחה תזכורת לתשלום.';
        statusDate = subDays(today, Math.floor(Math.random() * 3));
    }
    // For other invoices, they will default to 'לא שולם' with no text,
    // and createdAt/status_date as `remarkDate`.

    return {
      id: `remark-${invoice.IVNUM}-${index}`, // Ensure unique ID for mock
      invoiceId: invoice.IVNUM,
      status,
      text: text,
      createdAt: formatISO(remarkDate),
      status_date: formatISO(statusDate), // Initialize status_date
      // follow_up_date: can be added here if needed for mock
    };
  });

  return { data: allRemarks };
}


export async function updateInvoiceRemarkAction(invoiceId: string, updates: Partial<InvoiceRemark>): Promise<{ data?: InvoiceRemark; error?: string }> {
  console.log(`MOCK: Updating remark for invoice ${invoiceId} with`, updates);
  await new Promise(resolve => setTimeout(resolve, 700)); // Simulate network delay

  // In a real app, you would fetch the existing remark, apply updates, and save to DB.
  // For this mock, we'll just return an object that merges a basic structure with updates.
  
  // Simulate potential error
  // if (Math.random() < 0.1) { // 10% chance of error
  //   console.error(`MOCK: Error updating remark for invoice ${invoiceId}`);
  //   return { error: "שגיאה בעדכון ההערה. נסה שוב." };
  // }

  const updatedRemark: InvoiceRemark = {
    id: updates.id || `remark-${invoiceId}-updated`, // Use existing id or generate
    invoiceId: invoiceId,
    status: updates.status || 'לא שולם', // Default if not provided
    text: updates.text,
    createdAt: updates.createdAt || formatISO(new Date()), // Use existing or new
    status_date: updates.status_date || formatISO(new Date()),
    follow_up_date: updates.follow_up_date,
  };
  
  console.log(`MOCK: Successfully updated remark for invoice ${invoiceId}`);
  return { data: updatedRemark };
}


export async function fetchErpConfigAction(): Promise<{ data?: ErpConfig; error?: string }> {
  // MOCK IMPLEMENTATION
  console.log("Fetching mock ERP config...");
  await new Promise(resolve => setTimeout(resolve, 200)); // Simulate network delay
  return { data: { refreshInterval: 60000 } }; // e.g., refresh every 60 seconds
}

export async function fetchCustomersAction(): Promise<FetchCustomersResult> {
  console.log("Fetching mock customer data...");
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay

  // For this mock, we'll try to derive some customer data from a pre-fetched invoice list
  // to ensure some consistency for the Customers page demo.
  // In a real app, this would query the CUSTOMERS table from Priority.
  const invoiceResult = await fetchOpenInvoicesAction();
  if (invoiceResult.error || !invoiceResult.data) {
    return { error: "Could not fetch underlying invoice data to mock customers." };
  }

  const invoices = invoiceResult.data;
  const customerMap = new Map<string, Customer>();

  invoices.forEach((invoice, index) => {
    if (!customerMap.has(invoice.ACCDES)) { // Use ACCDES as the unique customer name key
      customerMap.set(invoice.ACCDES, {
        id: invoice.ACCDES, // Using ACCDES as a unique ID for mock
        name: invoice.ACCDES, // CUSTOMERS.NAME
        customer_id: invoice.ACCNAME, // CUSTOMERS.CUSTNAME
        phone: `05${index % 10}-12345${index % 10}${index % 10}`, // Mock phone
        email: `${invoice.ACCNAME.toLowerCase().replace(/\s+/g, '.')}@example.com`, // Mock email
        contact_person: `איש קשר ${index + 1}`, // Mock contact
        payment_terms: (index % 3 === 0) ? 'שוטף +30' : (index % 3 === 1) ? 'שוטף +60' : 'שוטף +90', // Mock terms
        address: `רחוב הדוגמה ${index + 1}, עיר הדוגמה, 12345, ישראל`, // Mock address
      });
    }
  });

  const customersList = Array.from(customerMap.values());
  console.log(`Mocked ${customersList.length} customers.`);
  return { data: customersList };
}


export async function handleLogoutAction() {
  "use server";
  console.log("Logout action triggered (Server Action from actions.ts)");
  // Add actual server-side logout logic here
  // e.g., clearing cookies, invalidating session, redirecting
  // For this example, it just logs to the server console.
}


