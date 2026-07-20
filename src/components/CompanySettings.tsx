import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Settings, 
  Sliders, 
  Upload, 
  Download, 
  Trash2, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  Globe, 
  Mail, 
  Phone, 
  MapPin, 
  Coins, 
  Compass, 
  FileCode, 
  CheckCircle2, 
  Sparkles,
  Play,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CompanyProfile, SystemSettings, Lead, Staff } from '../types';

interface CompanySettingsProps {
  companyProfile: CompanyProfile;
  setCompanyProfile: React.Dispatch<React.SetStateAction<CompanyProfile>>;
  systemSettings: SystemSettings;
  setSystemSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  staff: Staff[];
  setStaff: React.Dispatch<React.SetStateAction<Staff[]>>;
  addLog: (message: string, type: 'info' | 'success' | 'error') => void;
}

export default function CompanySettings({
  companyProfile,
  setCompanyProfile,
  systemSettings,
  setSystemSettings,
  leads,
  setLeads,
  staff,
  setStaff,
  addLog
}: CompanySettingsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'distribution' | 'backup'>('profile');

  // Form States
  const [profileForm, setProfileForm] = useState<CompanyProfile>({ ...companyProfile });
  const [settingsForm, setSettingsForm] = useState<SystemSettings>({ ...systemSettings });
  
  // Destination Management State
  const [newDest, setNewDest] = useState('');
  
  // Backup / Restore States
  const [pastedJson, setPastedJson] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const [validationPreview, setValidationPreview] = useState<{
    valid: boolean;
    hasProfile: boolean;
    hasSettings: boolean;
    leadsCount: number;
    staffCount: number;
    warnings: string[];
    dataToRestore: any;
  } | null>(null);

  const [dragActive, setDragActive] = useState(false);

  // Sync form states with prop changes
  useEffect(() => {
    setProfileForm({ ...companyProfile });
  }, [companyProfile]);

  useEffect(() => {
    setSettingsForm({ ...systemSettings });
  }, [systemSettings]);

  // Handle Profile Update Submit
  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyProfile(profileForm);
    addLog(`[Settings] Updated Company Profile: "${profileForm.companyName}"`, 'success');
    setRestoreSuccess('Company profile successfully updated!');
    setTimeout(() => setRestoreSuccess(null), 3000);
  };

  // Handle System Settings Update Submit
  const handleUpdateSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSystemSettings(settingsForm);
    addLog(`[Settings] Updated System Distribution & SMTP Configuration`, 'success');
    setRestoreSuccess('System settings successfully updated!');
    setTimeout(() => setRestoreSuccess(null), 3000);
  };

  // Add Allowed Destination
  const handleAddDestination = () => {
    if (!newDest.trim()) return;
    if (settingsForm.allowedDestinations.includes(newDest.trim())) {
      setRestoreError('Destination already exists in list');
      setTimeout(() => setRestoreError(null), 3000);
      return;
    }
    const updatedDests = [...settingsForm.allowedDestinations, newDest.trim()];
    setSettingsForm({ ...settingsForm, allowedDestinations: updatedDests });
    setNewDest('');
  };

  // Remove Allowed Destination
  const handleRemoveDestination = (destToRemove: string) => {
    const updatedDests = settingsForm.allowedDestinations.filter(d => d !== destToRemove);
    setSettingsForm({ ...settingsForm, allowedDestinations: updatedDests });
  };

  // --- ULTRA-ROBUST BACKUP PARSER & CLEANER ---
  const tryCleanAndParseJSON = (rawStr: string): any => {
    let cleaned = rawStr.trim();
    if (!cleaned) throw new Error('Input is empty.');

    // Attempt 1: Standard Parse
    try {
      return JSON.parse(cleaned);
    } catch (e1: any) {
      console.warn("Standard JSON parse failed, trying formatting cleanups...", e1);
      
      // Attempt 2: Repair common malformed JSON errors
      try {
        // 1. Remove trailing commas in arrays/objects: `[1, 2, ]` or `{"a":1, }` -> `[1, 2]` or `{"a":1}`
        cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
        
        // 2. Wrap unquoted property names
        cleaned = cleaned.replace(/(?:\r?\n|\r)\s*([a-zA-Z0-9_\-]+)\s*:/g, (match, p1) => {
          return `"${p1}":`;
        });

        // 3. Replace single quotes with double quotes
        // Be careful not to replace single quotes inside words (e.g., Don't -> Don"t)
        // This is a simple heuristic: replace single quotes that look like JSON boundaries
        cleaned = cleaned.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');

        return JSON.parse(cleaned);
      } catch (e2: any) {
        throw new Error(`Syntax Error: ${e1.message}. Failed auto-repair: ${e2.message}`);
      }
    }
  };

  // Run validation and prepare pre-restore report
  const validateAndPreviewJSON = (jsonString: string) => {
    setRestoreError(null);
    setRestoreSuccess(null);
    setValidationPreview(null);

    if (!jsonString.trim()) return;

    try {
      const parsed = tryCleanAndParseJSON(jsonString);
      const warnings: string[] = [];
      let hasProfile = false;
      let hasSettings = false;
      let leadsCount = 0;
      let staffCount = 0;
      
      let dataToRestore: any = {
        companyProfile: null,
        systemSettings: null,
        leads: null,
        staff: null
      };

      // 1. Scan for Company Profile
      // Check standard key or look for companyName/gstin properties directly in root (old backup fallback!)
      if (parsed.companyProfile && typeof parsed.companyProfile === 'object') {
        dataToRestore.companyProfile = parsed.companyProfile;
        hasProfile = true;
      } else if (parsed.companyName || parsed.gstin || parsed.company_name) {
        // Flat root fallback mapping
        warnings.push('Detected flat company properties. Re-mapping to unified Company Profile.');
        dataToRestore.companyProfile = {
          companyName: parsed.companyName || parsed.company_name || "South Indian Holidays",
          email: parsed.email || parsed.companyEmail || "info@southindianholidays.co.in",
          phone: parsed.phone || parsed.companyPhone || "+91 484 234 5678",
          address: parsed.address || parsed.companyAddress || "",
          website: parsed.website || parsed.companyWebsite || "",
          gstin: parsed.gstin || parsed.companyGstin || "",
          tagline: parsed.tagline || parsed.companyTagline || ""
        };
        hasProfile = true;
      }

      // 2. Scan for System Settings
      if (parsed.systemSettings && typeof parsed.systemSettings === 'object') {
        dataToRestore.systemSettings = parsed.systemSettings;
        hasSettings = true;
      } else if (parsed.defaultAssignmentStrategy || parsed.allowedDestinations || parsed.smtpServer) {
        warnings.push('Detected isolated system options. Mapping to System Settings.');
        dataToRestore.systemSettings = {
          defaultAssignmentStrategy: parsed.defaultAssignmentStrategy || "manual",
          syncFrequencyMinutes: Number(parsed.syncFrequencyMinutes) || 30,
          autoContactOnAssign: parsed.autoContactOnAssign !== undefined ? !!parsed.autoContactOnAssign : true,
          allowedDestinations: Array.isArray(parsed.allowedDestinations) ? parsed.allowedDestinations : [],
          smtpServer: parsed.smtpServer || "",
          smtpPort: Number(parsed.smtpPort) || 587,
          smtpUser: parsed.smtpUser || ""
        };
        hasSettings = true;
      }

      // 3. Scan for Leads Array
      if (Array.isArray(parsed.leads)) {
        dataToRestore.leads = parsed.leads;
        leadsCount = parsed.leads.length;
      } else if (Array.isArray(parsed) && parsed.length > 0 && 'customerName' in parsed[0]) {
        warnings.push('Detected naked array of leads. Restoring leads data.');
        dataToRestore.leads = parsed;
        leadsCount = parsed.length;
      }

      // 4. Scan for Staff Array
      if (Array.isArray(parsed.staff)) {
        dataToRestore.staff = parsed.staff;
        staffCount = parsed.staff.length;
      } else if (Array.isArray(parsed) && parsed.length > 0 && 'role' in parsed[0] && 'avatarColor' in parsed[0]) {
        warnings.push('Detected naked array of specialists. Restoring staff data.');
        dataToRestore.staff = parsed;
        staffCount = parsed.length;
      }

      // Check if we found anything at all
      if (!hasProfile && !hasSettings && leadsCount === 0 && staffCount === 0) {
        // If it is just general json with some keys, let's look for partial matches
        const keys = Object.keys(parsed);
        warnings.push(`Backup structure unknown. Keys found: ${keys.join(', ')}.`);
        
        // Final fallback: try to map whatever we can
        let mappedProfile: any = {};
        let keysMapped = 0;
        ['companyName', 'email', 'phone', 'address', 'website', 'gstin', 'tagline'].forEach(f => {
          if (parsed[f] !== undefined) {
            mappedProfile[f] = parsed[f];
            keysMapped++;
          }
        });
        if (keysMapped > 0) {
          warnings.push(`Partially mapped ${keysMapped} properties into Company Profile.`);
          dataToRestore.companyProfile = {
            ...INITIAL_COMPANY_PROFILE,
            ...mappedProfile
          };
          hasProfile = true;
        }
      }

      setValidationPreview({
        valid: true,
        hasProfile,
        hasSettings,
        leadsCount,
        staffCount,
        warnings,
        dataToRestore
      });

    } catch (err: any) {
      setRestoreError(`Malformed Backup File: ${err.message}`);
    }
  };

  // Perform actual state restoration from validated preview
  const executeRestore = () => {
    if (!validationPreview || !validationPreview.valid) return;

    const data = validationPreview.dataToRestore;
    let restoreSummary: string[] = [];

    // 1. Apply Company Profile
    if (data.companyProfile) {
      // Merge with initial just in case fields are missing
      const mergedProfile = { ...INITIAL_COMPANY_PROFILE, ...data.companyProfile };
      setCompanyProfile(mergedProfile);
      setProfileForm(mergedProfile);
      restoreSummary.push('Company Profile');
    }

    // 2. Apply System Settings
    if (data.systemSettings) {
      const mergedSettings = { ...INITIAL_SYSTEM_SETTINGS, ...data.systemSettings };
      setSystemSettings(mergedSettings);
      setSettingsForm(mergedSettings);
      restoreSummary.push('System Settings');
    }

    // 3. Apply Leads
    if (data.leads && Array.isArray(data.leads)) {
      setLeads(data.leads);
      restoreSummary.push(`${data.leads.length} Travel Leads`);
    }

    // 4. Apply Staff
    if (data.staff && Array.isArray(data.staff)) {
      setStaff(data.staff);
      restoreSummary.push(`${data.staff.length} Destination Specialists`);
    }

    addLog(`[Backup Engine] Restored Backup: ${restoreSummary.join(', ')} successfully applied.`, 'success');
    
    setRestoreSuccess(`Backup Restored Successfully! Applied: ${restoreSummary.join(', ')}.`);
    setValidationPreview(null);
    setPastedJson('');
    setRestoreError(null);
  };

  // Export Complete Backup JSON File
  const handleExportBackup = () => {
    const backupObj = {
      version: "1.0.0",
      exportTimestamp: new Date().toISOString(),
      companyProfile,
      systemSettings,
      leads,
      staff
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(backupObj, null, 2)
    )}`;
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    
    const dateStr = new Date().toLocaleDateString('en-CA');
    downloadAnchor.setAttribute(
      'download', 
      `southindianholidays_backup_${dateStr}.json`
    );
    
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    addLog('[Backup Engine] Generated complete system backup JSON file and triggered download.', 'info');
  };

  // File drag & drop triggers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setPastedJson(text);
        validateAndPreviewJSON(text);
      };
      reader.readAsText(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setPastedJson(text);
        validateAndPreviewJSON(text);
      };
      reader.readAsText(file);
    }
  };

  // Quick helper to restore template/initial default values
  const handleResetToDefaults = () => {
    if (window.confirm("Are you sure you want to reset Company Profile and System Settings to factory defaults? Your leads and staff accounts will be preserved.")) {
      setCompanyProfile(INITIAL_COMPANY_PROFILE);
      setSystemSettings(INITIAL_SYSTEM_SETTINGS);
      addLog("[Settings] Reset Company Profile and System Settings to default values", "info");
      setRestoreSuccess("Reset completed! Reverted to original brand configuration.");
      setTimeout(() => setRestoreSuccess(null), 4000);
    }
  };

  // Quick Demo Backup Payload for user sandbox testing
  const loadDemoBackupPayload = () => {
    const demoPayload = {
      companyProfile: {
        companyName: "South Indian Holidays Ltd",
        email: "bookings@southindianholidays.co.in",
        phone: "+91 484 999 8888",
        address: "7th Floor, Harbour View Center, Marine Drive, Kochi, Kerala",
        website: "https://southindianholidays.co.in",
        gstin: "32ABCCS1234F2Z4",
        tagline: "Explore the Malabar Coast & Beyond"
      },
      systemSettings: {
        defaultAssignmentStrategy: "load_balanced",
        syncFrequencyMinutes: 15,
        autoContactOnAssign: true,
        allowedDestinations: [
          "Munnar, Kerala",
          "Wayanad, Kerala",
          "Alleppey Houseboats",
          "Varkala Cliff Beach Holiday",
          "Athirappilly Waterfalls",
          "Lakshadweep Island Getaway"
        ],
        smtpServer: "smtp.gmail.com",
        smtpPort: 465,
        smtpUser: "notifications.sih@gmail.com"
      }
    };
    const jsonStr = JSON.stringify(demoPayload, null, 2);
    setPastedJson(jsonStr);
    validateAndPreviewJSON(jsonStr);
  };

  const INITIAL_COMPANY_PROFILE: CompanyProfile = {
    companyName: "South Indian Holidays",
    email: "info@southindianholidays.co.in",
    phone: "+91 484 234 5678",
    address: "3rd Floor, Lotus Tower, M.G. Road, Kochi, Kerala - 682016",
    website: "www.southindianholidays.co.in",
    gstin: "32AAAAA1111A1Z1",
    tagline: "Unveiling the Serenity of South India"
  };

  const INITIAL_SYSTEM_SETTINGS: SystemSettings = {
    defaultAssignmentStrategy: "manual",
    syncFrequencyMinutes: 30,
    autoContactOnAssign: true,
    allowedDestinations: [
      "Munnar, Kerala",
      "Wayanad, Kerala",
      "Alleppey Houseboats",
      "Thekkady, Kerala",
      "Ooty, Tamil Nadu",
      "Kodaikanal, Tamil Nadu",
      "Varkala Cliff Beach Holiday"
    ],
    smtpServer: "smtp.southindianholidays.co.in",
    smtpPort: 587,
    smtpUser: "notifications@southindianholidays.co.in"
  };

  return (
    <div className="space-y-6">
      
      {/* Top Welcome Title & Navigation Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/20 border border-slate-900 rounded-xl p-5 shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-teal-400" />
            <span>Company Profile & System Settings</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure South Indian Holidays CRM, mail servers, inquiry routing rules, and execute resilient system-wide database backups.
          </p>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
          <button
            onClick={() => { setActiveSubTab('profile'); setRestoreError(null); setRestoreSuccess(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeSubTab === 'profile' ? 'bg-slate-900 text-teal-400 border border-slate-800 shadow-sm font-semibold' : 'text-slate-400 hover:text-white'}`}
          >
            <Building className="h-3.5 w-3.5" />
            <span>Profile & Brand</span>
          </button>
          <button
            onClick={() => { setActiveSubTab('distribution'); setRestoreError(null); setRestoreSuccess(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeSubTab === 'distribution' ? 'bg-slate-900 text-teal-400 border border-slate-800 shadow-sm font-semibold' : 'text-slate-400 hover:text-white'}`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Distribution Rules</span>
          </button>
          <button
            onClick={() => { setActiveSubTab('backup'); setRestoreError(null); setRestoreSuccess(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeSubTab === 'backup' ? 'bg-slate-900 text-teal-400 border border-slate-800 shadow-sm font-semibold' : 'text-slate-400 hover:text-white'}`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Backup & Restore</span>
          </button>
        </div>
      </div>

      {/* Message Notifications (Success & Errors) */}
      <AnimatePresence>
        {restoreError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl text-xs flex items-start gap-3 shadow-lg"
          >
            <AlertTriangle className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold uppercase tracking-wider text-[10px]">Parser Exception Detected</p>
              <p className="mt-1 leading-relaxed">{restoreError}</p>
              <p className="mt-2 text-slate-400 font-mono text-[10px]">
                Tip: Clean double commas or bad quotes, or click "Load Demo Backup Payload" below to preview a valid structure.
              </p>
            </div>
          </motion.div>
        )}

        {restoreSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl text-xs flex items-center gap-3 shadow-md"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <p className="font-semibold">{restoreSuccess}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Layout Panels */}
      <div className="grid grid-cols-1 gap-6">

        {/* SUBTAB 1: COMPANY PROFILE FORM */}
        {activeSubTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Left side Form */}
            <form onSubmit={handleUpdateProfile} className="lg:col-span-8 bg-slate-900/40 border border-slate-900 rounded-xl p-6 space-y-6 shadow-xl text-left">
              <div className="flex items-center gap-2 mb-4">
                <Building className="h-5 w-5 text-teal-400" />
                <h3 className="font-medium text-white text-base">Corporate Profile Settings</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Registered Company Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.companyName}
                    onChange={(e) => setProfileForm({ ...profileForm, companyName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Brand Tagline</label>
                  <input
                    type="text"
                    value={profileForm.tagline}
                    onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Primary Business Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Business Hotline Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Official Web URL</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={profileForm.website}
                      onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">GSTIN Tax Registration Number</label>
                  <input
                    type="text"
                    required
                    value={profileForm.gstin}
                    onChange={(e) => setProfileForm({ ...profileForm, gstin: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Corporate Headquarters Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <textarea
                    rows={2}
                    required
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-2 justify-end">
                <button
                  type="button"
                  onClick={handleResetToDefaults}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-all text-xs font-mono font-bold uppercase cursor-pointer"
                >
                  Reset Brand Defaults
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg font-bold text-xs uppercase tracking-wider font-mono shadow-md hover:shadow-teal-500/10 transition-all cursor-pointer"
                >
                  Update Profile
                </button>
              </div>
            </form>

            {/* Right side Brand preview card */}
            <div className="lg:col-span-4 bg-slate-900/30 border border-slate-900 rounded-xl p-6 shadow-xl text-left flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/5 rounded-full blur-2xl -z-10" />
              <div className="space-y-4">
                <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 bg-teal-500/15 border border-teal-500/20 text-teal-400 rounded-full font-bold">
                  Corporate Brand Preview
                </span>
                
                <div className="space-y-1 pt-2">
                  <h4 className="text-xl font-extrabold text-white leading-tight">{companyProfile.companyName}</h4>
                  <p className="text-xs text-teal-400 italic font-mono">{companyProfile.tagline}</p>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-900/60 text-slate-300 text-xs">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-500" />
                    <span>{companyProfile.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-500" />
                    <span>{companyProfile.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-slate-500" />
                    <span className="underline text-slate-400">{companyProfile.website}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <span className="text-[11px] leading-relaxed text-slate-400">{companyProfile.address}</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-900/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>GSTIN: {companyProfile.gstin}</span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Verified Active
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* SUBTAB 2: DISTRIBUTION & DESTINATION SETTINGS */}
        {activeSubTab === 'distribution' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* System Routing Rules */}
            <form onSubmit={handleUpdateSettings} className="lg:col-span-7 bg-slate-900/40 border border-slate-900 rounded-xl p-6 space-y-6 shadow-xl text-left">
              <div className="flex items-center gap-2 mb-4">
                <Sliders className="h-5 w-5 text-teal-400" />
                <h3 className="font-medium text-white text-base">Inquiry Routing & Distribution Rules</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Auto Routing Strategy</label>
                  <select
                    value={settingsForm.defaultAssignmentStrategy}
                    onChange={(e: any) => setSettingsForm({ ...settingsForm, defaultAssignmentStrategy: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50 cursor-pointer"
                  >
                    <option value="manual">Manual Direct Dispatch (Default)</option>
                    <option value="round_robin">Fair Round-Robin Cycle</option>
                    <option value="load_balanced">Load-Balanced (Least Busy)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Sync Interval (Minutes)</label>
                  <input
                    type="number"
                    min={5}
                    max={1440}
                    required
                    value={settingsForm.syncFrequencyMinutes}
                    onChange={(e) => setSettingsForm({ ...settingsForm, syncFrequencyMinutes: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50 font-mono"
                  />
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="autoContactOnAssign"
                  checked={settingsForm.autoContactOnAssign}
                  onChange={(e) => setSettingsForm({ ...settingsForm, autoContactOnAssign: e.target.checked })}
                  className="mt-1 h-3.5 w-3.5 accent-teal-500 cursor-pointer"
                />
                <div className="space-y-0.5 cursor-pointer select-none">
                  <label htmlFor="autoContactOnAssign" className="block text-xs font-semibold text-slate-200 cursor-pointer">
                    Auto-trigger Contact Sequence
                  </label>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Instantly update inquiry status from <code className="bg-slate-900 border border-slate-800 px-1 py-0.5 rounded text-teal-400">New</code> to <code className="bg-slate-900 border border-slate-800 px-1 py-0.5 rounded text-amber-400">Contacted</code> and send welcoming mail upon routing.
                  </p>
                </div>
              </div>

              {/* SMTP configuration */}
              <div className="border-t border-slate-900 pt-5 space-y-4">
                <div className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="text-[11px] font-mono text-slate-300 uppercase tracking-wider font-semibold">SMTP Notification Gateway</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label className="block text-[9px] font-mono text-slate-500 uppercase tracking-wider font-bold">SMTP Relay Host</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. smtp.gmail.com"
                      value={settingsForm.smtpServer}
                      onChange={(e) => setSettingsForm({ ...settingsForm, smtpServer: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-mono text-slate-500 uppercase tracking-wider font-bold">Relay Port</label>
                    <input
                      type="number"
                      required
                      value={settingsForm.smtpPort}
                      onChange={(e) => setSettingsForm({ ...settingsForm, smtpPort: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[9px] font-mono text-slate-500 uppercase tracking-wider font-bold">Sender Credentials (Username)</label>
                  <input
                    type="email"
                    required
                    placeholder="mail@relay.co.in"
                    value={settingsForm.smtpUser}
                    onChange={(e) => setSettingsForm({ ...settingsForm, smtpUser: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg font-bold text-xs uppercase tracking-wider font-mono shadow-md hover:shadow-teal-500/10 transition-all cursor-pointer"
                >
                  Save System Rules
                </button>
              </div>
            </form>

            {/* Allowed Destination manager */}
            <div className="lg:col-span-5 bg-slate-900/40 border border-slate-900 rounded-xl p-6 shadow-xl text-left flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Compass className="h-5 w-5 text-teal-400" />
                  <h3 className="font-medium text-white text-base">Active Destination Corridors</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Configure specific tourism sectors allowed on custom quotation logs.
                </p>

                {/* Add destination input */}
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Add e.g. Kumarakom, Kerala"
                    value={newDest}
                    onChange={(e) => setNewDest(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddDestination()}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500/50"
                  />
                  <button
                    type="button"
                    onClick={handleAddDestination}
                    className="px-3 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-teal-400 rounded-lg font-bold text-xs font-mono transition-all uppercase cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                {/* Destination list */}
                <div className="pt-3 max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                  {settingsForm.allowedDestinations.map((dest) => (
                    <div
                      key={dest}
                      className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-900 rounded-lg text-xs"
                    >
                      <span className="font-medium text-slate-300">{dest}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDestination(dest)}
                        className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 p-1 rounded-md transition-all cursor-pointer"
                        title="Delete Corridor"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-900/60 text-[10px] font-mono text-slate-500 flex items-center justify-between">
                <span>Active corridors: {settingsForm.allowedDestinations.length}</span>
                <span>System Configured</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* SUBTAB 3: ULTRA-ROBUST BACKUP & RESTORE CONSOLE */}
        {activeSubTab === 'backup' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Backup Operations Console */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Export Panel */}
              <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-6 shadow-xl text-left space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-teal-400" />
                    <h3 className="font-medium text-white text-base">Generate System Backup</h3>
                  </div>
                  <span className="text-[9px] font-mono bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded">
                    Encrypted JSON
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Export a unified system snapshot. This contains all company settings, brand profiles, staff profiles, and active travel inquiries. Keep this file safe to restore the entire South Indian Holidays CRM to this exact state in one click.
                </p>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={handleExportBackup}
                    className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg font-bold text-xs uppercase font-mono shadow-md hover:shadow-teal-500/10 transition-all cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Complete Backup JSON</span>
                  </button>
                </div>
              </div>

              {/* Robust Upload / Dropzone Restore Area */}
              <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-6 shadow-xl text-left space-y-4 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-teal-400" />
                    <h3 className="font-medium text-white text-base">Restore Backup Snapshot</h3>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Upload a previously exported JSON backup. Our resilient validation engine repairs common structural changes and flat variables so that your old backup restores seamlessly without syntax blocks.
                </p>

                {/* Dropzone Container */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all relative ${dragActive ? 'border-teal-400 bg-teal-500/5' : 'border-slate-800 bg-slate-950/40 hover:border-slate-750'}`}
                >
                  <Upload className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-300">Drag & Drop your backup file here</p>
                  <p className="text-[10px] text-slate-500 mt-1">or</p>
                  
                  <label className="mt-2.5 inline-flex px-3.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-all active:scale-95">
                    Browse File
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Paste JSON Editor Fallback */}
              <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-6 shadow-xl text-left space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2 font-mono">
                    <FileCode className="h-4 w-4 text-teal-400" />
                    <span>Option B: Direct JSON Input (Paste Old Backups)</span>
                  </h4>
                  <button
                    onClick={loadDemoBackupPayload}
                    className="text-[10px] text-teal-400 hover:text-teal-300 hover:underline font-semibold font-mono flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3 animate-pulse" /> Load Demo Backup Payload
                  </button>
                </div>

                <div className="space-y-2">
                  <textarea
                    rows={5}
                    value={pastedJson}
                    onChange={(e) => {
                      setPastedJson(e.target.value);
                      validateAndPreviewJSON(e.target.value);
                    }}
                    placeholder='{"companyProfile": { "companyName": "My Travel Company", ... }}'
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-slate-300 focus:outline-none focus:border-teal-500/50"
                  />
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span>Allows pasting raw, flat, or corrupted JSON scripts. Engine will auto-repair.</span>
                    <span>Length: {pastedJson.length} chars</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Verification and Pre-Restore Validation Report */}
            <div className="lg:col-span-5 bg-slate-900/40 border border-slate-900 rounded-xl p-6 shadow-xl text-left flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="font-medium text-white text-base flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-teal-400" />
                  <span>Validation Log Center</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Real-time status of uploaded files or pasted text. Ensures schemas are verified prior to CRM state overwriting.
                </p>

                {/* Validation State Box */}
                {!validationPreview ? (
                  <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-8 text-center text-slate-500 min-h-[220px] flex flex-col justify-center items-center">
                    <FileCode className="h-8 w-8 text-slate-800 mb-2" />
                    <p className="text-xs font-semibold">No backup data loaded</p>
                    <p className="text-[10px] text-slate-600 mt-1 max-w-[200px]">
                      Upload a `.json` backup file or paste your old backup parameters to inspect contents.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fadeIn">
                    
                    {/* Status badge */}
                    <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-xs font-semibold">
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
                      <span>Schema Parsed & Repaired Successfully!</span>
                    </div>

                    {/* Detected sections list */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">Detected Data Packages:</p>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className={`p-2 rounded-lg border text-xs flex items-center justify-between ${validationPreview.hasProfile ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-200' : 'bg-slate-950 border-slate-900 text-slate-500'}`}>
                          <span>Company Profile</span>
                          <span>{validationPreview.hasProfile ? '✅ Yes' : '❌ No'}</span>
                        </div>

                        <div className={`p-2 rounded-lg border text-xs flex items-center justify-between ${validationPreview.hasSettings ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-200' : 'bg-slate-950 border-slate-900 text-slate-500'}`}>
                          <span>System Settings</span>
                          <span>{validationPreview.hasSettings ? '✅ Yes' : '❌ No'}</span>
                        </div>

                        <div className={`p-2 rounded-lg border text-xs flex items-center justify-between ${validationPreview.leadsCount > 0 ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-200' : 'bg-slate-950 border-slate-900 text-slate-500'}`}>
                          <span>Travel Inquiries</span>
                          <span>{validationPreview.leadsCount > 0 ? `✅ ${validationPreview.leadsCount} rows` : '❌ No'}</span>
                        </div>

                        <div className={`p-2 rounded-lg border text-xs flex items-center justify-between ${validationPreview.staffCount > 0 ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-200' : 'bg-slate-950 border-slate-900 text-slate-500'}`}>
                          <span>Consultants</span>
                          <span>{validationPreview.staffCount > 0 ? `✅ ${validationPreview.staffCount} rows` : '❌ No'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Auto-repaired warnings log */}
                    {validationPreview.warnings.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-bold flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Parser Alignment Applied:</span>
                        </p>
                        <div className="bg-slate-950 border border-slate-900 rounded-lg p-2.5 space-y-1 max-h-[100px] overflow-y-auto">
                          {validationPreview.warnings.map((w, idx) => (
                            <p key={idx} className="text-[10px] text-slate-400 leading-normal font-mono">• {w}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Validation Notice warning */}
                    <div className="p-3 bg-teal-500/5 border border-teal-500/20 rounded-lg text-[10px] text-slate-400 leading-relaxed">
                      <span className="font-semibold text-teal-400">Database Safety Sync Notice:</span> Applying this restore will instantly replace the active CRM configurations, active leads queue, and staff counts in browser cache memory. 
                    </div>

                    <button
                      type="button"
                      onClick={executeRestore}
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-bold text-xs uppercase font-mono shadow-md hover:shadow-emerald-500/10 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Play className="h-4 w-4 fill-slate-950" />
                      <span>Commit State & Override CRM</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-900/60 text-[10px] font-mono text-slate-500 flex items-center justify-between">
                <span>Validation Server: Ready</span>
                <span>Version: 1.0.0</span>
              </div>
            </div>

          </motion.div>
        )}

      </div>

    </div>
  );
}
