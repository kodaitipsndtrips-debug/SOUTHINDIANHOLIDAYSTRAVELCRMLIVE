import React, { useState } from "react";
import * as Lucide from "lucide-react";
import { TourPackage } from "../types";

interface PackagesTabProps {
  packages: TourPackage[];
  onAddPackage: (pkg: Partial<TourPackage>) => void;
  onUpdatePackage: (id: string, pkg: Partial<TourPackage>) => void;
  onDeletePackage: (id: string) => void;
  onUseInQuotation: (pkg: TourPackage) => void;
  onUseInBooking: (pkg: TourPackage) => void;
}

export default function PackagesTab({
  packages = [],
  onAddPackage,
  onUpdatePackage,
  onDeletePackage,
  onUseInQuotation,
  onUseInBooking
}: PackagesTabProps) {
  const safePackages = Array.isArray(packages) ? packages : [];

  const [search, setSearch] = useState("");
  const [filterDest, setFilterDest] = useState("all");
  const [filterDuration, setFilterDuration] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editingPkg, setEditingPkg] = useState<TourPackage | null>(null);
  const [viewingPkg, setViewingPkg] = useState<TourPackage | null>(null);

  // Bulk Import CSV states
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkSuccess, setBulkSuccess] = useState("");
  const [bulkDragging, setBulkDragging] = useState(false);

  const handleCSVImport = (file: File) => {
    if (!file) return;
    setBulkError("");
    setBulkSuccess("");

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) throw new Error("Empty file content");

        const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
        if (lines.length < 2) {
          throw new Error("File must contain a header row and at least one data row.");
        }

        // Parse CSV helper that handles quotes and commas
        const parseCSVLine = (line: string) => {
          const result = [];
          let current = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
        
        // Find column indices
        const nameIdx = headers.findIndex(h => h.includes("name"));
        const destIdx = headers.findIndex(h => h.includes("dest"));
        const priceIdx = headers.findIndex(h => h.includes("price") || h.includes("rate") || h.includes("cost"));
        const durationIdx = headers.findIndex(h => h.includes("durat"));
        const inclusionsIdx = headers.findIndex(h => h.includes("inclus"));
        const exclusionsIdx = headers.findIndex(h => h.includes("exclus"));

        if (nameIdx === -1 || destIdx === -1 || priceIdx === -1) {
          throw new Error("CSV must include columns for Name, Destination, and Price (e.g. name, destination, price, duration, inclusions, exclusions)");
        }

        let importCount = 0;
        for (let i = 1; i < lines.length; i++) {
          const rowValues = parseCSVLine(lines[i]);
          if (rowValues.length < 3 || !rowValues[nameIdx]) continue;

          const name = rowValues[nameIdx];
          const destination = (rowValues[destIdx] || "kodaikanal").toLowerCase();
          const price = Number((rowValues[priceIdx] || "15000").replace(/[^\d]/g, ""));
          const duration = rowValues[durationIdx] || "3 Days / 2 Nights";
          const inclusions = rowValues[inclusionsIdx] || "Not specified";
          const exclusions = rowValues[exclusionsIdx] || "Not specified";

          onAddPackage({
            name,
            destination,
            price,
            duration,
            category: "Standard Package",
            hotelCategory: "3-Star Deluxe",
            inclusions,
            exclusions,
            status: "Active"
          });
          importCount++;
        }

        setBulkSuccess(`🎉 Bulk Import Success! Added ${importCount} tour packages to your catalog library.`);
        setTimeout(() => setShowBulkUpload(false), 4000);
      } catch (err: any) {
        setBulkError(`Failed to parse CSV: ${err.message || "Unknown error"}`);
      }
    };
    reader.readAsText(file);
  };

  const downloadSampleCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Name,Destination,Price,Duration,Inclusions,Exclusions\n"
      + "Misty Hills Deluxe,kodaikanal,12500,3 Days / 2 Nights,Boating & Resort rooms,Entry tickets & extra lunches\n"
      + "Coorg Coffee Estate Special,coorg,16000,4 Days / 3 Nights,Luxury Villa & Estate walks,Personal shopping expenses\n"
      + "Alleppey Houseboat Special,alleppey,18500,2 Days / 1 Night,Full board meals on Boat,Beverages & transfers\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "standard_packages_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [formFields, setFormFields] = useState({
    name: "",
    destination: "kodaikanal",
    duration: "3 Days / 2 Nights",
    category: "Family Tour",
    price: 15000,
    hotelCategory: "3-Star Deluxe",
    inclusions: "",
    exclusions: "",
    status: "Active" as const
  });

  const openAddForm = () => {
    setEditingPkg(null);
    setFormFields({
      name: "",
      destination: "kodaikanal",
      duration: "3 Days / 2 Nights",
      category: "Family Tour",
      price: 15000,
      hotelCategory: "3-Star Deluxe",
      inclusions: "Standard Hotel Room (Twin Sharing), Direct Private Sedan Sightseeing with driver charges included, Standard morning breakfast buffet",
      exclusions: "Taxes/GST (5%), Flight ticket fares, Any lunch or dinners, Camera or entry tickets at national parks",
      status: "Active"
    });
    setShowForm(true);
  };

  const openEditForm = (pkg: TourPackage) => {
    setEditingPkg(pkg);
    setFormFields({
      name: pkg.name,
      destination: pkg.destination,
      duration: pkg.duration,
      category: pkg.category,
      price: pkg.price,
      hotelCategory: pkg.hotelCategory || "3-Star Deluxe",
      inclusions: pkg.inclusions || "",
      exclusions: pkg.exclusions || "",
      status: pkg.status as any
    });
    setShowForm(true);
  };

  const handleDuplicate = (pkg: TourPackage) => {
    const duplicated: Partial<TourPackage> = {
      name: `${pkg.name} (Copy)`,
      destination: pkg.destination,
      duration: pkg.duration,
      category: pkg.category,
      price: pkg.price,
      hotelCategory: pkg.hotelCategory,
      inclusions: pkg.inclusions,
      exclusions: pkg.exclusions,
      status: pkg.status
    };
    onAddPackage(duplicated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPkg) {
      onUpdatePackage(editingPkg.id, formFields);
    } else {
      onAddPackage(formFields);
    }
    setShowForm(false);
  };

  // Filters logic
  const filteredPackages = safePackages.filter(p => {
    const term = search.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(term) ||
      p.destination.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term);

    const matchesDest = filterDest === "all" || p.destination === filterDest;
    const matchesDuration = filterDuration === "all" || p.duration.includes(filterDuration);
    const matchesStatus = filterStatus === "all" || p.status === filterStatus;

    return matchesSearch && matchesDest && matchesDuration && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Title block */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <Lucide.Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Package Library & Management</h3>
            <p className="text-[10px] text-slate-500 font-semibold">Store, duplicate, search, and map standardized vacation itineraries</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkUpload(!showBulkUpload)}
            className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Lucide.FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Bulk CSV Upload
          </button>
          <button
            onClick={openAddForm}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/10"
          >
            <Lucide.Plus className="w-4 h-4" />
            Create New Package
          </button>
        </div>
      </div>

      {/* Bulk Upload CSV Drawer */}
      {showBulkUpload && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3.5 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h4 className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5">
              <Lucide.FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Bulk Package CSV Importer (Drag & Drop)
            </h4>
            <button onClick={() => setShowBulkUpload(false)} className="text-slate-400 hover:text-white cursor-pointer"><Lucide.X className="w-4 h-4" /></button>
          </div>
          <p className="text-[10px] text-slate-400">
            Import dozens of catalog packages instantly. Drag and drop a standard `.csv` file. 
            Required headers: <code className="text-indigo-400 bg-slate-950 px-1 py-0.5 rounded">Name</code>, <code className="text-indigo-400 bg-slate-950 px-1 py-0.5 rounded">Destination</code>, <code className="text-indigo-400 bg-slate-950 px-1 py-0.5 rounded">Price</code>, <code className="text-indigo-400 bg-slate-950 px-1 py-0.5 rounded">Duration</code>, <code className="text-indigo-400 bg-slate-950 px-1 py-0.5 rounded">Inclusions</code>, <code className="text-indigo-400 bg-slate-950 px-1 py-0.5 rounded">Exclusions</code>.
          </p>

          <div className="flex flex-col md:flex-row gap-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setBulkDragging(true); }}
              onDragLeave={() => setBulkDragging(false)}
              onDrop={(e) => { e.preventDefault(); setBulkDragging(false); if (e.dataTransfer.files?.[0]) handleCSVImport(e.dataTransfer.files[0]); }}
              className={`flex-1 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                bulkDragging ? "border-emerald-400 bg-emerald-950/10" : "border-slate-800 hover:border-slate-750 bg-slate-950/40"
              }`}
            >
              <input
                type="file"
                accept=".csv"
                onChange={(e) => { if (e.target.files?.[0]) handleCSVImport(e.target.files[0]); }}
                id="csv-bulk-field"
                className="hidden"
              />
              <label htmlFor="csv-bulk-field" className="cursor-pointer block space-y-2">
                <Lucide.Upload className="w-8 h-8 text-emerald-400 mx-auto animate-bounce" />
                <span className="text-[10px] font-bold text-slate-300 block">Click or Drag & Drop Catalog CSV file</span>
                <span className="text-[8px] text-slate-500 block">Accepts .CSV files only</span>
              </label>
            </div>

            <div className="w-full md:w-64 bg-slate-950/40 border border-slate-850 p-3 rounded-xl flex flex-col justify-between gap-3">
              <div>
                <span className="text-[9px] uppercase font-black text-slate-500 block mb-1">Get Started Fast</span>
                <p className="text-[10px] text-slate-400 leading-relaxed">Download our pre-structured template CSV file containing mock travel packages to map your columns instantly.</p>
              </div>
              <button
                onClick={downloadSampleCSV}
                type="button"
                className="w-full bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <Lucide.Download className="w-3.5 h-3.5" />
                Download Template CSV
              </button>
            </div>
          </div>

          {bulkError && (
            <div className="bg-rose-950/25 border border-rose-900/35 p-2.5 rounded-lg text-[10px] text-rose-400 font-bold flex items-center gap-1.5">
              <Lucide.AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>{bulkError}</span>
            </div>
          )}

          {bulkSuccess && (
            <div className="bg-emerald-950/25 border border-emerald-900/35 p-2.5 rounded-lg text-[10px] text-emerald-400 font-bold flex items-center gap-1.5">
              <Lucide.CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>{bulkSuccess}</span>
            </div>
          )}
        </div>
      )}

      {/* Package Form (Add / Edit) */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 animate-fadeIn">
          <div className="border-b border-slate-800 pb-2">
            <h4 className="text-xs font-black uppercase text-indigo-400">
              {editingPkg ? "Modify Standard Tour Template" : "Standardize New Vacation Package"}
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Package Name *</label>
              <input
                type="text"
                required
                value={formFields.name}
                onChange={(e) => setFormFields(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Kodaikanal Luxury Couple Special"
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Destination *</label>
              <select
                value={formFields.destination}
                onChange={(e) => setFormFields(prev => ({ ...prev, destination: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-slate-300 focus:outline-none capitalize"
              >
                <option value="kodaikanal">Kodaikanal</option>
                <option value="ooty">Ooty</option>
                <option value="coorg">Coorg</option>
                <option value="munnar">Munnar Hills</option>
                <option value="mysore">Mysore</option>
                <option value="alleppey">Alleppey Houseboats</option>
                <option value="pondicherry">Pondicherry</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Duration Text *</label>
              <input
                type="text"
                required
                value={formFields.duration}
                onChange={(e) => setFormFields(prev => ({ ...prev, duration: e.target.value }))}
                placeholder="e.g. 3 Days / 2 Nights"
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Category Category</label>
              <input
                type="text"
                value={formFields.category}
                onChange={(e) => setFormFields(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g. Honeymoon / Adventure / Family"
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Base Price per Person (₹) *</label>
              <input
                type="number"
                required
                value={formFields.price}
                onChange={(e) => setFormFields(prev => ({ ...prev, price: Number(e.target.value) }))}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Hotel Standard Rating</label>
              <input
                type="text"
                value={formFields.hotelCategory}
                onChange={(e) => setFormFields(prev => ({ ...prev, hotelCategory: e.target.value }))}
                placeholder="e.g. 3-Star Premium Resort"
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Standard Inclusions</label>
              <textarea
                value={formFields.inclusions}
                onChange={(e) => setFormFields(prev => ({ ...prev, inclusions: e.target.value }))}
                placeholder="Describe what is covered in the standard package price..."
                className="w-full h-16 bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none resize-none"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Standard Exclusions</label>
              <textarea
                value={formFields.exclusions}
                onChange={(e) => setFormFields(prev => ({ ...prev, exclusions: e.target.value }))}
                placeholder="Describe items NOT covered..."
                className="w-full h-16 bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Display Status</label>
              <select
                value={formFields.status}
                onChange={(e) => setFormFields(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-slate-300 focus:outline-none"
              >
                <option value="Active">Active Catalog</option>
                <option value="Inactive">Deactivated</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs text-slate-400 font-bold hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-xs font-bold px-5 py-2 rounded-lg text-white"
            >
              Save Standard Catalog Item
            </button>
          </div>
        </form>
      )}

      {/* Filter panel */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Lucide.Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search packages by name, destination, class..."
            className="w-full bg-slate-950 border border-slate-850 pl-9 pr-4 py-2 rounded-xl text-xs text-white focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Destination filter */}
          <select
            value={filterDest}
            onChange={(e) => setFilterDest(e.target.value)}
            className="bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">-- Destination --</option>
            <option value="kodaikanal">Kodaikanal</option>
            <option value="ooty">Ooty</option>
            <option value="coorg">Coorg</option>
            <option value="munnar">Munnar</option>
            <option value="mysore">Mysore</option>
            <option value="alleppey">Alleppey</option>
            <option value="pondicherry">Pondicherry</option>
          </select>

          {/* Duration Filter */}
          <select
            value={filterDuration}
            onChange={(e) => setFilterDuration(e.target.value)}
            className="bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">-- Duration --</option>
            <option value="2 Nights">2 Nights</option>
            <option value="3 Nights">3 Nights</option>
            <option value="4 Nights">4 Nights</option>
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">-- Status --</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Package Library Table (Requirement from user: 'Display saved packages in a searchable table') */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950/40 text-[9px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-850">
              <tr>
                <th className="p-4">Package Name</th>
                <th className="p-4">Destination</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Price / Person</th>
                <th className="p-4">Category</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {filteredPackages.map(pkg => (
                <tr key={pkg.id} className="hover:bg-slate-950/25 transition-all">
                  <td className="p-4 font-black text-white">
                    <p>{pkg.name}</p>
                    <span className="text-[9px] font-mono font-medium text-indigo-400">{pkg.hotelCategory}</span>
                  </td>
                  <td className="p-4 capitalize font-semibold text-slate-300">
                    <span className="flex items-center gap-1">
                      <Lucide.MapPin className="w-3.5 h-3.5 text-indigo-400" />
                      {pkg.destination}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-slate-400">{pkg.duration}</td>
                  <td className="p-4 font-black text-emerald-400 font-mono">₹{pkg.price.toLocaleString("en-IN")}</td>
                  <td className="p-4 font-medium text-slate-400">{pkg.category}</td>
                  <td className="p-4">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                      pkg.status === "Active" ? "bg-emerald-950 text-emerald-400 border border-emerald-900/30" : "bg-slate-950 text-slate-500 border border-slate-900"
                    }`}>
                      {pkg.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      {/* Action Triggers */}
                      <button
                        onClick={() => setViewingPkg(pkg)}
                        className="p-1 text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-850 rounded border border-slate-850 cursor-pointer"
                        title="View Specifications"
                      >
                        <Lucide.Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onUseInQuotation(pkg)}
                        className="p-1 text-sky-400 hover:text-sky-300 bg-slate-950 hover:bg-slate-850 rounded border border-slate-850 cursor-pointer text-[10px] font-bold px-1.5"
                        title="Use in Quotation Studio"
                      >
                        Quotation
                      </button>
                      <button
                        onClick={() => onUseInBooking(pkg)}
                        className="p-1 text-emerald-400 hover:text-emerald-300 bg-slate-950 hover:bg-slate-850 rounded border border-slate-850 cursor-pointer text-[10px] font-bold px-1.5"
                        title="Convert to Live Reservation"
                      >
                        Book
                      </button>
                      <button
                        onClick={() => handleDuplicate(pkg)}
                        className="p-1 text-amber-400 hover:text-amber-300 bg-slate-950 hover:bg-slate-850 rounded border border-slate-850 cursor-pointer"
                        title="Duplicate Catalog Item"
                      >
                        <Lucide.Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openEditForm(pkg)}
                        className="p-1 text-indigo-400 hover:text-indigo-300 bg-slate-950 hover:bg-slate-850 rounded border border-slate-850 cursor-pointer"
                        title="Edit Template"
                      >
                        <Lucide.Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove standard template ${pkg.name} from catalog library?`)) {
                            onDeletePackage(pkg.id);
                          }
                        }}
                        className="p-1 text-rose-400 hover:text-rose-300 bg-slate-950 hover:bg-slate-850 rounded border border-slate-850 cursor-pointer"
                        title="Delete Template"
                      >
                        <Lucide.Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPackages.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-mono">
                    No travel catalog templates mapped.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Package Specifications Modal */}
      {viewingPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-850">
              <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                <Lucide.Compass className="w-5 h-5 text-indigo-400" />
                {viewingPkg.name}
              </h3>
              <button onClick={() => setViewingPkg(null)} className="text-slate-400 hover:text-white cursor-pointer"><Lucide.X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-black text-slate-500">Destination Location:</span>
                <p className="text-white capitalize font-semibold">{viewingPkg.destination}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-black text-slate-500">Total Duration:</span>
                <p className="text-white font-medium">{viewingPkg.duration}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-black text-slate-500">Suggested Price:</span>
                <p className="text-emerald-400 font-black font-mono">₹{viewingPkg.price.toLocaleString("en-IN")} / Person</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-black text-slate-500">Lodging Category:</span>
                <p className="text-indigo-400 font-bold">{viewingPkg.hotelCategory || "Not Configured"}</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs pt-2 border-t border-slate-850">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                <h5 className="text-[9px] uppercase font-black text-emerald-400 mb-1 tracking-wider">Compulsory Inclusions</h5>
                <p className="text-slate-300 leading-relaxed whitespace-pre-line font-medium text-[11px]">{viewingPkg.inclusions || "None listed."}</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                <h5 className="text-[9px] uppercase font-black text-rose-400 mb-1 tracking-wider">Excluded parameters</h5>
                <p className="text-slate-300 leading-relaxed whitespace-pre-line font-medium text-[11px]">{viewingPkg.exclusions || "None listed."}</p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-850 text-xs">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onUseInQuotation(viewingPkg);
                    setViewingPkg(null);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  Apply in Quotation
                </button>
                <button
                  onClick={() => {
                    onUseInBooking(viewingPkg);
                    setViewingPkg(null);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  Create Live Reservation
                </button>
              </div>
              <button
                onClick={() => setViewingPkg(null)}
                className="bg-slate-800 hover:bg-slate-750 text-slate-400 font-bold px-4 py-1.5 rounded-lg transition-all"
              >
                Close Library File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
