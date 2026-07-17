import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import { WebSocketServer, WebSocket } from "ws";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
  ]
};

// Database state accessor
let db = { ...INITIAL_DB };

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
  } catch (err) {
    console.error("Error writing db.json", err);
  }
}

// Initialize db
readDb();

// Helper to log action
function logAction(username: string, action: string) {
  const logEntry = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    username,
    action
  };
  db.logs.unshift(logEntry);
  writeDb();
}

// ---------------- REST APIs ----------------

// Health Check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", mode: "failsafe-file-db", timestamp: new Date() });
});

// Authentication Login
app.post("/api/auth/login", (req: Request, res: Response) => {
  const { username, password } = req.body;
  const user = db.users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid username or password" });
  }
  if (user.status !== "Active") {
    return res.status(403).json({ success: false, message: "Your user account is deactivated. Contact administrator." });
  }
  user.lastLogin = new Date().toLocaleString();
  writeDb();
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
});

// Settings API
app.get("/api/settings", (req: Request, res: Response) => {
  res.json(db.settings);
});

const saveSettingsHandler = (req: Request, res: Response) => {
  db.settings = { ...db.settings, ...req.body };
  writeDb();
  logAction("admin", "Updated CRM global system settings");
  res.json(db.settings);
};

app.put("/api/settings", saveSettingsHandler);
app.post("/api/settings", saveSettingsHandler);

// Leads CRUD
app.get("/api/leads", (req: Request, res: Response) => {
  res.json(db.leads);
});

app.post("/api/leads", (req: Request, res: Response) => {
  const newLead = req.body;
  newLead.id = newLead.id || `SIH-LD-${Math.floor(10000 + Math.random() * 90000)}`;
  newLead.timeline = newLead.timeline || [{ timestamp: new Date().toLocaleDateString('en-IN'), text: "Lead registered in South Indian Holidays system" }];
  newLead.followUpHistory = newLead.followUpHistory || [];
  db.leads.unshift(newLead);
  writeDb();
  logAction("system", `Created new lead: ${newLead.name} (${newLead.destination})`);
  res.status(201).json(newLead);
});

app.put("/api/leads/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = db.leads.findIndex(l => l.id === id);
  if (idx !== -1) {
    db.leads[idx] = { ...db.leads[idx], ...req.body };
    writeDb();
    logAction("system", `Modified lead information for customer ${db.leads[idx].name}`);
    res.json(db.leads[idx]);
  } else {
    res.status(404).json({ error: "Lead not found" });
  }
});

app.delete("/api/leads/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const lead = db.leads.find(l => l.id === id);
  if (lead) {
    db.leads = db.leads.filter(l => l.id !== id);
    writeDb();
    logAction("admin", `Permanently deleted customer lead: ${lead.name}`);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Lead not found" });
  }
});

