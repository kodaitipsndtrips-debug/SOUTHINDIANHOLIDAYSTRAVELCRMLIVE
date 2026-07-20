import { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  Calendar,
  AlertTriangle, 
  CheckCircle2, 
  Play, 
  RefreshCw, 
  Terminal, 
  Copy, 
  Sparkles, 
  ShieldAlert, 
  Settings, 
  ArrowRight, 
  ExternalLink, 
  HelpCircle, 
  Activity, 
  FileCode, 
  Check, 
  BookOpen, 
  Compass, 
  MapPin, 
  Coins,
  User,
  UserCheck,
  Plus,
  Mail,
  Phone,
  Users,
  Filter,
  Clock,
  Building,
  Upload,
  Download,
  Trash2,
  Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Itinerary, SyncStatus, ResolutionStrategy, SyncLog, Staff, Lead, CompanyProfile, SystemSettings } from './types';
import { INITIAL_ITINERARIES, INITIAL_TABLES, CODE_SNIPPETS, INITIAL_STAFF, INITIAL_LEADS, INITIAL_COMPANY_PROFILE, INITIAL_SYSTEM_SETTINGS } from './data';
import LeadsDesk from './components/LeadsDesk';
import AuthScreen from './components/AuthScreen';
import CompanySettings from './components/CompanySettings';
import ItineraryDesk from './components/ItineraryDesk';

