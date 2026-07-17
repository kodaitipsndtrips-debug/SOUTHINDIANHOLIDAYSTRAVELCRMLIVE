import React, { useState } from "react";
import * as Lucide from "lucide-react";
import axios from "axios";
import { Lead, FollowUp, User } from "../types";
import { parseWhatsAppChat, getLocalDateString, formatFriendlyDate } from "../utils";

interface LeadsTabProps {
  leads: Lead[];
  onAddLead: (lead: Partial<Lead>) => void;
  onUpdateLead: (id: string, lead: Partial<Lead>) => void;
  onDeleteLead: (id: string) => void;
  users: User[];
  currentUsername: string;
  onOpenWhatsAppChat?: (mobile: string) => void;
}

export default function LeadsTab({
  leads = [],
  onAddLead,
  onUpdateLead,
  onDeleteLead,
  users = [],
  currentUsername,
  onOpenWhatsAppChat
}: LeadsTabProps) {
  const safeLeads = Array.isArray(leads) ? leads : [];
  const safeUsers = Array.isArray(users) ? users : [];

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterDest, setFilterDest] = useState("all");
  
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  
  // WhatsApp Parser State
  const [showWhatsAppParser, setShowWhatsAppParser] = useState(false);
  const [whatsappPaste, setWhatsappPaste] = useState("");
  const [parsingWhatsApp, setParsingWhatsApp] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState("");

  // Lead Modal / Detail States
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const [whatsappHistory, setWhatsappHistory] = useState<any[]>([]);
  const [whatsappConvId, setWhatsappConvId] = useState<string>("");

  React.useEffect(() => {
    if (!viewingLead) {
      setWhatsappHistory([]);
      setWhatsappConvId("");
      return;
    }

    const fetchLeadWhatsappHistory = async () => {
      try {
        const res = await axios.get("/api/whatsapp/conversations");
        const cleanMobile = cleanTargetMobile(viewingLead.mobile);
        const match = res.data.find((c: any) => c.mobile.replace(/\D/g, "") === cleanMobile);
        if (match) {
          setWhatsappConvId(match.id);
          const msgRes = await axios.get(`/api/whatsapp/conversations/${match.id}/messages`);
          setWhatsappHistory(msgRes.data || []);
        }
      } catch (err) {
        console.error("Failed to load whatsapp timeline history for lead", err);
      }
    };

    fetchLeadWhatsappHistory();
  }, [viewingLead]);

  const cleanTargetMobile = (mob: string) => {
    let clean = mob.replace(/\D/g, "");
    if (clean.length === 10) {
      clean = "91" + clean;
    }
    return clean;
  };

  const [showFollowupForm, setShowFollowupForm] = useState(false);
  const [newFollowup, setNewFollowup] = useState({
    date: getLocalDateString(),
    time: "10:00",
    type: "Call",
    priority: "Medium" as const,
    remarks: "",
    assignedTo: currentUsername,
    status: "Pending" as const
  });

  // Doc Upload States
  const [docCategory, setDocCategory] = useState("Passport");
  const [isUploading, setIsUploading] = useState(false);

  // Form Fields
  const [leadForm, setLeadForm] = useState({
    name: "",
    mobile: "",
    email: "",
    destination: "kodaikanal",
    travelDate: getLocalDateString(),
    adults: "2",
    children: "0",
    budget: 15000,
    notes: "",
    status: "New" as const,
    priority: "Medium" as const,
    source: "Website",
    assignedTo: currentUsername,
    tagsText: "",
    // New fields
    pickupCity: "",
    childrenAges: "",
    vehiclePreference: "Sedan"
  });

  // Open Lead Form for Add
  const openAddForm = () => {
    setEditingLead(null);
    setLeadForm({
      name: "",
      mobile: "",
      email: "",
      destination: "kodaikanal",
      travelDate: getLocalDateString(),
      adults: "2",
      children: "0",
      budget: 15000,
      notes: "",
      status: "New",
      priority: "Medium",
      source: "Website",
      assignedTo: currentUsername,
      tagsText: "",
      pickupCity: "",
      childrenAges: "",
      vehiclePreference: "Sedan"
    });
    setShowForm(true);
  };

  // Open Lead Form for Edit
  const openEditForm = (lead: Lead) => {
    setEditingLead(lead);
    setLeadForm({
      name: lead.name,
      mobile: lead.mobile,
      email: lead.email,
      destination: lead.destination,
      travelDate: lead.travelDate,
      adults: lead.adults,
      children: lead.children,
      budget: lead.budget || 15000,
      notes: lead.notes,
      status: lead.status,
      priority: lead.priority,
      source: lead.source || "Website",
      assignedTo: lead.assignedTo || currentUsername,
      tagsText: (lead.tags || []).join(", "),
      pickupCity: lead.pickupCity || "",
      childrenAges: lead.childrenAges || "",
      vehiclePreference: lead.vehiclePreference || "Sedan"
    });
    setShowForm(true);
  };

  // Run WhatsApp Chat Parser
  const runParser = async () => {
    if (!whatsappPaste.trim()) return;
    setParsingWhatsApp(true);
    setDuplicateWarning("");
    try {
      const res = await axios.post("/api/parse-whatsapp", { text: whatsappPaste });
      const parsed = res.data;
      
      setLeadForm(prev => ({
        ...prev,
        name: parsed.customerName || prev.name,
        mobile: parsed.mobile || prev.mobile,
        destination: parsed.pickupCity || prev.destination,
        pickupCity: parsed.pickupCity || prev.pickupCity || "",
        travelDate: parsed.travelDate || prev.travelDate,
        adults: String(parsed.adults || prev.adults),
        children: String(parsed.children || prev.children),
        childrenAges: parsed.childrenAges || prev.childrenAges || "",
        vehiclePreference: parsed.vehiclePreference || prev.vehiclePreference || "Sedan",
        notes: `Intelligent Extraction from WhatsApp:\n${whatsappPaste}\n\n${prev.notes}`,
        source: "WhatsApp"
      }));

      // Check duplicate
      const isDuplicate = safeLeads.some(l => l.mobile === parsed.mobile && parsed.mobile !== "");
      if (isDuplicate) {
        setDuplicateWarning(`⚠️ Customer with mobile ${parsed.mobile} already exists in Lead Desk!`);
      } else {
        setDuplicateWarning("");
      }

      setShowWhatsAppParser(false);
      setWhatsappPaste("");
    } catch (err) {
      console.error("Failed to run intelligent parser", err);
      alert("AI extraction failed. Operating with offline heuristic fallback...");
      const parsedHeuristic = parseWhatsAppChat(whatsappPaste);
      setLeadForm(prev => ({
        ...prev,
        name: parsedHeuristic.name || prev.name,
        mobile: parsedHeuristic.mobile || prev.mobile,
        destination: parsedHeuristic.destination || prev.destination,
        adults: parsedHeuristic.adults || prev.adults,
        children: parsedHeuristic.children || prev.children,
        travelDate: parsedHeuristic.travelDate || prev.travelDate,
        notes: `Extracted from chat:\n${parsedHeuristic.notes}\n\n${prev.notes}`,
        source: "WhatsApp"
      }));
      setShowWhatsAppParser(false);
      setWhatsappPaste("");
    } finally {
      setParsingWhatsApp(false);
    }
  };

  // Form Submit Handler
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tagsArray = leadForm.tagsText
      ? leadForm.tagsText.split(",").map(t => t.trim()).filter(Boolean)
      : [];

    const payload: Partial<Lead> = {
      name: leadForm.name,
      mobile: leadForm.mobile,
      email: leadForm.email,
      destination: leadForm.destination,
      travelDate: leadForm.travelDate,
      adults: leadForm.adults,
      children: leadForm.children,
      budget: Number(leadForm.budget),
      notes: leadForm.notes,
      status: leadForm.status,
      priority: leadForm.priority,
      source: leadForm.source,
      assignedTo: leadForm.assignedTo,
      tags: tagsArray,
      pickupCity: leadForm.pickupCity,
      childrenAges: leadForm.childrenAges,
      vehiclePreference: leadForm.vehiclePreference
    };

    if (editingLead) {
      onUpdateLead(editingLead.id, payload);
    } else {
      onAddLead(payload);
    }
    setShowForm(false);
  };

  // Add FollowUp Sub-action
  const handleAddFollowup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingLead) return;

    const followUps = [...(viewingLead.followUpHistory || [])];
    const newFuItem: FollowUp = {
      id: `FU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: newFollowup.date,
      time: newFollowup.time,
      type: newFollowup.type,
      priority: newFollowup.priority,
      remarks: newFollowup.remarks,
      assignedTo: newFollowup.assignedTo,
      status: newFollowup.status
    };

    followUps.unshift(newFuItem);

    const timeline = [...viewingLead.timeline];
    timeline.unshift({
      timestamp: new Date().toLocaleDateString("en-IN"),
      text: `Scheduled new follow-up [${newFuItem.type}]: ${newFuItem.remarks}`
    });

    onUpdateLead(viewingLead.id, {
      followUpHistory: followUps,
      timeline
    });

    // Refresh viewing lead state
    setViewingLead({
      ...viewingLead,
      followUpHistory: followUps,
      timeline
    });

    setShowFollowupForm(false);
    setNewFollowup(prev => ({ ...prev, remarks: "" }));
  };

  // Handle Document upload
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !viewingLead) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        const docs = [...(viewingLead.documents || [])];
        docs.push({
          name: data.name || file.name,
          url: data.url,
          category: docCategory
        });

        const timeline = [...viewingLead.timeline];
        timeline.unshift({
          timestamp: new Date().toLocaleDateString("en-IN"),
          text: `Uploaded profile document: ${docCategory} (${file.name})`
        });

        onUpdateLead(viewingLead.id, {
          documents: docs,
          timeline
        });

        setViewingLead({
          ...viewingLead,
          documents: docs,
          timeline
        });
      }
    } catch (err) {
      console.error("Document upload failed", err);
    } finally {
      setIsUploading(false);
    }
  };

  // Filter logic
  const filteredLeads = safeLeads.filter(l => {
    const term = search.toLowerCase();
    const matchesSearch =
      l.name.toLowerCase().includes(term) ||
      l.mobile.includes(term) ||
      l.id.toLowerCase().includes(term) ||
      l.destination.toLowerCase().includes(term);

    const matchesStatus = filterStatus === "all" || l.status === filterStatus;
    const matchesPriority = filterPriority === "all" || l.priority === filterPriority;
    const matchesDest = filterDest === "all" || l.destination === filterDest;

    return matchesSearch && matchesStatus && matchesPriority && matchesDest;
  });

  return (
    <div className="space-y-4">
      {/* Title block */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <Lucide.Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Leads & Sales pipelines</h3>
            <p className="text-[10px] text-slate-500 font-semibold">Track client acquisitions, follow-ups, and documentation vaults</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowWhatsAppParser(!showWhatsAppParser)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Lucide.MessageSquareCode className="w-4 h-4" />
            Paste WhatsApp Chat
          </button>
          <button
            onClick={openAddForm}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/10"
          >
            <Lucide.Plus className="w-4 h-4" />
            Add New Lead
          </button>
        </div>
      </div>

      {/* WhatsApp Chat Parser Drawer */}
      {showWhatsAppParser && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h4 className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5">
              <Lucide.MessageSquareCode className="w-4 h-4" />
              WhatsApp Intelligent Lead Extractor
            </h4>
            <button onClick={() => setShowWhatsAppParser(false)} className="text-slate-400 hover:text-white"><Lucide.X className="w-4 h-4" /></button>
          </div>
          <p className="text-[10px] text-slate-400">Paste standard chat histories below (e.g. "Name: Rohan, Destination: Munnar, Date: 12th Aug..."). Our AI engine will auto-extract profile parameters instantly.</p>
          <textarea
            value={whatsappPaste}
            onChange={(e) => setWhatsappPaste(e.target.value)}
            disabled={parsingWhatsApp}
            placeholder="Paste your WhatsApp text conversation here..."
            className="w-full h-32 bg-slate-950 border border-slate-850 p-3 rounded-xl text-xs text-white focus:outline-none font-mono placeholder:text-slate-600"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowWhatsAppParser(false)} disabled={parsingWhatsApp} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">Cancel</button>
            <button
              onClick={runParser}
              disabled={parsingWhatsApp || !whatsappPaste.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 text-xs font-bold px-4 py-1.5 rounded-lg text-white flex items-center gap-1.5"
            >
              {parsingWhatsApp ? (
                <>
                  <Lucide.Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Extracting AI Parameters...</span>
                </>
              ) : (
                <span>Extract & Populate Form</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Interactive Lead Form (Add / Edit) */}
      {showForm && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 animate-fadeIn">
          <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-indigo-400">
              {editingLead ? "Modify Lead Record" : "Register New Prospect"}
            </h4>
            {duplicateWarning && (
              <span className="text-[10px] bg-rose-950 border border-rose-900/30 text-rose-400 px-3 py-1 rounded-full font-bold uppercase animate-pulse">Duplicate Alert</span>
            )}
          </div>

          {duplicateWarning && (
            <div className="bg-rose-950/20 border border-rose-900/25 p-3 rounded-xl text-[10px] text-rose-400 font-bold flex items-center gap-2">
              <Lucide.AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{duplicateWarning}</span>
            </div>
          )}
          <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Customer Name *</label>
              <input
                type="text"
                required
                value={leadForm.name}
                onChange={(e) => setLeadForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Amit Patel"
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Mobile Contact *</label>
              <input
                type="tel"
                required
                value={leadForm.mobile}
                onChange={(e) => setLeadForm(prev => ({ ...prev, mobile: e.target.value }))}
                placeholder="e.g. 9876543210"
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Email Address</label>
              <input
                type="email"
                value={leadForm.email}
                onChange={(e) => setLeadForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="e.g. customer@gmail.com"
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Travel Destination</label>
              <select
                value={leadForm.destination}
                onChange={(e) => setLeadForm(prev => ({ ...prev, destination: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-slate-300 focus:outline-none capitalize"
              >
                <option value="kodaikanal">Kodaikanal</option>
                <option value="ooty">Ooty</option>
                <option value="coorg">Coorg</option>
                <option value="munnar">Munnar Hills</option>
                <option value="mysore">Mysore</option>
                <option value="alleppey">Alleppey Houseboats</option>
                <option value="pondicherry">Pondicherry</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Target Date</label>
              <input
                type="date"
                value={leadForm.travelDate}
                onChange={(e) => setLeadForm(prev => ({ ...prev, travelDate: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-slate-300 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Adults Count</label>
              <input
                type="number"
                value={leadForm.adults}
                onChange={(e) => setLeadForm(prev => ({ ...prev, adults: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Children Count</label>
              <input
                type="number"
                value={leadForm.children}
                onChange={(e) => setLeadForm(prev => ({ ...prev, children: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Budget Allocation (₹)</label>
              <input
                type="number"
                value={leadForm.budget}
                onChange={(e) => setLeadForm(prev => ({ ...prev, budget: Number(e.target.value) }))}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Deal Status</label>
              <select
                value={leadForm.status}
                onChange={(e) => setLeadForm(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-slate-300 focus:outline-none"
              >
                <option value="New">New Lead</option>
                <option value="Contacted">Contacted</option>
                <option value="Proposal Sent">Proposal Sent</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Won">Won (Deal Locked)</option>
                <option value="Lost">Lost</option>
                <option value="Hot">Hot Prospect</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Priority</label>
              <select
                value={leadForm.priority}
                onChange={(e) => setLeadForm(prev => ({ ...prev, priority: e.target.value as any }))}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-slate-300 focus:outline-none"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Lead Source</label>
              <input
                type="text"
                value={leadForm.source}
                onChange={(e) => setLeadForm(prev => ({ ...prev, source: e.target.value }))}
                placeholder="e.g. Website, WhatsApp, Google"
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Category Tags (comma sep)</label>
              <input
                type="text"
                value={leadForm.tagsText}
                onChange={(e) => setLeadForm(prev => ({ ...prev, tagsText: e.target.value }))}
                placeholder="e.g. Honeymoon, Summer Hills"
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Pickup City</label>
              <input
                type="text"
                value={leadForm.pickupCity}
                onChange={(e) => setLeadForm(prev => ({ ...prev, pickupCity: e.target.value }))}
                placeholder="e.g. Bangalore"
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Children's Ages</label>
              <input
                type="text"
                value={leadForm.childrenAges}
                onChange={(e) => setLeadForm(prev => ({ ...prev, childrenAges: e.target.value }))}
                placeholder="e.g. 5, 8"
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Vehicle Preference</label>
              <select
                value={leadForm.vehiclePreference}
                onChange={(e) => setLeadForm(prev => ({ ...prev, vehiclePreference: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-slate-300 focus:outline-none"
              >
                <option value="Sedan">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="Tempo Traveller">Tempo Traveller</option>
              </select>
            </div>
            <div className="md:col-span-4">
              <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Detailed Client Requirements</label>
              <textarea
                value={leadForm.notes}
                onChange={(e) => setLeadForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Specify specific requirements like room views, infant requests, pick-up points..."
                className="w-full h-20 bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none resize-none"
              />
            </div>
            <div className="md:col-span-4 flex justify-end gap-3 pt-2">
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
                Save Prospect File
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Leads Listing and Search */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Lucide.Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads by name, mobile, ID, sector..."
            className="w-full bg-slate-950 border border-slate-850 pl-9 pr-4 py-2 rounded-xl text-xs text-white focus:outline-none placeholder:text-slate-600"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Status filters */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">-- All Statuses --</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Proposal Sent">Proposal Sent</option>
            <option value="Negotiation">Negotiation</option>
            <option value="Won">Won</option>
            <option value="Lost">Lost</option>
            <option value="Hot">Hot</option>
          </select>

          {/* Priority filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">-- All Priorities --</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
      </div>

      {/* Grid of Leads */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredLeads.map(lead => {
          const statusColors: any = {
            New: "bg-blue-950 text-blue-400 border-blue-900",
            Contacted: "bg-indigo-950 text-indigo-400 border-indigo-900",
            "Proposal Sent": "bg-yellow-950 text-yellow-400 border-yellow-900",
            Negotiation: "bg-orange-950 text-orange-400 border-orange-900",
            Won: "bg-emerald-950 text-emerald-400 border-emerald-900",
            Lost: "bg-rose-950 text-rose-500 border-rose-900",
            Hot: "bg-red-950 text-red-400 border-red-900"
          };

          const priorityColors: any = {
            High: "bg-rose-950 text-rose-400",
            Medium: "bg-amber-950 text-amber-400",
            Low: "bg-slate-950 text-slate-500"
          };

          return (
            <div
              key={lead.id}
              className="bg-slate-900 border border-slate-850 hover:border-slate-800 p-5 rounded-2xl flex flex-col justify-between gap-4 transition-all hover:shadow-lg shadow-indigo-500/5 animate-fadeIn"
            >
              {/* Card Top */}
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-mono font-bold text-slate-500">{lead.id}</span>
                    <h4 className="text-sm font-black text-white tracking-tight mt-0.5">{lead.name}</h4>
                  </div>
                  <span className={`text-[9px] uppercase font-bold px-2 py-0.5 border rounded-full ${statusColors[lead.status] || "bg-slate-950"}`}>
                    {lead.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <p className="flex items-center gap-1.5 text-slate-300 font-semibold">
                    <Lucide.Smartphone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{lead.mobile}</span>
                  </p>
                  <p className="flex items-center gap-1.5 text-slate-400 font-medium capitalize">
                    <Lucide.MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{lead.destination} ({lead.adults}A + {lead.children}C)</span>
                  </p>
                  <p className="flex items-center gap-1.5 text-slate-400 font-medium">
                    <Lucide.Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Departure: {formatFriendlyDate(lead.travelDate)}</span>
                  </p>
                  {lead.budget && (
                    <p className="flex items-center gap-1.5 text-emerald-400 font-bold font-mono">
                      <Lucide.IndianRupee className="w-3.5 h-3.5 text-emerald-500" />
                      <span>₹{lead.budget.toLocaleString("en-IN")}</span>
                    </p>
                  )}
                </div>

                {/* Tags list */}
                {Array.isArray(lead.tags) && lead.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {lead.tags.map(tag => (
                      <span key={tag} className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Bottom / Actions */}
              <div className="flex items-center justify-between border-t border-slate-850 pt-3">
                <span className={`text-[8px] uppercase font-black px-1.5 py-0.5 rounded ${priorityColors[lead.priority]}`}>
                  {lead.priority} Priority
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      let cleanMobile = lead.mobile.replace(/\D/g, "");
                      if (cleanMobile.length === 10) {
                        cleanMobile = "91" + cleanMobile;
                      }
                      const welcomeMsg = `Namaste ${lead.name},\n\nGreetings from South Indian Holidays! 🌴🎒\n\nThank you for contacting us. We have received your query for a tour to ${lead.destination.toUpperCase()} around ${formatFriendlyDate(lead.travelDate)}.\n\nOur tour planning experts are compiling a customized, premium itinerary for you. We will share the details very shortly!\n\nWarm Regards,\nSouth Indian Holidays`;
                      window.open(`https://wa.me/${cleanMobile}?text=${encodeURIComponent(welcomeMsg)}`, "_blank", "noopener,noreferrer");
                    }}
                    className="p-1.5 text-emerald-400 hover:text-emerald-300 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-900/30 rounded-lg cursor-pointer"
                    title="Send Welcome Greeting via WhatsApp"
                  >
                    <Lucide.MessageSquare className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewingLead(lead)}
                    className="p-1.5 text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-850 rounded-lg border border-slate-850 cursor-pointer"
                    title="Profile & Timeline"
                  >
                    <Lucide.Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => openEditForm(lead)}
                    className="p-1.5 text-indigo-400 hover:text-indigo-300 bg-slate-950 hover:bg-slate-850 rounded-lg border border-slate-850 cursor-pointer"
                    title="Edit Prospect"
                  >
                    <Lucide.Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this prospect lead file?")) {
                        onDeleteLead(lead.id);
                      }
                    }}
                    className="p-1.5 text-rose-400 hover:text-rose-300 bg-slate-950 hover:bg-slate-850 rounded-lg border border-slate-850 cursor-pointer"
                    title="Delete Prospect"
                  >
                    <Lucide.Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filteredLeads.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center text-slate-500 font-mono text-xs md:col-span-3">
            No active client leads matched the search criteria.
          </div>
        )}
      </div>

      {/* Detailed View Modal (Timeline & Follow-ups scheduler) */}
      {viewingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-4xl space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-850">
              <div className="flex items-center gap-2">
                <Lucide.UserCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-black uppercase text-white tracking-wider">
                  Lead Profile: {viewingLead.name} ({viewingLead.id})
                </h3>
              </div>
              <button onClick={() => setViewingLead(null)} className="text-slate-400 hover:text-white cursor-pointer"><Lucide.X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* LHS Profile Parameters */}
              <div className="space-y-4 md:col-span-1 bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Profile Information</h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-black">Destination:</span>
                    <p className="text-white capitalize font-semibold">{viewingLead.destination}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-black">Travel Date:</span>
                    <p className="text-white font-medium">{formatFriendlyDate(viewingLead.travelDate)}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-black">Party Count:</span>
                    <p className="text-white font-medium">{viewingLead.adults} Adults, {viewingLead.children} Kids</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-black">Lead Source:</span>
                    <p className="text-slate-300 font-medium">{viewingLead.source || "Website"}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-black">Assigned Agent:</span>
                    <p className="text-slate-300 font-medium">{viewingLead.assignedTo || "None"}</p>
                  </div>
                  {onOpenWhatsAppChat && (
                    <div className="pt-1 pb-1">
                      <button
                        onClick={() => {
                          onOpenWhatsAppChat(viewingLead.mobile);
                          setViewingLead(null);
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] uppercase tracking-wider py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-lg cursor-pointer"
                      >
                        <Lucide.MessageCircleCode className="w-4 h-4" />
                        Open Live WhatsApp Chat
                      </button>
                    </div>
                  )}
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase font-black">Current Notes:</span>
                    <p className="text-slate-300 leading-relaxed max-h-32 overflow-y-auto bg-slate-950 p-2 rounded-lg border border-slate-900 mt-1 whitespace-pre-line font-medium text-[11px]">
                      {viewingLead.notes || "No extra notes logged."}
                    </p>
                  </div>
                </div>

                {/* Documents locker */}
                <div className="border-t border-slate-850 pt-3 space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                    <span>Documents Locker</span>
                    <Lucide.ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  </h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {Array.isArray(viewingLead.documents) && viewingLead.documents.map((doc, idx) => (
                      <a
                        key={idx}
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2 bg-slate-950 rounded-lg hover:bg-slate-900 border border-slate-850 hover:border-slate-800 transition-all text-[11px]"
                      >
                        <span className="text-indigo-400 font-bold truncate pr-2">{doc.category}: {doc.name}</span>
                        <Lucide.ExternalLink className="w-3 h-3 text-slate-500" />
                      </a>
                    ))}
                    {(!Array.isArray(viewingLead.documents) || viewingLead.documents.length === 0) && (
                      <p className="text-[10px] text-slate-500 font-mono py-2 text-center">No documents uploaded.</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <select
                      value={docCategory}
                      onChange={(e) => setDocCategory(e.target.value)}
                      className="bg-slate-950 border border-slate-850 p-1 rounded text-[10px] text-slate-300"
                    >
                      <option value="Passport">Passport</option>
                      <option value="Visa">Visa</option>
                      <option value="Aadhaar">Aadhaar Card</option>
                      <option value="PAN">PAN Card</option>
                      <option value="Flight Ticket">Flight Ticket</option>
                      <option value="Hotel Voucher">Hotel Voucher</option>
                    </select>
                    <label className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-2 py-1.5 rounded flex items-center justify-center gap-1 cursor-pointer transition-all">
                      <Lucide.Upload className="w-3 h-3" />
                      {isUploading ? "Uploading..." : "Upload File"}
                      <input type="file" onChange={handleDocUpload} className="hidden" disabled={isUploading} />
                    </label>
                  </div>
                </div>
              </div>

              {/* RHS Timeline & Followup Log */}
              <div className="space-y-4 md:col-span-2">
                <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Follow-up Schedules & Timeline</h4>
                  <button
                    onClick={() => setShowFollowupForm(!showFollowupForm)}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded cursor-pointer"
                  >
                    {showFollowupForm ? "Hide Form" : "+ Add Follow-up"}
                  </button>
                </div>

                {/* Scheduling Followup Form inside Lead */}
                {showFollowupForm && (
                  <form onSubmit={handleAddFollowup} className="p-4 bg-slate-950 rounded-xl border border-indigo-500/20 space-y-3 animate-fadeIn">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Date *</label>
                        <input
                          type="date"
                          required
                          value={newFollowup.date}
                          onChange={(e) => setNewFollowup(prev => ({ ...prev, date: e.target.value }))}
                          className="w-full bg-slate-900 border border-slate-850 p-1.5 rounded text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Time *</label>
                        <input
                          type="time"
                          required
                          value={newFollowup.time}
                          onChange={(e) => setNewFollowup(prev => ({ ...prev, time: e.target.value }))}
                          className="w-full bg-slate-900 border border-slate-850 p-1.5 rounded text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Channel Type</label>
                        <select
                          value={newFollowup.type}
                          onChange={(e) => setNewFollowup(prev => ({ ...prev, type: e.target.value }))}
                          className="w-full bg-slate-900 border border-slate-850 p-1.5 rounded text-xs text-slate-300 focus:outline-none"
                        >
                          <option value="Call">Phone Call</option>
                          <option value="WhatsApp">WhatsApp Message</option>
                          <option value="Email">Email Send</option>
                          <option value="Visit">In-person Visit</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Priority</label>
                        <select
                          value={newFollowup.priority}
                          onChange={(e) => setNewFollowup(prev => ({ ...prev, priority: e.target.value as any }))}
                          className="w-full bg-slate-900 border border-slate-850 p-1.5 rounded text-xs text-slate-300 focus:outline-none"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Follow-up Notes / Goal *</label>
                      <input
                        type="text"
                        required
                        value={newFollowup.remarks}
                        onChange={(e) => setNewFollowup(prev => ({ ...prev, remarks: e.target.value }))}
                        placeholder="e.g. Call to finalize transport dates"
                        className="w-full bg-slate-900 border border-slate-850 p-2 rounded text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2 text-xs">
                      <button type="button" onClick={() => setShowFollowupForm(false)} className="px-2 py-1 text-slate-400">Cancel</button>
                      <button type="submit" className="bg-indigo-600 px-3 py-1 rounded text-white font-bold">Schedule</button>
                    </div>
                  </form>
                )}

                {/* Active timelines & Activity history logs */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Followups timeline */}
                  <div className="space-y-2 bg-slate-950/20 p-3 rounded-xl border border-slate-850/40">
                    <h5 className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Scheduled Follow-ups</h5>
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {Array.isArray(viewingLead.followUpHistory) && viewingLead.followUpHistory.map(fu => (
                        <div key={fu.id} className="p-2.5 bg-slate-950 rounded-xl border border-slate-850 flex flex-col gap-1 text-[11px]">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-300 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                              {fu.type}
                            </span>
                            <span className={`text-[8px] px-1 rounded uppercase font-bold ${fu.status === "Completed" ? "bg-emerald-950 text-emerald-400" : "bg-amber-950 text-amber-400"}`}>
                              {fu.status}
                            </span>
                          </div>
                          <p className="text-slate-400 leading-relaxed">{fu.remarks}</p>
                          <p className="text-[9px] text-slate-500 font-mono">Scheduled: {fu.date} at {fu.time}</p>
                        </div>
                      ))}
                      {(!Array.isArray(viewingLead.followUpHistory) || viewingLead.followUpHistory.length === 0) && (
                        <p className="text-[10px] text-slate-500 font-mono py-4 text-center">No follow-ups logged.</p>
                      )}
                    </div>
                  </div>

                  {/* Customer Timeline logs */}
                  <div className="space-y-2 bg-slate-950/20 p-3 rounded-xl border border-slate-850/40">
                    <h5 className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Action History Log</h5>
                    <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                      {Array.isArray(viewingLead.timeline) && viewingLead.timeline.map((log, idx) => (
                        <div key={idx} className="text-[11px] relative pl-4 before:absolute before:left-0.5 before:top-1.5 before:w-1 before:h-1 before:rounded-full before:bg-indigo-400">
                          <p className="text-slate-300 leading-relaxed">{log.text}</p>
                          <p className="text-[9px] text-slate-500 font-mono font-bold mt-0.5">{log.timestamp}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* WhatsApp Chat timeline */}
                  <div className="space-y-2 bg-slate-950/20 p-3 rounded-xl border border-slate-850/40">
                    <h5 className="text-[9px] uppercase font-black text-emerald-500 tracking-wider flex items-center gap-1.5">
                      <Lucide.MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp Chat History
                    </h5>
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {Array.isArray(whatsappHistory) && whatsappHistory.map((m, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded-xl text-[11px] leading-relaxed max-w-[90%] border ${
                            m.sender === "agent"
                              ? "bg-emerald-950/25 border-emerald-900/30 text-emerald-200 ml-auto"
                              : "bg-[#202c33]/70 border-[#202c33]/40 text-slate-100 mr-auto"
                          }`}
                        >
                          <div className="flex justify-between items-center gap-2 mb-0.5">
                            <span className="font-bold text-[9px] text-slate-400 capitalize">{m.senderName || m.sender}</span>
                            <span className="text-[8px] text-slate-500 font-mono">
                              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p>{m.text}</p>
                          {m.attachmentUrl && (
                            <div className="mt-1 pt-1 border-t border-slate-850 flex items-center gap-1 text-[9px] text-indigo-300 font-bold">
                              <Lucide.FileText className="w-3 h-3" />
                              PDF Attached
                            </div>
                          )}
                        </div>
                      ))}
                      {(!Array.isArray(whatsappHistory) || whatsappHistory.length === 0) && (
                        <div className="flex flex-col items-center justify-center py-6 text-center text-slate-500">
                          <Lucide.MessageSquareDashed className="w-6 h-6 text-slate-600 mb-1" />
                          <p className="text-[10px] font-mono leading-relaxed">No WhatsApp chats found.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-850">
              <button
                onClick={() => setViewingLead(null)}
                className="bg-slate-800 hover:bg-slate-750 text-xs font-bold px-4 py-2 rounded-lg text-slate-300 transition-all"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
