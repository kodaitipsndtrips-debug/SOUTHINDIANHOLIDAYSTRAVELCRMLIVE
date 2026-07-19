-- schema.sql
-- Production Relational Schema for LeadLine CRM Pro

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  mobile VARCHAR(100),
  email VARCHAR(255) UNIQUE,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL, -- admin, sales, operations, accountant
  status VARCHAR(50) DEFAULT 'Active', -- Active, Inactive
  last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leads Table
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
  status VARCHAR(100) NOT NULL, -- New, Contacted, Proposal Sent, Negotiation, Won, Lost, Hot
  priority VARCHAR(50) DEFAULT 'Medium', -- Low, Medium, High
  assigned_to VARCHAR(255),
  source VARCHAR(100), -- Website, WhatsApp, Referral
  tags TEXT[], -- Array of strings
  documents JSONB DEFAULT '[]', -- List of documents: {name, url, category}
  timeline JSONB DEFAULT '[]', -- History logs: {timestamp, text}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Follow-Ups Table
CREATE TABLE IF NOT EXISTS followups (
  id VARCHAR(255) PRIMARY KEY,
  date VARCHAR(100) NOT NULL,
  time VARCHAR(100),
  type VARCHAR(100) NOT NULL, -- Call, WhatsApp, Email, Visit
  priority VARCHAR(50) DEFAULT 'Medium', -- Low, Medium, High
  remarks TEXT,
  assigned_to VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'Pending', -- Pending, Completed
  completion_date VARCHAR(100),
  completion_time VARCHAR(100),
  lead_id VARCHAR(255) REFERENCES leads(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tour Packages Table
CREATE TABLE IF NOT EXISTS tour_packages (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  duration VARCHAR(255) NOT NULL, -- e.g. "3 Days / 2 Nights"
  category VARCHAR(100),
  price NUMERIC(15, 2) NOT NULL,
  hotel_category VARCHAR(100),
  inclusions TEXT,
  exclusions TEXT,
  status VARCHAR(50) DEFAULT 'Active', -- Active, Inactive
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings Table
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
  status VARCHAR(100) NOT NULL, -- Confirmed, Pending, Cancelled
  timeline JSONB DEFAULT '[]',
  documents JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hotel Vouchers Table
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

-- Itineraries Table
CREATE TABLE IF NOT EXISTS itineraries (
  id VARCHAR(255) PRIMARY KEY,
  booking_id VARCHAR(255) REFERENCES bookings(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  booking_number VARCHAR(100) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  travel_date VARCHAR(100) NOT NULL,
  days JSONB DEFAULT '[]', -- Array of itinerary days
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment Ledgers Table
CREATE TABLE IF NOT EXISTS payment_ledgers (
  id VARCHAR(255) PRIMARY KEY,
  booking_id VARCHAR(255) UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  total_amount NUMERIC(15, 2) DEFAULT 0,
  advance_paid NUMERIC(15, 2) DEFAULT 0,
  balance_amount NUMERIC(15, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'Unpaid', -- Paid, Partially Paid, Unpaid
  installments JSONB DEFAULT '[]', -- Payment installments details
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenses Table
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

-- Hotels Table
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

-- Drivers Table
CREATE TABLE IF NOT EXISTS drivers (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  mobile VARCHAR(100) NOT NULL,
  vehicle_type VARCHAR(100),
  vehicle_no VARCHAR(100),
  status VARCHAR(100) DEFAULT 'Available', -- Available, On Trip, Maintenance
  rating VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL, -- Transport, Hotel, Activities, Other
  contact_person VARCHAR(255),
  contact_phone VARCHAR(100),
  email VARCHAR(255),
  rating VARCHAR(50),
  balance_due NUMERIC(15, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Company / System Settings Table
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

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id VARCHAR(255) PRIMARY KEY,
  timestamp VARCHAR(100) NOT NULL,
  username VARCHAR(100) NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- WhatsApp Conversations Table
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

-- WhatsApp Messages Table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id VARCHAR(255) PRIMARY KEY,
  conversation_id VARCHAR(255) REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  sender VARCHAR(50) NOT NULL, -- customer, agent
  sender_name VARCHAR(255),
  text TEXT,
  attachment_url TEXT,
  attachment_type VARCHAR(50), -- pdf, image, document
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quotations Table
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
  status VARCHAR(100) DEFAULT 'Draft', -- Draft, Sent, Approved, Declined
  quotation_number VARCHAR(100) UNIQUE,
  pdf_path TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quotation Line Items Table
CREATE TABLE IF NOT EXISTS quotation_items (
  id VARCHAR(255) PRIMARY KEY,
  quotation_id VARCHAR(255) REFERENCES quotations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hsn VARCHAR(100) DEFAULT '9985',
  qty INT DEFAULT 1,
  rate NUMERIC(15, 2) NOT NULL,
  gst NUMERIC(5, 2) DEFAULT 5.00
);

-- Create performance Indexes
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_followups_date ON followups(date);
CREATE INDEX IF NOT EXISTS idx_followups_status ON followups(status);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_mobile ON whatsapp_conversations(mobile);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation ON whatsapp_messages(conversation_id);
