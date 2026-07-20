export interface ExtractedLeadData {
  customerName: string;
  phone: string;
  email: string;
  destination: string;
  pickupCity: string;
  travelDate: string;
  returnDate: string;
  adults: number;
  children: number;
  rooms: number;
  pax: number;
  budget: number;
  hotelPreference: string;
  vehiclePreference: string;
  specialRequests: string;
  source: string;
  leadPriority: 'High' | 'Medium' | 'Low';
  notes: string;
  // Upgraded travel CRM metadata
  mealPreference: string;
  tripType: string;
  approximateDates: boolean;
  confidenceScore: number;
  extractionSource: string;
  missingFields: string[];
  suggestedCorrections: string;
  uncertaintyFlags: string[];
}

const SOUTH_INDIAN_DESTINATIONS: Record<string, string> = {
  munnar: "Munnar, Kerala",
  kodaikanal: "Kodaikanal, Tamil Nadu",
  ooty: "Ooty, Tamil Nadu",
  coorg: "Coorg, Karnataka",
  wayanad: "Wayanad, Kerala",
  mysore: "Mysore, Karnataka",
  bangalore: "Bangalore, Karnataka",
  bengaluru: "Bangalore, Karnataka",
  chennai: "Chennai, Tamil Nadu",
  madurai: "Madurai, Tamil Nadu",
  rameswaram: "Rameswaram, Tamil Nadu",
  kanyakumari: "Kanyakumari, Tamil Nadu",
  thekkady: "Thekkady, Kerala",
  alleppey: "Alleppey, Kerala",
  kochi: "Kochi, Kerala",
  cochin: "Kochi, Kerala",
  trivandrum: "Trivandrum, Kerala",
  thiruvananthapuram: "Trivandrum, Kerala",
  yercaud: "Yercaud, Tamil Nadu",
  yelagiri: "Yelagiri, Tamil Nadu",
  valparai: "Valparai, Tamil Nadu",
  varkala: "Varkala, Kerala"
};

const HUB_MAP: Record<string, string> = {
  cok: "Cochin / Kochi",
  ers: "Cochin / Kochi",
  ern: "Cochin / Kochi",
  cochin: "Cochin / Kochi",
  kochi: "Cochin / Kochi",
  blr: "Bangalore",
  sbc: "Bangalore",
  bangalore: "Bangalore",
  bengaluru: "Bangalore",
  cjb: "Coimbatore",
  cbe: "Coimbatore",
  coimbatore: "Coimbatore",
  ixm: "Madurai",
  mdu: "Madurai",
  madurai: "Madurai",
  maa: "Chennai",
  mas: "Chennai",
  chennai: "Chennai",
  trv: "Trivandrum",
  trivandrum: "Trivandrum",
  ccj: "Kozhikode (Calicut)",
  calicut: "Kozhikode (Calicut)",
  kozhikode: "Kozhikode (Calicut)",
  mumbai: "Mumbai",
  delhi: "Delhi",
  trichy: "Trichy",
  trz: "Trichy"
};