// Follow-ups Sub-routes
app.post("/api/leads/:leadId/followups", (req: Request, res: Response) => {
  const { leadId } = req.params;
  const lead = db.leads.find(l => l.id === leadId);
  if (!lead) return res.status(404).json({ error: "Lead not found" });

  const fu = req.body;
  fu.id = fu.id || `FU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  lead.followUpHistory = lead.followUpHistory || [];
  lead.followUpHistory.unshift(fu);
  lead.timeline.unshift({
    timestamp: new Date().toLocaleDateString('en-IN'),
    text: `Scheduled new follow-up [${fu.type}]: ${fu.remarks}`
  });
  writeDb();
  logAction("system", `Added follow-up scheduled for lead ${lead.name}`);
  res.status(201).json(lead);
});

app.put("/api/leads/:leadId/followups/:fuId", (req: Request, res: Response) => {
  const { leadId, fuId } = req.params;
  const lead = db.leads.find(l => l.id === leadId);
  if (!lead) return res.status(404).json({ error: "Lead not found" });

  const fuIdx = lead.followUpHistory.findIndex(f => f.id === fuId);
  if (fuIdx !== -1) {
    lead.followUpHistory[fuIdx] = { ...lead.followUpHistory[fuIdx], ...req.body };
    lead.timeline.unshift({
      timestamp: new Date().toLocaleDateString('en-IN'),
      text: `Updated follow-up status to ${lead.followUpHistory[fuIdx].status}`
    });
    writeDb();
    logAction("system", `Updated follow-up details on lead ${lead.name}`);
    res.json(lead);
  } else {
    res.status(404).json({ error: "Followup not found" });
  }
});

app.delete("/api/leads/:leadId/followups/:fuId", (req: Request, res: Response) => {
  const { leadId, fuId } = req.params;
  const lead = db.leads.find(l => l.id === leadId);
  if (!lead) return res.status(404).json({ error: "Lead not found" });

  lead.followUpHistory = lead.followUpHistory.filter(f => f.id !== fuId);
  lead.timeline.unshift({
    timestamp: new Date().toLocaleDateString('en-IN'),
    text: `Deleted scheduling follow-up item`
  });
  writeDb();
  res.json(lead);
});

// Packages CRUD (Newly added per user requirement)
app.get("/api/packages", (req: Request, res: Response) => {
  res.json(db.packages);
});

app.post("/api/packages", (req: Request, res: Response) => {
  const newPkg = req.body;
  newPkg.id = newPkg.id || `PKG-${Math.floor(10000 + Math.random() * 90000)}`;
  db.packages.unshift(newPkg);
  writeDb();
  logAction("system", `Created standard tour package template: ${newPkg.name}`);
  res.status(201).json(newPkg);
});

app.put("/api/packages/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = db.packages.findIndex(p => p.id === id);
  if (idx !== -1) {
    db.packages[idx] = { ...db.packages[idx], ...req.body };
    writeDb();
    logAction("system", `Updated tour package specifications: ${db.packages[idx].name}`);
    res.json(db.packages[idx]);
  } else {
    res.status(404).json({ error: "Package not found" });
  }
});

app.delete("/api/packages/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const pkg = db.packages.find(p => p.id === id);
  if (pkg) {
    db.packages = db.packages.filter(p => p.id !== id);
    writeDb();
    logAction("admin", `Permanently removed package from library: ${pkg.name}`);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Package not found" });
  }
});

// Bookings CRUD
app.get("/api/bookings", (req: Request, res: Response) => {
  res.json(db.bookings);
});

app.post("/api/bookings", (req: Request, res: Response) => {
  const booking = req.body;
  booking.id = booking.id || `SIH-BK-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  booking.timeline = booking.timeline || [{ timestamp: new Date().toLocaleDateString('en-IN'), text: "Manual booking created and vouchers locked." }];
  booking.documents = booking.documents || [];
  db.bookings.unshift(booking);

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
  db.payments.unshift(outstandingLedger);

  writeDb();
  logAction("system", `Created travel reservation for: ${booking.customerName} to ${booking.destination}`);
  res.status(201).json({ booking, payment: outstandingLedger });
});

app.put("/api/bookings/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = db.bookings.findIndex(b => b.id === id);
  if (idx !== -1) {
    db.bookings[idx] = { ...db.bookings[idx], ...req.body };
    writeDb();
    logAction("system", `Updated reservation parameters: ${db.bookings[idx].id}`);
    res.json(db.bookings[idx]);
  } else {
    res.status(404).json({ error: "Booking not found" });
  }
});

app.delete("/api/bookings/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const booking = db.bookings.find(b => b.id === id);
  if (booking) {
    db.bookings = db.bookings.filter(b => b.id !== id);
    db.payments = db.payments.filter(p => p.bookingId !== id);
    db.vouchers = db.vouchers.filter(v => v.bookingId !== id);
    db.itineraries = db.itineraries.filter(i => i.bookingId !== id);
    writeDb();
    logAction("admin", `Deleted reservation, ledger, and all tied documents for booking: ${booking.id}`);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Booking not found" });
  }
});

