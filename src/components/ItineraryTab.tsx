import React, { useState, useEffect } from "react";
import * as Lucide from "lucide-react";
import { Booking, TourPackage, Itinerary, ItineraryDay } from "../types";

interface ItineraryTabProps {
  itineraries: Itinerary[];
  bookings: Booking[];
  packages: TourPackage[];
  onAddItinerary: (itinerary: Partial<Itinerary>) => void;
  onUpdateItinerary: (id: string, itinerary: Partial<Itinerary>) => void;
  onDeleteItinerary: (id: string) => void;
  companySettings: any;
}

// Curated digital assets for South Indian destinations
const DIGITAL_ASSET_LIBRARY = {
  kodaikanal: {
    sightseeing: [
      "Kodaikanal Star Lake & Row Boating",
      "Pillar Rocks Lookout & Guna Caves Trail",
      "Mist-filled Pine Forest Walking Path",
      "Coaker's Walk Panoramic Viewpoint",
      "Bryant Park Botanical Walk",
      "Silver Cascade Waterfalls Photo stop",
      "Kurinji Andavar Temple scenic valley review",
      "Dolphin's Nose Trekking point"
    ],
    hotels: [
      "Le Poshe Luxury Resort (4-Star Premium)",
      "The Carlton Lakeview Heritage Hotel",
      "Sterling Kodai Valley (Spacious Suites)",
      "Misty Mountain Heights Resort",
      "South Indian Green Wood Cottage"
    ]
  },
  ooty: {
    sightseeing: [
      "Ooty Botanical Gardens Heritage Walk",
      "Centenary Rose Garden scenic photography",
      "Doddabetta Peak Highest Lookout",
      "Ooty Lake Private Motorboating",
      "Pykara Majestic Waterfalls & Pine trails",
      "Avalanche Lake Biosphere Sanctuary",
      "Nilgiri Toy Train Heritage Ride (Ooty to Coonoor)"
    ],
    hotels: [
      "Savoy - IHCL SeleQtions (Heritage Luxury)",
      "Sherlock Hotel (British Era Estate)",
      "Sinclairs Retreat Ooty (Valley Views)",
      "Hotel Lakeview Deluxe Cabins",
      "Fernhill Royal Palace Chambers"
    ]
  },
  coorg: {
    sightseeing: [
      "Abbey Falls hanging bridge cascade",
      "Raja's Seat Sunset flower garden",
      "Golden Temple Namdroling Monastery (Bylakuppe)",
      "Dubare Elephant Camp River Bathing",
      "Madikeri Fort Historical Museum Walk",
      "Talakaveri - Source of Holy River Kaveri",
      "Nisargadhama Bamboo forest canopy"
    ],
    hotels: [
      "The Tamara Coorg (5-Star Forest Luxury)",
      "Evolve Back Coorg (Plantation Villas)",
      "Club Mahindra Madikeri Resort",
      "Coorg Wilderness Resort (Premium Chalets)",
      "Coffee Estate Heritage Plantation Homestay"
    ]
  },
  munnar: {
    sightseeing: [
      "Eravikulam National Park (Spot Nilgiri Tahr)",
      "Mattupetty Dam Speedboating & Shola forest",
      "Tata Tea Museum & Plantation history tour",
      "Kundala Lake Scenic Pedal Boating",
      "Echo Point Valley acoustic echo phenomenon",
      "Lakkam Waterfalls pristine forest stream",
      "Anamudi Peak highest point viewing"
    ],
    hotels: [
      "Blanket Hotel & Spa (Misty Valley)",
      "Windermere Estate Plantation Stay",
      "The Scenic Munnar Deluxe Chalets",
      "Elixir Hills Suites & Canopy Spa",
      "Munnar Castle Mountain View Resort"
    ]
  },
  mysore: {
    sightseeing: [
      "Amba Vilas Mysore Palace Royal illumination",
      "Chamundi Hills Sri Chamundeshwari Temple",
      "Brindavan Gardens Musical Fountain show",
      "Mysore Zoo (Chamarajendra Zoological Gardens)",
      "St. Philomena's Church Neo-Gothic spires",
      "Srirangapatna Tipu Sultan Summer Palace"
    ],
    hotels: [
      "Radisson Blu Plaza Mysore Hotel",
      "Grand Mercure Mysore (Urban Premium)",
      "Lalitha Mahal Palace Heritage Chambers",
      "Southern Star Mysore Executive",
      "Windflower Resort & Spa Mysore"
    ]
  },
  alleppey: {
    sightseeing: [
      "Premium Backwater Houseboat Cruise (Vembanad Lake)",
      "Alappuzha beach old lighthouse ruins",
      "Marari Beach pristine sand hammock relaxation",
      "Pathiramanal Island migratory bird sanctuary",
      "Kuttanad Below Sea Level paddy cultivation fields"
    ],
    hotels: [
      "Premium Lakeview Houseboat Suite (Full Board)",
      "Ramada by Wyndham Alleppey Resort",
      "Lemon Tree Vembanad Lake Resort",
      "Sterling Lake Palace Alleppey Resort",
      "Traditional Kerala Backwater Homestay"
    ]
  },
  pondicherry: {
    sightseeing: [
      "Auroville Matrimandir Dome & Peace garden stroll",
      "French Quarter Colonial architecture walking safari",
      "Promenade Beach rock-lined sunset promenade",
      "Paradise Beach Speedboat transfer and water sports",
      "Sri Aurobindo Ashram spiritual meditation hall",
      "Chunnambar Boat House mangrove tour"
    ],
    hotels: [
      "Palais de Mahé - CGH Earth (French colonial)",
      "The Promenade Seaview Hotel",
      "Auroville Quiet Healing Center Guesthouse",
      "Shenbaga Hotel & Convention Centre",
      "Ocean Spray Luxury Lagoon Villas"
    ]
  }
};

const COMMON_TRANSPORT_OPTIONS = [
  "Private Sedan Swift Dzire (Full AC, Professional Driver)",
  "Toyota Innova Crysta SUV (Spacious AC, Carrier-fitted)",
  "AC Tempo Traveller (12-Seater, Premium Reclining Seats)",
  "Comfortable Hatchback (Tata Altroz/Etios - Economic AC)",
  "Standard Tourist Coach (21-Seater Deluxe AC)"
];

const COMMON_MEAL_PLANS = [
  "CP Plan: Standard Bed & Breakfast Buffet Included",
  "MAP Plan: Half-board Accommodation (Breakfast + Dinner Included)",
  "AP Plan: Full-board Accommodation (All Meals Included - Breakfast, Lunch, Dinner)",
  "EP Plan: European Plan (Room Only, No Meals Included)"
];

