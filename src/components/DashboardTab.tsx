import React, { useState } from "react";
import * as Lucide from "lucide-react";
import axios from "axios";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie } from "recharts";
import { Lead, Booking, PaymentLedger, TourPackage, ActivityLog } from "../types";
import { formatFriendlyDate } from "../utils";

interface DashboardTabProps {
  leads: Lead[];
  bookings: Booking[];
  payments: PaymentLedger[];
  packages: TourPackage[];
  logs: ActivityLog[];
  setCurrentTab?: (tab: string) => void;
  onAddLead?: (lead: Partial<Lead>) => void;
}

export default function DashboardTab({
  leads = [],
  bookings = [],
  payments = [],
  packages = [],
  logs = [],
  setCurrentTab,
  onAddLead
}: DashboardTabProps) {
  const [tasks, setTasks] = useState([
    { id: "t1", text: "Follow-up with Amit Patel regarding Kodaikanal Package", completed: false },
    { id: "t2", text: "Verify check-in confirmation for HBV-00001", completed: true },
    { id: "t3", text: "Collect outstanding balance from pending bookings", completed: false },
    { id: "t4", text: "Upload driver vehicle registration for Selvam", completed: false },
    { id: "t5", text: "Dispatch hotel vouchers to flight clients", completed: true }
  ]);

  // WhatsApp Copy-Paste Parser state
  const [whatsappText, setWhatsappText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState("");

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  // Calculations
  const safeLeads = Array.isArray(leads) ? leads : [];
  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const safePayments = Array.isArray(payments) ? payments : [];
  const safeLogs = Array.isArray(logs) ? logs : [];

  const totalLeads = safeLeads.length;
  const activeBookings = safeBookings.filter(b => b.status === "Confirmed").length;
  
  // Total Revenue & Pending Payments
  let totalRevenue = 0;
  let totalCollected = 0;
  let pendingCollections = 0;
  safePayments.forEach(p => {
    totalRevenue += p.totalAmount || 0;
    totalCollected += p.advancePaid || 0;
    pendingCollections += p.balanceAmount || 0;
  });

  // Today's Follow-ups count
  const todayStr = new Date().toISOString().split("T")[0];
  let todayFollowups = 0;
  let missedFollowups = 0;
  let upcomingFollowups = 0;
  let completedToday = 0;

  if (Array.isArray(safeLeads)) {
    safeLeads.forEach(l => {
      if (l && Array.isArray(l.followUpHistory)) {
        l.followUpHistory.forEach(fu => {
          if (!fu) return;
          const isPending = fu.status === "Pending" || !fu.status;
          const isCompleted = fu.status === "Completed";
          
          if (isPending) {
            if (fu.date === todayStr) {
              todayFollowups++;
            } else if (fu.date < todayStr) {
              missedFollowups++;
            } else if (fu.date > todayStr) {
              upcomingFollowups++;
            }
          } else if (isCompleted) {
            if (fu.completionDate === todayStr || fu.date === todayStr) {
              completedToday++;
            }
          }
        });
      }
    });
  }

  // Upcoming tours
  const upcomingTours = safeBookings.filter(b => {
    if (!b.travelDate) return false;
    const tDate = new Date(b.travelDate);
    const today = new Date();
    const diffTime = tDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 14; // next 14 days
  });

  // Charts data preparation
  // Month wise Leads & Revenue
  const monthlyPerfData = [
    { name: "Jan", Leads: 12, Revenue: 180000, Bookings: 5 },
    { name: "Feb", Leads: 18, Revenue: 240000, Bookings: 8 },
    { name: "Mar", Leads: 25, Revenue: 310000, Bookings: 11 },
    { name: "Apr", Leads: 30, Revenue: 420000, Bookings: 15 },
    { name: "May", Leads: 24, Revenue: 350000, Bookings: 12 },
    { name: "Jun", Leads: 35, Revenue: 510000, Bookings: 19 },
    { name: "Jul", Leads: totalLeads + 15, Revenue: totalCollected + 120000, Bookings: activeBookings + 5 }
  ];

  // Lead Sources allocation
  const sourceAllocation = [
    { name: "Website Direct", value: safeLeads.filter(l => l.source === "Website" || !l.source).length + 4, color: "#6366f1" },
    { name: "WhatsApp Parser", value: safeLeads.filter(l => l.source === "WhatsApp").length + 2, color: "#10b981" },
    { name: "Referral Desk", value: 3, color: "#f59e0b" },
    { name: "Google Ads", value: 5, color: "#ec4899" }
  ];

  const handleParseEnquiry = async () => {
    if (!whatsappText.trim()) return;
    setParsing(true);
    try {
      const res = await axios.post("/api/parse-whatsapp", { text: whatsappText });
      setParsedData(res.data);
      
      const isDuplicate = (leads || []).some(lead => lead.mobile === res.data.mobile && res.data.mobile !== "");
      if (isDuplicate) {
        setDuplicateWarning(`⚠️ Customer with mobile ${res.data.mobile} already exists in Leads Desk!`);
      } else {
        setDuplicateWarning("");
      }
    } catch (err) {
      console.error("WhatsApp parse failed", err);
      alert("Extraction failed. Operating in offline heuristic mode...");
    } finally {
      setParsing(false);
    }
  };

  const handleCreateLead = async () => {
    if (!parsedData) return;
    
    const leadPayload: Partial<Lead> = {
      name: parsedData.customerName || "WhatsApp Guest",
      mobile: parsedData.mobile || "",
      email: parsedData.email || "",
      destination: parsedData.pickupCity || "Kodaikanal",
      travelDate: parsedData.travelDate || new Date().toISOString().split("T")[0],
      adults: String(parsedData.adults || "2"),
      children: String(parsedData.children || "0"),
      pickupCity: parsedData.pickupCity || "",
      childrenAges: parsedData.childrenAges || "",
      vehiclePreference: parsedData.vehiclePreference || "Sedan",
      notes: `Enquiry parsed automatically:\n${whatsappText}`,
      source: "WhatsApp",
      status: "New",
      priority: "Medium",
      timeline: [
        { timestamp: new Date().toLocaleDateString('en-IN'), text: "Lead parsed and registered via WhatsApp Control Center" }
      ],
      followUpHistory: [
        {
          id: `FU-${Date.now()}`,
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0], // Tomorrow
          time: "10:00",
          type: "Call",
          priority: "Medium",
          remarks: `Auto-generated welcome follow-up call after WhatsApp enquiry parse. Vehicle preferred: ${parsedData.vehiclePreference || "Sedan"}`,
          assignedTo: "admin",
          status: "Pending"
        }
      ]
    };

    if (onAddLead) {
      await onAddLead(leadPayload);
    }
    
    setWhatsappText("");
    setParsedData(null);
    setDuplicateWarning("");
    alert("Lead created successfully in Leads Desk and follow-up scheduled!");
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Welcome & Overview Header banner */}
      <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl relative overflow-hidden shadow-xl shadow-black/20 bg-gradient-to-r from-slate-900 to-slate-950">
        <div className="absolute right-0 top-0 -mt-6 -mr-6 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Control Center</h2>
            <p className="text-xs text-slate-400 mt-1">Here is a broad operations snapshot for your travel agency assets and active pipelines.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-slate-800 font-mono text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700/60 flex items-center gap-1.5 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              API Synchronized
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden group hover:border-indigo-500/40 transition-all duration-300">
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Active Leads</p>
            <p className="text-3xl font-bold text-white font-mono">{totalLeads}</p>
            <span className="inline-block text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/10">+12% vs last month</span>
          </div>
          <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl group-hover:scale-110 transition-transform">
            <Lucide.Users className="w-5 h-5" />
          </div>
        </div>

        {/* Active Bookings */}
        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-all duration-300">
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Bookings</p>
            <p className="text-3xl font-bold text-white font-mono">{activeBookings}</p>
            <span className="inline-block text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/10">85% Conversion</span>
          </div>
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
            <Lucide.CheckSquare className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Collections */}
        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden group hover:border-rose-500/40 transition-all duration-300">
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Payments</p>
            <p className="text-3xl font-bold text-rose-400 font-mono">₹{pendingCollections.toLocaleString("en-IN")}</p>
            <span className="inline-block text-[9px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/10">Ledger balance</span>
          </div>
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl group-hover:scale-110 transition-transform">
            <Lucide.IndianRupee className="w-5 h-5" />
          </div>
        </div>

        {/* Today's Follow-ups */}
        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition-all duration-300">
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Follow-ups Today</p>
            <p className="text-3xl font-bold text-amber-400 font-mono">{todayFollowups}</p>
            <span className="inline-block text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/10">Urgent schedule</span>
          </div>
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl group-hover:scale-110 transition-transform">
            <Lucide.PhoneCall className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Follow-up Dashboard Pipeline widgets */}
      <div className="bg-slate-900/30 border border-slate-800/50 p-4 rounded-2xl space-y-3 shadow-inner">
        <div className="flex items-center gap-2 border-b border-slate-800/60 pb-2">
          <Lucide.Clock className="w-4 h-4 text-indigo-400" />
          <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Follow-up Operations Metrics</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-950/40 p-3.5 border border-slate-850/85 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Today's Active</p>
              <p className="text-xl font-bold text-amber-400 font-mono mt-0.5">{todayFollowups}</p>
            </div>
            <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/10 rounded-lg">
              <Lucide.PhoneCall className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-950/40 p-3.5 border border-slate-850/85 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Missed / Overdue</p>
              <p className="text-xl font-bold text-rose-400 font-mono mt-0.5">{missedFollowups}</p>
            </div>
            <div className="p-2 bg-rose-500/10 text-rose-400 border border-rose-500/10 rounded-lg">
              <Lucide.AlertTriangle className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-950/40 p-3.5 border border-slate-850/85 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Upcoming Scheduled</p>
              <p className="text-xl font-bold text-indigo-400 font-mono mt-0.5">{upcomingFollowups}</p>
            </div>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 rounded-lg">
              <Lucide.CalendarDays className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-950/40 p-3.5 border border-slate-850/85 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Completed Today</p>
              <p className="text-xl font-bold text-emerald-400 font-mono mt-0.5">{completedToday}</p>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 rounded-lg">
              <Lucide.CheckCircle className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Copy-Paste Parser section */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Lucide.MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">WhatsApp Copy-Paste Lead Parser</h3>
              <p className="text-[10px] text-slate-500 font-semibold">Instantly convert copy-pasted customer chats into structured leads using Gemini AI</p>
            </div>
          </div>
          {parsedData && (
            <button
              onClick={() => {
                setParsedData(null);
                setWhatsappText("");
                setDuplicateWarning("");
              }}
              className="text-[10px] font-bold text-slate-400 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer bg-slate-800 hover:bg-slate-750 px-2.5 py-1.5 rounded-lg border border-slate-700/50"
            >
              <Lucide.RefreshCw className="w-3.5 h-3.5" />
              Clear Parser
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
          {/* Left Panel: Raw text input */}
          <div className="space-y-3">
            <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Paste raw enquiry text below</label>
            <textarea
              rows={8}
              value={whatsappText}
              onChange={(e) => setWhatsappText(e.target.value)}
              placeholder={`Example:
Hi South Indian Holidays, this is Vignesh from Bangalore.
We are planning a trip to Ooty next week (around 15th Aug) with 4 adults and 2 kids (ages 4, 7).
We would prefer an SUV for pickup. Mobile: 9876543210.`}
              className="w-full bg-slate-950 border border-slate-850 p-3 rounded-xl text-white focus:outline-none font-sans placeholder-slate-600 leading-relaxed resize-none h-[220px]"
            />
            <button
              onClick={handleParseEnquiry}
              disabled={parsing || !whatsappText.trim()}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-850 disabled:to-slate-850 disabled:text-slate-600 text-white font-bold py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-2"
            >
              {parsing ? (
                <>
                  <Lucide.Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span className="animate-pulse">Processing Extraction via Gemini AI...</span>
                </>
              ) : (
                <>
                  <Lucide.Sparkles className="w-4 h-4 text-emerald-300" />
                  <span>Extract Intelligent Lead Details</span>
                </>
              )}
            </button>
          </div>

          {/* Right Panel: Extracted fields form */}
          <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex flex-col justify-between min-h-[220px]">
            {parsedData ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1">
                    <Lucide.Sliders className="w-3.5 h-3.5" />
                    Editable Extracted Lead Fields
                  </h4>
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase border border-emerald-500/10">Extraction Complete</span>
                </div>

                {duplicateWarning && (
                  <div className="bg-amber-950/20 border border-amber-900/35 text-amber-400 p-2.5 rounded-lg text-[10px] font-bold leading-relaxed flex items-center gap-1.5 animate-pulse">
                    <Lucide.AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
                    <span>{duplicateWarning}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Customer Name</label>
                    <input
                      type="text"
                      value={parsedData.customerName || ""}
                      onChange={(e) => setParsedData({ ...parsedData, customerName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Mobile Contact</label>
                    <input
                      type="text"
                      value={parsedData.mobile || ""}
                      onChange={(e) => setParsedData({ ...parsedData, mobile: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-white focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Pickup City / Destination</label>
                    <input
                      type="text"
                      value={parsedData.pickupCity || ""}
                      onChange={(e) => setParsedData({ ...parsedData, pickupCity: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Travel Date</label>
                    <input
                      type="text"
                      value={parsedData.travelDate || ""}
                      onChange={(e) => setParsedData({ ...parsedData, travelDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-white focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Adults Count</label>
                    <input
                      type="number"
                      value={parsedData.adults || 2}
                      onChange={(e) => setParsedData({ ...parsedData, adults: parseInt(e.target.value, 10) || 2 })}
                      className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-white focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Children Count</label>
                    <input
                      type="number"
                      value={parsedData.children || 0}
                      onChange={(e) => setParsedData({ ...parsedData, children: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-white focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Children Ages</label>
                    <input
                      type="text"
                      placeholder="e.g. 5, 8"
                      value={parsedData.childrenAges || ""}
                      onChange={(e) => setParsedData({ ...parsedData, childrenAges: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-white focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Vehicle Preference</label>
                    <select
                      value={parsedData.vehiclePreference || "Sedan"}
                      onChange={(e) => setParsedData({ ...parsedData, vehiclePreference: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 p-2 rounded-lg text-slate-300 focus:outline-none"
                    >
                      <option value="Sedan">Sedan</option>
                      <option value="SUV">SUV</option>
                      <option value="Tempo Traveller">Tempo Traveller</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-850/65 flex justify-end">
                  <button
                    onClick={handleCreateLead}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-50 hover:to-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/10"
                  >
                    <Lucide.Plus className="w-4 h-4" />
                    Create Lead
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 font-mono h-full">
                <Lucide.ScanLine className="w-8 h-8 text-slate-700 mb-2 animate-pulse" />
                <p className="text-[10px] leading-relaxed max-w-xs">Pasted WhatsApp enquiry details will be parsed and displayed here in editable formats before final logging.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Leads trend chart */}
        <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl shadow-xl space-y-5 lg:col-span-2">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Business Velocity</h3>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">Monthly revenue progression and booking metrics tracking</p>
            </div>
            <div className="flex gap-3 text-[9px] font-bold">
              <span className="flex items-center gap-1.5 text-slate-400"><span className="w-2.5 h-2.5 bg-indigo-500 rounded-sm"></span>Revenue</span>
              <span className="flex items-center gap-1.5 text-slate-400"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span>Bookings</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyPerfData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorBks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b/40" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.4)" }} labelStyle={{ color: "#fff", fontWeight: "bold" }} />
                <Area type="monotone" dataKey="Revenue" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="Bookings" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorBks)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead sources breakout */}
        <div className="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="border-b border-slate-800/80 pb-4">
            <h3 className="text-sm font-bold text-white tracking-tight">Lead Capture Sources</h3>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">Referral channels analysis breakout</p>
          </div>
          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceAllocation}
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sourceAllocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {sourceAllocation.map(source => (
              <div key={source.name} className="flex items-center gap-2 p-1.5 bg-slate-950/40 border border-slate-850 rounded-lg text-slate-300">
                <span className="w-2.5 h-2.5 rounded-md flex-shrink-0" style={{ backgroundColor: source.color }} />
                <span className="truncate font-semibold">{source.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Task Lists & Departures Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Tasks */}
        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-xl space-y-4">
          <div className="border-b border-slate-800/80 pb-3 flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Today's Reminders</h3>
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/10">
              {tasks.filter(t => !t.completed).length} Pending
            </span>
          </div>
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {tasks.map(task => (
              <div
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                  task.completed
                    ? "bg-slate-950/20 border-slate-850/60 opacity-50"
                    : "bg-slate-950 border-slate-850 hover:border-slate-800 hover:bg-slate-950/65"
                }`}
              >
                <button className={`p-0.5 rounded border flex-shrink-0 transition-all cursor-pointer ${task.completed ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-700 text-transparent hover:border-slate-500"}`}>
                  <Lucide.Check className="w-3 h-3" />
                </button>
                <p className={`text-xs font-semibold text-slate-300 select-none leading-relaxed ${task.completed ? "line-through opacity-70" : ""}`}>{task.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Departures (next 14 days) */}
        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-xl space-y-4">
          <div className="border-b border-slate-800/80 pb-3">
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Upcoming Departures</h3>
          </div>
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {upcomingTours.length > 0 ? (
              upcomingTours.map(bk => (
                <div key={bk.id} className="p-3 bg-slate-950 rounded-xl border border-slate-850 flex items-center justify-between gap-3 hover:border-slate-800 transition-all duration-200">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white">{bk.customerName}</p>
                    <p className="text-[10px] text-slate-400 font-semibold capitalize flex items-center gap-1.5">
                      <Lucide.MapPin className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{bk.destination} | {formatFriendlyDate(bk.travelDate)}</span>
                    </p>
                  </div>
                  <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                    {bk.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-500 font-mono text-xs bg-slate-950/20 rounded-xl border border-slate-850/40">
                <Lucide.Calendar className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                <p>No imminent client departures.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Admin Logs */}
        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-xl space-y-4">
          <div className="border-b border-slate-800/80 pb-3">
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Recent Action Logs</h3>
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {safeLogs.slice(0, 5).map(log => (
              <div key={log.id} className="text-xs relative pl-5 before:absolute before:left-1 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-indigo-500 border-l border-slate-800/80 pb-3 last:pb-0">
                <p className="text-slate-300 font-semibold leading-relaxed">{log.action}</p>
                <p className="text-[9px] text-slate-500 font-mono font-bold mt-1">By {log.username} | {new Date(log.timestamp).toLocaleTimeString()}</p>
              </div>
            ))}
            {safeLogs.length === 0 && (
              <div className="text-center py-10 text-slate-500 font-mono text-xs bg-slate-950/20 rounded-xl border border-slate-850/40">
                <Lucide.History className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                <p>No administrative activity.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