// Vouchers CRUD
app.get("/api/vouchers", (req: Request, res: Response) => {
  res.json(db.vouchers);
});

app.post("/api/vouchers", (req: Request, res: Response) => {
  const voucher = req.body;
  voucher.id = voucher.id || `HBV-${Math.floor(10000 + Math.random() * 90000)}`;
  db.vouchers.unshift(voucher);
  writeDb();
  logAction("operations", `Generated professional hotel voucher ${voucher.id} for ${voucher.guestName}`);
  res.status(201).json(voucher);
});

app.put("/api/vouchers/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = db.vouchers.findIndex(v => v.id === id);
  if (idx !== -1) {
    db.vouchers[idx] = { ...db.vouchers[idx], ...req.body };
    writeDb();
    logAction("operations", `Modified voucher variables on ${db.vouchers[idx].id}`);
    res.json(db.vouchers[idx]);
  } else {
    res.status(404).json({ error: "Voucher not found" });
  }
});

app.delete("/api/vouchers/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  db.vouchers = db.vouchers.filter(v => v.id !== id);
  writeDb();
  res.json({ success: true });
});

// Itineraries CRUD
app.get("/api/itineraries", (req: Request, res: Response) => {
  res.json(db.itineraries);
});

app.post("/api/itineraries", (req: Request, res: Response) => {
  const itinerary = req.body;
  itinerary.id = itinerary.id || `ITN-${Math.floor(10000 + Math.random() * 90000)}`;
  db.itineraries.unshift(itinerary);
  writeDb();
  logAction("operations", `Created tour guide itinerary plan: ${itinerary.id}`);
  res.status(201).json(itinerary);
});

app.put("/api/itineraries/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = db.itineraries.findIndex(i => i.id === id);
  if (idx !== -1) {
    db.itineraries[idx] = { ...db.itineraries[idx], ...req.body };
    writeDb();
    res.json(db.itineraries[idx]);
  } else {
    res.status(404).json({ error: "Itinerary not found" });
  }
});

app.delete("/api/itineraries/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  db.itineraries = db.itineraries.filter(i => i.id !== id);
  writeDb();
  res.json({ success: true });
});

// Payments Ledger CRUD
app.get("/api/payments", (req: Request, res: Response) => {
  res.json(db.payments);
});

app.post("/api/payments/:id/installments", (req: Request, res: Response) => {
  const { id } = req.params;
  const ledger = db.payments.find(p => p.id === id);
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

  writeDb();
  logAction("accountant", `Recorded payment voucher entry of ₹${installment.amount} for ${ledger.customerName}`);
  res.json(ledger);
});

// Expenses CRUD
app.get("/api/expenses", (req: Request, res: Response) => {
  res.json(db.expenses);
});

app.post("/api/expenses", (req: Request, res: Response) => {
  const exp = req.body;
  exp.id = exp.id || `EXP-${Math.floor(1000 + Math.random() * 9000)}`;
  db.expenses.unshift(exp);
  writeDb();
  logAction("accountant", `Logged cash outflow expense for: ${exp.description}`);
  res.status(201).json(exp);
});

app.delete("/api/expenses/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  db.expenses = db.expenses.filter(e => e.id !== id);
  writeDb();
  res.json({ success: true });
});

// Catalog Products
app.get("/api/products", (req: Request, res: Response) => {
  res.json(db.products);
});

app.post("/api/products", (req: Request, res: Response) => {
  const product = req.body;
  product.id = product.id || `p-${Date.now()}`;
  db.products.push(product);
  writeDb();
  res.status(201).json(product);
});

// Hotels
app.get("/api/hotels", (req: Request, res: Response) => {
  res.json(db.hotels);
});

app.post("/api/hotels", (req: Request, res: Response) => {
  const hotel = req.body;
  hotel.id = hotel.id || `H-${Math.floor(10 + Math.random() * 90)}`;
  db.hotels.push(hotel);
  writeDb();
  res.status(201).json(hotel);
});

