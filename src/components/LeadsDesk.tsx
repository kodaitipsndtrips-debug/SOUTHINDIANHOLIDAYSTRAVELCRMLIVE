import React, { useState } from 'react';
import { 
  Activity, 
  Plus, 
  Filter, 
  User, 
  MapPin, 
  Users, 
  Coins, 
  Clock, 
  Phone, 
  Mail, 
  UserCheck, 
  Check,
  MessageSquare,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Lead, Staff } from '../types';
import { INITIAL_LEADS, INITIAL_STAFF } from '../data';
import { offlineHeuristicParse } from '../utils/whatsappParser';

interface LeadsDeskProps {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  staff: Staff[];
  setStaff: React.Dispatch<React.SetStateAction<Staff[]>>;
  addLog: (message: string, type: 'info' | 'success' | 'error') => void;
}

export default function LeadsDesk({ leads, setLeads, staff, setStaff, addLog }: LeadsDeskProps) {
  // Localized Leads Desk state
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>("LD-2026-041");
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [assignmentSuccess, setAssignmentSuccess] = useState<string | null>(null);

  // Create Lead Modal Form State
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadDest, setNewLeadDest] = useState('Munnar, Kerala');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadBudget, setNewLeadBudget] = useState(35000);
  const [newLeadNotes, setNewLeadNotes] = useState('');
  const [newLeadPax, setNewLeadPax] = useState(2);

  // Additional Extracted Fields States
  const [newLeadPickupCity, setNewLeadPickupCity] = useState('Cochin / Kochi');
  const [newLeadTravelDate, setNewLeadTravelDate] = useState('');
  const [newLeadReturnDate, setNewLeadReturnDate] = useState('');
  const [newLeadAdults, setNewLeadAdults] = useState(2);
  const [newLeadChildren, setNewLeadChildren] = useState(0);
  const [newLeadRooms, setNewLeadRooms] = useState(1);
  const [newLeadHotelPref, setNewLeadHotelPref] = useState('Standard 3-Star');
  const [newLeadVehiclePref, setNewLeadVehiclePref] = useState('Sedan (Dzire/Etios)');
  const [newLeadSpecialRequests, setNewLeadSpecialRequests] = useState('');
  const [newLeadSource, setNewLeadSource] = useState('WhatsApp');
  const [newLeadPriority, setNewLeadPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

  // Upgraded travel CRM metadata
  const [newLeadMealPref, setNewLeadMealPref] = useState('Not Specified');
  const [newLeadTripType, setNewLeadTripType] = useState('Family');
  const [newLeadApproximateDates, setNewLeadApproximateDates] = useState(false);
  const [newLeadConfidenceScore, setNewLeadConfidenceScore] = useState<number | undefined>(undefined);
  const [newLeadExtractionSource, setNewLeadExtractionSource] = useState('Manual Entry');
  const [newLeadMissingFields, setNewLeadMissingFields] = useState<string[]>([]);
  const [newLeadSuggestedCorrections, setNewLeadSuggestedCorrections] = useState('');
  const [newLeadUncertaintyFlags, setNewLeadUncertaintyFlags] = useState<string[]>([]);

  // Duplicate detection state
  const [duplicateLeadFound, setDuplicateLeadFound] = useState<Lead | null>(null);
  const [showDuplicateWarningModal, setShowDuplicateWarningModal] = useState(false);
  const [pendingLeadToCreate, setPendingLeadToCreate] = useState<Lead | null>(null);

  // WhatsApp Parsing States
  const [modalTab, setModalTab] = useState<'manual' | 'whatsapp'>('manual');
  const [whatsappText, setWhatsappText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseStatus, setParseStatus] = useState<{ type: 'none' | 'success' | 'warning'; msg: string | null }>({ type: 'none', msg: null });

  const currentLead = leads.find(l => l.id === selectedLeadId);
  const assignedStaff = currentLead ? staff.find(s => s.id === currentLead.assignedStaffId) : undefined;

  // Assign staff handler
  const handleAssignStaff = (leadId: string, staffId: string | null) => {
    const prevLead = leads.find(l => l.id === leadId);
    if (!prevLead) return;
    const oldStaffId = prevLead.assignedStaffId;

    setLeads(prevLeads => prevLeads.map(lead => {
      if (lead.id === leadId) {
        return {
          ...lead,
          assignedStaffId: staffId,
          lastUpdated: new Date().toLocaleDateString('en-CA'), // current local date format e.g. 2026-07-20
          status: lead.status === 'New' && staffId ? 'Contacted' : lead.status
        };
      }
      return lead;
    }));

    // Update staff workload count
    setStaff(prevStaff => prevStaff.map(s => {
      let count = s.activeLeadsCount;
      if (s.id === staffId && oldStaffId !== staffId) {
        count += 1;
      }
      if (s.id === oldStaffId && oldStaffId !== staffId) {
        count = Math.max(0, count - 1);
      }
      return { ...s, activeLeadsCount: count };
    }));

    const staffMember = staff.find(s => s.id === staffId);
    if (staffMember) {
      setAssignmentSuccess(`Successfully assigned ${staffMember.name} to Lead ${leadId}!`);
      setTimeout(() => setAssignmentSuccess(null), 4000);
      addLog(`[Leads Assignment] Assigned lead "${prevLead.customerName}" (${leadId}) to specialist "${staffMember.name}"`, 'success');
    } else {
      setAssignmentSuccess(`Lead ${leadId} set to Unassigned.`);
      setTimeout(() => setAssignmentSuccess(null), 4000);
      addLog(`[Leads Assignment] Set lead ${leadId} to Unassigned`, 'info');
    }
  };

  // Update status handler
  const handleUpdateLeadStatus = (leadId: string, newStatus: Lead['status']) => {
    setLeads(prevLeads => prevLeads.map(lead => {
      if (lead.id === leadId) {
        return {
          ...lead,
          status: newStatus,
          lastUpdated: new Date().toLocaleDateString('en-CA')
        };
      }
      return lead;
    }));
    
    addLog(`[Leads Desk] Lead ${leadId} status updated to "${newStatus}"`, 'info');
  };

  // Reset form helper
  const resetForm = () => {
    setNewLeadName('');
    setNewLeadPhone('');
    setNewLeadEmail('');
    setNewLeadNotes('');
    setNewLeadPax(2);
    setNewLeadPickupCity('Cochin / Kochi');
    setNewLeadTravelDate('');
    setNewLeadReturnDate('');
    setNewLeadAdults(2);
    setNewLeadChildren(0);
    setNewLeadRooms(1);
    setNewLeadHotelPref('Standard 3-Star');
    setNewLeadVehiclePref('Sedan (Dzire/Etios)');
    setNewLeadSpecialRequests('');
    setNewLeadSource('WhatsApp');
    setNewLeadPriority('Medium');
    setWhatsappText('');
    setParseStatus({ type: 'none', msg: null });
    setNewLeadMealPref('Not Specified');
    setNewLeadTripType('Family');
    setNewLeadApproximateDates(false);
    setNewLeadConfidenceScore(undefined);
    setNewLeadExtractionSource('Manual Entry');
    setNewLeadMissingFields([]);
    setNewLeadSuggestedCorrections('');
    setNewLeadUncertaintyFlags([]);
  };

  // Merge duplicate lead handler
  const handleMergeDuplicate = () => {
    if (!duplicateLeadFound || !pendingLeadToCreate) return;
    
    const mergedId = duplicateLeadFound.id;
    
    setLeads(prevLeads => prevLeads.map(l => {
      if (l.id === mergedId) {
        return {
          ...l,
          // Merge details
          pax: pendingLeadToCreate.pax || l.pax,
          budget: pendingLeadToCreate.budget || l.budget,
          destination: pendingLeadToCreate.destination || l.destination,
          pickupCity: pendingLeadToCreate.pickupCity || l.pickupCity,
          travelDate: pendingLeadToCreate.travelDate || l.travelDate,
          returnDate: pendingLeadToCreate.returnDate || l.returnDate,
          adults: pendingLeadToCreate.adults || l.adults,
          children: pendingLeadToCreate.children || l.children,
          rooms: pendingLeadToCreate.rooms || l.rooms,
          hotelPreference: pendingLeadToCreate.hotelPreference || l.hotelPreference,
          vehiclePreference: pendingLeadToCreate.vehiclePreference || l.vehiclePreference,
          mealPreference: pendingLeadToCreate.mealPreference || l.mealPreference,
          tripType: pendingLeadToCreate.tripType || l.tripType,
          approximateDates: pendingLeadToCreate.approximateDates ?? l.approximateDates,
          confidenceScore: pendingLeadToCreate.confidenceScore ?? l.confidenceScore,
          extractionSource: pendingLeadToCreate.extractionSource || l.extractionSource,
          specialRequests: [l.specialRequests, pendingLeadToCreate.specialRequests].filter(Boolean).join(". "),
          notes: `[Merged Update ${new Date().toLocaleDateString('en-CA')}]: ${pendingLeadToCreate.notes}\n\nOriginal Notes:\n${l.notes}`,
          lastUpdated: new Date().toLocaleDateString('en-CA')
        };
      }
      return l;
    }));
    
    setSelectedLeadId(mergedId);
    setShowDuplicateWarningModal(false);
    setShowAddLeadModal(false);
    resetForm();
    addLog(`[Duplicate Resolver] Merged new inquiry into existing lead for "${duplicateLeadFound.customerName}" (${mergedId})`, 'success');
  };

  // Force create new lead handler
  const handleForceCreateLead = () => {
    if (!pendingLeadToCreate) return;
    setLeads([pendingLeadToCreate, ...leads]);
    setSelectedLeadId(pendingLeadToCreate.id);
    setShowDuplicateWarningModal(false);
    setShowAddLeadModal(false);
    resetForm();
    addLog(`[Duplicate Resolver] Force created separate new lead for "${pendingLeadToCreate.customerName}" (${pendingLeadToCreate.id})`, 'success');
  };

  // Create lead form handler
  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim()) return;

    // VALIDATIONS & CORRECTIONS
    let validatedTravelDate = newLeadTravelDate;
    let validatedReturnDate = newLeadReturnDate;
    let correctionMsg = "";

    // 1. Check reversed dates
    if (newLeadTravelDate && newLeadReturnDate) {
      const travelTime = new Date(newLeadTravelDate).getTime();
      const returnTime = new Date(newLeadReturnDate).getTime();
      if (returnTime < travelTime) {
        // Swap dates
        validatedTravelDate = newLeadReturnDate;
        validatedReturnDate = newLeadTravelDate;
        correctionMsg += "Corrected: Auto-swapped reversed travel/return dates. ";
      }
    }

    // 2. Validate passengers
    const validatedAdults = Math.max(1, Number(newLeadAdults));
    const validatedChildren = Math.max(0, Number(newLeadChildren));
    const validatedPax = validatedAdults + validatedChildren;

    // 3. Validate rooms
    const validatedRooms = Math.max(1, Number(newLeadRooms));

    // 4. Validate budget
    const validatedBudget = Math.max(1000, Number(newLeadBudget));

    if (correctionMsg) {
      addLog(`[Form Validator] ${correctionMsg}`, 'info');
    }

    const newId = `LD-2026-0${leads.length + 41}`;
    const newLead: Lead = {
      id: newId,
      customerName: newLeadName,
      email: newLeadEmail || `${newLeadName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      phone: newLeadPhone || '+91 99999 88888',
      destination: newLeadDest,
      pax: validatedPax,
      budget: validatedBudget,
      status: 'New',
      assignedStaffId: null,
      createdDate: new Date().toLocaleDateString('en-CA'),
      lastUpdated: new Date().toLocaleDateString('en-CA'),
      notes: newLeadNotes || "Requires a customized itinerary plan and local travel quote recommendations.",
      pickupCity: newLeadPickupCity,
      travelDate: validatedTravelDate,
      returnDate: validatedReturnDate,
      adults: validatedAdults,
      children: validatedChildren,
      rooms: validatedRooms,
      hotelPreference: newLeadHotelPref,
      vehiclePreference: newLeadVehiclePref,
      specialRequests: newLeadSpecialRequests,
      source: newLeadSource,
      leadPriority: newLeadPriority,
      // Advanced travel fields
      mealPreference: newLeadMealPref,
      tripType: newLeadTripType,
      approximateDates: newLeadApproximateDates,
      confidenceScore: newLeadConfidenceScore,
      extractionSource: newLeadExtractionSource,
      missingFields: newLeadMissingFields,
      suggestedCorrections: [newLeadSuggestedCorrections, correctionMsg].filter(Boolean).join(" "),
      uncertaintyFlags: newLeadUncertaintyFlags
    };

    // DUPLICATE DETECTION CHECK
    const normalizedPhone = (newLeadPhone || '').replace(/[^\d]/g, '').slice(-10);
    const normalizedEmail = (newLeadEmail || '').trim().toLowerCase();
    const normalizedName = (newLeadName || '').trim().toLowerCase();

    const duplicate = leads.find(l => {
      // 1. Match phone number (last 10 digits check)
      const existingPhone = (l.phone || '').replace(/[^\d]/g, '').slice(-10);
      if (normalizedPhone && existingPhone && normalizedPhone === existingPhone) {
        return true;
      }
      // 2. Match email (excluding generated emails)
      const existingEmail = (l.email || '').trim().toLowerCase();
      const isDefaultEmail = existingEmail.includes(l.customerName.toLowerCase().replace(/\s+/g, '')) && existingEmail.includes('gmail.com');
      const isNewDefaultEmail = normalizedEmail.includes(newLeadName.toLowerCase().replace(/\s+/g, '')) && normalizedEmail.includes('gmail.com');
      if (normalizedEmail && existingEmail && !isDefaultEmail && !isNewDefaultEmail && normalizedEmail === existingEmail) {
        return true;
      }
      // 3. Exact matching on names
      if (normalizedName && l.customerName.trim().toLowerCase() === normalizedName) {
        return true;
      }
      return false;
    });

    if (duplicate) {
      setPendingLeadToCreate(newLead);
      setDuplicateLeadFound(duplicate);
      setShowDuplicateWarningModal(true);
      addLog(`[Duplicate Sentinel] Warning: Highly probable duplicate of "${duplicate.customerName}" detected. Prompting user.`, 'error');
    } else {
      setLeads([newLead, ...leads]);
      setSelectedLeadId(newId);
      setShowAddLeadModal(false);
      resetForm();
      addLog(`[Leads Desk] Created new travel lead for "${newLeadName}" heading to "${newLeadDest}" (${newId})`, 'success');
    }
  };

  // WhatsApp Chat parsing handler
  const handleParseWhatsapp = async () => {
    if (!whatsappText.trim()) return;
    setIsParsing(true);
    setParseStatus({ type: 'none', msg: null });

    try {
      const response = await fetch('/api/parse-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: whatsappText }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        const { 
          customerName, phone, email, destination, pickupCity,
          travelDate, returnDate, adults, children, rooms, pax, budget, 
          hotelPreference, vehiclePreference, specialRequests, source, leadPriority, notes,
          mealPreference, tripType, approximateDates, confidenceScore,
          extractionSource, missingFields, suggestedCorrections, uncertaintyFlags
        } = result.data;

        setNewLeadName(customerName || '');
        setNewLeadPhone(phone || '');
        setNewLeadEmail(email || '');
        setNewLeadDest(destination || 'Munnar, Kerala');
        setNewLeadPickupCity(pickupCity || 'Cochin / Kochi');
        setNewLeadTravelDate(travelDate || '');
        setNewLeadReturnDate(returnDate || '');
        setNewLeadAdults(adults ?? 2);
        setNewLeadChildren(children ?? 0);
        setNewLeadRooms(rooms ?? 1);
        setNewLeadPax(pax ?? 2);
        setNewLeadBudget(budget ?? 35000);
        setNewLeadHotelPref(hotelPreference || 'Standard 3-Star');
        setNewLeadVehiclePref(vehiclePreference || 'Sedan (Dzire/Etios)');
        setNewLeadSpecialRequests(specialRequests || '');
        setNewLeadSource(source || 'WhatsApp');
        setNewLeadPriority(leadPriority || 'Medium');
        setNewLeadNotes(notes || '');

        // Set advanced travel metadata
        setNewLeadMealPref(mealPreference || 'Not Specified');
        setNewLeadTripType(tripType || 'Family');
        setNewLeadApproximateDates(!!approximateDates);
        setNewLeadConfidenceScore(confidenceScore ?? 85);
        setNewLeadExtractionSource(extractionSource || 'AI (Gemini 3.5 Flash)');
        setNewLeadMissingFields(missingFields || []);
        setNewLeadSuggestedCorrections(suggestedCorrections || '');
        setNewLeadUncertaintyFlags(uncertaintyFlags || []);
        
        setParseStatus({
          type: 'success',
          msg: `AI extracted successfully! Self-assessed Confidence: ${confidenceScore ?? 85}%. Source: ${extractionSource || 'AI'}`
        });
        addLog(`[WhatsApp Parser] AI extraction success for "${customerName || 'Inquiry'}" with ${confidenceScore ?? 85}% confidence level. (Duration: ${result.durationMs || 0}ms)`, 'success');
      } else {
        // Fallback internally on client-side
        const fallbackData = offlineHeuristicParse(whatsappText);
        setNewLeadName(fallbackData.customerName);
        setNewLeadPhone(fallbackData.phone);
        setNewLeadEmail(fallbackData.email);
        setNewLeadDest(fallbackData.destination);
        setNewLeadPickupCity(fallbackData.pickupCity);
        setNewLeadTravelDate(fallbackData.travelDate);
        setNewLeadReturnDate(fallbackData.returnDate);
        setNewLeadAdults(fallbackData.adults);
        setNewLeadChildren(fallbackData.children);
        setNewLeadRooms(fallbackData.rooms);
        setNewLeadPax(fallbackData.pax);
        setNewLeadBudget(fallbackData.budget);
        setNewLeadHotelPref(fallbackData.hotelPreference);
        setNewLeadVehiclePref(fallbackData.vehiclePreference);
        setNewLeadSpecialRequests(fallbackData.specialRequests);
        setNewLeadSource(fallbackData.source);
        setNewLeadPriority(fallbackData.leadPriority);
        setNewLeadNotes(fallbackData.notes);

        // Fallback metadata
        setNewLeadMealPref(fallbackData.mealPreference);
        setNewLeadTripType(fallbackData.tripType);
        setNewLeadApproximateDates(fallbackData.approximateDates);
        setNewLeadConfidenceScore(fallbackData.confidenceScore);
        setNewLeadExtractionSource(fallbackData.extractionSource);
        setNewLeadMissingFields(fallbackData.missingFields);
        setNewLeadSuggestedCorrections(fallbackData.suggestedCorrections);
        setNewLeadUncertaintyFlags(fallbackData.uncertaintyFlags);

        setParseStatus({
          type: 'warning',
          msg: 'AI service is temporarily unavailable. A draft lead has been created using Offline Heuristics.'
        });
        addLog(`[WhatsApp Parser] AI failed (${result.error || 'Connection error'}). Falling back to Offline Heuristic Engine. Confidence: ${fallbackData.confidenceScore}%`, 'error');
      }
    } catch (error: any) {
      console.warn("WhatsApp parse request failed, running offline heuristic:", error);
      // Fallback internally on client-side
      const fallbackData = offlineHeuristicParse(whatsappText);
      setNewLeadName(fallbackData.customerName);
      setNewLeadPhone(fallbackData.phone);
      setNewLeadEmail(fallbackData.email);
      setNewLeadDest(fallbackData.destination);
      setNewLeadPickupCity(fallbackData.pickupCity);
      setNewLeadTravelDate(fallbackData.travelDate);
      setNewLeadReturnDate(fallbackData.returnDate);
      setNewLeadAdults(fallbackData.adults);
      setNewLeadChildren(fallbackData.children);
      setNewLeadRooms(fallbackData.rooms);
      setNewLeadPax(fallbackData.pax);
      setNewLeadBudget(fallbackData.budget);
      setNewLeadHotelPref(fallbackData.hotelPreference);
      setNewLeadVehiclePref(fallbackData.vehiclePreference);
      setNewLeadSpecialRequests(fallbackData.specialRequests);
      setNewLeadSource(fallbackData.source);
      setNewLeadPriority(fallbackData.leadPriority);
      setNewLeadNotes(fallbackData.notes);

      // Fallback metadata
      setNewLeadMealPref(fallbackData.mealPreference);
      setNewLeadTripType(fallbackData.tripType);
      setNewLeadApproximateDates(fallbackData.approximateDates);
      setNewLeadConfidenceScore(fallbackData.confidenceScore);
      setNewLeadExtractionSource(fallbackData.extractionSource);
      setNewLeadMissingFields(fallbackData.missingFields);
      setNewLeadSuggestedCorrections(fallbackData.suggestedCorrections);
      setNewLeadUncertaintyFlags(fallbackData.uncertaintyFlags);

      setParseStatus({
        type: 'warning',
        msg: 'AI service is temporarily unavailable. A draft lead has been created using Offline Heuristics.'
      });
      addLog(`[WhatsApp Parser] AI failed: ${error.message || 'Connection Error'}. Triggered offline heuristic parsing. Confidence: ${fallbackData.confidenceScore}%`, 'error');
    } finally {
      setIsParsing(false);
      setModalTab('manual'); // Switch to manual tab to let them review and submit!
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section with add button and filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/20 border border-slate-900 rounded-xl p-5 shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-teal-400" />
            <span>Travel Inquiry & Lead Routing Desk</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage active incoming holiday leads, assign specialized destination consultants, and route inquiries in real-time.
          </p>
        </div>
        <button
          id="add-inquiry-btn"
          onClick={() => setShowAddLeadModal(true)}
          className="flex items-center justify-center gap-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 px-4 py-2 rounded-lg text-xs font-semibold shadow-md hover:shadow-teal-500/20 transition-all font-mono self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>LOG NEW INQUIRY</span>
        </button>
      </div>

      {/* Filtering bar and counts */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-950 border border-slate-900/60 p-2 rounded-xl">
        <span className="text-xs font-mono text-slate-500 px-2 flex items-center gap-1">
          <Filter className="h-3.5 w-3.5 text-slate-500" />
          Filter Status:
        </span>
        {['All', 'New', 'Contacted', 'Proposal Sent', 'Negotiation', 'Converted', 'Lost'].map((status) => {
          const count = status === 'All' 
            ? leads.length 
            : leads.filter(l => l.status === status).length;
          const isSelected = filterStatus === status;
          return (
            <button
              key={status}
              onClick={() => {
                setFilterStatus(status);
                const filtered = status === 'All' ? leads : leads.filter(l => l.status === status);
                if (filtered.length > 0 && !filtered.some(l => l.id === selectedLeadId)) {
                  setSelectedLeadId(filtered[0].id);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${isSelected ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'}`}
            >
              <span>{status}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold font-mono ${isSelected ? 'bg-teal-500/25 text-teal-300' : 'bg-slate-900 text-slate-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Leads List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="text-xs font-mono text-slate-500 flex items-center justify-between px-1">
            <span>Active Inquiries ({leads.filter(l => filterStatus === 'All' ? true : l.status === filterStatus).length})</span>
            <span>Click on a lead to edit or assign consultant</span>
          </div>

          <div className="space-y-3.5 max-h-[640px] overflow-y-auto pr-2 custom-scrollbar">
            {leads.filter(lead => filterStatus === 'All' ? true : lead.status === filterStatus).length === 0 ? (
              <div className="border border-dashed border-slate-900 rounded-xl p-12 text-center text-slate-500 bg-slate-950/40">
                <User className="h-8 w-8 mx-auto text-slate-700 mb-3 animate-pulse" />
                <p className="text-sm font-medium text-slate-400">No inquiries found</p>
                <p className="text-xs text-slate-600 mt-1">Select other filters or log a new traveler inquiry.</p>
              </div>
            ) : (
              leads
                .filter(lead => filterStatus === 'All' ? true : lead.status === filterStatus)
                .map(lead => {
                  const isSelected = selectedLeadId === lead.id;
                  const assignedStaff = staff.find(s => s.id === lead.assignedStaffId);
                  
                  let statusPill = "";
                  if (lead.status === 'New') statusPill = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
                  else if (lead.status === 'Contacted') statusPill = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                  else if (lead.status === 'Proposal Sent') statusPill = "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
                  else if (lead.status === 'Negotiation') statusPill = "bg-teal-500/10 text-teal-400 border border-teal-500/20";
                  else if (lead.status === 'Converted') statusPill = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                  else if (lead.status === 'Lost') statusPill = "bg-rose-500/10 text-rose-400 border border-rose-500/20";

                  return (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLeadId(lead.id)}
                      className={`p-4 rounded-xl text-left border transition-all cursor-pointer relative overflow-hidden group ${isSelected ? 'bg-slate-900/60 border-teal-500/50 shadow-md ring-1 ring-teal-500/15' : 'bg-slate-950/60 border-slate-900 hover:border-slate-800 hover:bg-slate-950/90'}`}
                    >
                      {isSelected && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-teal-500 to-emerald-500" />
                      )}

                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase bg-slate-900 text-slate-500 px-2 py-0.5 rounded border border-slate-800 font-semibold">
                            {lead.id}
                          </span>
                          <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-600" />
                            {lead.createdDate}
                          </span>
                        </div>
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${statusPill}`}>
                          {lead.status}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-sm text-slate-200 group-hover:text-white transition-colors">
                            {lead.customerName}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-teal-400" />
                              {lead.destination}
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="flex items-center gap-1 font-mono">
                              <Users className="h-3.5 w-3.5 text-slate-500" />
                              {lead.pax} pax
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="flex items-center gap-1 font-mono text-emerald-400 font-semibold">
                              ₹{(lead.budget ?? 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2 bg-slate-900/60 border border-slate-900 px-3 py-2 rounded-lg">
                          {assignedStaff ? (
                            <>
                              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ${assignedStaff.avatarColor}`}>
                                {assignedStaff.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div className="text-left">
                                <div className="text-[10px] text-slate-500 uppercase font-mono font-bold tracking-wider">Assigned Staff</div>
                                <div className="text-xs font-semibold text-slate-300">{assignedStaff.name}</div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="h-6 w-6 rounded-full bg-slate-950 border border-dashed border-amber-500/40 flex items-center justify-center text-amber-500 shadow-sm animate-pulse">
                                ⚠️
                              </div>
                              <div className="text-left">
                                <div className="text-[10px] text-amber-500 uppercase font-mono font-bold tracking-wider animate-pulse">Unassigned</div>
                                <div className="text-[11px] text-slate-400 italic">Needs staff</div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Right Side: Detailing Pane and Assignment Panel */}
        <div className="lg:col-span-5 space-y-6">
          {!currentLead ? (
            <div className="bg-slate-900/10 border border-slate-900 rounded-xl p-8 text-center text-slate-500 h-full flex flex-col justify-center items-center min-h-[300px]">
              <UserCheck className="h-8 w-8 text-slate-700 mb-2" />
              <p className="text-sm font-semibold">No inquiry selected</p>
              <p className="text-xs text-slate-600 mt-1 max-w-xs">Select a customer lead from the list on the left to assign staff or track quotation status.</p>
            </div>
          ) : (
              <div className="space-y-6">
                
                {/* Assignment Success Alert banner */}
                <AnimatePresence>
                  {assignmentSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold px-4 py-3 rounded-xl flex items-center gap-3 shadow-lg"
                    >
                      <UserCheck className="h-5 w-5 text-emerald-400 animate-bounce" />
                      <span className="flex-1">{assignmentSuccess}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Customer File Card */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 space-y-4 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <div>
                      <span className="text-[10px] font-mono text-teal-400 font-bold bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">{currentLead.id}</span>
                      <h3 className="font-bold text-white text-base mt-1.5">{currentLead.customerName}</h3>
                    </div>
                    
                    {/* In-Line Status Picker */}
                    <div className="text-right">
                      <label className="block text-[9px] font-mono text-slate-500 uppercase tracking-widest font-bold mb-1">Lead Status</label>
                      <select
                        value={currentLead.status}
                        onChange={(e) => handleUpdateLeadStatus(currentLead.id, e.target.value as any)}
                        className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-teal-500/50 font-semibold cursor-pointer"
                      >
                        {['New', 'Contacted', 'Proposal Sent', 'Negotiation', 'Converted', 'Lost'].map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1 text-left">
                      <span className="text-slate-500 font-mono text-[10px] block uppercase tracking-wider">Contact Phone</span>
                      <span className="text-slate-200 font-medium flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-600" />
                        {currentLead.phone}
                      </span>
                    </div>
                    <div className="space-y-1 text-left">
                      <span className="text-slate-500 font-mono text-[10px] block uppercase tracking-wider">Email Address</span>
                      <span className="text-slate-200 font-medium flex items-center gap-1.5 truncate max-w-[160px]" title={currentLead.email}>
                        <Mail className="h-3.5 w-3.5 text-slate-600" />
                        {currentLead.email}
                      </span>
                    </div>
                    <div className="space-y-1 text-left">
                      <span className="text-slate-500 font-mono text-[10px] block uppercase tracking-wider">Travel Route</span>
                      <span className="text-slate-200 font-medium flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-teal-400" />
                        {currentLead.destination}
                      </span>
                    </div>
                    <div className="space-y-1 text-left">
                      <span className="text-slate-500 font-mono text-[10px] block uppercase tracking-wider">Inquiry Budget</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5 font-mono">
                        <Coins className="h-3.5 w-3.5 text-emerald-500" />
                        ₹{(currentLead.budget ?? 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-slate-900/60 pt-3 text-left">
                    <span className="text-slate-500 font-mono text-[10px] block uppercase tracking-wider font-bold">Special Requests & Full Chat Notes</span>
                    <div className="text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-900 leading-relaxed font-sans italic">
                      &ldquo;{currentLead.notes}&rdquo;
                    </div>
                  </div>

                  {/* Upgraded WhatsApp Extraction Metadata Grid */}
                  <div className="border-t border-slate-900/60 pt-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-mono text-[10px] uppercase tracking-wider font-bold">Extracted Lead Insights</span>
                      {currentLead.confidenceScore !== undefined && (
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono text-slate-500">CONFIDENCE:</span>
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${currentLead.confidenceScore >= 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : currentLead.confidenceScore >= 50 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                            {currentLead.confidenceScore}% ({currentLead.extractionSource || 'AI'})
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] font-sans">
                      {currentLead.pickupCity && (
                        <div className="bg-slate-950/40 border border-slate-900 p-2 rounded-lg text-left">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">Pickup Point</span>
                          <span className="text-slate-200 font-medium">{currentLead.pickupCity}</span>
                        </div>
                      )}
                      {(currentLead.travelDate || currentLead.returnDate) && (
                        <div className="bg-slate-950/40 border border-slate-900 p-2 rounded-lg text-left col-span-2">
                          <span className="text-[9px] font-mono text-slate-500 uppercase flex items-center justify-between">
                            <span>Travel Schedule</span>
                            {currentLead.approximateDates && <span className="text-amber-400 text-[8px] font-mono font-bold">[FLEXIBLE]</span>}
                          </span>
                          <span className="text-slate-200 font-medium">
                            {currentLead.travelDate || 'Pending'} to {currentLead.returnDate || 'Pending'}
                          </span>
                        </div>
                      )}
                      {currentLead.adults !== undefined && (
                        <div className="bg-slate-950/40 border border-slate-900 p-2 rounded-lg text-left">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">Travelers</span>
                          <span className="text-slate-200 font-medium">
                            {currentLead.adults} Adults {currentLead.children ? `, ${currentLead.children} Child` : ''}
                          </span>
                        </div>
                      )}
                      {currentLead.rooms !== undefined && (
                        <div className="bg-slate-950/40 border border-slate-900 p-2 rounded-lg text-left">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">Rooms Required</span>
                          <span className="text-slate-200 font-medium">{currentLead.rooms} Room(s)</span>
                        </div>
                      )}
                      {currentLead.leadPriority && (
                        <div className="bg-slate-950/40 border border-slate-900 p-2 rounded-lg text-left">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">Inquiry Priority</span>
                          <span className={`font-bold uppercase text-[9px] px-1.5 py-0.5 rounded block text-center ${currentLead.leadPriority === 'High' ? 'text-rose-400 bg-rose-500/10' : currentLead.leadPriority === 'Low' ? 'text-slate-400 bg-slate-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                            {currentLead.leadPriority}
                          </span>
                        </div>
                      )}
                      {currentLead.hotelPreference && (
                        <div className="bg-slate-950/40 border border-slate-900 p-2 rounded-lg text-left col-span-2">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">Accommodation Choice</span>
                          <span className="text-slate-200 font-medium">{currentLead.hotelPreference}</span>
                        </div>
                      )}
                      {currentLead.vehiclePreference && (
                        <div className="bg-slate-950/40 border border-slate-900 p-2 rounded-lg text-left col-span-1">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">Cab / Transport</span>
                          <span className="text-slate-200 font-medium truncate block" title={currentLead.vehiclePreference}>
                            {currentLead.vehiclePreference}
                          </span>
                        </div>
                      )}
                      
                      {/* Added Meal Preference */}
                      {currentLead.mealPreference && currentLead.mealPreference !== 'Not Specified' && (
                        <div className="bg-slate-950/40 border border-slate-900 p-2 rounded-lg text-left col-span-1">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">Meal preference</span>
                          <span className="text-slate-200 font-medium">{currentLead.mealPreference}</span>
                        </div>
                      )}

                      {/* Added Trip Type */}
                      {currentLead.tripType && (
                        <div className="bg-slate-950/40 border border-slate-900 p-2 rounded-lg text-left col-span-1">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">Trip Category</span>
                          <span className="text-slate-200 font-medium">{currentLead.tripType}</span>
                        </div>
                      )}

                      {currentLead.specialRequests && (
                        <div className="bg-slate-950/40 border border-slate-900 p-2 rounded-lg text-left col-span-3">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block font-bold">Parsed Special Requests</span>
                          <span className="text-slate-300 italic">{currentLead.specialRequests}</span>
                        </div>
                      )}

                      {/* Warnings / Diagnostic Badges inside Lead Insights Card */}
                      {((currentLead.missingFields && currentLead.missingFields.length > 0) || 
                        (currentLead.uncertaintyFlags && currentLead.uncertaintyFlags.length > 0)) && (
                        <div className="bg-slate-950/80 border border-slate-900 p-2.5 rounded-lg text-left col-span-3 space-y-1.5">
                          {currentLead.missingFields && currentLead.missingFields.length > 0 && (
                            <div>
                              <span className="text-[9px] font-mono text-rose-400 uppercase font-bold block">Follow-up Required (Missing Fields):</span>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {currentLead.missingFields.map(f => (
                                  <span key={f} className="text-[8px] font-mono bg-rose-500/10 text-rose-300 border border-rose-500/20 px-1 py-0.5 rounded uppercase">
                                    {f}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {currentLead.uncertaintyFlags && currentLead.uncertaintyFlags.length > 0 && (
                            <div>
                              <span className="text-[9px] font-mono text-amber-400 uppercase font-bold block">Verify with Traveler (Uncertain Fields):</span>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {currentLead.uncertaintyFlags.map(f => (
                                  <span key={f} className="text-[8px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1 py-0.5 rounded uppercase">
                                    {f}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {currentLead.source && (
                        <div className="bg-slate-950/40 border border-slate-900 p-2 rounded-lg text-left col-span-3">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">Lead Source</span>
                          <span className="text-teal-400 font-semibold">{currentLead.source}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-900/40 mt-1">
                    <span>Inquiry Raised: {currentLead.createdDate}</span>
                    <span>Last Updated: {currentLead.lastUpdated}</span>
                  </div>
                </div>

                {/* Assignment Control Panel */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 space-y-4 shadow-xl text-left">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4.5 w-4.5 text-teal-400" />
                      <h3 className="font-semibold text-white text-sm">Assign Staff Specialist</h3>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">Live Load Balancing</span>
                  </div>

                  {/* Current Assignee banner */}
                  <div className="p-3 bg-slate-950/80 border border-slate-900 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {assignedStaff ? (
                        <>
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow ${assignedStaff.avatarColor}`}>
                            {assignedStaff.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">{assignedStaff.name}</div>
                            <div className="text-[10px] text-slate-500">{assignedStaff.role}</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="h-8 w-8 rounded-full bg-slate-900/60 border border-dashed border-amber-500/40 flex items-center justify-center text-amber-500 text-sm animate-pulse font-bold">
                            ?
                          </div>
                          <div>
                            <div className="text-xs font-bold text-amber-400 animate-pulse">Unassigned Lead</div>
                            <div className="text-[10px] text-slate-500">Awaiting specialist assignment</div>
                          </div>
                        </>
                      )}
                    </div>
                    {assignedStaff && (
                      <button
                        onClick={() => handleAssignStaff(currentLead.id, null)}
                        className="text-[10px] font-mono uppercase bg-rose-500/10 text-rose-400 border border-rose-500/25 px-2 py-1 rounded hover:bg-rose-500/20 transition-all font-semibold"
                      >
                        CLEAR
                      </button>
                    )}
                  </div>

                  {/* Staff Grid Selectors */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">Select travel consultant to route lead</label>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {staff.map(s => {
                        const isAssignedToThis = currentLead.assignedStaffId === s.id;
                        
                        return (
                          <div
                            key={s.id}
                            className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${isAssignedToThis ? 'bg-teal-500/5 border-teal-500/30' : 'bg-slate-950/40 border-slate-900 hover:border-slate-800 hover:bg-slate-950'}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${s.avatarColor}`}>
                                {s.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-200">{s.name}</h4>
                                <p className="text-[10px] text-slate-400">{s.role}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 font-semibold">
                                {s.activeLeadsCount} cases
                              </span>
                              
                              {isAssignedToThis ? (
                                <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-mono uppercase font-bold px-2 py-1 rounded flex items-center gap-1 shrink-0 select-none">
                                  <Check className="h-3 w-3 text-teal-400" />
                                  <span>ACTIVE</span>
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleAssignStaff(currentLead.id, s.id)}
                                  className="bg-teal-500 hover:bg-teal-400 text-slate-950 text-[10px] font-mono uppercase font-bold px-3 py-1 rounded transition-all shrink-0 shadow hover:shadow-teal-500/10"
                                >
                                  ROUTE
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

              </div>
          )}
        </div>

      </div>

      {/* ADD NEW LEAD MODAL */}
      <AnimatePresence>
        {showAddLeadModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Modal Header */}
              <div className="bg-slate-950 px-5 py-4 border-b border-slate-900 flex items-center justify-between">
                <h3 className="font-bold text-white text-xs uppercase font-mono tracking-wider flex items-center gap-2">
                  <Activity className="h-4.5 w-4.5 text-teal-400" />
                  <span>Log Travel Inquiry</span>
                </h3>
                <button 
                  onClick={() => setShowAddLeadModal(false)}
                  className="text-slate-400 hover:text-white text-xs font-mono px-2 py-1 hover:bg-slate-900 rounded border border-transparent hover:border-slate-800"
                >
                  CLOSE [X]
                </button>
              </div>

              {/* Tab Selector */}
              <div className="flex bg-slate-950/60 p-1 border-b border-slate-900/80">
                <button
                  type="button"
                  onClick={() => setModalTab('manual')}
                  className={`flex-1 py-2 text-[10px] font-mono font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 ${modalTab === 'manual' ? 'bg-slate-900 text-teal-400 shadow-sm border border-slate-800/60' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <User className="h-3.5 w-3.5" />
                  <span>1. Manual Form</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('whatsapp')}
                  className={`flex-1 py-2 text-[10px] font-mono font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 relative ${modalTab === 'whatsapp' ? 'bg-slate-900 text-teal-400 shadow-sm border border-slate-800/60' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>2. WhatsApp AI Parser</span>
                  <span className="absolute top-1 right-2 bg-teal-500/20 text-teal-300 text-[7px] px-1 rounded-full border border-teal-500/30 animate-pulse font-bold">
                    AI
                  </span>
                </button>
              </div>
              
              {/* Manual Form Tab */}
              {modalTab === 'manual' && (
                <form onSubmit={handleCreateLead} className="p-5 space-y-4 text-xs text-left overflow-y-auto max-h-[65vh] custom-scrollbar">
                  {/* Parser Status Banner */}
                  {parseStatus.msg && (
                    <div className={`p-3 rounded-xl border flex items-start gap-2.5 shadow-sm ${parseStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                      {parseStatus.type === 'success' ? (
                        <Check className="h-4.5 w-4.5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-4.5 w-4.5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                      )}
                      <div>
                        <div className="font-bold uppercase text-[9px] font-mono tracking-wide">
                          {parseStatus.type === 'success' ? 'AI Extraction Active' : 'Offline Mode Active'}
                        </div>
                        <div className="text-[11px] leading-snug mt-0.5 font-medium">{parseStatus.msg}</div>
                      </div>
                    </div>
                  )}

                  {/* Extracted Travel Diagnostics Card */}
                  {newLeadConfidenceScore !== undefined && (
                    <div className="p-3.5 bg-slate-950 border border-slate-900 rounded-xl space-y-3 shadow-md">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">AI Extraction Quality Review</span>
                        <span className="text-[9px] font-mono font-bold bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-teal-400 uppercase">
                          {newLeadExtractionSource}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">Confidence level</span>
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800/60">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${newLeadConfidenceScore >= 80 ? 'bg-emerald-500' : newLeadConfidenceScore >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                style={{ width: `${newLeadConfidenceScore}%` }}
                              />
                            </div>
                            <span className={`font-mono text-[11px] font-bold ${newLeadConfidenceScore >= 80 ? 'text-emerald-400' : newLeadConfidenceScore >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                              {newLeadConfidenceScore}%
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">Date Flexibility</span>
                          <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded block text-center ${newLeadApproximateDates ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20' : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'}`}>
                            {newLeadApproximateDates ? 'Flexible Dates' : 'Exact Selected Dates'}
                          </span>
                        </div>
                      </div>

                      {newLeadMissingFields.length > 0 && (
                        <div className="space-y-1 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                          <span className="text-[9px] font-mono text-rose-400 uppercase font-bold flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Missing Details ({newLeadMissingFields.length})</span>
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {newLeadMissingFields.map((field) => (
                              <span key={field} className="text-[8px] font-mono uppercase bg-rose-500/10 text-rose-300 border border-rose-500/20 px-1.5 py-0.5 rounded">
                                {field}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {newLeadUncertaintyFlags.length > 0 && (
                        <div className="space-y-1 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                          <span className="text-[9px] font-mono text-amber-400 uppercase font-bold flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 animate-pulse" />
                            <span>Highlighted Uncertain Fields (Please Verify)</span>
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {newLeadUncertaintyFlags.map((field) => (
                              <span key={field} className="text-[8px] font-mono uppercase bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded">
                                {field}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {newLeadSuggestedCorrections && (
                        <div className="space-y-1 bg-blue-500/5 p-2 rounded-lg border border-blue-500/10">
                          <span className="text-[9px] font-mono text-blue-400 uppercase font-bold block">Parsing Corrections / Remarks</span>
                          <p className="text-[10px] text-slate-400 leading-snug">{newLeadSuggestedCorrections}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block font-mono text-[10px] uppercase text-slate-500 font-bold flex justify-between">
                      <span>Customer Full Name *</span>
                      {newLeadUncertaintyFlags.includes('customerName') && <span className="text-amber-400 font-semibold">[!] Verify Spelling</span>}
                    </label>
                    <input
                      type="text"
                      required
                      value={newLeadName}
                      onChange={(e) => setNewLeadName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className={`w-full bg-slate-950 border rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 ${newLeadUncertaintyFlags.includes('customerName') ? 'border-amber-500/60 ring-1 ring-amber-500/20 bg-amber-500/[0.02]' : 'border-slate-800'}`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block font-mono text-[10px] uppercase text-slate-500 font-bold flex justify-between">
                        <span>Phone Number</span>
                        {newLeadUncertaintyFlags.includes('phone') && <span className="text-amber-400 font-semibold">[!] Verify Phone</span>}
                      </label>
                      <input
                        type="text"
                        value={newLeadPhone}
                        onChange={(e) => setNewLeadPhone(e.target.value)}
                        placeholder="e.g. +91 98989 12345"
                        className={`w-full bg-slate-950 border rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 ${newLeadUncertaintyFlags.includes('phone') ? 'border-amber-500/60 ring-1 ring-amber-500/20 bg-amber-500/[0.02]' : 'border-slate-800'}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-mono text-[10px] uppercase text-slate-500 font-bold flex justify-between">
                        <span>Email Address</span>
                        {newLeadUncertaintyFlags.includes('email') && <span className="text-amber-400 font-semibold">[!] Verify Email</span>}
                      </label>
                      <input
                        type="email"
                        value={newLeadEmail}
                        onChange={(e) => setNewLeadEmail(e.target.value)}
                        placeholder="e.g. ramesh@gmail.com"
                        className={`w-full bg-slate-950 border rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 ${newLeadUncertaintyFlags.includes('email') ? 'border-amber-500/60 ring-1 ring-amber-500/20 bg-amber-500/[0.02]' : 'border-slate-800'}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block font-mono text-[10px] uppercase text-slate-500 font-bold flex justify-between">
                        <span>Destination</span>
                        {newLeadUncertaintyFlags.includes('destination') && <span className="text-amber-400 font-semibold">[!] Verify Destination</span>}
                      </label>
                      <input
                        type="text"
                        list="destination-suggestions"
                        value={newLeadDest}
                        onChange={(e) => setNewLeadDest(e.target.value)}
                        placeholder="e.g. Munnar, Kerala"
                        className={`w-full bg-slate-950 border rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 text-[11px] ${newLeadUncertaintyFlags.includes('destination') ? 'border-amber-500/60 ring-1 ring-amber-500/20 bg-amber-500/[0.02]' : 'border-slate-800'}`}
                      />
                      <datalist id="destination-suggestions">
                        <option value="Munnar, Kerala" />
                        <option value="Kodaikanal, Tamil Nadu" />
                        <option value="Ooty, Tamil Nadu" />
                        <option value="Coorg, Karnataka" />
                        <option value="Wayanad, Kerala" />
                        <option value="Alleppey, Kerala" />
                        <option value="Thekkady, Kerala" />
                        <option value="Kochi, Kerala" />
                        <option value="Mysore, Karnataka" />
                        <option value="Bangalore, Karnataka" />
                        <option value="Chennai, Tamil Nadu" />
                        <option value="Madurai, Tamil Nadu" />
                        <option value="Rameswaram, Tamil Nadu" />
                        <option value="Kanyakumari, Tamil Nadu" />
                        <option value="Trivandrum, Kerala" />
                        <option value="Yercaud, Tamil Nadu" />
                        <option value="Yelagiri, Tamil Nadu" />
                        <option value="Valparai, Tamil Nadu" />
                      </datalist>
                    </div>
                    <div className="space-y-1">
                      <label className="block font-mono text-[10px] uppercase text-slate-500 font-bold flex justify-between">
                        <span>Pickup City</span>
                        {newLeadUncertaintyFlags.includes('pickupCity') && <span className="text-amber-400 font-semibold">[!] Verify Pickup</span>}
                      </label>
                      <input
                        type="text"
                        value={newLeadPickupCity}
                        onChange={(e) => setNewLeadPickupCity(e.target.value)}
                        placeholder="e.g. Cochin / Kochi"
                        className={`w-full bg-slate-950 border rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 text-[11px] ${newLeadUncertaintyFlags.includes('pickupCity') ? 'border-amber-500/60 ring-1 ring-amber-500/20 bg-amber-500/[0.02]' : 'border-slate-800'}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block font-mono text-[10px] uppercase text-slate-500 font-bold flex justify-between">
                        <span>Travel Date</span>
                        {newLeadUncertaintyFlags.includes('travelDate') && <span className="text-amber-400 font-semibold">[!] Check Date</span>}
                      </label>
                      <input
                        type="date"
                        value={newLeadTravelDate}
                        onChange={(e) => setNewLeadTravelDate(e.target.value)}
                        className={`w-full bg-slate-950 border rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 text-[11px] ${newLeadUncertaintyFlags.includes('travelDate') ? 'border-amber-500/60 ring-1 ring-amber-500/20 bg-amber-500/[0.02]' : 'border-slate-800'}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-mono text-[10px] uppercase text-slate-500 font-bold flex justify-between">
                        <span>Return Date</span>
                        {newLeadUncertaintyFlags.includes('returnDate') && <span className="text-amber-400 font-semibold">[!] Check Return</span>}
                      </label>
                      <input
                        type="date"
                        value={newLeadReturnDate}
                        onChange={(e) => setNewLeadReturnDate(e.target.value)}
                        className={`w-full bg-slate-950 border rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 text-[11px] ${newLeadUncertaintyFlags.includes('returnDate') ? 'border-amber-500/60 ring-1 ring-amber-500/20 bg-amber-500/[0.02]' : 'border-slate-800'}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="block font-mono text-[10px] uppercase text-slate-500 font-bold">Adults</label>
                      <input
                        type="number"
                        min={1}
                        value={newLeadAdults}
                        onChange={(e) => {
                          const a = Number(e.target.value);
                          setNewLeadAdults(a);
                          setNewLeadPax(a + newLeadChildren);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-teal-500/50 text-[11px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-mono text-[10px] uppercase text-slate-500 font-bold">Children</label>
                      <input
                        type="number"
                        min={0}
                        value={newLeadChildren}
                        onChange={(e) => {
                          const c = Number(e.target.value);
                          setNewLeadChildren(c);
                          setNewLeadPax(newLeadAdults + c);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-teal-500/50 text-[11px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-mono text-[10px] uppercase text-slate-500 font-bold">Rooms</label>
                      <input
                        type="number"
                        min={1}
                        value={newLeadRooms}
                        onChange={(e) => setNewLeadRooms(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-teal-500/50 text-[11px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block font-mono text-[10px] uppercase text-slate-500 font-bold">Hotel Preference</label>
                      <select
                        value={newLeadHotelPref}
                        onChange={(e) => setNewLeadHotelPref(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-teal-500/50 cursor-pointer text-[11px]"
                      >
                        <option value="Budget / Homestay">Budget / Homestay</option>
                        <option value="Standard 3-Star">Standard 3-Star</option>
                        <option value="Deluxe 4-Star">Deluxe 4-Star</option>
                        <option value="Premium 5-Star">Premium 5-Star</option>
                        <option value="Resort Stay">Resort Stay</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block font-mono text-[10px] uppercase text-slate-500 font-bold">Vehicle Preference</label>
                      <select
                        value={newLeadVehiclePref}
                        onChange={(e) => setNewLeadVehiclePref(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-teal-500/50 cursor-pointer text-[11px]"
                      >
                        <option value="Hatchback (Swift)">Hatchback (Swift)</option>
                        <option value="Sedan (Dzire/Etios)">Sedan (Dzire/Etios)</option>
                        <option value="SUV (Innova/Ertiga)">SUV (Innova/Ertiga)</option>
                        <option value="Tempo Traveler (12-17 Seater)">Tempo Traveler (12-17 Seater)</option>
                      </select>
                    </div>
                  </div>

                  {/* Meal and Trip Category Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block font-mono text-[10px] uppercase text-slate-500 font-bold">Meal Choice</label>
                      <select
                        value={newLeadMealPref}
                        onChange={(e) => setNewLeadMealPref(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-teal-500/50 cursor-pointer text-[11px]"
                      >
                        <option value="Not Specified">Not Specified</option>
                        <option value="Vegetarian">Vegetarian</option>
                        <option value="Non-Vegetarian">Non-Vegetarian</option>
                        <option value="Jain Food">Jain Food</option>
                        <option value="Breakfast Only (CP)">Breakfast Only (CP)</option>
                        <option value="Half Board (MAP)">Half Board (MAP - Breakfast + Dinner)</option>
                        <option value="Full Board (AP)">Full Board (AP - All Meals)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block font-mono text-[10px] uppercase text-slate-500 font-bold">Trip Category</label>
                      <select
                        value={newLeadTripType}
                        onChange={(e) => setNewLeadTripType(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-teal-500/50 cursor-pointer text-[11px]"
                      >
                        <option value="Family">Family</option>
                        <option value="Couple">Couple</option>
                        <option value="Honeymoon">Honeymoon</option>
                        <option value="Friends">Friends</option>
                        <option value="Corporate">Corporate</option>
                        <option value="Group">Group</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1 space-y-1">
                      <label className="block font-mono text-[10px] uppercase text-slate-500 font-bold">Source</label>
                      <input
                        type="text"
                        value={newLeadSource}
                        onChange={(e) => setNewLeadSource(e.target.value)}
                        placeholder="WhatsApp"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-teal-500/50 text-[11px]"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="block font-mono text-[10px] uppercase text-slate-500 font-bold">Priority</label>
                      <select
                        value={newLeadPriority}
                        onChange={(e) => setNewLeadPriority(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-teal-500/50 cursor-pointer text-[11px]"
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="block font-mono text-[10px] uppercase text-slate-500 font-bold flex justify-between">
                        <span>Budget (INR) *</span>
                        {newLeadUncertaintyFlags.includes('budget') && <span className="text-amber-400 font-semibold">[!] Check</span>}
                      </label>
                      <input
                        type="number"
                        required
                        value={newLeadBudget}
                        onChange={(e) => setNewLeadBudget(Number(e.target.value))}
                        className={`w-full bg-slate-950 border rounded-lg p-2 text-slate-200 focus:outline-none focus:border-teal-500/50 text-[11px] ${newLeadUncertaintyFlags.includes('budget') ? 'border-amber-500/60 ring-1 ring-amber-500/20 bg-amber-500/[0.02]' : 'border-slate-800'}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-mono text-[10px] uppercase text-slate-500 font-bold">Special Requests</label>
                    <textarea
                      value={newLeadSpecialRequests}
                      onChange={(e) => setNewLeadSpecialRequests(e.target.value)}
                      placeholder="e.g. Needs veg food, honeymoon room decoration, private guide."
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 font-sans resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-mono text-[10px] uppercase text-slate-500 font-bold">Synthesized Notes / Full Chat</label>
                    <textarea
                      value={newLeadNotes}
                      onChange={(e) => setNewLeadNotes(e.target.value)}
                      placeholder="Full summary notes generated from conversation"
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 font-sans resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-teal-500/10 transition-all uppercase tracking-wider font-mono text-center cursor-pointer"
                  >
                    SUBMIT INQUIRY TO DESK
                  </button>
                </form>
              )}

              {/* WhatsApp AI Parser Tab */}
              {modalTab === 'whatsapp' && (
                <div className="p-5 space-y-4 text-xs text-left overflow-y-auto max-h-[65vh] custom-scrollbar">
                  <div className="bg-slate-950/40 border border-slate-900 p-4 rounded-xl space-y-2">
                    <h4 className="font-semibold text-white flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-teal-400 animate-pulse" />
                      <span>WhatsApp Chat Data Extractor</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Paste a raw WhatsApp message, email query, or chat transcript below. Our secure server-side AI model will automatically extract fields like name, phone, budget, and travel wishes.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-mono text-[10px] uppercase text-slate-500 font-bold">WhatsApp Paste Block *</label>
                    <textarea
                      value={whatsappText}
                      onChange={(e) => setWhatsappText(e.target.value)}
                      placeholder="Paste WhatsApp message here... (e.g. 'Hi, Amit Verma here. We are a family of 4 looking for a 5-day Munnar Kerala packages around Oct. Our budget is 45k, contact +91 9876543210')"
                      rows={8}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 font-sans resize-none text-[11px] leading-relaxed"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isParsing || !whatsappText.trim()}
                    onClick={handleParseWhatsapp}
                    className={`w-full font-bold py-3 px-4 rounded-xl shadow-lg transition-all uppercase tracking-wider font-mono text-center flex items-center justify-center gap-2 ${isParsing ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : whatsappText.trim() ? 'bg-teal-500 hover:bg-teal-400 text-slate-950 hover:shadow-teal-500/10 cursor-pointer' : 'bg-slate-950 text-slate-600 cursor-not-allowed border border-slate-900'}`}
                  >
                    {isParsing ? (
                      <>
                        <div className="h-4 w-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                        <span>EXTRACTING DATA USING AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>RUN SECURE AI EXTRACTOR</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DUPLICATE DETECTION WARNING MODAL */}
      <AnimatePresence>
        {showDuplicateWarningModal && duplicateLeadFound && pendingLeadToCreate && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 text-left custom-scrollbar"
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center text-amber-400 shrink-0 animate-pulse">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-white text-base font-sans tracking-wide">Probable Duplicate Detected</h3>
                  <p className="text-xs text-slate-400">An active lead with matching contact coordinates already exists in LeadLine CRM Pro.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                {/* Incoming Draft */}
                <div className="p-3 bg-slate-950/60 border border-slate-900 rounded-xl space-y-2">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block font-bold text-slate-500">New Inquiry Draft</span>
                  <div className="space-y-1">
                    <div className="font-bold text-slate-200">{pendingLeadToCreate.customerName}</div>
                    <div className="text-slate-400 text-[11px]">{pendingLeadToCreate.phone}</div>
                    <div className="text-slate-400 text-[11px] truncate" title={pendingLeadToCreate.email}>{pendingLeadToCreate.email}</div>
                    <div className="text-teal-400 font-medium text-[11px]">{pendingLeadToCreate.destination}</div>
                    <div className="text-emerald-400 font-mono font-bold text-[11px]">₹{pendingLeadToCreate.budget.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                {/* Existing Lead */}
                <div className="p-3 bg-teal-500/[0.02] border border-teal-500/10 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-teal-400 uppercase tracking-wider block font-bold text-teal-500">Existing Record</span>
                    <span className="text-[9px] font-mono text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20 font-bold">{duplicateLeadFound.id}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-slate-200">{duplicateLeadFound.customerName}</div>
                    <div className="text-slate-400 text-[11px]">{duplicateLeadFound.phone}</div>
                    <div className="text-slate-400 text-[11px] truncate" title={duplicateLeadFound.email}>{duplicateLeadFound.email}</div>
                    <div className="text-teal-400 font-medium text-[11px]">{duplicateLeadFound.destination}</div>
                    <div className="text-xs font-semibold text-slate-400">
                      Status: <span className="text-amber-400">{duplicateLeadFound.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-900 text-[11px] text-slate-400 leading-relaxed font-sans">
                <span className="text-amber-400 font-semibold block mb-0.5 font-mono text-[10px] uppercase">Smart Resolution Strategy:</span>
                Merging will add the new travel dates and budget to the existing lead, append the new inquiries to <span className="text-slate-200 font-semibold">Special Requests</span>, and prefix the timeline notes. No duplicate profiles are created.
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1 font-mono">
                <button
                  type="button"
                  onClick={handleMergeDuplicate}
                  className="flex-1 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs transition-all uppercase text-center cursor-pointer"
                >
                  Merge with Existing
                </button>
                <button
                  type="button"
                  onClick={handleForceCreateLead}
                  className="flex-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all uppercase text-center cursor-pointer"
                >
                  Create Separate Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDuplicateWarningModal(false);
                    setDuplicateLeadFound(null);
                    setPendingLeadToCreate(null);
                  }}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-900 text-slate-500 hover:text-slate-300 font-bold rounded-xl text-xs transition-all uppercase text-center cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
