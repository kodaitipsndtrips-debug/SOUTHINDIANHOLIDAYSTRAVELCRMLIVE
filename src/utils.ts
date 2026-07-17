// Core South Indian Holidays Utility Functions

export function getLocalDateString(dateInput?: string | Date): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// WhatsApp chat history regex parser
export interface ParsedChatResult {
  name: string;
  mobile: string;
  destination: string;
  budget: string;
  adults: string;
  children: string;
  travelDate: string;
  notes: string;
}

export function parseWhatsAppChat(text: string): ParsedChatResult {
  const result: ParsedChatResult = {
    name: "",
    mobile: "",
    destination: "",
    budget: "",
    adults: "2",
    children: "0",
    travelDate: "",
    notes: ""
  };

  if (!text) return result;

  const lines = text.split("\n");
  let notesCollector: string[] = [];

  // Try parsing line by line
  lines.forEach(line => {
    const lower = line.toLowerCase();

    // Check Name
    if (lower.includes("name") || lower.includes("cust") || lower.includes("client")) {
      const match = line.match(/(?:name|customer|client|cust)\s*[:=-]\s*(.*)/i);
      if (match && match[1]) result.name = match[1].trim();
    }
    // Check Mobile
    if (lower.includes("phone") || lower.includes("mobile") || lower.includes("contact") || lower.includes("num")) {
      const match = line.match(/(?:phone|mobile|contact|num|no)\s*[:=-]\s*([+0-9\s-]{10,15})/i);
      if (match && match[1]) result.mobile = match[1].trim().replace(/[\s-]/g, "");
    }
    // Check Destination
    if (lower.includes("dest") || lower.includes("place") || lower.includes("tour") || lower.includes("to:")) {
      const match = line.match(/(?:destination|dest|place|to|location)\s*[:=-]\s*(.*)/i);
      if (match && match[1]) result.destination = match[1].trim().toLowerCase();
    }
    // Check Budget
    if (lower.includes("budget") || lower.includes("price") || lower.includes("cost")) {
      const match = line.match(/(?:budget|price|cost|val)\s*[:=-]\s*(.*)/i);
      if (match && match[1]) result.budget = match[1].trim();
    }
    // Check Adults
    if (lower.includes("adult")) {
      const match = line.match(/(?:adults?|pax)\s*[:=-]?\s*(\d+)/i);
      if (match && match[1]) result.adults = match[1].trim();
    }
    // Check Children
    if (lower.includes("child") || lower.includes("kid")) {
      const match = line.match(/(?:children|child|kids?)\s*[:=-]?\s*(\d+)/i);
      if (match && match[1]) result.children = match[1].trim();
    }
    // Check Travel Date
    if (lower.includes("date") || lower.includes("travel") || lower.includes("dt") || lower.includes("on:")) {
      const match = line.match(/(?:date|travel\s+date|journey|dt|on)\s*[:=-]\s*(.*)/i);
      if (match && match[1]) result.travelDate = match[1].trim();
    }

    // Accumulate other info as notes
    if (line.trim().length > 3 && !line.includes("---")) {
      notesCollector.push(line.trim());
    }
  });

  // Failsafe backup matching for telephone numbers if not found
  if (!result.mobile) {
    const telMatch = text.match(/(\+?\d[\d-\s]{8,14}\d)/);
    if (telMatch && telMatch[1]) {
      result.mobile = telMatch[1].trim().replace(/[\s-]/g, "");
    }
  }

  // Failsafe backup for name
  if (!result.name && lines[0] && lines[0].length < 30) {
    result.name = lines[0].trim();
  }

  result.notes = notesCollector.slice(0, 5).join("\n");
  return result;
}

// Generate human-friendly date format
export function formatFriendlyDate(dateStr?: string): string {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch (e) {
    return dateStr;
  }
}
