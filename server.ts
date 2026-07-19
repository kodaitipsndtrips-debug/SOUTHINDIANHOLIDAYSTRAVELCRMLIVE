import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import { WebSocketServer, WebSocket } from "ws";
import pg from "pg";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Gracefully handle malformed JSON payload errors sent to the server
app.use((err: any, req: Request, res: Response, next: any) => {
  if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
    return res.status(400).json({ 
      success: false, 
      message: `Invalid JSON payload format received by the server: ${err.message}` 
    });
  }
  next();
});

// Ensure directories exist
const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

app.use("/uploads", express.static(UPLOADS_DIR));

const DB_PATH = path.join(DATA_DIR, "db.json");

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.floor(Math.random() * 1e6)}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Initial Core Databases to preload
const INITIAL_DB = {
  users: [
    { id: "USR-001", fullName: "Super Admin", mobile: "9443312345", email: "admin@southindianholidays.com", username: "admin", password: "admin123", role: "admin", status: "Active", lastLogin: "Never" },
    { id: "USR-002", fullName: "Sales Desk", mobile: "9443354321", email: "sales@southindianholidays.com", username: "sales", password: "sales123", role: "sales", status: "Active", lastLogin: "Never" },
    { id: "USR-003", fullName: "Finance Officer", mobile: "9843210456", email: "accounts@southindianholidays.com", username: "accountant", password: "accountant123", role: "accountant", status: "Active", lastLogin: "Never" },
    { id: "USR-004", fullName: "Operations Coordinator", mobile: "9043254321", email: "ops@southindianholidays.com", username: "operations", password: "operations123", role: "operations", status: "Active", lastLogin: "Never" }
  ],
  expenses: [
    { id: "EXP-1001", description: "Office rent payment", amount: 15000, category: "Rent", date: "2026-07-01", approvedBy: "admin" },
    { id: "EXP-1002", description: "Internet broadband charges", amount: 1200, category: "Utilities", date: "2026-07-05", approvedBy: "admin" },
    { id: "EXP-1003", description: "Driver advance for SIH-BK-2026-1001", amount: 5000, category: "Operations", date: "2026-07-15", approvedBy: "admin" }
  ],
  settings: {
    companyName: "South Indian Holidays & Asset Management Pvt. Ltd.",
    gstNumber: "33AAECS0814M1Z2",
    address: "12, Kamarajar Salai, Madurai, Tamil Nadu - 625009",
    phone: "+91 94433 12345",
    email: "bookings@southindianholidays.com",
    bankName: "State Bank of India",
    bankAccount: "39485761029",
    bankIfsc: "SBIN0000253",
    upiId: "southindianholidays@sbi",
    website: "www.southindianholidays.com",
    logo: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=200&auto=format&fit=crop",
    quotationPrefix: "SIH-QT-",
    voucherPrefix: "SIH-VC-",
    invoicePrefix: "SIH-INV-",
    taxRate: 5
  },
  vouchers: [
    {
      id: "HBV-00001",
      guestName: "Amit Patel",
      guestMobile: "9876543210",
      guestEmail: "amit.patel@gmail.com",
      bookingId: "SIH-BK-2026-1001",
      customerId: "CUST-9842",
      hotelName: "Hotel Hilltop Tower",
      hotelAddress: "Lake Road, Kodaikanal, Tamil Nadu",
      hotelPhone: "9443152643",
      hotelEmail: "hilltop@kodaikanalhotels.com",
      hotelContactPerson: "Rajesh Kumar",
      destination: "kodaikanal",
      checkInDate: "2026-07-15",
      checkOutDate: "2026-07-18",
      numNights: 3,
      numRooms: 1,
      roomType: "Deluxe Premium",
      mealPlan: "CP (Breakfast Only)",
      numAdults: 2,
      numChildren: 1,
      numInfants: 0,
      confirmationNumber: "HT-CONF-49520",
      bookingStatus: "Confirmed",
      bookingDate: "2026-07-10",
      voucherDate: "2026-07-12",
      supplierName: "Aman Holiday Hotels Group",
      supplierContact: "9043254125",
      totalAmount: 9000,
      advancePaid: 5000,
      balanceAmount: 4000,
      paymentStatus: "Partially Paid",
      specialRequests: "Non-smoking room, lake view high floor if possible.",
      billingInstructions: "Room and taxes to be billed directly to South Indian Holidays. Extras to be settled by guest.",
      remarks: "Voucher re-sent on 14th Jul.",
      internalNotes: "Voucher verified by Manager"
    }
  ],
  products: [
    { id: "p1", name: "Kodaikanal Premium 3-Star Package", price: 14500, gst: 5, hsn: "9985" },
    { id: "p2", name: "Ooty Exotic Honeymoon Getaway", price: 18200, gst: 5, hsn: "9985" },
    { id: "p3", name: "Munnar Hills & Tea Garden Escape", price: 15800, gst: 5, hsn: "9985" }
  ],
  leads: [
    {
      id: "SIH-LD-00001",
      name: "Amit Patel",
      mobile: "9876543210",
      email: "amit.patel@gmail.com",
      destination: "kodaikanal",
      travelDate: "2026-08-15",
      adults: "2",
      children: "1",
      budget: 25000,
      notes: "Prefers window seats.",
      status: "New",
      priority: "High",
      source: "Website",
      tags: ["Hot", "Hill station"],
      documents: [],
      timeline: [{ timestamp: "12/07/2026", text: "Lead registered in South Indian Holidays system." }],
      followUpHistory: []
    }
  ],
  hotels: [
    { id: "H-01", name: "Hotel Hilltop Tower", destination: "kodaikanal", rating: "3-Star", contactPerson: "Rajesh Kumar", contactPhone: "9443152643", roomType: "Deluxe Premium", contractRate: 2800, availableRooms: 12 },
    { id: "H-02", name: "Hotel Baron Ooty", destination: "ooty", rating: "3-Star", contactPerson: "Suresh Nair", contactPhone: "9842109854", roomType: "Valley View Deluxe", contractRate: 3200, availableRooms: 8 }
  ],
  drivers: [
    { id: "DRV-01", name: "Muthu Pandi", mobile: "9442189765", vehicleType: "Toyota Innova Crysta", vehicleNo: "TN-59-BZ-1245", status: "Available", rating: "4.9" },
    { id: "DRV-02", name: "Selvam Karuppiah", mobile: "9843210987", vehicleType: "Tempo Traveller", vehicleNo: "TN-58-D-9988", status: "Available", rating: "4.7" }
  ],
  suppliers: [
    { id: "SUP-01", name: "Vignesh Transport Madurai", type: "Transport", contactPerson: "Vignesh Pillai", contactPhone: "9843102456", email: "vigneshtransports@gmail.com", rating: "4.8", balanceDue: 12500 },
    { id: "SUP-02", name: "Aman Holiday Hotels Group", type: "Hotel", contactPerson: "Aman Verma", contactPhone: "9043254125", email: "booking@amanhotels.in", rating: "4.5", balanceDue: 45000 }
  ],
  itineraries: [
    {
      id: "ITN-00001",
      bookingId: "SIH-BK-2026-1001",
      customerName: "Amit Patel",
      bookingNumber: "SIH-BK-2026-1001",
      destination: "kodaikanal",
      travelDate: "2026-07-15",
      days: [
        {
          dayNumber: 1,
          date: "2026-07-15",
          title: "Welcome to Kodaikanal & Sightseeing",
          description: "Arrive at Madurai or Kodaikanal Road station. Our representative will pick you up. Transfer to hotel in Kodaikanal. Check-in and relax. In the evening, visit the beautiful Kodaikanal Lake for boating and take a walk on Coaker's Walk for scenic valley views.",
          hotelName: "Hotel Hilltop Tower",
          meals: ["Breakfast", "Dinner"],
          transportDetails: "Pick-up from Madurai Airport & transfer to hotel in Private Sedan",
          notes: "Please carry some warm clothes as temperatures dip in the evening."
        },
        {
          dayNumber: 2,
          date: "2026-07-16",
          title: "Full Day Kodaikanal Local Tour",
          description: "After a delicious breakfast, proceed for a full-day sightseeing tour of Kodaikanal. Visit Pine Forest, Guna Caves (Devil's Kitchen), Pillar Rocks, Green Valley View (Suicide Point), and the Kurinji Andavar Temple. Spend the evening shopping at local Tibetan markets.",
          hotelName: "Hotel Hilltop Tower",
          meals: ["Breakfast"],
          transportDetails: "Sightseeing in Private Sedan",
          notes: "Entrance fees for Pillar Rocks and Guna Caves are to be paid directly."
        }
      ]
    }
  ],
  packages: [
    {
      id: "PKG-00001",
      name: "Kodaikanal Deluxe Explorer",
      destination: "kodaikanal",
      duration: "3 Days / 2 Nights",
      category: "Family Tour",
      price: 14500,
      hotelCategory: "3-Star Deluxe",
      inclusions: "Standard Stay, Private Sedan Sightseeing, Complimentary Breakfast, Lake boating vouchers",
      exclusions: "Flight/Train fares, Lunch & Dinner, Entrance fees at viewpoints, Personal expense tips",
      status: "Active"
    },
    {
      id: "PKG-00002",
      name: "Ooty Exotic Honeymoon Getaway",
      destination: "ooty",
      duration: "4 Days / 3 Nights",
      category: "Honeymoon",
      price: 18200,
      hotelCategory: "3-Star Deluxe",
      inclusions: "Valley view premium stays, Flower bed decoration, Homemade chocolates & fruit basket, Sightseeing transport",
      exclusions: "Personal shopping, Driver tips, Camera charges, Extra meals",
      status: "Active"
    },
    {
      id: "PKG-00003",
      name: "Munnar Hills & Tea Garden Escape",
      destination: "munnar",
      duration: "3 Days / 2 Nights",
      category: "Nature & Hills",
      price: 15800,
      hotelCategory: "4-Star Luxury",
      inclusions: "Luxury stay at Munnar Castle, Guided trekking, Spice plantation visit, Buffet breakfast & dinner",
      exclusions: "Boating charges, Laundry services, Alcoholic beverages, Travel insurance",
      status: "Active"
    }
  ],
  bookings: [
    {
      id: "SIH-BK-2026-1001",
      customerId: "CUST-9842",
      customerName: "Amit Patel",
      customerMobile: "9876543210",
      customerEmail: "amit.patel@gmail.com",
      destination: "kodaikanal",
      travelDate: "2026-07-15",
      adults: 2,
      children: 1,
      packagePrice: 14500,
      hotelDetails: "Hotel Hilltop Tower (CP)",
      driverDetails: "Muthu Pandi (Sedan)",
      status: "Confirmed",
      timeline: [{ timestamp: "15/07/2026", text: "Booking created and vouchers locked." }],
      documents: []
    }
  ],
  payments: [
    {
      id: "SIH-PAY-1001",
      bookingId: "SIH-BK-2026-1001",
      customerName: "Amit Patel",
      totalAmount: 14500,
      advancePaid: 10000,
      balanceAmount: 4500,
      status: "Partially Paid",
      installments: [
        { id: "INST-1", amount: 10000, date: "2026-07-12", method: "UPI", referenceNo: "REF94857201" }
      ]
    }
  ],
  logs: [
    { id: "log-1", timestamp: "2026-07-15T08:00:00.000Z", username: "admin", action: "System initialized and default database loaded." }
  ],
  whatsappTemplates: [
    {
      id: "wt-1",
      name: "Lead Greeting & Welcome",
      category: "Leads",
      message: "Namaste {customerName},\n\nThank you for contacting South Indian Holidays! 🌴🎒\nWe have received your request for a trip to {destination} on {travelDate} for {adults} adults and {children} children.\n\nOur travel specialist is designing a customized, premium itinerary for you. We will share it with you shortly!\n\nIf you have any special requirements, please reply to this message.\n\nWarm Regards,\n{companyName}\n📞 {companyPhone}\n🌐 {companyWebsite}"
    },
    {
      id: "wt-2",
      name: "Quotation / Package Sharing",
      category: "Quotations",
      message: "Hello {customerName},\n\nHope you are doing well! ☀️\n\nWe are excited to share our customized tour quotation for your upcoming travel to {destination}:\n📦 Package: {packageName}\n⏳ Duration: {duration}\n💰 Offer Price: ₹{packagePrice} (inclusive of GST)\n🏨 Stays: {hotelCategory}\n\nCheck out the inclusions:\n✨ {inclusions}\n\nPlease reply with your feedback or to request any adjustments. We look forward to hosting you!\n\nWarm Regards,\n{companyName}"
    },
    {
      id: "wt-3",
      name: "Booking Confirmation Summary",
      category: "Bookings",
      message: "Dear {customerName},\n\nYour booking is CONFIRMED! 🎉✈️\n\nThank you for choosing South Indian Holidays. Here are your booking details:\n🆔 Booking ID: {bookingId}\n📍 Destination: {destination}\n📅 Travel Date: {travelDate}\n👥 Travelers: {adults} Adults, {children} Children\n💰 Total Package Value: ₹{packagePrice}\n✅ Advance Received: ₹{advancePaid}\n⏳ Pending Balance: ₹{balanceAmount}\n\nYour digital vouchers and itinerary details have been locked in. Have a fabulous journey ahead!\n\nRegards,\n{companyName}"
    },
    {
      id: "wt-4",
      name: "Hotel Voucher Sharing",
      category: "Vouchers",
      message: "Namaste {customerName},\n\nHere are your stay voucher details for {hotelName} in {destination}:\n\n🏨 Hotel: {hotelName}\n📍 Location: {destination}\n📅 Check-in: {checkInDate}\n📅 Check-out: {checkOutDate}\n🛌 Room Type: {roomType}\n🍽️ Meal Plan: {mealPlan}\n🔢 Rooms: {numRooms} | Guests: {numAdults} Adults, {numChildren} Children\n🔑 Confirmation No: {confirmationNumber}\n\nPlease present a copy of this voucher at the reception during check-in. Have a comfortable and memorable stay!\n\nWarm Regards,\n{companyName}"
    },
    {
      id: "wt-5",
      name: "Payment Reminder & Ledger Summary",
      category: "Payments",
      message: "Dear {customerName},\n\nThis is a gentle reminder regarding the pending balance payment for your upcoming trip to {destination}.\n\n💳 Total Amount: ₹{totalAmount}\n✅ Advance Received: ₹{advancePaid}\n⚠️ Pending Balance: ₹{balanceAmount}\n\nPlease process the remittance of ₹{balanceAmount} using any of the following coordinates:\n🏦 Bank: {bankName}\n🔢 Account No: {bankAccount}\n🔑 IFSC Code: {bankIfsc}\n📱 UPI ID: {upiId}\n\nOnce paid, please share a screenshot of the receipt here. Thank you for your cooperation!\n\nBest Regards,\n{companyName}"
    },
    {
      id: "wt-6",
      name: "Cab & Driver Detail Notification",
      category: "Fleet",
      message: "Hello {customerName},\n\nYour private cab and driver details for your tour of {destination} have been assigned:\n\n🚗 Vehicle: {vehicleType}\n🔢 Vehicle No: {vehicleNo}\n👨🏻‍✈️ Driver Name: {driverName}\n📞 Driver Contact: {driverMobile}\n\nOur professional driver will greet you at the arrival point. Please contact him or our operations desk if you need any assistance.\n\nWish you a safe and scenic drive!\n\nBest Regards,\n{companyName}"
    },
    {
      id: "wt-7",
      name: "Welcome Back & Feedback Survey",
      category: "Other",
      message: "Welcome back, {customerName}! 🌸🏠\n\nWe hope you had an extraordinary and comfortable experience during your {destination} tour with us!\n\nWe would highly appreciate it if you could spare 2 minutes to share your feedback or rate our services. It helps us improve our customer experience!\n\nLooking forward to planning your next vacation soon.\n\nBest Regards,\n{companyName}"
    }
  ],
  whatsappLogs: [
    {
      id: "wl-1",
      timestamp: "2026-07-15T09:30:00.000Z",
      customerName: "Amit Patel",
      mobile: "9876543210",
      templateName: "Lead Greeting & Welcome",
      messageText: "Namaste Amit Patel,\n\nThank you for contacting South Indian Holidays...",
      sentBy: "admin"
    }
  ],
  whatsappConversations: [
    {
      id: "conv-amit",
      customerName: "Amit Patel",
      mobile: "9876543210",
      unreadCount: 2,
      assignedTo: "admin",
      lastMessage: "Is breakfast buffet included?",
      lastTimestamp: "2026-07-15T11:45:00.000Z"
    },
    {
      id: "conv-priya",
      customerName: "Priya Sharma",
      mobile: "9443312345",
      unreadCount: 0,
      assignedTo: "sales",
      lastMessage: "Thank you for the prompt update! Vouchers received.",
      lastTimestamp: "2026-07-15T09:30:00.000Z"
    }
  ],
  whatsappMessages: [
    {
      id: "msg-1",
      conversationId: "conv-amit",
      sender: "customer",
      senderName: "Amit Patel",
      text: "Namaste! I am interested in booking the Kodaikanal Deluxe Explorer package for 3 people.",
      timestamp: "2026-07-14T10:00:00.000Z"
    },
    {
      id: "msg-2",
      conversationId: "conv-amit",
      sender: "agent",
      senderName: "Super Admin",
      text: "Namaste Amit ji! Thank you for contacting South Indian Holidays. Here is the customized package details.",
      timestamp: "2026-07-14T10:15:00.000Z"
    },
    {
      id: "msg-3",
      conversationId: "conv-amit",
      sender: "agent",
      senderName: "Super Admin",
      text: "Here is the PDF quotation for your review.",
      attachmentUrl: "/api/quotations/SIH-QT-1001/pdf",
      attachmentType: "pdf",
      timestamp: "2026-07-14T11:00:00.000Z"
    },
    {
      id: "msg-4",
      conversationId: "conv-amit",
      sender: "customer",
      senderName: "Amit Patel",
      text: "Looks perfect! I've paid the advance of ₹10,000.",
      timestamp: "2026-07-14T14:30:00.000Z"
    },
    {
      id: "msg-5",
      conversationId: "conv-amit",
      sender: "customer",
      senderName: "Amit Patel",
      text: "When can we expect driver assignment?",
      timestamp: "2026-07-15T11:40:00.000Z"
    },
    {
      id: "msg-6",
      conversationId: "conv-amit",
      sender: "customer",
      senderName: "Amit Patel",
      text: "Is breakfast buffet included?",
      timestamp: "2026-07-15T11:45:00.000Z"
    },
    {
      id: "msg-7",
      conversationId: "conv-priya",
      sender: "customer",
      senderName: "Priya Sharma",
      text: "Hi Priya here, can you send the Ooty stay voucher?",
      timestamp: "2026-07-15T08:00:00.000Z"
    },
    {
      id: "msg-8",
      conversationId: "conv-priya",
      sender: "agent",
      senderName: "sales",
      text: "Hi Priya! Sending you the hotel stay voucher PDF file.",
      attachmentUrl: "/api/vouchers/SIH-VC-1001/pdf",
      attachmentType: "pdf",
      timestamp: "2026-07-15T09:00:00.000Z"
    },
    {
      id: "msg-9",
      conversationId: "conv-priya",
      sender: "customer",
      senderName: "Priya Sharma",
      text: "Thank you for the prompt update! Vouchers received.",
      timestamp: "2026-07-15T09:30:00.000Z"
    }
  ],
  quotations: []
};

