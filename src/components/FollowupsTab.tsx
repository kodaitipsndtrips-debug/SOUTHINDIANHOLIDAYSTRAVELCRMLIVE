import React, { useState } from "react";
import * as Lucide from "lucide-react";
import { Lead, FollowUp } from "../types";
import { getLocalDateString, formatFriendlyDate } from "../utils";

interface FollowupsTabProps {
  leads: Lead[];
  onUpdateLead: (leadId: string, lead: Partial<Lead>) => void;
}

export default function FollowupsTab({ leads = [], onUpdateLead }: FollowupsTabProps) {
  const todayStr = getLocalDateString();
  
  // Tomorrow calculations
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = getLocalDateString(tomorrowDate);

  // States
  const [filterChannel, setFilterChannel] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Calendar States
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Flatten all followups with lead context
  const allFollowups: (FollowUp & { leadId: string; leadName: string; leadMobile: string })[] = [];
  const safeLeads = Array.isArray(leads) ? leads : [];
  
  safeLeads.forEach(lead => {
    if (Array.isArray(lead.followUpHistory)) {
      lead.followUpHistory.forEach(fu => {
        allFollowups.push({
          ...fu,
          leadId: lead.id,
          leadName: lead.name || "",
          leadMobile: lead.mobile || ""
        });
      });
    }
  });

  // Extract unique assignees
  const assignees = Array.from(new Set(allFollowups.map(f => f.assignedTo).filter(Boolean)));

  // Perform filtering
  const filteredFollowups = allFollowups.filter(f => {
    const matchChannel = filterChannel === "all" || f.type.toLowerCase() === filterChannel.toLowerCase();
    const matchAssignee = filterAssignee === "all" || f.assignedTo === filterAssignee;
    const matchDate = !selectedDate || f.date === selectedDate;
    return matchChannel && matchAssignee && matchDate;
  });

  // Groups for standard summary blocks
  const overdue = filteredFollowups.filter(f => f.status === "Pending" && f.date < todayStr);
  const dueToday = filteredFollowups.filter(f => f.status === "Pending" && f.date === todayStr);
  const dueTomorrow = filteredFollowups.filter(f => f.status === "Pending" && f.date === tomorrowStr);
  const upcoming = filteredFollowups.filter(f => f.status === "Pending" && f.date > tomorrowStr);
  const completed = filteredFollowups.filter(f => f.status === "Completed");

  // Handle Mark Complete
  const markComplete = (leadId: string, fuId: string, remarksText: string) => {
    const safeLeads = Array.isArray(leads) ? leads : [];
    const lead = safeLeads.find(l => l.id === leadId);
    if (!lead) return;

    const updatedHistory = (lead.followUpHistory || []).map(f => {
      if (f.id === fuId) {
        const now = new Date();
        return {
          ...f,
          status: "Completed" as const,
          completionDate: todayStr,
          completionTime: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
          remarks: f.remarks + " (Completed note: " + remarksText + ")"
        };
      }
      return f;
    });

    const timeline = [...lead.timeline];
    timeline.unshift({
      timestamp: new Date().toLocaleDateString("en-IN"),
      text: `Follow-up completed: ${remarksText}`
    });

    onUpdateLead(leadId, {
      followUpHistory: updatedHistory,
      timeline
    });
  };

  const handleCompletePrompt = (leadId: string, fuId: string) => {
    const agentNote = prompt("Enter completion remarks or call results:");
    if (agentNote !== null) {
      markComplete(leadId, fuId, agentNote || "Done");
    }
  };

  const handleReschedule = (leadId: string, fuId: string, newDate: string) => {
    if (!newDate) return;
    const safeLeads = Array.isArray(leads) ? leads : [];
    const lead = safeLeads.find(l => l.id === leadId);
    if (!lead) return;

    const updatedHistory = (lead.followUpHistory || []).map(f => {
      if (f.id === fuId) {
        return {
          ...f,
          date: newDate
        };
      }
      return f;
    });

    const timeline = [...lead.timeline];
    timeline.unshift({
      timestamp: new Date().toLocaleDateString("en-IN"),
      text: `Rescheduled follow-up to ${newDate}`
    });

    onUpdateLead(leadId, {
      followUpHistory: updatedHistory,
      timeline
    });
  };

  // Calendar rendering helpers
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);
  const paddingDays = Array.from({ length: firstDayIndex }, (_, i) => i);

  const prevMonth = () => setCalendarDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(year, month + 1, 1));

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <Lucide.CalendarRange className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Follow-up Calendar Operations</h3>
            <p className="text-[10px] text-slate-500 font-semibold">Track scheduled calls, messages, and outreach histories</p>
          </div>
        </div>

        {/* Global Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div>
            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              className="bg-slate-950 border border-slate-800 p-2 rounded-xl text-slate-300 focus:outline-none text-[11px] cursor-pointer"
            >
              <option value="all">📞 All Outreach Channels</option>
              <option value="call">Call</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="visit">Visit</option>
            </select>
          </div>
          <div>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="bg-slate-950 border border-slate-800 p-2 rounded-xl text-slate-300 focus:outline-none text-[11px] cursor-pointer"
            >
              <option value="all">👤 All Active Agents</option>
              {assignees.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          {selectedDate && (
            <button
              onClick={() => setSelectedDate(null)}
              className="bg-indigo-950 hover:bg-indigo-900 text-indigo-400 px-3 py-2 rounded-xl text-[11px] font-bold border border-indigo-900/35 flex items-center gap-1 cursor-pointer transition-all"
            >
              <Lucide.X className="w-3.5 h-3.5" />
              Clear Date Filter
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Dynamic Calendar Grid */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-xs font-black uppercase text-indigo-400 flex items-center gap-1.5 tracking-wider">
              <Lucide.CalendarDays className="w-4 h-4 text-indigo-400" />
              Calendar Selector
            </h4>
            <div className="flex items-center gap-1.5">
              <button onClick={prevMonth} className="p-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 cursor-pointer text-slate-400 hover:text-white">
                <Lucide.ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-300 px-1 select-none">
                {monthNames[month]} {year}
              </span>
              <button onClick={nextMonth} className="p-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 cursor-pointer text-slate-400 hover:text-white">
                <Lucide.ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 select-none">
            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {paddingDays.map(p => (
              <div key={`p-${p}`} className="h-9" />
            ))}
            {daysArray.map(day => {
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;

              // Find pending follow-ups for this day
              const dayFollowups = allFollowups.filter(f => f.status === "Pending" && f.date === dateStr);
              const hasOverdue = dayFollowups.some(f => f.date < todayStr);
              const count = dayFollowups.length;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`h-9 rounded-lg flex flex-col items-center justify-between p-1.5 border relative cursor-pointer group transition-all duration-200 ${
                    isSelected
                      ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20 font-black"
                      : isToday
                      ? "bg-slate-950 border-emerald-500/60 text-emerald-400 font-bold"
                      : "bg-slate-950/40 border-slate-850 hover:border-slate-700 text-slate-300"
                  }`}
                >
                  <span className="text-[11px] leading-none">{day}</span>
                  {count > 0 && (
                    <div className="flex gap-0.5 justify-center">
                      <span className={`w-1.5 h-1.5 rounded-full ${hasOverdue ? "bg-rose-500" : isToday ? "bg-emerald-400" : "bg-indigo-400"}`} />
                      {count > 1 && <span className="text-[7px] text-slate-500 font-mono font-bold">+{count - 1}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-800/60 text-[10px] text-slate-500 font-mono space-y-1 bg-slate-950/10 p-2.5 rounded-xl">
            <p className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /><span>Green Border = Current day</span></p>
            <p className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /><span>Dots = Scheduled task pending</span></p>
            <p className="text-slate-400 font-semibold italic mt-1.5">Click any calendar date block to filter the cards below instantly.</p>
          </div>
        </div>

        {/* Right Side: Follow-up lists in columns based on statuses */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Overdue column */}
          <div className="space-y-3 bg-slate-950/20 p-4 border border-slate-850 rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2">
              <h4 className="text-xs font-black uppercase text-rose-400 flex items-center gap-1.5 tracking-wider">
                <Lucide.AlertCircle className="w-4 h-4 text-rose-500" />
                Overdue ({overdue.length})
              </h4>
            </div>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
              {overdue.map(fu => (
                <FollowupCard key={fu.id} fu={fu} onComplete={() => handleCompletePrompt(fu.leadId, fu.id)} onReschedule={(newD) => handleReschedule(fu.leadId, fu.id, newD)} isOverdue />
              ))}
              {overdue.length === 0 && <p className="text-[10px] text-slate-500 font-mono py-8 text-center bg-slate-900/30 border border-slate-850/45 rounded-xl">No overdue followups.</p>}
            </div>
          </div>

          {/* Today & Upcoming column */}
          <div className="space-y-3 bg-slate-950/20 p-4 border border-slate-850 rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2">
              <h4 className="text-xs font-black uppercase text-indigo-400 flex items-center gap-1.5 tracking-wider">
                <Lucide.Clock className="w-4 h-4 text-indigo-400" />
                Due Today & Future ({dueToday.length + dueTomorrow.length + upcoming.length})
              </h4>
            </div>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
              {/* Today */}
              {dueToday.map(fu => (
                <FollowupCard key={fu.id} fu={fu} onComplete={() => handleCompletePrompt(fu.leadId, fu.id)} onReschedule={(newD) => handleReschedule(fu.leadId, fu.id, newD)} badgeText="TODAY" />
              ))}
              {/* Tomorrow */}
              {dueTomorrow.map(fu => (
                <FollowupCard key={fu.id} fu={fu} onComplete={() => handleCompletePrompt(fu.leadId, fu.id)} onReschedule={(newD) => handleReschedule(fu.leadId, fu.id, newD)} badgeText="TOMORROW" />
              ))}
              {/* Upcoming */}
              {upcoming.map(fu => (
                <FollowupCard key={fu.id} fu={fu} onComplete={() => handleCompletePrompt(fu.leadId, fu.id)} onReschedule={(newD) => handleReschedule(fu.leadId, fu.id, newD)} />
              ))}
              {(dueToday.length + dueTomorrow.length + upcoming.length) === 0 && (
                <p className="text-[10px] text-slate-500 font-mono py-8 text-center bg-slate-900/30 border border-slate-850/45 rounded-xl">No pending tasks found for search filter.</p>
              )}
            </div>
          </div>

          {/* Fullwidth Completed History */}
          <div className="md:col-span-2 space-y-3 bg-slate-950/20 p-4 border border-slate-850 rounded-2xl mt-2">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2">
              <h4 className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5 tracking-wider">
                <Lucide.CheckSquare className="w-4 h-4 text-emerald-500" />
                Completed history ledger ({completed.length})
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              {completed.map(fu => (
                <div key={fu.id} className="p-3 bg-slate-900 border border-slate-850/80 rounded-xl opacity-75 flex flex-col justify-between gap-2 hover:border-slate-800 transition-all">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] font-mono text-slate-500 font-bold uppercase">{fu.leadId}</span>
                      <span className="text-[8px] font-mono font-bold text-slate-500">{fu.assignedTo || "admin"}</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-300">To: {fu.leadName}</p>
                    <p className="text-xs font-black text-slate-100 capitalize flex items-center gap-1">
                      <Lucide.CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      {fu.type} Completed
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed italic">"{fu.remarks}"</p>
                  </div>
                  <p className="text-[9px] text-slate-500 font-mono pt-1 border-t border-slate-850/40">Done: {fu.completionDate} at {fu.completionTime}</p>
                </div>
              ))}
              {completed.length === 0 && <p className="md:col-span-2 text-[10px] text-slate-500 font-mono py-6 text-center bg-slate-900/10 border border-slate-850/30 rounded-xl">No outreach completed yet.</p>}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

interface CardProps {
  fu: any;
  onComplete: () => void;
  onReschedule: (newDate: string) => void;
  isOverdue?: boolean;
  badgeText?: string;
}

function FollowupCard({ fu, onComplete, onReschedule, isOverdue = false, badgeText }: CardProps) {
  const channelIcons: any = {
    Call: <Lucide.Phone className="w-3.5 h-3.5 text-sky-400" />,
    WhatsApp: <Lucide.MessageSquare className="w-3.5 h-3.5 text-emerald-400" />,
    Email: <Lucide.Mail className="w-3.5 h-3.5 text-indigo-400" />,
    Visit: <Lucide.MapPin className="w-3.5 h-3.5 text-amber-400" />
  };

  return (
    <div className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 shadow transition-all ${
      isOverdue 
        ? "bg-rose-950/10 border-rose-500/20 hover:border-rose-500/40" 
        : "bg-slate-900 border-slate-850 hover:border-slate-800"
    }`}>
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[8px] font-mono text-slate-500 font-bold uppercase">{fu.leadId}</span>
            <h5 className="text-xs font-black text-white mt-0.5">{fu.leadName}</h5>
          </div>
          <div className="flex gap-1 items-center">
            {badgeText && (
              <span className="text-[8px] font-black text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded uppercase">
                {badgeText}
              </span>
            )}
            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
              fu.priority === "High" ? "bg-rose-500/10 text-rose-400" : fu.priority === "Medium" ? "bg-amber-500/10 text-amber-400" : "bg-slate-950 text-slate-500"
            }`}>
              {fu.priority}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-300 leading-relaxed font-semibold flex items-center gap-1.5">
          {channelIcons[fu.type] || <Lucide.PhoneCall className="w-3.5 h-3.5" />}
          <span>{fu.remarks}</span>
        </p>

        {/* Reschedule control (Single click datepicker, without typing) */}
        <div className="flex items-center justify-between text-[9px] font-mono font-bold text-slate-500 pt-1 border-t border-slate-850/40">
          <span>Date: {formatFriendlyDate(fu.date)}</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Reschedule:</span>
            <input
              type="date"
              value={fu.date}
              onChange={(e) => onReschedule(e.target.value)}
              className="bg-slate-950 border border-slate-800 p-1 rounded text-[10px] text-slate-300 font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
              title="Reschedule Follow-up with single-click Datepicker"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-850/50 pt-2 text-xs">
        <a href={`tel:${fu.leadMobile}`} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1">
          <Lucide.Smartphone className="w-3 h-3" /> Call {fu.leadMobile}
        </a>
        <button
          onClick={() => {
            let cleanMobile = fu.leadMobile.replace(/\D/g, "");
            if (cleanMobile.length === 10) {
              cleanMobile = "91" + cleanMobile;
            }
            const followUpMsg = `Hello ${fu.leadName},\n\nHope you are doing well!\n\nThis is a friendly follow-up from South Indian Holidays regarding: ${fu.remarks}.\n\nPlease let us know if you have any questions or are ready to lock in your booking.\n\nWarm Regards,\nSouth Indian Holidays`;
            window.open(`https://wa.me/${cleanMobile}?text=${encodeURIComponent(followUpMsg)}`, "_blank", "noopener,noreferrer");
          }}
          className="p-1 bg-emerald-950/25 hover:bg-emerald-950/50 border border-emerald-900/30 text-emerald-400 rounded-lg cursor-pointer"
          title="Follow-up on WhatsApp"
        >
          <Lucide.MessageSquare className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onComplete}
          className="text-[9px] font-black bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
        >
          <Lucide.CheckSquare className="w-3 h-3" /> Mark Done
        </button>
      </div>
    </div>
  );
}
