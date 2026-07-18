import React, { useState } from "react";
import * as Lucide from "lucide-react";
import { Expense } from "../types";
import { getLocalDateString, formatFriendlyDate } from "../utils";

interface ExpensesTabProps {
  expenses: Expense[];
  onAddExpense: (expense: Partial<Expense>) => void;
  onDeleteExpense: (id: string) => void;
}

export default function ExpensesTab({
  expenses = [],
  onAddExpense,
  onDeleteExpense
}: ExpensesTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState(1000);
  const [category, setCategory] = useState("Operations");
  const [date, setDate] = useState(getLocalDateString());

  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const totalExpense = safeExpenses.reduce((acc, cur) => acc + (cur.amount || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddExpense({
      description: desc,
      amount: Number(amount),
      category,
      date,
      approvedBy: "admin"
    });
    setDesc("");
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-600/10 border border-rose-500/20 text-rose-400 rounded-xl">
            <Lucide.TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Expense Manager</h3>
            <p className="text-[10px] text-slate-500 font-semibold">Track corporate operations outflows, salaries, driver advances, and vendor dues</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono font-bold text-slate-300">
          <span>Total Expenses logged: <span className="text-rose-400 text-sm">₹{totalExpense.toLocaleString("en-IN")}</span></span>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Lucide.Plus className="w-4 h-4" />
            Record Cash Outflow
          </button>
        </div>
      </div>

      {/* Expense form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 text-xs animate-fadeIn">
          <div>
            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Outflow Description *</label>
            <input
              type="text"
              required
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="e.g. Fuel advance for Innova TN-59"
              className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Cash Outflow Amount (₹) *</label>
            <input
              type="number"
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none font-mono"
            />
          </div>
          <div>
            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Budget Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-slate-300 focus:outline-none"
            >
              <option value="Operations">Operations / Fleet</option>
              <option value="Rent">Office Rent</option>
              <option value="Utilities">Internet & Utilities</option>
              <option value="Salary">Staff Salaries</option>
              <option value="Marketing">Google & Meta Ads</option>
              <option value="Vendor Settlement">Vendor Wholesaler Settlement</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Transaction Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-slate-300 focus:outline-none font-mono"
              />
            </div>
            <button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer">Log Cash</button>
          </div>
        </form>
      )}

      {/* Outflows log table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg text-xs animate-fadeIn">
       <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-950/40 text-[9px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-850">
            <tr>
              <th className="p-3.5">Ref No</th>
              <th className="p-3.5">Outflow Description</th>
              <th className="p-3.5">Category</th>
              <th className="p-3.5">Value Date</th>
              <th className="p-3.5">Authorized By</th>
              <th className="p-3.5 text-right font-mono">Amount (₹)</th>
              <th className="p-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {safeExpenses.map(e => (
              <tr key={e.id} className="hover:bg-slate-950/20">
                <td className="p-3.5 font-mono text-slate-500 font-bold">{e.id}</td>
                <td className="p-3.5 font-bold text-white">{e.description}</td>
                <td className="p-3.5">
                  <span className="text-[10px] bg-slate-950 border border-slate-850 px-2.5 py-0.5 rounded-full font-bold text-slate-400">
                    {e.category}
                  </span>
                </td>
                <td className="p-3.5 text-slate-400 font-medium">{formatFriendlyDate(e.date)}</td>
                <td className="p-3.5 text-slate-400 font-medium uppercase tracking-wider text-[10px] font-mono">{e.approvedBy || "admin"}</td>
                <td className="p-3.5 text-right font-black font-mono text-rose-400">₹{(e.amount || 0).toLocaleString("en-IN")}</td>
                <td className="p-3.5 text-right">
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this expense record?")) {
                        onDeleteExpense(e.id);
                      }
                    }}
                    className="text-rose-400 hover:text-rose-300 cursor-pointer"
                  >
                    <Lucide.Trash className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {safeExpenses.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500 font-mono">No cash out-flows logged.</td>
              </tr>
            )}
          </tbody>
        </table>
       </div>
      </div>
    </div>
  );
}