// Database state accessor
let db = { ...INITIAL_DB };

const { Pool } = pg;
let pool: any = null;

const dbUrl = process.env.DATABASE_URL;
if (dbUrl && !dbUrl.includes("hidden") && !dbUrl.includes("placeholder") && !dbUrl.includes("MY_DATABASE_URL") && (dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://"))) {
  try {
    // Dynamic SSL determination based on connection target
    let sslConfig: any = false;
    if (!dbUrl.includes("localhost") && !dbUrl.includes("127.0.0.1")) {
      if (dbUrl.includes("sslmode=disable")) {
        sslConfig = false;
      } else {
        sslConfig = { rejectUnauthorized: false };
      }
    }

    pool = new Pool({
      connectionString: dbUrl,
      max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 10,
      idleTimeoutMillis: process.env.DB_IDLE_TIMEOUT ? parseInt(process.env.DB_IDLE_TIMEOUT, 10) : 30000,
      connectionTimeoutMillis: process.env.DB_CONN_TIMEOUT ? parseInt(process.env.DB_CONN_TIMEOUT, 10) : 10000,
      ssl: sslConfig,
    });

    // CRITICAL: Register an error handler on the idle pool clients to prevent unhandled process crashes
    pool.on("error", (err: any) => {
      console.error("Unexpected idle client error in PostgreSQL pool:", err.message || err);
    });

    console.log("PostgreSQL connection pool initialized with DATABASE_URL (SSL Mode: " + (sslConfig ? "Enabled" : "Disabled") + ")");
  } catch (poolErr: any) {
    console.error("Failed to initialize PostgreSQL pool:", poolErr.message || poolErr);
  }
} else {
  console.log("No valid DATABASE_URL found. Running in local JSON file-db fallback mode.");
}

// Redact database passwords from logged error messages or connection strings
function redactSecrets(message: string): string {
  return message.replace(/postgres(?:ql)?:\/\/([^:]+):([^@]+)@/, "postgresql://$1:****@");
}

async function syncWithPostgres() {
  if (!pool) return;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      console.log(`Connecting to PostgreSQL database to sync data (attempt ${attempt}/5)...`);
      
      // Ensure the table exists with id as PRIMARY KEY
      await pool.query(`
        CREATE TABLE IF NOT EXISTS crm_database (
          id INT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Try to read the database state
      const result = await pool.query("SELECT data FROM crm_database ORDER BY id DESC LIMIT 1");
      if (result.rows.length > 0) {
        const pgDb = result.rows[0].data;
        if (pgDb && typeof pgDb === "object") {
          db = { ...db, ...pgDb };
          // Save locally as fallback
          fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
          console.log("Successfully loaded latest CRM state from PostgreSQL database and updated local cache");
          return;
        }
      } else {
        // If empty, seed initial state
        await pool.query("INSERT INTO crm_database (id, data) VALUES (1, $1)", [JSON.stringify(db)]);
        console.log("Seeded empty PostgreSQL database with initial data state");
        return;
      }
    } catch (err: any) {
      let classification = "General Database Error";
      if (err.code === "28P01" || err.code === "28000") {
        classification = "Database Authentication Failure (Verify credentials)";
      } else if (err.code === "ENOTFOUND") {
        classification = "Database DNS Hostname Resolution Failure (Host is unreachable)";
      } else if (err.code === "ECONNREFUSED") {
        classification = "Database Connection Refused (Server offline or port mismatched)";
      } else if (err.code === "ETIMEDOUT" || err.message?.includes("timeout")) {
        classification = "Database Connection Timeout (Network lag or firewall blocks)";
      } else if (err.message?.includes("SSL") || err.message?.includes("protocol")) {
        classification = "Database SSL/TLS Handshake Failure";
      }

      console.error(`[DATABASE-SYNC-ERROR] Attempt ${attempt}/5 failed: ${classification}`);
      console.error(`Reason (redacted): ${err.code || "N/A"} - ${redactSecrets(err.message || String(err))}`);
      
      if (attempt === 5) {
        console.error("Exceeded maximum database sync attempts. Safely continuing with local JSON database state.");
      } else {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }
}

async function initializeRelationalTables() {
  if (!pool) return;
  try {
    console.log("Initializing normalized relational tables in PostgreSQL...");
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        mobile VARCHAR(100),
        email VARCHAR(255),
        username VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'Active',
        last_login VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        mobile VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        destination VARCHAR(255) NOT NULL,
        travel_date VARCHAR(100),
        adults INT DEFAULT 2,
        children INT DEFAULT 0,
        budget NUMERIC(15, 2),
        notes TEXT,
        status VARCHAR(100) NOT NULL,
        priority VARCHAR(50) DEFAULT 'Medium',
        assigned_to VARCHAR(255),
        source VARCHAR(100),
        tags TEXT[],
        documents JSONB DEFAULT '[]',
        timeline JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS followups (
        id VARCHAR(255) PRIMARY KEY,
        date VARCHAR(100) NOT NULL,
        time VARCHAR(100),
        type VARCHAR(100) NOT NULL,
        priority VARCHAR(50) DEFAULT 'Medium',
        remarks TEXT,
        assigned_to VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        completion_date VARCHAR(100),
        completion_time VARCHAR(100),
        lead_id VARCHAR(255) REFERENCES leads(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tour_packages (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        destination VARCHAR(255) NOT NULL,
        duration VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        price NUMERIC(15, 2) NOT NULL,
        hotel_category VARCHAR(100),
        inclusions TEXT,
        exclusions TEXT,
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(255) PRIMARY KEY,
        lead_id VARCHAR(255) REFERENCES leads(id) ON DELETE SET NULL,
        customer_id VARCHAR(255) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_mobile VARCHAR(100) NOT NULL,
        customer_email VARCHAR(255),
        destination VARCHAR(255) NOT NULL,
        travel_date VARCHAR(100) NOT NULL,
        adults INT DEFAULT 2,
        children INT DEFAULT 0,
        package_price NUMERIC(15, 2) NOT NULL,
        hotel_details TEXT,
        driver_details TEXT,
        status VARCHAR(100) NOT NULL,
        timeline JSONB DEFAULT '[]',
        documents JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS hotel_vouchers (
        id VARCHAR(255) PRIMARY KEY,
        booking_id VARCHAR(255) REFERENCES bookings(id) ON DELETE CASCADE,
        customer_id VARCHAR(255) NOT NULL,
        guest_name VARCHAR(255) NOT NULL,
        guest_mobile VARCHAR(100) NOT NULL,
        guest_email VARCHAR(255),
        hotel_name VARCHAR(255) NOT NULL,
        hotel_address TEXT,
        hotel_phone VARCHAR(100),
        hotel_email VARCHAR(255),
        hotel_contact_person VARCHAR(255),
        destination VARCHAR(255) NOT NULL,
        check_in_date VARCHAR(100) NOT NULL,
        check_out_date VARCHAR(100) NOT NULL,
        num_nights INT DEFAULT 1,
        num_rooms INT DEFAULT 1,
        room_type VARCHAR(100),
        meal_plan VARCHAR(100),
        num_adults INT DEFAULT 2,
        num_children INT DEFAULT 0,
        num_infants INT DEFAULT 0,
        confirmation_number VARCHAR(255),
        booking_status VARCHAR(100) DEFAULT 'Confirmed',
        booking_date VARCHAR(100),
        voucher_date VARCHAR(100),
        supplier_name VARCHAR(255),
        supplier_contact VARCHAR(100),
        total_amount NUMERIC(15, 2) DEFAULT 0,
        advance_paid NUMERIC(15, 2) DEFAULT 0,
        balance_amount NUMERIC(15, 2) DEFAULT 0,
        payment_status VARCHAR(50) DEFAULT 'Unpaid',
        special_requests TEXT,
        billing_instructions TEXT,
        remarks TEXT,
        internal_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS itineraries (
        id VARCHAR(255) PRIMARY KEY,
        booking_id VARCHAR(255) REFERENCES bookings(id) ON DELETE CASCADE,
        customer_name VARCHAR(255) NOT NULL,
        booking_number VARCHAR(100) NOT NULL,
        destination VARCHAR(255) NOT NULL,
        travel_date VARCHAR(100) NOT NULL,
        days JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_ledgers (
        id VARCHAR(255) PRIMARY KEY,
        booking_id VARCHAR(255) UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
        customer_name VARCHAR(255) NOT NULL,
        total_amount NUMERIC(15, 2) DEFAULT 0,
        advance_paid NUMERIC(15, 2) DEFAULT 0,
        balance_amount NUMERIC(15, 2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Unpaid',
        installments JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id VARCHAR(255) PRIMARY KEY,
        description TEXT NOT NULL,
        amount NUMERIC(15, 2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        date VARCHAR(100) NOT NULL,
        approved_by VARCHAR(255) NOT NULL,
        receipt_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS hotels (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        destination VARCHAR(255) NOT NULL,
        rating VARCHAR(50),
        contact_person VARCHAR(255),
        contact_phone VARCHAR(100),
        room_type VARCHAR(100),
        contract_rate NUMERIC(15, 2) DEFAULT 0,
        available_rooms INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        mobile VARCHAR(100) NOT NULL,
        vehicle_type VARCHAR(100),
        vehicle_no VARCHAR(100),
        status VARCHAR(100) DEFAULT 'Available',
        rating VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        contact_person VARCHAR(255),
        contact_phone VARCHAR(100),
        email VARCHAR(255),
        rating VARCHAR(50),
        balance_due NUMERIC(15, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT PRIMARY KEY DEFAULT 1,
        company_name VARCHAR(255) NOT NULL,
        gst_number VARCHAR(100),
        address TEXT,
        phone VARCHAR(100),
        email VARCHAR(255),
        bank_name VARCHAR(255),
        bank_account VARCHAR(100),
        bank_ifsc VARCHAR(100),
        upi_id VARCHAR(255),
        website VARCHAR(255),
        logo TEXT,
        quotation_prefix VARCHAR(50) DEFAULT 'SIH-QT-',
        voucher_prefix VARCHAR(50) DEFAULT 'SIH-VC-',
        invoice_prefix VARCHAR(50) DEFAULT 'SIH-INV-',
        tax_rate NUMERIC(5, 2) DEFAULT 5.00,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id VARCHAR(255) PRIMARY KEY,
        timestamp VARCHAR(100) NOT NULL,
        username VARCHAR(100) NOT NULL,
        action TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_conversations (
        id VARCHAR(255) PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        mobile VARCHAR(100) UNIQUE NOT NULL,
        unread_count INT DEFAULT 0,
        assigned_to VARCHAR(255),
        last_message TEXT,
        last_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id VARCHAR(255) PRIMARY KEY,
        conversation_id VARCHAR(255) REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
        sender VARCHAR(50) NOT NULL,
        sender_name VARCHAR(255),
        text TEXT,
        attachment_url TEXT,
        attachment_type VARCHAR(50),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS quotations (
        id VARCHAR(255) PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(100) NOT NULL,
        customer_email VARCHAR(255),
        pickup_city VARCHAR(255) DEFAULT 'Coimbatore',
        destination VARCHAR(255) NOT NULL,
        travel_date VARCHAR(100),
        num_days INT DEFAULT 3,
        adults INT DEFAULT 2,
        children INT DEFAULT 0,
        discount_percent NUMERIC(5, 2) DEFAULT 0.00,
        terms_index INT DEFAULT 0,
        vehicle_details TEXT,
        hotel_details TEXT,
        day_wise_itinerary TEXT,
        status VARCHAR(100) DEFAULT 'Draft',
        quotation_number VARCHAR(100) UNIQUE,
        pdf_path TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS quotation_items (
        id VARCHAR(255) PRIMARY KEY,
        quotation_id VARCHAR(255) REFERENCES quotations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        hsn VARCHAR(100) DEFAULT '9985',
        qty INT DEFAULT 1,
        rate NUMERIC(15, 2) NOT NULL,
        gst NUMERIC(5, 2) DEFAULT 5.00
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_templates (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_logs (
        id VARCHAR(255) PRIMARY KEY,
        timestamp VARCHAR(100) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        mobile VARCHAR(100) NOT NULL,
        template_name VARCHAR(255) NOT NULL,
        message_text TEXT NOT NULL,
        sent_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query("CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_followups_date ON followups(date)");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_mobile ON whatsapp_conversations(mobile)");

    console.log("Successfully initialized/verified all 20 normalized relational database tables!");
  } catch (err: any) {
    console.error("[SCHEMA-INIT-ERROR] Failed to initialize relational tables:", redactSecrets(err.message || String(err)));
  }
}

async function syncRelationalDatabase() {
  if (!pool) return;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // 1. Sync users
    if (Array.isArray(db.users)) {
      for (const u of db.users) {
        await client.query(`
          INSERT INTO users (id, full_name, mobile, email, username, password, role, status, last_login)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            mobile = EXCLUDED.mobile,
            email = EXCLUDED.email,
            username = EXCLUDED.username,
            password = EXCLUDED.password,
            role = EXCLUDED.role,
            status = EXCLUDED.status,
            last_login = EXCLUDED.last_login,
            updated_at = CURRENT_TIMESTAMP
        `, [u.id, u.fullName, u.mobile || null, u.email || null, u.username, u.password, u.role, u.status || "Active", u.lastLogin]);
      }
    }

    // 2. Sync leads & followups
    if (Array.isArray(db.leads)) {
      for (const l of db.leads) {
        const adultsVal = typeof l.adults === "number" ? l.adults : parseInt(l.adults, 10) || 2;
        const childrenVal = typeof l.children === "number" ? l.children : parseInt(l.children, 10) || 0;
        await client.query(`
          INSERT INTO leads (id, name, mobile, email, destination, travel_date, adults, children, budget, notes, status, priority, assigned_to, source, tags, documents, timeline)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            mobile = EXCLUDED.mobile,
            email = EXCLUDED.email,
            destination = EXCLUDED.destination,
            travel_date = EXCLUDED.travel_date,
            adults = EXCLUDED.adults,
            children = EXCLUDED.children,
            budget = EXCLUDED.budget,
            notes = EXCLUDED.notes,
            status = EXCLUDED.status,
            priority = EXCLUDED.priority,
            assigned_to = EXCLUDED.assigned_to,
            source = EXCLUDED.source,
            tags = EXCLUDED.tags,
            documents = EXCLUDED.documents,
            timeline = EXCLUDED.timeline,
            updated_at = CURRENT_TIMESTAMP
        `, [
          l.id, l.name, l.mobile, l.email || null, l.destination, l.travelDate || null,
          adultsVal, childrenVal, l.budget || null, l.notes || "", l.status, l.priority || "Medium",
          l.assignedTo || null, l.source || null, l.tags || [],
          JSON.stringify(l.documents || []), JSON.stringify(l.timeline || [])
        ]);

        const fuHistory = Array.isArray(l.followUpHistory) ? l.followUpHistory : [];
        for (const fu of fuHistory) {
          const fuId = fu.id || `fu-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          await client.query(`
            INSERT INTO followups (id, date, time, type, priority, remarks, assigned_to, status, completion_date, completion_time, lead_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (id) DO UPDATE SET
              date = EXCLUDED.date,
              time = EXCLUDED.time,
              type = EXCLUDED.type,
              priority = EXCLUDED.priority,
              remarks = EXCLUDED.remarks,
              assigned_to = EXCLUDED.assigned_to,
              status = EXCLUDED.status,
              completion_date = EXCLUDED.completion_date,
              completion_time = EXCLUDED.completion_time,
              lead_id = EXCLUDED.lead_id,
              updated_at = CURRENT_TIMESTAMP
          `, [
            fuId, fu.date, fu.time || null, fu.type, fu.priority || "Medium",
            fu.remarks || fu.notes || "", fu.assignedTo || fu.staff || "", fu.status || "Pending",
            fu.completionDate || null, fu.completionTime || null, l.id
          ]);
        }
      }
    }

    // 3. Sync packages (db.packages)
    if (Array.isArray(db.packages)) {
      for (const p of db.packages) {
        await client.query(`
          INSERT INTO tour_packages (id, name, destination, duration, category, price, hotel_category, inclusions, exclusions, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            destination = EXCLUDED.destination,
            duration = EXCLUDED.duration,
            category = EXCLUDED.category,
            price = EXCLUDED.price,
            hotel_category = EXCLUDED.hotel_category,
            inclusions = EXCLUDED.inclusions,
            exclusions = EXCLUDED.exclusions,
            status = EXCLUDED.status,
            updated_at = CURRENT_TIMESTAMP
        `, [p.id, p.name, p.destination, p.duration, p.category || null, p.price, p.hotelCategory || null, p.inclusions || "", p.exclusions || "", p.status || "Active"]);
      }
    }

    // 4. Sync bookings
    if (Array.isArray(db.bookings)) {
      for (const b of db.bookings) {
        const adultsVal = typeof b.adults === "number" ? b.adults : parseInt(b.adults, 10) || 2;
        const childrenVal = typeof b.children === "number" ? b.children : parseInt(b.children, 10) || 0;
        await client.query(`
          INSERT INTO bookings (id, lead_id, customer_id, customer_name, customer_mobile, customer_email, destination, travel_date, adults, children, package_price, hotel_details, driver_details, status, timeline, documents)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (id) DO UPDATE SET
            lead_id = EXCLUDED.lead_id,
            customer_id = EXCLUDED.customer_id,
            customer_name = EXCLUDED.customer_name,
            customer_mobile = EXCLUDED.customer_mobile,
            customer_email = EXCLUDED.customer_email,
            destination = EXCLUDED.destination,
            travel_date = EXCLUDED.travel_date,
            adults = EXCLUDED.adults,
            children = EXCLUDED.children,
            package_price = EXCLUDED.package_price,
            hotel_details = EXCLUDED.hotel_details,
            driver_details = EXCLUDED.driver_details,
            status = EXCLUDED.status,
            timeline = EXCLUDED.timeline,
            documents = EXCLUDED.documents,
            updated_at = CURRENT_TIMESTAMP
        `, [
          b.id, b.leadId || null, b.customerId, b.customerName, b.customerMobile, b.customerEmail || null,
          b.destination, b.travelDate, adultsVal, childrenVal,
          b.packagePrice || 0, b.hotelDetails || "", b.driverDetails || "", b.status,
          JSON.stringify(b.timeline || []), JSON.stringify(b.documents || [])
        ]);
      }
    }

    // 5. Sync hotel_vouchers (db.vouchers)
    if (Array.isArray(db.vouchers)) {
      for (const v of db.vouchers) {
        const nightsVal = typeof v.numNights === "number" ? v.numNights : parseInt(v.numNights, 10) || 1;
        const roomsVal = typeof v.numRooms === "number" ? v.numRooms : parseInt(v.numRooms, 10) || 1;
        const adultsVal = typeof v.numAdults === "number" ? v.numAdults : parseInt(v.numAdults, 10) || 2;
        const childrenVal = typeof v.numChildren === "number" ? v.numChildren : parseInt(v.numChildren, 10) || 0;
        const infantsVal = typeof v.numInfants === "number" ? v.numInfants : parseInt(v.numInfants, 10) || 0;
        await client.query(`
          INSERT INTO hotel_vouchers (id, booking_id, customer_id, guest_name, guest_mobile, guest_email, hotel_name, hotel_address, hotel_phone, hotel_email, hotel_contact_person, destination, check_in_date, check_out_date, num_nights, num_rooms, room_type, meal_plan, num_adults, num_children, num_infants, confirmation_number, booking_status, booking_date, voucher_date, supplier_name, supplier_contact, total_amount, advance_paid, balance_amount, payment_status, special_requests, billing_instructions, remarks, internal_notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35)
          ON CONFLICT (id) DO UPDATE SET
            booking_id = EXCLUDED.booking_id,
            customer_id = EXCLUDED.customer_id,
            guest_name = EXCLUDED.guest_name,
            guest_mobile = EXCLUDED.guest_mobile,
            guest_email = EXCLUDED.guest_email,
            hotel_name = EXCLUDED.hotel_name,
            hotel_address = EXCLUDED.hotel_address,
            hotel_phone = EXCLUDED.hotel_phone,
            hotel_email = EXCLUDED.hotel_email,
            hotel_contact_person = EXCLUDED.hotel_contact_person,
            destination = EXCLUDED.destination,
            check_in_date = EXCLUDED.check_in_date,
            check_out_date = EXCLUDED.check_out_date,
            num_nights = EXCLUDED.num_nights,
            num_rooms = EXCLUDED.num_rooms,
            room_type = EXCLUDED.room_type,
            meal_plan = EXCLUDED.meal_plan,
            num_adults = EXCLUDED.num_adults,
            num_children = EXCLUDED.num_children,
            num_infants = EXCLUDED.num_infants,
            confirmation_number = EXCLUDED.confirmation_number,
            booking_status = EXCLUDED.booking_status,
            booking_date = EXCLUDED.booking_date,
            voucher_date = EXCLUDED.voucher_date,
            supplier_name = EXCLUDED.supplier_name,
            supplier_contact = EXCLUDED.supplier_contact,
            total_amount = EXCLUDED.total_amount,
            advance_paid = EXCLUDED.advance_paid,
            balance_amount = EXCLUDED.balance_amount,
            payment_status = EXCLUDED.payment_status,
            special_requests = EXCLUDED.special_requests,
            billing_instructions = EXCLUDED.billing_instructions,
            remarks = EXCLUDED.remarks,
            internal_notes = EXCLUDED.internal_notes,
            updated_at = CURRENT_TIMESTAMP
        `, [
          v.id, v.bookingId, v.customerId, v.guestName, v.guestMobile, v.guestEmail || null,
          v.hotelName, v.hotelAddress || "", v.hotelPhone || null, v.hotelEmail || null, v.hotelContactPerson || null,
          v.destination, v.checkInDate, v.checkOutDate, nightsVal, roomsVal,
          v.roomType || null, v.mealPlan || null, adultsVal, childrenVal, infantsVal,
          v.confirmationNumber || null, v.bookingStatus || 'Confirmed', v.bookingDate || null, v.voucherDate || null,
          v.supplierName || null, v.supplierContact || null, v.totalAmount || 0, v.advancePaid || 0, v.balanceAmount || 0,
          v.paymentStatus || 'Unpaid', v.specialRequests || null, v.billingInstructions || null, v.remarks || null, v.internalNotes || null
        ]);
      }
    }

    // 6. Sync itineraries
    if (Array.isArray(db.itineraries)) {
      for (const it of db.itineraries) {
        await client.query(`
          INSERT INTO itineraries (id, booking_id, customer_name, booking_number, destination, travel_date, days)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            booking_id = EXCLUDED.booking_id,
            customer_name = EXCLUDED.customer_name,
            booking_number = EXCLUDED.booking_number,
            destination = EXCLUDED.destination,
            travel_date = EXCLUDED.travel_date,
            days = EXCLUDED.days,
            updated_at = CURRENT_TIMESTAMP
        `, [it.id, it.bookingId, it.customerName, it.bookingNumber || it.bookingId, it.destination, it.travelDate, JSON.stringify(it.days || [])]);
      }
    }

    // 7. Sync payment_ledgers (db.payments)
    if (Array.isArray(db.payments)) {
      for (const py of db.payments) {
        await client.query(`
          INSERT INTO payment_ledgers (id, booking_id, customer_name, total_amount, advance_paid, balance_amount, status, installments)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO UPDATE SET
            booking_id = EXCLUDED.booking_id,
            customer_name = EXCLUDED.customer_name,
            total_amount = EXCLUDED.total_amount,
            advance_paid = EXCLUDED.advance_paid,
            balance_amount = EXCLUDED.balance_amount,
            status = EXCLUDED.status,
            installments = EXCLUDED.installments,
            updated_at = CURRENT_TIMESTAMP
        `, [py.id, py.bookingId, py.customerName, py.totalAmount || 0, py.advancePaid || 0, py.balanceAmount || 0, py.status || 'Unpaid', JSON.stringify(py.installments || [])]);
      }
    }

    // 8. Sync expenses
    if (Array.isArray(db.expenses)) {
      for (const ex of db.expenses) {
        await client.query(`
          INSERT INTO expenses (id, description, amount, category, date, approved_by, receipt_url)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            description = EXCLUDED.description,
            amount = EXCLUDED.amount,
            category = EXCLUDED.category,
            date = EXCLUDED.date,
            approved_by = EXCLUDED.approved_by,
            receipt_url = EXCLUDED.receipt_url,
            updated_at = CURRENT_TIMESTAMP
        `, [ex.id, ex.description, ex.amount, ex.category, ex.date, ex.approvedBy, ex.receiptUrl || null]);
      }
    }

    // 9. Sync hotels
    if (Array.isArray(db.hotels)) {
      for (const h of db.hotels) {
        await client.query(`
          INSERT INTO hotels (id, name, destination, rating, contact_person, contact_phone, room_type, contract_rate, available_rooms)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            destination = EXCLUDED.destination,
            rating = EXCLUDED.rating,
            contact_person = EXCLUDED.contact_person,
            contact_phone = EXCLUDED.contact_phone,
            room_type = EXCLUDED.room_type,
            contract_rate = EXCLUDED.contract_rate,
            available_rooms = EXCLUDED.available_rooms,
            updated_at = CURRENT_TIMESTAMP
        `, [h.id, h.name, h.destination, h.rating || null, h.contactPerson || null, h.contactPhone || null, h.roomType || null, h.contractRate || 0, h.availableRooms || 0]);
      }
    }

    // 10. Sync drivers
    if (Array.isArray(db.drivers)) {
      for (const d of db.drivers) {
        await client.query(`
          INSERT INTO drivers (id, name, mobile, vehicle_type, vehicle_no, status, rating)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            mobile = EXCLUDED.mobile,
            vehicle_type = EXCLUDED.vehicle_type,
            vehicle_no = EXCLUDED.vehicle_no,
            status = EXCLUDED.status,
            rating = EXCLUDED.rating,
            updated_at = CURRENT_TIMESTAMP
        `, [d.id, d.name, d.mobile, d.vehicleType || null, d.vehicleNo || null, d.status || 'Available', d.rating || null]);
      }
    }

    // 11. Sync suppliers
    if (Array.isArray(db.suppliers)) {
      for (const s of db.suppliers) {
        await client.query(`
          INSERT INTO suppliers (id, name, type, contact_person, contact_phone, email, rating, balance_due)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            type = EXCLUDED.type,
            contact_person = EXCLUDED.contact_person,
            contact_phone = EXCLUDED.contact_phone,
            email = EXCLUDED.email,
            rating = EXCLUDED.rating,
            balance_due = EXCLUDED.balance_due,
            updated_at = CURRENT_TIMESTAMP
        `, [s.id, s.name, s.type, s.contactPerson || null, s.contactPhone || null, s.email || null, s.rating || null, s.balanceDue || 0]);
      }
    }

    // 12. Sync settings
    if (db.settings) {
      await client.query(`
        INSERT INTO settings (id, company_name, gst_number, address, phone, email, bank_name, bank_account, bank_ifsc, upi_id, website, logo, quotation_prefix, voucher_prefix, invoice_prefix, tax_rate)
        VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET
          company_name = EXCLUDED.company_name,
          gst_number = EXCLUDED.gst_number,
          address = EXCLUDED.address,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          bank_name = EXCLUDED.bank_name,
          bank_account = EXCLUDED.bank_account,
          bank_ifsc = EXCLUDED.bank_ifsc,
          upi_id = EXCLUDED.upi_id,
          website = EXCLUDED.website,
          logo = EXCLUDED.logo,
          quotation_prefix = EXCLUDED.quotation_prefix,
          voucher_prefix = EXCLUDED.voucher_prefix,
          invoice_prefix = EXCLUDED.invoice_prefix,
          tax_rate = EXCLUDED.tax_rate,
          updated_at = CURRENT_TIMESTAMP
      `, [
        db.settings.companyName, db.settings.gstNumber || null, db.settings.address || "",
        db.settings.phone || null, db.settings.email || null, db.settings.bankName || null,
        db.settings.bankAccount || null, db.settings.bankIfsc || null, db.settings.upiId || null,
        db.settings.website || null, db.settings.logo || null, db.settings.quotationPrefix || 'SIH-QT-',
        db.settings.voucherPrefix || 'SIH-VC-', db.settings.invoicePrefix || 'SIH-INV-', db.settings.taxRate || 5.0
      ]);
    }

    // 13. Sync logs (activity_logs)
    if (Array.isArray(db.logs)) {
      for (const log of db.logs) {
        await client.query(`
          INSERT INTO activity_logs (id, timestamp, username, action)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO NOTHING
        `, [log.id, log.timestamp, log.username, log.action]);
      }
    }

    // 14. Sync whatsapp conversations & messages
    if (Array.isArray(db.whatsappConversations)) {
      for (const conv of db.whatsappConversations) {
        await client.query(`
          INSERT INTO whatsapp_conversations (id, customer_name, mobile, unread_count, assigned_to, last_message, last_timestamp)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            customer_name = EXCLUDED.customer_name,
            mobile = EXCLUDED.mobile,
            unread_count = EXCLUDED.unread_count,
            assigned_to = EXCLUDED.assigned_to,
            last_message = EXCLUDED.last_message,
            last_timestamp = EXCLUDED.last_timestamp,
            updated_at = CURRENT_TIMESTAMP
        `, [conv.id, conv.customerName, conv.mobile, conv.unreadCount || 0, conv.assignedTo || null, conv.lastMessage || null, conv.lastTimestamp ? new Date(conv.lastTimestamp) : new Date()]);
      }
    }

    if (Array.isArray(db.whatsappMessages)) {
      for (const msg of db.whatsappMessages) {
        await client.query(`
          INSERT INTO whatsapp_messages (id, conversation_id, sender, sender_name, text, attachment_url, attachment_type, timestamp)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO UPDATE SET
            conversation_id = EXCLUDED.conversation_id,
            sender = EXCLUDED.sender,
            sender_name = EXCLUDED.sender_name,
            text = EXCLUDED.text,
            attachment_url = EXCLUDED.attachment_url,
            attachment_type = EXCLUDED.attachment_type,
            timestamp = EXCLUDED.timestamp
        `, [msg.id, msg.conversationId, msg.sender, msg.senderName || null, msg.text || "", msg.attachmentUrl || null, msg.attachmentType || null, msg.timestamp ? new Date(msg.timestamp) : new Date()]);
      }
    }

    // 15. Sync quotations & items
    if (Array.isArray(db.quotations)) {
      for (const q of db.quotations) {
        const qId = q.id || `qt-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const qDays = typeof q.numDays === "number" ? q.numDays : parseInt(q.numDays, 10) || 3;
        const qAdults = typeof q.adults === "number" ? q.adults : parseInt(q.adults, 10) || 2;
        const qChildren = typeof q.children === "number" ? q.children : parseInt(q.children, 10) || 0;
        await client.query(`
          INSERT INTO quotations (id, customer_name, customer_phone, customer_email, pickup_city, destination, travel_date, num_days, adults, children, discount_percent, terms_index, vehicle_details, hotel_details, day_wise_itinerary, status, quotation_number, pdf_path, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          ON CONFLICT (id) DO UPDATE SET
            customer_name = EXCLUDED.customer_name,
            customer_phone = EXCLUDED.customer_phone,
            customer_email = EXCLUDED.customer_email,
            pickup_city = EXCLUDED.pickup_city,
            destination = EXCLUDED.destination,
            travel_date = EXCLUDED.travel_date,
            num_days = EXCLUDED.num_days,
            adults = EXCLUDED.adults,
            children = EXCLUDED.children,
            discount_percent = EXCLUDED.discount_percent,
            terms_index = EXCLUDED.terms_index,
            vehicle_details = EXCLUDED.vehicle_details,
            hotel_details = EXCLUDED.hotel_details,
            day_wise_itinerary = EXCLUDED.day_wise_itinerary,
            status = EXCLUDED.status,
            quotation_number = EXCLUDED.quotation_number,
            pdf_path = EXCLUDED.pdf_path,
            updated_at = CURRENT_TIMESTAMP
        `, [
          qId, q.customerName, q.customerPhone, q.customerEmail || null, q.pickupCity || 'Coimbatore', q.destination,
          q.travelDate || null, qDays, qAdults, qChildren,
          q.discountPercent || 0, q.termsIndex || 0, q.vehicleDetails || null, q.hotelDetails || null, q.dayWiseItinerary || null,
          q.status || 'Draft', q.quotationNumber || null, q.pdfPath || null, q.createdAt ? new Date(q.createdAt) : new Date(), q.updatedAt ? new Date(q.updatedAt) : new Date()
        ]);

        const qItems = Array.isArray(q.quoteItems) ? q.quoteItems : [];
        for (const item of qItems) {
          const itemId = item.id || `qi-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          const itemQty = typeof item.qty === "number" ? item.qty : parseInt(item.qty, 10) || 1;
          await client.query(`
            INSERT INTO quotation_items (id, quotation_id, name, hsn, qty, rate, gst)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO UPDATE SET
              quotation_id = EXCLUDED.quotation_id,
              name = EXCLUDED.name,
              hsn = EXCLUDED.hsn,
              qty = EXCLUDED.qty,
              rate = EXCLUDED.rate,
              gst = EXCLUDED.gst
          `, [itemId, qId, item.name, item.hsn || '9985', itemQty, item.rate || 0, item.gst || 5.0]);
        }
      }
    }

    // 16. Sync whatsapp templates
    if (Array.isArray(db.whatsappTemplates)) {
      for (const t of db.whatsappTemplates) {
        await client.query(`
          INSERT INTO whatsapp_templates (id, name, category, message)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            message = EXCLUDED.message,
            updated_at = CURRENT_TIMESTAMP
        `, [t.id, t.name, t.category || null, t.message]);
      }
    }

    // 17. Sync whatsapp logs
    if (Array.isArray(db.whatsappLogs)) {
      for (const wl of db.whatsappLogs) {
        await client.query(`
          INSERT INTO whatsapp_logs (id, timestamp, customer_name, mobile, template_name, message_text, sent_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            timestamp = EXCLUDED.timestamp,
            customer_name = EXCLUDED.customer_name,
            mobile = EXCLUDED.mobile,
            template_name = EXCLUDED.template_name,
            message_text = EXCLUDED.message_text,
            sent_by = EXCLUDED.sent_by
        `, [wl.id, wl.timestamp, wl.customerName, wl.mobile, wl.templateName, wl.messageText, wl.sentBy]);
      }
    }

    await client.query("COMMIT");
    console.log("Successfully synchronized all CRM relational database modules!");
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("[RELATIONAL-SYNC-ERROR] Background relational mirror transaction failed:", redactSecrets(err.message || String(err)));
  } finally {
    client.release();
  }
}