// Reference base date (current local time): 2026-07-20
export function parseDateFromString(dateStr: string, baseDate: Date = new Date("2026-07-20")): { date: string; approximate: boolean } {
  const normalized = dateStr.trim().toLowerCase().replace(/(?:th|st|nd|rd)\b/g, '');
  
  if (normalized === "tomorrow") {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 1);
    return { date: d.toISOString().split('T')[0], approximate: false };
  }

  if (normalized === "day after" || normalized === "day after tomorrow") {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 2);
    return { date: d.toISOString().split('T')[0], approximate: false };
  }
  
  if (normalized.startsWith("next ")) {
    const dayName = normalized.substring(5).trim();
    const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const targetDay = daysOfWeek.indexOf(dayName);
    if (targetDay !== -1) {
      const d = new Date(baseDate);
      const currentDay = d.getDay();
      let diff = targetDay - currentDay;
      if (diff <= 0) {
        diff += 7; // next week
      }
      d.setDate(d.getDate() + diff);
      return { date: d.toISOString().split('T')[0], approximate: false };
    }
  }

  // Check DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const slashDashMatch = dateStr.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (slashDashMatch) {
    let day = parseInt(slashDashMatch[1], 10);
    let month = parseInt(slashDashMatch[2], 10) - 1;
    let year = parseInt(slashDashMatch[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return { date: d.toISOString().split('T')[0], approximate: false };
    }
  }

  // Check e.g., "15 Sept" or "15 September" or "15th Sept 2026" or "August 24"
  const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  
  // Format: 15 Sept 2026 or 15 Sept
  const dayMonthMatch = normalized.match(/(\d{1,2})\s+([a-zA-Z]{3,12})(?:\s+(\d{2,4}))?/);
  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1], 10);
    const monthName = dayMonthMatch[2].substring(0, 3);
    const monthIndex = monthNames.indexOf(monthName);
    if (monthIndex !== -1) {
      let year = baseDate.getFullYear();
      if (dayMonthMatch[3]) {
        year = parseInt(dayMonthMatch[3], 10);
        if (year < 100) year += 2000;
      }
      const d = new Date(year, monthIndex, day);
      if (!isNaN(d.getTime())) {
        return { date: d.toISOString().split('T')[0], approximate: false };
      }
    }
  }

  // Format: Sept 15
  const monthDayMatch = normalized.match(/([a-zA-Z]{3,12})\s+(\d{1,2})(?:\s+(\d{2,4}))?/);
  if (monthDayMatch) {
    const monthName = monthDayMatch[1].substring(0, 3);
    const day = parseInt(monthDayMatch[2], 10);
    const monthIndex = monthNames.indexOf(monthName);
    if (monthIndex !== -1) {
      let year = baseDate.getFullYear();
      if (monthDayMatch[3]) {
        year = parseInt(monthDayMatch[3], 10);
        if (year < 100) year += 2000;
      }
      const d = new Date(year, monthIndex, day);
      if (!isNaN(d.getTime())) {
        return { date: d.toISOString().split('T')[0], approximate: false };
      }
    }
  }

  // Approximate or flexible date expressions
  // e.g., "August first week", "August starting", "Sep end"
  for (let i = 0; i < monthNames.length; i++) {
    const mName = monthNames[i];
    if (normalized.includes(mName)) {
      let day = 15; // default middle of month
      let approxType = "mid";
      if (normalized.includes("start") || normalized.includes("first week") || normalized.includes("beg")) {
        day = 5;
        approxType = "beginning";
      } else if (normalized.includes("end") || normalized.includes("last week") || normalized.includes("late")) {
        day = 25;
        approxType = "end";
      }
      const d = new Date(baseDate.getFullYear(), i, day);
      // If the date is in the past compared to baseDate, use next year
      if (d.getTime() < baseDate.getTime()) {
        d.setFullYear(baseDate.getFullYear() + 1);
      }
      return { date: d.toISOString().split('T')[0], approximate: true };
    }
  }

  // "Next month"
  if (normalized.includes("next month")) {
    const d = new Date(baseDate);
    d.setMonth(d.getMonth() + 1);
    d.setDate(10); // set to 10th of next month
    return { date: d.toISOString().split('T')[0], approximate: true };
  }

  return { date: "", approximate: true };
}

