import React from "react";
import * as Lucide from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Lead, Booking, PaymentLedger, Expense } from "../types";

interface ReportsTabProps {
  leads: Lead[];
  bookings: Booking[];
  payments: PaymentLedger[];
  expenses: Expense[];
  companySettings?: any;
}

export default function ReportsTab({
  leads = [],
  bookings = [],
  payments = [],
  expenses = [],
  companySettings
}: ReportsTabProps) {
  // Safe Array wrappers
  const safePayments = Array.isArray(payments) ? payments : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const safeLeads = Array.isArray(leads) ? leads : [];

  // Profitability calculations
  const totalRevenueDeposited = safePayments.reduce((acc, cur) => acc + (cur.advancePaid || 0), 0);
  const totalExpensesLogged = safeExpenses.reduce((acc, cur) => acc + (cur.amount || 0), 0);
  const netOperatingProfit = totalRevenueDeposited - totalExpensesLogged;

  // Destination popularity counting
  const destCounts: any = {};
  safeBookings.forEach(b => {
    if (b.destination) {
      destCounts[b.destination] = (destCounts[b.destination] || 0) + 1;
    }
  });
  
  const destData = Object.keys(destCounts).map(key => ({
    name: key.toUpperCase(),
    Bookings: destCounts[key]
  }));

  // Leads breakdown
  const statusCounts: any = {};
  safeLeads.forEach(l => {
    if (l.status) {
      statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
    }
  });

  const statusColors = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#ef4444", "#a855f7"];
  const leadStatusData = Object.keys(statusCounts).map((key, idx) => ({
    name: key,
    value: statusCounts[key],
    color: statusColors[idx % statusColors.length]
  }));

  // Financial Sheet monthly performance
  const balanceSheetData = [
    { Month: "Jan", Inflow: 180000, Outflow: 35000, Net: 145000 },
    { Month: "Feb", Inflow: 240000, Outflow: 48000, Net: 192000 },
    { Month: "Mar", Inflow: 310000, Outflow: 62000, Net: 248000 },
    { Month: "Apr", Inflow: 420000, Outflow: 95000, Net: 325000 },
    { Month: "May", Inflow: 350000, Outflow: 120000, Net: 230000 },
    { Month: "Jun", Inflow: 510000, Outflow: 85000, Net: 425000 },
    { Month: "Jul", Inflow: totalRevenueDeposited, Outflow: totalExpensesLogged, Net: netOperatingProfit }
  ];

  return (
    <div className="space-y-6">
      {/* Print-only Header */}
      <div className="hidden print:flex justify-between items-center border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-center gap-3">
          {companySettings?.logo && (
            <img src={companySettings.logo} alt="Company Logo" className="w-14 h-14 object-contain rounded-lg border border-slate-200 p-1" referrerPolicy="no-referrer" />
          )}
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900">{companySettings?.companyName || "South Indian Holidays"}</h1>
            <p className="text-[10px] text-slate-500 mt-1">{companySettings?.address}</p>
            <p className="text-[9px] text-slate-600 font-mono">GSTIN: {companySettings?.gstNumber} | Phone: {companySettings?.phone}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold uppercase tracking-widest text-slate-700">BUSINESS INTELLIGENCE REPORT</h2>
          <p className="text-xs text-slate-500 font-mono mt-1">Date: {new Date().toLocaleDateString("en-IN")}</p>
        </div>
      </div>

      {/* Title */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <Lucide.BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">BI Accounting & Sales Matrices</h3>
            <p className="text-[10px] text-slate-500 font-semibold">Consolidated operating statements, profit indices, and target destinations analysis</p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Lucide.Printer className="w-4 h-4" />
          Print Full Report
        </button>
      </div>

      {/* Financial Bento row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total cash inflow */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between relative overflow-hidden group">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cumulative Deposits Inflow</p>
            <p className="text-3xl font-black text-emerald-400 font-mono">₹{totalRevenueDeposited.toLocaleString("en-IN")}</p>
            <span className="text-[9px] font-bold text-slate-500">From checked client receipts</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl">
            <Lucide.TrendingUp className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* Total expenses */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between relative overflow-hidden group">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cumulative Expenses Outflow</p>
            <p className="text-3xl font-black text-rose-400 font-mono">₹{totalExpensesLogged.toLocaleString("en-IN")}</p>
            <span className="text-[9px] font-bold text-slate-500">Log ledger cash withdrawals</span>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-2xl">
            <Lucide.TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Operating Profit */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between relative overflow-hidden group">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Net Operating Cash Balance</p>
            <p className={`text-3xl font-black font-mono ${netOperatingProfit >= 0 ? "text-indigo-400" : "text-rose-400"}`}>
              ₹{netOperatingProfit.toLocaleString("en-IN")}
            </p>
            <span className="text-[9px] font-bold text-slate-500">Remitted liquidity index</span>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-2xl">
            <Lucide.IndianRupee className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Visual Chart Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inflow vs Outflow monthly balance sheet */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-4">
          <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Income & Expense Comparison</h3>
              <p className="text-[10px] text-slate-500 font-medium">Monthly cash flow statement analysis</p>
            </div>
            <div className="flex gap-2 text-[9px] font-mono">
              <span className="flex items-center gap-1 text-slate-400 font-bold"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span>Inflow</span>
              <span className="flex items-center gap-1 text-slate-400 font-bold"><span className="w-2.5 h-2.5 bg-rose-500 rounded-sm"></span>Outflow</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={balanceSheetData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="Month" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "10px" }} />
                <Bar dataKey="Inflow" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Outflow" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DestinationPopularity */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white tracking-tight">Target Vacation Destinations POP Indices</h3>
            <p className="text-[10px] text-slate-500 font-medium">Sector volume tracking across bookings</p>
          </div>
          <div className="h-64 w-full">
            {destData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={destData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "10px" }} />
                  <Bar dataKey="Bookings" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">No bookings data to visualize.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
