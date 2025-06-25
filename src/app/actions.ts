
"use server";

import type { Invoice, PriorityApiResponse, FetchInvoicesResult } from "@/types/invoice";
import type { Customer, FetchCustomersResult } from "@/types/customer";
import type { InvoiceRemark, ErpConfig } from "@/types/dashboard";
import { addDays, formatISO, subDays } from 'date-fns';
import { db } from '@/lib/firebase'; // Import the db instance
import { doc, setDoc, getDoc } from 'firebase/firestore'; // Import Firestore functions

const API_URL = 'https://p.priority-connect.online/odata/Priority/tabp008h.ini/a051014/TFNCITEMS2ONE';
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
  };

  try {
    console.log("Fetching Open Invoices from URL: " + API_URL);
    const response = await fetch(API_URL, options);
    const responseText = await response.text();

    if (!response.ok) {
      console.error(`API request failed with status ${response.status}: ${responseText}`);
      return { error: `API request failed with status ${response.status}. Check server logs.` };
    }

    const data = JSON.parse(responseText) as PriorityApiResponse;

    if (data && data.value && Array.isArray(data.value)) {
      const invoices: Invoice[] = data.value.map(item => ({
        ACCNAME: String(item.ACCNAME || ''),
        ACCDES: String(item.ACCDES || ''),
        CURDATE: String(item.CURDATE || ''),
        FNCDATE: String(item.FNCDATE || ''),
        IVNUM: String(item.IVNUM || ''),
        SUM: Number(item.SUM || 0),
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
  console.log("Fetching remarks from Firestore...");
  
  if (!invoices) {
    return { data: [] };
  }

  const remarks: InvoiceRemark[] = [];
  for (const invoice of invoices) {
    const docRef = doc(db, "invoice_remarks", invoice.IVNUM);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      remarks.push(docSnap.data() as InvoiceRemark);
    } else {
      // If no remark exists, create a default one
      const defaultRemark: InvoiceRemark = {
        id: `remark-${invoice.IVNUM}`,
        invoiceId: invoice.IVNUM,
        status: 'לא שולם',
        text: '',
        createdAt: formatISO(new Date()),
        status_date: formatISO(new Date()),
      };
      remarks.push(defaultRemark);
    }
  }

  return { data: remarks };
}

export async function updateInvoiceRemarkAction(invoiceId: string, updates: Partial<InvoiceRemark>): Promise<{ data?: InvoiceRemark; error?: string }> {
  console.log(`Updating remark for invoice ${invoiceId} in Firestore with`, updates);
  
  if (!invoiceId) {
    return { error: "Invoice ID is required to update a remark." };
  }

  const docRef = doc(db, "invoice_remarks", invoiceId);

  try {
    // Fetch the existing document to merge with updates
    const docSnap = await getDoc(docRef);
    const existingData = docSnap.exists() ? docSnap.data() : {};

    const remarkToSave: InvoiceRemark = {
      id: existingData.id || `remark-${invoiceId}`,
      invoiceId: invoiceId,
      status: 'לא שולם',
      createdAt: formatISO(new Date()),
      status_date: formatISO(new Date()),
      ...existingData,
      ...updates,
    };

    await setDoc(docRef, remarkToSave, { merge: true });

    console.log(`Successfully updated remark for invoice ${invoiceId}`);
    return { data: remarkToSave };
  } catch (e: any) {
    console.error(`Error updating remark for invoice ${invoiceId}:`, e);
    return { error: "שגיאה בעדכון ההערה. נסה שוב." };
  }
}


export async function fetchErpConfigAction(): Promise<{ data?: ErpConfig; error?: string }> {
  console.log("Fetching mock ERP config...");
  await new Promise(resolve => setTimeout(resolve, 200));
  return { data: { refreshInterval: 60000 } };
}

export async function fetchCustomersAction(): Promise<FetchCustomersResult> {
  console.log("Fetching mock customer data...");
  await new Promise(resolve => setTimeout(resolve, 300));

  const invoiceResult = await fetchOpenInvoicesAction();
  if (invoiceResult.error || !invoiceResult.data) {
    return { error: "Could not fetch underlying invoice data to mock customers." };
  }

  const invoices = invoiceResult.data;
  const customerMap = new Map<string, Customer>();

  invoices.forEach((invoice, index) => {
    if (!customerMap.has(invoice.ACCDES)) {
      customerMap.set(invoice.ACCDES, {
        id: invoice.ACCDES,
        name: invoice.ACCDES,
        customer_id: invoice.ACCNAME,
        phone: `05${index % 10}-12345${index % 10}${index % 10}`,
        email: `${invoice.ACCNAME.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        contact_person: `איש קשר ${index + 1}`,
        payment_terms: (index % 3 === 0) ? 'שוטף +30' : (index % 3 === 1) ? 'שוטף +60' : 'שוטף +90',
        address: `רחוב הדוגמה ${index + 1}, עיר הדוגמה, 12345, ישראל`,
      });
    }
  });

  const customersList = Array.from(customerMap.values());
  console.log(`Mocked ${customersList.length} customers.`);
  return { data: customersList };
}

export async function handleLogoutAction() {
  "use server";
  console.log("Logout server action triggered (from actions.ts)");
}