function readDb() {
  try {
    let loadedDb: any = null;
    if (fs.existsSync(DB_PATH)) {
      try {
        const fileData = fs.readFileSync(DB_PATH, "utf-8");
        loadedDb = JSON.parse(fileData);
      } catch (parseErr) {
        console.error("Failed to parse db.json, using INITIAL_DB", parseErr);
      }
    }

    if (!loadedDb || typeof loadedDb !== "object") {
      loadedDb = JSON.parse(JSON.stringify(INITIAL_DB));
    }

    db = loadedDb;
    let updated = false;

    // Upgrade database schema dynamically with fallback default values and type enforcement
    const keys = Object.keys(INITIAL_DB) as Array<keyof typeof INITIAL_DB>;
    for (const key of keys) {
      const initialVal = INITIAL_DB[key];
      const currentVal = db[key];

      if (currentVal === undefined || currentVal === null) {
        (db as any)[key] = JSON.parse(JSON.stringify(initialVal));
        updated = true;
      } else if (Array.isArray(initialVal)) {
        if (!Array.isArray(currentVal)) {
          console.warn(`Database key "${key}" was expected to be an array, but got ${typeof currentVal}. Fixing.`);
          (db as any)[key] = JSON.parse(JSON.stringify(initialVal));
          updated = true;
        }
      } else if (typeof initialVal === "object") {
        if (typeof currentVal !== "object") {
          console.warn(`Database key "${key}" was expected to be an object, but got ${typeof currentVal}. Fixing.`);
          (db as any)[key] = JSON.parse(JSON.stringify(initialVal));
          updated = true;
        } else {
          // Deep-merge object keys if any are missing
          const subKeys = Object.keys(initialVal);
          for (const subKey of subKeys) {
            if ((currentVal as any)[subKey] === undefined || (currentVal as any)[subKey] === null) {
              (currentVal as any)[subKey] = (initialVal as any)[subKey];
              updated = true;
            }
          }
        }
      }
    }

    if (updated) {
      writeDb();
    }
  } catch (err) {
    console.error("Error reading db.json", err);
    db = JSON.parse(JSON.stringify(INITIAL_DB));
  }
}

function writeDb() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
    
    // Asynchronously update PostgreSQL in the background using a single atomic upsert
    if (pool) {
      pool.query(
        "INSERT INTO crm_database (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP",
        [JSON.stringify(db)]
      ).then(() => {
        // Trigger background relational table synchronization
        syncRelationalDatabase();
      }).catch((err: any) => {
        console.error("Background PostgreSQL sync write failed:", redactSecrets(err.message || String(err)));
      });
    }
  } catch (err) {
    console.error("Error writing db.json", err);
  }
}

// Load local database cache immediately at startup
readDb();

const isProd = process.env.NODE_ENV === "production";

function assertDatabase() {
  if (isProd && !pool) {
    throw new Error("CRITICAL: PostgreSQL pool is not initialized. Database operations are blocked in production to prevent data divergence.");
  }
}

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function toCamelCase(str: string): string {
  return str.replace(/([-_][a-z])/g, group => group.toUpperCase().replace('-', '').replace('_', ''));
}

function mapSettingsFromRow(row: any) {
  if (!row) return null;
  return {
    companyName: row.company_name,
    gstNumber: row.gst_number,
    address: row.address,
    phone: row.phone,
    email: row.email,
    bankName: row.bank_name,
    bankAccount: row.bank_account,
    bankIfsc: row.bank_ifsc,
    upiId: row.upi_id,
    website: row.website,
    logo: row.logo,
    quotationPrefix: row.quotation_prefix,
    voucherPrefix: row.voucher_prefix,
    invoicePrefix: row.invoice_prefix,
    taxRate: row.tax_rate ? Number(row.tax_rate) : 5
  };
}

function mapUserFromRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    mobile: row.mobile,
    email: row.email,
    username: row.username,
    password: row.password,
    role: row.role,
    status: row.status,
    lastLogin: row.last_login || "Never"
  };
}

function mapFollowupFromRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    type: row.type,
    priority: row.priority,
    remarks: row.remarks,
    notes: row.remarks, // compatibility
    assignedTo: row.assigned_to,
    staff: row.assigned_to, // compatibility
    status: row.status,
    completionDate: row.completion_date,
    completionTime: row.completion_time,
    leadId: row.lead_id
  };
}

function mapLeadFromRow(row: any, followUps: any[] = []) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    mobile: row.mobile,
    email: row.email,
    destination: row.destination,
    travelDate: row.travel_date,
    adults: row.adults,
    children: row.children,
    budget: row.budget ? Number(row.budget) : null,
    notes: row.notes,
    status: row.status,
    priority: row.priority,
    assignedTo: row.assigned_to,
    source: row.source,
    tags: row.tags || [],
    documents: row.documents || [],
    timeline: row.timeline || [],
    followUpHistory: followUps
  };
}

function mapQuotationFromRow(row: any, items: any[] = []) {
  if (!row) return null;
  return {
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    pickupCity: row.pickup_city,
    destination: row.destination,
    travelDate: row.travel_date,
    numDays: row.num_days,
    adults: row.adults,
    children: row.children,
    discountPercent: row.discount_percent ? Number(row.discount_percent) : 0,
    termsIndex: row.terms_index,
    vehicleDetails: row.vehicle_details,
    hotelDetails: row.hotel_details,
    dayWiseItinerary: row.day_wise_itinerary,
    status: row.status,
    quotationNumber: row.quotation_number,
    pdfPath: row.pdf_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    quoteItems: items
  };
}

function mapQuotationItemFromRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    quotationId: row.quotation_id,
    name: row.name,
    hsn: row.hsn,
    qty: row.qty,
    rate: row.rate ? Number(row.rate) : 0,
    gst: row.gst ? Number(row.gst) : 5
  };
}

function mapVoucherFromRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    bookingId: row.booking_id,
    customerId: row.customer_id,
    guestName: row.guest_name,
    guestMobile: row.guest_mobile,
    guestEmail: row.guest_email,
    hotelName: row.hotel_name,
    hotelAddress: row.hotel_address,
    hotelPhone: row.hotel_phone,
    hotelEmail: row.hotel_email,
    hotelContactPerson: row.hotel_contact_person,
    destination: row.destination,
    checkInDate: row.check_in_date,
    checkOutDate: row.check_out_date,
    numNights: row.num_nights ? Number(row.num_nights) : 1,
    numRooms: row.num_rooms ? Number(row.num_rooms) : 1,
    roomType: row.room_type,
    mealPlan: row.meal_plan,
    numAdults: row.num_adults ? Number(row.num_adults) : 2,
    numChildren: row.num_children ? Number(row.num_children) : 0,
    numInfants: row.num_infants ? Number(row.num_infants) : 0,
    confirmationNumber: row.confirmation_number,
    bookingStatus: row.booking_status,
    bookingDate: row.booking_date,
    voucherDate: row.voucher_date,
    supplierName: row.supplier_name,
    supplierContact: row.supplier_contact,
    totalAmount: row.total_amount ? Number(row.total_amount) : 0,
    advancePaid: row.advance_paid ? Number(row.advance_paid) : 0,
    balanceAmount: row.balance_amount ? Number(row.balance_amount) : 0,
    paymentStatus: row.payment_status,
    specialRequests: row.special_requests,
    billingInstructions: row.billing_instructions,
    remarks: row.remarks,
    internalNotes: row.internal_notes
  };
}

function mapItineraryFromRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    bookingId: row.booking_id,
    customerName: row.customer_name,
    bookingNumber: row.booking_number,
    destination: row.destination,
    travelDate: row.travel_date,
    days: row.days || []
  };
}