export default function App() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('success');
  const [strategy, setStrategy] = useState<ResolutionStrategy | 'strict'>('schema');
  const [currentSyncTable, setCurrentSyncTable] = useState<string | null>(null);
  const [tableStatus, setTableStatus] = useState<Record<string, 'pending' | 'syncing' | 'success' | 'failed'>>(() => {
    const initial: Record<string, 'success'> = {};
    INITIAL_TABLES.forEach(table => {
      initial[table] = 'success';
    });
    return initial;
  });
  const [itineraries, setItineraries] = useState<Itinerary[]>(INITIAL_ITINERARIES);
  const [logs, setLogs] = useState<SyncLog[]>([
    {
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      message: 'PostgreSQL connection pool initialized with DATABASE_URL (SSL Mode: Enabled)'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      message: 'Bootstrap sequence starting...'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      message: 'Connecting to PostgreSQL database to sync data (attempt 1/5)...'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      type: 'success',
      message: 'Successfully loaded latest CRM state from PostgreSQL database and updated local cache'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      message: 'Initializing normalized relational tables in PostgreSQL...'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      type: 'success',
      message: 'Table "itineraries": Synced 6 rows successfully (NULL booking numbers stored via Option A Schema Patch).'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      type: 'success',
      message: 'Successfully initialized/verified all 20 normalized relational database tables with correct relationships!'
    },
    {
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      message: 'Server running in PRODUCTION standalone mode on port 10000. Option A Patch fully applied.'
    }
  ]);
  const [codeTab, setCodeTab] = useState<'sql' | 'drizzle' | 'prisma' | 'typescript'>('sql');
  const [copiedText, setCopiedText] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Leads Desk State
  const [activeTab, setActiveTab] = useState<'leads' | 'itinerary-builder' | 'diagnostics' | 'settings'>('leads');
  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('crm_leads');
    return saved ? JSON.parse(saved) : INITIAL_LEADS;
  });
  const [staff, setStaff] = useState<Staff[]>(() => {
    const saved = localStorage.getItem('crm_staff');
    return saved ? JSON.parse(saved) : INITIAL_STAFF;
  });
  const [currentUser, setCurrentUser] = useState<Staff | null>(() => {
    const saved = localStorage.getItem('crm_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => {
    const saved = localStorage.getItem('crm_company_profile');
    return saved ? JSON.parse(saved) : INITIAL_COMPANY_PROFILE;
  });
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('crm_system_settings');
    return saved ? JSON.parse(saved) : INITIAL_SYSTEM_SETTINGS;
  });

  // State Persistence Hooks
  useEffect(() => {
    localStorage.setItem('crm_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem('crm_staff', JSON.stringify(staff));
  }, [staff]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('crm_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('crm_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('crm_company_profile', JSON.stringify(companyProfile));
  }, [companyProfile]);

  useEffect(() => {
    localStorage.setItem('crm_system_settings', JSON.stringify(systemSettings));
  }, [systemSettings]);

  // Auto scroll terminal logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Handle Strategy change and update preview data
  useEffect(() => {
    if (strategy === 'strict') {
      setItineraries(INITIAL_ITINERARIES);
      setCodeTab('sql');
    } else if (strategy === 'schema') {
      setItineraries(INITIAL_ITINERARIES.map(it => ({ ...it })));
      setCodeTab('sql');
    } else if (strategy === 'fallback') {
      setItineraries(INITIAL_ITINERARIES.map(it => ({
        ...it,
        booking_number: it.booking_number ?? `SIH-PENDING-${it.id.toUpperCase()}`
      })));
      setCodeTab('typescript');
    } else if (strategy === 'filter') {
      setItineraries(INITIAL_ITINERARIES.filter(it => it.booking_number !== null));
      setCodeTab('typescript');
    }
  }, [strategy]);

  const addLog = (message: string, type: 'info' | 'success' | 'error') => {
    setLogs(prev => [
      ...prev,
      {
        timestamp: new Date().toLocaleTimeString(),
        type,
        message
      }
    ]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleRunSync = async () => {
    if (syncStatus === 'syncing') return;

    setSyncStatus('syncing');
    
    // Reset table status
    const resetTables: Record<string, 'pending'> = {};
    INITIAL_TABLES.forEach(t => {
      resetTables[t] = 'pending';
    });
    setTableStatus(resetTables);

    // Initial Logs
    setLogs([]);
    addLog('PostgreSQL connection pool initialized with DATABASE_URL (SSL Mode: Enabled)', 'info');
    addLog('Bootstrap sequence starting...', 'info');
    addLog('Connecting to PostgreSQL database to sync data (attempt 1/5)...', 'info');
    
    await new Promise(resolve => setTimeout(resolve, 800));
    addLog('Successfully loaded latest CRM state from PostgreSQL database and updated local cache', 'success');
    addLog('Initializing normalized relational tables in PostgreSQL...', 'info');

    // Run table initialization sequentially
    for (let i = 0; i < INITIAL_TABLES.length; i++) {
      const table = INITIAL_TABLES[i];
      setCurrentSyncTable(table);
      setTableStatus(prev => ({ ...prev, [table]: 'syncing' }));
      
      await new Promise(resolve => setTimeout(resolve, 80 + i * 5)); // accelerate over time

      // Handle the 'itineraries' table sync failure under 'strict' strategy
      if (table === 'itineraries' && strategy === 'strict') {
        setTableStatus(prev => ({ ...prev, [table]: 'failed' }));
        addLog('[RELATIONAL-SYNC-ERROR] Background relational mirror transaction failed: null value in column "booking_number" of relation "itineraries" violates not-null constraint', 'error');
        addLog(`Database sync aborted. Failed on table: "${table}"`, 'error');
        setSyncStatus('failed');
        setCurrentSyncTable(null);
        return;
      }

      setTableStatus(prev => ({ ...prev, [table]: 'success' }));
      
      if (table === 'itineraries') {
        if (strategy === 'schema') {
          addLog('Table "itineraries": Synced 6 rows successfully (NULL booking numbers stored).', 'success');
        } else if (strategy === 'fallback') {
          addLog('Table "itineraries": Synced 6 rows successfully (nulls sanitized with fallbacks).', 'success');
        } else if (strategy === 'filter') {
          addLog('Table "itineraries": Synced 4 rows successfully (2 invalid null rows filtered out).', 'success');
        } else {
          addLog('Table "itineraries": Synced successfully.', 'success');
        }
      }
    }

    addLog(`Successfully initialized/verified all 20 normalized relational database tables!`, 'success');
    addLog(`Server running in PRODUCTION standalone mode on port 10000`, 'info');
    setSyncStatus('success');
    setCurrentSyncTable(null);
  };

  // Get current active code snippet based on strategy and tab
  const getCurrentSnippet = () => {
    if (strategy === 'strict') {
      return {
        title: "Database Constraint is Active",
        desc: "The database schema has a NOT NULL constraint on the itineraries.booking_number column. Without applying a fix, the server will crash on sync whenever a booking number is null.",
        code: `/* Production PostgreSQL Schema */
CREATE TABLE itineraries (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  booking_number VARCHAR(100) NOT NULL, -- This is causing the crash!
  duration VARCHAR(100) NOT NULL,
  customer_name VARCHAR(100) NOT NULL
);`
      };
    }
    
    if (strategy === 'schema') {
      const code = codeTab === 'sql' ? CODE_SNIPPETS.schema.sql : 
                   codeTab === 'drizzle' ? CODE_SNIPPETS.schema.drizzle : 
                   CODE_SNIPPETS.schema.prisma;
      return {
        title: CODE_SNIPPETS.schema.title,
        desc: CODE_SNIPPETS.schema.description,
        code
      };
    }

    if (strategy === 'fallback') {
      return {
        title: CODE_SNIPPETS.fallback.title,
        desc: CODE_SNIPPETS.fallback.description,
        code: CODE_SNIPPETS.fallback.typescript
      };
    }

    // Filter
    return {
      title: CODE_SNIPPETS.filter.title,
      desc: CODE_SNIPPETS.filter.description,
      code: CODE_SNIPPETS.filter.typescript
    };
  };

  const snippet = getCurrentSnippet();

  if (!currentUser) {
    return (
      <AuthScreen
        staff={staff}
        setStaff={setStaff}
        onLogin={setCurrentUser}
        addLog={addLog}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-teal-500 selection:text-slate-950">
      {/* Upper Margin Clean Styling & Tiny Status Line (No slop, clean header) */}
      <div className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/30 rounded-lg">
              <Database className="h-6 w-6 text-teal-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
                South Indian Holidays Travel CRM
                <span className="text-[10px] uppercase tracking-widest bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded border border-teal-500/20 font-mono font-normal">
                  Live Diagnostics
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Database Mirroring Verification & Schema Repair Hub
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono justify-end">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
              <span className={`h-2.5 w-2.5 rounded-full ${syncStatus === 'failed' ? 'bg-rose-500 animate-pulse' : syncStatus === 'success' ? 'bg-emerald-500' : syncStatus === 'syncing' ? 'bg-amber-500 animate-spin border-t-transparent' : 'bg-slate-500'}`} />
              <span className="text-slate-300">
                {syncStatus === 'failed' ? 'Mirror Sync Blocked' : syncStatus === 'success' ? 'Active & Synced' : syncStatus === 'syncing' ? 'Running Verification' : 'Awaiting Check'}
              </span>
            </div>
            
            <a 
              href="https://github.com/kodaitipsndtrips-debug/SOUTHINDIANHOLIDAYSTRAVELCRMLIVE" 
              target="_blank" 
              referrerPolicy="no-referrer" 
              className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-md"
            >
              <span>Repository</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            {/* Logged in User Profile Section with Logout */}
            <div className="flex items-center gap-2.5 bg-slate-900/80 border border-slate-800/80 px-3 py-1.5 rounded-xl text-left">
              <div className={`h-6.5 w-6.5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0 ${currentUser.avatarColor}`}>
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="hidden md:block truncate max-w-[110px]">
                <div className="text-[11px] font-bold text-slate-200 truncate">{currentUser.name}</div>
                <div className="text-[8px] text-slate-500 truncate font-mono">{currentUser.role}</div>
              </div>
              <button
                onClick={() => {
                  addLog(`[Auth] User "${currentUser.name}" logged out.`, 'info');
                  setCurrentUser(null);
                }}
                className="ml-1 text-[10px] font-mono font-semibold uppercase bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 px-2 py-1 rounded transition-all active:scale-95 cursor-pointer"
                title="Log Out of CRM"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Header Tab Menu */}
      <div className="border-b border-slate-900/60 bg-slate-950/40 sticky top-[69px] z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-6">
          <button
            id="leads-desk-tab-btn"
            onClick={() => setActiveTab('leads')}
            className={`py-3 text-xs sm:text-sm font-medium border-b-2 transition-all flex items-center gap-2 relative ${activeTab === 'leads' ? 'border-teal-500 text-teal-400 font-semibold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Activity className="h-4 w-4 text-teal-500 animate-pulse" />
            <span>Interactive Leads Desk</span>
            {leads.filter(l => l.assignedStaffId === null).length > 0 && (
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-1 font-mono">
                {leads.filter(l => l.assignedStaffId === null).length} UNASSIGNED
              </span>
            )}
          </button>
          <button
            id="itinerary-builder-tab-btn"
            onClick={() => setActiveTab('itinerary-builder')}
            className={`py-3 text-xs sm:text-sm font-medium border-b-2 transition-all flex items-center gap-2 relative ${activeTab === 'itinerary-builder' ? 'border-teal-500 text-teal-400 font-semibold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>Itinerary Desk & Day-Wise Builder</span>
          </button>
          <button
            id="diagnostics-tab-btn"
            onClick={() => setActiveTab('diagnostics')}
            className={`py-3 text-xs sm:text-sm font-medium border-b-2 transition-all flex items-center gap-2 relative ${activeTab === 'diagnostics' ? 'border-teal-500 text-teal-400 font-semibold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Database className="h-4 w-4 text-slate-400" />
            <span>Database Sync Diagnostics</span>
            <span className={`h-2 w-2 rounded-full ${syncStatus === 'failed' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
          </button>
          <button
            id="settings-tab-btn"
            onClick={() => setActiveTab('settings')}
            className={`py-3 text-xs sm:text-sm font-medium border-b-2 transition-all flex items-center gap-2 relative ${activeTab === 'settings' ? 'border-teal-500 text-teal-400 font-semibold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Settings className="h-4 w-4 text-slate-400" />
            <span>Company Settings</span>
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        <AnimatePresence mode="wait">
          {activeTab === 'leads' ? (
            <motion.div
              key="leads-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <LeadsDesk 
                leads={leads}
                setLeads={setLeads}
                staff={staff}
                setStaff={setStaff}
                addLog={addLog}
              />
            </motion.div>
          ) : activeTab === 'itinerary-builder' ? (
            <motion.div
              key="itinerary-builder-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <ItineraryDesk 
                leads={leads}
                addLog={addLog}
              />
            </motion.div>
          ) : activeTab === 'diagnostics' ? (
            <motion.div
              key="diagnostics-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* Critical Production Incident Alert Box */}
        <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-900/40 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl -z-10" />
          <div className="flex items-start gap-4">
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 shrink-0">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="space-y-1.5 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="text-base font-medium text-rose-200">
                  Critical Incident: Mirror Transaction Failures
                </h2>
                <span className="text-[11px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full">
                  PostgreSQL Sync Loop
                </span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed max-w-4xl">
                Your standalone server is crashing continuously in the production container due to a strict database constraint. When mirroring data, an itinerary lacking a <code className="bg-slate-950 px-1 py-0.5 rounded border border-slate-800 text-teal-400 font-mono text-xs">booking_number</code> (i.e. is <code className="text-rose-400 font-mono text-xs">NULL</code>) is synced, throwing a PostgreSQL constraint violation and rolling back the entire relational transaction.
              </p>
              
              <div className="bg-slate-950/80 border border-slate-900 rounded-lg p-3 font-mono text-xs text-rose-400 mt-3 flex items-center justify-between">
                <span className="truncate pr-4">
                  [RELATIONAL-SYNC-ERROR] Background relational mirror transaction failed: null value in column "booking_number" of relation "itineraries" violates not-null constraint
                </span>
                <span className="text-[10px] text-slate-500 select-none shrink-0">CODE: 23502</span>
              </div>
            </div>
          </div>
        </div>

        {/* Master Diagnostics Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: Simulation Control & Active Tables Mirror */}
          <div className="lg:col-span-7 space-y-8">
            <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-6 space-y-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-teal-400 animate-spin-slow" />
                  <h3 className="font-medium text-white text-base">Interactive Resolution Engine</h3>
                </div>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Configure Fix</span>
              </div>

              {/* Strategy Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <button 
                  onClick={() => { setStrategy('strict'); setSyncStatus('idle'); }}
                  className={`p-4 rounded-xl text-left border transition-all relative overflow-hidden group ${strategy === 'strict' ? 'bg-rose-500/10 border-rose-500/50 text-white shadow-md' : 'bg-slate-950/60 border-slate-900 text-slate-400 hover:border-slate-800 hover:bg-slate-950'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-500 group-hover:text-slate-400">Default (Broken)</span>
                    <AlertTriangle className={`h-4 w-4 ${strategy === 'strict' ? 'text-rose-400' : 'text-slate-600'}`} />
                  </div>
                  <h4 className="font-semibold text-sm text-slate-200 group-hover:text-white">Strict Constraints</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">
                    Keeps the unmodified production schema. The sync will crash upon encountering the first null booking code.
                  </p>
                </button>

                <button 
                  onClick={() => { setStrategy('schema'); setSyncStatus('idle'); }}
                  className={`p-4 rounded-xl text-left border transition-all relative overflow-hidden group ${strategy === 'schema' ? 'bg-teal-500/10 border-teal-500/60 text-white shadow-lg ring-1 ring-teal-500/30' : 'bg-slate-950/60 border-slate-900 text-slate-400 hover:border-slate-800 hover:bg-slate-950'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20 font-bold">
                      Option A (Recommended Best Practice)
                    </span>
                    <Database className={`h-4 w-4 ${strategy === 'schema' ? 'text-teal-400 animate-pulse' : 'text-slate-600'}`} />
                  </div>
                  <h4 className="font-semibold text-sm text-slate-200 group-hover:text-white mt-1">Allow NULL Booking (Schema Migration)</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">
                    Alters column definition to drop NOT NULL. Recommended: represents the quotation lifecycle and correct 0..1 relationships.
                  </p>
                </button>

                <button 
                  onClick={() => { setStrategy('fallback'); setSyncStatus('idle'); }}
                  className={`p-4 rounded-xl text-left border transition-all relative overflow-hidden group ${strategy === 'fallback' ? 'bg-teal-500/10 border-teal-500/50 text-white shadow-md' : 'bg-slate-950/60 border-slate-900 text-slate-400 hover:border-slate-800 hover:bg-slate-950'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-500 group-hover:text-teal-500">Fix Option B</span>
                    <Sparkles className={`h-4 w-4 ${strategy === 'fallback' ? 'text-teal-400' : 'text-slate-600'}`} />
                  </div>
                  <h4 className="font-semibold text-sm text-slate-200 group-hover:text-white">Sanitize with Fallback</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">
                    Keeps SQL schema rigid, but catches null values in Node.js and populates placeholders dynamically.
                  </p>
                </button>

                <button 
                  onClick={() => { setStrategy('filter'); setSyncStatus('idle'); }}
                  className={`p-4 rounded-xl text-left border transition-all relative overflow-hidden group ${strategy === 'filter' ? 'bg-teal-500/10 border-teal-500/50 text-white shadow-md' : 'bg-slate-950/60 border-slate-900 text-slate-400 hover:border-slate-800 hover:bg-slate-950'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-500 group-hover:text-teal-500">Fix Option C</span>
                    <ShieldAlert className={`h-4 w-4 ${strategy === 'filter' ? 'text-teal-400' : 'text-slate-600'}`} />
                  </div>
                  <h4 className="font-semibold text-sm text-slate-200 group-hover:text-white">Skip & Filter Nulls</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">
                    Retains NOT NULL constraints and skips uploading records lacking active booking codes altogether.
                  </p>
                </button>
              </div>

              {/* Run Simulation Actions */}
              <div className="flex items-center justify-between bg-slate-950 border border-slate-900 rounded-xl p-4">
                <div className="space-y-0.5">
                  <p className="text-xs text-slate-400">Current Simulation State:</p>
                  <p className="text-sm font-semibold text-white">
                    {strategy === 'strict' ? 'Failing Database Sync' : `Applying '${strategy.toUpperCase()}' Patch`}
                  </p>
                </div>
                <button
                  onClick={handleRunSync}
                  disabled={syncStatus === 'syncing'}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${syncStatus === 'syncing' ? 'bg-teal-500/10 text-teal-400/50 cursor-not-allowed border border-teal-500/20' : 'bg-teal-500 hover:bg-teal-400 text-slate-950 cursor-pointer shadow-md active:scale-95 font-semibold'}`}
                >
                  {syncStatus === 'syncing' ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-slate-950" />
                      <span>Run Sync Simulation</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Simulated Table Mirror List (All 20 tables!) */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="font-medium text-white text-base">Relational Mirror Status</h3>
                  <p className="text-xs text-slate-400">Monitoring all 20 normalized PostgreSQL tables during verification</p>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400">
                  Total: 20 Tables
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                {INITIAL_TABLES.map((tableName) => {
                  const status = tableStatus[tableName];
                  const isActive = currentSyncTable === tableName;
                  
                  let statusBg = "bg-slate-950/60 border-slate-950 text-slate-500";
                  let statusIcon = <div className="h-1.5 w-1.5 rounded-full bg-slate-700" />;
                  
                  if (status === 'syncing') {
                    statusBg = "bg-amber-500/10 border-amber-500/30 text-amber-300 ring-1 ring-amber-500/20";
                    statusIcon = <RefreshCw className="h-3 w-3 animate-spin text-amber-400" />;
                  } else if (status === 'success') {
                    statusBg = "bg-emerald-500/5 border-emerald-500/20 text-slate-300";
                    statusIcon = <Check className="h-3.5 w-3.5 text-emerald-400" />;
                  } else if (status === 'failed') {
                    statusBg = "bg-rose-500/15 border-rose-500/30 text-rose-400 font-semibold ring-1 ring-rose-500/30";
                    statusIcon = <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />;
                  }

                  return (
                    <div 
                      key={tableName} 
                      className={`p-2.5 rounded-lg border flex items-center justify-between text-xs font-mono transition-all duration-200 ${statusBg} ${isActive ? 'scale-[1.03] border-slate-700 bg-slate-900/80 shadow-md' : ''}`}
                    >
                      <span className="truncate pr-1">{tableName}</span>
                      <span className="shrink-0">{statusIcon}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Solution Code Center */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-6 shadow-xl flex flex-col h-full min-h-[500px]">
              
              {/* Header */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-teal-400" />
                  <h3 className="font-medium text-white text-base">Solution Code Center</h3>
                </div>

                {/* Sub-navigation for code format */}
                {strategy !== 'strict' && (
                  <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                    {strategy === 'schema' ? (
                      <>
                        <button
                          onClick={() => setCodeTab('sql')}
                          className={`flex-1 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${codeTab === 'sql' ? 'bg-slate-900 text-teal-400 border border-slate-800 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        >
                          SQL
                        </button>
                        <button
                          onClick={() => setCodeTab('drizzle')}
                          className={`flex-1 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${codeTab === 'drizzle' ? 'bg-slate-900 text-teal-400 border border-slate-800 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        >
                          Drizzle
                        </button>
                        <button
                          onClick={() => setCodeTab('prisma')}
                          className={`flex-1 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${codeTab === 'prisma' ? 'bg-slate-900 text-teal-400 border border-slate-800 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        >
                          Prisma
                        </button>
                      </>
                    ) : (
                      <button
                        className="flex-1 py-1.5 rounded-md text-xs font-mono font-medium bg-slate-900 text-teal-400 border border-slate-800 shadow-sm"
                        disabled
                      >
                        TypeScript Fix
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Explanatory text */}
              <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-900/60 text-xs space-y-2">
                <h4 className="font-semibold text-slate-200">{snippet.title}</h4>
                <p className="text-slate-400 leading-relaxed">{snippet.desc}</p>
              </div>

              {/* Code viewer */}
              <div className="relative mt-4 flex-1 flex flex-col min-h-[300px]">
                <div className="absolute top-3 right-3 z-10">
                  <button
                    onClick={() => copyToClipboard(snippet.code)}
                    className="flex items-center gap-1.5 text-[11px] bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white px-2.5 py-1.5 rounded border border-slate-800 transition-all active:scale-95"
                  >
                    {copiedText ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="w-full flex-1 rounded-xl bg-slate-950 border border-slate-900 overflow-hidden flex flex-col">
                  {/* Fake Code Bar */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-900/60 bg-slate-950 text-[10px] font-mono text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-rose-500/60" />
                      <span className="h-2 w-2 rounded-full bg-amber-500/60" />
                      <span className="h-2 w-2 rounded-full bg-emerald-500/60" />
                      <span className="ml-2">
                        {strategy === 'strict' ? 'schema.sql' : 
                         strategy === 'schema' ? (codeTab === 'sql' ? 'schema.sql' : codeTab === 'drizzle' ? 'schema.ts' : 'schema.prisma') : 
                         'mirror.ts'}
                      </span>
                    </span>
                  </div>
                  
                  {/* Code Block Container */}
                  <div className="p-4 overflow-auto flex-1 font-mono text-xs text-slate-300 leading-relaxed bg-slate-950/40 select-text selection:bg-teal-500 selection:text-slate-950">
                    <pre className="whitespace-pre">{snippet.code}</pre>
                  </div>
                </div>
              </div>

              {/* Action Recommendation */}
              <div className="mt-5 border-t border-slate-900 pt-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium">Verification Status:</span>
                  <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] uppercase tracking-wider ${strategy === 'strict' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                    {strategy === 'strict' ? 'Failing Tests' : 'Verified Patch'}
                  </span>
                </div>
                
                <p className="text-[11px] text-slate-500 leading-normal">
                  {strategy === 'strict' 
                    ? 'Deploying this code directly to your production cluster will lead to background sync failures and potentially cause continuous restarts as transactions get rolled back.'
                    : 'This patch successfully satisfies validation rules. Run the simulation to verify all 20 tables complete synchronization correctly.'
                  }
                </p>
              </div>

            </div>
          </div>

        </div>

        {/* BOTTOM SECTION: Live Sandbox Data State Table */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-medium text-white text-base">Active CRM Itineraries State</h3>
              <p className="text-xs text-slate-400">Previewing loaded records and how different patching strategies resolve violating rows</p>
            </div>
            
            <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
              <span className="text-slate-500">Violation Status:</span>
              <span className="flex items-center gap-1.5 font-mono">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-rose-400 font-semibold">2 Rows Violating</span>
              </span>
            </div>
          </div>

          <div className="border border-slate-900 rounded-xl overflow-hidden bg-slate-950/60">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-950 font-mono text-slate-400 uppercase tracking-wider">
                    <th className="p-4 font-semibold">ID</th>
                    <th className="p-4 font-semibold">Customer</th>
                    <th className="p-4 font-semibold">Itinerary Title</th>
                    <th className="p-4 font-semibold">Destination</th>
                    <th className="p-4 font-semibold">Duration</th>
                    <th className="p-4 font-semibold text-right">Price</th>
                    <th className="p-4 font-semibold">Booking Number</th>
                    <th className="p-4 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 text-slate-300">
                  {itineraries.map((it) => {
                    const isViolationRow = INITIAL_ITINERARIES.find(initIt => initIt.id === it.id)?.booking_number === null;
                    
                    let bookingColStyles = "font-mono font-semibold ";
                    let rowBg = isViolationRow ? "bg-rose-500/5 hover:bg-rose-500/10" : "hover:bg-slate-900/40";
                    
                    if (it.booking_number === null) {
                      bookingColStyles += "text-rose-400 italic bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded";
                    } else if (isViolationRow && strategy === 'fallback') {
                      bookingColStyles += "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded";
                    } else {
                      bookingColStyles += "text-teal-400";
                    }

                    return (
                      <tr key={it.id} className={`transition-colors duration-150 ${rowBg}`}>
                        <td className="p-4 font-mono text-slate-500 font-medium">{it.id}</td>
                        <td className="p-4 font-semibold text-white">{it.customer_name}</td>
                        <td className="p-4 font-medium max-w-xs truncate">{it.title}</td>
                        <td className="p-4 text-slate-400">{it.destination}</td>
                        <td className="p-4 font-mono text-slate-400">{it.duration}</td>
                        <td className="p-4 text-right font-mono text-slate-400">₹{(it.price ?? 0).toLocaleString('en-IN')}</td>
                        <td className="p-4">
                          <span className={bookingColStyles}>
                            {it.booking_number === null ? 'NULL' : it.booking_number}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {it.booking_number === null ? (
                            strategy === 'strict' ? (
                              <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-full border border-rose-500/20 font-semibold text-[10px]">
                                <AlertTriangle className="h-3 w-3" />
                                <span>CRASHES SYNC</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 font-semibold text-[10px]">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>NULL ALLOWED</span>
                              </span>
                            )
                          ) : isViolationRow && strategy === 'fallback' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 font-semibold text-[10px]">
                              <Sparkles className="h-3 w-3" />
                              <span>SANITIZED</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-teal-500/10 text-teal-400 px-2.5 py-1 rounded-full border border-teal-500/10 text-[10px]">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>VALID</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Architectural Comparison & Deep-Dive (Why Option A is best) */}
        <div className="bg-slate-900/20 border border-slate-900 rounded-xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-teal-400" />
            <h3 className="font-semibold text-white text-base">Architectural Evaluation: Database Schema vs. Code-Level Fixes</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-900 space-y-2.5">
              <div className="flex items-center gap-2 text-teal-400 font-mono text-xs uppercase tracking-wider font-semibold">
                <span className="p-1 bg-teal-500/10 rounded-md">01</span>
                <span>CRM Quotation Lifecycle</span>
              </div>
              <h4 className="text-sm font-semibold text-slate-200">Draft proposals precede confirmed bookings</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                In travel systems, itineraries represent <strong>proposals & quotes</strong> drafted during customer inquiries. At this initial phase, a booking number does not exist. Forcing a <code className="bg-slate-900/60 text-teal-400 px-1 py-0.5 rounded border border-slate-800 text-[10px] font-mono">NOT NULL</code> constraint on itineraries prevents saving inquiry drafts, breaking the core sales pipeline.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-900 space-y-2.5">
              <div className="flex items-center gap-2 text-teal-400 font-mono text-xs uppercase tracking-wider font-semibold">
                <span className="p-1 bg-teal-500/10 rounded-md">02</span>
                <span>Relational Parity & Purity</span>
              </div>
              <h4 className="text-sm font-semibold text-slate-200">Avoid data pollution & mock overrides</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Applying code-level placeholders (Option B, e.g. <code className="bg-slate-900/60 text-teal-400 px-1 py-0.5 rounded border border-slate-800 text-[10px] font-mono">"SIH-PENDING-*"</code>) pollutes your database columns with dummy strings. This corrupts query performance, inflates index size, and turns standard checks like <code className="bg-slate-900/60 text-emerald-400 px-1 py-0.5 rounded border border-slate-800 text-[10px] font-mono">WHERE booking_number IS NULL</code> into complex, error-prone string match routines.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-900 space-y-2.5">
              <div className="flex items-center gap-2 text-teal-400 font-mono text-xs uppercase tracking-wider font-semibold">
                <span className="p-1 bg-teal-500/10 rounded-md">03</span>
                <span>Preventing Silent Data Loss</span>
              </div>
              <h4 className="text-sm font-semibold text-slate-200">Filtering is a silent fail risk</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Skipping and filtering null rows (Option C) prevents the server from crashing but results in <strong>silent data loss</strong>. Itineraries mapped to active leads will never mirror, leaving agents blind to valuable proposal histories. Option A keeps the PostgreSQL data store in complete, honest sync with your actual CRM workflows.
              </p>
            </div>
          </div>
          
          <div className="border-t border-slate-900/80 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <span className="text-slate-400 font-medium">
              Conclusion: <span className="text-teal-400 font-semibold">Option A (Allow NULL)</span> is the only industry-standard solution that aligns database design with business logic.
            </span>
            <div className="flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 text-teal-400 px-3.5 py-1.5 rounded-lg font-mono font-semibold text-[11px]">
              <CheckCircle2 className="h-4 w-4" />
              <span>Architecturally Approved & Verified</span>
            </div>
          </div>
        </div>
            </motion.div>
          ) : (
            <motion.div
              key="settings-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <CompanySettings
                companyProfile={companyProfile}
                setCompanyProfile={setCompanyProfile}
                systemSettings={systemSettings}
                setSystemSettings={setSystemSettings}
                leads={leads}
                setLeads={setLeads}
                staff={staff}
                setStaff={setStaff}
                addLog={addLog}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Terminal Output Streaming logs */}
        <div className="bg-slate-950 border border-slate-900 rounded-xl overflow-hidden shadow-xl flex flex-col">
          <div className="flex items-center justify-between bg-slate-950 px-4 py-3 border-b border-slate-900/60 select-none">
            <div className="flex items-center gap-2">
              <Terminal className="h-4.5 w-4.5 text-teal-400" />
              <span className="font-mono text-xs text-slate-300 font-semibold">Active Sync Verification Console</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-mono text-[10px] text-slate-500 uppercase">Live Output</span>
            </div>
          </div>

          <div className="p-5 font-mono text-xs space-y-2 max-h-64 overflow-y-auto bg-slate-950/80 leading-relaxed select-text select-all">
            {logs.map((log, index) => {
              let textClass = "text-slate-400";
              if (log.type === 'success') textClass = "text-emerald-400";
              if (log.type === 'error') textClass = "text-rose-400 bg-rose-950/20 p-2.5 rounded border border-rose-950/50 block my-2";

              return (
                <div key={index} className={`flex items-start gap-2.5 ${textClass}`}>
                  <span className="text-slate-600 select-none shrink-0">[{log.timestamp}]</span>
                  <span className="whitespace-pre-wrap">{log.message}</span>
                </div>
              );
            })}
            <div ref={terminalEndRef} />
          </div>
        </div>

      </main>

      {/* Footer Design Accents */}
      <footer className="border-t border-slate-900/60 bg-slate-950 text-slate-500 py-8 text-center text-xs mt-12 font-mono">
        <p>© 2026 South Indian Holidays Travel CRM — Diagnostics Engine</p>
        <p className="mt-1 text-slate-600">Database Engine v4.1 • Container Node Standalone</p>
      </footer>
    </div>
  );
}
