export interface User {
  id: string;
  fullName: string;
  mobile: string;
  email: string;
  username: string;
  password?: string;
  role: 'superadmin' | 'admin' | 'sales' | 'operations' | 'accounts' | 'accountant';
  status: 'Active' | 'Inactive';
  lastLogin: string;
  permissions?: {
    view: boolean;
    add: boolean;
    edit: boolean;
    delete: boolean;
    modifyRights: boolean;
  };
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  approvedBy: string;
  receiptUrl?: string;
}

export interface Settings {
  companyName: string;
  gstNumber: string;
  address: string;
  phone: string;
  email: string;
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
  upiId: string;
  website: string;
  logo: string;
  quotationPrefix: string;
  voucherPrefix: string;
  invoicePrefix: string;
  taxRate: number; // e.g. 5 for 5% GST
}

export interface Hotel {
  id: string;
  name: string;
  destination: string;
  rating: string;
  contactPerson: string;
  contactPhone: string;
  roomType: string;
  contractRate: number;
  availableRooms: number;
}

export interface Driver {
  id: string;
  name: string;
  mobile: string;
  vehicleType: string;
  vehicleNo: string;
  status: 'Available' | 'On Trip' | 'Maintenance';
  rating: string;
}

export interface Supplier {
  id: string;
  name: string;
  type: 'Transport' | 'Hotel' | 'Activities' | 'Other';
  contactPerson: string;
  contactPhone: string;
  email: string;
  rating: string;
  balanceDue: number;
}

export interface FollowUp {
  id: string;
  date: string;
  time: string;
  type: string; // e.g. Call, WhatsApp, Email, Visit
  priority: 'Low' | 'Medium' | 'High';
  remarks: string;
  assignedTo: string;
  status: 'Pending' | 'Completed';
  completionDate?: string;
  completionTime?: string;
}

export interface Lead {
  id: string;
  name: string;
  mobile: string;
  email: string;
  destination: string;
  travelDate: string;
  adults: string;
  children: string;
  budget?: number;
  notes: string;
  status: 'New' | 'Contacted' | 'Proposal Sent' | 'Negotiation' | 'Won' | 'Lost' | 'Hot';
  priority: 'Low' | 'Medium' | 'High';
  assignedTo?: string;
  source?: string; // e.g. Website, WhatsApp, Referral
  tags?: string[];
  documents?: { name: string; url: string; category: string }[];
  timeline: { timestamp: string; text: string }[];
  followUpHistory: FollowUp[];
  pickupCity?: string;
  childrenAges?: string;
  vehiclePreference?: 'Sedan' | 'SUV' | 'Tempo Traveller' | string;
}

export interface TourPackage {
  id: string;
  name: string;
  destination: string;
  duration: string;
  category: string;
  price: number;
  hotelCategory: string;
  inclusions: string;
  exclusions: string;
  status: 'Active' | 'Inactive';
}

export interface QuoteItem {
  id: string;
  name: string;
  price: number;
  gst: number;
  hsn: string;
  qty: number;
  disc: number;
}

export interface Quotation {
  id: string;
  leadId?: string;
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  destination: string;
  date: string;
  items: QuoteItem[];
  gstAmount: number;
  discountAmount: number;
  totalAmount: number;
  terms: string;
  bankDetails: string;
}

export interface Booking {
  id: string;
  leadId?: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  destination: string;
  travelDate: string;
  adults: number;
  children: number;
  packagePrice: number;
  hotelDetails: string;
  driverDetails?: string;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  timeline: { timestamp: string; text: string }[];
  documents: { name: string; url: string; category: string }[];
}

export interface HotelVoucher {
  id: string;
  bookingId: string;
  customerId: string;
  guestName: string;
  guestMobile: string;
  guestEmail: string;
  hotelName: string;
  hotelAddress: string;
  hotelPhone: string;
  hotelEmail: string;
  hotelContactPerson: string;
  destination: string;
  checkInDate: string;
  checkOutDate: string;
  numNights: number;
  numRooms: number;
  roomType: string;
  mealPlan: string;
  numAdults: number;
  numChildren: number;
  numInfants: number;
  confirmationNumber: string;
  bookingStatus: 'Pending' | 'Confirmed' | 'Cancelled';
  bookingDate: string;
  voucherDate: string;
  supplierName: string;
  supplierContact: string;
  totalAmount: number;
  advancePaid: number;
  balanceAmount: number;
  paymentStatus: 'Paid' | 'Partially Paid' | 'Unpaid';
  specialRequests?: string;
  billingInstructions?: string;
  remarks?: string;
  internalNotes?: string;
}

export interface ItineraryDay {
  dayNumber: number;
  date: string;
  title: string;
  description: string;
  hotelName: string;
  meals: string[];
  transportDetails: string;
  notes?: string;
}

export interface Itinerary {
  id: string;
  bookingId: string;
  customerName: string;
  bookingNumber: string;
  destination: string;
  travelDate: string;
  days: ItineraryDay[];
}

export interface PaymentInstallment {
  id: string;
  amount: number;
  date: string;
  method: 'UPI' | 'Bank Transfer' | 'Cash' | 'Credit Card';
  referenceNo: string;
  receiptUrl?: string;
}

export interface PaymentLedger {
  id: string; // SIH-PAY-XXXX
  bookingId: string;
  customerName: string;
  totalAmount: number;
  advancePaid: number;
  balanceAmount: number;
  status: 'Paid' | 'Partially Paid' | 'Unpaid';
  installments: PaymentInstallment[];
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  username: string;
  action: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: 'Leads' | 'Quotations' | 'Bookings' | 'Vouchers' | 'Payments' | 'Fleet' | 'Other';
  message: string;
}

export interface WhatsAppLog {
  id: string;
  timestamp: string;
  customerName: string;
  mobile: string;
  templateName: string;
  messageText: string;
  sentBy: string;
}

export interface WhatsAppMessage {
  id: string;
  conversationId: string;
  sender: 'customer' | 'agent';
  senderName?: string;
  text: string;
  attachmentUrl?: string;
  attachmentType?: 'pdf' | 'image' | 'document';
  timestamp: string;
}

export interface WhatsAppConversation {
  id: string;
  customerName: string;
  mobile: string;
  unreadCount: number;
  assignedTo?: string;
  lastMessage?: string;
  lastTimestamp: string;
}

export interface ItineraryDay {
  dayNumber: number;
  title: string;
  activity: string;
  stay: string;
}

export interface Itinerary {
  id: string;
  customerName: string;
  destination: string;
  duration: string;
  days: ItineraryDay[];
  createdAt: string;
}