export const DB_Service = {
  async getVouchers() {
    assertDatabase();
    if (pool) {
      const res = await pool.query("SELECT * FROM hotel_vouchers ORDER BY created_at DESC");
      return res.rows.map(mapVoucherFromRow);
    }
    return db.vouchers || [];
  },

  async getVoucher(id: string) {
    assertDatabase();
    if (pool) {
      const res = await pool.query("SELECT * FROM hotel_vouchers WHERE id = $1", [id]);
      return res.rows.length > 0 ? mapVoucherFromRow(res.rows[0]) : null;
    }
    return db.vouchers.find((v: any) => v.id === id) || null;
  },

  async saveVoucher(v: any) {
    assertDatabase();
    const vId = v.id || `HBV-${Math.floor(10000 + Math.random() * 90000)}`;
    if (pool) {
      await pool.query(`
        INSERT INTO hotel_vouchers (id, booking_id, customer_id, guest_name, guest_mobile, guest_email, hotel_name, hotel_address, hotel_phone, hotel_email, hotel_contact_person, destination, check_in_date, check_out_date, num_nights, num_rooms, room_type, meal_plan, num_adults, num_children, num_infants, confirmation_number, booking_status, booking_date, voucher_date, supplier_name, supplier_contact, total_amount, advance_paid, balance_amount, payment_status, special_requests, billing_instructions, remarks, internal_notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35)
        ON CONFLICT (id) DO UPDATE SET
          booking_id = EXCLUDED.booking_id,
          customer_id = EXCLUDED.customer_id,
          guest_name = EXCLUDED.guest_name,
          guest_mobile = EXCLUDED.guest_mobile,
          guest_email = EXCLUDED.guest_email,
          hotel_name = EXCLUDED.hotel_name,
          hotel_address = EXCLUDED.hotel_address,
          hotel_phone = EXCLUDED.hotel_phone,
          hotel_email = EXCLUDED.hotel_email,
          hotel_contact_person = EXCLUDED.hotel_contact_person,
          destination = EXCLUDED.destination,
          check_in_date = EXCLUDED.check_in_date,
          check_out_date = EXCLUDED.check_out_date,
          num_nights = EXCLUDED.num_nights,
          num_rooms = EXCLUDED.num_rooms,
          room_type = EXCLUDED.room_type,
          meal_plan = EXCLUDED.meal_plan,
          num_adults = EXCLUDED.num_adults,
          num_children = EXCLUDED.num_children,
          num_infants = EXCLUDED.num_infants,
          confirmation_number = EXCLUDED.confirmation_number,
          booking_status = EXCLUDED.booking_status,
          booking_date = EXCLUDED.booking_date,
          voucher_date = EXCLUDED.voucher_date,
          supplier_name = EXCLUDED.supplier_name,
          supplier_contact = EXCLUDED.supplier_contact,
          total_amount = EXCLUDED.total_amount,
          advance_paid = EXCLUDED.advance_paid,
          balance_amount = EXCLUDED.balance_amount,
          payment_status = EXCLUDED.payment_status,
          special_requests = EXCLUDED.special_requests,
          billing_instructions = EXCLUDED.billing_instructions,
          remarks = EXCLUDED.remarks,
          internal_notes = EXCLUDED.internal_notes,
          updated_at = CURRENT_TIMESTAMP
      `, [
        vId, v.bookingId, v.customerId || v.guestMobile, v.guestName, v.guestMobile, v.guestEmail || null,
        v.hotelName, v.hotelAddress || "", v.hotelPhone || null, v.hotelEmail || null, v.hotelContactPerson || null,
        v.destination, v.checkInDate, v.checkOutDate, v.numNights ? Number(v.numNights) : 1, v.numRooms ? Number(v.numRooms) : 1,
        v.roomType || null, v.mealPlan || null, v.numAdults ? Number(v.numAdults) : 2, v.numChildren ? Number(v.numChildren) : 0, v.numInfants ? Number(v.numInfants) : 0,
        v.confirmationNumber || null, v.bookingStatus || 'Confirmed', v.bookingDate || null, v.voucherDate || null,
        v.supplierName || null, v.supplierContact || null, v.totalAmount ? Number(v.totalAmount) : 0, v.advancePaid ? Number(v.advancePaid) : 0, v.balanceAmount ? Number(v.balanceAmount) : 0,
        v.paymentStatus || 'Unpaid', v.specialRequests || null, v.billingInstructions || null, v.remarks || null, v.internalNotes || null
      ]);
    } else {
      const idx = db.vouchers.findIndex((x: any) => x.id === v.id);
      v.id = vId;
      if (idx !== -1) {
        db.vouchers[idx] = v;
      } else {
        db.vouchers.unshift(v);
      }
      writeDb();
    }
  },

  async deleteVoucher(id: string) {
    assertDatabase();
    if (pool) {
      await pool.query("DELETE FROM hotel_vouchers WHERE id = $1", [id]);
    } else {
      db.vouchers = db.vouchers.filter((v: any) => v.id !== id);
      writeDb();
    }
  },

  async getItineraries() {
    assertDatabase();
    if (pool) {
      const res = await pool.query("SELECT * FROM itineraries ORDER BY created_at DESC");
      return res.rows.map(mapItineraryFromRow);
    }
    return db.itineraries || [];
  },

  async getItinerary(id: string) {
    assertDatabase();
    if (pool) {
      const res = await pool.query("SELECT * FROM itineraries WHERE id = $1", [id]);
      return res.rows.length > 0 ? mapItineraryFromRow(res.rows[0]) : null;
    }
    return db.itineraries.find((i: any) => i.id === id) || null;
  },

  async saveItinerary(it: any) {
    assertDatabase();
    const itId = it.id || `ITN-${Math.floor(10000 + Math.random() * 90000)}`;
    if (pool) {
      await pool.query(`
        INSERT INTO itineraries (id, booking_id, customer_name, booking_number, destination, travel_date, days)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          booking_id = EXCLUDED.booking_id,
          customer_name = EXCLUDED.customer_name,
          booking_number = EXCLUDED.booking_number,
          destination = EXCLUDED.destination,
          travel_date = EXCLUDED.travel_date,
          days = EXCLUDED.days,
          updated_at = CURRENT_TIMESTAMP
      `, [itId, it.bookingId, it.customerName, it.bookingNumber || it.bookingId, it.destination, it.travelDate, JSON.stringify(it.days || [])]);
    } else {
      const idx = db.itineraries.findIndex((x: any) => x.id === it.id);
      it.id = itId;
      if (idx !== -1) {
        db.itineraries[idx] = it;
      } else {
        db.itineraries.unshift(it);
      }
      writeDb();
    }
  },

  async deleteItinerary(id: string) {
    assertDatabase();
    if (pool) {
      await pool.query("DELETE FROM itineraries WHERE id = $1", [id]);
    } else {
      db.itineraries = db.itineraries.filter((i: any) => i.id !== id);
      writeDb();
    }
  },

  async getSettings() {
    assertDatabase();
    if (pool) {
      const res = await pool.query("SELECT * FROM settings ORDER BY id DESC LIMIT 1");
      return res.rows.length > 0 ? mapSettingsFromRow(res.rows[0]) : null;
    }
    return db.settings || {};
  },

  async saveSettings(settings: any) {
    assertDatabase();
    if (pool) {
      await pool.query(`
        INSERT INTO settings (id, company_name, gst_number, address, phone, email, bank_name, bank_account, bank_ifsc, upi_id, website, logo, quotation_prefix, voucher_prefix, invoice_prefix, tax_rate)
        VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET
          company_name = EXCLUDED.company_name,
          gst_number = EXCLUDED.gst_number,
          address = EXCLUDED.address,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          bank_name = EXCLUDED.bank_name,
          bank_account = EXCLUDED.bank_account,
          bank_ifsc = EXCLUDED.bank_ifsc,
          upi_id = EXCLUDED.upi_id,
          website = EXCLUDED.website,
          logo = EXCLUDED.logo,
          quotation_prefix = EXCLUDED.quotation_prefix,
          voucher_prefix = EXCLUDED.voucher_prefix,
          invoice_prefix = EXCLUDED.invoice_prefix,
          tax_rate = EXCLUDED.tax_rate,
          updated_at = CURRENT_TIMESTAMP
      `, [
        settings.companyName || "", settings.gstNumber || "", settings.address || "", settings.phone || "", settings.email || "",
        settings.bankName || "", settings.bankAccount || "", settings.bankIfsc || "", settings.upiId || "", settings.website || "",
        settings.logo || "", settings.quotationPrefix || "QT", settings.voucherPrefix || "VC", settings.invoicePrefix || "INV",
        settings.taxRate !== undefined ? Number(settings.taxRate) : 5
      ]);
    } else {
      db.settings = settings;
      writeDb();
    }
  },

  async getUsers() {
    assertDatabase();
    if (pool) {
      const res = await pool.query("SELECT * FROM users ORDER BY created_at DESC");
      return res.rows.map(mapUserFromRow);
    }
    return db.users || [];
  },

  async saveUser(user: any) {
    assertDatabase();
    const uId = user.id || `USR-${Math.floor(100 + Math.random() * 900)}`;
    if (pool) {
      await pool.query(`
        INSERT INTO users (id, full_name, mobile, email, username, password, role, status, last_login)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          mobile = EXCLUDED.mobile,
          email = EXCLUDED.email,
          username = EXCLUDED.username,
          password = EXCLUDED.password,
          role = EXCLUDED.role,
          status = EXCLUDED.status,
          last_login = EXCLUDED.last_login,
          updated_at = CURRENT_TIMESTAMP
      `, [
        uId, user.fullName, user.mobile, user.email, user.username, user.password,
        user.role, user.status || "Active", user.lastLogin || "Never"
      ]);
    } else {
      const idx = db.users.findIndex((u: any) => u.id === user.id);
      user.id = uId;
      if (idx !== -1) {
        db.users[idx] = user;
      } else {
        db.users.push(user);
      }
      writeDb();
    }
  },

  async deleteUser(id: string) {
    assertDatabase();
    if (pool) {
      await pool.query("DELETE FROM users WHERE id = $1", [id]);
    } else {
      db.users = db.users.filter((u: any) => u.id !== id);
      writeDb();
    }
  },

  async getLeads() {
    assertDatabase();
    if (pool) {
      const res = await pool.query("SELECT * FROM leads ORDER BY created_at DESC");
      const leads = [];
      for (const row of res.rows) {
        const followupsRes = await pool.query("SELECT * FROM followups WHERE lead_id = $1 ORDER BY date DESC", [row.id]);
        leads.push(mapLeadFromRow(row, followupsRes.rows.map(mapFollowupFromRow)));
      }
      return leads;
    }
    return db.leads || [];
  },

  async getLead(id: string) {
    assertDatabase();
    if (pool) {
      const res = await pool.query("SELECT * FROM leads WHERE id = $1", [id]);
      if (res.rows.length === 0) return null;
      const followupsRes = await pool.query("SELECT * FROM followups WHERE lead_id = $1 ORDER BY date DESC", [id]);
      return mapLeadFromRow(res.rows[0], followupsRes.rows.map(mapFollowupFromRow));
    }
    return db.leads.find((l: any) => l.id === id) || null;
  },

  async saveLead(lead: any) {
    assertDatabase();
    const lId = lead.id || `SIH-LD-${Math.floor(10000 + Math.random() * 90000)}`;
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(`
          INSERT INTO leads (id, name, mobile, email, destination, travel_date, adults, children, budget, notes, status, priority, assigned_to, source, tags, documents, timeline)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            mobile = EXCLUDED.mobile,
            email = EXCLUDED.email,
            destination = EXCLUDED.destination,
            travel_date = EXCLUDED.travel_date,
            adults = EXCLUDED.adults,
            children = EXCLUDED.children,
            budget = EXCLUDED.budget,
            notes = EXCLUDED.notes,
            status = EXCLUDED.status,
            priority = EXCLUDED.priority,
            assigned_to = EXCLUDED.assigned_to,
            source = EXCLUDED.source,
            tags = EXCLUDED.tags,
            documents = EXCLUDED.documents,
            timeline = EXCLUDED.timeline,
            updated_at = CURRENT_TIMESTAMP
        `, [
          lId, lead.name, lead.mobile, lead.email || null, lead.destination, lead.travelDate || null,
          lead.adults || 2, lead.children || 0, lead.budget ? Number(lead.budget) : null, lead.notes || "",
          lead.status || "New", lead.priority || "Medium", lead.assignedTo || "", lead.source || "Direct",
          JSON.stringify(lead.tags || []), JSON.stringify(lead.documents || []), JSON.stringify(lead.timeline || [])
        ]);

        if (Array.isArray(lead.followUpHistory)) {
          const fuIds = lead.followUpHistory.map((f: any) => f.id).filter(Boolean);
          if (fuIds.length > 0) {
            await client.query("DELETE FROM followups WHERE lead_id = $1 AND id NOT IN (" + fuIds.map((_: any, i: number) => `$${i + 2}`).join(", ") + ")", [lId, ...fuIds]);
          } else {
            await client.query("DELETE FROM followups WHERE lead_id = $1", [lId]);
          }

          for (const fu of lead.followUpHistory) {
            const fuId = fu.id || `FU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            await client.query(`
              INSERT INTO followups (id, date, time, type, priority, remarks, assigned_to, status, completion_date, completion_time, lead_id)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              ON CONFLICT (id) DO UPDATE SET
                date = EXCLUDED.date,
                time = EXCLUDED.time,
                type = EXCLUDED.type,
                priority = EXCLUDED.priority,
                remarks = EXCLUDED.remarks,
                assigned_to = EXCLUDED.assigned_to,
                status = EXCLUDED.status,
                completion_date = EXCLUDED.completion_date,
                completion_time = EXCLUDED.completion_time,
                lead_id = EXCLUDED.lead_id,
                updated_at = CURRENT_TIMESTAMP
            `, [
              fuId, fu.date, fu.time || null, fu.type, fu.priority || "Medium",
              fu.remarks || fu.notes || "", fu.assignedTo || fu.staff || "", fu.status || "Pending",
              fu.completionDate || null, fu.completionTime || null, lId
            ]);
          }
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } else {
      const idx = db.leads.findIndex((l: any) => l.id === lead.id);
      lead.id = lId;
      if (idx !== -1) {
        db.leads[idx] = lead;
      } else {
        db.leads.unshift(lead);
      }
      writeDb();
    }
  },

  async deleteLead(id: string) {
    assertDatabase();
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("DELETE FROM followups WHERE lead_id = $1", [id]);
        await client.query("DELETE FROM leads WHERE id = $1", [id]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } else {
      db.leads = db.leads.filter((l: any) => l.id !== id);
      writeDb();
    }
  },

  async getFollowupsFlat() {
    assertDatabase();
    if (pool) {
      const res = await pool.query(`
        SELECT f.*, l.name as lead_name, l.mobile as lead_mobile, l.email as lead_email
        FROM followups f
        JOIN leads l ON f.lead_id = l.id
        ORDER BY f.date DESC, f.time DESC
      `);
      return res.rows.map((row: any) => ({
        id: row.id,
        leadId: row.lead_id,
        leadName: row.lead_name,
        leadMobile: row.lead_mobile,
        leadEmail: row.lead_email,
        date: row.date,
        time: row.time,
        type: row.type,
        priority: row.priority,
        remarks: row.remarks,
        notes: row.remarks,
        staff: row.assigned_to,
        assignedTo: row.assigned_to,
        status: row.status,
        completionDate: row.completion_date,
        completionTime: row.completion_time
      }));
    }
    const list: any[] = [];
    db.leads.forEach((lead: any) => {
      const safeHistory = Array.isArray(lead.followUpHistory) ? lead.followUpHistory : [];
      safeHistory.forEach((fu: any) => {
        list.push({
          ...fu,
          leadId: lead.id,
          leadName: lead.name,
          leadMobile: lead.mobile,
          leadEmail: lead.email,
          notes: fu.notes || fu.remarks || "",
          staff: fu.staff || fu.assignedTo || "",
          remarks: fu.remarks || fu.notes || "",
          assignedTo: fu.assignedTo || fu.staff || ""
        });
      });
    });
    return list;
  },

  async getPackages() {
    assertDatabase();
    if (pool) {
      const res = await pool.query("SELECT * FROM tour_packages ORDER BY created_at DESC");
      return res.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        destination: row.destination,
        duration: row.duration,
        price: row.price ? Number(row.price) : 0,
        itinerary: row.itinerary || [],
        inclusions: row.inclusions || [],
        exclusions: row.exclusions || []
      }));
    }
    return db.packages || [];
  },

  async savePackage(pkg: any) {
    assertDatabase();
    const pId = pkg.id || `PKG-${Math.floor(10000 + Math.random() * 90000)}`;
    if (pool) {
      await pool.query(`
        INSERT INTO tour_packages (id, name, destination, duration, price, itinerary, inclusions, exclusions)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          destination = EXCLUDED.destination,
          duration = EXCLUDED.duration,
          price = EXCLUDED.price,
          itinerary = EXCLUDED.itinerary,
          inclusions = EXCLUDED.inclusions,
          exclusions = EXCLUDED.exclusions,
          updated_at = CURRENT_TIMESTAMP
      `, [
        pId, pkg.name, pkg.destination, pkg.duration, pkg.price ? Number(pkg.price) : 0,
        JSON.stringify(pkg.itinerary || []), JSON.stringify(pkg.inclusions || []), JSON.stringify(pkg.exclusions || [])
      ]);
    } else {
      const idx = db.packages.findIndex((p: any) => p.id === pkg.id);
      pkg.id = pId;
      if (idx !== -1) {
        db.packages[idx] = pkg;
      } else {
        db.packages.unshift(pkg);
      }
      writeDb();
    }
  },

  async deletePackage(id: string) {
    assertDatabase();
    if (pool) {
      await pool.query("DELETE FROM tour_packages WHERE id = $1", [id]);
    } else {
      db.packages = db.packages.filter((p: any) => p.id !== id);
      writeDb();
    }
  },

  async getQuotations() {
    assertDatabase();
    if (pool) {
      const res = await pool.query("SELECT * FROM quotations ORDER BY created_at DESC");
      const list = [];
      for (const row of res.rows) {
        const itemsRes = await pool.query("SELECT * FROM quotation_items WHERE quotation_id = $1", [row.id]);
        list.push(mapQuotationFromRow(row, itemsRes.rows.map(mapQuotationItemFromRow)));
      }
      return list;
    }
    return db.quotations || [];
  },

  async getQuotation(id: string) {
    assertDatabase();
    if (pool) {
      const res = await pool.query("SELECT * FROM quotations WHERE id = $1", [id]);
      if (res.rows.length === 0) return null;
      const itemsRes = await pool.query("SELECT * FROM quotation_items WHERE quotation_id = $1", [id]);
      return mapQuotationFromRow(res.rows[0], itemsRes.rows.map(mapQuotationItemFromRow));
    }
    return db.quotations.find((q: any) => q.id === id) || null;
  },

  async saveQuotation(quote: any) {
    assertDatabase();
    const qId = quote.id || `SIH-QT-${Math.floor(10000 + Math.random() * 90000)}`;
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(`
          INSERT INTO quotations (id, customer_name, customer_phone, customer_email, pickup_city, destination, travel_date, num_days, adults, children, discount_percent, terms_index, vehicle_details, hotel_details, day_wise_itinerary, status, quotation_number, pdf_path)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          ON CONFLICT (id) DO UPDATE SET
            customer_name = EXCLUDED.customer_name,
            customer_phone = EXCLUDED.customer_phone,
            customer_email = EXCLUDED.customer_email,
            pickup_city = EXCLUDED.pickup_city,
            destination = EXCLUDED.destination,
            travel_date = EXCLUDED.travel_date,
            num_days = EXCLUDED.num_days,
            adults = EXCLUDED.adults,
            children = EXCLUDED.children,
            discount_percent = EXCLUDED.discount_percent,
            terms_index = EXCLUDED.terms_index,
            vehicle_details = EXCLUDED.vehicle_details,
            hotel_details = EXCLUDED.hotel_details,
            day_wise_itinerary = EXCLUDED.day_wise_itinerary,
            status = EXCLUDED.status,
            quotation_number = EXCLUDED.quotation_number,
            pdf_path = EXCLUDED.pdf_path,
            updated_at = CURRENT_TIMESTAMP
        `, [
          qId, quote.customerName, quote.customerPhone, quote.customerEmail || null, quote.pickupCity || "Coimbatore",
          quote.destination, quote.travelDate || null, quote.numDays || 3, quote.adults || 2, quote.children || 0,
          quote.discountPercent ? Number(quote.discountPercent) : 0, quote.termsIndex || 0, quote.vehicleDetails || "",
          quote.hotelDetails || "", quote.dayWiseItinerary || "", quote.status || "Draft", quote.quotationNumber || null,
          quote.pdfPath || null
        ]);

        await client.query("DELETE FROM quotation_items WHERE quotation_id = $1", [qId]);
        if (Array.isArray(quote.quoteItems)) {
          for (const item of quote.quoteItems) {
            const itemId = item.id || `qi-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            await client.query(`
              INSERT INTO quotation_items (id, quotation_id, name, hsn, qty, rate, gst)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [itemId, qId, item.name, item.hsn || "9985", item.qty || 1, item.rate ? Number(item.rate) : 0, item.gst || 5]);
          }
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } else {
      const idx = db.quotations.findIndex((q: any) => q.id === quote.id);
      quote.id = qId;
      if (idx !== -1) {
        db.quotations[idx] = quote;
      } else {
        db.quotations.unshift(quote);
      }
      writeDb();
    }
  },

  async deleteQuotation(id: string) {
    assertDatabase();
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("DELETE FROM quotation_items WHERE quotation_id = $1", [id]);
        await client.query("DELETE FROM quotations WHERE id = $1", [id]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } else {
      db.quotations = db.quotations.filter((q: any) => q.id !== id);
      writeDb();
    }
  },

  async getBookings() {
    assertDatabase();
    if (pool) {
      const res = await pool.query("SELECT * FROM bookings ORDER BY created_at DESC");
      return res.rows.map((row: any) => ({
        id: row.id,
        leadId: row.lead_id,
        customerId: row.customer_id,
        customerName: row.customer_name,
        customerMobile: row.customer_mobile,
        customerEmail: row.customer_email,
        destination: row.destination,
        travelDate: row.travel_date,
        adults: row.adults,
        children: row.children,
        packagePrice: row.package_price ? Number(row.package_price) : 0,
        hotelDetails: row.hotel_details,
        driverDetails: row.driver_details,
        status: row.status,
        timeline: row.timeline || [],
        documents: row.documents || []
      }));
    }
    return db.bookings || [];
  },

  async getBooking(id: string) {
    assertDatabase();
    if (pool) {
      const res = await pool.query("SELECT * FROM bookings WHERE id = $1", [id]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        leadId: row.lead_id,
        customerId: row.customer_id,
        customerName: row.customer_name,
        customerMobile: row.customer_mobile,
        customerEmail: row.customer_email,
        destination: row.destination,
        travelDate: row.travel_date,
        adults: row.adults,
        children: row.children,
        packagePrice: row.package_price ? Number(row.package_price) : 0,
        hotelDetails: row.hotel_details,
        driverDetails: row.driver_details,
        status: row.status,
        timeline: row.timeline || [],
        documents: row.documents || []
      };
    }
    return db.bookings.find((b: any) => b.id === id) || null;
  },

  async saveBooking(booking: any) {
    assertDatabase();
    const bId = booking.id || `SIH-BK-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    if (pool) {
      await pool.query(`
        INSERT INTO bookings (id, lead_id, customer_id, customer_name, customer_mobile, customer_email, destination, travel_date, adults, children, package_price, hotel_details, driver_details, status, timeline, documents)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (id) DO UPDATE SET
          lead_id = EXCLUDED.lead_id,
          customer_id = EXCLUDED.customer_id,
          customer_name = EXCLUDED.customer_name,
          customer_mobile = EXCLUDED.customer_mobile,
          customer_email = EXCLUDED.customer_email,
          destination = EXCLUDED.destination,
          travel_date = EXCLUDED.travel_date,
          adults = EXCLUDED.adults,
          children = EXCLUDED.children,
          package_price = EXCLUDED.package_price,
          hotel_details = EXCLUDED.hotel_details,
          driver_details = EXCLUDED.driver_details,
          status = EXCLUDED.status,
          timeline = EXCLUDED.timeline,
          documents = EXCLUDED.documents,
          updated_at = CURRENT_TIMESTAMP
      `, [
        bId, booking.leadId || null, booking.customerId || booking.customerMobile, booking.customerName, booking.customerMobile,
        booking.customerEmail || null, booking.destination, booking.travelDate, booking.adults || 2, booking.children || 0,
        booking.packagePrice ? Number(booking.packagePrice) : 0, booking.hotelDetails || "", booking.driverDetails || null,
        booking.status || "Pending", JSON.stringify(booking.timeline || []), JSON.stringify(booking.documents || [])
      ]);
    } else {
      const idx = db.bookings.findIndex((b: any) => b.id === booking.id);
      booking.id = bId;
      if (idx !== -1) {
        db.bookings[idx] = booking;
      } else {
        db.bookings.unshift(booking);
      }
      writeDb();
    }
  },

  async deleteBooking(id: string) {
    assertDatabase();
    if (pool) {
      await pool.query("DELETE FROM bookings WHERE id = $1", [id]);
    } else {
      db.bookings = db.bookings.filter((b: any) => b.id !== id);
      writeDb();
    }
  },

  async getPayments() {
    assertDatabase();
    if (pool) {
      const res = await pool.query("SELECT * FROM payment_ledgers ORDER BY created_at DESC");
      return res.rows.map((row: any) => ({
        id: row.id,
        bookingId: row.booking_id,
        customerName: row.customer_name,
        totalAmount: row.total_amount ? Number(row.total_amount) : 0,
        advancePaid: row.advance_paid ? Number(row.advance_paid) : 0,
        balanceAmount: row.balance_amount ? Number(row.balance_amount) : 0,
        status: row.status,
        installments: row.installments || []
      }));
    }
    return db.payments || [];
  },

  async savePayment(ledger: any) {
    assertDatabase();
    const pId = ledger.id || `SIH-PAY-${Math.floor(1000 + Math.random() * 9000)}`;
    if (pool) {
      await pool.query(`
        INSERT INTO payment_ledgers (id, booking_id, customer_name, total_amount, advance_paid, balance_amount, status, installments)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          booking_id = EXCLUDED.booking_id,
          customer_name = EXCLUDED.customer_name,
          total_amount = EXCLUDED.total_amount,
          advance_paid = EXCLUDED.advance_paid,
          balance_amount = EXCLUDED.balance_amount,
          status = EXCLUDED.status,
          installments = EXCLUDED.installments,
          updated_at = CURRENT_TIMESTAMP
      `, [
        pId, ledger.bookingId, ledger.customerName, ledger.totalAmount ? Number(ledger.totalAmount) : 0,
        ledger.advancePaid ? Number(ledger.advancePaid) : 0, ledger.balanceAmount ? Number(ledger.balanceAmount) : 0,
        ledger.status || "Unpaid", JSON.stringify(ledger.installments || [])
      ]);
    } else {
      const idx = db.payments.findIndex((p: any) => p.id === ledger.id);
      ledger.id = pId;
      if (idx !== -1) {
        db.payments[idx] = ledger;
      } else {
        db.payments.unshift(ledger);
      }
      writeDb();
    }
  },

  async getExpenses() {
    assertDatabase();
    if (pool) {
      const res = await pool.query("SELECT * FROM expenses ORDER BY date DESC");
      return res.rows.map((row: any) => ({
        id: row.id,
        category: row.category,
        amount: row.amount ? Number(row.amount) : 0,
        date: row.date,
        description: row.description,
        paymentMode: row.payment_mode,
        loggedBy: row.logged_by
      }));
    }
    return db.expenses || [];
  },

  async saveExpense(exp: any) {
    assertDatabase();
    const eId = exp.id || `EXP-${Math.floor(1000 + Math.random() * 9000)}`;
    if (pool) {
      await pool.query(`
        INSERT INTO expenses (id, category, amount, date, description, payment_mode, logged_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          category = EXCLUDED.category,
          amount = EXCLUDED.amount,
          date = EXCLUDED.date,
          description = EXCLUDED.description,
          payment_mode = EXCLUDED.payment_mode,
          logged_by = EXCLUDED.logged_by
      `, [
        eId, exp.category, exp.amount ? Number(exp.amount) : 0, exp.date,
        exp.description || "", exp.paymentMode || "Cash", exp.loggedBy || "admin"
      ]);
    } else {
      const idx = db.expenses.findIndex((e: any) => e.id === exp.id);
      exp.id = eId;
      if (idx !== -1) {
        db.expenses[idx] = exp;
      } else {
        db.expenses.unshift(exp);
      }
      writeDb();
    }
  },

  async deleteExpense(id: string) {
    assertDatabase();
    if (pool) {
      await pool.query("DELETE FROM expenses WHERE id = $1", [id]);
    } else {
      db.expenses = db.expenses.filter((e: any) => e.id !== id);
      writeDb();
    }
  },

  async getHotels() {
    assertDatabase();
    if (pool) {
      const res = await pool.query("SELECT * FROM hotels ORDER BY name ASC");
      return res.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        destination: row.destination,
        rating: row.rating,
        contactPerson: row.contact_person,
        phone: row.phone,
        email: row.email,
        tariffStandard: row.tariff_standard ? Number(row.tariff_standard) : 0,
        tariffDeluxe: row.tariff_deluxe ? Number(row.tariff_deluxe) : 0
      }));
    }
    return db.hotels || [];
  },

  async saveHotel(hotel: any) {
    assertDatabase();
    const hId = hotel.id || `H-${Math.floor(10 + Math.random() * 90)}`;
    if (pool) {
      await pool.query(`
        INSERT INTO hotels (id, name, destination, rating, contact_person, phone, email, tariff_standard, tariff_deluxe)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          destination = EXCLUDED.destination,
          rating = EXCLUDED.rating,
          contact_person = EXCLUDED.contact_person,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          tariff_standard = EXCLUDED.tariff_standard,
          tariff_deluxe = EXCLUDED.tariff_deluxe
      `, [
        hId, hotel.name, hotel.destination, hotel.rating || "3 Star", hotel.contactPerson || "",
        hotel.phone || "", hotel.email || "", hotel.tariffStandard ? Number(hotel.tariffStandard) : 0,
        hotel.tariffDeluxe ? Number(hotel.tariffDeluxe) : 0
      ]);
    } else {
      const idx = db.hotels.findIndex((h: any) => h.id === hotel.id);
      hotel.id = hId;
      if (idx !== -1) {
        db.hotels[idx] = hotel;
      } else {
        db.hotels.push(hotel);
      }
      writeDb();
    }
  },

  async getDrivers() {
    assertDatabase();
    if (pool) {
      const res = await pool.query("SELECT * FROM drivers ORDER BY name ASC");
      return res.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        vehicleName: row.vehicle_name,
        vehicleNumber: row.vehicle_number,
        status: row.status,
        licenseNumber: row.license_number
      }));
    }
    return db.drivers || [];
  },

  async saveDriver(driver: any) {
    assertDatabase();
    const dId = driver.id || `DRV-${Math.floor(10 + Math.random() * 90)}`;
    if (pool) {
      await pool.query(`
        INSERT INTO drivers (id, name, phone, vehicle_name, vehicle_number, status, license_number)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          vehicle_name = EXCLUDED.vehicle_name,
          vehicle_number = EXCLUDED.vehicle_number,
          status = EXCLUDED.status,
          license_number = EXCLUDED.license_number
      `, [
        dId, driver.name, driver.phone, driver.vehicleName || "", driver.vehicleNumber || "",
        driver.status || "Available", driver.licenseNumber || ""
      ]);
    } else {
      const idx = db.drivers.findIndex((d: any) => d.id === driver.id);
      driver.id = dId;
      if (idx !== -1) {
        db.drivers[idx] = driver;
      } else {
        db.drivers.push(driver);
      }
      writeDb();
    }
  },

  async getSuppliers() {
    assertDatabase();
    if (pool) {
      const res = await pool.query("SELECT * FROM suppliers ORDER BY name ASC");
      return res.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        serviceType: row.service_type,
        contactPerson: row.contact_person,
        phone: row.phone,
        email: row.email,
        gstNumber: row.gst_number
      }));
    }
    return db.suppliers || [];
  },

  async saveSupplier(supplier: any) {
    assertDatabase();
    const sId = supplier.id || `SUP-${Math.floor(10 + Math.random() * 90)}`;
    if (pool) {
      await pool.query(`
        INSERT INTO suppliers (id, name, service_type, contact_person, phone, email, gst_number)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          service_type = EXCLUDED.service_type,
          contact_person = EXCLUDED.contact_person,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          gst_number = EXCLUDED.gst_number
      `, [
        sId, supplier.name, supplier.serviceType, supplier.contactPerson || "",
        supplier.phone || "", supplier.email || "", supplier.gstNumber || ""
      ]);
    } else {
      const idx = db.suppliers.findIndex((s: any) => s.id === supplier.id);
      supplier.id = sId;
      if (idx !== -1) {
        db.suppliers[idx] = supplier;
      } else {
        db.suppliers.push(supplier);
      }
      writeDb();
    }
  },

  async deleteHotel(id: string) {
    assertDatabase();
    if (pool) {
      await pool.query("DELETE FROM hotels WHERE id = $1", [id]);
    } else {
      db.hotels = (db.hotels || []).filter((h: any) => h.id !== id);
      writeDb();
    }
  },

  async deleteDriver(id: string) {
    assertDatabase();
    if (pool) {
      await pool.query("DELETE FROM drivers WHERE id = $1", [id]);
    } else {
      db.drivers = (db.drivers || []).filter((d: any) => d.id !== id);
      writeDb();
    }
  },

  async deleteSupplier(id: string) {
    assertDatabase();
    if (pool) {
      await pool.query("DELETE FROM suppliers WHERE id = $1", [id]);
    } else {
      db.suppliers = (db.suppliers || []).filter((s: any) => s.id !== id);
      writeDb();
    }
  },

  async getLogs() {
    assertDatabase();
    if (pool) {
      const res = await pool.query("SELECT * FROM activity_logs ORDER BY created_at DESC");
      return res.rows.map((row: any) => ({
        id: row.id,
        timestamp: row.timestamp,
        username: row.username,
        action: row.action
      }));
    }
    return db.logs || [];
  },

  async saveLog(log: any) {
    assertDatabase();
    const lId = log.id || `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    if (pool) {
      await pool.query(`
        INSERT INTO activity_logs (id, timestamp, username, action)
        VALUES ($1, $2, $3, $4)
      `, [lId, log.timestamp || new Date().toISOString(), log.username || "system", log.action || ""]);
    } else {
      db.logs = db.logs || [];
      db.logs.unshift(log);
      writeDb();
    }
  },

  async getWhatsappConversations() {
    assertDatabase();
    if (pool) {
      const res = await pool.query("SELECT * FROM whatsapp_conversations ORDER BY last_timestamp DESC");
      return res.rows.map((row: any) => ({
        id: row.id,
        customerName: row.customer_name,
        mobile: row.mobile,
        unreadCount: row.unread_count,
        assignedTo: row.assigned_to,
        lastMessage: row.last_message,
        lastTimestamp: row.last_timestamp
      }));
    }
    return db.whatsappConversations || [];
  },

  async saveWhatsappConversation(conv: any) {
    assertDatabase();
    const cId = conv.id || `wc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    if (pool) {
      await pool.query(`
        INSERT INTO whatsapp_conversations (id, customer_name, mobile, unread_count, assigned_to, last_message, last_timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          customer_name = EXCLUDED.customer_name,
          mobile = EXCLUDED.mobile,
          unread_count = EXCLUDED.unread_count,
          assigned_to = EXCLUDED.assigned_to,
          last_message = EXCLUDED.last_message,
          last_timestamp = EXCLUDED.last_timestamp,
          updated_at = CURRENT_TIMESTAMP
      `, [
        cId, conv.customerName, conv.mobile, conv.unreadCount || 0, conv.assignedTo || null,
        conv.lastMessage || "", conv.lastTimestamp || new Date().toISOString()
      ]);
    } else {
      const idx = db.whatsappConversations.findIndex((c: any) => c.id === conv.id);
      conv.id = cId;
      if (idx !== -1) {
        db.whatsappConversations[idx] = conv;
      } else {
        db.whatsappConversations.unshift(conv);
      }
      writeDb();
    }
  },

  async getWhatsappMessages(convId: string) {
    assertDatabase();
    if (pool) {
      const res = await pool.query("SELECT * FROM whatsapp_messages WHERE conversation_id = $1 ORDER BY timestamp ASC", [convId]);
      return res.rows.map((row: any) => ({
        id: row.id,
        conversationId: row.conversation_id,
        sender: row.sender,
        senderName: row.sender_name,
        text: row.text,
        attachmentUrl: row.attachment_url,
        attachmentType: row.attachment_type,
        timestamp: row.timestamp
      }));
    }
    return (db.whatsappMessages || []).filter((m: any) => m.conversationId === convId);
  },

  async saveWhatsappMessage(msg: any) {
    assertDatabase();
    const mId = msg.id || `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    if (pool) {
      await pool.query(`
        INSERT INTO whatsapp_messages (id, conversation_id, sender, sender_name, text, attachment_url, attachment_type, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        mId, msg.conversationId, msg.sender, msg.senderName, msg.text,
        msg.attachmentUrl || null, msg.attachmentType || null, msg.timestamp || new Date().toISOString()
      ]);
    } else {
      db.whatsappMessages = db.whatsappMessages || [];
      db.whatsappMessages.push(msg);
      writeDb();
    }
  },

  async getWhatsappTemplates() {
    assertDatabase();
    if (pool) {
      const res = await pool.query("SELECT * FROM whatsapp_templates ORDER BY created_at DESC");
      return res.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        message: row.message
      }));
    }
    return db.whatsappTemplates || [];
  },

  async saveWhatsappTemplate(t: any) {
    assertDatabase();
    const tId = t.id || `wt-${Date.now()}`;
    if (pool) {
      await pool.query(`
        INSERT INTO whatsapp_templates (id, name, category, message)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          message = EXCLUDED.message,
          updated_at = CURRENT_TIMESTAMP
      `, [tId, t.name, t.category || "General", t.message]);
    } else {
      db.whatsappTemplates = db.whatsappTemplates || [];
      const idx = db.whatsappTemplates.findIndex((x: any) => x.id === t.id);
      t.id = tId;
      if (idx !== -1) {
        db.whatsappTemplates[idx] = t;
      } else {
        db.whatsappTemplates.push(t);
      }
      writeDb();
    }
  },

  async deleteWhatsappTemplate(id: string) {
    assertDatabase();
    if (pool) {
      await pool.query("DELETE FROM whatsapp_templates WHERE id = $1", [id]);
    } else {
      db.whatsappTemplates = (db.whatsappTemplates || []).filter((t: any) => t.id !== id);
      writeDb();
    }
  },

  async getWhatsappLogs() {
    assertDatabase();
    if (pool) {
      const res = await pool.query("SELECT * FROM whatsapp_logs ORDER BY created_at DESC");
      return res.rows.map((row: any) => ({
        id: row.id,
        timestamp: row.timestamp,
        customerName: row.customer_name,
        mobile: row.mobile,
        templateName: row.template_name,
        messageText: row.message_text,
        sentBy: row.sent_by
      }));
    }
    return db.whatsappLogs || [];
  },

  async saveWhatsappLog(log: any) {
    assertDatabase();
    const lId = log.id || `wl-${Date.now()}`;
    if (pool) {
      await pool.query(`
        INSERT INTO whatsapp_logs (id, timestamp, customer_name, mobile, template_name, message_text, sent_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [lId, log.timestamp || new Date().toISOString(), log.customerName, log.mobile, log.templateName, log.messageText, log.sentBy]);
    } else {
      db.whatsappLogs = db.whatsappLogs || [];
      db.whatsappLogs.unshift(log);
      writeDb();
    }
  }
};

async function logAction(username: string, action: string) {
  const logEntry = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    username,
    action
  };
  try {
    await DB_Service.saveLog(logEntry);
  } catch (err) {
    console.error("Failed to log action:", err);
  }
}

// ---------------- REST APIs ----------------

// Health Check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", mode: "failsafe-file-db", timestamp: new Date() });
});

// Authentication Login
app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const users = await DB_Service.getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }
    if (user.status !== "Active") {
      return res.status(403).json({ success: false, message: "Your user account is deactivated. Contact administrator." });
    }
    user.lastLogin = new Date().toLocaleString();
    await DB_Service.saveUser(user);
    logAction(username, `Logged in successfully from device`);
    res.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        role: user.role,
        mobile: user.mobile,
        status: user.status,
        lastLogin: user.lastLogin
      },
      token: `jwt-token-sih-${user.role}-${Date.now()}`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Settings API
app.get("/api/settings", async (req: Request, res: Response) => {
  try {
    const settings = await DB_Service.getSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const saveSettingsHandler = async (req: Request, res: Response) => {
  try {
    await DB_Service.saveSettings(req.body);
    const settings = await DB_Service.getSettings();
    logAction("admin", "Updated CRM global system settings");
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

app.put("/api/settings", saveSettingsHandler);
app.post("/api/settings", saveSettingsHandler);

// Leads CRUD
app.get("/api/leads", async (req: Request, res: Response) => {
  try {
    const leads = await DB_Service.getLeads();
    res.json(leads);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/leads", async (req: Request, res: Response) => {
  try {
    const newLead = req.body;
    newLead.id = newLead.id || `SIH-LD-${Math.floor(10000 + Math.random() * 90000)}`;
    newLead.timeline = newLead.timeline || [{ timestamp: new Date().toLocaleDateString('en-IN'), text: "Lead registered in South Indian Holidays system" }];
    newLead.followUpHistory = newLead.followUpHistory || [];
    await DB_Service.saveLead(newLead);
    logAction("system", `Created new lead: ${newLead.name} (${newLead.destination})`);
    res.status(201).json(newLead);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/leads/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lead = await DB_Service.getLead(id);
    if (lead) {
      const updated = { ...lead, ...req.body };
      await DB_Service.saveLead(updated);
      logAction("system", `Modified lead information for customer ${updated.name}`);
      res.json(updated);
    } else {
      res.status(404).json({ error: "Lead not found" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/leads/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lead = await DB_Service.getLead(id);
    if (lead) {
      await DB_Service.deleteLead(id);
      logAction("admin", `Permanently deleted customer lead: ${lead.name}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Lead not found" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Direct Follow-ups Global REST APIs
app.get("/api/followups", (req: Request, res: Response) => {
  const { filter, staff, status } = req.query;
  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split("T")[0];

  let list: any[] = [];
  db.leads.forEach((lead: any) => {
    const safeHistory = Array.isArray(lead.followUpHistory) ? lead.followUpHistory : [];
    safeHistory.forEach((fu: any) => {
      list.push({
        ...fu,
        leadId: lead.id,
        leadName: lead.name,
        leadMobile: lead.mobile,
        leadEmail: lead.email,
        notes: fu.notes || fu.remarks || "",
        staff: fu.staff || fu.assignedTo || "",
        remarks: fu.remarks || fu.notes || "",
        assignedTo: fu.assignedTo || fu.staff || ""
      });
    });
  });

  if (filter === "today") {
    list = list.filter(fu => fu.date === todayStr);
  } else if (filter === "tomorrow") {
    list = list.filter(fu => fu.date === tomorrowStr);
  } else if (filter === "overdue") {
    list = list.filter(fu => fu.status === "Pending" && fu.date < todayStr);
  }

  if (staff && staff !== "all") {
    list = list.filter(fu => (fu.staff === staff || fu.assignedTo === staff));
  }

  if (status && status !== "all") {
    list = list.filter(fu => fu.status === status);
  }

  list.sort((a, b) => {
    const dateA = `${a.date}T${a.time || "00:00"}`;
    const dateB = `${b.date}T${b.time || "00:00"}`;
    return dateB.localeCompare(dateA);
  });

  res.json(list);
});

app.post("/api/followups", (req: Request, res: Response) => {
  const { leadId, date, time, type, priority, status, notes, staff, nextFollowUp } = req.body;

  if (!date || !time || !notes) {
    return res.status(400).json({ error: "Date, time, and notes are required" });
  }

  const lead = db.leads.find((l: any) => l.id === leadId);
  if (!lead) return res.status(404).json({ error: "Lead not found" });

  const id = `FU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const fu = {
    id,
    date,
    time,
    type,
    priority: priority || "Medium",
    status: status || "Pending",
    notes,
    remarks: notes,
    staff: staff || "admin",
    assignedTo: staff || "admin",
    nextFollowUp: nextFollowUp || ""
  };

  lead.followUpHistory = lead.followUpHistory || [];
  lead.followUpHistory.unshift(fu);

  // Auto update lead status to Follow-up
  lead.status = "Follow-up";

  lead.timeline = lead.timeline || [];
  lead.timeline.unshift({
    timestamp: new Date().toLocaleDateString("en-IN"),
    text: `Created follow-up [${type}] scheduled by ${staff || "admin"}. Notes: ${notes}`
  });

  writeDb();
  logAction("system", `Scheduled follow-up for lead ${lead.name}`);
  res.status(201).json(fu);
});

app.put("/api/followups/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const { date, time, type, priority, status, notes, staff, nextFollowUp } = req.body;

  let foundFu: any = null;

  for (const lead of db.leads) {
    const safeHistory = Array.isArray(lead.followUpHistory) ? lead.followUpHistory : [];
    const idx = safeHistory.findIndex((f: any) => f.id === id);
    if (idx !== -1) {
      foundFu = safeHistory[idx];
      
      const updatedFu = {
        ...foundFu,
        date: date !== undefined ? date : foundFu.date,
        time: time !== undefined ? time : foundFu.time,
        type: type !== undefined ? type : foundFu.type,
        priority: priority !== undefined ? priority : foundFu.priority,
        status: status !== undefined ? status : foundFu.status,
        notes: notes !== undefined ? notes : (foundFu.notes || foundFu.remarks),
        remarks: notes !== undefined ? notes : (foundFu.remarks || foundFu.notes),
        staff: staff !== undefined ? staff : (foundFu.staff || foundFu.assignedTo),
        assignedTo: staff !== undefined ? staff : (foundFu.assignedTo || foundFu.staff),
        nextFollowUp: nextFollowUp !== undefined ? nextFollowUp : foundFu.nextFollowUp
      };

      if (status === "Completed" && foundFu.status !== "Completed") {
        updatedFu.completionDate = new Date().toISOString().split("T")[0];
        updatedFu.completionTime = new Date().toTimeString().split(" ")[0].substring(0, 5);
      }

      lead.followUpHistory[idx] = updatedFu;
      
      // Also update lead status automatically on save/update of followup if appropriate
      if (status === "Completed") {
        lead.status = "Contacted"; // transition status on completion
      } else {
        lead.status = "Follow-up";
      }

      lead.timeline = lead.timeline || [];
      lead.timeline.unshift({
        timestamp: new Date().toLocaleDateString("en-IN"),
        text: `Updated follow-up status to ${status || foundFu.status}. Notes: ${notes || ""}`
      });

      writeDb();
      logAction("system", `Updated follow-up ${id} on lead ${lead.name}`);
      foundFu = updatedFu;
      break;
    }
  }

  if (foundFu) {
    res.json(foundFu);
  } else {
    res.status(404).json({ error: "Follow-up not found" });
  }
});

app.delete("/api/followups/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  let deleted = false;

  for (const lead of db.leads) {
    const safeHistory = Array.isArray(lead.followUpHistory) ? lead.followUpHistory : [];
    const exists = safeHistory.some((f: any) => f.id === id);
    if (exists) {
      lead.followUpHistory = safeHistory.filter((f: any) => f.id !== id);
      lead.timeline = lead.timeline || [];
      lead.timeline.unshift({
        timestamp: new Date().toLocaleDateString("en-IN"),
        text: `Deleted scheduling follow-up item ${id}`
      });
      writeDb();
      logAction("system", `Deleted follow-up ${id} from lead ${lead.name}`);
      deleted = true;
      break;
    }
  }

  if (deleted) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Follow-up not found" });
  }
});

// Follow-ups Sub-routes
app.post("/api/leads/:leadId/followups", async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const lead = await DB_Service.getLead(leadId);
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const fu = req.body;
    fu.id = fu.id || `FU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    lead.followUpHistory = lead.followUpHistory || [];
    lead.followUpHistory.unshift(fu);
    lead.timeline = lead.timeline || [];
    lead.timeline.unshift({
      timestamp: new Date().toLocaleDateString('en-IN'),
      text: `Scheduled new follow-up [${fu.type}]: ${fu.remarks || fu.notes || ""}`
    });
    await DB_Service.saveLead(lead);
    logAction("system", `Added follow-up scheduled for lead ${lead.name}`);
    res.status(201).json(lead);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/leads/:leadId/followups/:fuId", async (req: Request, res: Response) => {
  try {
    const { leadId, fuId } = req.params;
    const lead = await DB_Service.getLead(leadId);
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const fuIdx = lead.followUpHistory.findIndex((f: any) => f.id === fuId);
    if (fuIdx !== -1) {
      lead.followUpHistory[fuIdx] = { ...lead.followUpHistory[fuIdx], ...req.body };
      lead.timeline = lead.timeline || [];
      lead.timeline.unshift({
        timestamp: new Date().toLocaleDateString('en-IN'),
        text: `Updated follow-up status to ${lead.followUpHistory[fuIdx].status}`
      });
      await DB_Service.saveLead(lead);
      logAction("system", `Updated follow-up details on lead ${lead.name}`);
      res.json(lead);
    } else {
      res.status(404).json({ error: "Followup not found" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/leads/:leadId/followups/:fuId", async (req: Request, res: Response) => {
  try {
    const { leadId, fuId } = req.params;
    const lead = await DB_Service.getLead(leadId);
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    lead.followUpHistory = lead.followUpHistory.filter((f: any) => f.id !== fuId);
    lead.timeline = lead.timeline || [];
    lead.timeline.unshift({
      timestamp: new Date().toLocaleDateString('en-IN'),
      text: `Deleted scheduling follow-up item`
    });
    await DB_Service.saveLead(lead);
    res.json(lead);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Packages CRUD (Newly added per user requirement)
app.get("/api/packages", async (req: Request, res: Response) => {
  try {
    const packages = await DB_Service.getPackages();
    res.json(packages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/packages", async (req: Request, res: Response) => {
  try {
    const newPkg = req.body;
    newPkg.id = newPkg.id || `PKG-${Math.floor(10000 + Math.random() * 90000)}`;
    await DB_Service.savePackage(newPkg);
    logAction("system", `Created standard tour package template: ${newPkg.name}`);
    res.status(201).json(newPkg);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/packages/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const packages = await DB_Service.getPackages();
    const existing = packages.find((p: any) => p.id === id);
    if (existing) {
      const updated = { ...existing, ...req.body };
      await DB_Service.savePackage(updated);
      logAction("system", `Updated tour package specifications: ${updated.name}`);
      res.json(updated);
    } else {
      res.status(404).json({ error: "Package not found" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/packages/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const packages = await DB_Service.getPackages();
    const pkg = packages.find((p: any) => p.id === id);
    if (pkg) {
      await DB_Service.deletePackage(id);
      logAction("admin", `Permanently removed package from library: ${pkg.name}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Package not found" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Bookings CRUD
app.get("/api/bookings", async (req: Request, res: Response) => {
  try {
    const bookings = await DB_Service.getBookings();
    res.json(bookings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/bookings", async (req: Request, res: Response) => {
  try {
    const booking = req.body;
    booking.id = booking.id || `SIH-BK-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    booking.timeline = booking.timeline || [{ timestamp: new Date().toLocaleDateString('en-IN'), text: "Manual booking created and vouchers locked." }];
    booking.documents = booking.documents || [];
    await DB_Service.saveBooking(booking);

    // Auto-generate outstanding payment ledger
    const payId = `SIH-PAY-${Math.floor(1000 + Math.random() * 9000)}`;
    const outstandingLedger = {
      id: payId,
      bookingId: booking.id,
      customerName: booking.customerName,
      totalAmount: booking.packagePrice,
      advancePaid: 0,
      balanceAmount: booking.packagePrice,
      status: "Unpaid",
      installments: []
    };
    await DB_Service.savePayment(outstandingLedger);

    logAction("system", `Created travel reservation for: ${booking.customerName} to ${booking.destination}`);
    res.status(201).json({ booking, payment: outstandingLedger });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/bookings/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const booking = await DB_Service.getBooking(id);
    if (booking) {
      const updated = { ...booking, ...req.body };
      await DB_Service.saveBooking(updated);
      logAction("system", `Updated reservation parameters: ${updated.id}`);
      res.json(updated);
    } else {
      res.status(404).json({ error: "Booking not found" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/bookings/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const booking = await DB_Service.getBooking(id);
    if (booking) {
      await DB_Service.deleteBooking(id);
      logAction("admin", `Deleted reservation, ledger, and all tied documents for booking: ${booking.id}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Booking not found" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vouchers CRUD
app.get("/api/vouchers", async (req: Request, res: Response) => {
  try {
    const vouchers = await DB_Service.getVouchers();
    res.json(vouchers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/vouchers", async (req: Request, res: Response) => {
  try {
    const voucher = req.body;
    voucher.id = voucher.id || `HBV-${Math.floor(10000 + Math.random() * 90000)}`;
    await DB_Service.saveVoucher(voucher);
    logAction("operations", `Generated professional hotel voucher ${voucher.id} for ${voucher.guestName}`);
    res.status(201).json(voucher);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/vouchers/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const voucher = await DB_Service.getVoucher(id);
    if (voucher) {
      const updated = { ...voucher, ...req.body };
      await DB_Service.saveVoucher(updated);
      logAction("operations", `Modified voucher variables on ${updated.id}`);
      res.json(updated);
    } else {
      res.status(404).json({ error: "Voucher not found" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/vouchers/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await DB_Service.deleteVoucher(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Quotations CRUD
app.get("/api/quotations", async (req: Request, res: Response) => {
  try {
    const quotations = await DB_Service.getQuotations();
    res.json(quotations || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/quotations", async (req: Request, res: Response) => {
  try {
    const quotation = req.body;
    quotation.id = quotation.id || `QT-${Math.floor(10000 + Math.random() * 90000)}`;
    const settings = await DB_Service.getSettings();
    const prefix = settings?.quotationPrefix || "SIH-QT-";
    const quotations = await DB_Service.getQuotations();
    const count = quotations.length;
    quotation.quotationNumber = quotation.quotationNumber || `${prefix}${1000 + count + 1}`;
    quotation.createdAt = quotation.createdAt || new Date().toISOString();
    quotation.updatedAt = quotation.updatedAt || new Date().toISOString();
    quotation.status = quotation.status || "Draft";
    
    await DB_Service.saveQuotation(quotation);
    logAction("operations", `Created quotation ${quotation.quotationNumber} for ${quotation.customerName}`);
    res.status(201).json(quotation);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create quotation" });
  }
});

app.put("/api/quotations/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await DB_Service.getQuotation(id);
    if (existing) {
      const updated = { 
        ...existing, 
        ...req.body, 
        updatedAt: new Date().toISOString() 
      };
      await DB_Service.saveQuotation(updated);
      logAction("operations", `Updated quotation variables on ${updated.quotationNumber}`);
      res.json(updated);
    } else {
      res.status(404).json({ error: "Quotation not found" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update quotation" });
  }
});

app.delete("/api/quotations/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const quotation = await DB_Service.getQuotation(id);
    if (quotation) {
      await DB_Service.deleteQuotation(id);
      logAction("operations", `Deleted quotation ${quotation.quotationNumber} for ${quotation.customerName}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Quotation not found" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete quotation" });
  }
});

// Save PDF for Quotation
app.post("/api/quotations/:id/pdf", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const quotation = await DB_Service.getQuotation(id);
    if (quotation) {
      if (req.file) {
        const fileUrl = `/uploads/${req.file.filename}`;
        quotation.pdfPath = fileUrl;
        quotation.updatedAt = new Date().toISOString();
        await DB_Service.saveQuotation(quotation);
        logAction("operations", `Uploaded PDF file for quotation ${quotation.quotationNumber}`);
        res.json({ success: true, pdfPath: fileUrl });
      } else {
        res.status(400).json({ error: "No PDF file provided" });
      }
    } else {
      res.status(404).json({ error: "Quotation not found" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to upload PDF" });
  }
});

// Share Quotation via WhatsApp
app.post("/api/quotations/:id/share-whatsapp", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const q = await DB_Service.getQuotation(id);
    if (q) {
      const customerMobile = q.customerPhone || q.customerMobile || "";
      if (!customerMobile || customerMobile.trim() === "") {
        return res.status(400).json({ error: "Validation Error: No mobile contact number is available for this customer." });
      }
      const cleanPhone = customerMobile.replace(/\D/g, "");
      
      const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
      const host = req.get("host") || "api.southindianholidays.co.in";
      const baseUrl = process.env.APP_URL || process.env.PUBLIC_URL || process.env.BACKEND_URL || `${proto}://${host}`;
      const pdfUrl = q.pdfPath ? `${baseUrl}${q.pdfPath}` : `${baseUrl}/uploads/dummy-pdf.pdf`;
      
      const message = `Dear ${q.customerName},\n\nThank you for choosing South Indian Holidays.\n\nPlease find your travel quotation attached.\n\nLink to your travel quotation: ${pdfUrl}\n\nRegards,\nSouth Indian Holidays`;
      
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
      
      q.status = "Sent";
      q.updatedAt = new Date().toISOString();
      await DB_Service.saveQuotation(q);
      
      logAction("operations", `Shared quotation ${q.quotationNumber} with ${q.customerName} via WhatsApp`);
      
      res.json({ success: true, whatsappUrl, message });
    } else {
      res.status(404).json({ error: "Quotation not found" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to share via WhatsApp" });
  }
});

// Send Quotation via Email
app.post("/api/quotations/:id/send-email", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const q = await DB_Service.getQuotation(id);
    if (q) {
      const email = req.body.email || q.customerEmail || "";
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ error: "Validation Error: Invalid recipient email address format." });
      }

      const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
      const smtpPort = Number(process.env.SMTP_PORT) || 587;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (!smtpUser || !smtpPass) {
        return res.status(400).json({ 
          error: "SMTP service is not configured. Please define SMTP_USER and SMTP_PASS in server environment settings." 
        });
      }

      if (!q.pdfPath) {
        return res.status(400).json({ error: "No PDF file generated for this quotation yet." });
      }

      const absolutePdfPath = path.join(process.cwd(), q.pdfPath);
      if (!fs.existsSync(absolutePdfPath)) {
        return res.status(400).json({ error: "Quotation PDF file not found on server." });
      }

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const mailOptions = {
        from: smtpUser,
        to: email,
        subject: `Travel Quotation ${q.quotationNumber} - South Indian Holidays`,
        text: `Dear ${q.customerName},\n\nWe appreciate your inquiry with South Indian Holidays.\n\nPlease find attached the travel quotation for your upcoming trip to ${q.destination || "your destination"}.\n\nWarm regards,\nSouth Indian Holidays & Asset Management Pvt. Ltd.`,
        attachments: [
          {
            filename: `Quotation-${q.quotationNumber}.pdf`,
            path: absolutePdfPath,
          }
        ]
      };

      await transporter.sendMail(mailOptions);

      q.status = "Sent";
      q.updatedAt = new Date().toISOString();
      await DB_Service.saveQuotation(q);
      
      logAction("operations", `Emailed quotation ${q.quotationNumber} with PDF attachment to ${email}`);
      
      res.json({ success: true, message: `Email successfully sent to ${email}` });
    } else {
      res.status(404).json({ error: "Quotation not found" });
    }
  } catch (error: any) {
    console.error("Nodemailer sendMail failed:", error);
    res.status(500).json({ error: error.message || "Failed to send email" });
  }
});

// Itineraries CRUD
app.get("/api/itineraries", async (req: Request, res: Response) => {
  try {
    const itineraries = await DB_Service.getItineraries();
    res.json(itineraries || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/itineraries", async (req: Request, res: Response) => {
  try {
    const itinerary = req.body;
    itinerary.id = itinerary.id || `ITN-${Math.floor(10000 + Math.random() * 90000)}`;
    itinerary.createdAt = itinerary.createdAt || new Date().toLocaleDateString("en-IN");
    await DB_Service.saveItinerary(itinerary);
    logAction("operations", `Created tour guide itinerary plan for: ${itinerary.customerName || itinerary.id}`);
    res.status(201).json(itinerary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/itineraries/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await DB_Service.getItinerary(id);
    if (existing) {
      const updated = { ...existing, ...req.body };
      await DB_Service.saveItinerary(updated);
      logAction("operations", `Updated itinerary for: ${updated.customerName || id}`);
      res.json(updated);
    } else {
      res.status(404).json({ error: "Itinerary not found" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/itineraries/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const itinerary = await DB_Service.getItinerary(id);
    if (itinerary) {
      await DB_Service.deleteItinerary(id);
      logAction("admin", `Deleted itinerary for: ${itinerary.customerName || id}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Itinerary not found" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Payments Ledger CRUD
app.get("/api/payments", async (req: Request, res: Response) => {
  try {
    const payments = await DB_Service.getPayments();
    res.json(payments || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/payments/:id/installments", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payments = await DB_Service.getPayments();
    const ledger = payments.find((p: any) => p.id === id);
    if (!ledger) return res.status(404).json({ error: "Ledger not found" });

    const installment = req.body;
    installment.id = installment.id || `INST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    ledger.installments = ledger.installments || [];
    ledger.installments.push(installment);

    // Recalculate advance & balance
    ledger.advancePaid = ledger.installments.reduce((acc: number, inst: any) => acc + Number(inst.amount), 0);
    ledger.balanceAmount = ledger.totalAmount - ledger.advancePaid;

    if (ledger.balanceAmount <= 0) {
      ledger.status = "Paid";
    } else if (ledger.advancePaid > 0) {
      ledger.status = "Partially Paid";
    } else {
      ledger.status = "Unpaid";
    }

    await DB_Service.savePayment(ledger);
    logAction("accountant", `Recorded payment voucher entry of ₹${installment.amount} for ${ledger.customerName}`);
    res.json(ledger);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Expenses CRUD
app.get("/api/expenses", async (req: Request, res: Response) => {
  try {
    const expenses = await DB_Service.getExpenses();
    res.json(expenses || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/expenses", async (req: Request, res: Response) => {
  try {
    const exp = req.body;
    exp.id = exp.id || `EXP-${Math.floor(1000 + Math.random() * 9000)}`;
    await DB_Service.saveExpense(exp);
    logAction("accountant", `Logged cash outflow expense for: ${exp.description}`);
    res.status(201).json(exp);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/expenses/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await DB_Service.deleteExpense(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Catalog Products
app.get("/api/products", (req: Request, res: Response) => {
  res.json(db.products || []);
});

app.post("/api/products", (req: Request, res: Response) => {
  const product = req.body;
  product.id = product.id || `p-${Date.now()}`;
  db.products = db.products || [];
  db.products.push(product);
  writeDb();
  res.status(201).json(product);
});

// Hotels
app.get("/api/hotels", async (req: Request, res: Response) => {
  try {
    const hotels = await DB_Service.getHotels();
    res.json(hotels || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/hotels", async (req: Request, res: Response) => {
  try {
    const hotel = req.body;
    hotel.id = hotel.id || `H-${Math.floor(10 + Math.random() * 90)}`;
    await DB_Service.saveHotel(hotel);
    res.status(201).json(hotel);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/hotels/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await DB_Service.deleteHotel(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Drivers
app.get("/api/drivers", async (req: Request, res: Response) => {
  try {
    const drivers = await DB_Service.getDrivers();
    res.json(drivers || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/drivers", async (req: Request, res: Response) => {
  try {
    const driver = req.body;
    driver.id = driver.id || `DRV-${Math.floor(10 + Math.random() * 90)}`;
    await DB_Service.saveDriver(driver);
    res.status(201).json(driver);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/drivers/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await DB_Service.deleteDriver(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Suppliers
app.get("/api/suppliers", async (req: Request, res: Response) => {
  try {
    const suppliers = await DB_Service.getSuppliers();
    res.json(suppliers || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/suppliers", async (req: Request, res: Response) => {
  try {
    const supplier = req.body;
    supplier.id = supplier.id || `SUP-${Math.floor(10 + Math.random() * 90)}`;
    await DB_Service.saveSupplier(supplier);
    res.status(201).json(supplier);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/suppliers/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await DB_Service.deleteSupplier(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Users
app.get("/api/users", async (req: Request, res: Response) => {
  try {
    const users = await DB_Service.getUsers();
    res.json(users || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/users", async (req: Request, res: Response) => {
  try {
    const user = req.body;
    user.id = user.id || `USR-${Math.floor(100 + Math.random() * 900)}`;
    user.lastLogin = "Never";
    await DB_Service.saveUser(user);
    logAction("admin", `Created new backend credential profile: ${user.username}`);
    res.status(201).json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const users = await DB_Service.getUsers();
    const existing = users.find((u: any) => u.id === id);
    if (existing) {
      const updated = { ...existing, ...req.body };
      await DB_Service.saveUser(updated);
      res.json(updated);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/users/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const users = await DB_Service.getUsers();
    const existing = users.find((u: any) => u.id === id);
    if (existing) {
      await DB_Service.deleteUser(id);
      logAction("admin", `Deleted user account: ${existing.username}`);
      res.json({ success: true, deleted: existing });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Action Logs
app.get("/api/logs", async (req: Request, res: Response) => {
  try {
    const logs = await DB_Service.getLogs();
    res.json(logs || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper function to call Gemini content generation with retries and model fallbacks for high resilience
async function generateContentWithRetryAndFallback(
  ai: any,
  parameters: {
    contents: any;
    config?: any;
  }
) {
  // Ordered fallback models: First 3.5 Flash, then robust Lite models
  const models = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  let lastError: any = null;

  for (const model of models) {
    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini API] Attempting model "${model}", attempt ${attempt}/${maxRetries}...`);
        const response = await ai.models.generateContent({
          model,
          contents: parameters.contents,
          config: parameters.config,
        });
        if (response && response.text) {
          console.log(`[Gemini API] Success with model "${model}" on attempt ${attempt}`);
          return response;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini API] Model "${model}" attempt ${attempt} failed: ${err.message || err}`);
        
        // Wait before retrying
        if (attempt < maxRetries) {
          const delay = attempt * 500;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate content with all fallback models");
}

// WhatsApp Enquiry NLP Parser
app.post("/api/parse-whatsapp", async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "No text provided" });
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await generateContentWithRetryAndFallback(ai, {
        contents: `Parse the following travel inquiry text and extract key details:
"${text}"`,
        config: {
          systemInstruction: "You are an assistant that parses unstructured WhatsApp travel inquiries into structured JSON. Always return values for all required keys. Try to intelligently extract details like vehicle preference, adults count, children, and children's ages.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              customerName: { type: Type.STRING, description: "Extracted name of the customer, default empty string" },
              mobile: { type: Type.STRING, description: "Extracted 10-digit mobile phone number, default empty string" },
              pickupCity: { type: Type.STRING, description: "Extracted city/station of departure/pickup, default empty string" },
              travelDate: { type: Type.STRING, description: "Extracted date of travel in YYYY-MM-DD format, default empty string" },
              adults: { type: Type.INTEGER, description: "Extracted number of adults, default 2" },
              children: { type: Type.INTEGER, description: "Extracted number of children, default 0" },
              childrenAges: { type: Type.STRING, description: "Extracted ages of children (comma separated), default empty string" },
              vehiclePreference: { type: Type.STRING, description: "Vehicle type preferred (must be 'Sedan', 'SUV', or 'Tempo Traveller'), default 'Sedan'" }
            },
            required: ["customerName", "mobile", "pickupCity", "travelDate", "adults", "children", "childrenAges", "vehiclePreference"]
          }
        }
      });

      if (response.text) {
        const parsed = JSON.parse(response.text.trim());
        return res.json(parsed);
      }
    } catch (err) {
      console.error("Gemini parse failed, falling back to heuristics", err);
    }
  }

  // Heuristic fallback
  const result = {
    customerName: "",
    mobile: "",
    pickupCity: "",
    travelDate: "",
    adults: 2,
    children: 0,
    childrenAges: "",
    vehiclePreference: "Sedan"
  };

  const nameMatch = text.match(/(?:name|my name is|i am|hi\s+i'm|this\s+is)\s*:?\s*([A-Za-z\s]{2,30})/i);
  if (nameMatch) {
    result.customerName = nameMatch[1].trim();
  } else {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines[0] && lines[0].length < 25 && !lines[0].includes(":") && !/\d/.test(lines[0])) {
      result.customerName = lines[0];
    }
  }

  const mobileMatch = text.match(/\b\d{10}\b/);
  if (mobileMatch) {
    result.mobile = mobileMatch[0];
  }

  const cityMatch = text.match(/(?:from|pickup|pick up|city|origin|departing)\s*:?\s*([A-Za-z\s]{3,20})/i);
  if (cityMatch) {
    result.pickupCity = cityMatch[1].trim();
  }

  const dateMatch = text.match(/\b(?:\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4})|(?:\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})\b/);
  if (dateMatch) {
    result.travelDate = dateMatch[0].replace(/[\/.]/g, "-");
  } else {
    const writtenDateMatch = text.match(/\b\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b/i);
    if (writtenDateMatch) {
      result.travelDate = writtenDateMatch[0];
    }
  }

  const adultsMatch = text.match(/(\d+)\s*(?:adult|pax|person|people)/i);
  if (adultsMatch) {
    result.adults = parseInt(adultsMatch[1], 10);
  }

  const kidsMatch = text.match(/(\d+)\s*(?:child|kid|children|infant)/i);
  if (kidsMatch) {
    result.children = parseInt(kidsMatch[1], 10);
  }

  const agesMatch = text.match(/(?:age|ages|years\s+old)\s*:?\s*([\d\s,]+)/i);
  if (agesMatch) {
    result.childrenAges = agesMatch[1].trim();
  }

  if (/tempo|traveller|tt/i.test(text)) {
    result.vehiclePreference = "Tempo Traveller";
  } else if (/suv|innova|ertiga|crysta/i.test(text)) {
    result.vehiclePreference = "SUV";
  } else if (/sedan|swift|dzire|etios/i.test(text)) {
    result.vehiclePreference = "Sedan";
  }

  res.json(result);
});

// Itinerary Document Parser (.docx / .doc / .pdf / .txt)
app.post("/api/parse-itinerary-file", upload.single("file"), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(200).json({ success: false, message: "No file uploaded" });
  }

  try {
    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    let rawText = "";

    if (ext === ".doc") {
      return res.status(200).json({
        success: false,
        message: "Old binary .doc files are not supported. Please convert your file to .docx, .pdf, or .txt first."
      });
    }

    if (ext === ".docx") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ path: filePath });
      rawText = result.value || "";
    } else if (ext === ".pdf") {
      try {
        const pdfParse = (await import("pdf-parse")).default;
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        rawText = pdfData.text || "";
      } catch (pdfErr) {
        console.error("PDF parse failed, attempting string extraction fallback", pdfErr);
        rawText = fs.readFileSync(filePath, "utf8");
      }
    } else {
      // .txt or other plain text files
      rawText = fs.readFileSync(filePath, "utf8");
    }

    if (!rawText.trim()) {
      return res.status(200).json({ success: false, message: "Could not extract plain text from file or the file is empty." });
    }

    if (process.env.GEMINI_API_KEY) {
      try {
         const { GoogleGenAI, Type } = await import("@google/genai");
         const ai = new GoogleGenAI({
           apiKey: process.env.GEMINI_API_KEY,
           httpOptions: {
             headers: {
               'User-Agent': 'aistudio-build',
             }
           }
         });

         const response = await generateContentWithRetryAndFallback(ai, {
           contents: `Extract the day-wise itinerary plan from the following travel document text:
"${rawText}"`,
           config: {
             systemInstruction: "You are an assistant that parses travel itineraries into a structured day-wise JSON plan. For each day, extract the Day Number, Destination, Hotel, Meals, Transport, Sightseeing, Activities, and Notes. Also provide fallback/computed fields 'title', 'stay', and 'activity' to prevent frontend breakage.",
             responseMimeType: "application/json",
             responseSchema: {
               type: Type.OBJECT,
               properties: {
                 success: { type: Type.BOOLEAN, description: "Always true if parsing succeeded" },
                 customerName: { type: Type.STRING, description: "Name of the customer if mentioned, default 'Standard Guest'" },
                 destination: { type: Type.STRING, description: "Overall main destination, e.g. Kodaikanal" },
                 duration: { type: Type.STRING, description: "Duration string, e.g. 3 Days / 2 Nights" },
                 days: {
                   type: Type.ARRAY,
                   items: {
                     type: Type.OBJECT,
                     properties: {
                       dayNumber: { type: Type.INTEGER, description: "Day number, starting from 1" },
                       destination: { type: Type.STRING, description: "Specific destination or town for this day, e.g. Kodaikanal" },
                       hotel: { type: Type.STRING, description: "Name of the hotel or resort for this day" },
                       meals: { type: Type.STRING, description: "Meals included, e.g. Breakfast & Dinner" },
                       transport: { type: Type.STRING, description: "Transport details, e.g. Private Sedan, AC Cab" },
                       sightseeing: { type: Type.STRING, description: "Sightseeing attractions visited on this day" },
                       activities: { type: Type.STRING, description: "Activities done, e.g. Boating, shopping, trekking" },
                       notes: { type: Type.STRING, description: "Any special instructions or notes for this day" },
                       title: { type: Type.STRING, description: "A summarized heading for the day, e.g. Arrival & Valley Tour" },
                       activity: { type: Type.STRING, description: "A descriptive combined paragraph of sightseeing, activities, and transport details" },
                       stay: { type: Type.STRING, description: "Name of the stay/hotel, matching the 'hotel' field" }
                     },
                     required: ["dayNumber", "destination", "hotel", "meals", "transport", "sightseeing", "activities", "notes", "title", "activity", "stay"]
                   }
                 }
               },
               required: ["success", "customerName", "destination", "duration", "days"]
             }
           }
         });

         if (response.text) {
           const parsed = JSON.parse(response.text.trim());
           parsed.success = true;
           return res.json(parsed);
         }
      } catch (err: any) {
         console.error("Gemini itinerary parse failed, using heuristics", err);
      }
    }

    // Heuristic fallback parser
    const days: any[] = [];
    const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);
    let currentDay: any = null;

    for (const line of lines) {
      const dayMatch = line.match(/^day\s*(\d+)[:.-]?\s*(.*)/i);
      if (dayMatch) {
        if (currentDay) {
          days.push(currentDay);
        }
        const dayNum = parseInt(dayMatch[1], 10);
        currentDay = {
          dayNumber: dayNum,
          destination: "Kodaikanal",
          hotel: "Standard Deluxe Stay",
          meals: "Breakfast & Dinner",
          transport: "Private Sedan",
          sightseeing: dayMatch[2].trim() || "Local sightseeing options",
          activities: "Trekking, photography, and exploring trails",
          notes: "Relax and enjoy local climate.",
          title: dayMatch[2].trim() || `Day ${dayNum} - Local Sightseeing`,
          activity: dayMatch[2].trim() || "Leisure day and local sightseeing options.",
          stay: "Standard Deluxe Stay"
        };
      } else if (currentDay) {
        if (line.toLowerCase().startsWith("stay:") || line.toLowerCase().startsWith("hotel:")) {
          const hotelVal = line.replace(/^(stay|hotel)\s*:\s*/i, "").trim();
          currentDay.hotel = hotelVal;
          currentDay.stay = hotelVal;
        } else if (line.toLowerCase().startsWith("meals:") || line.toLowerCase().startsWith("meal:")) {
          currentDay.meals = line.replace(/^(meals|meal)\s*:\s*/i, "").trim();
        } else if (line.toLowerCase().startsWith("transport:") || line.toLowerCase().startsWith("cab:")) {
          currentDay.transport = line.replace(/^(transport|cab)\s*:\s*/i, "").trim();
        } else {
          currentDay.activity += (currentDay.activity ? " " : "") + line;
          currentDay.sightseeing += (currentDay.sightseeing ? ", " : "") + line;
        }
      }
    }

    if (currentDay) {
      days.push(currentDay);
    }

    // Default template generator if structure wasn't captured
    if (days.length === 0) {
      const parts = rawText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
      const limit = Math.min(Math.max(parts.length, 1), 6);
      for (let i = 1; i <= limit; i++) {
        days.push({
          dayNumber: i,
          destination: "Kodaikanal",
          hotel: "Standard Hotel (Twin Sharing)",
          meals: "Breakfast",
          transport: "Private Sedan",
          sightseeing: "Local viewpoints, pine forests, and lake",
          activities: "Boating, strolling, cycling",
          notes: "Bring warm clothes.",
          title: `Day ${i} - General Sightseeing`,
          activity: parts[i - 1] || "Leisure day and local sightseeing options.",
          stay: "Standard Hotel (Twin Sharing)"
        });
      }
    }

    return res.json({
      success: true,
      customerName: "Imported Guest",
      destination: "Kodaikanal",
      duration: `${days.length} Days / ${Math.max(days.length - 1, 1)} Nights`,
      days
    });

  } catch (err: any) {
    return res.status(200).json({ success: false, message: err.message || "Failed to compile travel document" });
  }
});

// File upload endpoint
app.post("/api/upload", upload.single("file"), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ success: true, url, name: req.file.originalname });
});

// WhatsApp API Endpoints
app.get("/api/whatsapp/templates", (req: Request, res: Response) => {
  res.json(db.whatsappTemplates || []);
});

app.post("/api/whatsapp/templates", (req: Request, res: Response) => {
  const template = req.body;
  template.id = template.id || `wt-${Date.now()}`;
  db.whatsappTemplates = db.whatsappTemplates || [];
  db.whatsappTemplates.push(template);
  writeDb();
  logAction("system", `Created new WhatsApp message template: ${template.name}`);
  res.status(201).json(template);
});

app.put("/api/whatsapp/templates/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  db.whatsappTemplates = db.whatsappTemplates || [];
  const idx = db.whatsappTemplates.findIndex((t: any) => t.id === id);
  if (idx !== -1) {
    db.whatsappTemplates[idx] = { ...db.whatsappTemplates[idx], ...req.body };
    writeDb();
    logAction("system", `Updated WhatsApp template: ${db.whatsappTemplates[idx].name}`);
    res.json(db.whatsappTemplates[idx]);
  } else {
    res.status(404).json({ error: "Template not found" });
  }
});

app.delete("/api/whatsapp/templates/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  db.whatsappTemplates = db.whatsappTemplates || [];
  const template = db.whatsappTemplates.find((t: any) => t.id === id);
  if (template) {
    db.whatsappTemplates = db.whatsappTemplates.filter((t: any) => t.id !== id);
    writeDb();
    logAction("admin", `Deleted WhatsApp template: ${template.name}`);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Template not found" });
  }
});

app.get("/api/whatsapp/logs", (req: Request, res: Response) => {
  res.json(db.whatsappLogs || []);
});

app.post("/api/whatsapp/logs", (req: Request, res: Response) => {
  const log = req.body;
  log.id = log.id || `wl-${Date.now()}`;
  log.timestamp = log.timestamp || new Date().toISOString();
  db.whatsappLogs = db.whatsappLogs || [];
  db.whatsappLogs.unshift(log);
  writeDb();
  res.status(201).json(log);
});

// Backup System
app.get("/api/backup/export", (req: Request, res: Response) => {
  res.json(db);
});

app.post("/api/backup/import", (req: Request, res: Response) => {
  try {
    const importedData = req.body;
    if (importedData && typeof importedData === "object" && importedData.users) {
      db = { ...INITIAL_DB, ...importedData };
      writeDb();
      logAction("admin", "Restored full CRM system backup manually");
      res.json({ success: true, message: "Backup imported and loaded successfully!" });
    } else {
      res.status(400).json({ success: false, message: "Invalid backup data structure" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Import parsing failed" });
  }
});

// ---------------- WS & WhatsApp Engine ----------------

let wss: WebSocketServer | null = null;
const connectedClients = new Set<WebSocket>();

function setupWebSocket(server: any) {
  wss = new WebSocketServer({ server });
  wss.on("connection", (ws: WebSocket) => {
    connectedClients.add(ws);
    // Send a welcome packet
    ws.send(JSON.stringify({ type: "connection_established" }));
    ws.on("close", () => {
      connectedClients.delete(ws);
    });
    ws.on("error", (err) => {
      console.error("WebSocket client error:", err);
    });
  });
}

function broadcastToClients(data: any) {
  const payload = JSON.stringify(data);
  for (const client of connectedClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// WhatsApp Real API proxy sending helper
async function sendWhatsAppCloudMessage(to: string, messageText: string, attachmentUrl?: string) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || db.settings?.phoneId;
  const token = process.env.WHATSAPP_ACCESS_TOKEN || db.settings?.accessToken;

  if (!phoneId || !token) {
    console.log("[WhatsApp SIMULATOR] Cloud API credentials not configured. Simulating delivery.");
    return false;
  }

  try {
    const cleanTo = to.replace(/\D/g, "");
    const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;
    
    let data: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanTo,
    };

    if (attachmentUrl) {
      const baseUrl = process.env.APP_URL || process.env.PUBLIC_URL || process.env.BACKEND_URL || "https://api.southindianholidays.co.in";
      data.type = "document";
      data.document = {
        link: attachmentUrl.startsWith("http") ? attachmentUrl : `${baseUrl}${attachmentUrl}`,
        filename: attachmentUrl.split("/").pop() || "document.pdf",
        caption: messageText || "Your travel document from South Indian Holidays"
      };
    } else {
      data.type = "text";
      data.text = { body: messageText };
    }

    const response = await axios.post(url, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("[WhatsApp API] Message sent successfully via Meta Graph API:", response.data);
    return true;
  } catch (err: any) {
    console.error("[WhatsApp API] Meta API Send Error:", err.response?.data || err.message);
    return false;
  }
}

// Create/Retrieve WhatsApp Conversation manually
app.post("/api/whatsapp/conversations", (req: Request, res: Response) => {
  const { customerName, mobile, assignedTo } = req.body;
  if (!customerName || !mobile) {
    return res.status(400).json({ error: "customerName and mobile are required" });
  }

  let cleanMobile = mobile.replace(/\D/g, "");
  if (cleanMobile.length === 10) {
    cleanMobile = "91" + cleanMobile;
  }

  db.whatsappConversations = db.whatsappConversations || [];
  let conv = db.whatsappConversations.find((c: any) => c.mobile === cleanMobile);

  if (!conv) {
    conv = {
      id: `wc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      customerName,
      mobile: cleanMobile,
      lastMessage: "Chat conversation started by agent.",
      lastTimestamp: new Date().toISOString(),
      unreadCount: 0,
      assignedTo: assignedTo || null
    };
    db.whatsappConversations.unshift(conv);
    writeDb();
    broadcastToClients({ type: "conversation_updated", conversation: conv });
  }

  res.json(conv);
});

// WhatsApp Conversations List
app.get("/api/whatsapp/conversations", (req: Request, res: Response) => {
  res.json(db.whatsappConversations || []);
});

// WhatsApp Messages for a Conversation
app.get("/api/whatsapp/conversations/:id/messages", (req: Request, res: Response) => {
  const { id } = req.params;
  const messages = (db.whatsappMessages || []).filter((m: any) => m.conversationId === id);
  res.json(messages);
});

// Reset Unread Count for Conversation
app.put("/api/whatsapp/conversations/:id/read", (req: Request, res: Response) => {
  const { id } = req.params;
  const conv = (db.whatsappConversations || []).find((c: any) => c.id === id);
  if (conv) {
    conv.unreadCount = 0;
    writeDb();
    broadcastToClients({ type: "conversation_updated", conversation: conv });
    res.json({ success: true, conversation: conv });
  } else {
    res.status(404).json({ error: "Conversation not found" });
  }
});

// Assign Conversation to Sales Executive
app.put("/api/whatsapp/conversations/:id/assign", (req: Request, res: Response) => {
  const { id } = req.params;
  const { assignedTo } = req.body;
  const conv = (db.whatsappConversations || []).find((c: any) => c.id === id);
  if (conv) {
    conv.assignedTo = assignedTo;
    writeDb();
    broadcastToClients({ type: "conversation_updated", conversation: conv });
    logAction("system", `Assigned WhatsApp chat with ${conv.customerName} to ${assignedTo || "None"}`);
    res.json({ success: true, conversation: conv });
  } else {
    res.status(404).json({ error: "Conversation not found" });
  }
});

// Send WhatsApp Message (Agent -> Customer)
app.post("/api/whatsapp/conversations/:id/messages", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { text, attachmentUrl, attachmentType, senderName } = req.body;

  const conv = (db.whatsappConversations || []).find((c: any) => c.id === id);
  if (!conv) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  const newMessage = {
    id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    conversationId: id,
    sender: "agent" as const,
    senderName: senderName || "Agent",
    text: text || (attachmentUrl ? `Sent attachment: ${attachmentUrl.split("/").pop()}` : ""),
    attachmentUrl,
    attachmentType,
    timestamp: new Date().toISOString()
  };

  db.whatsappMessages = db.whatsappMessages || [];
  db.whatsappMessages.push(newMessage);

  // Update conversation last activity
  conv.lastMessage = newMessage.text;
  conv.lastTimestamp = newMessage.timestamp;
  writeDb();

  // Broadcast agent message
  broadcastToClients({ type: "message_received", message: newMessage, conversation: conv });

  // Post to WhatsApp Cloud API if credentials exist
  const sentReal = await sendWhatsAppCloudMessage(conv.mobile, newMessage.text, attachmentUrl);

  // If credentials are not set, trigger sandbox simulator responses for a live feel!
  if (!sentReal) {
    setTimeout(() => {
      // Create a simulated reply
      let replyText = "Received! Thank you for the update. I will check the details and let you know.";
      const lowerText = (text || "").toLowerCase();
      if (lowerText.includes("itinerary")) {
        replyText = "The itinerary looks amazing! Let me discuss the day-wise plan with my family members tonight and reply.";
      } else if (lowerText.includes("quote") || lowerText.includes("price") || lowerText.includes("pricing") || lowerText.includes("budget")) {
        replyText = "Thank you for the quotation. Is there any group discount available if we add 2 more adults to the booking?";
      } else if (lowerText.includes("voucher") || lowerText.includes("hotel")) {
        replyText = "Got the stay vouchers! Everything looks correct. Thank you for locking in our reservations so quickly.";
      } else if (lowerText.includes("invoice") || lowerText.includes("receipt") || lowerText.includes("payment")) {
        replyText = "Payment receipts received. Thank you for the confirmation. I've saved a copy.";
      }

      const simulatedReply = {
        id: `msg-sim-${Date.now()}`,
        conversationId: id,
        sender: "customer" as const,
        senderName: conv.customerName,
        text: replyText,
        timestamp: new Date().toISOString()
      };

      db.whatsappMessages.push(simulatedReply);
      conv.lastMessage = simulatedReply.text;
      conv.lastTimestamp = simulatedReply.timestamp;
      conv.unreadCount = (conv.unreadCount || 0) + 1;
      writeDb();

      // Broadcast customer reply
      broadcastToClients({ type: "message_received", message: simulatedReply, conversation: conv });
    }, 1500);
  }

  res.status(201).json(newMessage);
});

// Meta Webhook Verification Endpoints (Fulfill webhook callbacks)
app.get("/api/whatsapp/webhook", (req: Request, res: Response) => {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "sih_whatsapp_verify_token";
  
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === verifyToken) {
      console.log("[WhatsApp Webhook] Token verified successfully by Meta.");
      return res.status(200).send(challenge);
    } else {
      console.warn("[WhatsApp Webhook] Verification token mismatch.");
      return res.sendStatus(403);
    }
  }
  res.status(400).send("Bad Request");
});

// Meta Webhook Receiver Endpoint (Processes actual inbound messages)
app.post("/api/whatsapp/webhook", (req: Request, res: Response) => {
  const body = req.body;

  console.log("[WhatsApp Webhook] Event payload received:", JSON.stringify(body));

  if (body.object) {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const message = body.entry[0].changes[0].value.messages[0];
      const fromMobile = message.from; // Sender's phone number
      const textBody = message.text ? message.text.body : "";
      
      const contacts = body.entry[0].changes[0].value.contacts;
      const contactName = contacts && contacts[0] ? contacts[0].profile.name : "Direct WhatsApp Client";

      db.whatsappConversations = db.whatsappConversations || [];
      db.whatsappMessages = db.whatsappMessages || [];

      // Find or create conversation
      let conv = db.whatsappConversations.find((c: any) => c.mobile.replace(/\D/g, "") === fromMobile.replace(/\D/g, ""));
      let isNewConv = false;

      if (!conv) {
        isNewConv = true;
        conv = {
          id: `conv-${Date.now()}`,
          customerName: contactName,
          mobile: fromMobile,
          unreadCount: 1,
          assignedTo: null,
          lastMessage: textBody,
          lastTimestamp: new Date().toISOString()
        };
        db.whatsappConversations.unshift(conv);

        // Feature: Automatically create a new Lead if sender's mobile doesn't exist
        const leadExists = db.leads.some((l: any) => l.mobile.replace(/\D/g, "") === fromMobile.replace(/\D/g, ""));
        if (!leadExists) {
          const autoLeadId = `SIH-LD-${Math.floor(10000 + Math.random() * 90000)}`;
          const newLead = {
            id: autoLeadId,
            name: contactName,
            mobile: fromMobile,
            email: "",
            destination: "kodaikanal",
            travelDate: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0], // default 15 days out
            adults: "2",
            children: "0",
            budget: 15000,
            notes: `Auto-captured via WhatsApp Business Webhook message: "${textBody}"`,
            status: "New" as const,
            priority: "Medium" as const,
            source: "WhatsApp",
            assignedTo: "",
            tags: ["WhatsApp", "Auto-Capture"],
            timeline: [
              { timestamp: new Date().toLocaleDateString("en-IN"), text: "Lead registered in system via WhatsApp Auto-Capture webhook" }
            ],
            followUpHistory: []
          };
          db.leads.unshift(newLead);
          logAction("system", `Created auto-captured lead: ${contactName} from WhatsApp callback`);
        }
      } else {
        conv.lastMessage = textBody;
        conv.lastTimestamp = new Date().toISOString();
        conv.unreadCount = (conv.unreadCount || 0) + 1;
      }

      // Add message
      const incomingMsg = {
        id: `msg-${Date.now()}`,
        conversationId: conv.id,
        sender: "customer" as const,
        senderName: contactName,
        text: textBody,
        timestamp: new Date().toISOString()
      };

      db.whatsappMessages.push(incomingMsg);
      writeDb();

      // Broadcast to client-side components in real-time
      broadcastToClients({ type: "message_received", message: incomingMsg, conversation: conv });

      // Add timeline entry to matching lead if found
      const matchingLead = db.leads.find((l: any) => l.mobile.replace(/\D/g, "") === fromMobile.replace(/\D/g, ""));
      if (matchingLead) {
        matchingLead.timeline.unshift({
          timestamp: new Date().toLocaleDateString("en-IN"),
          text: `Received WhatsApp message: "${textBody}"`
        });
        writeDb();
        broadcastToClients({ type: "lead_updated", lead: matchingLead });
      }

      return res.status(200).send("EVENT_RECEIVED");
    }
  }

  res.sendStatus(404);
});

// Async bootstrap function to guarantee database synchronization before accepting traffic
async function bootstrap() {
  console.log("Bootstrap sequence starting...");
  
  // Try to sync with Postgres at boot (block-sync)
  if (pool) {
    try {
      await syncWithPostgres();
      await initializeRelationalTables();
      await syncRelationalDatabase();
    } catch (syncErr: any) {
      console.error("Boot-time PostgreSQL synchronization failed. Continuing with local file-db fallback.", syncErr.message || syncErr);
    }
  } else {
    console.log("Skipping boot-time PostgreSQL sync since pool is not initialized (no valid DATABASE_URL).");
  }

  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      
      const server = app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running in DEVELOPMENT full-stack mode on http://localhost:${PORT}`);
      });
      setupWebSocket(server);
    } catch (err: any) {
      console.error("Vite server initialization failed:", err);
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running in PRODUCTION standalone mode on port ${PORT}`);
    });
    setupWebSocket(server);
  }
}

bootstrap().catch((bootstrapErr) => {
  console.error("CRITICAL BOOTSTRAP FAILURE:", bootstrapErr);
});