// Drivers
app.get("/api/drivers", (req: Request, res: Response) => {
  res.json(db.drivers);
});

app.post("/api/drivers", (req: Request, res: Response) => {
  const driver = req.body;
  driver.id = driver.id || `DRV-${Math.floor(10 + Math.random() * 90)}`;
  db.drivers.push(driver);
  writeDb();
  res.status(201).json(driver);
});

// Suppliers
app.get("/api/suppliers", (req: Request, res: Response) => {
  res.json(db.suppliers);
});

app.post("/api/suppliers", (req: Request, res: Response) => {
  const supplier = req.body;
  supplier.id = supplier.id || `SUP-${Math.floor(10 + Math.random() * 90)}`;
  db.suppliers.push(supplier);
  writeDb();
  res.status(201).json(supplier);
});

// Users
app.get("/api/users", (req: Request, res: Response) => {
  res.json(db.users);
});

app.post("/api/users", (req: Request, res: Response) => {
  const user = req.body;
  user.id = user.id || `USR-${Math.floor(100 + Math.random() * 900)}`;
  user.lastLogin = "Never";
  db.users.push(user);
  writeDb();
  logAction("admin", `Created new backend credential profile: ${user.username}`);
  res.status(201).json(user);
});

app.put("/api/users/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = db.users.findIndex(u => u.id === id);
  if (idx !== -1) {
    db.users[idx] = { ...db.users[idx], ...req.body };
    writeDb();
    res.json(db.users[idx]);
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

app.delete("/api/users/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const idx = db.users.findIndex(u => u.id === id);
  if (idx !== -1) {
    const deletedUser = db.users[idx];
    db.users.splice(idx, 1);
    writeDb();
    logAction("admin", `Deleted user account: ${deletedUser.username}`);
    res.json({ success: true, deleted: deletedUser });
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

// Action Logs
app.get("/api/logs", (req: Request, res: Response) => {
  res.json(db.logs);
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

// Itinerary Document Parser (.docx / .doc / .txt)
app.post("/api/parse-itinerary-file", upload.single("file"), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    let rawText = "";

    if (ext === ".docx") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ path: filePath });
      rawText = result.value;
    } else {
      rawText = fs.readFileSync(filePath, "utf8");
    }

    if (!rawText.trim()) {
      return res.status(400).json({ error: "Could not extract plain text from file." });
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
           contents: `Extract the day-wise itinerary plan from the following supplier text:
"${rawText}"`,
           config: {
             systemInstruction: "You are an assistant that parses travel itineraries into a structured day-wise JSON plan. Support itinerary duration from 1 to 15 days.",
             responseMimeType: "application/json",
             responseSchema: {
               type: Type.OBJECT,
               properties: {
                 customerName: { type: Type.STRING, description: "Name of the customer if mentioned, default 'Standard Guest'" },
                 destination: { type: Type.STRING, description: "Destination, e.g. Kodaikanal" },
                 duration: { type: Type.STRING, description: "Duration string, e.g. 3 Days / 2 Nights" },
                 days: {
                   type: Type.ARRAY,
                   items: {
                     type: Type.OBJECT,
                     properties: {
                       dayNumber: { type: Type.INTEGER, description: "Day number, starting from 1" },
                       title: { type: Type.STRING, description: "Brief header for the day, e.g. Arrival & Local Walk" },
                       activity: { type: Type.STRING, description: "Highly detailed sights, pathways, routes, and day activities" },
                       stay: { type: Type.STRING, description: "Name of the stay or resort accommodation mentioned, default 'Standard Deluxe Room'" }
                     },
                     required: ["dayNumber", "title", "activity", "stay"]
                   }
                 }
               },
               required: ["customerName", "destination", "duration", "days"]
             }
           }
         });

         if (response.text) {
           const parsed = JSON.parse(response.text.trim());
           return res.json(parsed);
         }
      } catch (err) {
         console.error("Gemini itinerary parse failed, using heuristics", err);
      }
    }

    // Smart heuristic parser fallback
    const days: any[] = [];
    const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);
    let currentDay: any = null;

    for (const line of lines) {
      const dayMatch = line.match(/^day\s*(\d+)[:.-]?\s*(.*)/i);
      if (dayMatch) {
        if (currentDay) {
          days.push(currentDay);
        }
        currentDay = {
          dayNumber: parseInt(dayMatch[1], 10),
          title: dayMatch[2].trim() || `Day ${dayMatch[1]} highlights`,
          activity: "",
          stay: "Standard Deluxe Stay"
        };
      } else if (currentDay) {
        if (line.toLowerCase().startsWith("stay:") || line.toLowerCase().startsWith("hotel:")) {
          currentDay.stay = line.replace(/^(stay|hotel)\s*:\s*/i, "").trim();
        } else {
          currentDay.activity += (currentDay.activity ? " " : "") + line;
        }
      }
    }

    if (currentDay) {
      days.push(currentDay);
    }

    // Default generator if structure wasn't captured
    if (days.length === 0) {
      const parts = rawText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
      const limit = Math.min(Math.max(parts.length, 1), 6);
      for (let i = 1; i <= limit; i++) {
        days.push({
          dayNumber: i,
          title: `Day ${i} - General Sightseeing`,
          activity: parts[i - 1] || "Leisure day and local sightseeing options.",
          stay: "Standard Hotel (Twin Sharing)"
        });
      }
    }

    res.json({
      customerName: "Imported Guest",
      destination: "Kodaikanal",
      duration: `${days.length} Days / ${Math.max(days.length - 1, 1)} Nights`,
      days
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to compile travel document" });
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
      data.type = "document";
      data.document = {
        link: attachmentUrl.startsWith("http") ? attachmentUrl : `http://localhost:3000${attachmentUrl}`,
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

// Itinerary System endpoints
app.get("/api/itineraries", (req: Request, res: Response) => {
  res.json(db.itineraries || []);
});

app.post("/api/itineraries", (req: Request, res: Response) => {
  const itinerary = req.body;
  itinerary.id = itinerary.id || `ITN-${Date.now()}`;
  itinerary.createdAt = itinerary.createdAt || new Date().toLocaleDateString("en-IN");
  db.itineraries = db.itineraries || [];
  db.itineraries.unshift(itinerary);
  writeDb();
  logAction("system", `Created itinerary for: ${itinerary.customerName}`);
  res.status(201).json(itinerary);
});

app.put("/api/itineraries/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  db.itineraries = db.itineraries || [];
  const idx = db.itineraries.findIndex((i: any) => i.id === id);
  if (idx !== -1) {
    db.itineraries[idx] = { ...db.itineraries[idx], ...req.body };
    writeDb();
    logAction("system", `Updated itinerary for: ${db.itineraries[idx].customerName}`);
    res.json(db.itineraries[idx]);
  } else {
    res.status(404).json({ error: "Itinerary not found" });
  }
});

app.delete("/api/itineraries/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  db.itineraries = db.itineraries || [];
  const itinerary = db.itineraries.find((i: any) => i.id === id);
  if (itinerary) {
    db.itineraries = db.itineraries.filter((i: any) => i.id !== id);
    writeDb();
    logAction("admin", `Deleted itinerary for: ${itinerary.customerName}`);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Itinerary not found" });
  }
});

// Vite or Static file serving middleware setup
const isProd = process.env.NODE_ENV === "production";
if (!isProd) {
  createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  }).then((vite) => {
    app.use(vite.middlewares);
    
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running in DEVELOPMENT full-stack mode on http://localhost:${PORT}`);
    });
    setupWebSocket(server);
  }).catch(err => {
    console.error("Vite server initialization failed:", err);
  });
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
