import { Itinerary, TableStatus, Staff, Lead, CompanyProfile, SystemSettings } from './types';

export const INITIAL_ITINERARIES: Itinerary[] = [
  {
    id: "it_001",
    title: "Mesmerizing Munnar & Alleppey Houseboat tour",
    destination: "Munnar, Alleppey",
    booking_number: "SIH-2026-0891",
    duration: "4 Nights / 5 Days",
    customer_name: "Aditya Sharma",
    price: 32500,
  },
  {
    id: "it_002",
    title: "Kodaikanal Misty Hills Getaway",
    destination: "Kodaikanal",
    booking_number: null, // VIOLATION ROW!
    duration: "2 Nights / 3 Days",
    customer_name: "Meera Krishnan",
    price: 18400,
  },
  {
    id: "it_003",
    title: "Ooty Botanical & Coonoor Heritage Special",
    destination: "Ooty, Coonoor",
    booking_number: "SIH-2026-0902",
    duration: "3 Nights / 4 Days",
    customer_name: "Rohan Das",
    price: 24000,
  },
  {
    id: "it_004",
    title: "Wayanad Wild Adventure & Treehouse Stay",
    destination: "Wayanad",
    booking_number: null, // VIOLATION ROW!
    duration: "3 Nights / 4 Days",
    customer_name: "Vijay Nair",
    price: 29500,
  },
  {
    id: "it_005",
    title: "Vibrant Kochi & Fort Kochi Heritage Walk",
    destination: "Kochi",
    booking_number: "SIH-2026-0914",
    duration: "1 Night / 2 Days",
    customer_name: "Sanjana Roy",
    price: 9800,
  },
  {
    id: "it_006",
    title: "Thekkady Wildlife Safaris & Spice Plantation Tour",
    destination: "Thekkady",
    booking_number: "SIH-2026-0925",
    duration: "2 Nights / 3 Days",
    customer_name: "Karthik Subramanian",
    price: 15500,
  }
];

export const INITIAL_TABLES: string[] = [
  "customers",
  "bookings",
  "itineraries", // Fails here during sync
  "payments",
  "destinations",
  "hotels",
  "flights",
  "cabs",
  "drivers",
  "activities",
  "guides",
  "agents",
  "leads",
  "vouchers",
  "reviews",
  "refunds",
  "invoices",
  "insurance",
  "itinerary_days",
  "support_tickets"
];

export const CODE_SNIPPETS = {
  schema: {
    title: "Strategy A: Database Schema Migration (Allow Null)",
    description: "Alters the database table schema so that 'booking_number' can be null. This is recommended if itineraries can exist without a confirmed booking (e.g. customized draft plans or leads).",
    sql: `/* PostgreSQL Migration */
ALTER TABLE itineraries 
ALTER COLUMN booking_number DROP NOT NULL;`,
    drizzle: `/* src/db/schema.ts (Drizzle ORM) */
import { pgTable, uuid, text } from "drizzle-orm/pg-core";

export const itineraries = pgTable("itineraries", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  destination: text("destination").notNull(),
  // REMOVE .notNull() to make it nullable!
  booking_number: text("booking_number"), 
  duration: text("duration").notNull(),
  customer_name: text("customer_name").notNull(),
});`,
    prisma: `// prisma/schema.prisma (Prisma ORM)
model Itinerary {
  id             String  @id @default(uuid())
  title          String
  destination    String
  // Add "?" to make bookingNumber optional in PostgreSQL
  bookingNumber  String? @map("booking_number")
  duration       String
  customerName   String  @map("customer_name")
}`
  },
  fallback: {
    title: "Strategy B: Code-Level Sanitization (Fallback Assignment)",
    description: "Keeps the 'NOT NULL' constraint on the database for integrity, but handles nulls in your Node.js/TypeScript sync script by assigning a fallback placeholder code (e.g., SIH-PENDING-id).",
    typescript: `/* server.ts or src/sync/mirror.ts */
import { db } from "./db";
import { itineraries } from "./db/schema";

async function mirrorItineraries(crmItineraries: any[]) {
  const sanitized = crmItineraries.map((it) => {
    return {
      id: it.id,
      title: it.title,
      destination: it.destination,
      duration: it.duration,
      customer_name: it.customer_name,
      // Assign fallback placeholder if null or missing
      booking_number: it.booking_number ?? \`SIH-PENDING-\${it.id.toUpperCase()}\`,
    };
  });

  // Perform bulk upsert/insert transaction
  await db.insert(itineraries).values(sanitized).onConflictDoUpdate({
    target: itineraries.id,
    set: { booking_number: sql\`EXCLUDED.booking_number\` }
  });
}`
  },
  filter: {
    title: "Strategy C: Code-Level Filter (Skip Nulls)",
    description: "Maintains database integrity and skips mirroring any itineraries that lack a booking number. Useful if mirroring must strictly require active, confirmed bookings only.",
    typescript: `/* server.ts or src/sync/mirror.ts */
import { db } from "./db";
import { itineraries } from "./db/schema";

async function mirrorItineraries(crmItineraries: any[]) {
  // Filter out any itineraries with null, undefined or empty booking numbers
  const validItineraries = crmItineraries
    .filter((it) => it.booking_number !== null && it.booking_number !== undefined && it.booking_number.trim() !== '')
    .map((it) => ({
      id: it.id,
      title: it.title,
      destination: it.destination,
      duration: it.duration,
      customer_name: it.customer_name,
      booking_number: it.booking_number,
    }));

  console.log(\`[Sync] Skipping \${crmItineraries.length - validItineraries.length} invalid itineraries without booking numbers.\`);

  if (validItineraries.length > 0) {
    await db.insert(itineraries).values(validItineraries).onConflictDoNothing();
  }
}`
  }
};

