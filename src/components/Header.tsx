import React, { useState } from "react";
import * as Lucide from "lucide-react";
import { User } from "../types";

interface HeaderProps {
  currentTab: string;
  user: User | null;
  onLogout: () => void;
  overdueCount: number;
  todayFollowUpCount: number;
  upcomingToursCount: number;
  onToggleSidebar?: () => void;
  theme?: "light" | "dark" | "system";
  onChangeTheme?: (theme: "light" | "dark" | "system") => void;
  users?: User[];
  onImpersonateUser?: (user: User | null) => void;
  isImpersonating?: boolean;
}

export default function Header({
  currentTab,
  user,
  onLogout,
  overdueCount,
  todayFollowUpCount,
  upcomingToursCount,
  onToggleSidebar,
  theme = "system",
  onChangeTheme,
  users = [],
  onImpersonateUser,
  isImpersonating = false
}: HeaderProps) {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const cycleTheme = () => {
    if (!onChangeTheme) return;
    if (theme === "light") onChangeTheme("dark");
    else if (theme === "dark") onChangeTheme("system");
    else onChangeTheme("light");
  };

  const getThemeIcon = () => {
    if (theme === "light") return <Lucide.Sun className="w-4 h-4 text-amber-500 animate-[spin_10s_linear_infinite]" />;
    if (theme === "dark") return <Lucide.Moon className="w-4 h-4 text-indigo-400" />;
    return <Lucide.Laptop className="w-4 h-4 text-emerald-400" />;
  };

  const getThemeLabel = () => {
    if (theme === "light") return "Light";
    if (theme === "dark") return "Dark";
    return "Auto";
  };

  // Dynamic breadcrumb label
  const getTabLabel = (id: string) => {
    switch (id) {
      case "dashboard": return "Control Center";
      case "leads": return "Leads & Deal Pipelines";
      case "followups": return "Follow-up & Scheduler Calendar";
      case "bookings": return "Reservations & Passages";
      case "vouchers": return "Hotel & Fleet Vouchers";
      case "itineraries": return "Itinerary Builder Workspace";
      case "quotations": return "Quotation Builder Studio";
      case "payments": return "Accounts & Payment Ledgers";
      case "expenses": return "Cash Flows & Outflow Expenses";
      case "reports": return "BI Accounting & Sales Matrices";
      case "packages": return "National & International Packages";
      case "products": return "Item Catalog List";
      case "hotels": return "Contracted Hotels Directory";
      case "drivers": return "Drivers & Fleet Registry";
      case "suppliers": return "Wholesalers & Supplier Ledger";
      case "users": return "User Credentials Management";
      case "settings": return "Global System Settings";
      case "whatsapp": return "WhatsApp CRM Studio";
      default: return "System Operations";
    }
  };

  const hasAlerts = overdueCount > 0 || todayFollowUpCount > 0 || upcomingToursCount > 0;

  return (
    <header className="sticky top-0 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 h-16 flex items-center justify-between px-6 flex-shrink-0 no-print z-30 select-none">
      {/* Left side: Hamburger Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button 
            onClick={onToggleSidebar}
            className="lg:hidden p-2 -ml-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <Lucide.Menu className="w-5 h-5" />
          </button>
        )}
        
        <div className="flex items-center gap-2">
          <Lucide.Compass className="w-4 h-4 text-indigo-400" />
          <span className="text-slate-500 text-xs font-semibold">CRM</span>
          <Lucide.ChevronRight className="w-3 h-3 text-slate-600" />
          <span className="text-white text-xs font-bold tracking-tight">{getTabLabel(currentTab)}</span>
        </div>
      </div>

      {/* Right Tools */}
      <div className="flex items-center gap-4">
        {/* Profile Simulator for Super Admin */}
        {(user?.role === "admin" || isImpersonating) && (
          <div className="flex items-center gap-1.5">
            <Lucide.UserCheck className="w-3.5 h-3.5 text-teal-400 hidden lg:inline" />
            <span className="hidden lg:inline text-[10px] text-teal-400 font-extrabold uppercase tracking-wider">Simulate:</span>
            <select
              value={isImpersonating ? user?.id : "admin"}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "admin") {
                  onImpersonateUser && onImpersonateUser(null);
                } else {
                  const targetUser = users.find(u => u.id === val);
                  if (targetUser && onImpersonateUser) {
                    onImpersonateUser(targetUser);
                  }
                }
              }}
              className="bg-slate-950 border border-teal-500/30 text-teal-300 font-bold text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-400 cursor-pointer shadow-sm hover:border-teal-500/50"
            >
              <option value="admin">👑 Super Admin (Admin Desk)</option>
              {users.filter(u => u.role !== "admin" && u.status === "Active").map(u => (
                <option key={u.id} value={u.id}>
                  👤 {u.fullName} ({u.role.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* System Date Indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-850/60 rounded-lg text-[10px] font-mono font-bold text-slate-400 shadow-sm">
          <Lucide.Clock className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span>UTC: {new Date().toLocaleDateString("en-IN")}</span>
        </div>

        {/* Dynamic Theme Switcher Trigger */}
        <button
          onClick={cycleTheme}
          title={`Switch Theme (Current: ${getThemeLabel()})`}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-850/60 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white hover:border-slate-700 transition-all cursor-pointer shadow-sm"
        >
          {getThemeIcon()}
          <span className="hidden sm:inline font-mono">{getThemeLabel()}</span>
        </button>

        {/* Notifications Popover trigger */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserDropdown(false);
            }}
            className={`p-2 rounded-lg border text-slate-400 hover:text-white transition-all cursor-pointer ${
              hasAlerts
                ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:text-amber-300 shadow-md shadow-amber-500/5"
                : "bg-slate-950 border-slate-850/60"
            }`}
          >
            <Lucide.Bell className="w-4 h-4" />
            {hasAlerts && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2.5 w-80 bg-slate-900 border border-slate-800/90 rounded-xl shadow-2xl shadow-black/80 z-50 p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Active Notifications</h4>
                <span className="text-[9px] bg-slate-950 px-2 py-0.5 rounded font-bold text-slate-400">Alerts</span>
              </div>
              <div className="space-y-2 text-xs">
                {overdueCount > 0 ? (
                  <div className="flex gap-2.5 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-300">
                    <Lucide.AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                    <div>
                      <p className="font-bold text-[11px]">Overdue Follow-ups</p>
                      <p className="text-[10px] opacity-85 mt-0.5">{overdueCount} calls are pending immediate response.</p>
                    </div>
                  </div>
                ) : null}

                {todayFollowUpCount > 0 ? (
                  <div className="flex gap-2.5 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300">
                    <Lucide.CalendarRange className="w-4 h-4 flex-shrink-0 text-amber-400" />
                    <div>
                      <p className="font-bold text-[11px]">Follow-ups Today</p>
                      <p className="text-[10px] opacity-85 mt-0.5">{todayFollowUpCount} follow-ups scheduled for today.</p>
                    </div>
                  </div>
                ) : null}

                {upcomingToursCount > 0 ? (
                  <div className="flex gap-2.5 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-300">
                    <Lucide.Palmtree className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                    <div>
                      <p className="font-bold text-[11px]">Upcoming Departures</p>
                      <p className="text-[10px] opacity-85 mt-0.5">{upcomingToursCount} reservation(s) starting in next 7 days.</p>
                    </div>
                  </div>
                ) : null}

                {!hasAlerts && (
                  <div className="text-center py-5 text-slate-500 font-medium">
                    <Lucide.Smile className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-[11px]">All clean! No critical warnings.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Account Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserDropdown(!showUserDropdown);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-850/60 hover:border-slate-700 transition-all cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white uppercase shadow-sm">
              {user?.fullName?.substring(0, 2) || "JD"}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-[11px] font-bold text-white truncate max-w-[120px]">{user?.fullName}</p>
              <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">{user?.role}</p>
            </div>
            <Lucide.ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2.5 w-52 bg-slate-900 border border-slate-800/90 rounded-xl shadow-2xl shadow-black/80 z-50 overflow-hidden animate-fadeIn">
              <div className="p-3 border-b border-slate-800/80 bg-slate-950/20 text-xs">
                <p className="font-bold text-white truncate">{user?.fullName}</p>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">{user?.email}</p>
              </div>
              <div className="p-1.5 space-y-0.5 bg-slate-900">
                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    onLogout();
                  }}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer font-bold"
                >
                  <Lucide.LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Sign Out Securely</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

