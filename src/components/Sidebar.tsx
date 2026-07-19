import React, { useState } from "react";
import * as Lucide from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: any;
  userRole: string;
  companyName: string;
  companyLogo: string;
  sidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
  onLogout?: () => void;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  user,
  userRole,
  companyName,
  companyLogo,
  sidebarOpen = false,
  setSidebarOpen,
  onLogout
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Navigation groupings for LeadLine CRM Pro
  const navigationItems = [
    {
      group: "Core Workspace",
      roles: ["superadmin", "admin", "sales", "operations", "accounts", "accountant"],
      items: [
        { id: "dashboard", label: "Control Center", icon: "LayoutDashboard", roles: ["superadmin", "admin", "sales", "operations", "accounts", "accountant"] },
        { id: "leads", label: "Leads Desk", icon: "Users", roles: ["superadmin", "admin", "sales"] },
        { id: "followups", label: "Follow-ups & Cal", icon: "CalendarRange", roles: ["superadmin", "admin", "sales", "operations"] },
        { id: "bookings", label: "Bookings Desk", icon: "CheckSquare", roles: ["superadmin", "admin", "sales", "operations"] },
        { id: "vouchers", label: "Travel Vouchers", icon: "FileCheck", roles: ["superadmin", "admin", "sales", "operations"] },
        { id: "itineraries", label: "Itinerary Desk", icon: "Map", roles: ["superadmin", "admin", "sales", "operations"] },
        { id: "quotations", label: "Quotation Studio", icon: "FileText", roles: ["superadmin", "admin", "sales"] },
        { id: "whatsapp", label: "WhatsApp Studio", icon: "MessageSquare", roles: ["superadmin", "admin", "sales", "operations"] }
      ]
    },
    {
      group: "Financials & Logs",
      roles: ["superadmin", "admin", "accounts", "accountant", "operations"],
      items: [
        { id: "payments", label: "Payments Ledger", icon: "IndianRupee", roles: ["superadmin", "admin", "accounts", "accountant"] },
        { id: "expenses", label: "Expense Manager", icon: "TrendingDown", roles: ["superadmin", "admin", "accounts", "accountant"] },
        { id: "reports", label: "BI Reports", icon: "BarChart3", roles: ["superadmin", "admin", "accounts", "accountant"] }
      ]
    },
    {
      group: "Standard Libraries",
      roles: ["superadmin", "admin", "sales", "operations", "accounts", "accountant"],
      items: [
        { id: "packages", label: "Package Library", icon: "Compass", roles: ["superadmin", "admin", "sales", "operations"] },
        { id: "products", label: "Catalog Desk", icon: "Package", roles: ["superadmin", "admin"] },
        { id: "hotels", label: "Hotels Directory", icon: "Building2", roles: ["superadmin", "admin", "operations"] },
        { id: "drivers", label: "Fleet Registry", icon: "Car", roles: ["superadmin", "admin", "operations"] },
        { id: "suppliers", label: "Supplier Ledger", icon: "Briefcase", roles: ["superadmin", "admin", "operations"] },
        { id: "destinations", label: "Destination Master", icon: "MapPin", roles: ["superadmin", "admin", "operations"] }
      ]
    },
    {
      group: "Administration",
      roles: ["superadmin", "admin"],
      items: [
        { id: "users", label: "User Accounts", icon: "Shield", roles: ["superadmin", "admin"] },
        { id: "settings", label: "Company Profile", icon: "Sliders", roles: ["superadmin", "admin"] }
      ]
    }
  ];

  const handleTabClick = (id: string) => {
    setCurrentTab(id);
    if (setSidebarOpen) setSidebarOpen(false);
  };

  // Check if a navigation item is allowed based on custom granular permissions
  const isItemAllowed = (itemId: string, allowedRoles: string[]) => {
    // Superadmin and Admin always bypass permissions checks
    if (userRole === "superadmin" || userRole === "admin") return true;

    // Check custom permissions object
    if (user?.permissions) {
      // If they lack view permission, hide all tabs (except Dashboard control center)
      if (itemId !== "dashboard" && !user.permissions.view) return false;

      // Admin-only areas require Modify Rights
      if (itemId === "users" || itemId === "settings") {
        return user.permissions.modifyRights === true;
      }
    }

    // Default back to standard role-based filtering
    return allowedRoles.includes(userRole);
  };

  return (
    <>
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen && setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
        />
      )}

      <aside 
        className={`fixed inset-y-0 left-0 flex flex-col lg:static bg-slate-950 border-r border-slate-800/80 h-full flex-shrink-0 select-none z-50 transition-all duration-300 ease-in-out ${
          sidebarOpen 
            ? "translate-x-0 w-64" 
            : "-translate-x-full lg:translate-x-0 " + (isCollapsed ? "lg:w-20" : "lg:w-64")
        }`}
      >
        {/* Brand Header */}
        <div className={`p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/45 min-h-[81px]`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-500 p-[2px] shadow-lg shadow-blue-500/10 flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center overflow-hidden">
                  <Lucide.Compass className="w-6 h-6 text-teal-400 animate-[spin_120s_linear_infinite]" />
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full shadow-md"></span>
            </div>
            
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="min-w-0"
                >
                  <h1 className="text-sm font-black tracking-tight text-white uppercase truncate flex items-center gap-1">
                    <span>LeadLine</span>
                    <span className="text-teal-400">Pro</span>
                  </h1>
                  <p className="text-[10px] text-slate-400 font-bold tracking-tight truncate">
                    South Indian Holidays
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Collapse/Expand toggle on desktop & mobile exit */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer border border-transparent hover:border-slate-700/50"
              title={isCollapsed ? "Expand Menu" : "Collapse Menu"}
            >
              {isCollapsed ? <Lucide.ChevronRight className="w-4 h-4" /> : <Lucide.ChevronLeft className="w-4 h-4" />}
            </button>

            {setSidebarOpen && (
              <button 
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                <Lucide.X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-3 py-6 space-y-7 custom-scrollbar">
          {navigationItems.map(group => {
            const isGroupAllowed = group.roles.includes(userRole);
            if (!isGroupAllowed) return null;

            const allowedItems = group.items.filter(item => isItemAllowed(item.id, item.roles));
            if (allowedItems.length === 0) return null;

            return (
              <div key={group.group} className="space-y-2">
                {!isCollapsed && (
                  <motion.h3 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider"
                  >
                    {group.group}
                  </motion.h3>
                )}
                <nav className="space-y-1">
                  {allowedItems.map(item => {
                    const LucideIcon = (Lucide as any)[item.icon] || Lucide.HelpCircle;
                    const isActive = currentTab === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleTabClick(item.id)}
                        className={`w-full flex items-center ${isCollapsed ? "justify-center" : "justify-between"} px-3 py-2.5 rounded-xl text-xs transition-all duration-200 cursor-pointer group/item relative ${
                          isActive
                            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold shadow-lg shadow-blue-600/15"
                            : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
                        }`}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <LucideIcon className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover/item:scale-110 ${
                            isActive ? "text-white" : "text-slate-400 group-hover/item:text-slate-200"
                          }`} />
                          
                          {!isCollapsed && (
                            <span className="truncate">{item.label}</span>
                          )}
                        </div>

                        {!isCollapsed && isActive && (
                          <motion.span 
                            layoutId="activeIndicator"
                            className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-sm"
                          />
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>

        {/* User Profile Card at the bottom */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950">
          <div className={`p-2.5 rounded-2xl bg-slate-900/40 border border-slate-800/40 flex items-center ${isCollapsed ? "justify-center" : "gap-3"} transition-all hover:bg-slate-900/80 relative group`}>
            {/* User Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 p-[1.5px]">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-black text-xs text-teal-400">
                  {user?.fullName ? user.fullName.substring(0, 2).toUpperCase() : "US"}
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
            </div>

            {/* Profile Info */}
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-white truncate leading-tight">
                  {user?.fullName || "Backoffice User"}
                </h4>
                <p className="text-[10px] text-slate-400 truncate leading-none mt-1 uppercase font-semibold">
                  {userRole} account
                </p>
                <p className="text-[9px] text-slate-500 truncate leading-none mt-1 font-mono">
                  {user?.email || "internal@sih.com"}
                </p>
              </div>
            )}

            {/* Quick action or notification dot */}
            {!isCollapsed && (
              <div className="flex flex-col items-end gap-1.5">
                <div className="relative">
                  <span className="absolute top-0 right-0 w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
                  <span className="absolute top-0 right-0 w-2 h-2 bg-amber-500 rounded-full"></span>
                  <Lucide.Bell className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition-colors" />
                </div>
              </div>
            )}
          </div>

          {/* Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              title="Sign Out"
              className={`mt-2 w-full flex items-center ${isCollapsed ? "justify-center" : "justify-center gap-2"} px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/5 border border-rose-500/20 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all cursor-pointer`}
            >
              <Lucide.LogOut className="w-3.5 h-3.5" />
              {!isCollapsed && <span>Logout</span>}
            </button>
          )}

          {/* Core Footer Info */}
          {!isCollapsed ? (
            <div className="mt-2.5 text-center text-[9px] text-slate-600 font-mono flex items-center justify-center gap-1.5">
              <span>© 2026 South Indian Holidays</span>
            </div>
          ) : (
            <div className="mt-2.5 text-center text-[9px] text-slate-600 font-mono">
              v1.0
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