export const INITIAL_STAFF: Staff[] = [
  { id: "st_001", name: "Ananya Iyer", role: "Munnar Specialist", email: "ananya.iyer@southindianholidays.co.in", avatarColor: "bg-teal-500", activeLeadsCount: 4, password: "password123" },
  { id: "st_002", name: "Karthik Raja", role: "Senior Travel Consultant", email: "karthik.raja@southindianholidays.co.in", avatarColor: "bg-indigo-500", activeLeadsCount: 6, password: "password123" },
  { id: "st_003", name: "Meera Nair", role: "Kerala Houseboats Curator", email: "meera.nair@southindianholidays.co.in", avatarColor: "bg-emerald-500", activeLeadsCount: 2, password: "password123" },
  { id: "st_004", name: "Rohan Fernandes", role: "Heritage & Wildlife Planner", email: "rohan.f@southindianholidays.co.in", avatarColor: "bg-amber-500", activeLeadsCount: 5, password: "password123" },
  { id: "st_005", name: "Sanjana Gowda", role: "Luxury Getaways Expert", email: "sanjana.g@southindianholidays.co.in", avatarColor: "bg-pink-500", activeLeadsCount: 3, password: "password123" }
];

export const INITIAL_LEADS: Lead[] = [
  {
    id: "LD-2026-041",
    customerName: "Rakesh Malhotra",
    email: "rakesh.m@gmail.com",
    phone: "+91 98765 43210",
    destination: "Munnar, Thekkady",
    pax: 4,
    budget: 45000,
    status: "New",
    assignedStaffId: null,
    createdDate: "2026-07-18",
    lastUpdated: "2026-07-18",
    notes: "Requires a 4-star hotel stay with a private cab guide speaking Hindi. Interested in spice tours."
  },
  {
    id: "LD-2026-042",
    customerName: "Sneha Reddy",
    email: "sneha.reddy@yahoo.com",
    phone: "+91 91234 56789",
    destination: "Kodaikanal Misty Getaway",
    pax: 2,
    budget: 22000,
    status: "Contacted",
    assignedStaffId: "st_001",
    createdDate: "2026-07-17",
    lastUpdated: "2026-07-19",
    notes: "Honeymoon couple. Wants a flower decoration in the room and a candle-light dinner package."
  },
  {
    id: "LD-2026-043",
    customerName: "Dr. Amit Verma",
    email: "amit.verma@health.in",
    phone: "+91 88888 77777",
    destination: "Alleppey Houseboat & Kochi",
    pax: 6,
    budget: 85000,
    status: "Proposal Sent",
    assignedStaffId: "st_003",
    createdDate: "2026-07-15",
    lastUpdated: "2026-07-16",
    notes: "Premium luxury premium houseboat with 3 bedrooms. Senior citizens in group, need wheel-chair friendly access."
  },
  {
    id: "LD-2026-044",
    customerName: "Vikram Malhotra",
    email: "vikram.m@outlook.com",
    phone: "+91 77776 66655",
    destination: "Ooty & Coonoor Tour",
    pax: 3,
    budget: 35000,
    status: "Negotiation",
    assignedStaffId: "st_002",
    createdDate: "2026-07-12",
    lastUpdated: "2026-07-18",
    notes: "Requested a discount on the toy train tickets booking. Comparing options with other tour agencies."
  },
  {
    id: "LD-2026-045",
    customerName: "Pooja Hegde",
    email: "pooja.h@outlook.com",
    phone: "+91 94440 12345",
    destination: "Wayanad Wildlife Special",
    pax: 5,
    budget: 50000,
    status: "New",
    assignedStaffId: null,
    createdDate: "2026-07-19",
    lastUpdated: "2026-07-19",
    notes: "Prefers treehouse stay. Wants trekking guidelines."
  },
  {
    id: "LD-2026-046",
    customerName: "Gautam Karthik",
    email: "gautam.k@gmail.com",
    phone: "+91 96660 55544",
    destination: "Varkala Cliff Beach Holiday",
    pax: 2,
    budget: 30000,
    status: "Converted",
    assignedStaffId: "st_005",
    createdDate: "2026-07-10",
    lastUpdated: "2026-07-14",
    notes: "Booking confirmed. Flight tickets uploaded to dashboard."
  }
];

export const INITIAL_COMPANY_PROFILE: CompanyProfile = {
  companyName: "South Indian Holidays",
  email: "info@southindianholidays.co.in",
  phone: "+91 484 234 5678",
  address: "3rd Floor, Lotus Tower, M.G. Road, Kochi, Kerala - 682016",
  website: "www.southindianholidays.co.in",
  gstin: "32AAAAA1111A1Z1",
  tagline: "Unveiling the Serenity of South India"
};

export const INITIAL_SYSTEM_SETTINGS: SystemSettings = {
  defaultAssignmentStrategy: "manual",
  syncFrequencyMinutes: 30,
  autoContactOnAssign: true,
  allowedDestinations: [
    "Munnar, Kerala",
    "Wayanad, Kerala",
    "Alleppey Houseboats",
    "Thekkady, Kerala",
    "Ooty, Tamil Nadu",
    "Kodaikanal, Tamil Nadu",
    "Varkala Cliff Beach Holiday"
  ],
  smtpServer: "smtp.southindianholidays.co.in",
  smtpPort: 587,
  smtpUser: "notifications@southindianholidays.co.in"
};

