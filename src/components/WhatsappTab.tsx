import React, { useState, useEffect, useRef } from "react";
import * as Lucide from "lucide-react";
import axios from "axios";
import { Lead, Booking, PaymentLedger, Driver, WhatsAppTemplate, WhatsAppLog, WhatsAppConversation, WhatsAppMessage } from "../types";
import { formatFriendlyDate } from "../utils";

interface WhatsappTabProps {
  leads: Lead[];
  bookings: Booking[];
  vouchers: any[];
  payments: PaymentLedger[];
  drivers: Driver[];
  companySettings: any;
  currentUser: any;
  preselectedMobile?: string;
  clearPreselectedMobile?: () => void;
}

export default function WhatsappTab({
  leads = [],
  bookings = [],
  vouchers = [],
  payments = [],
  drivers = [],
  companySettings,
  currentUser,
  preselectedMobile = "",
  clearPreselectedMobile
}: WhatsappTabProps) {
  const safeLeads = Array.isArray(leads) ? leads : [];
  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const safeVouchers = Array.isArray(vouchers) ? vouchers : [];
  const safePayments = Array.isArray(payments) ? payments : [];
  const safeDrivers = Array.isArray(drivers) ? drivers : [];

  const [activeSubTab, setActiveSubTab] = useState<"inbox" | "sandbox" | "templates" | "logs">("inbox");
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  
  // Conversations and Messages states
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string>("");
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [usersList, setUsersList] = useState<any[]>([]);
  
  // Document states
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);

  const safeTemplates = Array.isArray(templates) ? templates : [];
  const safeLogs = Array.isArray(logs) ? logs : [];
  const safeConversations = Array.isArray(conversations) ? conversations : [];
  const safeMessages = Array.isArray(messages) ? messages : [];
  const safeUsersList = Array.isArray(usersList) ? usersList : [];
  const safeItineraries = Array.isArray(itineraries) ? itineraries : [];
  const safeQuotations = Array.isArray(quotations) ? quotations : [];

  // Sandbox compilation states
  const [selectedCategory, setSelectedCategory] = useState<string>("Leads");
  const [selectedRecordId, setSelectedRecordId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [customMobile, setCustomMobile] = useState<string>("");
  const [customName, setCustomName] = useState<string>("");
  const [compiledMessage, setCompiledMessage] = useState<string>("");
  
  // Attachment variables
  const [isAttachmentOpen, setIsAttachmentOpen] = useState<boolean>(false);
  const [attachmentType, setAttachmentType] = useState<"itinerary" | "quotation" | "voucher" | "invoice" | "receipt" | null>(null);
  const [attachmentRecordId, setAttachmentRecordId] = useState<string>("");

  // Templates CRUD states
  const [isEditingTemplate, setIsEditingTemplate] = useState<boolean>(false);
  const [templateForm, setTemplateForm] = useState<Partial<WhatsAppTemplate>>({
    id: "",
    name: "",
    category: "Leads",
    message: ""
  });

  // Filters for logs
  const [logSearch, setLogSearch] = useState<string>("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial collections
  useEffect(() => {
    fetchTemplates();
    fetchLogs();
    fetchConversations();
    fetchUsers();
    fetchItinerariesAndQuotations();
  }, []);

  const fetchItinerariesAndQuotations = async () => {
    try {
      const [itnRes, qtRes] = await Promise.all([
        axios.get("/api/itineraries").catch(() => ({ data: [] })),
        axios.get("/api/leads").catch(() => ({ data: [] }))
      ]);
      setItineraries(Array.isArray(itnRes.data) ? itnRes.data : []);
      const rawLeads = Array.isArray(qtRes.data) ? qtRes.data : [];
      const mappedQuotes = rawLeads.map((l: any) => ({
        id: `QT-${l.id.split("-").pop() || "1001"}`,
        customerName: l.name,
        totalAmount: l.budget || 15000
      }));
      setQuotations(mappedQuotes);
    } catch (err) {
      console.error("Failed to load documents", err);
    }
  };

  // Handle preselected Mobile redirect from Leads Tab
  useEffect(() => {
    if (!preselectedMobile) return;

    const handlePreselection = async () => {
      const cleanTarget = preselectedMobile.replace(/\D/g, "");
      // Search in current conversations
      let match = conversations.find(c => c.mobile.replace(/\D/g, "") === cleanTarget);

      if (match) {
        setActiveSubTab("inbox");
        handleSelectConversation(match.id);
        if (clearPreselectedMobile) clearPreselectedMobile();
      } else {
        // Find lead name for initialization
        const lead = leads.find(l => l.mobile.replace(/\D/g, "") === cleanTarget);
        try {
          const res = await axios.post("/api/whatsapp/conversations", {
            customerName: lead ? lead.name : "Direct Client",
            mobile: preselectedMobile,
            assignedTo: currentUser?.username || "admin"
          });
          const newConv = res.data;
          setConversations(prev => [newConv, ...prev]);
          setActiveSubTab("inbox");
          handleSelectConversation(newConv.id);
          if (clearPreselectedMobile) clearPreselectedMobile();
        } catch (err) {
          console.error("Failed to create preselected conversation on fly", err);
        }
      }
    };

    if (conversations.length > 0) {
      handlePreselection();
    }
  }, [preselectedMobile, conversations, leads, currentUser]);

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const res = await axios.get("/api/whatsapp/conversations");
      setConversations(res.data);
      if (res.data.length > 0 && !selectedConvId) {
        handleSelectConversation(res.data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch conversations", err);
    }
  };

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      const res = await axios.get("/api/whatsapp/templates");
      setTemplates(res.data);
    } catch (err) {
      console.error("Failed to fetch WhatsApp templates", err);
    }
  };

  // Fetch logs
  const fetchLogs = async () => {
    try {
      const res = await axios.get("/api/whatsapp/logs");
      setLogs(res.data);
    } catch (err) {
      console.error("Failed to fetch WhatsApp logs", err);
    }
  };

  // Fetch Users list
  const fetchUsers = async () => {
    try {
      const res = await axios.get("/api/users");
      setUsersList(res.data || []);
    } catch (err) {
      console.error("Failed to fetch CRM users for assignment", err);
    }
  };

  // Select conversation & fetch messages
  const handleSelectConversation = async (convId: string) => {
    setSelectedConvId(convId);
    try {
      const res = await axios.get(`/api/whatsapp/conversations/${convId}/messages`);
      setMessages(res.data);
      // Mark as read
      await axios.put(`/api/whatsapp/conversations/${convId}/read`);
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c));
    } catch (err) {
      console.error("Failed to fetch conversation messages", err);
    }
  };

  // Real-time WebSocket subscription
  useEffect(() => {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.host}`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message_received") {
          const { message, conversation } = data;
          
          setConversations(prev => {
            const exists = prev.some(c => c.id === conversation.id);
            if (exists) {
              return prev.map(c => c.id === conversation.id ? {
                ...c,
                lastMessage: conversation.lastMessage,
                lastTimestamp: conversation.lastTimestamp,
                unreadCount: selectedConvId === conversation.id ? 0 : conversation.unreadCount
              } : c).sort((a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime());
            } else {
              return [conversation, ...prev];
            }
          });

          if (selectedConvId === message.conversationId) {
            setMessages(prev => {
              if (prev.some(m => m.id === message.id)) return prev;
              return [...prev, message];
            });
            // Mark as read immediately on client side
            axios.put(`/api/whatsapp/conversations/${message.conversationId}/read`).catch(console.error);
          }
        } else if (data.type === "conversation_updated") {
          const { conversation } = data;
          setConversations(prev => prev.map(c => c.id === conversation.id ? { ...c, ...conversation } : c));
        }
      } catch (err) {
        console.error("WebSocket payload error", err);
      }
    };

    return () => {
      socket.close();
    };
  }, [selectedConvId]);

  // Auto Scroll Chat body to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Active Conversation Accessor
  const activeConv = conversations.find(c => c.id === selectedConvId);

  // Dynamic Bracket Replacer for Active Customer Template selection
  const compileForActiveCustomer = (tplText: string) => {
    if (!activeConv) return tplText;
    let text = tplText;

    const mobileClean = activeConv.mobile.replace(/\D/g, "");
    const matchingLead = leads.find(l => l.mobile.replace(/\D/g, "") === mobileClean);
    const matchingBooking = bookings.find(b => b.customerMobile.replace(/\D/g, "") === mobileClean);
    const matchingVoucher = vouchers.find(v => v.guestMobile?.replace(/\D/g, "") === mobileClean);
    const matchingPayment = payments.find(p => p.bookingId === matchingBooking?.id);

    // Fallbacks
    const customerName = activeConv.customerName;
    const destination = matchingLead?.destination || matchingBooking?.destination || "South India";
    const travelDate = matchingLead?.travelDate || matchingBooking?.travelDate || "soon";
    const adults = matchingLead?.adults || matchingBooking?.adults || "2";
    const children = matchingLead?.children || matchingBooking?.children || "0";

    text = text
      .replace(/{companyName}/g, companySettings?.companyName || "South Indian Holidays")
      .replace(/{companyPhone}/g, companySettings?.phone || "+91 94433 12345")
      .replace(/{companyWebsite}/g, companySettings?.website || "www.southindianholidays.com")
      .replace(/{bankName}/g, companySettings?.bankName || "HDFC Bank")
      .replace(/{bankAccount}/g, companySettings?.bankAccount || "502000845942")
      .replace(/{bankIfsc}/g, companySettings?.bankIfsc || "HDFC0001243")
      .replace(/{upiId}/g, companySettings?.upiId || "sih@upi")
      .replace(/{customerName}/g, customerName)
      .replace(/{destination}/g, destination.toUpperCase())
      .replace(/{travelDate}/g, travelDate)
      .replace(/{adults}/g, String(adults))
      .replace(/{children}/g, String(children))
      .replace(/{budget}/g, matchingLead?.budget ? `₹${matchingLead.budget}` : "₹15,000")
      .replace(/{bookingId}/g, matchingBooking?.id || "SIH-BK-1001")
      .replace(/{packagePrice}/g, matchingBooking ? String(matchingBooking.packagePrice) : "14500")
      .replace(/{advancePaid}/g, matchingPayment ? String(matchingPayment.advancePaid) : "10000")
      .replace(/{balanceAmount}/g, matchingPayment ? String(matchingPayment.balanceAmount) : "4500")
      .replace(/{hotelName}/g, matchingVoucher?.hotelName || "Hotel Hilltop Tower")
      .replace(/{checkInDate}/g, matchingVoucher?.checkInDate || "2026-07-15")
      .replace(/{checkOutDate}/g, matchingVoucher?.checkOutDate || "2026-07-17")
      .replace(/{roomType}/g, matchingVoucher?.roomType || "Standard Room")
      .replace(/{mealPlan}/g, matchingVoucher?.mealPlan || "CP (Complimentary Breakfast)")
      .replace(/{numRooms}/g, matchingVoucher ? String(matchingVoucher.numRooms) : "1")
      .replace(/{numAdults}/g, matchingVoucher ? String(matchingVoucher.numAdults) : "2")
      .replace(/{numChildren}/g, matchingVoucher ? String(matchingVoucher.numChildren) : "0")
      .replace(/{confirmationNumber}/g, matchingVoucher?.confirmationNumber || "SIH-CONF-984")
      .replace(/{driverName}/g, drivers[0]?.name || "Muthu Pandi")
      .replace(/{driverMobile}/g, drivers[0]?.mobile || "9842104561")
      .replace(/{vehicleType}/g, drivers[0]?.vehicleType || "Sedan")
      .replace(/{vehicleNo}/g, drivers[0]?.vehicleNo || "TN-57-AD-1234");

    return text;
  };

  // Compile specific message template (wt-X) and fill chatInput
  const handleApplyTemplate = (tpl: WhatsAppTemplate) => {
    const text = compileForActiveCustomer(tpl.message);
    setChatInput(text);
  };

  // Send WhatsApp message inside Inbox
  const handleSendMessage = async (e?: React.FormEvent, customPayload?: { attachmentUrl?: string; attachmentType?: 'pdf' | 'image' }) => {
    if (e) e.preventDefault();
    if (!selectedConvId) return;
    if (!chatInput.trim() && !customPayload) return;

    try {
      const payload = {
        text: chatInput,
        senderName: currentUser?.fullName || "Agent",
        ...customPayload
      };

      const res = await axios.post(`/api/whatsapp/conversations/${selectedConvId}/messages`, payload);
      
      setMessages(prev => [...prev, res.data]);
      setChatInput("");
      setIsAttachmentOpen(false);
      setAttachmentType(null);
      setAttachmentRecordId("");

      // Refresh last activity locally
      setConversations(prev => prev.map(c => c.id === selectedConvId ? {
        ...c,
        lastMessage: res.data.text,
        lastTimestamp: res.data.timestamp
      } : c).sort((a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime()));

    } catch (err) {
      console.error("Failed to transmit WhatsApp message", err);
    }
  };

  // Handle document attachment submit
  const handleAttachDocument = () => {
    if (!attachmentType || !attachmentRecordId) return;

    let attachmentUrl = "";
    let captionText = "";

    switch (attachmentType) {
      case "itinerary":
        attachmentUrl = `/api/itineraries/${attachmentRecordId}/pdf`;
        captionText = `Sharing dynamic travel itinerary: ${attachmentRecordId}`;
        break;
      case "quotation":
        attachmentUrl = `/api/quotations/${attachmentRecordId}/pdf`;
        captionText = `Sharing customized holiday quotation: ${attachmentRecordId}`;
        break;
      case "voucher":
        attachmentUrl = `/api/vouchers/${attachmentRecordId}/pdf`;
        captionText = `Sharing hotel stay voucher: ${attachmentRecordId}`;
        break;
      case "invoice":
        attachmentUrl = `/api/bookings/${attachmentRecordId}/invoice`;
        captionText = `Sharing booking ledger invoice: ${attachmentRecordId}`;
        break;
      case "receipt":
        attachmentUrl = `/api/payments/${attachmentRecordId}/receipt`;
        captionText = `Sharing remittance payment receipt: ${attachmentRecordId}`;
        break;
    }

    handleSendMessage(undefined, {
      attachmentUrl,
      attachmentType: "pdf"
    });
  };

  // Change active user assignment
  const handleAssignAgent = async (username: string) => {
    if (!selectedConvId) return;
    try {
      const res = await axios.put(`/api/whatsapp/conversations/${selectedConvId}/assign`, { assignedTo: username });
      setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, assignedTo: username } : c));
    } catch (err) {
      console.error("Failed to assign agent", err);
    }
  };

  // Sandbox Compiler effect
  useEffect(() => {
    if (!selectedTemplateId) {
      setCompiledMessage("");
      return;
    }

    const tpl = templates.find(t => t.id === selectedTemplateId);
    if (!tpl) return;

    let text = tpl.message;

    text = text
      .replace(/{companyName}/g, companySettings?.companyName || "South Indian Holidays")
      .replace(/{companyPhone}/g, companySettings?.phone || "+91 94433 12345")
      .replace(/{companyWebsite}/g, companySettings?.website || "www.southindianholidays.com")
      .replace(/{bankName}/g, companySettings?.bankName || "")
      .replace(/{bankAccount}/g, companySettings?.bankAccount || "")
      .replace(/{bankIfsc}/g, companySettings?.bankIfsc || "")
      .replace(/{upiId}/g, companySettings?.upiId || "");

    if (selectedCategory === "Leads" && selectedRecordId) {
      const lead = leads.find(l => l.id === selectedRecordId);
      if (lead) {
        text = text
          .replace(/{customerName}/g, lead.name)
          .replace(/{destination}/g, lead.destination.toUpperCase())
          .replace(/{travelDate}/g, formatFriendlyDate(lead.travelDate))
          .replace(/{adults}/g, lead.adults || "2")
          .replace(/{children}/g, lead.children || "0")
          .replace(/{budget}/g, lead.budget ? `₹${lead.budget}` : "TBD");
        
        if (lead.mobile && !customMobile) {
          setCustomMobile(lead.mobile);
        }
        setCustomName(lead.name);
      }
    } else if (selectedCategory === "Bookings" && selectedRecordId) {
      const bk = bookings.find(b => b.id === selectedRecordId);
      if (bk) {
        const pay = payments.find(p => p.bookingId === bk.id);
        text = text
          .replace(/{customerName}/g, bk.customerName)
          .replace(/{bookingId}/g, bk.id)
          .replace(/{destination}/g, bk.destination.toUpperCase())
          .replace(/{travelDate}/g, formatFriendlyDate(bk.travelDate))
          .replace(/{adults}/g, String(bk.adults))
          .replace(/{children}/g, String(bk.children))
          .replace(/{packagePrice}/g, String(bk.packagePrice))
          .replace(/{advancePaid}/g, String(pay?.advancePaid || 0))
          .replace(/{balanceAmount}/g, String(pay?.balanceAmount || bk.packagePrice));
        
        if (bk.customerMobile && !customMobile) {
          setCustomMobile(bk.customerMobile);
        }
        setCustomName(bk.customerName);
      }
    } else if (selectedCategory === "Vouchers" && selectedRecordId) {
      const vc = vouchers.find(v => v.id === selectedRecordId);
      if (vc) {
        text = text
          .replace(/{customerName}/g, vc.guestName)
          .replace(/{destination}/g, vc.destination.toUpperCase())
          .replace(/{hotelName}/g, vc.hotelName)
          .replace(/{checkInDate}/g, formatFriendlyDate(vc.checkInDate))
          .replace(/{checkOutDate}/g, formatFriendlyDate(vc.checkOutDate))
          .replace(/{roomType}/g, vc.roomType)
          .replace(/{mealPlan}/g, vc.mealPlan)
          .replace(/{numRooms}/g, String(vc.numRooms))
          .replace(/{numAdults}/g, String(vc.numAdults))
          .replace(/{numChildren}/g, String(vc.numChildren))
          .replace(/{confirmationNumber}/g, vc.confirmationNumber || "Awaiting");
        
        if (vc.guestMobile && !customMobile) {
          setCustomMobile(vc.guestMobile);
        }
        setCustomName(vc.guestName);
      }
    } else if (selectedCategory === "Payments" && selectedRecordId) {
      const pay = payments.find(p => p.id === selectedRecordId);
      if (pay) {
        const bk = bookings.find(b => b.id === pay.bookingId);
        text = text
          .replace(/{customerName}/g, pay.customerName)
          .replace(/{destination}/g, bk ? bk.destination.toUpperCase() : "TOUR")
          .replace(/{totalAmount}/g, String(pay.totalAmount))
          .replace(/{advancePaid}/g, String(pay.advancePaid))
          .replace(/{balanceAmount}/g, String(pay.balanceAmount));
        
        if (bk?.customerMobile && !customMobile) {
          setCustomMobile(bk.customerMobile);
        }
        setCustomName(pay.customerName);
      }
    } else if (selectedCategory === "Fleet" && selectedRecordId) {
      const drv = drivers.find(d => d.id === selectedRecordId);
      if (drv) {
        text = text
          .replace(/{driverName}/g, drv.name)
          .replace(/{driverMobile}/g, drv.mobile)
          .replace(/{vehicleType}/g, drv.vehicleType)
          .replace(/{vehicleNo}/g, drv.vehicleNo);

        if (bookings.length > 0) {
          const firstBk = bookings[0];
          text = text
            .replace(/{customerName}/g, firstBk.customerName)
            .replace(/{destination}/g, firstBk.destination.toUpperCase());
          setCustomMobile(firstBk.customerMobile || "");
          setCustomName(firstBk.customerName);
        }
      }
    }

    setCompiledMessage(text);
  }, [selectedCategory, selectedRecordId, selectedTemplateId, templates]);

  useEffect(() => {
    setSelectedRecordId("");
    const matchedTpls = safeTemplates.filter(t => t.category.toLowerCase() === selectedCategory.toLowerCase());
    if (matchedTpls.length > 0) {
      setSelectedTemplateId(matchedTpls[0].id);
    } else {
      setSelectedTemplateId("");
    }
  }, [selectedCategory, templates]);

  // CRUD Template Submit
  const handleSaveTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (templateForm.id) {
        const res = await axios.put(`/api/whatsapp/templates/${templateForm.id}`, templateForm);
        setTemplates(prev => prev.map(t => t.id === templateForm.id ? res.data : t));
      } else {
        const res = await axios.post("/api/whatsapp/templates", templateForm);
        setTemplates(prev => [...prev, res.data]);
      }
      setIsEditingTemplate(false);
      setTemplateForm({ id: "", name: "", category: "Leads", message: "" });
    } catch (err) {
      console.error("Failed to save template", err);
    }
  };

  const handleEditTemplateClick = (tpl: WhatsAppTemplate) => {
    setTemplateForm({ ...tpl });
    setIsEditingTemplate(true);
  };

  const handleDeleteTemplateClick = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;
    try {
      await axios.delete(`/api/whatsapp/templates/${id}`);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error("Failed to delete template", err);
    }
  };

  // Click-to-chat redirection
  const handleTriggerSend = async (method: "web" | "mobile") => {
    if (!customMobile) {
      alert("Please provide a valid recipient WhatsApp phone number.");
      return;
    }
    if (!compiledMessage) {
      alert("No message content compiled to send.");
      return;
    }

    let cleanMobile = customMobile.replace(/\D/g, "");
    if (cleanMobile.length === 10) {
      cleanMobile = "91" + cleanMobile;
    }

    const encodedText = encodeURIComponent(compiledMessage);
    const url = method === "web"
      ? `https://web.whatsapp.com/send?phone=${cleanMobile}&text=${encodedText}`
      : `https://wa.me/${cleanMobile}?text=${encodedText}`;

    try {
      const activeTpl = templates.find(t => t.id === selectedTemplateId);
      await axios.post("/api/whatsapp/logs", {
        customerName: customName || "Direct Contact",
        mobile: cleanMobile,
        templateName: activeTpl ? activeTpl.name : "Custom Message",
        messageText: compiledMessage,
        sentBy: currentUser?.fullName || "Backoffice User"
      });
      fetchLogs();
    } catch (err) {
      console.error("Could not register delivery log", err);
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Filtering lists
  const filteredConversations = safeConversations.filter(c => {
    const term = searchQuery.toLowerCase();
    return c.customerName.toLowerCase().includes(term) || c.mobile.includes(term);
  });

  const filteredLogs = safeLogs.filter(l => {
    const searchString = `${l.customerName} ${l.mobile} ${l.templateName} ${l.messageText}`.toLowerCase();
    return searchString.includes(logSearch.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Control Panel */}
      <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl shadow flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fadeIn">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <Lucide.MessageSquareCode className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">WhatsApp Business Cloud API Console</h3>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
              Official WhatsApp communications desk, real-time customer inbox, auto-capture lead triggers, and templates
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850 gap-0.5">
          <button
            onClick={() => setActiveSubTab("inbox")}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "inbox"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Lucide.MessageSquareText className="w-3.5 h-3.5" />
            Live Inbox
          </button>
          <button
            onClick={() => setActiveSubTab("sandbox")}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "sandbox"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Lucide.Compass className="w-3.5 h-3.5" />
            Message Sandbox
          </button>
          <button
            onClick={() => setActiveSubTab("templates")}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "templates"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Lucide.LayoutTemplate className="w-3.5 h-3.5" />
            Templates Manager
          </button>
          <button
            onClick={() => setActiveSubTab("logs")}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "logs"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Lucide.History className="w-3.5 h-3.5" />
            Delivery History
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: LIVE INBOX (WHATSAPP WEB LAYOUT) */}
      {activeSubTab === "inbox" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden h-[68vh] shadow-2xl animate-fadeIn">
          
          {/* LEFT COLUMN: CONVERSATIONS SIDEBAR (4 cols) */}
          <div className="lg:col-span-4 border-r border-slate-850 flex flex-col bg-slate-950/30 h-full">
            {/* Search Box Header */}
            <div className="p-4 border-b border-slate-850 bg-slate-950/50">
              <div className="relative text-xs">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                  <Lucide.Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats by name or mobile..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-850/40">
              {filteredConversations.map(conv => {
                const isSelected = conv.id === selectedConvId;
                const matchesLead = leads.some(l => l.mobile.replace(/\D/g, "") === conv.mobile.replace(/\D/g, ""));
                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`p-4 flex items-start gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-slate-850/60 border-l-4 border-emerald-500"
                        : "hover:bg-slate-850/20"
                    }`}
                  >
                    {/* User Initials Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center font-black text-xs text-white">
                        {conv.customerName.substring(0, 2).toUpperCase()}
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white font-black text-[9px] rounded-full flex items-center justify-center animate-bounce">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-200 truncate pr-2">
                          {conv.customerName}
                        </h4>
                        <span className="text-[9.5px] font-mono text-slate-500 font-medium shrink-0">
                          {new Date(conv.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{conv.mobile}</p>
                      
                      {/* Truncated Last message preview */}
                      <p className={`text-[11px] truncate mt-1.5 ${conv.unreadCount > 0 ? "text-emerald-400 font-bold" : "text-slate-500"}`}>
                        {conv.lastMessage || "No message history."}
                      </p>

                      {/* Badges */}
                      <div className="flex items-center gap-1.5 mt-2">
                        {matchesLead ? (
                          <span className="text-[8px] bg-indigo-950 border border-indigo-900 text-indigo-400 font-bold px-1.5 py-0.5 rounded uppercase">
                            CRM Lead
                          </span>
                        ) : (
                          <span className="text-[8px] bg-rose-950 border border-rose-900 text-rose-400 font-bold px-1.5 py-0.5 rounded uppercase">
                            Direct Visitor
                          </span>
                        )}
                        {conv.assignedTo && (
                          <span className="text-[8px] bg-slate-900 text-slate-400 font-mono font-bold px-1.5 py-0.5 rounded uppercase">
                            🧑‍💻 {conv.assignedTo}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredConversations.length === 0 && (
                <div className="text-center p-8 text-slate-600 font-mono text-[11px]">
                  No WhatsApp conversations found matching filters.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: ACTIVE CHAT SCREEN (8 cols) */}
          <div className="lg:col-span-8 flex flex-col h-full bg-slate-950/20">
            {activeConv ? (
              <>
                {/* Chat header */}
                <div className="p-4 border-b border-slate-850 bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-900/30 flex items-center justify-center font-black text-xs">
                      {activeConv.customerName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">{activeConv.customerName}</h4>
                      <p className="text-[10px] text-slate-500 font-mono font-medium">
                        Active Channel: WhatsApp ({activeConv.mobile})
                      </p>
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-2">
                    {/* Assigned Sales dropdown */}
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase hidden xl:inline">Assigned:</span>
                      <select
                        value={activeConv.assignedTo || ""}
                        onChange={(e) => handleAssignAgent(e.target.value)}
                        className="bg-slate-950 border border-slate-800 text-[10.5px] p-1.5 rounded-lg text-slate-300 focus:outline-none"
                      >
                        <option value="">-- Unassigned --</option>
                        {safeUsersList.map((usr: any) => (
                          <option key={usr.id} value={usr.username}>{usr.fullName} ({usr.role})</option>
                        ))}
                      </select>
                    </div>

                    {/* Open WhatsApp shortcut */}
                    <button
                      onClick={() => {
                        let clean = activeConv.mobile.replace(/\D/g, "");
                        if (clean.length === 10) clean = "91" + clean;
                        window.open(`https://web.whatsapp.com/send?phone=${clean}`, "_blank", "noopener,noreferrer");
                      }}
                      className="bg-emerald-950/40 hover:bg-emerald-950 border border-emerald-900/30 text-emerald-400 text-[10.5px] font-bold p-1.5 px-2.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                      title="Launch Web Click-to-chat"
                    >
                      <Lucide.ExternalLink className="w-3.5 h-3.5" />
                      Open WhatsApp
                    </button>
                  </div>
                </div>

                {/* Predefined Quick templates selector strip */}
                <div className="px-4 py-2 bg-slate-900/20 border-b border-slate-850 flex items-center gap-2 overflow-x-auto shrink-0 select-none text-xs">
                  <span className="text-[9px] text-slate-500 font-black uppercase shrink-0">Quick Templates:</span>
                  {safeTemplates.slice(0, 5).map(tpl => (
                    <button
                      key={tpl.id}
                      onClick={() => handleApplyTemplate(tpl)}
                      className="bg-slate-950 hover:bg-slate-850 border border-slate-850 text-slate-300 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide transition-all whitespace-nowrap cursor-pointer hover:border-emerald-500/40"
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>

                {/* Chat history list */}
                <div 
                  className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950 bg-cover bg-center" 
                  style={{ 
                    backgroundImage: "url('https://i.pinimg.com/originals/97/c0/07/97c00759d90d7e1128afb244ec92556d.png')",
                    backgroundBlendMode: "overlay",
                    opacity: 0.9
                  }}
                >
                  {safeMessages.map((msg, idx) => {
                    const isAgent = msg.sender === "agent";
                    return (
                      <div
                        key={msg.id || idx}
                        className={`flex flex-col max-w-[75%] ${isAgent ? "self-end ml-auto" : "self-startmr-auto"}`}
                      >
                        <div
                          className={`p-3 rounded-2xl relative shadow-md leading-relaxed whitespace-pre-wrap text-[11.5px] ${
                            isAgent
                              ? "bg-emerald-700 text-white rounded-tr-none"
                              : "bg-[#182229] border border-slate-800 text-slate-200 rounded-tl-none"
                          }`}
                        >
                          {/* Sender identity */}
                          {isAgent && (
                            <p className="text-[9px] text-emerald-200 font-black uppercase tracking-wider mb-1">
                              Agent: {msg.senderName || "Admin"}
                            </p>
                          )}

                          {/* Message text */}
                          <p className="font-sans font-medium">{msg.text}</p>

                          {/* Message attachment box if present */}
                          {msg.attachmentUrl && (
                            <div className="mt-2.5 p-2 bg-slate-950/40 border border-black/20 rounded-xl flex items-center justify-between gap-3 text-[10.5px]">
                              <div className="flex items-center gap-2">
                                <Lucide.FileText className="w-5 h-5 text-emerald-400 shrink-0" />
                                <div className="truncate">
                                  <p className="font-bold text-white truncate max-w-[150px]">
                                    {msg.attachmentUrl.split("/").pop()}
                                  </p>
                                  <p className="text-[9px] text-slate-400 uppercase font-mono font-bold">
                                    {msg.attachmentType || "pdf"} Document
                                  </p>
                                </div>
                              </div>
                              <a
                                href={msg.attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-all shrink-0"
                              >
                                <Lucide.Eye className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          )}

                          {/* Time tag and tick marks */}
                          <div className="flex items-center justify-end gap-1 mt-1 text-[8.5px] text-slate-400/90 font-mono">
                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isAgent && <Lucide.CheckCheck className="w-3 h-3 text-sky-400" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div ref={chatEndRef} />
                </div>

                {/* CRM document attachment utility toolbar */}
                {isAttachmentOpen && (
                  <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 space-y-3 animate-fadeIn text-xs shrink-0">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Lucide.Paperclip className="w-4 h-4" />
                        Attach Live CRM Document File
                      </h5>
                      <button onClick={() => setIsAttachmentOpen(false)} className="text-slate-500 hover:text-white">
                        <Lucide.X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Document Category</label>
                        <select
                          value={attachmentType || ""}
                          onChange={(e) => {
                            setAttachmentType(e.target.value as any);
                            setAttachmentRecordId("");
                          }}
                          className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none"
                        >
                          <option value="">-- Choose Category --</option>
                          <option value="itinerary">Itinerary Document (PDF)</option>
                          <option value="quotation">Custom Quotation (PDF)</option>
                          <option value="voucher">Hotel Voucher (PDF)</option>
                          <option value="invoice">Booking Ledger Invoice (PDF)</option>
                          <option value="receipt">UPI/Cash Payment Receipt (PDF)</option>
                        </select>
                      </div>

                      {attachmentType && (
                        <div>
                          <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Select Specific Record</label>
                          <select
                            value={attachmentRecordId}
                            onChange={(e) => setAttachmentRecordId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none"
                          >
                            <option value="">-- Choose target record --</option>
                            {attachmentType === "itinerary" && safeItineraries.map((i: any) => (
                              <option key={i.id} value={i.id}>{i.customerName} - {i.destination.toUpperCase()} ({i.id})</option>
                            ))}
                            {attachmentType === "quotation" && safeQuotations.map((q: any) => (
                              <option key={q.id} value={q.id}>{q.customerName} - Quotation (₹{q.totalAmount})</option>
                            ))}
                            {attachmentType === "voucher" && safeVouchers.map((v: any) => (
                              <option key={v.id} value={v.id}>{v.guestName} - Hotel Stay: {v.hotelName}</option>
                            ))}
                            {attachmentType === "invoice" && safeBookings.map((b: any) => (
                              <option key={b.id} value={b.id}>{b.customerName} - Booking (SIH-BK-{b.id})</option>
                            ))}
                            {attachmentType === "receipt" && safePayments.map((p: any) => (
                              <option key={p.id} value={p.id}>{p.customerName} - Payment Summary (₹{p.advancePaid})</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-2 border-t border-slate-850">
                      <button
                        onClick={handleAttachDocument}
                        disabled={!attachmentType || !attachmentRecordId}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Transmit Attachment
                      </button>
                    </div>
                  </div>
                )}

                {/* Input box form */}
                <form onSubmit={(e) => handleSendMessage(e)} className="p-3 bg-[#1e2a30] flex items-center gap-2 select-none shrink-0">
                  {/* Attach button */}
                  <button
                    type="button"
                    onClick={() => setIsAttachmentOpen(!isAttachmentOpen)}
                    className={`p-2.5 rounded-full transition-all cursor-pointer ${
                      isAttachmentOpen ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                    title="Attach documents"
                  >
                    <Lucide.Paperclip className="w-4.5 h-4.5" />
                  </button>

                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message or select a template above..."
                    className="flex-1 bg-[#2a3942] border-none outline-none text-slate-100 text-xs py-2.5 px-4 rounded-xl placeholder:text-slate-500 focus:ring-1 focus:ring-emerald-500"
                  />

                  {/* Send trigger */}
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="w-9 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50 transition-all shadow-md"
                  >
                    <Lucide.Send className="w-4 h-4 ml-0.5" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center">
                  <Lucide.MessageSquareDot className="w-8 h-8" />
                </div>
                <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider">Awaiting Conversation Selection</h4>
                <p className="text-[10px] text-slate-500 font-semibold max-w-sm leading-relaxed uppercase">
                  Select a registered client chat from the sidebar to inspect communication timelines, template variables, or send PDFs
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: MESSAGE SANDBOX */}
      {activeSubTab === "sandbox" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Controls Column */}
          <div className="xl:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider">Dynamic Message Compiler</h4>
              <p className="text-[10px] text-slate-500 font-semibold">Select database records and templates to compile custom, highly personalized client summaries</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Category selector */}
              <div>
                <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">CRM Target Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 p-3 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Leads">Leads Directory</option>
                  <option value="Bookings">Confirmed Bookings</option>
                  <option value="Vouchers">Stay Vouchers</option>
                  <option value="Payments">Payment Ledgers</option>
                  <option value="Fleet">Cab & Fleet Drivers</option>
                </select>
              </div>

              {/* Specific Record Selector */}
              <div>
                <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Select Specific Record</label>
                <select
                  value={selectedRecordId}
                  onChange={(e) => setSelectedRecordId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 p-3 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">-- Choose target {selectedCategory} --</option>
                  {selectedCategory === "Leads" && safeLeads.map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.destination.toUpperCase()} - {l.id})</option>
                  ))}
                  {selectedCategory === "Bookings" && safeBookings.map(b => (
                    <option key={b.id} value={b.id}>{b.customerName} ({b.destination.toUpperCase()} - {b.id})</option>
                  ))}
                  {selectedCategory === "Vouchers" && safeVouchers.map(v => (
                    <option key={v.id} value={v.id}>{v.guestName} - {v.hotelName} ({v.id})</option>
                  ))}
                  {selectedCategory === "Payments" && safePayments.map(p => (
                    <option key={p.id} value={p.id}>{p.customerName} (₹{p.totalAmount} - {p.id})</option>
                  ))}
                  {selectedCategory === "Fleet" && safeDrivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.vehicleType} - {d.vehicleNo})</option>
                  ))}
                </select>
              </div>

              {/* Template Selector */}
              <div>
                <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Select Message Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  disabled={safeTemplates.length === 0}
                  className="w-full bg-slate-950 border border-slate-850 p-3 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-55"
                >
                  <option value="">-- Select Template --</option>
                  {safeTemplates
                    .filter(t => t.category.toLowerCase() === selectedCategory.toLowerCase())
                    .map(tpl => (
                      <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                    ))}
                </select>
              </div>

              {/* Direct Recipient Settings */}
              <div>
                <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">WhatsApp Recipient Number *</label>
                <input
                  type="text"
                  required
                  value={customMobile}
                  onChange={(e) => setCustomMobile(e.target.value)}
                  placeholder="e.g. 9876543210 (with country code)"
                  className="w-full bg-slate-950 border border-slate-850 p-3 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>

            {/* Compiled Text Area Editor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[9px] text-slate-400 font-bold uppercase">Editable Draft Sandbox</label>
                <span className="text-[9px] text-indigo-400 font-bold uppercase">Real-time variables parsed</span>
              </div>
              <textarea
                value={compiledMessage}
                onChange={(e) => setCompiledMessage(e.target.value)}
                placeholder="Choose dynamic parameters above to auto-compile a custom professional greeting message, or start drafting custom communication directly inside this sandbox..."
                rows={10}
                className="w-full bg-slate-950 border border-slate-850 p-4 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed font-sans"
              />
            </div>

            {/* Quick Actions trigger buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => handleTriggerSend("web")}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-3.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/15"
              >
                <Lucide.ExternalLink className="w-4 h-4" />
                Launch WhatsApp Web (PC)
              </button>
              <button
                onClick={() => handleTriggerSend("mobile")}
                className="flex-1 bg-slate-950 border border-slate-850 hover:bg-slate-850 text-slate-200 font-bold p-3.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Lucide.Smartphone className="w-4 h-4 text-emerald-400" />
                Launch WhatsApp Direct (Mobile)
              </button>
            </div>
          </div>

          {/* WhatsApp Live Simulator Screen Mockup */}
          <div className="xl:col-span-5 flex justify-center">
            <div className="w-full max-w-[340px] bg-[#0c1214] border-[6px] border-slate-800 rounded-[38px] shadow-2xl overflow-hidden aspect-[9/18] flex flex-col relative">
              {/* Phone Speaker Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-800 rounded-b-xl z-20 flex items-center justify-center">
                <div className="w-10 h-1 bg-slate-950 rounded-full"></div>
              </div>

              {/* Status Bar */}
              <div className="h-10 bg-[#075e54] text-white flex items-end justify-between px-6 pb-1.5 text-[10px] font-semibold select-none">
                <span>09:41</span>
                <div className="flex items-center gap-1">
                  <Lucide.Wifi className="w-3 h-3" />
                  <Lucide.Battery className="w-4 h-4" />
                </div>
              </div>

              {/* WhatsApp App Header bar */}
              <div className="bg-[#075e54] text-white px-3 py-2 flex items-center justify-between select-none shadow">
                <div className="flex items-center gap-2">
                  <Lucide.ArrowLeft className="w-4 h-4 cursor-pointer" />
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-black overflow-hidden border border-white/20">
                    {customName ? customName.substring(0, 2).toUpperCase() : "SIH"}
                  </div>
                  <div>
                    <h5 className="text-[11px] font-black truncate max-w-[120px]">{customName || "Client Desk"}</h5>
                    <p className="text-[8px] text-emerald-200 font-bold">Online</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-white/90">
                  <Lucide.Video className="w-3.5 h-3.5" />
                  <Lucide.PhoneCall className="w-3.5 h-3.5" />
                  <Lucide.MoreVertical className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Simulated Chat Window Body */}
              <div className="flex-1 bg-[#0b141a] bg-cover bg-center overflow-y-auto p-3.5 space-y-3 relative flex flex-col justify-end" style={{ backgroundImage: "url('https://i.pinimg.com/originals/97/c0/07/97c00759d90d7e1128afb244ec92556d.png')", backgroundBlendMode: "overlay" }}>
                {compiledMessage ? (
                  <div className="bg-[#056162] text-white text-[11px] p-3 rounded-2xl max-w-[85%] self-end shadow-md relative leading-relaxed whitespace-pre-wrap animate-fadeIn">
                    <p>{compiledMessage}</p>
                    <div className="flex items-center justify-end gap-1 mt-1 text-[8px] text-emerald-200">
                      <span>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      <Lucide.CheckCheck className="w-3 h-3 text-sky-400" />
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto my-auto text-center p-6 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl space-y-1">
                    <Lucide.MessageSquareOff className="w-8 h-8 mx-auto text-slate-600" />
                    <h6 className="text-[10px] font-bold text-slate-400 uppercase">Awaiting Draft Compilation</h6>
                    <p className="text-[9px] text-slate-500">Pick a template and record variables on the left to review the look of your notification message here.</p>
                  </div>
                )}
              </div>

              {/* Simulated Input Bottom bar */}
              <div className="bg-[#101d25] p-2 flex items-center gap-2 select-none">
                <div className="flex-1 bg-[#1e2a30] rounded-2xl py-1.5 px-3 flex items-center justify-between text-slate-500">
                  <div className="flex items-center gap-2 text-[10px]">
                    <Lucide.Smile className="w-3.5 h-3.5" />
                    <span>Type a message</span>
                  </div>
                  <Lucide.Paperclip className="w-3.5 h-3.5" />
                </div>
                <div className="w-8 h-8 bg-[#00a884] rounded-full flex items-center justify-center text-white cursor-pointer shadow">
                  <Lucide.Mic className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: TEMPLATES MANAGER */}
      {activeSubTab === "templates" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider">System Templates Listing</h4>
              <p className="text-[10px] text-slate-500 font-semibold">Pre-set corporate notification scripts containing database variables mapping coordinates</p>
            </div>
            {!isEditingTemplate && (
              <button
                onClick={() => {
                  setTemplateForm({ id: "", name: "", category: "Leads", message: "" });
                  setIsEditingTemplate(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow"
              >
                <Lucide.Plus className="w-4 h-4" />
                Add New Template
              </button>
            )}
          </div>

          {/* Add / Edit Form Drawer */}
          {isEditingTemplate && (
            <form onSubmit={handleSaveTemplateSubmit} className="bg-slate-900 border border-slate-805 p-6 rounded-2xl shadow-xl space-y-4 text-xs animate-fadeIn">
              <h5 className="text-[11px] font-black uppercase text-indigo-400 border-b border-slate-850 pb-2 flex items-center gap-2">
                <Lucide.FileEdit className="w-4 h-4" />
                {templateForm.id ? "Edit Message Template" : "Register New WhatsApp Template"}
              </h5>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Template Name *</label>
                  <input
                    type="text"
                    required
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="e.g. Booking Remittance Reminder"
                    className="w-full bg-slate-950 border border-slate-850 p-3 rounded-xl text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Mapping Category *</label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-850 p-3 rounded-xl text-white focus:outline-none"
                  >
                    <option value="Leads">Leads (Customer, Destination, Dates)</option>
                    <option value="Quotations">Quotations (Offer Price, Package inclusions)</option>
                    <option value="Bookings">Bookings (Confirmation summary, balance dues)</option>
                    <option value="Vouchers">Vouchers (Stays check-in details)</option>
                    <option value="Payments">Payments (Installments and bank coordinates)</option>
                    <option value="Fleet">Fleet (Cab & driver alerts)</option>
                    <option value="Other">Other general templates</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                <div className="lg:col-span-8 space-y-1">
                  <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Message Template Draft *</label>
                  <textarea
                    required
                    rows={12}
                    value={templateForm.message}
                    onChange={(e) => setTemplateForm({ ...templateForm, message: e.target.value })}
                    placeholder="Draft your message. Use brackets like {customerName} to inject live values dynamically."
                    className="w-full bg-slate-950 border border-slate-850 p-4 rounded-xl text-white focus:outline-none font-mono text-xs leading-relaxed"
                  />
                </div>

                <div className="lg:col-span-4 bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                  <h6 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-850 pb-1.5">
                    <Lucide.Info className="w-4 h-4" />
                    Placeholders Locker Guide
                  </h6>
                  <p className="text-[9px] text-slate-500 leading-relaxed">Dynamic bracket tags will fetch live CRM entries instantly during compilation:</p>
                  
                  <div className="space-y-2 text-[10px] font-mono max-h-[220px] overflow-y-auto pr-1">
                    <p className="text-slate-300 font-bold uppercase text-[9px] border-b border-slate-850 pb-0.5">Global / Corporate</p>
                    <div className="text-slate-400">
                      <p><span className="text-emerald-400">{"{companyName}"}</span>: Title</p>
                      <p><span className="text-emerald-400">{"{companyPhone}"}</span>: Hotline</p>
                      <p><span className="text-emerald-400">{"{companyWebsite}"}</span>: Website</p>
                    </div>

                    <p className="text-slate-300 font-bold uppercase text-[9px] border-b border-slate-850 pb-0.5 pt-1.5">Leads Coordinates</p>
                    <div className="text-slate-400">
                      <p><span className="text-emerald-400">{"{customerName}"}</span>: Customer Name</p>
                      <p><span className="text-emerald-400">{"{destination}"}</span>: Stay Hills</p>
                      <p><span className="text-emerald-400">{"{travelDate}"}</span>: Journey Date</p>
                      <p><span className="text-emerald-400">{"{adults}"}</span> / <span className="text-emerald-400">{"{children}"}</span>: Travelers</p>
                    </div>

                    <p className="text-slate-300 font-bold uppercase text-[9px] border-b border-slate-850 pb-0.5 pt-1.5">Payments & Financials</p>
                    <div className="text-slate-400">
                      <p><span className="text-emerald-400">{"{totalAmount}"}</span>: Billing Cost</p>
                      <p><span className="text-emerald-400">{"{advancePaid}"}</span>: Paid Advance</p>
                      <p><span className="text-emerald-400">{"{balanceAmount}"}</span>: Outstanding Balance</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setIsEditingTemplate(false)}
                  className="bg-slate-950 border border-slate-850 hover:bg-slate-850 text-slate-300 font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow"
                >
                  {templateForm.id ? "Save Updated Template" : "Deploy WhatsApp Template"}
                </button>
              </div>
            </form>
          )}

          {/* Grid of existing templates */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {safeTemplates.map(tpl => (
              <div key={tpl.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between gap-4 animate-fadeIn">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-emerald-500/25">
                      {tpl.category} Mapping
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono font-bold uppercase">{tpl.id}</span>
                  </div>
                  <h5 className="text-xs font-black text-white truncate uppercase">{tpl.name}</h5>
                  <p className="text-[11px] text-slate-400 font-sans leading-relaxed whitespace-pre-line line-clamp-5 pt-1.5 border-t border-slate-850/60">
                    {tpl.message}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-850 gap-2">
                  <button
                    onClick={() => {
                      setSelectedCategory(tpl.category);
                      setSelectedTemplateId(tpl.id);
                      setActiveSubTab("sandbox");
                    }}
                    className="text-[10px] text-indigo-400 font-bold uppercase hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Lucide.Compass className="w-3.5 h-3.5" />
                    Sandbox Compile
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditTemplateClick(tpl)}
                      className="p-1.5 bg-slate-950 hover:bg-slate-850 rounded-lg text-slate-300 transition-all cursor-pointer"
                    >
                      <Lucide.Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplateClick(tpl.id)}
                      className="p-1.5 bg-rose-950/20 hover:bg-rose-950/50 border border-rose-900/30 rounded-lg text-rose-400 transition-all cursor-pointer"
                    >
                      <Lucide.Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: DELIVERY HISTORY */}
      {activeSubTab === "logs" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider">Communication Remittances Log</h4>
              <p className="text-[10px] text-slate-500 font-semibold">Audit trail of outbound WhatsApp messages spawned from our backoffice CRM console</p>
            </div>

            <div className="relative text-xs w-full md:w-80">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                <Lucide.Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search by client or template..."
                className="w-full bg-slate-950 border border-slate-850 p-2.5 pl-10 rounded-xl text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto text-xs">
            {filteredLogs.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-850 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/25">
                    <th className="p-3.5">Sent Timestamp</th>
                    <th className="p-3.5">Customer / Contact</th>
                    <th className="p-3.5">Template Selected</th>
                    <th className="p-3.5">Compiled Text Body</th>
                    <th className="p-3.5">Sent Agent</th>
                    <th className="p-3.5 text-right">Failsafe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/60">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-850/20 text-slate-300">
                      <td className="p-3.5 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-white">{log.customerName}</div>
                        <div className="font-mono text-[10px] text-slate-400">{log.mobile}</div>
                      </td>
                      <td className="p-3.5 font-semibold text-emerald-400">
                        {log.templateName}
                      </td>
                      <td className="p-3.5 max-w-xs truncate leading-relaxed text-slate-400" title={log.messageText}>
                        {log.messageText}
                      </td>
                      <td className="p-3.5 text-slate-400 font-semibold uppercase text-[10px]">
                        {log.sentBy}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setCustomName(log.customerName);
                            setCustomMobile(log.mobile);
                            setCompiledMessage(log.messageText);
                            setActiveSubTab("sandbox");
                          }}
                          className="bg-indigo-600/10 hover:bg-indigo-600 hover:text-white border border-indigo-500/25 text-indigo-400 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer uppercase tracking-wider"
                        >
                          Clone Sandbox
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center p-8 text-slate-500 font-mono text-xs">
                No outbound WhatsApp communication records match the search filter.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
