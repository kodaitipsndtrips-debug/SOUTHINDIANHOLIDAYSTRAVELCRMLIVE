import { useState, DragEvent, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, MapPin, Clock, Edit3, Trash2, Plus, Check, Copy, Download, 
  Sparkles, AlertTriangle, Upload, FileCode, CheckCircle2, 
  RefreshCw, Info, FileText, ChevronRight
} from 'lucide-react';
import { Lead, DayWiseItinerary, DayItinerary } from '../types';

interface ItineraryDeskProps {
  leads: Lead[];
  addLog: (msg: string, type: 'info' | 'success' | 'error') => void;
}

export function localHeuristicParseItinerary(text: string): { title: string; destination: string; duration: string; price: number; days: DayItinerary[] } {
  const lines = text.split("\n");
  const days: DayItinerary[] = [];
  let currentDay: DayItinerary | null = null;
  let title = "Customized Holiday Package";
  let destination = "South India Tour";
  let duration = "4 Nights / 5 Days";
  let price = 0;

  // Try to find a title from the first few non-empty lines
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();
    if (line && !line.toLowerCase().startsWith("day") && line.length > 8 && line.length < 80) {
      title = line;
      break;
    }
  }

  // Look for destination keywords in the text
  const destKeywords = ["munnar", "alleppey", "wayanad", "ooty", "kodaikanal", "thekkady", "varkala", "kochi", "kerala", "tamil nadu"];
  const foundDests: string[] = [];
  destKeywords.forEach(keyword => {
    if (text.toLowerCase().includes(keyword)) {
      const formatted = keyword.charAt(0).toUpperCase() + keyword.slice(1);
      if (!foundDests.includes(formatted)) foundDests.push(formatted);
    }
  });
  if (foundDests.length > 0) {
    destination = foundDests.join(", ");
  }

  // Try to find pricing hints (e.g. ₹35,000 or 35000 INR)
  const priceMatch = text.match(/(?:₹|rs\.?|inr)\s*(\d{1,3}(?:,\d{3})+|\d{4,6})/i);
  if (priceMatch) {
    const rawPrice = priceMatch[1].replace(/,/g, '');
    price = parseInt(rawPrice) || 0;
  }

  // Match "Day X", "Day 0X", "Day X:", etc.
  const dayRegex = /^\s*day\s*(\d+)[:.-]?\s*(.*)/i;
  let dayCounter = 1;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(dayRegex);
    if (match) {
      if (currentDay) {
        days.push(currentDay);
      }
      const dayNum = parseInt(match[1]) || dayCounter;
      const dayTitle = match[2].trim() || "Sightseeing and Leisure Tour";
      currentDay = {
        dayNumber: dayNum,
        title: dayTitle,
        activities: "",
        stay: "Recommended 3-Star Resort",
        meals: "Breakfast Only"
      };
      dayCounter = dayNum + 1;
    } else {
      if (currentDay) {
        currentDay.activities += (currentDay.activities ? "\n" : "") + trimmed;
      }
    }
  }

  if (currentDay) {
    days.push(currentDay);
  }

  // If no "Day X" blocks are detected, split the text block by paragraphs
  if (days.length === 0) {
    const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    if (paragraphs.length > 0) {
      paragraphs.slice(0, 8).forEach((para, index) => {
        const sentences = para.split(/[.!?]/);
        const firstSentence = sentences[0] ? sentences[0].trim() : "";
        const dayTitle = (firstSentence.length > 5 && firstSentence.length < 50) 
          ? firstSentence 
          : `Explore and Experience - Part ${index + 1}`;
        
        const activities = sentences.slice(1).join(".").trim() || para;
        
        days.push({
          dayNumber: index + 1,
          title: dayTitle,
          activities: activities || "Sightseeing and exploring beautiful local attractions at your own pace.",
          stay: "Recommended Heritage Hotel",
          meals: "Breakfast Only"
        });
      });
    }
  }

  // Fallback to standard days if still empty
  if (days.length === 0) {
    days.push({
      dayNumber: 1,
      title: "Arrival and Sightseeing Transfer",
      activities: text || "Arrive at your destination, check in to your resort, and enjoy local sight seeing activities in the afternoon.",
      stay: "Premium Resort Stay",
      meals: "Breakfast Only"
    });
  }

  // Adjust duration string based on final day count
  const totalDays = days.length;
  if (totalDays > 1) {
    duration = `${totalDays - 1} Nights / ${totalDays} Days`;
  } else {
    duration = "1 Day Trip";
  }

  return { title, destination, duration, price, days };
}

