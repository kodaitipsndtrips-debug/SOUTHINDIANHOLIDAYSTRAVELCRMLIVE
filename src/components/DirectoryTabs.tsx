import React, { useState } from "react";
import * as Lucide from "lucide-react";
import { Hotel, Driver, Supplier } from "../types";

interface DirectoryTabsProps {
  hotels: Hotel[];
  drivers: Driver[];
  suppliers: Supplier[];
  onAddHotel: (hotel: Partial<Hotel>) => void;
  onAddDriver: (driver: Partial<Driver>) => void;
  onAddSupplier: (supplier: Partial<Supplier>) => void;
  onDeleteHotel: (id: string) => void;
  onDeleteDriver: (id: string) => void;
  onDeleteSupplier: (id: string) => void;
}

export default function DirectoryTabs({
  hotels = [],
  drivers = [],
  suppliers = [],
  onAddHotel,
  onAddDriver,
  onAddSupplier,
  onDeleteHotel,
  onDeleteDriver,
  onDeleteSupplier
}: DirectoryTabsProps) {
  const safeHotels = Array.isArray(hotels) ? hotels : [];
  const safeDrivers = Array.isArray(drivers) ? drivers : [];
  const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];

  const [subTab, setSubTab] = useState<"hotels" | "drivers" | "suppliers">("hotels");
  const [showForm, setShowForm] = useState(false);

  // Hotels Fields
  const [hotelName, setHotelName] = useState("");
  const [hotelDest, setHotelDest] = useState("kodaikanal");
  const [hotelStars, setHotelStars] = useState(3);
  const [hotelCP, setHotelCP] = useState("");
  const [hotelPhone, setHotelPhone] = useState("");
  const [hotelRate, setHotelRate] = useState(2500);
  const [roomType, setRoomType] = useState("Deluxe Room");

  // Drivers Fields
  const [driverName, setDriverName] = useState("");
  const [vehicleType, setVehicleType] = useState("Toyota Innova");
  const [vehicleNo, setVehicleNo] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [driverLicense, setDriverLicense] = useState("");
  const [dailyRate, setDailyRate] = useState(2200);

  // Suppliers Fields
  const [supName, setSupName] = useState("");
  const [supCat, setSupCat] = useState("Activities");
  const [supCP, setSupCP] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supDues, setSupDues] = useState(0);

  const handleAddHotel = (e: React.FormEvent) => {
    e.preventDefault();
    onAddHotel({
      name: hotelName,
      destination: hotelDest,
      stars: Number(hotelStars),
      contactPerson: hotelCP,
      contactPhone: hotelPhone,
      contractRate: Number(hotelRate),
      roomType
    });
    setHotelName("");
    setHotelPhone("");
    setShowForm(false);
  };

  const handleAddDriver = (e: React.FormEvent) => {
    e.preventDefault();
    onAddDriver({
      name: driverName,
      vehicleType,
      vehicleNo,
      phone: driverPhone,
      licenseNo: driverLicense,
      dailyRate: Number(dailyRate),
      status: "Available"
    });
    setDriverName("");
    setVehicleNo("");
    setDriverPhone("");
    setShowForm(false);
  };

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    onAddSupplier({
      name: supName,
      category: supCat,
      contactPerson: supCP,
      contactPhone: supPhone,
      pendingDues: Number(supDues)
    });
    setSupName("");
    setSupPhone("");
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <Lucide.BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Supplier & Fleet Directories</h3>
            <p className="text-[10px] text-slate-500 font-semibold">Track contracted hotels, private fleet drivers, and wholesale activity suppliers</p>
          </div>
        </div>

        {/* Unified Sub tabs selector */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850 text-xs">
          <button
            onClick={() => { setSubTab("hotels"); setShowForm(false); }}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              subTab === "hotels" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Hotels List ({hotels.length})
          </button>
          <button
            onClick={() => { setSubTab("drivers"); setShowForm(false); }}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              subTab === "drivers" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Drivers Fleet ({drivers.length})
          </button>
          <button
            onClick={() => { setSubTab("suppliers"); setShowForm(false); }}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              subTab === "suppliers" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Suppliers ({suppliers.length})
          </button>
        </div>
      </div>

      {/* Unified form toggler */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow shadow-indigo-600/10"
        >
          <Lucide.Plus className="w-4 h-4" />
          Add Directory Entry
        </button>
      </div>

      {/* Sub Form - Hotels */}
      {showForm && subTab === "hotels" && (
        <form onSubmit={handleAddHotel} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 text-xs animate-fadeIn">
          <div className="md:col-span-2">
            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Hotel Name *</label>
            <input
              type="text" required value={hotelName} onChange={(e) => setHotelName(e.target.value)}
              placeholder="e.g. Hotel Hilltop Tower" className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Destination Location</label>
            <select
              value={hotelDest} onChange={(e) => setHotelDest(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-slate-300 focus:outline-none capitalize"
            >
              <option value="kodaikanal">Kodaikanal</option>
              <option value="ooty">Ooty</option>
              <option value="coorg">Coorg</option>
              <option value="munnar">Munnar</option>
              <option value="alleppey">Alleppey</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Star Tier</label>
            <select value={hotelStars} onChange={(e) => setHotelStars(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-slate-300 focus:outline-none">
              <option value={3}>3-Star Deluxe</option>
              <option value={4}>4-Star Premium</option>
              <option value={5}>5-Star Luxury Resort</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Contact Manager</label>
            <input type="text" value={hotelCP} onChange={(e) => setHotelCP(e.target.value)} placeholder="Manager Name" className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none" />
          </div>
          <div>
            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Manager Phone</label>
            <input type="tel" value={hotelPhone} onChange={(e) => setHotelPhone(e.target.value)} placeholder="Ph No" className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none font-mono" />
          </div>
          <div>
            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Negotiated Rate (₹ / Night)</label>
            <input type="number" value={hotelRate} onChange={(e) => setHotelRate(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none font-mono" />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Room Type Category</label>
              <input type="text" value={roomType} onChange={(e) => setRoomType(e.target.value)} placeholder="e.g. Deluxe Lake View" className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none" />
            </div>
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl">Save</button>
          </div>
        </form>
      )}

      {/* Sub Form - Drivers */}
      {showForm && subTab === "drivers" && (
        <form onSubmit={handleAddDriver} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 text-xs animate-fadeIn">
          <div>
            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Driver Full Name *</label>
            <input type="text" required value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Selvam M" className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none" />
          </div>
          <div>
            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Vehicle Type</label>
            <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-slate-300 focus:outline-none">
              <option value="Toyota Innova (SUV)">Toyota Innova (SUV)</option>
              <option value="Swift Dzire (Sedan)">Swift Dzire (Sedan)</option>
              <option value="Tempo Traveler (12-Seater)">Tempo Traveler (12-Seater)</option>
              <option value="Etios (Sedan)">Etios (Sedan)</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Vehicle Plate Number *</label>
            <input type="text" required value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="TN-59-CX-1043" className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none font-mono uppercase" />
          </div>
          <div>
            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Driver Phone *</label>
            <input type="tel" required value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="9843210432" className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none font-mono" />
          </div>
          <div>
            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Driving License Number</label>
            <input type="text" value={driverLicense} onChange={(e) => setDriverLicense(e.target.value)} placeholder="DL-59-20150..." className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none font-mono uppercase" />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Daily Driver Rate (₹)</label>
              <input type="number" value={dailyRate} onChange={(e) => setDailyRate(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none font-mono" />
            </div>
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl">Save</button>
          </div>
        </form>
      )}

      {/* Sub Form - Suppliers */}
      {showForm && subTab === "suppliers" && (
        <form onSubmit={handleAddSupplier} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 text-xs animate-fadeIn">
          <div>
            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Supplier / Wholesaler Name *</label>
            <input type="text" required value={supName} onChange={(e) => setSupName(e.target.value)} placeholder="e.g. Munnar Sightseeing Wholesalers" className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none" />
          </div>
          <div>
            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Service Category</label>
            <select value={supCat} onChange={(e) => setSupCat(e.target.value)} className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-slate-300 focus:outline-none">
              <option value="Activities">Scenic Activities / Entry tickets</option>
              <option value="Houseboat">Houseboat cruises</option>
              <option value="Local Transport">Local auto rickshaws / jeeps</option>
              <option value="Hotels Wholesale">Hotels Wholesale Agent</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Supplier Contact Person</label>
            <input type="text" value={supCP} onChange={(e) => setSupCP(e.target.value)} placeholder="Authorized Rep Name" className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none" />
          </div>
          <div>
            <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Supplier Contact Phone</label>
            <input type="tel" value={supPhone} onChange={(e) => setSupPhone(e.target.value)} placeholder="Ph No" className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none font-mono" />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Pending Accounts Payable (₹)</label>
              <input type="number" value={supDues} onChange={(e) => setSupDues(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-white focus:outline-none font-mono" />
            </div>
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl">Save</button>
          </div>
        </form>
      )}

      {/* LIST TABLES */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg text-xs animate-fadeIn">
        {subTab === "hotels" && (
          <table className="w-full text-left">
            <thead className="bg-slate-950/40 text-[9px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-850">
              <tr>
                <th className="p-3.5">Hotel Name</th>
                <th className="p-3.5">Destination</th>
                <th className="p-3.5">Star Rating</th>
                <th className="p-3.5">Room Category</th>
                <th className="p-3.5">Contact Person</th>
                <th className="p-3.5 text-right font-mono">Contract Rate (₹)</th>
                <th className="p-3.5 text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {safeHotels.map(h => (
                <tr key={h.id} className="hover:bg-slate-950/20">
                  <td className="p-3.5 font-black text-white">{h.name}</td>
                  <td className="p-3.5 capitalize font-bold text-indigo-400">{h.destination}</td>
                  <td className="p-3.5">
                    <span className="flex items-center gap-0.5 text-amber-400">
                      {Array.from({ length: h.stars }).map((_, i) => (
                        <Lucide.Star key={i} className="w-3 h-3 fill-amber-400" />
                      ))}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-400 font-semibold">{h.roomType || "Standard Deluxe"}</td>
                  <td className="p-3.5 text-slate-400">
                    <p className="font-bold">{h.contactPerson || "N/A"}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{h.contactPhone}</p>
                  </td>
                  <td className="p-3.5 text-right font-black font-mono text-emerald-400">₹{h.contractRate?.toLocaleString("en-IN") || "2,500"}</td>
                  <td className="p-3.5 text-right">
                    <button onClick={() => onDeleteHotel(h.id)} className="text-rose-400 hover:text-rose-300 cursor-pointer">
                      <Lucide.Trash className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {safeHotels.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-mono">No hotels logged.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {subTab === "drivers" && (
          <table className="w-full text-left">
            <thead className="bg-slate-950/40 text-[9px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-850">
              <tr>
                <th className="p-3.5">Driver Name</th>
                <th className="p-3.5">Vehicle Type</th>
                <th className="p-3.5">Plate Number</th>
                <th className="p-3.5">Phone Number</th>
                <th className="p-3.5 text-right font-mono">Daily Rate (₹)</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {safeDrivers.map(d => (
                <tr key={d.id} className="hover:bg-slate-950/20">
                  <td className="p-3.5 font-black text-white">{d.name}</td>
                  <td className="p-3.5 font-semibold text-indigo-400">{d.vehicleType}</td>
                  <td className="p-3.5 font-mono uppercase tracking-wider text-[11px] text-white font-bold">{d.vehicleNo}</td>
                  <td className="p-3.5 font-mono text-slate-400">{d.phone}</td>
                  <td className="p-3.5 text-right font-black font-mono text-emerald-400">₹{d.dailyRate?.toLocaleString("en-IN") || "2,200"}</td>
                  <td className="p-3.5 text-center">
                    <span className={`text-[8px] font-black px-2.5 py-0.5 rounded-full uppercase border ${
                      d.status === "Available" ? "bg-emerald-950 text-emerald-400 border-emerald-900/30" : "bg-rose-950 text-rose-500 border-rose-900/30"
                    }`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <button onClick={() => onDeleteDriver(d.id)} className="text-rose-400 hover:text-rose-300 cursor-pointer">
                      <Lucide.Trash className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {safeDrivers.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-mono">No active fleet drivers enrolled.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {subTab === "suppliers" && (
          <table className="w-full text-left">
            <thead className="bg-slate-950/40 text-[9px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-850">
              <tr>
                <th className="p-3.5">Supplier Name</th>
                <th className="p-3.5">Service Category</th>
                <th className="p-3.5">Contact Person</th>
                <th className="p-3.5">Phone Number</th>
                <th className="p-3.5 text-right font-mono">Pending Accounts Payable</th>
                <th className="p-3.5 text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {safeSuppliers.map(s => (
                <tr key={s.id} className="hover:bg-slate-950/20">
                  <td className="p-3.5 font-black text-white">{s.name}</td>
                  <td className="p-3.5">
                    <span className="text-[10px] bg-slate-950 border border-slate-850 px-2.5 py-0.5 rounded-full font-bold text-slate-400">{s.category}</span>
                  </td>
                  <td className="p-3.5 font-bold text-slate-300">{s.contactPerson || "N/A"}</td>
                  <td className="p-3.5 font-mono text-slate-400">{s.contactPhone}</td>
                  <td className="p-3.5 text-right font-black font-mono text-rose-400">₹{s.pendingDues?.toLocaleString("en-IN") || "0"}</td>
                  <td className="p-3.5 text-right">
                    <button onClick={() => onDeleteSupplier(s.id)} className="text-rose-400 hover:text-rose-300 cursor-pointer">
                      <Lucide.Trash className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {safeSuppliers.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-mono">No wholesalers logged.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
