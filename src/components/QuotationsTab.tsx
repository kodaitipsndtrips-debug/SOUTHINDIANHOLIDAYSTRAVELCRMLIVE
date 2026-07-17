import React, { useState } from "react";
import * as Lucide from "lucide-react";
import { TourPackage, Lead } from "../types";

interface QuotationsTabProps {
  packages: TourPackage[];
  leads: Lead[];
  selectedPkgFromLibrary: TourPackage | null;
  clearSelectedPkg: () => void;
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

export default function QuotationsTab({
  packages = [],
  leads = [],
  selectedPkgFromLibrary,
  clearSelectedPkg,
  companySettings
}: QuotationsTabProps) {
  const safePackages = Array.isArray(packages) ? packages : [];
  const safeLeads = Array.isArray(leads) ? leads : [];

  // Quotation General State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [destination, setDestination] = useState("kodaikanal");
  const [travelDate, setTravelDate] = useState("");
  const [duration, setDuration] = useState("3 Days / 2 Nights");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

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
      setDuration(matchingPkg.duration);
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
      setDuration(selectedPkgFromLibrary.duration);
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

  // Print Action
  const triggerPrintEstimate = () => {
    const printArea = document.getElementById("print-canvas");
    if (!printArea) return;

    // Build print HTML content
    printArea.innerHTML = `
      <div class="print-invoice max-w-4xl mx-auto p-8 text-black bg-white">
        <!-- Header -->
        <div class="flex justify-between items-start border-b-2 border-slate-900 pb-4">
          <div class="flex items-start gap-4">
            ${companySettings?.logo ? `<img src="${companySettings.logo}" alt="Company Logo" class="w-16 h-16 object-contain rounded-lg border border-slate-200 p-1" referrerPolicy="no-referrer" />` : ""}
            <div>
              <h1 class="text-xl font-bold uppercase tracking-tight text-slate-900">${companySettings?.companyName || "South Indian Holidays"}</h1>
              <p class="text-xs text-slate-500 max-w-sm mt-1">${companySettings?.address || ""}</p>
              <p class="text-[10px] text-slate-600 mt-1 font-mono">GSTIN: ${companySettings?.gstNumber || ""} | Phone: ${companySettings?.phone || ""}</p>
            </div>
          </div>
          <div class="text-right">
            <h2 class="text-2xl font-black text-slate-800 uppercase tracking-widest">ESTIMATE</h2>
            <p class="text-xs text-slate-500 font-mono mt-1">Ref: SIH-EST-${Date.now().toString().substring(6)}</p>
            <p class="text-xs text-slate-500 font-mono">Date: ${new Date().toLocaleDateString("en-IN")}</p>
          </div>
        </div>

        <!-- Customer details -->
        <div class="grid grid-cols-2 gap-4 py-4 text-xs">
          <div class="p-3 bg-slate-50 rounded-lg">
            <h4 class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Prepared For:</h4>
            <p class="font-black text-slate-800 text-sm">${customerName || "Valued Client"}</p>
            <p class="mt-0.5">Contact: ${customerPhone || "N/A"}</p>
            <p>Email: ${customerEmail || "N/A"}</p>
          </div>
          <div class="p-3 bg-slate-50 rounded-lg">
            <h4 class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Vacation Parameters:</h4>
            <p class="capitalize"><strong>Destination:</strong> ${destination}</p>
            <p><strong>Departure Date:</strong> ${travelDate || "Flexible"}</p>
            <p><strong>Duration:</strong> ${duration}</p>
            <p><strong>Pax Group:</strong> ${adults} Adults, ${children} Kids</p>
          </div>
        </div>

        <!-- Pricing items -->
        <table class="w-full text-xs text-left border-collapse mt-4">
          <thead>
            <tr class="bg-slate-900 text-white font-bold uppercase text-[9px] tracking-wider">
              <th class="p-2">#</th>
              <th class="p-2">Item / Service Details</th>
              <th class="p-2 text-center">HSN/SAC</th>
              <th class="p-2 text-center">Qty</th>
              <th class="p-2 text-right">Rate (₹)</th>
              <th class="p-2 text-center">GST</th>
              <th class="p-2 text-right">Total (₹)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            ${quoteItems.map((item, idx) => `
              <tr>
                <td class="p-2 text-slate-500">${idx + 1}</td>
                <td class="p-2 font-bold">${item.name}</td>
                <td class="p-2 text-center text-slate-600 font-mono">${item.hsn}</td>
                <td class="p-2 text-center font-mono">${item.qty}</td>
                <td class="p-2 text-right font-mono">${item.rate.toLocaleString("en-IN")}</td>
                <td class="p-2 text-center font-mono">${item.gst}%</td>
                <td class="p-2 text-right font-mono font-bold">${(item.rate * item.qty).toLocaleString("en-IN")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <!-- Summary column -->
        <div class="grid grid-cols-2 gap-4 mt-6 text-xs">
          <!-- Terms -->
          <div class="p-3 bg-slate-50 rounded-lg">
            <h4 class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Estimate Terms & Conditions</h4>
            <p class="text-[9px] text-slate-600 leading-relaxed whitespace-pre-line">${termsLibrary[termsIndex].text}</p>
          </div>
          <!-- Totals -->
          <div class="space-y-1.5 p-3 bg-slate-100 rounded-lg self-start">
            <div class="flex justify-between">
              <span>Subtotal:</span>
              <span class="font-mono font-medium">₹${subTotal.toLocaleString("en-IN")}</span>
            </div>
            <div class="flex justify-between">
              <span>GST Surcharge:</span>
              <span class="font-mono font-medium">₹${totalGst.toLocaleString("en-IN")}</span>
            </div>
            ${discountPercent > 0 ? `
              <div class="flex justify-between text-rose-600 font-bold">
                <span>Discount (${discountPercent}%):</span>
                <span class="font-mono">-₹${discountVal.toLocaleString("en-IN")}</span>
              </div>
            ` : ""}
            <div class="flex justify-between border-t border-slate-300 pt-1.5 font-black text-slate-800 text-sm">
              <span>Estimated Total:</span>
              <span class="font-mono text-slate-900">₹${finalTotal.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        <!-- Remittance bank details -->
        <div class="mt-8 pt-4 border-t border-slate-200 text-[10px] text-slate-500 grid grid-cols-2 gap-4">
          <div>
            <h5 class="font-bold uppercase text-slate-700">Bank Transfer Account Details</h5>
            <p class="mt-1">Bank Name: ${companySettings?.bankName || ""}</p>
            <p>A/C Number: ${companySettings?.bankAccount || ""}</p>
            <p>IFSC Code: ${companySettings?.bankIfsc || ""}</p>
            <p>UPI ID: ${companySettings?.upiId || ""}</p>
          </div>
          <div class="text-right flex flex-col justify-end">
            <p>Corporate seal & verified invoice authorization</p>
            <p class="font-bold text-slate-800 mt-2">South Indian Holidays & Asset Management Pvt. Ltd.</p>
          </div>
        </div>
      </div>
    `;

    // Trigger standard browser printing
    window.print();
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
        <button
          onClick={triggerPrintEstimate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/10"
        >
          <Lucide.Printer className="w-4 h-4" />
          Print Estimate (PDF)
        </button>
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
                    <option value="kodaikanal">Kodaikanal</option>
                    <option value="ooty">Ooty</option>
                    <option value="coorg">Coorg</option>
                    <option value="munnar">Munnar</option>
                    <option value="mysore">Mysore</option>
                    <option value="alleppey">Alleppey</option>
                    <option value="pondicherry">Pondicherry</option>
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
    </div>
  );
}
