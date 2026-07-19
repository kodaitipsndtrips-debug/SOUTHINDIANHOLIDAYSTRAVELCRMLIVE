import React, { useState, useEffect } from "react";
import * as Lucide from "lucide-react";
import axios from "axios";
import html2pdf from "html2pdf.js";
import { TourPackage, Lead } from "../types";

interface QuotationsTabProps {
  packages: TourPackage[];
  leads: Lead[];
  itineraries?: any[];
  destinations?: { id: string; name: string; value: string; status: "Active" | "Inactive" }[];
  selectedPkgFromLibrary: TourPackage | null;
  clearSelectedPkg: () => void;
  selectedLeadForQuotation?: Lead | null;
  clearSelectedLeadForQuotation?: () => void;
  companySettings: any;
}

interface QuoteItem {
  id: string;
  name: string;
  hsn: string;
  qty: number;
  rate: number;
  gst: number; // %
}

const ITINERARY_TEMPLATES: Record<string, string> = {
  kodaikanal: "Day 1: Arrival, Check-in, Evening Coaker's Walk & Bryant Park sightseeing.\nDay 2: Full day local sightseeing - Pine Forest, Pillar Rocks, Guna Caves, Golf Course.\nDay 3: Lake Boating, Local Chocolate shopping & Departure with sweet memories.",
  ooty: "Day 1: Arrival, Check-in, Botanical Garden, Evening Ooty Lake boating.\nDay 2: Coonoor excursion - Toy Train ride, Sim's Park, Dolphin's Nose & Tea Factory.\nDay 3: Pykara Waterfalls, Pykara Lake, Filming shooting spot & Departure.",
  coorg: "Day 1: Arrival, Check-in, visit Golden Temple (Bylakuppe), Nisargadhama forest.\nDay 2: Talakaveri, Bhagamandala, Abbey Falls, Raja's Seat evening sunset.\nDay 3: Dubare Elephant Camp, local shopping & Departure.",
  munnar: "Day 1: Arrival, Tea Garden views, Check-in, Evening Blossom Park & spice garden.\nDay 2: Eravikulam National Park (Rajamalai), Mattupetty Dam, Echo Point, Kundala Lake.\nDay 3: Tea Museum, local chocolate/spice purchasing, Departure.",
  mysore: "Day 1: Arrival, Chamundi Hills, Mysore Palace, Brindavan Garden musical fountain show.\nDay 2: Srirangapatna sightseeing, St. Philomena's Church, Zoo local visit.\nDay 3: Sand Museum, shopping for Mysore Silk/Sandalwood, Departure.",
  alleppey: "Day 1: Arrival, board traditional premium Houseboat, cruise through Vembanad Lake.\nDay 2: Backwater canals tour, village walk, traditional Kerala cuisine dining.\nDay 3: Alleppey Beach, lighthouse view, departure.",
  pondicherry: "Day 1: Arrival, Promenade Beach stroll, Aurobindo Ashram, French War Memorial.\nDay 2: Auroville golden dome visit, Paradise Beach boating, French Quarter architecture tour.\nDay 3: Sacred Heart Basilica, local cafes check-out, departure."
};