export default function ItineraryDesk({ leads, addLog }: ItineraryDeskProps) {
  const [inputText, setInputText] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [parsedItinerary, setParsedItinerary] = useState<DayWiseItinerary | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{
    base64: string;
    name: string;
    mimeType: string;
  } | null>(null);
  
  // Notice Banner states
  const [notice, setNotice] = useState<{ type: 'success' | 'warning' | 'error'; msg: string } | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Helper to determine MimeType from file name
  const getMimeFromName = (name: string): string => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'doc': return 'application/msword';
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'webp': return 'image/webp';
      case 'gif': return 'image/gif';
      case 'txt': return 'text/plain';
      case 'json': return 'application/json';
      default: return 'application/octet-stream';
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      readFile(file);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      readFile(e.target.files[0]);
    }
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && event.target.result) {
        const resultString = event.target.result as string;
        
        const isPlainText = file.type.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".json");
        
        if (isPlainText) {
          const textReader = new FileReader();
          textReader.onload = (e) => {
            if (e.target && typeof e.target.result === 'string') {
              setInputText(e.target.result);
            }
          };
          textReader.readAsText(file);
        } else {
          setInputText(`[Attached Itinerary File: ${file.name}] Size: ${(file.size / 1024).toFixed(1)} KB. Ready to build!`);
        }

        setUploadedFile({
          base64: resultString,
          name: file.name,
          mimeType: file.type || getMimeFromName(file.name)
        });

        setNotice({
          type: 'success',
          msg: `Successfully loaded file "${file.name}" (${(file.size / 1024).toFixed(1)} KB). Ready to build with AI!`
        });
        addLog(`[Itinerary Desk] Loaded itinerary file "${file.name}"`, 'info');
      }
    };
    reader.onerror = () => {
      setNotice({ type: 'error', msg: 'Failed to read the selected file.' });
    };
    reader.readAsDataURL(file);
  };

  // Triggers API parser or fallback
  const handleParseItinerary = async () => {
    if (!inputText.trim() && !uploadedFile) return;
    setIsParsing(true);
    setNotice(null);

    // Try server-side AI parsing first
    try {
      const payload: any = {};
      if (uploadedFile) {
        payload.fileBase64 = uploadedFile.base64;
        payload.fileName = uploadedFile.name;
        payload.mimeType = uploadedFile.mimeType;
      } else {
        payload.text = inputText;
      }

      const response = await fetch('/api/parse-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        const payload = result.data;
        const newItinerary: DayWiseItinerary = {
          id: `IT-${Date.now().toString().slice(-6)}`,
          leadId: selectedLeadId || undefined,
          title: payload.title || 'South Indian Holiday Package',
          destination: payload.destination || 'Kerala/Tamil Nadu',
          duration: payload.duration || '4 Nights / 5 Days',
          price: payload.price || 0,
          days: payload.days.map((d: any) => ({
            dayNumber: d.dayNumber,
            title: d.title,
            activities: d.activities,
            stay: d.stay || 'Standard Resort',
            meals: d.meals || 'Breakfast Only'
          })),
          createdDate: new Date().toLocaleDateString('en-CA'),
        };

        setParsedItinerary(newItinerary);
        setNotice({
          type: 'success',
          msg: 'AI Extraction Complete! Your travel plan has been beautifully mapped day-by-day.'
        });
        addLog(`[Itinerary Desk] Successfully parsed itinerary using AI: "${newItinerary.title}"`, 'success');
      } else {
        throw new Error(result.error || 'Parsing failed on server');
      }

    } catch (error: any) {
      console.warn("Itinerary AI Parse Request Failed. Initiating Local Heuristic Fallback Engine:", error);
      
      // Execute the robust local heuristic client-side fallback
      const fallbackText = uploadedFile ? `File: ${uploadedFile.name}. Offline parsing not supported for binary documents. Please copy-paste itinerary text for offline compilation.` : inputText;
      const fallbackPayload = localHeuristicParseItinerary(fallbackText);
      const fallbackItinerary: DayWiseItinerary = {
        id: `IT-HEUR-${Date.now().toString().slice(-4)}`,
        leadId: selectedLeadId || undefined,
        title: fallbackPayload.title,
        destination: fallbackPayload.destination,
        duration: fallbackPayload.duration,
        price: fallbackPayload.price,
        days: fallbackPayload.days,
        createdDate: new Date().toLocaleDateString('en-CA'),
      };

      setParsedItinerary(fallbackItinerary);

      let detailedMsg = `Operating with offline heuristic fallback. Day-wise itinerary compiled locally.`;
      if (error.message) {
        try {
          const parsedErr = JSON.parse(error.message);
          if (parsedErr.error?.message) {
            detailedMsg = `AI Service Unavailable: ${parsedErr.error.message}. Operating with offline heuristic fallback.`;
          } else {
            detailedMsg = `AI Service Error: ${error.message}. Operating with offline heuristic fallback.`;
          }
        } catch {
          detailedMsg = `AI Service Error: ${error.message}. Operating with offline heuristic fallback.`;
        }
      }

      setNotice({
        type: 'warning',
        msg: detailedMsg
      });
      addLog(`[Itinerary Desk] AI parser returned error, executed robust client-side heuristic fallback instead`, 'error');
    } finally {
      setIsParsing(false);
    }
  };

  // Edit itinerary properties
  const updateItineraryField = (field: keyof DayWiseItinerary, value: any) => {
    if (!parsedItinerary) return;
    setParsedItinerary({
      ...parsedItinerary,
      [field]: value
    });
  };

  // Edit day fields
  const updateDayField = (index: number, field: keyof DayItinerary, value: any) => {
    if (!parsedItinerary) return;
    const updatedDays = [...parsedItinerary.days];
    updatedDays[index] = {
      ...updatedDays[index],
      [field]: value
    };
    
    // Auto-recalculate duration if day count is changed
    let duration = parsedItinerary.duration;
    if (field === 'dayNumber' || field === 'title') {
      // no change to day count
    }

    setParsedItinerary({
      ...parsedItinerary,
      days: updatedDays
    });
  };

  const addDay = () => {
    if (!parsedItinerary) return;
    const nextDayNum = parsedItinerary.days.length + 1;
    const newDay: DayItinerary = {
      dayNumber: nextDayNum,
      title: `Sightseeing & Adventure Tour - Part ${nextDayNum}`,
      activities: 'Enjoy delicious local food and explore scenic spots under guidance.',
      stay: 'Recommended 3-Star Resort',
      meals: 'Breakfast Only'
    };
    
    const updatedDays = [...parsedItinerary.days, newDay];
    const updatedDuration = `${updatedDays.length - 1} Nights / ${updatedDays.length} Days`;
    
    setParsedItinerary({
      ...parsedItinerary,
      duration: updatedDuration,
      days: updatedDays
    });
    addLog(`[Itinerary Desk] Added Day ${nextDayNum} to the travel plan`, 'info');
  };

  const deleteDay = (index: number) => {
    if (!parsedItinerary) return;
    const updatedDays = parsedItinerary.days.filter((_, i) => i !== index).map((d, idx) => ({
      ...d,
      dayNumber: idx + 1 // Re-normalize day numbers
    }));
    
    const updatedDuration = updatedDays.length > 1 
      ? `${updatedDays.length - 1} Nights / ${updatedDays.length} Days`
      : '1 Day Trip';

    setParsedItinerary({
      ...parsedItinerary,
      duration: updatedDuration,
      days: updatedDays
    });
    addLog(`[Itinerary Desk] Removed day from the travel plan`, 'info');
  };

  // Copy parsed itinerary as a gorgeous text proposal
  const handleCopyToClipboard = () => {
    if (!parsedItinerary) return;

    let textBlock = `=========================================\n`;
    textBlock += `🌴 HOLIDAY PROPOSAL: ${parsedItinerary.title.toUpperCase()} 🌴\n`;
    textBlock += `=========================================\n`;
    textBlock += `📍 Destination: ${parsedItinerary.destination}\n`;
    textBlock += `⏱️ Duration: ${parsedItinerary.duration}\n`;
    if (parsedItinerary.price && parsedItinerary.price > 0) {
      textBlock += `💰 Budget/Price Estimate: ₹${parsedItinerary.price.toLocaleString('en-IN')}\n`;
    }
    textBlock += `📅 Created Date: ${parsedItinerary.createdDate}\n\n`;
    textBlock += `-----------------------------------------\n`;
    textBlock += `Detailed Day-Wise Plan:\n`;
    textBlock += `-----------------------------------------\n\n`;

    parsedItinerary.days.forEach(day => {
      textBlock += `🗓️ DAY ${day.dayNumber}: ${day.title}\n`;
      textBlock += `-----------------------------------------\n`;
      textBlock += `${day.activities}\n`;
      if (day.stay) textBlock += `🏨 Overnight Stay: ${day.stay}\n`;
      if (day.meals) textBlock += `🍽️ Meal Plan: ${day.meals}\n`;
      textBlock += `\n`;
    });

    textBlock += `=========================================\n`;
    textBlock += `Thank you for choosing South Indian Holidays!\n`;
    textBlock += `=========================================\n`;

    navigator.clipboard.writeText(textBlock);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
    addLog(`[Itinerary Desk] Copied complete text proposal for "${parsedItinerary.title}" to clipboard`, 'success');
  };

  // Download parsed itinerary as a text file
  const handleDownloadFile = () => {
    if (!parsedItinerary) return;

    let textBlock = `🌴 HOLIDAY PROPOSAL: ${parsedItinerary.title.toUpperCase()} 🌴\n\n`;
    textBlock += `Destination: ${parsedItinerary.destination}\n`;
    textBlock += `Duration: ${parsedItinerary.duration}\n`;
    if (parsedItinerary.price && parsedItinerary.price > 0) {
      textBlock += `Price Estimate: Rs. ${parsedItinerary.price.toLocaleString('en-IN')}\n`;
    }
    textBlock += `Created: ${parsedItinerary.createdDate}\n\n`;
    textBlock += `=========================================\n\n`;

    parsedItinerary.days.forEach(day => {
      textBlock += `DAY ${day.dayNumber}: ${day.title}\n`;
      textBlock += `Activities: ${day.activities}\n`;
      textBlock += `Stay: ${day.stay || 'N/A'}\n`;
      textBlock += `Meals: ${day.meals || 'N/A'}\n\n`;
    });

    const element = document.createElement("a");
    const file = new Blob([textBlock], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${parsedItinerary.title.toLowerCase().replace(/\s+/g, "_")}_itinerary.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    addLog(`[Itinerary Desk] Downloaded itinerary file successfully`, 'success');
  };

  const associatedLead = leads.find(l => l.id === selectedLeadId);

  return (
    <div className="space-y-6">
      {/* Tab Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/20 border border-slate-900 rounded-xl p-5 shadow-xl">
        <div className="text-left">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-teal-400 animate-pulse" />
            <span>ITINERARY DESK & DAY-WISE BUILDER</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Convert unstructured tour drafts, quotations, or emails into professional day-wise traveler proposals using secure AI.
          </p>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Upload & Input Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 space-y-4 shadow-xl text-left">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 pb-2 border-b border-slate-900">
              <Upload className="h-4 w-4 text-teal-400" />
              <span>1. Load Tour Details / Draft Itinerary</span>
            </h3>

            {/* Associate Travel Lead */}
            <div className="space-y-1">
              <label className="block text-[10px] font-mono uppercase text-slate-500 font-semibold">Associate With Lead Inquiry</label>
              <select
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-300 focus:outline-none focus:border-teal-500/50 cursor-pointer text-xs"
              >
                <option value="">-- Standalone Proposal (Unassociated) --</option>
                {leads.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.customerName} ({l.destination}) - {l.id}
                  </option>
                ))}
              </select>
              {associatedLead && (
                <div className="bg-teal-500/5 border border-teal-500/20 text-teal-400 p-2.5 rounded-lg text-[11px] mt-1.5 leading-snug flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-teal-400" />
                  <span>
                    Linked to lead <strong>{associatedLead.customerName}</strong>. Extracted details will align with budget of <strong>₹{(associatedLead.budget ?? 0).toLocaleString('en-IN')}</strong> and destination.
                  </span>
                </div>
              )}
            </div>

            {/* Drag and Drop File Area */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-5 text-center transition-all relative ${dragActive ? 'border-teal-400 bg-teal-500/5' : 'border-slate-850 bg-slate-950/40 hover:border-slate-800'}`}
            >
              <Upload className="h-7 w-7 text-slate-600 mx-auto mb-1.5" />
              <p className="text-[11px] font-semibold text-slate-400">Drag & Drop itinerary file (PDF, Word, Text, Image) here</p>
              <p className="text-[10px] text-slate-500 my-0.5">or</p>
              
              <label className="inline-flex px-3 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 rounded-md text-[11px] font-semibold cursor-pointer transition-all active:scale-95">
                Browse file
                <input
                  type="file"
                  accept=".txt,.json,.doc,.docx,.pdf,image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>

            {/* Pasted Raw text */}
            <div className="space-y-1">
              <label className="block text-[10px] font-mono uppercase text-slate-500 font-semibold">Paste Raw Itinerary text</label>
              <textarea
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  // If they manually edit/type text, clear the uploadedFile so they can toggle between raw text and files
                  if (uploadedFile) setUploadedFile(null);
                }}
                placeholder="Paste Day-Wise itinerary details or tour quotation here... e.g.&#10;Munnar Hill Escape Package&#10;Day 1: Arrival at Cochin airport and drive to Munnar. Overnight stay at Munnar hotel.&#10;Day 2: Full day Munnar sightseeing visiting tea gardens and parks."
                rows={10}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 font-sans text-xs text-slate-300 focus:outline-none focus:border-teal-500/50 resize-none leading-relaxed"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setInputText(''); setUploadedFile(null); setNotice(null); setParsedItinerary(null); }}
                className="flex-1 py-2.5 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-950 rounded-xl text-xs font-semibold font-mono uppercase tracking-wider transition-all"
              >
                Clear
              </button>
              <button
                type="button"
                disabled={isParsing || (!inputText.trim() && !uploadedFile)}
                onClick={handleParseItinerary}
                className={`flex-[2] py-2.5 font-bold rounded-xl shadow-md transition-all uppercase tracking-wider font-mono text-xs flex items-center justify-center gap-2 ${isParsing ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : (inputText.trim() || uploadedFile) ? 'bg-teal-500 hover:bg-teal-400 text-slate-950 hover:shadow-teal-500/10 cursor-pointer' : 'bg-slate-950 text-slate-600 cursor-not-allowed border border-slate-900'}`}
              >
                {isParsing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-slate-500" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Build Tour Plan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Day-Wise Tour Builder Panel */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Status Alert notice bar */}
          <AnimatePresence>
            {notice && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-3.5 rounded-xl border flex items-start gap-3 shadow-md text-left ${notice.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : notice.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}
              >
                {notice.type === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : notice.type === 'warning' ? (
                  <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-bold uppercase text-[9px] font-mono tracking-wide">
                    {notice.type === 'success' ? 'AI Agent Verification Successful' : notice.type === 'warning' ? 'Local Heuristic Fallback Executed' : 'Process Exception Alert'}
                  </div>
                  <div className="text-[11px] leading-snug mt-0.5 font-medium">{notice.msg}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!parsedItinerary ? (
            <div className="bg-slate-900/10 border border-slate-900 rounded-xl p-12 text-center text-slate-500 h-full flex flex-col justify-center items-center min-h-[400px]">
              <FileCode className="h-10 w-10 text-slate-800 mb-3" />
              <p className="text-sm font-semibold text-slate-400">Day-Wise Tour Planner Awaiting Data</p>
              <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                Upload a holiday quote document or paste raw text blocks into the input desk on the left, then click <strong>"Build Tour Plan"</strong> to construct an interactive day-by-day planner.
              </p>
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-6 space-y-6 shadow-xl text-left animate-fadeIn">
              
              {/* Interactive Header Properties */}
              <div className="space-y-4 pb-4 border-b border-slate-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-teal-400 animate-pulse" />
                    <span className="text-[10px] font-mono text-teal-400 font-bold bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">{parsedItinerary.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyToClipboard}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300 rounded-lg text-[11px] font-mono font-semibold transition-all"
                    >
                      {copySuccess ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-teal-400" />}
                      <span>{copySuccess ? 'COPIED!' : 'COPY PROPOSAL'}</span>
                    </button>
                    <button
                      onClick={handleDownloadFile}
                      className="flex items-center gap-1 px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-[11px] font-mono font-bold transition-all"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>DOWNLOAD .TXT</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono uppercase text-slate-500 font-semibold">Itinerary Package Title</label>
                    <input
                      type="text"
                      value={parsedItinerary.title}
                      onChange={(e) => updateItineraryField('title', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-teal-500/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-mono uppercase text-slate-500 font-semibold">Duration</label>
                      <input
                        type="text"
                        value={parsedItinerary.duration}
                        onChange={(e) => updateItineraryField('duration', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-teal-500/50 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-mono uppercase text-slate-500 font-semibold">Price (INR)</label>
                      <input
                        type="number"
                        value={parsedItinerary.price || ''}
                        onChange={(e) => updateItineraryField('price', Number(e.target.value) || 0)}
                        placeholder="Estimating..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-teal-500/50 font-mono text-emerald-400 font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase text-slate-500 font-semibold">Primary Destinations</label>
                  <input
                    type="text"
                    value={parsedItinerary.destination}
                    onChange={(e) => updateItineraryField('destination', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-teal-500/50"
                  />
                </div>
              </div>

              {/* Day-Wise list Editor */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold">Day-by-Day Timeline Planner</h4>
                  <button
                    onClick={addDay}
                    className="flex items-center gap-1 px-2.5 py-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 rounded-lg text-[10px] font-mono font-bold transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>ADD DAY</span>
                  </button>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                  {parsedItinerary.days.map((day, idx) => (
                    <div key={idx} className="p-4 bg-slate-950 border border-slate-900 rounded-xl space-y-3 relative group">
                      <button
                        onClick={() => deleteDay(idx)}
                        className="absolute top-3 right-3 text-slate-600 hover:text-rose-400 p-1 rounded-md hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Delete Day"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>

                      <div className="flex flex-col md:flex-row gap-3">
                        <div className="shrink-0 flex items-center justify-center bg-teal-500/10 border border-teal-500/20 rounded-lg h-9 w-14 font-mono font-bold text-xs text-teal-400 uppercase">
                          DAY {day.dayNumber}
                        </div>
                        <div className="flex-1 space-y-1">
                          <input
                            type="text"
                            value={day.title}
                            onChange={(e) => updateDayField(idx, 'title', e.target.value)}
                            className="w-full bg-transparent border-b border-transparent hover:border-slate-800 focus:border-teal-500/40 text-slate-200 text-xs font-bold py-1 focus:outline-none"
                            placeholder="Enter Day Title..."
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <textarea
                          value={day.activities}
                          onChange={(e) => updateDayField(idx, 'activities', e.target.value)}
                          rows={3}
                          className="w-full bg-slate-900/40 border border-slate-900 hover:border-slate-800 focus:border-teal-500/30 rounded-lg p-2.5 text-[11px] text-slate-300 focus:outline-none font-sans leading-relaxed resize-none"
                          placeholder="Describe activities for this day..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-1.5 bg-slate-900/40 px-2.5 py-1.5 rounded-lg border border-slate-900">
                          <span className="text-[10px] font-mono text-slate-500 uppercase font-bold shrink-0">Stay:</span>
                          <input
                            type="text"
                            value={day.stay || ''}
                            onChange={(e) => updateDayField(idx, 'stay', e.target.value)}
                            className="bg-transparent text-slate-300 text-[11px] focus:outline-none flex-1 truncate font-medium"
                            placeholder="Hotel name or category"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-900/40 px-2.5 py-1.5 rounded-lg border border-slate-900">
                          <span className="text-[10px] font-mono text-slate-500 uppercase font-bold shrink-0">Meals:</span>
                          <select
                            value={day.meals || 'Breakfast Only'}
                            onChange={(e) => updateDayField(idx, 'meals', e.target.value)}
                            className="bg-transparent text-slate-300 text-[11px] focus:outline-none flex-1 font-semibold cursor-pointer"
                          >
                            <option value="Breakfast Only">Breakfast Only</option>
                            <option value="Breakfast & Dinner">Breakfast & Dinner</option>
                            <option value="All Meals (Full Board)">All Meals (Full Board)</option>
                            <option value="No Meals Included">No Meals Included</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
