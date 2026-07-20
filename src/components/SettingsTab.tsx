import React, { useState } from "react";
import * as Lucide from "lucide-react";
import { useToast } from "../hooks/useToast";

interface SettingsTabProps {
  settings: any;
  onUpdateSettings: (settings: any) => void;
  onImportBackup: (backupData: any) => void;
}

export default function SettingsTab({
  settings,
  onUpdateSettings,
  onImportBackup
}: SettingsTabProps) {
  const toast = useToast();
  const [formFields, setFormFields] = useState({ ...settings });
  const [successMsg, setSuccessMsg] = useState("");
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  // Sync state with parent props if they change
  React.useEffect(() => {
    setFormFields({ ...settings });
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formFields);
    setSuccessMsg("Company Profile and system configurations saved successfully!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setUploading(true);
    setUploadError("");
    setSuccessMsg("");

    // 1. Format validation (PNG, JPG, JPEG, SVG)
    const allowedExtensions = ["png", "jpg", "jpeg", "svg"];
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      setUploadError("Invalid file format. Only PNG, JPG, JPEG, and SVG are supported.");
      setUploading(false);
      return;
    }

    // 2. Size validation (max 5MB)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setUploadError("File is too large. Maximum allowed size is 5MB.");
      setUploading(false);
      return;
    }
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        const updated = { ...formFields, logo: data.url };
        setFormFields(updated);
        // Persist immediately on upload so user doesn't lose it if they refresh
        onUpdateSettings(updated);
        setSuccessMsg("Logo uploaded and updated successfully!");
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setUploadError(data.error || "Upload failed. Please try again.");
      }
    } catch (err) {
      setUploadError("Network connection issue. Failed to upload logo.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  // Export full CRM database as JSON
  const handleExportBackup = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/backup/export");
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      const meta = data._meta;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sih-crm-backup-${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(
        meta
          ? `Backup exported — ${meta.leadCount} leads, ${meta.bookingCount} bookings`
          : "Backup exported successfully"
      );
    } catch (err: any) {
      toast.error("Backup export failed — " + (err.message || "unknown error"));
    } finally {
      setExporting(false);
    }
  };

  // Import JSON backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setImporting(true);
    toast.info("Reading backup file…");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const fileContent = event.target?.result as string;

        // Failsafe check: SQL backup uploaded by mistake
        if (fileContent.trim().toUpperCase().startsWith("CREATE TABLE") ||
            fileContent.trim().toUpperCase().startsWith("--") ||
            fileContent.trim().toUpperCase().startsWith("INSERT INTO")) {
          toast.error("Wrong file type — this looks like a SQL backup. Please use the JSON backup exported from this CRM.");
          setImporting(false);
          return;
        }

        let json: any;
        try {
          json = JSON.parse(fileContent);
        } catch (parseErr: any) {
          toast.error(`Invalid JSON file — ${parseErr.message}`);
          setImporting(false);
          return;
        }

        // Check version compatibility
        if (json._meta?.schemaVersion) {
          const major = parseInt(json._meta.schemaVersion.split(".")[0], 10);
          if (major > 2) {
            toast.error(`Backup version ${json._meta.schemaVersion} is too new for this app version. Please upgrade the application first.`);
            setImporting(false);
            return;
          }
        }

        if (json && json.users) {
          toast.info("Restoring database — this may take a moment…");
          const res = await fetch("/api/backup/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(json)
          });

          if (!res.ok) {
            const errorText = await res.text();
            toast.error(`Restore failed (HTTP ${res.status}) — ${errorText.substring(0, 200)}`);
            setImporting(false);
            return;
          }

          let result: any;
          try {
            result = await res.json();
          } catch {
            toast.warn("Import may have completed, but the server response was unreadable. Please refresh.");
            setImporting(false);
            return;
          }

          if (result.success) {
            onImportBackup(json);
            toast.success(result.message || "Database restored successfully!");
            setTimeout(() => window.location.reload(), 1500);
          } else {
            toast.error("Restore failed — " + result.message);
          }
        } else {
          toast.error("Invalid backup file — 'users' collection is missing. This may not be a valid CRM backup.");
        }
      } catch (err: any) {
        toast.error("Backup import error — " + (err?.message || String(err)));
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow flex items-center justify-between animate-fadeIn">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl">
            <Lucide.Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Company Profile & System Settings</h3>
            <p className="text-[10px] text-slate-500 font-semibold">Modify corporate identity details, company logo, GSTIN parameters, bank accounts, and backup vaults</p>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-950/20 border border-emerald-900/35 text-emerald-400 p-3.5 rounded-xl text-xs font-bold animate-fadeIn">
          {successMsg}
        </div>
      )}

      {uploadError && (
        <div className="bg-rose-950/25 border border-rose-900/35 text-rose-400 p-3.5 rounded-xl text-xs font-semibold animate-fadeIn">
          {uploadError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core settings form */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg space-y-4 animate-fadeIn">
          <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider border-b border-slate-800 pb-2">Corporate Profile Configuration</h4>
          
          <form onSubmit={handleSubmit} className="space-y-6 text-xs">
            {/* Logo uploader row */}
            <div className="space-y-2">
              <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Company Logo Upload *</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                {/* Logo Preview box */}
                <div className="flex flex-col items-center justify-center p-3.5 bg-slate-950 rounded-xl border border-slate-850 h-32 relative overflow-hidden group">
                  {formFields.logo ? (
                    <>
                      <img 
                        src={formFields.logo} 
                        alt="Company Logo Preview" 
                        className="max-h-24 max-w-full object-contain rounded p-1 bg-white" 
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...formFields, logo: "" };
                          setFormFields(updated);
                          onUpdateSettings(updated);
                          setSuccessMsg("Logo removed successfully!");
                          setTimeout(() => setSuccessMsg(""), 3000);
                        }}
                        className="absolute top-1.5 right-1.5 p-1 bg-slate-900/80 hover:bg-rose-950 hover:text-rose-400 rounded text-slate-400 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Remove Logo"
                      >
                        <Lucide.Trash className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center space-y-1 text-slate-600 font-semibold font-mono text-[10px]">
                      <Lucide.Image className="w-8 h-8 mx-auto text-slate-700" />
                      <span>No Logo Loaded</span>
                    </div>
                  )}
                </div>

                {/* Drag and Drop area */}
                <div 
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`md:col-span-2 border-2 border-dashed rounded-xl h-32 flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all ${
                    dragActive 
                      ? "border-blue-500 bg-blue-500/5 text-blue-400" 
                      : "border-slate-800 hover:border-slate-750 bg-slate-950/40 text-slate-400 hover:text-slate-300"
                  }`}
                  onClick={() => document.getElementById("logo-input-file")?.click()}
                >
                  <input
                    type="file"
                    id="logo-input-file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {uploading ? (
                    <div className="space-y-2">
                      <Lucide.Loader className="w-6 h-6 mx-auto text-blue-500 animate-spin" />
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest font-mono">Uploading Image File...</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Lucide.UploadCloud className={`w-7 h-7 mx-auto ${dragActive ? "text-blue-500" : "text-slate-500"}`} />
                      <p className="font-bold text-[10px] uppercase tracking-wider">Drag & drop logo here or <span className="text-blue-500 underline">browse files</span></p>
                      <p className="text-[9px] text-slate-500 font-medium">Supports PNG, JPG, WebP. Recommended square or landscape ratio.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Company Registered Name *</label>
                <input
                  type="text"
                  required
                  value={formFields.companyName}
                  onChange={(e) => setFormFields({ ...formFields, companyName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Company GST Number (GSTIN) *</label>
                <input
                  type="text"
                  required
                  value={formFields.gstNumber}
                  onChange={(e) => setFormFields({ ...formFields, gstNumber: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none font-mono"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Corporate Headquarters Address *</label>
                <input
                  type="text"
                  required
                  value={formFields.address}
                  onChange={(e) => setFormFields({ ...formFields, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Corporate Hotline Phone *</label>
                <input
                  type="text"
                  required
                  value={formFields.phone}
                  onChange={(e) => setFormFields({ ...formFields, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Corporate Email Address *</label>
                <input
                  type="email"
                  required
                  value={formFields.email}
                  onChange={(e) => setFormFields({ ...formFields, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Company Website URL *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lucide.Globe className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formFields.website || ""}
                    onChange={(e) => setFormFields({ ...formFields, website: e.target.value })}
                    placeholder="e.g. www.southindianholidays.com"
                    className="w-full bg-slate-950 border border-slate-850 pl-9 p-2.5 rounded-xl text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="md:col-span-2 border-t border-slate-850 pt-4 mt-2">
                <h5 className="text-[10px] font-black uppercase text-blue-400 mb-2">Remittance Bank Coordinates</h5>
              </div>

              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Bank Name *</label>
                <input
                  type="text"
                  required
                  value={formFields.bankName}
                  onChange={(e) => setFormFields({ ...formFields, bankName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Bank Account Number *</label>
                <input
                  type="text"
                  required
                  value={formFields.bankAccount}
                  onChange={(e) => setFormFields({ ...formFields, bankAccount: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Bank IFSC Code *</label>
                <input
                  type="text"
                  required
                  value={formFields.bankIfsc}
                  onChange={(e) => setFormFields({ ...formFields, bankIfsc: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">UPI ID Coordinate *</label>
                <input
                  type="text"
                  required
                  value={formFields.upiId}
                  onChange={(e) => setFormFields({ ...formFields, upiId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none font-mono"
                />
              </div>

              <div className="md:col-span-2 border-t border-slate-850 pt-4 mt-2">
                <h5 className="text-[10px] font-black uppercase text-blue-400 mb-2">Invoice Estimates Prefixes & Tax Rates</h5>
              </div>

              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Quotation Document Prefix</label>
                <input
                  type="text"
                  value={formFields.quotationPrefix}
                  onChange={(e) => setFormFields({ ...formFields, quotationPrefix: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Tax Rate (CGST + SGST %)</label>
                <input
                  type="number"
                  value={formFields.taxRate}
                  onChange={(e) => setFormFields({ ...formFields, taxRate: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none font-mono"
                />
              </div>

              <div className="md:col-span-2 flex justify-end pt-3 border-t border-slate-850">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-600/10"
                >
                  Save Global Configurations
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Database backup locker */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg space-y-4 h-fit">
          <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider border-b border-slate-800 pb-2 flex items-center gap-1.5">
            <Lucide.ShieldAlert className="w-4 h-4 text-amber-500" />
            Backup & Restoration Panel
          </h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">Download complete system logs, listings, lead timeline files, and active payment accounts, or restore the database manually by choosing a prior `.json` file backup.</p>
          
          <div className="space-y-3 pt-2 text-xs">
            {/* Export trigger */}
            <button
              onClick={handleExportBackup}
              disabled={exporting}
              className="w-full bg-slate-950 border border-slate-850 hover:bg-slate-850 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {exporting
                ? <><Lucide.Loader2 className="w-4 h-4 text-blue-400 animate-spin" /> Exporting…</>
                : <><Lucide.Download className="w-4 h-4 text-blue-400" /> Download System Backup (JSON)</>}
            </button>

            {/* Import file input wrapper */}
            <div className="relative">
              <label className={`w-full bg-slate-950 border border-slate-850 hover:bg-slate-850 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${importing ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
                {importing
                  ? <><Lucide.Loader2 className="w-4 h-4 text-emerald-400 animate-spin" /> Restoring Backup…</>
                  : <><Lucide.Upload className="w-4 h-4 text-emerald-400" /> Restore Prior Backup File</>}
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                  disabled={importing}
                />
              </label>
            </div>
          </div>
          
          <div className="p-3.5 bg-blue-950/20 border border-blue-900/35 rounded-xl text-[10px] text-blue-400 font-mono leading-relaxed">
            <h5 className="font-bold mb-1 uppercase tracking-wider">Failsafe Storage Engine</h5>
            <p>Your portal utilizes an on-disk JSON relational database failsafe which persists data permanently inside the sandbox, avoiding container restarts loss.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