export default function QuotationsTab({
  packages = [],
  leads = [],
  itineraries = [],
  destinations = [],
  selectedPkgFromLibrary,
  clearSelectedPkg,
  selectedLeadForQuotation,
  clearSelectedLeadForQuotation,
  companySettings
 }: QuotationsTabProps) {
  const safePackages = Array.isArray(packages) ? packages : [];
  const safeLeads = Array.isArray(leads) ? leads : [];
  const safeDestinations = Array.isArray(destinations) ? destinations : [];
  const activeDestinations = safeDestinations.filter(d => d.status !== "Inactive");

  // Quotations database state
  const [quotations, setQuotations] = useState<any[]>([]);
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);
  const [quotationNumber, setQuotationNumber] = useState("");
  const [status, setStatus] = useState<"Draft" | "Sent" | "Approved" | "Declined">("Draft");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Email modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState("");

  // Quotation General State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [destination, setDestination] = useState("kodaikanal");
  const [travelDate, setTravelDate] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  // New States for PDF generation alignment
  const [numDays, setNumDays] = useState(3);
  const [vehicleDetails, setVehicleDetails] = useState("Private AC Sedan (Toyota Etios) with Driver & fuel charges");
  const [hotelDetails, setHotelDetails] = useState("3-Star Deluxe Resort Stays Twin-Sharing with Breakfast");
  const [dayWiseItinerary, setDayWiseItinerary] = useState("");

  // Line items state
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([
    { id: "qi-1", name: "3-Star Deluxe Hotel Lodging (Twin Sharing Stay)", hsn: "9985", qty: 1, rate: 8500, gst: 5 },
    { id: "qi-2", name: "Private AC Sedan (Toyota Etios) with Driver & Toll charges", hsn: "9985", qty: 1, rate: 6000, gst: 5 }
  ]);

  const [discountPercent, setDiscountPercent] = useState(0);
  const [termsIndex, setTermsIndex] = useState(0);

  // New Item Builder Input
  const [newItemName, setNewItemName] = useState("");
  const [newItemHsn, setNewItemHsn] = useState("9985");
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemRate, setNewItemRate] = useState(1000);
  const [newItemGst, setNewItemGst] = useState(5);

  // Terms and conditions libraries
  const termsLibrary = [
    {
      title: "Standard Reservation Terms",
      text: `1. 50% advance payment required to initiate reservations and freeze transport allocations.\n2. Balance 50% must be fully settled 7 days prior to travel departure.\n3. Cancelations made 15 days or more prior to travel are eligible for a 75% refund. Cancelations under 7 days are strictly non-refundable.\n4. Standard hotel check-in time is 12:00 PM and check-out is 10:00 AM.\n5. Rates are subject to change in case of hike in government taxes or fleet fuel surcharges.`
    },
    {
      title: "Honeymoon & Special Stays Policy",
      text: `1. Special bed decorations, homemade chocolates, or fruit baskets are single-use allocations.\n2. Candlelight dinners are subjected to weather conditions on scenic hill viewpoints.\n3. High peak season dates (April 15 to June 15) trigger custom hotel surcharges which must be paid by customer directly at the front desk.\n4. Cab driver night service charges apply post 9:00 PM.`
    },
    {
      title: "Corporate Booking Guidelines",
      text: `1. Quotation rates exclude any corporate conference hall bookings unless explicitly priced.\n2. Invoice will be generated on corporate GSTIN specified.\n3. Travel vouchers will be issued post full balance clearance.`
    }
  ];

  // Load Lead File if selected
  const handleLoadLead = (lead: Lead) => {
    setCustomerName(lead.name);
    setCustomerPhone(lead.mobile);
    setCustomerEmail(lead.email || "");
    setDestination(lead.destination);
    setTravelDate(lead.travelDate);
    setAdults(Number(lead.adults) || 2);
    setChildren(Number(lead.children) || 0);

    // Auto calculate initial price for loaded package if exists
    const matchingPkg = safePackages.find(p => p.destination === lead.destination);
    if (matchingPkg) {
      setQuoteItems([
        {
          id: `qi-${Date.now()}-1`,
          name: `${matchingPkg.name} - Accommodation & Sightseeing Template`,
          hsn: "9985",
          qty: 1,
          rate: matchingPkg.price,
          gst: 5
        }
      ]);
    }
  };

  // Load Library Package if routed from Package Library Tab
  React.useEffect(() => {
    if (selectedPkgFromLibrary) {
      setDestination(selectedPkgFromLibrary.destination);
      setQuoteItems([
        {
          id: `qi-pkg-lib`,
          name: `${selectedPkgFromLibrary.name} (Library Package Map)`,
          hsn: "9985",
          qty: 1,
          rate: selectedPkgFromLibrary.price,
          gst: 5
        }
      ]);
      // Search for any lead matched with destination to pre-fill
      const matchingLead = safeLeads.find(l => l.destination === selectedPkgFromLibrary.destination);
      if (matchingLead) {
        setCustomerName(matchingLead.name);
        setCustomerPhone(matchingLead.mobile);
        setCustomerEmail(matchingLead.email || "");
        setTravelDate(matchingLead.travelDate);
      }
      clearSelectedPkg();
    }
  }, [selectedPkgFromLibrary, safePackages, safeLeads, clearSelectedPkg]);

  // Load Lead if routed from Leads Tab
  React.useEffect(() => {
    if (selectedLeadForQuotation) {
      handleLoadLead(selectedLeadForQuotation);
      if (clearSelectedLeadForQuotation) {
        clearSelectedLeadForQuotation();
      }
    }
  }, [selectedLeadForQuotation, clearSelectedLeadForQuotation]);

  // Line item manipulation
  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem: QuoteItem = {
      id: `qi-${Date.now()}`,
      name: newItemName,
      hsn: newItemHsn,
      qty: Number(newItemQty),
      rate: Number(newItemRate),
      gst: Number(newItemGst)
    };

    setQuoteItems([...quoteItems, newItem]);
    setNewItemName("");
    setNewItemRate(1000);
  };

  const removeItem = (id: string) => {
    setQuoteItems(quoteItems.filter(item => item.id !== id));
  };

  // Mathematical Totals
  const safeQuoteItems = Array.isArray(quoteItems) ? quoteItems : [];
  const subTotal = safeQuoteItems.reduce((acc, item) => acc + ((item.rate || 0) * (item.qty || 0)), 0);
  const totalGst = safeQuoteItems.reduce((acc, item) => {
    const itemSub = (item.rate || 0) * (item.qty || 0);
    return acc + (itemSub * ((item.gst || 0) / 100));
  }, 0);
  const discountVal = subTotal * (discountPercent / 100);
  const finalTotal = subTotal + totalGst - discountVal;

  // Fetch saved quotations on mount
  const fetchQuotations = async () => {
    try {
      const res = await axios.get("/api/quotations");
      if (res.data && Array.isArray(res.data)) {
        setQuotations(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch quotations:", err);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  // Update dayWiseItinerary when destination changes
  useEffect(() => {
    if (!dayWiseItinerary || Object.values(ITINERARY_TEMPLATES).includes(dayWiseItinerary)) {
      if (ITINERARY_TEMPLATES[destination]) {
        setDayWiseItinerary(ITINERARY_TEMPLATES[destination]);
      }
    }
  }, [destination]);

  // Reset/Create New Form
  const handleResetForm = () => {
    setEditingQuotationId(null);
    setQuotationNumber("");
    setStatus("Draft");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setDestination("kodaikanal");
    setTravelDate("");
    setNumDays(3);
    setAdults(2);
    setChildren(0);
    setDiscountPercent(0);
    setTermsIndex(0);
    setVehicleDetails("Private AC Sedan (Toyota Etios) with Driver & fuel charges");
    setHotelDetails("3-Star Deluxe Hotel Lodging with Complimentary Breakfast");
    setDayWiseItinerary(ITINERARY_TEMPLATES["kodaikanal"] || "");
    setQuoteItems([
      { id: "qi-1", name: "3-Star Deluxe Hotel Lodging (Twin Sharing Stay)", hsn: "9985", qty: 1, rate: 8500, gst: 5 },
      { id: "qi-2", name: "Private AC Sedan (Toyota Etios) with Driver & Toll charges", hsn: "9985", qty: 1, rate: 6000, gst: 5 }
    ]);
  };

  // Save or Update Quotation Draft
  const handleSaveQuotation = async () => {
    if (!customerName.trim()) {
      alert("Validation Error: Customer Name is required.");
      return;
    }
    if (!customerPhone.trim()) {
      alert("Validation Error: Mobile Contact is required.");
      return;
    }
    const safeQuoteItems = Array.isArray(quoteItems) ? quoteItems : [];
    if (safeQuoteItems.length === 0) {
      alert("Validation Error: At least one pricing line item is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerName,
        customerPhone,
        customerEmail,
        destination,
        travelDate,
        numDays,
        adults,
        children,
        quoteItems: safeQuoteItems,
        discountPercent,
        termsIndex,
        vehicleDetails,
        hotelDetails,
        dayWiseItinerary,
        status,
        quotationNumber: quotationNumber || undefined
      };

      if (editingQuotationId) {
        const res = await axios.put(`/api/quotations/${editingQuotationId}`, payload);
        alert(`Quotation ${res.data.quotationNumber} updated successfully!`);
      } else {
        const res = await axios.post("/api/quotations", payload);
        setEditingQuotationId(res.data.id);
        setQuotationNumber(res.data.quotationNumber);
        alert(`Quotation ${res.data.quotationNumber} saved as draft!`);
      }
      fetchQuotations();
    } catch (err: any) {
      console.error(err);
      alert("Failed to save quotation: " + (err.response?.data?.error || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load a saved quotation for editing
  const handleLoadQuotationForEditing = (q: any) => {
    if (!q) return;
    setEditingQuotationId(q.id);
    setQuotationNumber(q.quotationNumber);
    setStatus(q.status || "Draft");
    setCustomerName(q.customerName || "");
    setCustomerPhone(q.customerPhone || "");
    setCustomerEmail(q.customerEmail || "");
    setDestination(q.destination || "kodaikanal");
    setTravelDate(q.travelDate || "");
    setNumDays(Number(q.numDays) || 3);
    setAdults(Number(q.adults) || 2);
    setChildren(Number(q.children) || 0);
    setDiscountPercent(Number(q.discountPercent) || 0);
    setTermsIndex(Number(q.termsIndex) || 0);
    setVehicleDetails(q.vehicleDetails || "Private AC Sedan (Toyota Etios) with Driver & fuel charges");
    setHotelDetails(q.hotelDetails || "3-Star Deluxe Hotel Lodging with Complimentary Breakfast");
    setDayWiseItinerary(q.dayWiseItinerary || "");
    setQuoteItems(Array.isArray(q.quoteItems) ? q.quoteItems : []);
    
    // Scroll to builder
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Duplicate a saved quotation
  const handleDuplicateQuotation = async (q: any) => {
    if (!q) return;
    setIsSubmitting(true);
    try {
      const payload = {
        ...q,
        id: undefined,
        quotationNumber: undefined,
        status: "Draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        customerName: `${q.customerName} (Copy)`
      };
      const res = await axios.post("/api/quotations", payload);
      alert(`Quotation duplicated successfully as ${res.data.quotationNumber}!`);
      fetchQuotations();
    } catch (err: any) {
      alert("Failed to duplicate: " + (err.response?.data?.error || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete a saved quotation
  const handleDeleteQuotation = async (id: string) => {
    if (!confirm("Are you sure you want to delete this quotation? This action is permanent.")) return;
    setIsSubmitting(true);
    try {
      await axios.delete(`/api/quotations/${id}`);
      if (editingQuotationId === id) {
        handleResetForm();
      }
      alert("Quotation deleted successfully!");
      fetchQuotations();
    } catch (err: any) {
      alert("Failed to delete quotation: " + (err.response?.data?.error || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build high-fidelity print HTML for printing and PDF generation
  const buildPrintHTML = (qNum: string, currentStatus: string) => {
    const safeQuoteItems = Array.isArray(quoteItems) ? quoteItems : [];
    const subTotalVal = safeQuoteItems.reduce((acc, item) => acc + ((item?.rate || 0) * (item?.qty || 0)), 0);
    const totalGstVal = safeQuoteItems.reduce((acc, item) => {
      const itemSub = (item?.rate || 0) * (item?.qty || 0);
      return acc + (itemSub * ((item?.gst || 0) / 100));
    }, 0);
    const discountVal = subTotalVal * (discountPercent / 100);
    const finalTotalVal = subTotalVal + totalGstVal - discountVal;

    return `
      <div class="print-invoice max-w-4xl mx-auto p-8 text-black bg-white" style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; color: #1e293b;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: start; border-bottom: 2px solid #0f172a; padding-bottom: 16px;">
          <div style="display: flex; align-items: start; gap: 16px;">
            ${companySettings?.logo ? `<img src="${companySettings.logo}" alt="Company Logo" style="width: 64px; height: 64px; object-fit: contain; border-radius: 8px; border: 1px solid #e2e8f0; padding: 4px;" referrerPolicy="no-referrer" />` : ""}
            <div>
              <h1 style="font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.025em; color: #0f172a; margin: 0;">${companySettings?.companyName || "South Indian Holidays"}</h1>
              <p style="font-size: 12px; color: #64748b; max-width: 384px; margin: 4px 0 0 0;">${companySettings?.address || ""}</p>
              <p style="font-size: 10px; color: #475569; margin: 4px 0 0 0; font-family: monospace;">GSTIN: ${companySettings?.gstNumber || ""} | Phone: ${companySettings?.phone || ""}</p>
            </div>
          </div>
          <div style="text-align: right;">
            <h2 style="font-size: 24px; font-weight: 900; color: #1e293b; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">TRAVEL QUOTATION</h2>
            <p style="font-size: 12px; color: #64748b; font-family: monospace; margin: 4px 0 0 0;">Ref: ${qNum || "SIH-QT-TEMP"}</p>
            <p style="font-size: 12px; color: #64748b; font-family: monospace; margin: 2px 0 0 0;">Date: ${new Date().toLocaleDateString("en-IN")}</p>
            <p style="font-size: 12px; font-weight: bold; color: #4f46e5; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.05em;">Status: ${currentStatus || "Draft"}</p>
          </div>
        </div>

        <!-- Customer details -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 16px 0; font-size: 12px;">
          <div style="padding: 12px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9;">
            <h4 style="font-size: 10px; font-weight: bold; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px 0;">Prepared For:</h4>
            <p style="font-weight: 900; color: #1e293b; font-size: 14px; margin: 0 0 4px 0;">${customerName || "Valued Client"}</p>
            <p style="margin: 2px 0 0 0;"><strong>Contact:</strong> ${customerPhone || "N/A"}</p>
            <p style="margin: 2px 0 0 0;"><strong>Email:</strong> ${customerEmail || "N/A"}</p>
          </div>
          <div style="padding: 12px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9;">
            <h4 style="font-size: 10px; font-weight: bold; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px 0;">Vacation Parameters:</h4>
            <p style="text-transform: capitalize; margin: 0 0 4px 0;"><strong>Destination:</strong> ${destination}</p>
            <p style="margin: 2px 0 0 0;"><strong>Departure Date:</strong> ${travelDate || "Flexible"}</p>
            <p style="margin: 2px 0 0 0;"><strong>Duration:</strong> ${numDays} Days / ${numDays - 1 > 0 ? numDays - 1 : 1} Nights</p>
            <p style="margin: 2px 0 0 0;"><strong>Pax Group:</strong> ${adults} Adults, ${children} Kids</p>
          </div>
        </div>

        <!-- Vehicle & Hotel Details -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding-bottom: 16px; font-size: 12px;">
          <div style="padding: 12px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9;">
            <h4 style="font-size: 10px; font-weight: bold; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 4px 0;">Vehicle & Transport:</h4>
            <p style="color: #334155; font-style: italic; font-weight: 600; margin: 0;">${vehicleDetails || "Private AC Vehicle with driver, state permits and parking included"}</p>
          </div>
          <div style="padding: 12px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9;">
            <h4 style="font-size: 10px; font-weight: bold; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 4px 0;">Hotel Accommodations:</h4>
            <p style="color: #334155; font-style: italic; font-weight: 600; margin: 0;">${hotelDetails || "Deluxe room twin stay with breakfast plan"}</p>
          </div>
        </div>

        <!-- Day Wise Itinerary -->
        <div style="padding: 12px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #dcfce7; font-size: 12px; margin-bottom: 16px;">
          <h4 style="font-size: 10px; font-weight: bold; color: #16a34a; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px 0;">Proposed Day-wise Itinerary:</h4>
          <div style="color: #334155; line-height: 1.6; white-space: pre-line; font-size: 12px; font-weight: 500;">
            ${dayWiseItinerary || "Custom flexible sightseeing plan."}
          </div>
        </div>

        <!-- Pricing items -->
        <table style="width: 100%; font-size: 12px; text-align: left; border-collapse: collapse; margin-top: 8px;">
          <thead>
            <tr style="background-color: #0f172a; color: white; font-weight: bold; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em;">
              <th style="padding: 8px; border-top-left-radius: 4px; border-bottom-left-radius: 4px;">#</th>
              <th style="padding: 8px;">Item / Service Details</th>
              <th style="padding: 8px; text-align: center;">HSN/SAC</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Rate (₹)</th>
              <th style="padding: 8px; text-align: center;">GST</th>
              <th style="padding: 8px; text-align: right; border-top-right-radius: 4px; border-bottom-right-radius: 4px;">Total (₹)</th>
            </tr>
          </thead>
          <tbody style="border-bottom: 1px solid #e2e8f0;">
            ${safeQuoteItems.map((item, idx) => `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px; color: #64748b;">${idx + 1}</td>
                <td style="padding: 8px; font-weight: bold; color: #1e293b;">${item?.name || ""}</td>
                <td style="padding: 8px; text-align: center; color: #475569; font-family: monospace;">${item?.hsn || "9985"}</td>
                <td style="padding: 8px; text-align: center; font-family: monospace;">${item?.qty || 1}</td>
                <td style="padding: 8px; text-align: right; font-family: monospace;">${(item?.rate || 0).toLocaleString("en-IN")}</td>
                <td style="padding: 8px; text-align: center; font-family: monospace;">${item?.gst || 5}%</td>
                <td style="padding: 8px; text-align: right; font-family: monospace; font-weight: bold; color: #1e293b;">${((item?.rate || 0) * (item?.qty || 0)).toLocaleString("en-IN")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <!-- Summary column -->
        <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 16px; margin-top: 24px; font-size: 12px;">
          <!-- Terms -->
          <div style="padding: 12px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9;">
            <h4 style="font-size: 10px; font-weight: bold; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 6px 0;">Estimate Terms & Conditions:</h4>
            <p style="font-size: 9px; color: #475569; line-height: 1.5; white-space: pre-line; margin: 0;">${termsLibrary[termsIndex]?.text || ""}</p>
          </div>
          <!-- Totals -->
          <div style="padding: 12px; background-color: #cbd5e1; border-radius: 8px; border: 1px solid #cbd5e1; align-self: start;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #475569;">
              <span>Subtotal:</span>
              <span style="font-family: monospace; font-weight: 500;">₹${subTotalVal.toLocaleString("en-IN")}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #475569;">
              <span>GST Surcharge:</span>
              <span style="font-family: monospace; font-weight: 500;">₹${totalGstVal.toLocaleString("en-IN")}</span>
            </div>
            ${discountPercent > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #e11d48; font-weight: bold;">
                <span>Discount (${discountPercent}%):</span>
                <span style="font-family: monospace;">-₹${discountVal.toLocaleString("en-IN")}</span>
              </div>
            ` : ""}
            <div style="display: flex; justify-content: space-between; border-top: 1px solid #94a3b8; padding-top: 6px; font-weight: 900; color: #0f172a; font-size: 14px;">
              <span>Grand Total:</span>
              <span style="font-family: monospace; color: #15803d;">₹${finalTotalVal.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        <!-- Remittance bank details -->
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #cbd5e1; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; align-items: start; gap: 16px;">
          <div>
            <h5 style="font-weight: bold; text-transform: uppercase; color: #334155; margin: 0 0 4px 0; letter-spacing: 0.05em;">Bank Transfer Account Details</h5>
            <p style="margin: 2px 0 0 0;">Bank Name: ${companySettings?.bankName || ""}</p>
            <p style="margin: 2px 0 0 0;">A/C Number: ${companySettings?.bankAccount || ""}</p>
            <p style="margin: 2px 0 0 0;">IFSC Code: ${companySettings?.bankIfsc || ""}</p>
            <p style="margin: 2px 0 0 0;">UPI ID: ${companySettings?.upiId || ""}</p>
          </div>
          <div style="text-align: right; display: flex; flex-direction: column; justify-content: space-between; align-items: end;">
            <div style="width: 128px; height: 48px; border-bottom: 1px solid #cbd5e1; margin-bottom: 4px; display: flex; align-items: end; justify-content: center;">
              <span style="font-size: 9px; color: #94a3b8; font-style: italic;">Authorized Sign</span>
            </div>
            <p style="font-weight: bold; color: #1e293b; margin: 0;">South Indian Holidays & Asset Management Pvt. Ltd.</p>
          </div>
        </div>
      </div>
    `;
  };

  // Trigger print-canvas generation and print
  const triggerPrintEstimate = () => {
    const printArea = document.getElementById("print-canvas");
    if (!printArea) return;
    printArea.innerHTML = buildPrintHTML(quotationNumber || "SIH-EST-TEMP", status);
    window.print();
  };

  // Core PDF generator and uploader
  const uploadPDF = async (quoteId: string, qNumber: string) => {
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.width = "800px";
    container.style.background = "white";
    container.style.color = "black";
    container.style.display = "block";
    container.className = "text-black bg-white p-4";
    container.innerHTML = buildPrintHTML(qNumber, status);
    document.body.appendChild(container);

    try {
      const opt = {
        margin:       10,
        filename:     `Quotation-${qNumber}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const pdfBlob = await html2pdf().from(container).set(opt).output('blob');
      const formData = new FormData();
      formData.append("file", pdfBlob, `Quotation-${qNumber}.pdf`);

      const uploadRes = await axios.post(`/api/quotations/${quoteId}/pdf`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return uploadRes.data.pdfPath;
    } finally {
      document.body.removeChild(container);
    }
  };

  // Generate and download client side PDF
  const handleDownloadPDF = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      alert("Validation Error: Please fill in mandatory Customer Name and Mobile Contact fields.");
      return;
    }
    const safeQuoteItems = Array.isArray(quoteItems) ? quoteItems : [];
    if (safeQuoteItems.length === 0) {
      alert("Validation Error: At least one pricing line item is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      let currentId = editingQuotationId;
      let currentNumber = quotationNumber;

      if (!currentId) {
        const payload = {
          customerName,
          customerPhone,
          customerEmail,
          destination,
          travelDate,
          numDays,
          adults,
          children,
          quoteItems: safeQuoteItems,
          discountPercent,
          termsIndex,
          vehicleDetails,
          hotelDetails,
          dayWiseItinerary,
          status: "Draft"
        };
        const saveRes = await axios.post("/api/quotations", payload);
        currentId = saveRes.data.id;
        currentNumber = saveRes.data.quotationNumber;
        setEditingQuotationId(currentId);
        setQuotationNumber(currentNumber);
      }

      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "800px";
      container.style.background = "white";
      container.style.color = "black";
      container.style.display = "block";
      container.className = "text-black bg-white p-4";
      container.innerHTML = buildPrintHTML(currentNumber, status);
      document.body.appendChild(container);

      try {
        const opt = {
          margin:       10,
          filename:     `Quotation-${currentNumber}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        await html2pdf().from(container).set(opt).save();
        await uploadPDF(currentId!, currentNumber);
        alert(`Success: Quotation-${currentNumber}.pdf successfully generated and downloaded.`);
        fetchQuotations();
      } finally {
        document.body.removeChild(container);
      }
    } catch (err: any) {
      console.error(err);
      alert("Failed to download PDF: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // WhatsApp dispatch trigger
  const handleShareWhatsApp = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      alert("Validation Error: Customer Name and Mobile Contact are required.");
      return;
    }
    const safeQuoteItems = Array.isArray(quoteItems) ? quoteItems : [];
    if (safeQuoteItems.length === 0) {
      alert("Validation Error: Quote must have at least one pricing item.");
      return;
    }

    setIsSubmitting(true);
    try {
      let currentId = editingQuotationId;
      let currentNumber = quotationNumber;

      if (!currentId) {
        const payload = {
          customerName,
          customerPhone,
          customerEmail,
          destination,
          travelDate,
          numDays,
          adults,
          children,
          quoteItems: safeQuoteItems,
          discountPercent,
          termsIndex,
          vehicleDetails,
          hotelDetails,
          dayWiseItinerary,
          status: "Draft"
        };
        const saveRes = await axios.post("/api/quotations", payload);
        currentId = saveRes.data.id;
        currentNumber = saveRes.data.quotationNumber;
        setEditingQuotationId(currentId);
        setQuotationNumber(currentNumber);
      }

      await uploadPDF(currentId!, currentNumber);
      const res = await axios.post(`/api/quotations/${currentId}/share-whatsapp`);
      if (res.data.success && res.data.whatsappUrl) {
        setStatus("Sent");
        alert("WhatsApp link generated successfully! Redirecting...");
        window.open(res.data.whatsappUrl, "_blank");
        fetchQuotations();
      } else {
        alert("Failed to trigger WhatsApp sharing.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Failed to share on WhatsApp: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send Email dispatch trigger
  const handleSendEmail = async () => {
    if (!emailRecipient.trim()) {
      alert("Validation Error: Recipient Email address is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      let currentId = editingQuotationId;
      let currentNumber = quotationNumber;
      const safeQuoteItems = Array.isArray(quoteItems) ? quoteItems : [];

      if (!currentId) {
        const payload = {
          customerName,
          customerPhone,
          customerEmail,
          destination,
          travelDate,
          numDays,
          adults,
          children,
          quoteItems: safeQuoteItems,
          discountPercent,
          termsIndex,
          vehicleDetails,
          hotelDetails,
          dayWiseItinerary,
          status: "Draft"
        };
        const saveRes = await axios.post("/api/quotations", payload);
        currentId = saveRes.data.id;
        currentNumber = saveRes.data.quotationNumber;
        setEditingQuotationId(currentId);
        setQuotationNumber(currentNumber);
      }

      await uploadPDF(currentId!, currentNumber);
      const res = await axios.post(`/api/quotations/${currentId}/send-email`, {
        email: emailRecipient
      });

      setStatus("Sent");
      setShowEmailModal(false);
      alert(res.data.message || "Email dispatched successfully with PDF attachment!");
      fetchQuotations();
    } catch (err: any) {
      console.error(err);
      alert("Failed to send email: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <Lucide.FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Quotation Studio & Estimator</h3>
            <p className="text-[10px] text-slate-500 font-semibold">Build, price, and print professional holiday estimates for leads</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {editingQuotationId && (
            <button
              onClick={handleResetForm}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-slate-750 shadow-md"
            >
              <Lucide.RefreshCw className="w-3.5 h-3.5" />
              New Quote
            </button>
          )}
          <button
            onClick={handleSaveQuotation}
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-600/10"
          >
            <Lucide.Save className="w-3.5 h-3.5" />
            {editingQuotationId ? "Update Quote" : "Save Draft"}
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-600/10"
          >
            <Lucide.Download className="w-3.5 h-3.5" />
            Download PDF
          </button>
          <button
            onClick={handleShareWhatsApp}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-green-600/10"
          >
            <Lucide.MessageSquare className="w-3.5 h-3.5" />
            WhatsApp
          </button>
          <button
            onClick={() => {
              setEmailRecipient(customerEmail);
              setShowEmailModal(true);
            }}
            disabled={isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-600/10"
          >
            <Lucide.Mail className="w-3.5 h-3.5" />
            Email
          </button>
          <button
            onClick={triggerPrintEstimate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/10"
          >
            <Lucide.Printer className="w-3.5 h-3.5" />
            Print Quote
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        {/* LHS Controls & Load templates */}
        <div className="lg:col-span-1 space-y-4">
          {/* Load Prospect Lead File */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Quick Import Prospect Lead</h4>
            <p className="text-[10px] text-slate-500">Choose an active client lead file to auto-populate target parameters</p>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {safeLeads.filter(l => l.status !== "Won" && l.status !== "Lost").map(lead => (
                <button
                  key={lead.id}
                  onClick={() => handleLoadLead(lead)}
                  className="w-full text-left p-2.5 bg-slate-950 hover:bg-slate-850 rounded-xl border border-slate-850 hover:border-slate-800 transition-all text-xs flex justify-between items-center"
                >
                  <div>
                    <p className="font-bold text-white">{lead.name}</p>
                    <p className="text-[9px] text-indigo-400 font-semibold uppercase">{lead.destination} | {lead.id}</p>
                  </div>
                  <Lucide.ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              ))}
              {leads.length === 0 && <p className="text-[10px] text-slate-500 font-mono py-2 text-center">No active leads logged.</p>}
            </div>
          </div>

          {/* Saved Quotations Registry */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <Lucide.History className="w-3.5 h-3.5 text-indigo-400" />
                Saved Quotations
              </h4>
              <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-900 font-mono font-bold px-1.5 py-0.5 rounded-full">
                {(dbQuotations => Array.isArray(dbQuotations) ? dbQuotations.length : 0)(quotations)}
              </span>
            </div>
            
            {/* Search and filter panel */}
            <div className="space-y-2 text-xs">
              <div className="relative">
                <Lucide.Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by client or ref..."
                  className="w-full bg-slate-950 border border-slate-850 pl-8 pr-2.5 py-1.5 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 p-1.5 rounded-xl text-xs text-slate-400 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Approved">Approved</option>
                <option value="Declined">Declined</option>
              </select>
            </div>

            {/* List entries */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {(() => {
                const safeQuotationList = Array.isArray(quotations) ? quotations : [];
                const filteredQuotations = safeQuotationList.filter(q => {
                  if (!q) return false;
                  const nameMatch = q.customerName ? q.customerName.toLowerCase().includes(searchQuery.toLowerCase()) : false;
                  const refMatch = q.quotationNumber ? q.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) : false;
                  const destMatch = q.destination ? q.destination.toLowerCase().includes(searchQuery.toLowerCase()) : false;
                  const matchesSearch = nameMatch || refMatch || destMatch;
                  
                  if (statusFilter === "all") return matchesSearch;
                  return matchesSearch && q.status === statusFilter;
                });

                return Array.isArray(filteredQuotations) && filteredQuotations.map((q) => {
                  const qItems = Array.isArray(q.quoteItems) ? q.quoteItems : [];
                  const subTotalVal = qItems.reduce((acc: number, item: any) => acc + ((item?.rate || 0) * (item?.qty || 0)), 0);
                  const gstVal = qItems.reduce((acc: number, item: any) => {
                    const itemSub = (item?.rate || 0) * (item?.qty || 0);
                    return acc + (itemSub * ((item?.gst || 0) / 100));
                  }, 0);
                  const discVal = subTotalVal * ((q.discountPercent || 0) / 100);
                  const grandTotal = subTotalVal + gstVal - discVal;

                  const statusColor: Record<string, string> = {
                    Draft: "bg-slate-950 text-slate-400 border-slate-800",
                    Sent: "bg-amber-950/40 text-amber-400 border-amber-900/50",
                    Approved: "bg-emerald-950/40 text-emerald-400 border-emerald-900/50",
                    Declined: "bg-rose-950/40 text-rose-400 border-rose-900/50"
                  };

                  const isCurrent = editingQuotationId === q.id;

                  return (
                    <div
                      key={q.id}
                      className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                        isCurrent 
                          ? "bg-slate-850/50 border-indigo-600" 
                          : "bg-slate-950 hover:bg-slate-850/40 border-slate-850"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="cursor-pointer flex-1" onClick={() => handleLoadQuotationForEditing(q)}>
                          <p className="font-bold text-white text-xs hover:text-indigo-400 transition-colors flex items-center gap-1">
                            {q.customerName || "No Name"}
                            {isCurrent && <span className="text-[8px] bg-indigo-600 text-white font-black px-1 rounded">Active</span>}
                          </p>
                          <p className="text-[9px] text-slate-500 font-mono mt-0.5">{q.quotationNumber} | <span className="capitalize">{q.destination}</span></p>
                          <p className="text-[10px] text-emerald-400 font-bold font-mono mt-1">₹{grandTotal.toLocaleString("en-IN")}</p>
                        </div>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${statusColor[q.status || "Draft"]}`}>
                          {q.status || "Draft"}
                        </span>
                      </div>

                      <div className="flex justify-between items-center border-t border-slate-900/50 pt-2 text-[9px] text-slate-500 font-semibold">
                        <span className="font-mono text-[8px]">{q.updatedAt ? new Date(q.updatedAt).toLocaleDateString("en-IN") : "N/A"}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDuplicateQuotation(q)}
                            title="Duplicate quotation"
                            className="text-slate-450 hover:text-indigo-400 transition-colors p-1 cursor-pointer"
                          >
                            <Lucide.Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuotation(q.id)}
                            title="Delete quotation"
                            className="text-slate-450 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                          >
                            <Lucide.Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
              {(() => {
                const safeQuotationList = Array.isArray(quotations) ? quotations : [];
                const filtered = safeQuotationList.filter(q => {
                  if (!q) return false;
                  const nameMatch = q.customerName ? q.customerName.toLowerCase().includes(searchQuery.toLowerCase()) : false;
                  const refMatch = q.quotationNumber ? q.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) : false;
                  const destMatch = q.destination ? q.destination.toLowerCase().includes(searchQuery.toLowerCase()) : false;
                  const matchesSearch = nameMatch || refMatch || destMatch;
                  
                  if (statusFilter === "all") return matchesSearch;
                  return matchesSearch && q.status === statusFilter;
                });
                return filtered.length === 0 ? (
                  <p className="text-[10px] text-slate-500 font-mono py-4 text-center">No matching quotations found.</p>
                ) : null;
              })()}
            </div>
          </div>

          {/* Form details */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Estimate Header Details</h4>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Client Name"
                  className="w-full bg-slate-950 border border-slate-850 p-2 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Mobile Contact *</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Mobile No"
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded-xl text-xs text-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="Email Address"
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Destination Location</label>
                  <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded-xl text-xs text-slate-300 focus:outline-none capitalize"
                  >
                    {activeDestinations.length > 0 ? (
                      activeDestinations.map(d => (
                        <option key={d.id} value={d.value}>{d.name}</option>
                      ))
                    ) : (
                      <option value="kodaikanal">Kodaikanal</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Travel Date</label>
                  <input
                    type="date"
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded-xl text-xs text-slate-300 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Adults</label>
                  <input
                    type="number"
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Children</label>
                  <input
                    type="number"
                    value={children}
                    onChange={(e) => setChildren(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Discount %</label>
                  <input
                    type="number"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded-xl text-xs text-white focus:outline-none font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Number of Days</label>
                  <input
                    type="number"
                    value={numDays}
                    onChange={(e) => setNumDays(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded-xl text-xs text-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Quotation Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded-xl text-xs text-white focus:outline-none font-semibold"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent</option>
                    <option value="Approved">Approved</option>
                    <option value="Declined">Declined</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Vehicle / Transport Details</label>
                <textarea
                  value={vehicleDetails}
                  onChange={(e) => setVehicleDetails(e.target.value)}
                  rows={2}
                  placeholder="e.g. Private AC Sedan with Driver and Tolls included"
                  className="w-full bg-slate-950 border border-slate-850 p-2 rounded-xl text-xs text-white focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Hotel Accommodations</label>
                <textarea
                  value={hotelDetails}
                  onChange={(e) => setHotelDetails(e.target.value)}
                  rows={2}
                  placeholder="e.g. 3-Star Deluxe Resort Twin-Sharing stays"
                  className="w-full bg-slate-950 border border-slate-850 p-2 rounded-xl text-xs text-white focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Day-wise Itinerary Details</label>
                <textarea
                  value={dayWiseItinerary}
                  onChange={(e) => setDayWiseItinerary(e.target.value)}
                  rows={4}
                  placeholder="Day-by-day vacation schedule..."
                  className="w-full bg-slate-950 border border-slate-850 p-2 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RHS Interactive Estimator Grid & Pricing Line Builder */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Interactive Line Item Pricing Grid</h4>
            
            {/* Custom line item builder */}
            <form onSubmit={addItem} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 bg-slate-950 rounded-xl border border-slate-850">
              <div className="md:col-span-5">
                <label className="block text-[8px] text-slate-500 font-bold uppercase mb-0.5">Item Description</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Deluxe Room Stay (Kodaikanal)"
                  className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-xs text-white focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[8px] text-slate-500 font-bold uppercase mb-0.5">HSN/SAC</label>
                <input
                  type="text"
                  value={newItemHsn}
                  onChange={(e) => setNewItemHsn(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-xs text-white focus:outline-none font-mono"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[8px] text-slate-500 font-bold uppercase mb-0.5">Qty</label>
                <input
                  type="number"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-xs text-white focus:outline-none font-mono"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[8px] text-slate-500 font-bold uppercase mb-0.5">Rate (₹)</label>
                <input
                  type="number"
                  value={newItemRate}
                  onChange={(e) => setNewItemRate(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-xs text-white focus:outline-none font-mono"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[8px] text-slate-500 font-bold uppercase mb-0.5">GST %</label>
                <input
                  type="number"
                  value={newItemGst}
                  onChange={(e) => setNewItemGst(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-xs text-white focus:outline-none font-mono"
                />
              </div>
              <div className="md:col-span-1 flex items-end">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded p-1.5 flex items-center justify-center cursor-pointer"
                  title="Add Line Item"
                >
                  <Lucide.Plus className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* List of current line items */}
            <div className="border border-slate-850 rounded-xl overflow-hidden text-xs">
             <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-950/50 text-[9px] uppercase font-black tracking-wider text-slate-400">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Rate</th>
                    <th className="p-3 text-center">GST</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-right">Del</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {quoteItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-950/20">
                      <td className="p-3 text-slate-500">{idx + 1}</td>
                      <td className="p-3 font-bold text-white">{item.name}</td>
                      <td className="p-3 text-center font-mono">{item.qty}</td>
                      <td className="p-3 text-right font-mono">₹{item.rate.toLocaleString("en-IN")}</td>
                      <td className="p-3 text-center font-mono">{item.gst}%</td>
                      <td className="p-3 text-right font-mono font-black text-white">₹{(item.rate * item.qty).toLocaleString("en-IN")}</td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-rose-400 hover:text-rose-300 cursor-pointer"
                        >
                          <Lucide.Trash className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {quoteItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-500 font-mono">No pricing line items added yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
             </div>
            </div>

            {/* T&C template pickers & totals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
              <div className="space-y-2">
                <label className="block text-[9px] text-slate-500 font-bold uppercase">Estimated Terms Template</label>
                <div className="flex gap-1.5 flex-wrap">
                  {termsLibrary.map((terms, idx) => (
                    <button
                      key={idx}
                      onClick={() => setTermsIndex(idx)}
                      className={`px-2.5 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                        termsIndex === idx
                          ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-400"
                          : "bg-slate-950 border-slate-850 text-slate-400 hover:text-white"
                      }`}
                    >
                      {terms.title}
                    </button>
                  ))}
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 h-24 overflow-y-auto">
                  <p className="text-[10px] text-slate-400 leading-relaxed whitespace-pre-line font-medium">
                    {termsLibrary[termsIndex].text}
                  </p>
                </div>
              </div>

              {/* Summary Calculations block */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-850 space-y-2 self-start font-mono text-[11px] font-bold">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal Amount:</span>
                  <span>₹{subTotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>GST Surcharge:</span>
                  <span>₹{totalGst.toLocaleString("en-IN")}</span>
                </div>
                {discountPercent > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Discount ({discountPercent}%):</span>
                    <span>-₹{discountVal.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-850 pt-2 text-xs font-black text-white">
                  <span>Estimated Total (INR):</span>
                  <span className="text-emerald-400">₹{finalTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Dispatch Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-slate-300 tracking-wider flex items-center gap-2">
                <Lucide.Mail className="w-4 h-4 text-amber-500" />
                Dispatch Email Attachment
              </h3>
              <button 
                onClick={() => setShowEmailModal(false)}
                className="text-slate-550 hover:text-white transition-colors cursor-pointer"
              >
                <Lucide.X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Generate the travel quotation PDF and dispatch it automatically to the recipient email address below.
            </p>
            <div className="space-y-1.5 text-xs">
              <label className="block text-[9px] text-slate-400 font-bold uppercase">Recipient Email Address *</label>
              <input
                type="email"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                placeholder="client@example.com"
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white placeholder-slate-700 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-2 text-xs">
              <button
                onClick={() => setShowEmailModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={isSubmitting}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-600/10"
              >
                <Lucide.Send className="w-3.5 h-3.5" />
                {isSubmitting ? "Sending..." : "Dispatch Email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
