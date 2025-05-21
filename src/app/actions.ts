"use server";

import type { Invoice, PriorityApiResponse, FetchInvoicesResult } from "@/types/invoice";

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
      "User-Agent": "PostmanRuntime/7.36.3", // As per user's script
    },
    // Next.js fetch caches by default. If fresh data is always needed:
    // cache: 'no-store' as RequestCache, 
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
    // console.log("Response Text (first 500 chars): " + responseText.substring(0, 500));

    const data = JSON.parse(responseText) as PriorityApiResponse;

    if (data && data.value && Array.isArray(data.value)) {
      // Validate and type cast each invoice item if necessary
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
      console.log("Parsed data structure: " + JSON.stringify(data, null, 2));
      return { error: "Received data from API, but it's not in the expected format." };
    }
  } catch (e: any) {
    console.error('Fetch error: %s', e.toString());
    console.error('Stack: %s', e.stack);
    return { error: `Failed to fetch or process invoice data: ${e.message}. Check server logs.` };
  }
}
