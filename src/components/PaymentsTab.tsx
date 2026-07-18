import React, { useState } from "react";
import * as Lucide from "lucide-react";
import { PaymentLedger } from "../types";
import { formatFriendlyDate } from "../utils";

interface PaymentsTabProps {
  payments: PaymentLedger[];
  onAddInstallment: (ledgerId: string, installment: { amount: number; method: string; referenceNo: string; date: string }) => void;
  companySettings: any;
}

export default function PaymentsTab({
  payments = [],
  onAddInstallment,
  companySettings
}: PaymentsTabProps) {
  const safePayments = Array.isArray(payments) ? payments : [];

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [activeLedger, setActiveLedger] = useState<PaymentLedger | null>(null);
  const [showReceipt, setShowReceipt] = useState<{ ledger: PaymentLedger; inst: any } | null>(null);

  // Installment Form Input
  const [instAmount, setInstAmount] = useState(1000);
  const [instMethod, setInstMethod] = useState("UPI");
  const [instRef, setInstRef] = useState("REF" + Math.floor(100000 + Math.random() * 900000));
  const [instDate, setInstDate] = useState(new Date().toISOString().split("T")[0]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLedger) return;

    onAddInstallment(activeLedger.id, {
      amount: Number(instAmount),
      method: instMethod,
      referenceNo: instRef,
      date: instDate
    });

    // Refresh active ledger local state to show updated balance
    const updated = safePayments.find(p => p.id === activeLedger.id);
    if (updated) setActiveLedger(updated);

    setActiveLedger(null);
    setInstAmount(1000);
    setInstRef("REF" + Math.floor(100000 + Math.random() * 900000));
  };

  // Receipt printing
  const triggerPrintReceipt = (p: PaymentLedger, inst: any) => {
    const printArea = document.getElementById("print-canvas");
    if (!printArea) return;

    printArea.innerHTML = `
      <div class="print-invoice max-w-2xl mx-auto p-8 text-black bg-white space-y-6">
        <div class="flex justify-between items-center border-b pb-4">
          <div class="flex items-center gap-3">
            ${companySettings?.logo ? `<img src="${companySettings.logo}" alt="Company Logo" class="w-12 h-12 object-contain rounded-lg border border-slate-200 p-1" referrerPolicy="no-referrer" />` : ""}
            <div>
              <h1 class="text-base font-black uppercase text-slate-800">${companySettings?.companyName || "South Indian Holidays"}</h1>
              <p class="text-[9px] text-slate-500 mt-0.5">${companySettings?.address || ""}</p>
            </div>
          </div>
          <div class="text-right">
            <h2 class="text-lg font-black text-slate-700 uppercase">RECEIPT OF PAYMENT</h2>
            <p class="text-xs text-slate-500 font-mono">Receipt No: RCP-${inst.id.substring(5, 12)}</p>
            <p class="text-xs text-slate-500 font-mono">Date: ${formatFriendlyDate(inst.date)}</p>
          </div>
        </div>

        <div class="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs space-y-1">
          <p class="text-[9px] uppercase font-bold text-emerald-500">Receipt Remittance Confirmation</p>
          <p>We gratefully acknowledge the receipt of payment from <strong>${p.customerName}</strong> for reservation file <strong>${p.bookingId}</strong>.</p>
        </div>

        <table class="w-full text-xs text-left border border-collapse">
          <thead>
            <tr class="bg-slate-900 text-white font-bold uppercase text-[9px] tracking-wider">
              <th class="p-2 border">Remitted Amount</th>
              <th class="p-2 border text-center">Payment Channel</th>
              <th class="p-2 border">Reference / Transaction Number</th>
              <th class="p-2 border">Value Date</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="p-2 border font-black text-sm text-emerald-600 font-mono">₹${Number(inst.amount).toLocaleString("en-IN")}</td>
              <td class="p-2 border text-center font-bold">${inst.method}</td>
              <td class="p-2 border font-mono">${inst.referenceNo}</td>
              <td class="p-2 border">${formatFriendlyDate(inst.date)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Outstanding Ledger Summary -->
        <div class="p-4 bg-slate-50 rounded-lg text-xs space-y-2">
          <h4 class="text-[9px] font-black uppercase text-slate-400 mb-1">Reservation Payment Ledger Status</h4>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="p-2 border rounded">
              <span class="text-[8px] text-slate-500 font-black uppercase block">Total Package Bill</span>
              <p class="font-black text-slate-800 font-mono mt-0.5">₹${p.totalAmount.toLocaleString("en-IN")}</p>
            </div>
            <div class="p-2 border rounded bg-emerald-50 border-emerald-100">
              <span class="text-[8px] text-slate-500 font-black uppercase block">Cumulative Paid</span>
              <p class="font-black text-emerald-600 font-mono mt-0.5">₹${p.advancePaid.toLocaleString("en-IN")}</p>
            </div>
            <div class="p-2 border rounded bg-rose-50 border-rose-100">
              <span class="text-[8px] text-slate-500 font-black uppercase block">Remaining Balance</span>
              <p class="font-black text-rose-600 font-mono mt-0.5">₹${p.balanceAmount.toLocaleString("en-IN")}</p>
            </div>
          </div>
        </div>

        <div class="pt-6 border-t text-[9px] text-slate-400 flex justify-between items-end">
          <div>
            <p>This is a computer-generated transaction acknowledgement and does not require a physical seal.</p>
          </div>
          <div class="text-right">
            <p class="font-bold text-slate-700">${companySettings?.companyName || "South Indian Holidays"}</p>
            <p class="opacity-75">Finance Desk Representative</p>
          </div>
        </div>
      </div>
    `;

    window.print();
  };

  // Filter lists
  const filteredPayments = safePayments.filter(p => {
    const term = search.toLowerCase();
    const matchesSearch =
      p.customerName.toLowerCase().includes(term) ||
      p.bookingId.toLowerCase().includes(term) ||
      p.id.toLowerCase().includes(term);

    const matchesStatus = filterStatus === "all" || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <Lucide.IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Outstanding Payment Ledgers</h3>
            <p className="text-[10px] text-slate-500 font-semibold">Track client deposits, balance collections, installment logs, and tax receipts</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        {/* LHS Outstanding Cards List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex gap-3 items-center">
            <div className="relative flex-1">
              <Lucide.Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ledgers by guest name, booking ID, invoice..."
                className="w-full bg-slate-950 border border-slate-850 pl-9 pr-4 py-2 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">-- All Statuses --</option>
              <option value="Paid">Fully Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Unpaid">Unpaid</option>
            </select>
          </div>

          {/* Table / Grid list */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg text-xs">
           <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-950/40 text-[9px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-850">
                <tr>
                  <th className="p-3.5">Customer Name</th>
                  <th className="p-3.5">Booking Ref</th>
                  <th className="p-3.5 text-right">Total Invoice</th>
                  <th className="p-3.5 text-right">Deposited</th>
                  <th className="p-3.5 text-right">Balance Due</th>
                  <th className="p-3.5 text-center">Ledger status</th>
                  <th className="p-3.5 text-right">Add Deposit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredPayments.map(p => {
                  const statusColors: any = {
                    Paid: "bg-emerald-950 text-emerald-400 border-emerald-900/30",
                    "Partially Paid": "bg-amber-950 text-amber-400 border-amber-900/30",
                    Unpaid: "bg-rose-950 text-rose-400 border-rose-900/30"
                  };

                  return (
                    <tr key={p.id} className="hover:bg-slate-950/20 transition-all">
                      <td className="p-3.5 font-black text-white">
                        <p>{p.customerName}</p>
                        <span className="text-[9px] text-slate-500 font-mono font-bold uppercase">{p.id}</span>
                      </td>
                      <td className="p-3.5 font-bold text-indigo-400 font-mono">{p.bookingId}</td>
                      <td className="p-3.5 text-right font-black font-mono">₹{p.totalAmount.toLocaleString("en-IN")}</td>
                      <td className="p-3.5 text-right font-bold font-mono text-emerald-400">₹{p.advancePaid.toLocaleString("en-IN")}</td>
                      <td className="p-3.5 text-right font-bold font-mono text-rose-400">₹{p.balanceAmount.toLocaleString("en-IN")}</td>
                      <td className="p-3.5 text-center">
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${statusColors[p.status]}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setActiveLedger(p)}
                            className="p-1 text-emerald-400 hover:text-emerald-300 bg-slate-950 hover:bg-slate-850 rounded border border-slate-850 cursor-pointer font-bold text-[10px] px-2 py-1"
                          >
                            + Deposit
                          </button>
                          {p.installments && p.installments.length > 0 && (
                            <button
                              onClick={() => {
                                // show payments logs drawer
                                setActiveLedger(p);
                              }}
                              className="p-1 text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-850 rounded border border-slate-850 cursor-pointer"
                              title="Show Installments Detail"
                            >
                              <Lucide.ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-mono">No active payment accounts listed.</td>
                  </tr>
                )}
              </tbody>
            </table>
           </div>
          </div>
        </div>

        {/* RHS Installment history log / Add transaction Form */}
        <div className="lg:col-span-1 space-y-4">
          {activeLedger ? (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                <h4 className="text-xs font-black uppercase text-emerald-400">Record Deposit Cash</h4>
                <button onClick={() => setActiveLedger(null)} className="text-slate-400 hover:text-white"><Lucide.X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-850">
                  <span className="text-[9px] uppercase font-black text-slate-500 block">Adding transaction to:</span>
                  <p className="font-black text-white">{activeLedger.customerName}</p>
                  <p className="text-[10px] text-rose-400 font-mono font-bold mt-1">Outstanding Balance: ₹{activeLedger.balanceAmount.toLocaleString("en-IN")}</p>
                </div>

                <div>
                  <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Receipt Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={instAmount}
                    onChange={(e) => setInstAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded-xl text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Channel Channel</label>
                    <select
                      value={instMethod}
                      onChange={(e) => setInstMethod(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 p-2 rounded-xl text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="UPI">UPI Transfer</option>
                      <option value="Bank Transfer">NEFT/IMPS</option>
                      <option value="Cash">Cash Receipt</option>
                      <option value="Cheque">Cheque Deposit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Receipt Date</label>
                    <input
                      type="date"
                      value={instDate}
                      onChange={(e) => setInstDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 p-2 rounded-xl text-xs text-slate-300 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Reference No / Receipt ID *</label>
                  <input
                    type="text"
                    required
                    value={instRef}
                    onChange={(e) => setInstRef(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 p-2 rounded-xl text-xs text-white focus:outline-none font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 text-xs pt-1">
                  <button type="button" onClick={() => setActiveLedger(null)} className="px-3 py-1 text-slate-400">Cancel</button>
                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 font-bold px-4 py-1.5 rounded-lg text-white">Record Remittance</button>
                </div>
              </form>

              {/* Installments List */}
              {activeLedger.installments && activeLedger.installments.length > 0 && (
                <div className="border-t border-slate-850 pt-3 space-y-2">
                  <h5 className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Installments Received Log</h5>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 text-xs">
                    {activeLedger.installments.map((inst, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-950 rounded-xl border border-slate-850 flex items-center justify-between gap-3 hover:border-slate-800 transition-all">
                        <div>
                          <p className="font-black text-emerald-400 font-mono">₹{Number(inst.amount).toLocaleString("en-IN")}</p>
                          <p className="text-[9px] text-slate-400">{inst.method} | Ref: {inst.referenceNo}</p>
                        </div>
                        <button
                          onClick={() => triggerPrintReceipt(activeLedger, inst)}
                          className="bg-slate-900 hover:bg-slate-800 text-[10px] text-indigo-400 px-2 py-1 rounded border border-slate-800 flex items-center gap-1 font-bold cursor-pointer"
                        >
                          <Lucide.Printer className="w-3 h-3" /> Receipt
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center text-slate-500 font-mono text-xs">
              <Lucide.FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-30 text-indigo-400" />
              <p>Select a deposit account to record client installments and print invoice receipts.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
