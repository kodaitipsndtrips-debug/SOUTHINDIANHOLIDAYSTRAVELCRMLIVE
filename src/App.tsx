import React, { useState, useEffect } from "react";
import axios from "axios";
import * as Lucide from "lucide-react";

// Components
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import DashboardTab from "./components/DashboardTab";
import LeadsTab from "./components/LeadsTab";
import FollowupsTab from "./components/FollowupsTab";
import PackagesTab from "./components/PackagesTab";
import QuotationsTab from "./components/QuotationsTab";
import BookingsTab from "./components/BookingsTab";
import VouchersTab from "./components/VouchersTab";
import PaymentsTab from "./components/PaymentsTab";
import ExpensesTab from "./components/ExpensesTab";
import ReportsTab from "./components/ReportsTab";
import SettingsTab from "./components/SettingsTab";
import UsersTab from "./components/UsersTab";
import DirectoryTabs from "./components/DirectoryTabs";
import WhatsappTab from "./components/WhatsappTab";
import ItineraryTab from "./components/ItineraryTab";

// Types
import { User, Lead, TourPackage, Booking, HotelVoucher, PaymentLedger, Expense, Hotel, Driver, Supplier, FollowUp, Itinerary } from "./types";
import { getLocalDateString } from "./utils";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [realAdminUser, setRealAdminUser] = useState<User | null>(null);
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [preselectedWhatsAppMobile, setPreselectedWhatsAppMobile] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Theme support
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    return (localStorage.getItem("sih_crm_theme") as "light" | "dark" | "system") || "system";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    localStorage.setItem("sih_crm_theme", theme);
    
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add("dark");
        root.classList.remove("light");
      } else {
        root.classList.remove("dark");
        root.classList.add("light");
      }
    };

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mediaQuery.matches);
      
      const listener = (e: MediaQueryListEvent) => {
        applyTheme(e.matches);
      };
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    } else {
      applyTheme(theme === "dark");
    }
  }, [theme]);

  // Login variables
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Global Datasets States
  const [leads, setLeads] = useState<Lead[]>([]);
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [payments, setPayments] = useState<PaymentLedger[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [settings, setSettings] = useState<any>({
    companyName: "South Indian Holidays & Asset Management Pvt. Ltd.",
    gstNumber: "33AAECS0814M1Z2",
    address: "12, Kamarajar Salai, Madurai, Tamil Nadu - 625009",
    phone: "+91 94433 12345",
    email: "bookings@southindianholidays.com",
    bankName: "State Bank of India",
    bankAccount: "39485761029",
    bankIfsc: "SBIN0000253",
    upiId: "southindianholidays@sbi",
    website: "www.southindianholidays.com",
    logo: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=200&auto=format&fit=crop",
    quotationPrefix: "SIH-QT-",
    voucherPrefix: "SIH-VC-",
    invoicePrefix: "SIH-INV-",
    taxRate: 5
  });

  // Inter-tab helper state
  const [selectedPkgFromLibrary, setSelectedPkgFromLibrary] = useState<TourPackage | null>(null);
  const [selectedLeadForQuotation, setSelectedLeadForQuotation] = useState<Lead | null>(null);

  // Auto-login or check cached session
  useEffect(() => {
    const cachedUser = localStorage.getItem("sih_crm_user");
    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
      } catch (err) {
        localStorage.removeItem("sih_crm_user");
      }
    }
  }, []);

  // Sync API Datasets
  useEffect(() => {
    if (!user) return;

    const fetchAllData = async () => {
      try {
        const [
          leadsRes, pkgsRes, bookingsRes, vouchersRes, itinerariesRes, paymentsRes,
          expensesRes, usersRes, hotelsRes, driversRes, suppliersRes, settingsRes
        ] = await Promise.all([
          axios.get("/api/leads").catch(() => ({ data: [] })),
          axios.get("/api/packages").catch(() => ({ data: [] })),
          axios.get("/api/bookings").catch(() => ({ data: [] })),
          axios.get("/api/vouchers").catch(() => ({ data: [] })),
          axios.get("/api/itineraries").catch(() => ({ data: [] })),
          axios.get("/api/payments").catch(() => ({ data: [] })),
          axios.get("/api/expenses").catch(() => ({ data: [] })),
          axios.get("/api/users").catch(() => ({ data: [] })),
          axios.get("/api/hotels").catch(() => ({ data: [] })),
          axios.get("/api/drivers").catch(() => ({ data: [] })),
          axios.get("/api/suppliers").catch(() => ({ data: [] })),
          axios.get("/api/settings").catch(() => ({ data: null }))
        ]);

        setLeads(Array.isArray(leadsRes.data) ? leadsRes.data : []);
        setPackages(Array.isArray(pkgsRes.data) ? pkgsRes.data : []);
        setBookings(Array.isArray(bookingsRes.data) ? bookingsRes.data : []);
        setVouchers(Array.isArray(vouchersRes.data) ? vouchersRes.data : []);
        setItineraries(Array.isArray(itinerariesRes.data) ? itinerariesRes.data : []);
        setPayments(Array.isArray(paymentsRes.data) ? paymentsRes.data : []);
        setExpenses(Array.isArray(expensesRes.data) ? expensesRes.data : []);
        setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
        setHotels(Array.isArray(hotelsRes.data) ? hotelsRes.data : []);
        setDrivers(Array.isArray(driversRes.data) ? driversRes.data : []);
        setSuppliers(Array.isArray(suppliersRes.data) ? suppliersRes.data : []);
        setSettings(settingsRes.data || {});
      } catch (error) {
        console.error("Batch dataset synchronization failed. Operating in local mode.", error);
      }
    };

    fetchAllData();
  }, [user]);

  // Auth Submit Handlers
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    try {
      const res = await axios.post("/api/auth/login", {
        username: loginUsername,
        password: loginPassword
      });

      if (res.data && res.data.success) {
        const loggedUser = res.data.user;
        setUser(loggedUser);
        localStorage.setItem("sih_crm_user", JSON.stringify(loggedUser));
      } else {
        setLoginError(res.data.message || "Invalid credential parameters.");
      }
    } catch (err: any) {
      // Local failsafe account logins
      if (loginUsername === "admin" && loginPassword === "admin") {
        const backupAdmin: User = {
          id: "USR-MOCK-001",
          fullName: "Selva Kumar (Offline Admin)",
          mobile: "9443120432",
          email: "selva@southindianholidays.com",
          username: "admin",
          role: "admin",
          status: "Active",
          lastLogin: new Date().toLocaleTimeString()
        };
        setUser(backupAdmin);
        localStorage.setItem("sih_crm_user", JSON.stringify(backupAdmin));
      } else if (loginUsername === "sales" && loginPassword === "sales") {
        const backupSales: User = {
          id: "USR-MOCK-002",
          fullName: "Anand R (Offline Sales)",
          mobile: "9842104523",
          email: "anand@southindianholidays.com",
          username: "sales",
          role: "sales",
          status: "Active",
          lastLogin: new Date().toLocaleTimeString()
        };
        setUser(backupSales);
        localStorage.setItem("sih_crm_user", JSON.stringify(backupSales));
      } else {
        setLoginError("Credentials invalid or backend network unavailable. Try 'admin / admin' or 'sales / sales'.");
      }
    }
  };

  const handleLogout = () => {
    setUser(null);
    setRealAdminUser(null);
    localStorage.removeItem("sih_crm_user");
    setCurrentTab("dashboard");
  };

  const handleImpersonateUser = (targetUser: User | null) => {
    if (targetUser) {
      if (!realAdminUser) {
        setRealAdminUser(user);
      }
      setUser(targetUser);
    } else {
      if (realAdminUser) {
        setUser(realAdminUser);
        setRealAdminUser(null);
      }
    }
  };

  // Mutator Sync Handlers
  // LEADS
  const handleAddLead = async (leadData: Partial<Lead>) => {
    try {
      const res = await axios.post("/api/leads", leadData);
      setLeads(prev => [res.data, ...prev]);
    } catch {
      const localNew: Lead = {
        id: `SIH-LD-LOCAL-${Date.now()}`,
        name: leadData.name || "Unnamed Client",
        mobile: leadData.mobile || "",
        email: leadData.email || "",
        destination: leadData.destination || "kodaikanal",
        travelDate: leadData.travelDate || getLocalDateString(),
        adults: leadData.adults || "2",
        children: leadData.children || "0",
        notes: leadData.notes || "",
        status: "New",
        priority: leadData.priority || "Medium",
        source: leadData.source || "Website",
        tags: leadData.tags || [],
        timeline: [{ timestamp: new Date().toLocaleString(), text: "Lead logged locally." }],
        followUpHistory: []
      };
      setLeads(prev => [localNew, ...prev]);
    }
  };

  const handleUpdateLead = async (id: string, leadData: Partial<Lead>) => {
    try {
      const res = await axios.put(`/api/leads/${id}`, leadData);
      setLeads(prev => prev.map(l => l.id === id ? res.data : l));
    } catch {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...leadData } as Lead : l));
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      await axios.delete(`/api/leads/${id}`);
      setLeads(prev => prev.filter(l => l.id !== id));
    } catch {
      setLeads(prev => prev.filter(l => l.id !== id));
    }
  };

  // PACKAGES
  const handleAddPackage = async (pkg: Partial<TourPackage>) => {
    try {
      const res = await axios.post("/api/packages", pkg);
      setPackages(prev => [res.data, ...prev]);
    } catch {
      const localNew: TourPackage = {
        id: `PKG-LOCAL-${Date.now()}`,
        name: pkg.name || "",
        destination: pkg.destination || "kodaikanal",
        duration: pkg.duration || "3 Days / 2 Nights",
        category: pkg.category || "Family",
        price: pkg.price || 5000,
        hotelCategory: pkg.hotelCategory || "3-Star Deluxe",
        inclusions: pkg.inclusions || "",
        exclusions: pkg.exclusions || "",
        status: pkg.status || "Active"
      };
      setPackages(prev => [localNew, ...prev]);
    }
  };

  const handleUpdatePackage = async (id: string, pkg: Partial<TourPackage>) => {
    try {
      const res = await axios.put(`/api/packages/${id}`, pkg);
      setPackages(prev => prev.map(p => p.id === id ? res.data : p));
    } catch {
      setPackages(prev => prev.map(p => p.id === id ? { ...p, ...pkg } as TourPackage : p));
    }
  };

  const handleDeletePackage = async (id: string) => {
    try {
      await axios.delete(`/api/packages/${id}`);
      setPackages(prev => prev.filter(p => p.id !== id));
    } catch {
      setPackages(prev => prev.filter(p => p.id !== id));
    }
  };

  // BOOKINGS
  const handleAddBooking = async (bk: Partial<Booking>) => {
    try {
      const res = await axios.post("/api/bookings", bk);
      setBookings(prev => [res.data, ...prev]);
      // Trigger payment ledger refresh automatically since booking inserts payment row
      const payRes = await axios.get("/api/payments");
      setPayments(payRes.data);
    } catch {
      const localNew: Booking = {
        id: `SIH-BK-${Date.now()}`,
        customerId: `CUST-${Math.floor(Math.random() * 9000 + 1000)}`,
        customerName: bk.customerName || "Amit Kumar",
        customerMobile: bk.customerMobile || "",
        customerEmail: bk.customerEmail || "",
        destination: bk.destination || "kodaikanal",
        travelDate: bk.travelDate || getLocalDateString(),
        adults: bk.adults || 2,
        children: bk.children || 0,
        packagePrice: bk.packagePrice || 10000,
        hotelDetails: bk.hotelDetails || "",
        driverDetails: bk.driverDetails || "",
        status: bk.status || "Confirmed",
        timeline: [{ timestamp: new Date().toLocaleString(), text: "Reservation file generated offline." }],
        documents: []
      };
      setBookings(prev => [localNew, ...prev]);

      // Insert matching local payment ledger row
      const localPayLedger: PaymentLedger = {
        id: `SIH-PAY-LOCAL-${Date.now()}`,
        bookingId: localNew.id,
        customerName: localNew.customerName,
        totalAmount: localNew.packagePrice,
        advancePaid: 0,
        balanceAmount: localNew.packagePrice,
        status: "Unpaid",
        installments: []
      };
      setPayments(prev => [localPayLedger, ...prev]);
    }
  };

  const handleUpdateBooking = async (id: string, bk: Partial<Booking>) => {
    try {
      const res = await axios.put(`/api/bookings/${id}`, bk);
      setBookings(prev => prev.map(b => b.id === id ? res.data : b));
    } catch {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, ...bk } as Booking : b));
    }
  };

  const handleDeleteBooking = async (id: string) => {
    try {
      await axios.delete(`/api/bookings/${id}`);
      setBookings(prev => prev.filter(b => b.id !== id));
    } catch {
      setBookings(prev => prev.filter(b => b.id !== id));
    }
  };

  // VOUCHERS
  const handleAddVoucher = async (v: Partial<HotelVoucher>) => {
    try {
      const res = await axios.post("/api/vouchers", v);
      setVouchers(prev => [res.data, ...prev]);
    } catch {
      const localNew = {
        id: `HBV-LOCAL-${Date.now()}`,
        ...v
      };
      setVouchers(prev => [localNew, ...prev]);
    }
  };

  const handleUpdateVoucher = async (id: string, v: Partial<HotelVoucher>) => {
    try {
      const res = await axios.put(`/api/vouchers/${id}`, v);
      setVouchers(prev => prev.map(item => item.id === id ? res.data : item));
    } catch {
      setVouchers(prev => prev.map(item => item.id === id ? { ...item, ...v } : item));
    }
  };

  const handleDeleteVoucher = async (id: string) => {
    try {
      await axios.delete(`/api/vouchers/${id}`);
      setVouchers(prev => prev.filter(item => item.id !== id));
    } catch {
      setVouchers(prev => prev.filter(item => item.id !== id));
    }
  };

  // ITINERARIES
  const handleAddItinerary = async (itn: Partial<Itinerary>) => {
    try {
      const res = await axios.post("/api/itineraries", itn);
      setItineraries(prev => [res.data, ...prev]);
    } catch {
      const localNew: Itinerary = {
        id: `ITN-LOCAL-${Date.now()}`,
        customerName: itn.customerName || "",
        destination: itn.destination || "kodaikanal",
        duration: itn.duration || "3 Days / 2 Nights",
        days: itn.days || [],
        createdAt: new Date().toLocaleDateString("en-IN")
      };
      setItineraries(prev => [localNew, ...prev]);
    }
  };

  const handleUpdateItinerary = async (id: string, itn: Partial<Itinerary>) => {
    try {
      const res = await axios.put(`/api/itineraries/${id}`, itn);
      setItineraries(prev => prev.map(item => item.id === id ? res.data : item));
    } catch {
      setItineraries(prev => prev.map(item => item.id === id ? { ...item, ...itn } as Itinerary : item));
    }
  };

  const handleDeleteItinerary = async (id: string) => {
    try {
      await axios.delete(`/api/itineraries/${id}`);
      setItineraries(prev => prev.filter(item => item.id !== id));
    } catch {
      setItineraries(prev => prev.filter(item => item.id !== id));
    }
  };

  // PAYMENTS Remittances
  const handleAddInstallment = async (ledgerId: string, inst: any) => {
    try {
      const res = await axios.post("/api/payments/installment", { ledgerId, ...inst });
      setPayments(prev => prev.map(p => p.id === ledgerId ? res.data : p));
    } catch {
      // Local calculation
      setPayments(prev => prev.map(p => {
        if (p.id !== ledgerId) return p;
        const instList = p.installments || [];
        const nextInst = { id: `INST-LOCAL-${Date.now()}`, ...inst };
        const nextAdvance = p.advancePaid + inst.amount;
        const nextBal = p.totalAmount - nextAdvance;
        const nextStatus = nextBal <= 0 ? "Paid" : "Partially Paid";
        return {
          ...p,
          advancePaid: nextAdvance,
          balanceAmount: nextBal,
          status: nextStatus as any,
          installments: [nextInst, ...instList]
        };
      }));
    }
  };

  // EXPENSES
  const handleAddExpense = async (exp: Partial<Expense>) => {
    try {
      const res = await axios.post("/api/expenses", exp);
      setExpenses(prev => [res.data, ...prev]);
    } catch {
      const localNew: Expense = {
        id: `EXP-LOCAL-${Date.now()}`,
        description: exp.description || "",
        amount: exp.amount || 0,
        category: exp.category || "Operations",
        date: exp.date || getLocalDateString(),
        approvedBy: "admin"
      };
      setExpenses(prev => [localNew, ...prev]);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await axios.delete(`/api/expenses/${id}`);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch {
      setExpenses(prev => prev.filter(e => e.id !== id));
    }
  };

  // USERS
  const handleAddUser = async (u: Partial<User>) => {
    try {
      const res = await axios.post("/api/users", u);
      setUsers(prev => [...prev, res.data]);
    } catch {
      const localNew: User = {
        id: `USR-LOCAL-${Date.now()}`,
        fullName: u.fullName || "",
        mobile: u.mobile || "",
        email: u.email || "",
        username: u.username || "",
        role: u.role as any || "sales",
        status: u.status as any || "Active",
        lastLogin: "Never"
      };
      setUsers(prev => [...prev, localNew]);
    }
  };

  const handleUpdateUser = async (id: string, u: Partial<User>) => {
    try {
      const res = await axios.put(`/api/users/${id}`, u);
      setUsers(prev => prev.map(item => item.id === id ? res.data : item));
    } catch {
      setUsers(prev => prev.map(item => item.id === id ? { ...item, ...u } as User : item));
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await axios.delete(`/api/users/${id}`);
      setUsers(prev => prev.filter(item => item.id !== id));
    } catch {
      setUsers(prev => prev.filter(item => item.id !== id));
    }
  };

  // DIRECTORIES
  const handleAddHotel = async (h: Partial<Hotel>) => {
    try {
      const res = await axios.post("/api/hotels", h);
      setHotels(prev => [...prev, res.data]);
    } catch {
      const localNew: Hotel = {
        id: `H-LOCAL-${Date.now()}`,
        name: h.name || "",
        destination: h.destination || "kodaikanal",
        rating: h.stars === 5 ? "5-Star" : h.stars === 4 ? "4-Star" : "3-Star",
        contactPerson: h.contactPerson || "",
        contactPhone: h.contactPhone || "",
        roomType: h.roomType || "",
        contractRate: h.contractRate || 2000,
        availableRooms: 10
      };
      setHotels(prev => [...prev, localNew]);
    }
  };

  const handleDeleteHotel = async (id: string) => {
    try {
      await axios.delete(`/api/hotels/${id}`);
      setHotels(prev => prev.filter(h => h.id !== id));
    } catch {
      setHotels(prev => prev.filter(h => h.id !== id));
    }
  };

  const handleAddDriver = async (d: Partial<Driver>) => {
    try {
      const res = await axios.post("/api/drivers", d);
      setDrivers(prev => [...prev, res.data]);
    } catch {
      const localNew: Driver = {
        id: `DRV-LOCAL-${Date.now()}`,
        name: d.name || "",
        mobile: d.phone || "",
        vehicleType: d.vehicleType || "",
        vehicleNo: d.vehicleNo || "",
        status: "Available",
        rating: "4.8"
      };
      setDrivers(prev => [...prev, localNew]);
    }
  };

  const handleDeleteDriver = async (id: string) => {
    try {
      await axios.delete(`/api/drivers/${id}`);
      setDrivers(prev => prev.filter(d => d.id !== id));
    } catch {
      setDrivers(prev => prev.filter(d => d.id !== id));
    }
  };

  const handleAddSupplier = async (s: Partial<Supplier>) => {
    try {
      const res = await axios.post("/api/suppliers", s);
      setSuppliers(prev => [...prev, res.data]);
    } catch {
      const localNew: Supplier = {
        id: `SUP-LOCAL-${Date.now()}`,
        name: s.name || "",
        type: s.category as any || "Activities",
        contactPerson: s.contactPerson || "",
        contactPhone: s.contactPhone || "",
        email: "",
        rating: "4.5",
        balanceDue: s.pendingDues || 0
      };
      setSuppliers(prev => [...prev, localNew]);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      await axios.delete(`/api/suppliers/${id}`);
      setSuppliers(prev => prev.filter(s => s.id !== id));
    } catch {
      setSuppliers(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleUpdateSettings = async (nextSettings: any) => {
    try {
      const res = await axios.post("/api/settings", nextSettings);
      setSettings(res.data);
    } catch {
      setSettings(nextSettings);
    }
  };

  // Timeline Notification Alerts Counts
  const safeLeads = Array.isArray(leads) ? leads : [];
  const safeBookings = Array.isArray(bookings) ? bookings : [];

  const overdueCount = safeLeads.reduce((acc, l) => {
    const isOverdue = Array.isArray(l.followUpHistory) && l.followUpHistory.some(f => f.status === "Pending" && new Date(f.date) < new Date());
    return isOverdue ? acc + 1 : acc;
  }, 0);

  const todayFollowUpCount = safeLeads.reduce((acc, l) => {
    const today = getLocalDateString();
    const hasToday = Array.isArray(l.followUpHistory) && l.followUpHistory.some(f => f.status === "Pending" && f.date === today);
    return hasToday ? acc + 1 : acc;
  }, 0);

  // Tours beginning in the next 7 days count
  const upcomingToursCount = safeBookings.reduce((acc, b) => {
    const diff = new Date(b.travelDate).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 7 && b.status === "Confirmed" ? acc + 1 : acc;
  }, 0);

  // If user session is empty, render the Login Panel
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Subtle decorative travel elements in background */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDelay: "2s" }}></div>
        
        <form onSubmit={handleLoginSubmit} className="w-full max-w-md bg-slate-900/80 backdrop-blur-md border border-slate-800/80 p-8 rounded-3xl space-y-6 shadow-2xl relative">
          <div className="text-center space-y-3">
            {/* Travel Themed Premium Logo */}
            <div className="relative w-16 h-16 bg-gradient-to-tr from-blue-600 to-teal-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
              <Lucide.Compass className="w-8 h-8 text-white animate-[spin_60s_linear_infinite]" />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center shadow-md">
                <Lucide.Plane className="w-3 h-3 text-slate-950" />
              </div>
            </div>
            
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-white tracking-tight uppercase">
                LeadLine <span className="text-teal-400">CRM Pro</span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Travel Business Management Platform
              </p>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-[10px] font-semibold text-amber-400 tracking-wider uppercase border border-slate-700/50">
                South Indian Holidays
              </div>
            </div>
          </div>

          {loginError && (
            <div className="bg-rose-950/20 border border-rose-900/40 text-rose-400 text-xs p-3.5 rounded-xl font-semibold flex items-center gap-2">
              <Lucide.AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5 tracking-wider">Backoffice Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lucide.User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Username (e.g. admin)"
                  className="w-full bg-slate-950 border border-slate-800 pl-10 pr-4 py-3 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs font-medium"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5 tracking-wider">Secure Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lucide.Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Password (e.g. admin)"
                  className="w-full bg-slate-950 border border-slate-800 pl-10 pr-4 py-3 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-xs font-bold py-3.5 rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-blue-600/30 uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <span>Access Backoffice Portal</span>
            <Lucide.ArrowRight className="w-4 h-4" />
          </button>

          <div className="pt-4 border-t border-slate-800 text-center text-[10px] text-slate-500 font-mono space-y-1">
            <p>Demo Admin Account: <span className="text-blue-400 font-bold">admin</span> / <span className="text-blue-400 font-bold">admin</span></p>
            <p>Demo Sales Account: <span className="text-teal-400 font-bold">sales</span> / <span className="text-teal-400 font-bold">sales</span></p>
          </div>
        </form>
        
        {/* Simple elegant travel footer */}
        <p className="mt-8 text-[10px] text-slate-600 font-medium">
          © 2026 South Indian Holidays. All Rights Reserved.
        </p>
      </div>
    );
  }

  // Active Workspace Route Router
  const renderActiveTabContent = () => {
    switch (currentTab) {
      case "dashboard":
        return (
          <DashboardTab
            leads={leads}
            bookings={bookings}
            payments={payments}
            expenses={expenses}
            setCurrentTab={setCurrentTab}
            onAddLead={handleAddLead}
          />
        );
      case "leads":
        return (
          <LeadsTab
            leads={leads}
            onAddLead={handleAddLead}
            onUpdateLead={handleUpdateLead}
            onDeleteLead={handleDeleteLead}
            users={users}
            currentUsername={user?.username || "admin"}
            onOpenWhatsAppChat={(mobile) => {
              setPreselectedWhatsAppMobile(mobile);
              setCurrentTab("whatsapp");
            }}
            setCurrentTab={setCurrentTab}
            onAddBooking={handleAddBooking}
            onAddItinerary={handleAddItinerary}
            onSelectLeadForQuotation={(lead) => {
              setSelectedLeadForQuotation(lead);
              setCurrentTab("quotations");
            }}
          />
        );
      case "followups":
        return (
          <FollowupsTab
            leads={leads}
            onUpdateLead={handleUpdateLead}
          />
        );
      case "packages":
        return (
          <PackagesTab
            packages={packages}
            onAddPackage={handleAddPackage}
            onUpdatePackage={handleUpdatePackage}
            onDeletePackage={handleDeletePackage}
            onUseInQuotation={(pkg) => {
              setSelectedPkgFromLibrary(pkg);
              setCurrentTab("quotations");
            }}
            onUseInBooking={(pkg) => {
              setSelectedPkgFromLibrary(pkg);
              setCurrentTab("bookings");
            }}
          />
        );
      case "quotations":
        return (
          <QuotationsTab
            packages={packages}
            leads={leads}
            itineraries={itineraries}
            selectedPkgFromLibrary={selectedPkgFromLibrary}
            clearSelectedPkg={() => setSelectedPkgFromLibrary(null)}
            selectedLeadForQuotation={selectedLeadForQuotation}
            clearSelectedLeadForQuotation={() => setSelectedLeadForQuotation(null)}
            companySettings={settings}
          />
        );
      case "bookings":
        return (
          <BookingsTab
            bookings={bookings}
            packages={packages}
            drivers={drivers}
            selectedPkgFromLibrary={selectedPkgFromLibrary}
            clearSelectedPkg={() => setSelectedPkgFromLibrary(null)}
            onAddBooking={handleAddBooking}
            onUpdateBooking={handleUpdateBooking}
            onDeleteBooking={handleDeleteBooking}
          />
        );
      case "vouchers":
        return (
          <VouchersTab
            vouchers={vouchers}
            bookings={bookings}
            hotels={hotels}
            onAddVoucher={handleAddVoucher}
            onUpdateVoucher={handleUpdateVoucher}
            onDeleteVoucher={handleDeleteVoucher}
            companySettings={settings}
          />
        );
      case "itineraries":
        return (
          <ItineraryTab
            itineraries={itineraries}
            bookings={bookings}
            packages={packages}
            onAddItinerary={handleAddItinerary}
            onUpdateItinerary={handleUpdateItinerary}
            onDeleteItinerary={handleDeleteItinerary}
            companySettings={settings}
          />
        );
      case "payments":
        return (
          <PaymentsTab
            payments={payments}
            onAddInstallment={handleAddInstallment}
            companySettings={settings}
          />
        );
      case "expenses":
        return (
          <ExpensesTab
            expenses={expenses}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        );
      case "reports":
        return (
          <ReportsTab
            leads={leads}
            bookings={bookings}
            payments={payments}
            expenses={expenses}
            companySettings={settings}
          />
        );
      case "settings":
        return (
          <SettingsTab
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onImportBackup={(backup) => {
              // Restore global settings
              if (backup.settings) setSettings(backup.settings);
            }}
          />
        );
      case "whatsapp":
        return (
          <WhatsappTab
            leads={leads}
            bookings={bookings}
            vouchers={vouchers}
            payments={payments}
            drivers={drivers}
            companySettings={settings}
            currentUser={user}
            preselectedMobile={preselectedWhatsAppMobile}
            clearPreselectedMobile={() => setPreselectedWhatsAppMobile("")}
          />
        );
      case "users":
        return (
          <UsersTab
            users={users}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
          />
        );
      case "products":
      case "hotels":
      case "drivers":
      case "suppliers":
        return (
          <DirectoryTabs
            hotels={hotels}
            drivers={drivers}
            suppliers={suppliers}
            onAddHotel={handleAddHotel}
            onAddDriver={handleAddDriver}
            onAddSupplier={handleAddSupplier}
            onDeleteHotel={handleDeleteHotel}
            onDeleteDriver={handleDeleteDriver}
            onDeleteSupplier={handleDeleteSupplier}
          />
        );
      default:
        return (
          <div className="p-8 text-center text-slate-500 font-mono text-xs">
            This module is currently initializing in backoffice environment.
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-100">
      {/* Sidebar - Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        user={user}
        userRole={user.role}
        companyName={settings.companyName}
        companyLogo={settings.logo}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <Header
          currentTab={currentTab}
          user={user}
          onLogout={handleLogout}
          overdueCount={overdueCount}
          todayFollowUpCount={todayFollowUpCount}
          upcomingToursCount={upcomingToursCount}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          theme={theme}
          onChangeTheme={setTheme}
          users={users}
          onImpersonateUser={handleImpersonateUser}
          isImpersonating={!!realAdminUser}
        />

        {realAdminUser && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between text-xs text-amber-300 select-none animate-fadeIn shrink-0">
            <div className="flex items-center gap-2">
              <Lucide.AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>
                <strong>Simulation Active:</strong> Currently simulating the exact view and capabilities of{" "}
                <strong className="text-white">{user?.fullName} ({user?.role?.toUpperCase()})</strong>.
              </span>
            </div>
            <button
              onClick={() => handleImpersonateUser(null)}
              className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold px-3 py-1 rounded-lg transition-all cursor-pointer text-[10px] uppercase tracking-wider shadow"
            >
              Exit Simulation
            </button>
          </div>
        )}

        {/* Content canvas with custom scrollbar */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {renderActiveTabContent()}
        </main>
      </div>

      {/* Printable Frame Layout Container */}
      <div id="print-canvas" className="hidden print:block bg-white text-black min-h-screen"></div>
    </div>
  );
}