export function offlineHeuristicParse(text: string): ExtractedLeadData {
  const result: ExtractedLeadData = {
    customerName: "",
    phone: "",
    email: "",
    destination: "Munnar, Kerala",
    pickupCity: "Cochin / Kochi",
    travelDate: "",
    returnDate: "",
    adults: 2,
    children: 0,
    rooms: 1,
    pax: 2,
    budget: 35000,
    hotelPreference: "Standard 3-Star",
    vehiclePreference: "Sedan (Dzire/Etios)",
    specialRequests: "",
    source: "WhatsApp",
    leadPriority: "Medium",
    notes: text,
    // Upgraded fields defaults
    mealPreference: "Not Specified",
    tripType: "Family",
    approximateDates: false,
    confidenceScore: 40,
    extractionSource: "Offline Heuristic Engine",
    missingFields: [],
    suggestedCorrections: "",
    uncertaintyFlags: []
  };

  if (!text) {
    result.missingFields = ["customerName", "phone", "travelDate", "destination"];
    result.confidenceScore = 0;
    return result;
  }

  const textLower = text.toLowerCase();
  let scorePoints = 40; // Base baseline score for submitting text

  // 1. Phone number extraction & validation (Supports +91, 0, 91 prefix, and handles multiple numbers)
  // Match candidate phone numbers (e.g., +91 98450 12345, 9845012345, 09845012345, 91-9845012345, etc.)
  const phoneRegex = /(?:\+91|91|0)?[6-9]\d{4}\s*\d{5}\b|(?:\+91|91|0)?[6-9]\d{9}\b|(?:\+91|91|0)?[6-9]\d{2}[\s\-]\d{3}[\s\-]\d{4}\b/g;
  const phoneMatches = text.match(phoneRegex);
  
  if (phoneMatches && phoneMatches.length > 0) {
    // Format the first number beautifully as +91 XXXXX XXXXX
    const rawPhone = phoneMatches[0].replace(/[^\d]/g, '');
    let formattedPhone = "";
    if (rawPhone.length === 10) {
      formattedPhone = `+91 ${rawPhone.substring(0, 5)} ${rawPhone.substring(5)}`;
    } else if (rawPhone.length === 11 && rawPhone.startsWith('0')) {
      formattedPhone = `+91 ${rawPhone.substring(1, 6)} ${rawPhone.substring(6)}`;
    } else if (rawPhone.length === 12 && rawPhone.startsWith('91')) {
      formattedPhone = `+91 ${rawPhone.substring(2, 7)} ${rawPhone.substring(7)}`;
    } else if (rawPhone.length === 13 && rawPhone.startsWith('91')) {
      formattedPhone = `+91 ${rawPhone.substring(3, 8)} ${rawPhone.substring(8)}`;
    } else {
      formattedPhone = `+91 ${rawPhone.slice(-10, -5)} ${rawPhone.slice(-5)}`;
    }
    result.phone = formattedPhone;
    scorePoints += 15;

    // Log multiple numbers as corrections if found
    if (phoneMatches.length > 1) {
      const alternates = phoneMatches.slice(1).map(p => p.trim()).join(", ");
      result.suggestedCorrections += `Alternate contacts found: ${alternates}. `;
    }
  } else {
    result.missingFields.push("phone");
    result.uncertaintyFlags.push("phone");
  }

  // 2. Email Extraction
  const emailRegex = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/i;
  const emailMatch = text.match(emailRegex);
  if (emailMatch) {
    result.email = emailMatch[0].trim();
    scorePoints += 10;
  } else {
    result.missingFields.push("email");
  }

  // 3. Name Extraction (Resilient name pattern matching, greeting markers, dear cues)
  const namePatterns = [
    /(?:my name is|i am|this is|client name|name|customer|traveler|lead name)\s*[:\-]?\s*([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){1,2})/i,
    /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:here|inquiring|needs|booking)/i,
    /Dear\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/i,
    /regards\s*,\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/i,
    /thanks\s*,\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/i
  ];

  let nameFound = false;
  for (const regex of namePatterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const candidate = match[1].trim();
      // Ignore common English nouns or weekdays
      const ignored = ["I", "We", "A", "The", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Munnar", "Kerala", "Ooty", "Kodaikanal", "Coorg", "Wayanad", "Wayanad Wild", "Resort", "Standard", "Sedan", "SUV", "High", "Medium", "Low"];
      if (!ignored.includes(candidate)) {
        result.customerName = candidate;
        nameFound = true;
        scorePoints += 15;
        break;
      }
    }
  }

  if (!nameFound) {
    // Check lines beginning with common greetings
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    for (const line of lines) {
      if (/^(hi|hello|hey|dear|good\s+morning|good\s+afternoon|good\s+evening)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/i.test(line)) {
        const m = line.match(/^(hi|hello|hey|dear|good\s+morning|good\s+afternoon|good\s+evening)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/i);
        if (m && m[2] && m[2].length > 2) {
          result.customerName = m[2].trim();
          nameFound = true;
          scorePoints += 10;
          break;
        }
      }
    }
  }

  if (!nameFound) {
    // Use the first non-numeric word of length > 3 that is capitalized on the first line as a fallback guess
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length > 0) {
      const firstLine = lines[0];
      const match = firstLine.match(/\b([A-Z][a-zA-Z]{2,15})\b/);
      if (match && match[1]) {
        const word = match[1];
        const ignored = ["Hi", "Hello", "Hey", "Dear", "Trip", "Plan", "Munnar", "Ooty", "Coorg", "Kerala", "Tamil", "South"];
        if (!ignored.includes(word)) {
          result.customerName = word;
          nameFound = true;
          result.uncertaintyFlags.push("customerName");
          result.suggestedCorrections += `Guessed customer name: "${word}". Please verify. `;
        }
      }
    }
  }

  if (!result.customerName) {
    result.customerName = "WhatsApp Inquiry";
    result.missingFields.push("customerName");
    result.uncertaintyFlags.push("customerName");
  }

  // 4. Destination Support (Mapping to South Indian destinations)
  let destFound = false;
  for (const [key, val] of Object.entries(SOUTH_INDIAN_DESTINATIONS)) {
    if (textLower.includes(key)) {
      result.destination = val;
      destFound = true;
      scorePoints += 15;
      break;
    }
  }

  if (!destFound) {
    const tripPatterns = [
      /(?:trip to|tour to|visit|holiday in|heading to|traveling to|going to)\s+([A-Z][a-zA-Z\s,]+)/i,
      /([A-Z][a-zA-Z\s]+)\s+trip/i,
      /([A-Z][a-zA-Z\s]+)\s+package/i
    ];
    for (const pattern of tripPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const cleanedDest = match[1].trim().split(/[.\n\r,]/)[0].trim();
        if (cleanedDest.length > 3 && !["Standard", "Deluxe", "Premium", "Budget", "Family", "Couple"].includes(cleanedDest)) {
          result.destination = cleanedDest;
          destFound = true;
          result.uncertaintyFlags.push("destination");
          result.suggestedCorrections += `Detected destination: "${cleanedDest}". `;
          break;
        }
      }
    }
  }

  if (!destFound) {
    result.destination = "Munnar, Kerala"; // standard default
    result.missingFields.push("destination");
    result.uncertaintyFlags.push("destination");
  }

  // 5. Pickup City, Airports, and Stations
  let pickupFound = false;
  
  // Look for airport/railway station mentions
  const cokMentions = ["cok", "cochin airport", "kochi airport", "ernakulam station", "ers", "ern", "ernakulam junction"];
  const blrMentions = ["blr", "bangalore airport", "bengaluru airport", "sbc", "bangalore city", "yesvantpur"];
  const cjbMentions = ["cjb", "coimbatore airport", "coimbatore station", "cbe", "coimbatore junction"];
  const masMentions = ["maa", "chennai airport", "chennai central", "mas", "egmore"];
  const mduMentions = ["ixm", "madurai airport", "madurai junction", "mdu"];
  const trvMentions = ["trv", "trivandrum airport", "trivandrum central", "kochveli"];
  const ccjMentions = ["ccj", "calicut airport", "kozikhode station", "calicut station"];
  
  let detectedStationDetail = "";

  if (cokMentions.some(m => textLower.includes(m))) {
    result.pickupCity = "Cochin / Kochi";
    pickupFound = true;
    detectedStationDetail = "Kochi Airport/Ernakulam Junction (COK/ERS)";
  } else if (blrMentions.some(m => textLower.includes(m))) {
    result.pickupCity = "Bangalore";
    pickupFound = true;
    detectedStationDetail = "Bangalore Airport/KSR Station (BLR/SBC)";
  } else if (cjbMentions.some(m => textLower.includes(m))) {
    result.pickupCity = "Coimbatore";
    pickupFound = true;
    detectedStationDetail = "Coimbatore Airport/Junction (CJB/CBE)";
  } else if (masMentions.some(m => textLower.includes(m))) {
    result.pickupCity = "Chennai";
    pickupFound = true;
    detectedStationDetail = "Chennai Airport/Central (MAA/MAS)";
  } else if (mduMentions.some(m => textLower.includes(m))) {
    result.pickupCity = "Madurai";
    pickupFound = true;
    detectedStationDetail = "Madurai Airport/Junction (IXM/MDU)";
  } else if (trvMentions.some(m => textLower.includes(m))) {
    result.pickupCity = "Trivandrum";
    pickupFound = true;
    detectedStationDetail = "Trivandrum Airport/Central (TRV)";
  } else if (ccjMentions.some(m => textLower.includes(m))) {
    result.pickupCity = "Kozhikode (Calicut)";
    pickupFound = true;
    detectedStationDetail = "Kozhikode Airport/Calicut Station (CCJ)";
  }

  if (detectedStationDetail) {
    result.specialRequests += (result.specialRequests ? ". " : "") + `Arrival station/airport: ${detectedStationDetail}`;
  }

  if (!pickupFound) {
    const pickupPattern = /(?:pickup\s+from|starting\s+from|from|cab\s+from|arrival\s+at|pick\s+up|departs\s+from)\s+([A-Z][a-zA-Z\s]+)/i;
    const pickupMatch = text.match(pickupPattern);
    if (pickupMatch && pickupMatch[1]) {
      const cityCandidate = pickupMatch[1].trim().split(/[.\n\r,]/)[0].trim();
      for (const [key, hub] of Object.entries(HUB_MAP)) {
        if (cityCandidate.toLowerCase().includes(key)) {
          result.pickupCity = hub;
          pickupFound = true;
          break;
        }
      }
      if (!pickupFound && cityCandidate.length > 2 && cityCandidate.length < 20) {
        result.pickupCity = cityCandidate;
        pickupFound = true;
      }
    }
  }

  if (!pickupFound) {
    // Check if any major city keyword is in the text
    for (const [key, hub] of Object.entries(HUB_MAP)) {
      if (textLower.includes(key)) {
        result.pickupCity = hub;
        pickupFound = true;
        break;
      }
    }
  }

  if (!pickupFound) {
    result.pickupCity = "Cochin / Kochi"; // Standard default
    result.uncertaintyFlags.push("pickupCity");
  }

  // 6. Travel Date & Duration Extraction
  const dateRegex = /\b\d{1,2}(?:st|nd|rd|th)?\s+[a-zA-Z]{3,12}\b|\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b|\btomorrow\b|\bday\s+after\s+tomorrow\b|\bnext\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi;
  const dateMatches = text.match(dateRegex);
  
  // Approximate travel month keywords
  const approxKeywords = ["flexible", "approx", "around", "tentative", "flexible dates", "august first week", "september start", "october end", "november first week"];
  const hasApproxKeywords = approxKeywords.some(k => textLower.includes(k));

  if (dateMatches && dateMatches.length > 0) {
    const startParse = parseDateFromString(dateMatches[0]);
    result.travelDate = startParse.date;
    result.approximateDates = startParse.approximate;
    scorePoints += 10;

    if (dateMatches.length > 1) {
      const endParse = parseDateFromString(dateMatches[1]);
      result.returnDate = endParse.date;
    } else {
      // Look for durations like "3 days", "4 nights", "5D/4N"
      const durationMatch = text.match(/(\d+)\s*(?:night|night\s*stay|n)/i);
      const daysMatch = text.match(/(\d+)\s*(?:day|d)/i);
      
      let nights = 3; // sensible default
      if (durationMatch) {
        nights = parseInt(durationMatch[1], 10);
      } else if (daysMatch) {
        nights = Math.max(1, parseInt(daysMatch[1], 10) - 1);
      }

      if (result.travelDate) {
        const tDate = new Date(result.travelDate);
        tDate.setDate(tDate.getDate() + nights);
        result.returnDate = tDate.toISOString().split('T')[0];
      }
    }
  } else {
    // Attempt approximate mapping
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    let mappedApprox = false;
    for (const m of monthNames) {
      if (textLower.includes(m)) {
        const approxParse = parseDateFromString(m);
        if (approxParse.date) {
          result.travelDate = approxParse.date;
          result.approximateDates = true;
          const tDate = new Date(result.travelDate);
          tDate.setDate(tDate.getDate() + 4);
          result.returnDate = tDate.toISOString().split('T')[0];
          mappedApprox = true;
          scorePoints += 5;
          break;
        }
      }
    }

    if (!mappedApprox) {
      // Sensible fallback date (tomorrow)
      const tomParse = parseDateFromString("tomorrow");
      result.travelDate = tomParse.date;
      result.approximateDates = true; // flag as approximate because we had to guess
      const rDate = new Date(result.travelDate);
      rDate.setDate(rDate.getDate() + 4);
      result.returnDate = rDate.toISOString().split('T')[0];
      
      result.missingFields.push("travelDate");
      result.uncertaintyFlags.push("travelDate");
    }
  }

  if (hasApproxKeywords || result.approximateDates) {
    result.approximateDates = true;
    result.suggestedCorrections += "Travel dates are tentative or flexible. ";
  }

  // 7. Passengers (Adults, Children, Rooms, Pax)
  const adultMatch = text.match(/(\d+)\s*(?:adult|grown\s*up|major|person|guest|pax|people)/i);
  if (adultMatch) {
    result.adults = parseInt(adultMatch[1], 10);
    scorePoints += 5;
  }

  const childMatch = text.match(/(\d+)\s*(?:child|kid|infant|children|childs|baby)/i);
  if (childMatch) {
    result.children = parseInt(childMatch[1], 10);
    scorePoints += 5;
  }

  result.pax = result.adults + result.children;

  const roomMatch = text.match(/(\d+)\s*(?:room|bedroom|sharing\s+room|cottage|ac\s+room)/i);
  if (roomMatch) {
    result.rooms = parseInt(roomMatch[1], 10);
  } else {
    result.rooms = Math.max(1, Math.ceil(result.adults / 2));
  }

  // 8. Trip Type (Family, Couple, Honeymoon, Friends, Corporate, Group)
  if (/honeymoon|marriage|wedding/i.test(textLower)) {
    result.tripType = "Honeymoon";
    result.specialRequests += (result.specialRequests ? ". " : "") + "Honeymoon special decorations and cake.";
    scorePoints += 5;
  } else if (/corporate|office|business|teambuilding|colleague|conference/i.test(textLower)) {
    result.tripType = "Corporate";
    scorePoints += 5;
  } else if (/friend|boys|girls|mates|batch|gang/i.test(textLower)) {
    result.tripType = "Friends";
    scorePoints += 5;
  } else if (/family|parents|kids|children|mom|dad|wife|sister/i.test(textLower)) {
    result.tripType = "Family";
    scorePoints += 5;
  } else if (result.pax === 2 && result.adults === 2) {
    result.tripType = "Couple";
  } else if (result.pax >= 6) {
    result.tripType = "Group";
  } else {
    result.tripType = "Family"; // fallback
  }

  // Detect Senior Citizen tour
  if (/senior|elder|old|grandpa|grandma|aged/i.test(textLower)) {
    result.specialRequests += (result.specialRequests ? ". " : "") + "Senior citizens traveling (need ground floor room / no stairs).";
    result.leadPriority = "High";
  }

  // 9. Meal Preference
  if (/jain/i.test(textLower)) {
    result.mealPreference = "Jain Food";
    result.specialRequests += (result.specialRequests ? ". " : "") + "Strict Jain meal requirements.";
    scorePoints += 5;
  } else if (/pure\s*veg|vegetarian/i.test(textLower)) {
    result.mealPreference = "Vegetarian";
    scorePoints += 5;
  } else if (/non\s*veg|chicken|meat|fish|halal/i.test(textLower)) {
    result.mealPreference = "Non-Vegetarian";
    scorePoints += 5;
  } else if (/ap\s+plan|ap\s+meals|all\s+meals/i.test(textLower)) {
    result.mealPreference = "Full Board (AP - All Meals)";
  } else if (/map\s+plan|breakfast\s*\+\s*dinner|half\s*board/i.test(textLower)) {
    result.mealPreference = "Half Board (MAP - Breakfast + Dinner)";
  } else if (/cp\s+plan|breakfast\s*only|cp\b/i.test(textLower)) {
    result.mealPreference = "Breakfast Only (CP)";
  } else {
    result.mealPreference = "Not Specified";
  }

  // 10. Budget Extraction (Correctly converting Lakhs/K and Indian formats)
  const budgetPatterns = [
    /(?:budget|estimate|price|cost|around|approx|under)\s*(?:of|is)?\s*(?:rs\.?|inr|rupees|₹)?\s*(\d+(?:\.\d+)?\s*(?:lakhs?|l|k)|\d+[\d,]*)/i,
    /(\d+(?:\.\d+)?\s*(?:lakhs?|l|k))\s*(?:rs\.?|inr|rupees|₹|budget)/i,
    /(?:₹|rs\.?|inr)\s*(\d+(?:\.\d+)?\s*(?:lakhs?|l|k)|\d+[\d,]*)/i
  ];

  let budgetFound = false;
  for (const pattern of budgetPatterns) {
    const match = text.match(pattern);
    if (match) {
      const rawVal = (match[1] || match[0]).toLowerCase().replace(/[^\d.lk]/g, '').trim();
      let calculatedVal = 0;
      if (rawVal.endsWith('k')) {
        calculatedVal = parseFloat(rawVal.slice(0, -1)) * 1000;
      } else if (rawVal.endsWith('l') || rawVal.includes('lakh')) {
        const cleanedNumericStr = rawVal.replace(/[a-z]/g, '').trim();
        calculatedVal = parseFloat(cleanedNumericStr) * 100000;
      } else {
        calculatedVal = parseInt(rawVal, 10);
      }

      if (!isNaN(calculatedVal) && calculatedVal > 100) {
        result.budget = calculatedVal;
        budgetFound = true;
        scorePoints += 15;
        break;
      }
    }
  }

  if (!budgetFound) {
    // Guess default budget based on passenger size & travel hub
    // standard 35000 for standard couple trip
    result.budget = result.pax * 15000;
    result.uncertaintyFlags.push("budget");
  }

  // 11. Hotel Preferences
  if (/5\s*star|5-star|luxury|premium|taj|palace|grand/i.test(textLower)) {
    result.hotelPreference = "Premium 5-Star";
    scorePoints += 5;
  } else if (/4\s*star|4-star|deluxe|resort|villa/i.test(textLower)) {
    result.hotelPreference = "Deluxe 4-Star";
    scorePoints += 5;
  } else if (/homestay|hostel|budget|guest\s*house|dorm/i.test(textLower)) {
    result.hotelPreference = "Budget / Homestay";
    scorePoints += 5;
  } else {
    result.hotelPreference = "Standard 3-Star";
  }

  // 12. Vehicle Preferences
  if (/suv|innova|crysta|ertiga|xylo|scorpio|7\s*seater/i.test(textLower)) {
    result.vehiclePreference = "SUV (Innova/Ertiga)";
    scorePoints += 5;
  } else if (/tempo|traveler|traveller|bus|12\s*seater|17\s*seater/i.test(textLower)) {
    result.vehiclePreference = "Tempo Traveler (12-17 Seater)";
    scorePoints += 5;
  } else if (/hatchback|swift|i20|alto/i.test(textLower)) {
    result.vehiclePreference = "Hatchback (Swift)";
    scorePoints += 5;
  } else {
    result.vehiclePreference = "Sedan (Dzire/Etios)";
  }

  // 13. High/Low Luxury indicators & Priority
  const isLuxury = result.budget > (result.pax * 25000) || result.hotelPreference === "Premium 5-Star";
  if (isLuxury) {
    result.specialRequests += (result.specialRequests ? ". " : "") + "Premium/Luxury customized holiday preferences.";
  }

  const isUrgent = /urgent|immediately|asap|priority|running\s+out|quick/i.test(textLower);
  if (isUrgent) {
    result.leadPriority = "High";
  } else if (result.budget < (result.pax * 8000)) {
    result.leadPriority = "Low";
  } else if (result.budget > 60000) {
    result.leadPriority = "High";
  } else {
    result.leadPriority = "Medium";
  }

  // Sanity check passenger count
  if (result.adults <= 0) {
    result.adults = 2;
    result.pax = 2;
    result.uncertaintyFlags.push("pax");
  }

  // 14. Specific text alerts
  const spellingMistakes = ["murnar", "ooti", "kodaikanal hills", "coorhg", "waynad"];
  spellingMistakes.forEach(m => {
    if (textLower.includes(m)) {
      result.suggestedCorrections += `Corrected spelling of South Indian destination. `;
    }
  });

  result.confidenceScore = Math.min(100, Math.max(10, scorePoints));

  return result;
}
