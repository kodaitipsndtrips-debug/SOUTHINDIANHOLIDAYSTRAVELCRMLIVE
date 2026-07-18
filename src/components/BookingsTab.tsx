import React, { useState } from "react";
import * as Lucide from "lucide-react";
import { Booking, TourPackage, Driver } from "../types";
import { getLocalDateString, formatFriendlyDate } from "../utils";

interface BookingsTabProps {
  bookings: Booking[];
  packages: TourPackage[];
  drivers: Driver[];
  selectedPkgFromLibrary: TourPackage | null;
  clearSelectedPkg: () => void;
  onAddBooking: (booking: Partial<Booking>) => void;
  onUpdateBooking: (id: string, booking: Partial<Booking>) => void;
  onDeleteBooking: (id: string) => void;
}

export default function BookingsTab({
  bookings = [],
  packages = [],
  drivers = [],
  selectedPkgFromLibrary,
  clearSelectedPkg,
  onAddBooking,
  onUpdateBooking,
  onDeleteBooking
}: BookingsTabProps) {
  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const safePackages = Array.isArray(packages) ? packages : [];
  const safeDrivers = Array.isArray(drivers) ? drivers : [];

  const [search, setSearch] = useState("");
  const [filterDest, setFilterDest] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);

  // Form Fields
  const [formFields, setFormFields] = useState({
    customerName: "",
    customerMobile: "",
    customerEmail: "",
    destination: "kodaikanal",
    travelDate: getLocalDateString(),
    adults: 2,
    children: 0,
    packagePrice: 15000,
    hotelDetails: "Hotel Hilltop Tower (CP Meal Plan)",
    driverDetails: "Muthu Pandi (Innova)",
    status: "Confirmed" as const
  });

  // Load from library package if routed from Packages Tab
  React.useEffect(() => {
    if (selectedPkgFromLibrary) {
      setFormFields(prev => ({
        ...prev,
        destination: selectedPkgFromLibrary.destination,
        packagePrice: selectedPkgFromLibrary.price,
        hotelDetails: `${selectedPkgFromLibrary.hotelCategory || "3-Star Deluxe Hotel"} - ${selectedPkgFromLibrary.name}`,
        status: "Confirmed"
      }));
      setShowForm(true);
      clearSelectedPkg();
    }
  }, [selectedPkgFromLibrary, clearSelectedPkg]);

  const openAddForm = () => {
    setEditingBooking(null);
    setFormFields({
      customerName: "",
      customerMobile: "",
      customerEmail: "",
      destination: "kodaikanal",
      travelDate: getLocalDateString(),
      adults: 2,
      children: 0,
      packagePrice: 15000,
      hotelDetails: "Hotel Hilltop Tower (CP Meal Plan)",
      driverDetails: drivers[0] ? `${drivers[0].name} (${drivers[0].vehicleType})` : "Muthu Pandi (Innova)",
      status: "Confirmed"
    });
    setShowForm(true);
  };

  const openEditForm = (bk: Booking) => {
    setEditingBooking(bk);
    setFormFields({
      customerName: bk.customerName,
      customerMobile: bk.customerMobile,
      customerEmail: bk.customerEmail || "",
      destination: bk.destination,
      travelDate: bk.travelDate,
      adults: bk.adults,
      children: bk.children,
      packagePrice: bk.packagePrice,
      hotelDetails: bk.hotelDetails,
      driverDetails: bk.driverDetails || "",
      status: bk.status as any
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBooking) {
      onUpdateBooking(editingBooking.id, formFields);
    } else {
      onAddBooking(formFields);
    }
    setShowForm(false);
  };

  // Filter Bookings
  const filteredBookings = safeBookings.filter(b => {
    const term = search.toLowerCase();
    const matchesSearch =
      (b.customerName || "").toLowerCase().includes(term) ||
      (b.customerMobile || "").includes(term) ||
      (b.id || "").toLowerCase().includes(term) ||
      (b.destination || "").toLowerCase().includes(term);

    const matchesDest = filterDest === "all" || b.destination === filterDest;
    const matchesStatus = filterStatus === "all" || b.status === filterStatus;

    return matchesSearch && matchesDest && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Title Header */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <Lucide.CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Bookings Desk</h3>
            <p className="text-[10px] text-slate-500 font-semibold">Track confirmed client departures, driver registries, and passenger documents</p>
          </div>
        </div>
        <button
          onClick={openAddForm}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/10"
        >
          <Lucide.Plus className="w-4 h-4" />
          New Reservation
        </button>
      </div>

      {/* Reservation Form Modal / Drawer */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 animate-fadeIn">
          <div className="border-b border-slate-800 pb-2">
            <h4 className="text-xs font-black uppercase text-indigo-400">
              {editingBooking ? "Modify Active Reservation Details" : "Lock New Travel Reservation"}
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Customer Name *</label>
              <input
                type="text"
                required
                value={formFields.customerName}
                onChange={(e) => setFormFields(prev => ({ ...prev, customerName: e.target.value }))}
                placeholder="e.g. Amit Patel"
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Mobile Contact *</label>
              <input
                type="tel"
                required
                value={formFields.customerMobile}
                onChange={(e) => setFormFields(prev => ({ ...prev, customerMobile: e.target.value }))}
                placeholder="e.g. 9876543210"
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Email</label>
              <input
                type="email"
                value={formFields.customerEmail}
                onChange={(e) => setFormFields(prev => ({ ...prev, customerEmail: e.target.value }))}
                placeholder="customer@gmail.com"
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Destination Location</label>
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
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Travel Date</label>
              <input
                type="date"
                value={formFields.travelDate}
                onChange={(e) => setFormFields(prev => ({ ...prev, travelDate: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-slate-300 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Adults Count</label>
              <input
                type="number"
                value={formFields.adults}
                onChange={(e) => setFormFields(prev => ({ ...prev, adults: Number(e.target.value) }))}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Children Count</label>
              <input
                type="number"
                value={formFields.children}
                onChange={(e) => setFormFields(prev => ({ ...prev, children: Number(e.target.value) }))}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Package Price Locked (₹)</label>
              <input
                type="number"
                value={formFields.packagePrice}
                onChange={(e) => setFormFields(prev => ({ ...prev, packagePrice: Number(e.target.value) }))}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none font-mono"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Lodging Accommodations Details</label>
              <input
                type="text"
                value={formFields.hotelDetails}
                onChange={(e) => setFormFields(prev => ({ ...prev, hotelDetails: e.target.value }))}
                placeholder="e.g. Hotel Hilltop Tower (Room 104 - CP Plan)"
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Fleet / Driver Assignment</label>
              <select
                value={formFields.driverDetails}
                onChange={(e) => setFormFields(prev => ({ ...prev, driverDetails: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-slate-300 focus:outline-none"
              >
                {safeDrivers.map(d => (
                  <option key={d.id} value={`${d.name} (${d.vehicleType})`}>{d.name} - {d.vehicleType} [{d.vehicleNo}]</option>
                ))}
                <option value="Muthu Pandi (Innova)">Muthu Pandi (Innova)</option>
                <option value="Unassigned">Hold - Unassigned</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Reservation Status</label>
              <select
                value={formFields.status}
                onChange={(e) => setFormFields(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-slate-300 focus:outline-none"
              >
                <option value="Confirmed">Confirmed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Completed">Completed Trip</option>
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
              Lock Reservation File
            </button>
          </div>
        </form>
      )}

      {/* Filters panels */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Lucide.Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bookings by name, mobile, reference ID, hotel..."
            className="w-full bg-slate-950 border border-slate-850 pl-9 pr-4 py-2 rounded-xl text-xs text-white focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={filterDest}
            onChange={(e) => setFilterDest(e.target.value)}
            className="bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-slate-300 focus:outline-none capitalize"
          >
            <option value="all">-- All Locations --</option>
            <option value="kodaikanal">Kodaikanal</option>
            <option value="ooty">Ooty</option>
            <option value="coorg">Coorg</option>
            <option value="munnar">Munnar</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">-- All Statuses --</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Grid listing of confirmed bookings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBookings.map(bk => {
          const statusStyles: any = {
            Confirmed: "bg-emerald-950 text-emerald-400 border border-emerald-900/30",
            Cancelled: "bg-rose-950 text-rose-400 border border-rose-900/30",
            Completed: "bg-blue-950 text-blue-400 border border-blue-900/30"
          };

          return (
            <div
              key={bk.id}
              className="bg-slate-900 border border-slate-850 hover:border-slate-800 p-5 rounded-2xl flex flex-col justify-between gap-4 transition-all hover:shadow-lg shadow-indigo-500/5 animate-fadeIn"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 font-bold">{bk.id}</span>
                    <h4 className="text-sm font-black text-white mt-0.5">{bk.customerName}</h4>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${statusStyles[bk.status] || "bg-slate-950"}`}>
                    {bk.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <p className="flex items-center gap-1.5 text-slate-300 font-semibold">
                    <Lucide.Smartphone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{bk.customerMobile}</span>
                  </p>
                  <p className="flex items-center gap-1.5 text-slate-400 font-medium capitalize">
                    <Lucide.MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{bk.destination} | {bk.adults} Adults, {bk.children} Kids</span>
                  </p>
                  <p className="flex items-center gap-1.5 text-slate-400 font-medium">
                    <Lucide.Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Travel Date: {formatFriendlyDate(bk.travelDate)}</span>
                  </p>
                  <p className="flex items-center gap-1.5 text-slate-400 font-semibold truncate bg-slate-950/40 p-2 rounded-lg border border-slate-850">
                    <Lucide.Building className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <span className="truncate">{bk.hotelDetails}</span>
                  </p>
                  <p className="flex items-center gap-1.5 text-slate-400 font-semibold truncate bg-slate-950/40 p-2 rounded-lg border border-slate-850">
                    <Lucide.Car className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                    <span className="truncate">Driver: {bk.driverDetails || "Unassigned"}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-850 pt-3">
              <span className="text-emerald-400 font-mono font-black">
  ₹{Number(bk.packagePrice ?? 0).toLocaleString("en-IN")}
</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      let cleanMobile = bk.customerMobile.replace(/\D/g, "");
                      if (cleanMobile.length === 10) {
                        cleanMobile = "91" + cleanMobile;
                      }
                      const confirmationMsg = `Dear ${bk.customerName},\n\nYour booking with South Indian Holidays is CONFIRMED! 🎉✈️\n\nBooking ID: ${bk.id}\n📍 Destination: ${bk.destination.toUpperCase()}\n📅 Travel Date: ${formatFriendlyDate(bk.travelDate)}\n🏨 Stay: ${bk.hotelDetails}\n🚗 Cab details: ${bk.driverDetails || "Awaiting driver assignment"}\n💰 Package Price: ₹${Number(bk.packagePrice ?? 0).toLocaleString("en-IN")}\n\nOur operations desk will coordinate driver meeting instructions a day prior to departure.\n\nWarm Regards,\nSouth Indian Holidays`;
                      window.open(`https://wa.me/${cleanMobile}?text=${encodeURIComponent(confirmationMsg)}`, "_blank", "noopener,noreferrer");
                    }}
                    className="p-1.5 text-emerald-400 hover:text-emerald-300 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-900/30 rounded-lg cursor-pointer"
                    title="Share Booking Confirmation via WhatsApp"
                  >
                    <Lucide.MessageSquare className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewingBooking(bk)}
                    className="p-1.5 text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-850 rounded-lg border border-slate-850 cursor-pointer"
                    title="Logs & Passenger File"
                  >
                    <Lucide.Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => openEditForm(bk)}
                    className="p-1.5 text-indigo-400 hover:text-indigo-300 bg-slate-950 hover:bg-slate-850 rounded-lg border border-slate-850 cursor-pointer"
                    title="Edit Reservation"
                  >
                    <Lucide.Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete travel reservation? This deletes payments ledgers and associated hotel vouchers!")) {
                        onDeleteBooking(bk.id);
                      }
                    }}
                    className="p-1.5 text-rose-400 hover:text-rose-300 bg-slate-950 hover:bg-slate-850 rounded-lg border border-slate-850 cursor-pointer"
                    title="Delete Reservation"
                  >
                    <Lucide.Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filteredBookings.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center text-slate-500 font-mono text-xs md:col-span-3">
            No reservations matched the filters.
          </div>
        )}
      </div>

      {/* Reservation Log and Timeline Detail Modal */}
      {viewingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-850">
              <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                <Lucide.CheckSquare className="w-5 h-5 text-indigo-400" />
                Reservation: {viewingBooking.customerName} ({viewingBooking.id})
              </h3>
              <button onClick={() => setViewingBooking(null)} className="text-slate-400 hover:text-white cursor-pointer"><Lucide.X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-1">
                <span className="text-[9px] uppercase font-black text-slate-500">Accommodation Status:</span>
                <p className="text-white font-medium">{viewingBooking.hotelDetails}</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-1">
                <span className="text-[9px] uppercase font-black text-slate-500">Fleet Allocations:</span>
                <p className="text-white font-medium">{viewingBooking.driverDetails || "Unassigned"}</p>
              </div>
            </div>

            {/* Timelines and files */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-850">
              <div className="space-y-2">
                <h4 className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Log milestones</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {Array.isArray(viewingBooking.timeline) && viewingBooking.timeline.map((item, idx) => (
                    <div key={idx} className="relative pl-4 border-l border-slate-800 pb-2">
                      <span className="absolute -left-1 top-1.5 w-2 h-2 rounded-full bg-emerald-500" />
                      <p className="text-slate-300 leading-relaxed">{item.text}</p>
                      <p className="text-[8px] text-slate-500 font-mono mt-0.5">{item.timestamp}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Ticket Locker & Vouchers</h4>
                <div className="space-y-1">
                  {Array.isArray(viewingBooking.documents) && viewingBooking.documents.map((doc, idx) => (
                    <a
                      key={idx}
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-lg flex justify-between items-center text-[11px]"
                    >
                      <span className="text-indigo-400 font-bold truncate">{doc.name}</span>
                      <Lucide.ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    </a>
                  ))}
                  {(!viewingBooking.documents || viewingBooking.documents.length === 0) && (
                    <p className="text-[10px] text-slate-500 font-mono py-2 text-center">No tickets issued yet.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-850">
              <button
                onClick={() => setViewingBooking(null)}
                className="bg-slate-800 hover:bg-slate-750 text-xs font-bold px-4 py-2 rounded-lg text-slate-300 transition-all"
              >
                Close Reservation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
