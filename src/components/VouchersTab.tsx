import React, { useState } from "react";
import * as Lucide from "lucide-react";
import { Voucher, Booking, Hotel } from "../types";
import { getLocalDateString, formatFriendlyDate } from "../utils";

interface VouchersTabProps {
  vouchers: Voucher[];
  bookings: Booking[];
  hotels: Hotel[];
  onAddVoucher: (voucher: Partial<Voucher>) => void;
  onUpdateVoucher: (id: string, voucher: Partial<Voucher>) => void;
  onDeleteVoucher: (id: string) => void;
  companySettings: any;
}

export default function VouchersTab({
  vouchers = [],
  bookings = [],
  hotels = [],
  onAddVoucher,
  onUpdateVoucher,
  onDeleteVoucher,
  companySettings
}: VouchersTabProps) {
  const safeVouchers = Array.isArray(vouchers) ? vouchers : [];
  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const safeHotels = Array.isArray(hotels) ? hotels : [];

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [viewingVoucher, setViewingVoucher] = useState<Voucher | null>(null);

  // Form Fields
  const [formFields, setFormFields] = useState({
    guestName: "",
    guestMobile: "",
    guestEmail: "",
    bookingId: "SIH-BK-2026-1001",
    hotelName: "Hotel Hilltop Tower",
    hotelAddress: "Lake Road, Kodaikanal, Tamil Nadu",
    hotelPhone: "9443152643",
    hotelEmail: "hilltop@kodaikanalhotels.com",
    hotelContactPerson: "Rajesh Kumar",
    destination: "kodaikanal",
    checkInDate: getLocalDateString(),
    checkOutDate: getLocalDateString(),
    numNights: 3,
    numRooms: 1,
    roomType: "Deluxe Premium",
    mealPlan: "CP (Breakfast Only)",
    numAdults: 2,
    numChildren: 1,
    numInfants: 0,
    confirmationNumber: "HT-CONF-",
    bookingStatus: "Confirmed",
    supplierName: "Aman Holiday Hotels Group",
    supplierContact: "9043254125",
    totalAmount: 9000,
    advancePaid: 5000,
    balanceAmount: 4000,
    paymentStatus: "Partially Paid" as const,
    specialRequests: "Non-smoking room, lake view high floor if possible.",
    billingInstructions: "Room and taxes to be billed directly to South Indian Holidays. Extras to be settled by guest.",
    remarks: "Voucher generated via CRM portal",
    internalNotes: ""
  });

  // Handle Quick Booking Import
  const handleLoadBooking = (bk: Booking) => {
    setFormFields(prev => ({
      ...prev,
      guestName: bk.customerName,
      guestMobile: bk.customerMobile,
      guestEmail: bk.customerEmail || "",
      bookingId: bk.id,
      destination: bk.destination,
      checkInDate: bk.travelDate,
      numAdults: bk.adults,
      numChildren: bk.children,
      totalAmount: bk.packagePrice * 0.6, // estimated hotel share
      advancePaid: bk.packagePrice * 0.4,
      balanceAmount: bk.packagePrice * 0.2
    }));

    // Auto load hotel address details if match
    const matchingHotel = safeHotels.find(h => h.destination === bk.destination);
    if (matchingHotel) {
      setFormFields(prev => ({
        ...prev,
        hotelName: matchingHotel.name,
        hotelContactPerson: matchingHotel.contactPerson || "",
        hotelPhone: matchingHotel.contactPhone || "",
        roomType: matchingHotel.roomType || prev.roomType,
        totalAmount: (matchingHotel.contractRate || 2500) * 3
      }));
    }
  };

  const openAddForm = () => {
    setEditingVoucher(null);
    setFormFields({
      guestName: "",
      guestMobile: "",
      guestEmail: "",
      bookingId: safeBookings[0] ? safeBookings[0].id : "SIH-BK-2026-1001",
      hotelName: "Hotel Hilltop Tower",
      hotelAddress: "Lake Road, Kodaikanal, Tamil Nadu",
      hotelPhone: "9443152643",
      hotelEmail: "hilltop@kodaikanalhotels.com",
      hotelContactPerson: "Rajesh Kumar",
      destination: "kodaikanal",
      checkInDate: getLocalDateString(),
      checkOutDate: getLocalDateString(),
      numNights: 3,
      numRooms: 1,
      roomType: "Deluxe Premium",
      mealPlan: "CP (Breakfast Only)",
      numAdults: 2,
      numChildren: 1,
      numInfants: 0,
      confirmationNumber: "HT-CONF-" + Math.floor(10000 + Math.random() * 90000),
      bookingStatus: "Confirmed",
      supplierName: "Aman Holiday Hotels Group",
      supplierContact: "9043254125",
      totalAmount: 9000,
      advancePaid: 5000,
      balanceAmount: 4000,
      paymentStatus: "Partially Paid",
      specialRequests: "Non-smoking room, lake view high floor if possible.",
      billingInstructions: "Room and taxes to be billed directly to South Indian Holidays. Extras to be settled by guest.",
      remarks: "Voucher generated via CRM portal",
      internalNotes: ""
    });
    setShowForm(true);
  };

  const openEditForm = (v: Voucher) => {
    setEditingVoucher(v);
    setFormFields({
      guestName: v.guestName,
      guestMobile: v.guestMobile,
      guestEmail: v.guestEmail || "",
      bookingId: v.bookingId,
      hotelName: v.hotelName,
      hotelAddress: v.hotelAddress || "",
      hotelPhone: v.hotelPhone || "",
      hotelEmail: v.hotelEmail || "",
      hotelContactPerson: v.hotelContactPerson || "",
      destination: v.destination,
      checkInDate: v.checkInDate,
      checkOutDate: v.checkOutDate,
      numNights: v.numNights,
      numRooms: v.numRooms,
      roomType: v.roomType,
      mealPlan: v.mealPlan,
      numAdults: v.numAdults,
      numChildren: v.numChildren,
      numInfants: v.numInfants,
      confirmationNumber: v.confirmationNumber || "",
      bookingStatus: v.bookingStatus || "Confirmed",
      supplierName: v.supplierName || "",
      supplierContact: v.supplierContact || "",
      totalAmount: v.totalAmount || 0,
      advancePaid: v.advancePaid || 0,
      balanceAmount: v.balanceAmount || 0,
      paymentStatus: (v.paymentStatus as any) || "Partially Paid",
      specialRequests: v.specialRequests || "",
      billingInstructions: v.billingInstructions || "",
      remarks: v.remarks || "",
      internalNotes: v.internalNotes || ""
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVoucher) {
      onUpdateVoucher(editingVoucher.id, formFields);
    } else {
      onAddVoucher(formFields);
    }
    setShowForm(false);
  };

  // Printable layout trigger
  const triggerPrintVoucher = (v: Voucher) => {
    const printArea = document.getElementById("print-canvas");
    if (!printArea) return;

    printArea.innerHTML = `
      <div class="print-invoice max-w-4xl mx-auto p-8 text-black bg-white space-y-6">
        <!-- Logo Header -->
        <div class="flex justify-between items-center border-b pb-4">
          <div class="flex items-center gap-3">
            ${companySettings?.logo ? `<img src="${companySettings.logo}" alt="Company Logo" class="w-14 h-14 object-contain rounded-lg border border-slate-200 p-1" referrerPolicy="no-referrer" />` : ""}
            <div>
              <h1 class="text-lg font-black tracking-tight text-slate-800">${companySettings?.companyName || "South Indian Holidays"}</h1>
              <p class="text-[10px] text-slate-500 mt-1">${companySettings?.address || ""}</p>
              <p class="text-[9px] text-slate-600 font-mono">GSTIN: ${companySettings?.gstNumber || ""} | Phone: ${companySettings?.phone || ""}</p>
            </div>
          </div>
          <div class="text-right">
            <h2 class="text-xl font-bold uppercase tracking-widest text-slate-700">SERVICE VOUCHER</h2>
            <p class="text-xs text-slate-500 font-mono mt-1">Voucher No: ${v.id}</p>
            <p class="text-xs text-slate-500 font-mono">Date: ${new Date().toLocaleDateString("en-IN")}</p>
          </div>
        </div>

        <!-- Confirm block -->
        <div class="bg-indigo-50 border p-3 rounded-lg flex justify-between items-center text-xs">
          <div>
            <span class="text-[9px] text-indigo-500 font-black uppercase">Confirmation Ref / Code:</span>
            <p class="text-sm font-black text-slate-800">${v.confirmationNumber || "UNDER VERIFICATION"}</p>
          </div>
          <div class="text-right">
            <span class="text-[9px] text-indigo-500 font-black uppercase">Voucher Status:</span>
            <p class="text-sm font-black text-emerald-600 uppercase">SECURED & GUARANTEED</p>
          </div>
        </div>

        <!-- Details Grid -->
        <div class="grid grid-cols-2 gap-4 text-xs">
          <div class="border p-3 rounded-lg space-y-1.5">
            <h4 class="text-[10px] font-black uppercase text-slate-400 tracking-wider">Hotel Supplier Parameters</h4>
            <p class="text-slate-900 font-black text-sm">${v.hotelName}</p>
            <p><strong>Address:</strong> ${v.hotelAddress || "N/A"}</p>
            <p><strong>Ph No:</strong> ${v.hotelPhone || "N/A"} | <strong>Contact:</strong> ${v.hotelContactPerson || "N/A"}</p>
          </div>

          <div class="border p-3 rounded-lg space-y-1.5">
            <h4 class="text-[10px] font-black uppercase text-slate-400 tracking-wider">Guest & Party Profile</h4>
            <p class="text-slate-900 font-black text-sm">${v.guestName}</p>
            <p><strong>Contact:</strong> ${v.guestMobile}</p>
            <p><strong>Party Size:</strong> ${v.numAdults} Adults, ${v.numChildren} Children</p>
          </div>
        </div>

        <!-- Schedule details -->
        <table class="w-full text-xs text-left border border-collapse">
          <thead>
            <tr class="bg-slate-950 text-white font-bold uppercase text-[9px] tracking-wider">
              <th class="p-2 border">Check-in Date</th>
              <th class="p-2 border">Check-out Date</th>
              <th class="p-2 border text-center">Nights</th>
              <th class="p-2 border text-center">Rooms</th>
              <th class="p-2 border">Room Category</th>
              <th class="p-2 border">Meal Plan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="p-2 border font-bold">${formatFriendlyDate(v.checkInDate)}</td>
              <td class="p-2 border font-bold">${formatFriendlyDate(v.checkOutDate)}</td>
              <td class="p-2 border border-center font-mono font-medium">${v.numNights}</td>
              <td class="p-2 border border-center font-mono font-medium">${v.numRooms}</td>
              <td class="p-2 border text-indigo-600 font-black">${v.roomType}</td>
              <td class="p-2 border font-semibold">${v.mealPlan}</td>
            </tr>
          </tbody>
        </table>

        <!-- Instructions -->
        <div class="space-y-3.5 text-xs">
          <div class="p-3 bg-slate-50 rounded-lg">
            <h5 class="text-[9px] uppercase font-black text-indigo-500 mb-1">Billing Instructions & Remittances</h5>
            <p class="text-slate-700 leading-relaxed font-medium">${v.billingInstructions}</p>
          </div>

          <div class="p-3 bg-slate-50 rounded-lg">
            <h5 class="text-[9px] uppercase font-black text-slate-500 mb-1">Special Guest Instructions</h5>
            <p class="text-slate-700 leading-relaxed font-medium">${v.specialRequests || "No extra requests logged."}</p>
          </div>

          <div class="p-3 bg-slate-50 rounded-lg">
            <h5 class="text-[9px] uppercase font-black text-slate-500 mb-1">General Policies</h5>
            <p class="text-[9px] text-slate-500 leading-relaxed">
              1. Guest must present a valid Government Photo ID (Aadhaar / Passport) during registration check-in.\n
              2. Hotel reserves check-in verification in case of non-matching passenger counts.\n
              3. Any extras (Telephone calls, laundry, room service, mini-bar) are not covered and must be settled by guest directly prior to checkout.
            </p>
          </div>
        </div>

        <!-- Footer Seal -->
        <div class="pt-8 border-t text-[10px] text-slate-400 flex justify-between items-end">
          <div>
            <p>Voucher generated digitally via South Indian Holidays secure backoffice portal.</p>
          </div>
          <div class="text-right">
            <p class="font-bold text-slate-700">South Indian Holidays & Asset Management Pvt. Ltd.</p>
            <p class="opacity-75">Corporate Operations Desk Signature</p>
          </div>
        </div>
      </div>
    `;

    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <Lucide.FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Travel Vouchers</h3>
            <p className="text-[10px] text-slate-500 font-semibold">Generate, authorize, and print hotel check-in and transport vouchers</p>
          </div>
        </div>
        <button
          onClick={openAddForm}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/10"
        >
          <Lucide.Plus className="w-4 h-4" />
          Generate Voucher
        </button>
      </div>

      {/* Form Panel (Add / Edit) */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 animate-fadeIn no-print">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h4 className="text-xs font-black uppercase text-indigo-400">
              {editingVoucher ? "Modify Voucher Variables" : "Lock New Service Voucher"}
            </h4>
            {/* Quick booking importer */}
            {!editingVoucher && safeBookings.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-400 uppercase font-black">Preload from booking:</span>
                <select
                  onChange={(e) => {
                    const bk = safeBookings.find(b => b.id === e.target.value);
                    if (bk) handleLoadBooking(bk);
                  }}
                  className="bg-slate-950 border border-slate-850 p-1.5 rounded-lg text-xs text-indigo-400 focus:outline-none"
                >
                  <option value="">-- Choose Booking --</option>
                  {safeBookings.map(b => (
                    <option key={b.id} value={b.id}>{b.customerName} ({b.id})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Guest Name *</label>
              <input
                type="text"
                required
                value={formFields.guestName}
                onChange={(e) => setFormFields(prev => ({ ...prev, guestName: e.target.value }))}
                placeholder="Client Name"
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Guest Mobile *</label>
              <input
                type="tel"
                required
                value={formFields.guestMobile}
                onChange={(e) => setFormFields(prev => ({ ...prev, guestMobile: e.target.value }))}
                placeholder="Mobile contact"
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Hotel Name *</label>
              <input
                type="text"
                required
                value={formFields.hotelName}
                onChange={(e) => setFormFields(prev => ({ ...prev, hotelName: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Check-In Date *</label>
              <input
                type="date"
                required
                value={formFields.checkInDate}
                onChange={(e) => setFormFields(prev => ({ ...prev, checkInDate: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-slate-300 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Check-Out Date *</label>
              <input
                type="date"
                required
                value={formFields.checkOutDate}
                onChange={(e) => setFormFields(prev => ({ ...prev, checkOutDate: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-slate-300 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Total Nights *</label>
              <input
                type="number"
                required
                value={formFields.numNights}
                onChange={(e) => setFormFields(prev => ({ ...prev, numNights: Number(e.target.value) }))}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Number of Rooms</label>
              <input
                type="number"
                value={formFields.numRooms}
                onChange={(e) => setFormFields(prev => ({ ...prev, numRooms: Number(e.target.value) }))}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Room Category</label>
              <input
                type="text"
                value={formFields.roomType}
                onChange={(e) => setFormFields(prev => ({ ...prev, roomType: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Meal Plan Category</label>
              <select
                value={formFields.mealPlan}
                onChange={(e) => setFormFields(prev => ({ ...prev, mealPlan: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-slate-300 focus:outline-none"
              >
                <option value="CP (Breakfast Only)">CP (Breakfast Only)</option>
                <option value="MAP (Breakfast + Dinner)">MAP (Breakfast + Dinner)</option>
                <option value="AP (All Meals Covered)">AP (All Meals Covered)</option>
                <option value="EP (Room Only)">EP (Room Only)</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Confirmation Number</label>
              <input
                type="text"
                value={formFields.confirmationNumber}
                onChange={(e) => setFormFields(prev => ({ ...prev, confirmationNumber: e.target.value }))}
                placeholder="Hotel side confirmation"
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none font-mono"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Hotel Physical Address</label>
              <input
                type="text"
                value={formFields.hotelAddress}
                onChange={(e) => setFormFields(prev => ({ ...prev, hotelAddress: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Compulsory Billing Instructions</label>
              <input
                type="text"
                value={formFields.billingInstructions}
                onChange={(e) => setFormFields(prev => ({ ...prev, billingInstructions: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Special Guest Requests</label>
              <input
                type="text"
                value={formFields.specialRequests}
                onChange={(e) => setFormFields(prev => ({ ...prev, specialRequests: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs text-slate-400 font-bold hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold px-5 py-2 rounded-lg text-white"
            >
              Authorize & Lock Voucher
            </button>
          </div>
        </form>
      )}

      {/* Vouchers listing Search */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap gap-3 items-center justify-between no-print animate-fadeIn">
        <div className="relative flex-1 min-w-[240px]">
          <Lucide.Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search active vouchers by guest name, hotel, ID..."
            className="w-full bg-slate-950 border border-slate-850 pl-9 pr-4 py-2 rounded-xl text-xs text-white focus:outline-none"
          />
        </div>
      </div>

      {/* Grid listing of generated vouchers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 no-print">
        {safeVouchers.filter(v => (v.guestName || "").toLowerCase().includes(search.toLowerCase()) || (v.hotelName || "").toLowerCase().includes(search.toLowerCase()) || (v.id || "").toLowerCase().includes(search.toLowerCase())).map(v => (
          <div key={v.id} className="bg-slate-900 border border-slate-850 hover:border-slate-800 p-5 rounded-2xl flex flex-col justify-between gap-4 transition-all hover:shadow-lg animate-fadeIn">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] font-mono text-slate-500 font-bold">{v.id}</span>
                  <h4 className="text-sm font-black text-white mt-0.5">{v.guestName}</h4>
                </div>
                <span className="text-[8px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  {v.bookingId}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <p className="flex items-center gap-1.5 text-slate-300 font-semibold">
                  <Lucide.Building className="w-3.5 h-3.5 text-amber-500" />
                  <span>{v.hotelName}</span>
                </p>
                <p className="flex items-center gap-1.5 text-slate-400 font-medium">
                  <Lucide.CalendarRange className="w-3.5 h-3.5 text-slate-500" />
                  <span>Check In: {formatFriendlyDate(v.checkInDate)}</span>
                </p>
                <p className="flex items-center gap-1.5 text-slate-400 font-medium">
                  <Lucide.Hotel className="w-3.5 h-3.5 text-slate-500" />
                  <span>Rooms: {v.numRooms}x {v.roomType} | {v.mealPlan}</span>
                </p>
                <p className="flex items-center gap-1.5 text-indigo-400 font-mono font-bold bg-slate-950 p-2 rounded-lg border border-slate-850">
                  <Lucide.KeyRound className="w-3.5 h-3.5" />
                  <span>Conf Code: {v.confirmationNumber || "AWAITING CONFIRMATION"}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-850 pt-3 text-xs">
              <span className="text-[10px] text-slate-500 font-mono">Nights: {v.numNights}</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => triggerPrintVoucher(v)}
                  className="p-1.5 text-emerald-400 hover:text-emerald-300 bg-slate-950 hover:bg-slate-850 rounded-lg border border-slate-850 cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                  title="Print Travel Voucher"
                >
                  <Lucide.Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button
                  onClick={() => openEditForm(v)}
                  className="p-1.5 text-indigo-400 hover:text-indigo-300 bg-slate-950 hover:bg-slate-850 rounded-lg border border-slate-850 cursor-pointer"
                  title="Edit parameters"
                >
                  <Lucide.Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm("Permanently discard this travel check-in voucher?")) {
                      onDeleteVoucher(v.id);
                    }
                  }}
                  className="p-1.5 text-rose-400 hover:text-rose-300 bg-slate-950 hover:bg-slate-850 rounded-lg border border-slate-850 cursor-pointer"
                  title="Discard"
                >
                  <Lucide.Trash className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {safeVouchers.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center text-slate-500 font-mono text-xs md:col-span-3">
            No travel vouchers generated yet. Preload from confirmed reservations above.
          </div>
        )}
      </div>
    </div>
  );
}
