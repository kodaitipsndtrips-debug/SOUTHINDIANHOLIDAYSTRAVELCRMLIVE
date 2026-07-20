export interface Itinerary {
  id: string;
  title: string;
  destination: string;
  booking_number: string | null;
  duration: string;
  customer_name: string;
  price: number;
}

export type SyncStatus = 'idle' | 'syncing' | 'failed' | 'success';

export type ResolutionStrategy = 'schema' | 'fallback' | 'filter';

export interface SyncLog {
  timestamp: string;
  type: 'info' | 'success' | 'error';
  message: string;
}

export interface TableStatus {
  name: string;
  status: 'pending' | 'success' | 'failed';
  recordCount: number;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  email: string;
  avatarColor: string;
  activeLeadsCount: number;
  password?: string;
}

export interface Lead {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  destination: string;
  pax: number;
  budget: number;
  status: 'New' | 'Contacted' | 'Proposal Sent' | 'Negotiation' | 'Converted' | 'Lost';
  assignedStaffId: string | null;
  createdDate: string;
  lastUpdated: string;
  notes?: string;
  // Upgraded WhatsApp lead parser fields
  pickupCity?: string;
  travelDate?: string;
  returnDate?: string;
  adults?: number;
  children?: number;
  rooms?: number;
  hotelPreference?: string;
  vehiclePreference?: string;
  specialRequests?: string;
  source?: string;
  leadPriority?: 'High' | 'Medium' | 'Low';
  mealPreference?: string;
  tripType?: string;
  approximateDates?: boolean;
  confidenceScore?: number;
  extractionSource?: string;
  missingFields?: string[];
  suggestedCorrections?: string;
  uncertaintyFlags?: string[];
}

export interface CompanyProfile {
  companyName: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  gstin: string;
  tagline: string;
}

export interface SystemSettings {
  defaultAssignmentStrategy: 'round_robin' | 'load_balanced' | 'manual';
  syncFrequencyMinutes: number;
  autoContactOnAssign: boolean;
  allowedDestinations: string[];
  smtpServer: string;
  smtpPort: number;
  smtpUser: string;
}

export interface DayItinerary {
  dayNumber: number;
  title: string;
  activities: string;
  stay?: string;
  meals?: string;
}

export interface DayWiseItinerary {
  id: string;
  leadId?: string;
  title: string;
  destination: string;
  duration: string;
  price?: number;
  days: DayItinerary[];
  createdDate: string;
}

