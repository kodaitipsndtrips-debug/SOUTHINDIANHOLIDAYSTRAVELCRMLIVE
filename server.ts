import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";
import { offlineHeuristicParse } from "./src/utils/whatsappParser";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  const standardJsonParser = express.json({ limit: "100kb" });
  const standardUrlencodedParser = express.urlencoded({ limit: "100kb", extended: true });

  const largeJsonParser = express.json({ limit: "50mb" });
  const largeUrlencodedParser = express.urlencoded({ limit: "50mb", extended: true });

  // API Route: Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: process.env.NODE_ENV || "development" });
  });

  // Lazy initialize Gemini client
  let aiInstance: GoogleGenAI | null = null;
  function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured.");
    }
    if (!aiInstance) {
      aiInstance = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiInstance;
  }

  // Sleep utility helper for retry policy delays
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // API Route: Parse WhatsApp Text
  app.post("/api/parse-whatsapp", standardJsonParser, standardUrlencodedParser, async (req, res) => {
    const startTime = Date.now();
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text payload is required." });
    }

    const attempts = 3;
    const delays = [0, 1500, 4000]; // Attempt 1: 0s, Attempt 2: 1.5s, Attempt 3: 4s
    let lastError: any = null;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        if (attempt > 1) {
          const delayMs = delays[attempt - 1];
          console.log(`[WhatsApp Parser] Attempt ${attempt} of ${attempts}. Retrying in ${delayMs}ms due to previous error: ${lastError?.message || lastError}`);
          await sleep(delayMs);
        }

        const ai = getGeminiClient();
        
        const prompt = `You are an expert South India travel CRM inquiry extractor. Extract structured travel inquiry details from this raw copy-pasted WhatsApp message.

Message:
"${text}"

Extract and map the fields into the provided JSON schema. If any field is not found or is unclear, provide a sensible default.
The current local time is 2026-07-20. Ensure relative date keywords (e.g. tomorrow, next friday, day after tomorrow, next month) are parsed into standard YYYY-MM-DD.
For destination, try to map it to one of these preferred destinations if possible, otherwise extract verbatim:
- Munnar, Kerala
- Ooty, Tamil Nadu
- Kodaikanal, Tamil Nadu
- Coorg, Karnataka
- Wayanad, Kerala
- Mysore, Karnataka
- Bangalore, Karnataka
- Chennai, Tamil Nadu
- Madurai, Tamil Nadu
- Rameswaram, Tamil Nadu
- Kanyakumari, Tamil Nadu
- Thekkady, Kerala
- Alleppey, Kerala
- Kochi, Kerala
- Trivandrum, Kerala
- Yercaud, Tamil Nadu
- Yelagiri, Tamil Nadu
- Valparai, Tamil Nadu
- Varkala, Kerala

Ensure the following mapping and parsing rules are followed:
1. Try to extract both travelDate and returnDate in YYYY-MM-DD format. If only a start date is specified, calculate returnDate based on duration (e.g., "3 days" or "4 nights"). If dates are approximate/flexible (e.g., "August first week", "tentative in Oct"), specify a logical date (e.g., 2026-08-01, 2026-10-15) and set approximateDates to true.
2. For phone, look for Indian mobile formats (validating 10 digits or with +91/91/0 prefix) and format beautifully. If there are multiple phone numbers, list the alternates in suggestedCorrections.
3. Determine tripType from: "Family", "Couple", "Honeymoon", "Friends", "Corporate", "Group". Use indicators like kids (Family), partner/anniversary (Couple), romantic/newlywed (Honeymoon), friends/boys/gang (Friends), office/meeting (Corporate), or high pax counts (Group).
4. Determine mealPreference from: "Vegetarian", "Non-Vegetarian", "Jain Food", "Breakfast Only (CP)", "Half Board (MAP - Breakfast + Dinner)", "Full Board (AP - All Meals)", "Not Specified".
5. For confidenceScore, evaluate between 0 and 100 based on how complete the customer details and travel specifications are.
6. Set extractionSource to "AI (Gemini 3.5 Flash)".
7. Identify missing fields and populate the missingFields array.
8. Indicate any fields you guessed or had low confidence in via the uncertaintyFlags array.
9. Suggest any spelling corrections or general tips in the suggestedCorrections field.
10. Respect Indian dates, airports (COK, BLR, MAA, CJB, IXM, TRV, CCJ) and railway stations, mapping them to the correct arrival/pickup city.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                customerName: { type: Type.STRING, description: "Full name of the customer/traveler" },
                phone: { type: Type.STRING, description: "Indian mobile phone number of the customer" },
                email: { type: Type.STRING, description: "Email address of the customer" },
                destination: { type: Type.STRING, description: "Preferred destination" },
                pickupCity: { type: Type.STRING, description: "City of arrival/pickup" },
                travelDate: { type: Type.STRING, description: "Travel starting date in YYYY-MM-DD format" },
                returnDate: { type: Type.STRING, description: "Travel return/end date in YYYY-MM-DD format" },
                adults: { type: Type.INTEGER, description: "Number of adults traveling" },
                children: { type: Type.INTEGER, description: "Number of children traveling" },
                rooms: { type: Type.INTEGER, description: "Number of rooms required" },
                pax: { type: Type.INTEGER, description: "Total number of passengers (Adults + Children)" },
                budget: { type: Type.INTEGER, description: "Total budget estimate in INR" },
                hotelPreference: { type: Type.STRING, description: "Hotel star category or type preference" },
                vehiclePreference: { type: Type.STRING, description: "Preferred vehicle category (Sedan/SUV/Tempo Traveler/etc.)" },
                specialRequests: { type: Type.STRING, description: "Special requests, food choice, honeymoon decoration, etc." },
                source: { type: Type.STRING, description: "Set to WhatsApp" },
                leadPriority: { type: Type.STRING, description: "Lead priority level: High, Medium, or Low" },
                notes: { type: Type.STRING, description: "General summary and synthesized traveler notes" },
                mealPreference: { type: Type.STRING, description: "Meal choice: Vegetarian, Non-Vegetarian, Jain Food, etc." },
                tripType: { type: Type.STRING, description: "Type of trip: Honeymoon, Family, Couple, Friends, Corporate, Group" },
                approximateDates: { type: Type.BOOLEAN, description: "Set to true if travel dates are approximate or tentative" },
                confidenceScore: { type: Type.INTEGER, description: "Self-assessed extraction confidence score from 0 to 100" },
                extractionSource: { type: Type.STRING, description: "Set to 'AI (Gemini 3.5 Flash)'" },
                missingFields: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of fields not present in input message" },
                suggestedCorrections: { type: Type.STRING, description: "Any correction suggestions or details on parsed values" },
                uncertaintyFlags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of fields extracted with low confidence/guessed" }
              },
              required: [
                "customerName", "phone", "email", "destination", "pickupCity", 
                "travelDate", "returnDate", "adults", "children", "rooms", 
                "pax", "budget", "hotelPreference", "vehiclePreference", 
                "specialRequests", "source", "leadPriority", "notes",
                "mealPreference", "tripType", "approximateDates", "confidenceScore",
                "extractionSource", "missingFields", "suggestedCorrections", "uncertaintyFlags"
              ]
            }
          }
        });

        const textOutput = response.text;
        if (!textOutput) {
          throw new Error("Gemini returned an empty response.");
        }

        const extractedData = JSON.parse(textOutput.trim());
        const duration = Date.now() - startTime;
        
        console.log(`[WhatsApp Parser] Success! Extraction complete in ${duration}ms. Confidence: ${extractedData.confidenceScore}%. Retries: ${attempt - 1}. Source: ${extractedData.extractionSource}`);

        return res.json({
          success: true,
          aiExtracted: true,
          fallback: false,
          data: extractedData,
          durationMs: duration
        });

      } catch (error: any) {
        lastError = error;
        console.warn(`[WhatsApp Parser] Attempt ${attempt} failed: ${error.message || error}`);
      }
    }

    // If we reach here, all 3 attempts failed. Switch to Offline Heuristic Parsing Mode.
    const duration = Date.now() - startTime;
    console.warn(`[WhatsApp Parser] All ${attempts} attempts failed. Switch to Offline Parsing Mode. Error: ${lastError?.message || lastError}`);
    
    try {
      const offlineData = offlineHeuristicParse(text);
      console.log(`[WhatsApp Parser] Offline fallback extraction succeeded in ${Date.now() - startTime}ms. Confidence: ${offlineData.confidenceScore}%. Source: ${offlineData.extractionSource}`);
      return res.json({
        success: true,
        aiExtracted: false,
        fallback: true,
        data: offlineData,
        durationMs: duration,
        error: lastError?.message || "Failed to extract using AI. Falling back to offline heuristic engine."
      });
    } catch (fallbackErr: any) {
      console.error("[WhatsApp Parser] Extreme Failure: Offline parser also failed", fallbackErr);
      return res.status(500).json({
        success: false,
        error: "Severe Error: Both AI parser and offline heuristic parser failed.",
        message: fallbackErr.message
      });
    }
  });

  // API Route: Parse Itinerary Text or File (PDF, DOCX, DOC, TXT, JSON, PNG, JPG, WebP)
  app.post("/api/parse-itinerary", largeJsonParser, largeUrlencodedParser, async (req, res) => {
    const { text, fileBase64, fileName, mimeType } = req.body;

    if (!text && !fileBase64) {
      return res.status(400).json({ error: "Either text or fileBase64 payload is required." });
    }

    try {
      const ai = getGeminiClient();
      let contents: any;
      let promptText = `You are an expert travel coordinator. Parse the provided travel itinerary or tour description.
Extract or synthesize a structured tour package, complete with day-wise details.

Provide a structured day-by-day JSON response fitting the schema.
Ensure to:
1. Come up with a catchy "title" for the tour (e.g. "Scenic Munnar & Alleppey Splendors") if one is not clearly specified.
2. Determine the "destination" (e.g. "Munnar, Alleppey, Kerala") and "duration" (e.g. "4 Nights / 5 Days").
3. Parse each day's plan carefully, capturing the dayNumber, title, activities, stay, and meals.
4. Try to make the dayNumber sequential starting from 1.`;

      if (fileBase64) {
        // Clean base64 data
        let base64Data = fileBase64;
        if (fileBase64.includes(";base64,")) {
          base64Data = fileBase64.split(";base64,").pop() || "";
        }

        const isPdf = mimeType === "application/pdf" || mimeType?.includes("pdf") || fileName?.toLowerCase().endsWith(".pdf");
        const isImage = mimeType?.startsWith("image/") || mimeType?.includes("image") || /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName || "");

        if (isPdf) {
          console.log(`[Server] Parsing PDF via Gemini Native OCR: ${fileName || "document"}`);
          contents = [
            {
              role: "user",
              parts: [
                { text: `${promptText}\n\nPlease parse this attached PDF document directly.` },
                { inlineData: { data: base64Data, mimeType: "application/pdf" } }
              ]
            }
          ];
        } else if (isImage) {
          console.log(`[Server] Parsing Image via Gemini Native OCR: ${fileName || "image"}`);
          const actualMime = mimeType || (fileName?.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");
          contents = [
            {
              role: "user",
              parts: [
                { text: `${promptText}\n\nPlease parse this attached image directly.` },
                { inlineData: { data: base64Data, mimeType: actualMime } }
              ]
            }
          ];
        } else {
          // Extract text from docx, doc, or others
          let extractedText = "";
          const buffer = Buffer.from(base64Data, "base64");
          const isDocx = mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || mimeType?.includes("docx") || fileName?.toLowerCase().endsWith(".docx");
          const isDoc = mimeType === "application/msword" || mimeType?.includes("msword") || mimeType?.includes("doc") || fileName?.toLowerCase().endsWith(".doc");

          if (isDocx) {
            console.log(`[Server] Extracting text from DOCX: ${fileName}`);
            const result = await mammoth.extractRawText({ buffer });
            extractedText = result.value;
          } else if (isDoc) {
            console.log(`[Server] Extracting text from DOC: ${fileName}`);
            const extractor = new WordExtractor();
            const extracted = await extractor.extract(buffer);
            extractedText = extracted.getBody();
          } else {
            console.log(`[Server] Decoding generic text file: ${fileName}`);
            extractedText = buffer.toString("utf-8");
          }

          if (!extractedText || !extractedText.trim()) {
            throw new Error("Could not extract any readable text from this document.");
          }

          contents = `${promptText}\n\nItinerary Text:\n"${extractedText}"`;
        }
      } else {
        contents = `${promptText}\n\nItinerary Text:\n"${text}"`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "A catchy, marketing-friendly tour package title" },
              destination: { type: Type.STRING, description: "Main locations included in this tour" },
              duration: { type: Type.STRING, description: "e.g. 3 Nights / 4 Days" },
              price: { type: Type.INTEGER, description: "Estimated price in INR if mentioned, else 0" },
              days: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    dayNumber: { type: Type.INTEGER, description: "The sequential day number" },
                    title: { type: Type.STRING, description: "The day's main highlight title" },
                    activities: { type: Type.STRING, description: "Detailed list of excursions, sights, transfers, or experiences scheduled for this day" },
                    stay: { type: Type.STRING, description: "Suggested hotel/resort/houseboat category or name" },
                    meals: { type: Type.STRING, description: "Included meals, e.g. Breakfast, Breakfast & Dinner, All Meals, or None" }
                  },
                  required: ["dayNumber", "title", "activities"]
                }
              }
            },
            required: ["title", "destination", "duration", "days"]
          }
        }
      });

      const textOutput = response.text;
      if (!textOutput) {
        throw new Error("Gemini returned an empty response.");
      }

      const extractedData = JSON.parse(textOutput.trim());
      res.json({
        success: true,
        aiExtracted: true,
        data: extractedData
      });

    } catch (error: any) {
      console.warn("[Gemini Itinerary Parsing Error - Server Fallback Active]", error.message);
      res.json({
        success: false,
        error: error.message || "Failed to extract itinerary using AI.",
        fallback: true
      });
    }
  });

  // Serve static assets or use Vite dev server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(console.error);