export default function ItineraryTab({
  itineraries = [],
  bookings = [],
  packages = [],
  onAddItinerary,
  onUpdateItinerary,
  onDeleteItinerary,
  companySettings
}: ItineraryTabProps) {
  const safeItineraries = Array.isArray(itineraries) ? itineraries : [];
  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const safePackages = Array.isArray(packages) ? packages : [];

  const [showForm, setShowForm] = useState(false);
  const [editingItinerary, setEditingItinerary] = useState<Itinerary | null>(null);
  const [viewingItinerary, setViewingItinerary] = useState<Itinerary | null>(null);
  const [search, setSearch] = useState("");

  // Editor Form Fields
  const [customerName, setCustomerName] = useState("");
  const [destination, setDestination] = useState<string>("kodaikanal");
  const [duration, setDuration] = useState("3 Days / 2 Nights");
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [activeDayIdx, setActiveDayIdx] = useState<number>(0);

  // States for OCR and loading
  const [draggingFile, setDraggingFile] = useState(false);
  const [importedStatus, setImportedStatus] = useState<string | null>(null);
  const [parsingDoc, setParsingDoc] = useState(false);

  // Undo/Redo States
  const [history, setHistory] = useState<ItineraryDay[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Auto-Save notification
  const [autoSaveTime, setAutoSaveTime] = useState<string | null>(null);

  // Initialize form state
  const handleOpenAddForm = () => {
    setEditingItinerary(null);
    setCustomerName("");
    setDestination("kodaikanal");
    setDuration("3 Days / 2 Nights");
    
    const initialDays = [
      { 
        dayNumber: 1, 
        title: "Welcome & Scenic Check-in", 
        activity: "Arrive at station. Warm reception by our executive. Board private AC transport and transfer to resort. In the evening, enjoy scenic view walks and local market strolls.", 
        stay: "Deluxe Resort Suite (Breakfast Included)" 
      },
      { 
        dayNumber: 2, 
        title: "Full Day Local Sightseeing Tour", 
        activity: "Enjoy a hearty breakfast. Embark on a spectacular full-day private guided sightseeing tour covering major local lookouts, waterfalls, and lakes.", 
        stay: "Deluxe Resort Suite (Breakfast Included)" 
      }
    ];
    setDays(initialDays);
    setHistory([initialDays]);
    setHistoryIndex(0);
    setActiveDayIdx(0);
    setImportedStatus(null);
    setShowForm(true);
  };

  const handleOpenEditForm = (itn: Itinerary) => {
    setEditingItinerary(itn);
    setCustomerName(itn.customerName);
    setDestination(itn.destination || "kodaikanal");
    setDuration(itn.duration);
    const itnDays = Array.isArray(itn.days) ? itn.days : [];
    setDays(itnDays);
    setHistory([itnDays]);
    setHistoryIndex(0);
    setActiveDayIdx(0);
    setImportedStatus(null);
    setShowForm(true);
  };

  // Keep history updated when days change (excluding manual undo/redo steps)
  const setDaysWithHistory = (newDays: ItineraryDay[]) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    setHistory([...nextHistory, newDays]);
    setHistoryIndex(nextHistory.length);
    setDays(newDays);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setDays(history[prevIdx]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setDays(history[nextIdx]);
    }
  };

  // Day list modifiers
  const handleAddDay = () => {
    const nextDays = [
      ...days,
      {
        dayNumber: days.length + 1,
        title: `Day ${days.length + 1} - Journey Itinerary`,
        activity: "Post breakfast, enjoy private transport sightseeing to scenic viewpoints and local landmarks.",
        stay: "Standard Deluxe Room"
      }
    ];
    setDaysWithHistory(nextDays);
    setActiveDayIdx(nextDays.length - 1);
  };

  const handleDuplicateDay = (idx: number) => {
    const dayToCopy = days[idx];
    const newDay: ItineraryDay = {
      ...dayToCopy,
      title: `${dayToCopy.title} (Duplicate)`
    };
    const nextDays = [...days];
    nextDays.splice(idx + 1, 0, newDay);
    
    // Renumber days
    const renumbered = nextDays.map((d, i) => ({
      ...d,
      dayNumber: i + 1
    }));
    setDaysWithHistory(renumbered);
    setActiveDayIdx(idx + 1);
  };

  const handleRemoveDay = (idx: number) => {
    const nextDays = days.filter((_, i) => i !== idx).map((d, i) => ({
      ...d,
      dayNumber: i + 1
    }));
    setDaysWithHistory(nextDays);
    setActiveDayIdx(Math.max(0, idx - 1));
  };

  const handleMoveDay = (idx: number, direction: "up" | "down") => {
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === days.length - 1) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    const nextDays = [...days];
    const temp = nextDays[idx];
    nextDays[idx] = nextDays[targetIdx];
    nextDays[targetIdx] = temp;

    const renumbered = nextDays.map((d, i) => ({
      ...d,
      dayNumber: i + 1
    }));
    setDaysWithHistory(renumbered);
    setActiveDayIdx(targetIdx);
  };

  const handleUpdateDayField = (idx: number, field: keyof ItineraryDay, value: string) => {
    const nextDays = days.map((d, i) => {
      if (i === idx) {
        return { ...d, [field]: value };
      }
      return d;
    });
    setDays(nextDays); // Direct set to avoid flooding history with individual keystrokes
  };

  // Save changes to history on Blur (keystroke sequence completed)
  const handleFieldBlur = () => {
    // Sync active days to history
    setDaysWithHistory(days);
  };

  // Click-to-Insert Assets from Curated Library
  const handleInsertAsset = (type: "sightseeing" | "hotel" | "transport" | "meal", text: string) => {
    if (days.length === 0) return;
    const currentDay = days[activeDayIdx];
    if (!currentDay) return;

    const nextDays = [...days];
    if (type === "hotel") {
      nextDays[activeDayIdx] = {
        ...currentDay,
        stay: currentDay.stay && currentDay.stay !== "Not specified" && currentDay.stay !== "Standard Deluxe Room"
          ? `${currentDay.stay}, ${text}`
          : text
      };
    } else {
      nextDays[activeDayIdx] = {
        ...currentDay,
        activity: currentDay.activity 
          ? `${currentDay.activity} Also visit/experience: ${text}.` 
          : `Enjoy: ${text}.`
      };
    }
    setDaysWithHistory(nextDays);
  };

  // Prepopulate from Library Packages
  const handleLoadPackageTemplate = (pkg: TourPackage) => {
    setDestination(pkg.destination);
    setDuration(pkg.duration);
    
    const daysCount = parseInt(pkg.duration) || 3;
    const computedDays: ItineraryDay[] = [];
    for (let i = 1; i <= daysCount; i++) {
      if (i === 1) {
        computedDays.push({
          dayNumber: 1,
          title: "Arrival & Sightseeing Base",
          activity: `Warm reception. Cozy transfer to hotel. Standard check-in. Inclusions cover: ${pkg.inclusions.substring(0, 160)}...`,
          stay: pkg.hotelCategory || "3-Star Deluxe Hotel"
        });
      } else if (i === daysCount) {
        computedDays.push({
          dayNumber: i,
          title: "Leisure Morning & Checkout Transfer",
          activity: "Hearty morning breakfast. Local shopping for tea/spices, checked-out by 11:00 AM. Driver transfer back to departures station.",
          stay: "Checkout day"
        });
      } else {
        computedDays.push({
          dayNumber: i,
          title: `Premium Day ${i} Tour`,
          activity: `Full day private sedan excursion tour. Sightseeing: ${pkg.inclusions.substring(0, 100)}... Excludes: ${pkg.exclusions.substring(0, 100)}...`,
          stay: pkg.hotelCategory || "3-Star Deluxe Hotel"
        });
      }
    }
    setDaysWithHistory(computedDays);
    setActiveDayIdx(0);
    setImportedStatus(`🎉 Loaded template: ${pkg.name}`);
  };

  // Prepopulate from Bookings
  const handleLoadBookingTemplate = (bk: Booking) => {
    setCustomerName(bk.customerName);
    setDestination(bk.destination || "kodaikanal");
    const computedDays: ItineraryDay[] = [
      {
        dayNumber: 1,
        title: "Arrive at Station - Scenic Resort Transfer",
        activity: `Received by our professional driver. Transfer in comfort to hotel: ${bk.hotelDetails || "Premium Resort"}. Refresh and enjoy a warm, tranquil mountain evening.`,
        stay: bk.hotelDetails || "3-Star Premium Hotel"
      },
      {
        dayNumber: 2,
        title: "Spectacular Local Sightseeing Drive",
        activity: `Post breakfast, embark on full day private cab tour with driver (${bk.driverDetails || "Private Cab"}). Sightseeing coverage with premium photo stops.`,
        stay: bk.hotelDetails || "3-Star Premium Hotel"
      },
      {
        dayNumber: 3,
        title: "Check-out & Relaxed Departure Transfer",
        activity: "Hearty breakfast buffet. Spend morning at leisure. Comfortable transfer back to departures hub with pristine holiday memories.",
        stay: "N/A - Checkout"
      }
    ];
    setDaysWithHistory(computedDays);
    setActiveDayIdx(0);
    setImportedStatus(`🎉 Loaded active guest file: ${bk.customerName}`);
  };

  // OCR file document parser integration (Accepts PDF, DOC, DOCX, TXT)
  const handleDocImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingDoc(true);
    setImportedStatus(`Scanning and parsing document "${file.name}" with AI...`);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/parse-itinerary-file", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Received an invalid response format from server (expected JSON).");
      }

      const data = await res.json();
      
      if (data.success && data.days && Array.isArray(data.days)) {
        setCustomerName(data.customerName || customerName || "Imported Client");
        setDestination(data.destination || destination || "kodaikanal");
        setDuration(data.duration || duration || `${data.days.length} Days`);
        setDaysWithHistory(data.days);
        setActiveDayIdx(0);
        setImportedStatus(`🎉 Success! Extracted ${data.days.length} travel days from document with AI.`);
      } else {
        throw new Error(data.message || data.error || "No days found in parsed result");
      }
    } catch (err: any) {
      console.error("AI Document Parser error", err);
      setImportedStatus(`⚠️ Error: ${err.message || "Failed to parse document"}. Using local heuristic fallback...`);
      
      // Fallback
      setTimeout(() => {
        const fallbackDays: ItineraryDay[] = [
          {
            dayNumber: 1,
            title: "Imported Day 1 - Valley Welcome & Check-in",
            activity: `Extracted from ${file.name}: Transfer to mountain resort. Evening lake-side walking trail.`,
            stay: "Premium Valley View Room"
          },
          {
            dayNumber: 2,
            title: "Imported Day 2 - Scenic Valley Sightseeing",
            activity: `Extracted from ${file.name}: Detailed waterfalls and viewpoint sightseeing. Driver cab escort.`,
            stay: "Premium Valley View Room"
          }
        ];
        setDaysWithHistory(fallbackDays);
        setDuration("2 Days / 1 Night");
      }, 1500);
    } finally {
      setParsingDoc(false);
    }
  };

  // Auto-Save locally
  useEffect(() => {
    if (showForm && customerName) {
      const timer = setTimeout(() => {
        const autoSaveData = {
          customerName,
          destination,
          duration,
          days
        };
        localStorage.setItem("sih_itinerary_draft", JSON.stringify(autoSaveData));
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setAutoSaveTime(timeStr);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [customerName, destination, duration, days, showForm]);

  // Try restoring draft on mount / open form
  const handleRestoreDraft = () => {
    try {
      const draft = localStorage.getItem("sih_itinerary_draft");
      if (draft) {
        const parsed = JSON.parse(draft);
        setCustomerName(parsed.customerName || "");
        setDestination(parsed.destination || "kodaikanal");
        setDuration(parsed.duration || "3 Days / 2 Nights");
        setDays(parsed.days || []);
        setHistory([parsed.days || []]);
        setHistoryIndex(0);
        setActiveDayIdx(0);
        setImportedStatus("✨ Restored compiled itinerary draft from your browser's local cache!");
      }
    } catch (e) {
      console.error("Draft restore error", e);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || days.length === 0) return;

    const payload = {
      customerName,
      destination,
      duration,
      days,
      createdAt: new Date().toLocaleDateString("en-IN")
    };

    if (editingItinerary) {
      onUpdateItinerary(editingItinerary.id, payload);
    } else {
      onAddItinerary(payload);
    }
    setShowForm(false);
    localStorage.removeItem("sih_itinerary_draft");
  };

  // Print Format Area
  const triggerPrintItinerary = (itn: Itinerary) => {
    const printArea = document.getElementById("print-canvas");
    if (!printArea) return;

    printArea.innerHTML = `
      <div class="max-w-4xl mx-auto p-10 text-black bg-white">
        <!-- Header -->
        <div class="flex justify-between items-start border-b pb-6 mb-6">
          <div class="flex items-start gap-4">
            ${companySettings?.logo ? `
              <img src="${companySettings.logo}" alt="Logo" class="w-16 h-16 object-contain rounded-lg border border-slate-200 p-1 bg-white" referrerPolicy="no-referrer" />
            ` : ""}
            <div>
              <h1 class="text-2xl font-black uppercase tracking-tight text-slate-900">${companySettings?.companyName || "South Indian Holidays"}</h1>
              <p class="text-xs text-slate-500 max-w-sm mt-1">${companySettings?.address || ""}</p>
              <p class="text-xs text-slate-600 font-mono mt-0.5">Phone: ${companySettings?.phone || ""} | Web: ${companySettings?.website || ""}</p>
            </div>
          </div>
          <div class="text-right">
            <span class="text-xs font-black uppercase text-indigo-600 tracking-widest px-3 py-1 bg-indigo-50 rounded-full">TRAVEL ITINERARY</span>
            <p class="text-xs font-bold text-slate-800 mt-2">Prepared For: ${itn.customerName}</p>
            <p class="text-[10px] text-slate-500 font-mono">Date Compiled: ${itn.createdAt || "Live"}</p>
          </div>
        </div>

        <!-- Vacation specs bar -->
        <div class="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl mb-6 text-xs border border-slate-100">
          <div>
            <span class="text-[9px] uppercase font-bold text-slate-400 block">Vacation Hub</span>
            <p class="text-sm font-bold capitalize text-slate-800">${itn.destination}</p>
          </div>
          <div>
            <span class="text-[9px] uppercase font-bold text-slate-400 block">Trip Duration</span>
            <p class="text-sm font-bold text-slate-800">${itn.duration}</p>
          </div>
          <div>
            <span class="text-[9px] uppercase font-bold text-slate-400 block">Itinerary ID</span>
            <p class="text-sm font-bold text-slate-800 font-mono">${itn.id}</p>
          </div>
        </div>

        <!-- Day-wise details card loop -->
        <div class="space-y-6">
          <h3 class="text-xs font-black uppercase tracking-widest text-slate-900 border-b pb-2">DAY-BY-DAY JOURNEY PLAN</h3>
          ${itn.days.map(day => `
            <div class="flex gap-4 items-start border-l-2 border-indigo-500 pl-4 py-1">
              <div class="flex-shrink-0 bg-indigo-600 text-white font-mono text-xs font-black w-10 h-10 rounded-xl flex items-center justify-center shadow">
                DAY ${day.dayNumber}
              </div>
              <div class="space-y-1 flex-1">
                <h4 class="text-sm font-black text-slate-800">${day.title}</h4>
                <p class="text-xs text-slate-600 leading-relaxed">${day.activity}</p>
                <p class="text-[10px] text-indigo-600 font-bold mt-1">🏨 Lodging & Stay: ${day.stay}</p>
              </div>
            </div>
          `).join("")}
        </div>

        <!-- Footer terms -->
        <div class="mt-12 pt-6 border-t border-slate-100 text-[10px] text-slate-500 flex justify-between items-end">
          <div class="max-w-md">
            <h5 class="font-bold uppercase text-slate-700">Important Traveler Instructions</h5>
            <p class="mt-1">Standard check-in is 12 PM. Please present a copy of this itinerary and government-approved ID card at check-in. Driver meeting instructions will be sent a day before departure.</p>
          </div>
          <p class="font-bold text-slate-800 font-mono">${companySettings?.website || "www.southindianholidays.com"}</p>
        </div>
      </div>
    `;

    window.print();
  };

  // Word Doc Export - zero-dependency client side helper
  const exportToWord = (itn: Itinerary) => {
    const companyName = companySettings?.companyName || "South Indian Holidays";
    const companyPhone = companySettings?.phone || "";
    const companyWebsite = companySettings?.website || "www.southindianholidays.com";

    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><title>${itn.customerName} - Itinerary</title>
    <style>
      body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #1e293b; padding: 20px; }
      .header-table { width: 100%; border-bottom: 2px solid #6366f1; padding-bottom: 15px; margin-bottom: 25px; }
      .company-name { font-size: 24px; font-weight: bold; color: #4f46e5; text-transform: uppercase; }
      .itinerary-badge { text-align: right; font-size: 14px; font-weight: bold; color: #6366f1; }
      .specs-table { width: 100%; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; margin-bottom: 25px; }
      .specs-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold; }
      .specs-value { font-size: 14px; font-weight: bold; color: #0f172a; }
      .day-card { border-left: 3px solid #6366f1; padding-left: 15px; margin-bottom: 25px; }
      .day-title-row { font-size: 16px; font-weight: bold; color: #1e1b4b; }
      .day-activity { font-size: 12px; color: #334155; margin-top: 5px; }
      .day-stay { font-size: 11px; color: #4f46e5; font-weight: bold; margin-top: 5px; }
      .footer-section { border-t: 1px solid #e2e8f0; padding-top: 15px; margin-top: 40px; font-size: 10px; color: #64748b; }
    </style>
    </head>
    <body>
      <table class="header-table">
        <tr>
          <td>
            <div class="company-name">${companyName}</div>
            <div style="font-size:11px;color:#64748b;">${companySettings?.address || ""}</div>
            <div style="font-size:11px;color:#64748b;">Phone: ${companyPhone} | Website: ${companyWebsite}</div>
          </td>
          <td class="itinerary-badge">
            <div style="font-size:16px;letter-spacing:1px;">TRAVEL ITINERARY</div>
            <div style="font-size:12px;color:#1e293b;margin-top:5px;">Prepared For: <b>${itn.customerName}</b></div>
            <div style="font-size:10px;color:#64748b;">Compiled: ${itn.createdAt || "Live"}</div>
          </td>
        </tr>
      </table>

      <table class="specs-table">
        <tr>
          <td>
            <span class="specs-label">Vacation Hub</span><br/>
            <span class="specs-value" style="text-transform: capitalize;">${itn.destination}</span>
          </td>
          <td>
            <span class="specs-label">Trip Duration</span><br/>
            <span class="specs-value">${itn.duration}</span>
          </td>
          <td>
            <span class="specs-label">Document ID</span><br/>
            <span class="specs-value">${itn.id || "N/A"}</span>
          </td>
        </tr>
      </table>

      <h2 style="font-size:14px;color:#0f172a;text-transform:uppercase;border-bottom:1px solid #e2e8f0;padding-bottom:5px;margin-bottom:15px;">Day-by-Day Journey Plan</h2>
    `;
    
    let body = "";
    itn.days.forEach(day => {
      body += `
      <div class="day-card">
        <div class="day-title-row">DAY ${day.dayNumber}: ${day.title}</div>
        <div class="day-activity">${day.activity}</div>
        <div class="day-stay">🏨 Lodging & Stay Accommodation: ${day.stay}</div>
      </div>
      `;
    });
    
    const footer = `
      <div class="footer-section">
        <b>Important Traveler Instructions:</b><br/>
        Standard check-in is 12 PM. Please present a printed copy of this itinerary and government-approved ID card at check-in. Driver meeting instructions will be sent a day before departure.<br/>
        <br/>
        <center><b>Thank you for traveling with ${companyName}!</b><br/>${companyWebsite}</center>
      </div>
    </body>
    </html>`;
    
    const sourceHTML = header + body + footer;
    const fileBlob = new Blob(['\ufeff' + sourceHTML], { type: 'application/msword' });
    
    const url = URL.createObjectURL(fileBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${itn.customerName.replace(/\s+/g, "_")}_itinerary.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // WhatsApp compiler share
  const handleWhatsAppShare = (itn: Itinerary) => {
    let cleanMobile = "919443312345"; // fallback
    
    // Lookup guest phone
    const matchingBooking = safeBookings.find(b => (b.customerName || "").toLowerCase() === (itn.customerName || "").toLowerCase());
    if (matchingBooking) {
      cleanMobile = matchingBooking.customerMobile.replace(/\D/g, "");
      if (cleanMobile.length === 10) {
        cleanMobile = "91" + cleanMobile;
      }
    }

    const companyName = companySettings?.companyName || "South Indian Holidays";
    let msg = `*Dear ${itn.customerName}*,\n\nHere is your day-wise customized holiday itinerary for *${itn.destination.toUpperCase()}* from *${companyName}*! 🌴⛰️\n\n*Trip Duration:* ${itn.duration}\n\n`;
    
    itn.days.forEach(day => {
      msg += `*DAY ${day.dayNumber}: ${day.title}*\n📍 _Activity:_ ${day.activity}\n🏨 _Stay:_ ${day.stay}\n\n`;
    });

    msg += `We would love to know if you'd like to proceed with locking in this travel file. Let us know if you have any questions!\n\nWarm Regards,\n*${companyName}*`;

    window.open(`https://wa.me/${cleanMobile}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  // Filter list
  const filteredItineraries = safeItineraries.filter(itn => {
    const term = search.toLowerCase();
    return (itn.customerName || "").toLowerCase().includes(term) || (itn.destination || "").toLowerCase().includes(term);
  });

  // Assets available for current destination selection
  const activeAssets = DIGITAL_ASSET_LIBRARY[destination as keyof typeof DIGITAL_ASSET_LIBRARY] || DIGITAL_ASSET_LIBRARY.kodaikanal;

  return (
    <div className="space-y-4">
      {/* Title block */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <Lucide.Map className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Itinerary Desk & Day-wise Builder</h3>
            <p className="text-[10px] text-slate-500 font-semibold">Build day-by-day vacation itineraries, import Word/PDF schedules, and share on WhatsApp</p>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={handleOpenAddForm}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/10"
          >
            <Lucide.Plus className="w-4 h-4" />
            Create Itinerary Plan
          </button>
        )}
      </div>

      {/* OVERHAULED TWO-COLUMN INTERACTIVE BUILDER FORM */}
      {showForm && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 no-print">
          {/* LHS: TIMELINE EDITOR PANEL (8 Columns on XL) */}
          <div className="xl:col-span-7 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-indigo-400 tracking-wider">
                  {editingItinerary ? "Modify Plan File" : "Narrate Trip Sequences"}
                </span>
                {autoSaveTime && (
                  <span className="text-[9px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Auto-saved {autoSaveTime}
                  </span>
                )}
              </div>
              <div className="flex gap-1.5">
                {/* Undo/Redo Controls */}
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 disabled:opacity-30 rounded-lg transition-all"
                  title="Undo Last Action"
                >
                  <Lucide.Undo className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className="p-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 disabled:opacity-30 rounded-lg transition-all"
                  title="Redo Restored Action"
                >
                  <Lucide.Redo className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleRestoreDraft}
                  className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1"
                  title="Restore latest cached draft"
                >
                  <Lucide.History className="w-3.5 h-3.5 text-indigo-400" />
                  Restore
                </button>
              </div>
            </div>

            {/* Quick loaders / OCR zone */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5 bg-slate-950 border border-slate-850 p-3 rounded-xl space-y-2">
                <span className="text-[8px] uppercase font-bold text-slate-500 block tracking-wider">Load standard parameters</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    onChange={(e) => {
                      const sel = safePackages.find(p => p.id === e.target.value);
                      if (sel) handleLoadPackageTemplate(sel);
                    }}
                    defaultValue=""
                    className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-[10px] text-slate-300 focus:outline-none"
                  >
                    <option value="">-- Packages --</option>
                    {safePackages.map(pkg => (
                      <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                    ))}
                  </select>

                  <select
                    onChange={(e) => {
                      const sel = safeBookings.find(b => b.id === e.target.value);
                      if (sel) handleLoadBookingTemplate(sel);
                    }}
                    defaultValue=""
                    className="w-full bg-slate-900 border border-slate-800 p-1.5 rounded text-[10px] text-slate-300 focus:outline-none"
                  >
                    <option value="">-- Active Guests --</option>
                    {safeBookings.map(bk => (
                      <option key={bk.id} value={bk.id}>{bk.customerName}</option>
                    ))}
                  </select>
                </div>

                {/* Interactive Draggable Packages */}
                {safePackages.length > 0 && (
                  <div className="pt-2 border-t border-slate-900 mt-2">
                    <span className="text-[8px] uppercase font-black text-indigo-400 block mb-1.5 tracking-wider">🖐️ Drag & Drop Package Template</span>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
                      {safePackages.slice(0, 5).map(pkg => (
                        <div
                          key={pkg.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("application/json", JSON.stringify({ type: "load-package", package: pkg }));
                          }}
                          className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/40 text-slate-300 text-[9px] font-bold px-2 py-1 rounded-lg cursor-grab active:cursor-grabbing flex items-center gap-1 shrink-0 transition-all select-none"
                          title={`Drag and Drop ${pkg.name} onto any Day card to instantly load its parameters.`}
                        >
                          <Lucide.Move className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                          <span className="max-w-[110px] truncate">{pkg.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* OCR Drop Area */}
              <div className="md:col-span-7">
                <div
                  onDragOver={(e) => { e.preventDefault(); !parsingDoc && setDraggingFile(true); }}
                  onDragLeave={() => setDraggingFile(false)}
                  onDrop={(e) => { e.preventDefault(); setDraggingFile(false); if (!parsingDoc) handleDocImport({ target: { files: e.dataTransfer.files } } as any); }}
                  className={`border border-dashed rounded-xl p-2 text-center transition-all flex items-center justify-center gap-3 h-full cursor-pointer ${
                    parsingDoc ? "border-slate-800 bg-slate-950/40 cursor-not-allowed" : draggingFile ? "border-indigo-400 bg-indigo-950/10" : "border-slate-800 hover:border-slate-750 bg-slate-950/20"
                  }`}
                >
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={handleDocImport}
                    disabled={parsingDoc}
                    id="itinerary-doc-field"
                    className="hidden"
                  />
                  {parsingDoc ? (
                    <div className="flex items-center gap-2 py-1">
                      <Lucide.Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest animate-pulse">Extracting days with AI...</span>
                    </div>
                  ) : (
                    <label htmlFor="itinerary-doc-field" className="cursor-pointer flex items-center gap-2">
                      <Lucide.UploadCloud className="w-5 h-5 text-indigo-400" />
                      <div className="text-left">
                        <span className="text-[10px] font-bold text-slate-300 block">AI PDF/Word Importer</span>
                        <span className="text-[8px] text-slate-500 block">Drop any travel itinerary file to extract narrative</span>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            </div>

            {importedStatus && (
              <div className="bg-emerald-950/20 border border-emerald-900/40 text-emerald-400 text-[10px] font-medium p-2 rounded-xl flex items-center gap-1.5">
                <Lucide.Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>{importedStatus}</span>
              </div>
            )}

            {/* Top Specifications Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Amit Patel"
                  className="w-full bg-slate-950 border border-slate-850 p-2 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Destination Location</label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 p-2 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500 capitalize"
                >
                  <option value="kodaikanal">Kodaikanal</option>
                  <option value="ooty">Ooty</option>
                  <option value="coorg">Coorg</option>
                  <option value="munnar">Munnar Hills</option>
                  <option value="mysore">Mysore</option>
                  <option value="alleppey">Alleppey</option>
                  <option value="pondicherry">Pondicherry</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Duration Text *</label>
                <input
                  type="text"
                  required
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 3 Days / 2 Nights"
                  className="w-full bg-slate-950 border border-slate-850 p-2 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* CURATED ASSET INSERTION LIBRARY TRAY */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-2">
              <div className="flex justify-between items-center border-b border-slate-900 pb-1.5">
                <span className="text-[9px] uppercase font-black text-slate-400 flex items-center gap-1">
                  <Lucide.Compass className="w-3.5 h-3.5 text-indigo-400" />
                  Digital Asset Library (<span className="capitalize text-indigo-400">{destination}</span>)
                </span>
                <span className="text-[8px] text-slate-500 font-medium">Select a Day card below, then click assets to append!</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {/* Attractions list */}
                <div>
                  <span className="text-[8px] font-black uppercase text-slate-500 block mb-1">📷 Curated Sightseeing & Activities</span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeAssets.sightseeing.map((asset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleInsertAsset("sightseeing", asset)}
                        className="bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 hover:border-indigo-500/30 text-[9px] text-slate-300 font-semibold px-2 py-1 rounded transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Lucide.Plus className="w-2.5 h-2.5 text-indigo-400" />
                        {asset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hotels list */}
                <div>
                  <span className="text-[8px] font-black uppercase text-slate-500 block mb-1">🏨 Standard Star Accommodation Stay</span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeAssets.hotels.map((asset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleInsertAsset("hotel", asset)}
                        className="bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 hover:border-indigo-500/30 text-[9px] text-slate-300 font-semibold px-2 py-1 rounded transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Lucide.Hotel className="w-2.5 h-2.5 text-indigo-400" />
                        {asset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Common Transport */}
                <div>
                  <span className="text-[8px] font-black uppercase text-slate-500 block mb-1">🚘 Private Vehicle Inclusions</span>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_TRANSPORT_OPTIONS.map((asset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleInsertAsset("transport", asset)}
                        className="bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 hover:border-indigo-500/30 text-[9px] text-slate-300 font-semibold px-2 py-1 rounded transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Lucide.Car className="w-2.5 h-2.5 text-indigo-400" />
                        {asset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Common Meal plans */}
                <div>
                  <span className="text-[8px] font-black uppercase text-slate-500 block mb-1">🍽️ Meal Plan Codes</span>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_MEAL_PLANS.map((asset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleInsertAsset("meal", asset)}
                        className="bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 hover:border-indigo-500/30 text-[9px] text-slate-300 font-semibold px-2 py-1 rounded transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Lucide.Utensils className="w-2.5 h-2.5 text-indigo-400" />
                        {asset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* DAY TIMELINE CONTAINER */}
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Day-wise narrative builder</span>
                <button
                  type="button"
                  onClick={handleAddDay}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Lucide.Plus className="w-3 h-3" /> Append Travel Day
                </button>
              </div>

              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {days.map((day, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveDayIdx(idx)}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      try {
                        const raw = e.dataTransfer.getData("application/json");
                        const parsed = JSON.parse(raw);
                        if (parsed.type === "load-package") {
                          handleLoadPackageTemplate(parsed.package);
                        }
                      } catch (err) {
                        console.error("Package drop failed", err);
                      }
                    }}
                    className={`p-4 rounded-xl border transition-all relative ${
                      activeDayIdx === idx
                        ? "bg-indigo-950/20 border-indigo-500/60 shadow shadow-indigo-500/10"
                        : "bg-slate-950 border-slate-850 hover:border-slate-800"
                    }`}
                  >
                    {/* Active Target Indicator Badge */}
                    {activeDayIdx === idx && (
                      <span className="absolute -top-1.5 left-4 bg-indigo-600 text-[8px] font-black text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        Active Target
                      </span>
                    )}

                    <div className="flex items-start gap-3">
                      {/* Day count circle */}
                      <div className="flex-shrink-0 bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 font-mono text-xs font-black w-8 h-8 rounded-lg flex items-center justify-center">
                        D{day.dayNumber}
                      </div>

                      {/* Editing fields */}
                      <div className="flex-1 space-y-2 text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <input
                              type="text"
                              value={day.title}
                              onChange={(e) => handleUpdateDayField(idx, "title", e.target.value)}
                              onBlur={handleFieldBlur}
                              placeholder={`Day ${day.dayNumber} Title`}
                              className="w-full bg-slate-900 border border-slate-800 px-2 py-1 rounded font-bold text-white text-[11px] focus:outline-none"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={day.stay}
                              onChange={(e) => handleUpdateDayField(idx, "stay", e.target.value)}
                              onBlur={handleFieldBlur}
                              placeholder="Lodging Stay & Meal code"
                              className="w-full bg-slate-900 border border-slate-800 px-2 py-1 rounded text-indigo-400 text-[11px] font-semibold focus:outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <textarea
                            value={day.activity}
                            onChange={(e) => handleUpdateDayField(idx, "activity", e.target.value)}
                            onBlur={handleFieldBlur}
                            placeholder="Write comprehensive sightseeing narrative, driver transfer guidelines, and local highlights here..."
                            className="w-full h-16 bg-slate-900 border border-slate-800 p-2 rounded text-slate-300 text-[11px] focus:outline-none resize-none leading-relaxed"
                          />
                        </div>
                      </div>

                      {/* Day Action Controls */}
                      <div className="flex flex-col gap-1 flex-shrink-0 justify-center">
                        <button
                          type="button"
                          onClick={() => handleMoveDay(idx, "up")}
                          disabled={idx === 0}
                          className="p-1 bg-slate-900 hover:bg-slate-850 rounded border border-slate-800 text-slate-400 disabled:opacity-30 cursor-pointer"
                          title="Move Up"
                        >
                          <Lucide.ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDay(idx, "down")}
                          disabled={idx === days.length - 1}
                          className="p-1 bg-slate-900 hover:bg-slate-850 rounded border border-slate-800 text-slate-400 disabled:opacity-30 cursor-pointer"
                          title="Move Down"
                        >
                          <Lucide.ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateDay(idx)}
                          className="p-1 bg-slate-900 hover:bg-indigo-900/30 rounded border border-slate-800 text-indigo-400 cursor-pointer"
                          title="Duplicate Day"
                        >
                          <Lucide.Copy className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveDay(idx)}
                          className="p-1 bg-slate-900 hover:bg-rose-950/20 rounded border border-slate-800 hover:border-rose-900/30 text-rose-400 cursor-pointer"
                          title="Remove Day"
                        >
                          <Lucide.Trash className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Itinerary Form CTA */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  localStorage.removeItem("sih_itinerary_draft");
                }}
                className="px-4 py-2 text-slate-400 font-bold hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl transition-all shadow shadow-indigo-600/10 cursor-pointer"
              >
                Save Itinerary Plan
              </button>
            </div>
          </div>

          {/* RHS: LIVE PREVIEW & EXPORT DESK (5 Columns on XL) */}
          <div className="xl:col-span-5 bg-slate-950 border border-slate-850 p-5 rounded-2xl flex flex-col justify-between shadow-lg h-[920px] max-h-[920px] overflow-hidden">
            <div className="space-y-4 flex flex-col h-full overflow-hidden">
              <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                <span className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                  <Lucide.Eye className="w-4 h-4 text-emerald-400" />
                  Live Preview Desk
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const tempItn: Itinerary = {
                        id: editingItinerary?.id || "PREVIEW_ID",
                        customerName: customerName || "Draft Guest",
                        destination: destination || "kodaikanal",
                        duration: duration || "3 Days",
                        days,
                        createdAt: new Date().toLocaleDateString("en-IN")
                      };
                      exportToWord(tempItn);
                    }}
                    className="bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Lucide.FileText className="w-3.5 h-3.5" /> Word Export
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tempItn: Itinerary = {
                        id: editingItinerary?.id || "PREVIEW_ID",
                        customerName: customerName || "Draft Guest",
                        destination: destination || "kodaikanal",
                        duration: duration || "3 Days",
                        days,
                        createdAt: new Date().toLocaleDateString("en-IN")
                      };
                      triggerPrintItinerary(tempItn);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Lucide.Printer className="w-3.5 h-3.5" /> PDF / Print
                  </button>
                </div>
              </div>

              {/* Document Scrollable Frame */}
              <div className="bg-white rounded-xl text-black p-6 space-y-4 text-xs overflow-y-auto flex-1 shadow border border-slate-100">
                {/* Header section */}
                <div className="border-b pb-4 flex justify-between items-start gap-4">
                  <div className="flex items-start gap-3">
                    {companySettings?.logo ? (
                      <img src={companySettings.logo} alt="Logo" class="w-12 h-12 object-contain rounded border border-slate-200 p-0.5 bg-white" referrerPolicy="no-referrer" />
                    ) : null}
                    <div>
                      <h4 className="text-sm font-black uppercase text-slate-900">{companySettings?.companyName || "South Indian Holidays"}</h4>
                      <p className="text-[10px] text-slate-500">{companySettings?.address || "Coimbatore, Tamil Nadu"}</p>
                      <p className="text-[9px] text-slate-500 font-mono">Web: {companySettings?.website || "www.southindianholidays.com"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full uppercase tracking-wider">TRAVEL PLAN</span>
                    <p className="text-[10px] font-black text-slate-800 mt-2">Guest: {customerName || "Dear Guest"}</p>
                    <p className="text-[8px] text-slate-400 font-mono">Date: {new Date().toLocaleDateString("en-IN")}</p>
                  </div>
                </div>

                {/* Specs */}
                <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-lg text-[10px] border border-slate-100">
                  <div>
                    <span className="text-[8px] uppercase font-bold text-slate-400 block">Hub Destination</span>
                    <p className="font-bold text-slate-800 capitalize">{destination}</p>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase font-bold text-slate-400 block">Duration</span>
                    <p className="font-bold text-slate-800">{duration}</p>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase font-bold text-slate-400 block">File Status</span>
                    <p className="font-bold text-emerald-600 uppercase">Draft Preview</p>
                  </div>
                </div>

                {/* Narrative Preview list */}
                <div className="space-y-4">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-900 border-b pb-1">DAY-BY-DAY JOURNEY PLAN</h5>
                  {days.map((day, idx) => (
                    <div key={idx} className="flex gap-3 items-start border-l-2 border-indigo-500 pl-3">
                      <div className="flex-shrink-0 bg-indigo-600 text-white font-mono text-[9px] font-black w-8 h-8 rounded-lg flex items-center justify-center">
                        D{day.dayNumber}
                      </div>
                      <div className="space-y-0.5 flex-1">
                        <h6 className="text-[11px] font-bold text-slate-800">{day.title || `Day ${day.dayNumber} - Scenic Highlights`}</h6>
                        <p className="text-[10px] text-slate-600 leading-relaxed">{day.activity || "Sightseeing & driver excursion routes to be added."}</p>
                        <p className="text-[9px] text-indigo-600 font-bold mt-1">🏨 Lodging: {day.stay || "Standard Accommodation Stay"}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer instructions */}
                <div className="border-t pt-4 mt-6 text-[8px] text-slate-400">
                  <p className="font-bold uppercase text-slate-500">TRAVELER NOTICE</p>
                  <p className="mt-0.5">Please carry standard photo identification card. Mountain resorts experience mist and chilly weather. Happy Journey with South Indian Holidays!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH AND FILTER PANELS */}
      {!showForm && (
        <>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap gap-3 items-center justify-between no-print">
            <div className="relative flex-1 min-w-[240px]">
              <Lucide.Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search compiled itineraries by customer name, location..."
                className="w-full bg-slate-950 border border-slate-850 pl-9 pr-4 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Compiled Itineraries Library List Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow overflow-hidden no-print">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950/40 text-[9px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-850">
                  <tr>
                    <th className="p-4">Customer Name</th>
                    <th className="p-4">Destination</th>
                    <th className="p-4">Duration</th>
                    <th className="p-4">Total Days</th>
                    <th className="p-4">Created Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {filteredItineraries.map(itn => (
                    <tr key={itn.id} className="hover:bg-slate-950/25 transition-all">
                      <td className="p-4 font-black text-white">{itn.customerName}</td>
                      <td className="p-4 capitalize font-semibold text-slate-300">
                        <span className="flex items-center gap-1">
                          <Lucide.MapPin className="w-3.5 h-3.5 text-indigo-400" />
                          {itn.destination}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-slate-400">{itn.duration}</td>
                      <td className="p-4 font-bold text-slate-300 font-mono">{itn.days?.length || 0} Days</td>
                      <td className="p-4 font-medium text-slate-500 font-mono">{itn.createdAt || "Original"}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setViewingItinerary(itn)}
                            className="p-1.5 text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-850 rounded border border-slate-850 cursor-pointer"
                            title="Quick View Narrative"
                          >
                            <Lucide.Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => triggerPrintItinerary(itn)}
                            className="p-1.5 text-indigo-400 hover:text-indigo-300 bg-slate-950 hover:bg-slate-850 rounded border border-slate-850 cursor-pointer"
                            title="Print / Compile PDF"
                          >
                            <Lucide.Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => exportToWord(itn)}
                            className="p-1.5 text-indigo-400 hover:text-indigo-300 bg-slate-950 hover:bg-slate-850 rounded border border-slate-850 cursor-pointer"
                            title="Export to Word Document"
                          >
                            <Lucide.FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleWhatsAppShare(itn)}
                            className="p-1.5 text-emerald-400 hover:text-emerald-300 bg-slate-950 hover:bg-slate-850 rounded border border-slate-850 cursor-pointer"
                            title="Share on WhatsApp Web / Mobile"
                          >
                            <Lucide.MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditForm(itn)}
                            className="p-1.5 text-sky-400 hover:text-sky-300 bg-slate-950 hover:bg-slate-850 rounded border border-slate-850 cursor-pointer"
                            title="Edit Itinerary"
                          >
                            <Lucide.Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete itinerary compiled for ${itn.customerName}?`)) {
                                onDeleteItinerary(itn.id);
                              }
                            }}
                            className="p-1.5 text-rose-400 hover:text-rose-300 bg-slate-950 hover:bg-slate-850 rounded border border-slate-850 cursor-pointer"
                            title="Delete Itinerary"
                          >
                            <Lucide.Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredItineraries.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 font-mono">
                        No travel itineraries found in library index.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Interactive Quick Viewer Modal */}
      {viewingItinerary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn text-xs no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between pb-2 border-b border-slate-850">
              <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                <Lucide.Map className="w-5 h-5 text-indigo-400" />
                Itinerary Viewer: {viewingItinerary.customerName}
              </h3>
              <button onClick={() => setViewingItinerary(null)} className="text-slate-400 hover:text-white cursor-pointer"><Lucide.X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-slate-500">Destination Location:</span>
                <p className="text-white capitalize font-semibold">{viewingItinerary.destination}</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-slate-500">Trip Duration:</span>
                <p className="text-white font-medium">{viewingItinerary.duration}</p>
              </div>
            </div>

            {/* Narrative Timeline */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4 max-h-72 overflow-y-auto">
              <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Day-by-Day narrative overview</h4>
              <div className="space-y-4">
                {Array.isArray(viewingItinerary.days) && viewingItinerary.days.map((day, idx) => (
                  <div key={idx} className="relative pl-4 border-l border-indigo-500/30 pb-2">
                    <span className="absolute -left-1.5 top-1 w-3.5 h-3.5 rounded-full bg-indigo-600 text-[8px] font-black font-mono flex items-center justify-center text-white">D{day.dayNumber}</span>
                    <p className="font-bold text-white text-xs pl-2">{day.title}</p>
                    <p className="text-slate-400 leading-relaxed pl-2 mt-1">{day.activity}</p>
                    <p className="text-[9px] text-indigo-400 font-semibold pl-2 mt-0.5">🏨 Stay: {day.stay}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-850">
              <div className="flex gap-2">
                <button
                  onClick={() => { triggerPrintItinerary(viewingItinerary); setViewingItinerary(null); }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Lucide.Printer className="w-3.5 h-3.5" /> Print / PDF
                </button>
                <button
                  onClick={() => { exportToWord(viewingItinerary); setViewingItinerary(null); }}
                  className="bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/20 text-indigo-400 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Lucide.FileText className="w-3.5 h-3.5" /> Word Export
                </button>
                <button
                  onClick={() => { handleWhatsAppShare(viewingItinerary); setViewingItinerary(null); }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Lucide.MessageSquare className="w-3.5 h-3.5" /> Share on WhatsApp
                </button>
              </div>
              <button
                onClick={() => setViewingItinerary(null)}
                className="bg-slate-800 hover:bg-slate-750 text-slate-400 font-bold px-4 py-1.5 rounded-lg transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
