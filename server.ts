import express from "express";
import path from "path";
import dns from "dns";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini API
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to clean up domain names from user input
function cleanDomain(input: string): string {
  let cleaned = input.trim().toLowerCase();
  cleaned = cleaned.replace(/^(https?:\/\/)?(www\.)?/, "");
  cleaned = cleaned.split("/")[0];
  cleaned = cleaned.split(":")[0];
  return cleaned;
}

// 1. IP Lookup Endpoint
app.post("/api/lookup/ip", async (req: express.Request, res: express.Response) => {
  try {
    let { ip } = req.body;
    ip = (ip || "").trim();

    // If no IP, let's try to get request IP
    if (!ip) {
      const forwarded = req.headers["x-forwarded-for"];
      ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket.remoteAddress || "8.8.8.8";
    }

    // fallback to default if still empty or local
    if (ip === "::1" || ip === "127.0.0.1" || !ip) {
      ip = "8.8.8.8"; // Default fallback for local testing
    }

    // Fetch from a free IP Geolocation API
    const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`);
    let geoData: any = {};
    if (geoResponse.ok) {
      geoData = await geoResponse.json();
    } else {
      // backup
      const backupResponse = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`);
      if (backupResponse.ok) {
        geoData = await backupResponse.json();
        // unify keys
        geoData.country_name = geoData.country;
        geoData.region = geoData.regionName;
        geoData.org = geoData.org || geoData.isp;
      }
    }

    // AI Threat Analysis
    let aiReport = "Gemini API key not configured. Dynamic AI risk assessment offline.";
    if (ai) {
      try {
        const prompt = `Analyze this IP Geolocation data for potential OSINT traces, threat assessment, security reputation, or host intelligence. Summarize what is known about this block.
IP: ${ip}
Location: ${geoData.city || "Unknown"}, ${geoData.region || "Unknown"}, ${geoData.country_name || "Unknown"}
ISP: ${geoData.org || "Unknown"}
ASN: ${geoData.asn || geoData.as || "Unknown"}
Postal: ${geoData.postal || "Unknown"}
Coordinates: ${geoData.latitude || geoData.lat || "Unknown"}, ${geoData.longitude || geoData.lon || "Unknown"}

Provide:
1. Threat Level Assessment (Low, Medium, High) with detailed technical explanation.
2. Proxy / VPN / TOR node suspicion analysis based on ISP/ASN profile.
3. Known uses of this ISP (Residential, Hosting, CDN, Business).
4. OSINT investigation suggestions.
Write in clear, technical security analyst style in Markdown.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
        });
        aiReport = response.text || "No response generated.";
      } catch (err: any) {
        aiReport = `AI analysis failed: ${err.message || err}`;
      }
    }

    res.json({
      success: true,
      ip,
      data: geoData,
      report: aiReport,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Internal Server Error" });
  }
});

// 2. DNS & Domain Lookup Endpoint
app.post("/api/lookup/domain", async (req: express.Request, res: express.Response) => {
  try {
    const { domain } = req.body;
    if (!domain) {
      return res.status(400).json({ success: false, error: "Domain is required" });
    }

    const cleanedDomain = cleanDomain(domain);
    const dnsRecords: any = {};

    // Helper to resolve dns records safely without crashing
    const resolveDns = <T>(fn: (d: string, cb: (err: any, rec: T) => void) => void, recordType: string): Promise<T | null> => {
      return new Promise((resolve) => {
        fn(cleanedDomain, (err, records) => {
          if (err) {
            dnsRecords[recordType] = [];
            resolve(null);
          } else {
            dnsRecords[recordType] = records;
            resolve(records);
          }
        });
      });
    };

    // Perform DNS queries in parallel
    await Promise.all([
      resolveDns<string[]>(dns.resolve4, "A"),
      resolveDns<string[]>(dns.resolve6, "AAAA"),
      resolveDns<dns.MxRecord[]>(dns.resolveMx, "MX"),
      resolveDns<string[][]>(dns.resolveTxt, "TXT"),
      resolveDns<string[]>(dns.resolveNs, "NS"),
    ]);

    // AI WHOIS & Security Rep Analysis
    let aiReport = "Gemini API key not configured. Domain security intelligence reports offline.";
    if (ai) {
      try {
        const dnsStr = JSON.stringify(dnsRecords, null, 2);
        const prompt = `Analyze this domain and its resolved DNS records. Since you have web search capability, please search for its WHOIS information, registrar, creation/expiration dates, and general security reputation.
Domain: ${cleanedDomain}
DNS Records:
${dnsStr}

Provide:
1. Domain Registrar, Creation Date, and Age (using Google Search grounding if needed to fetch real WHOIS info).
2. DNS Configuration Review (SPF, DKIM, TXT validations, mail server hosts).
3. Security Profile & OSINT Threat Rating (Check if associated with phishing, active spam, or holds solid domain authority).
4. Subdomain intelligence paths to inspect.
Format beautifully in clean Markdown with clear section headings.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });
        aiReport = response.text || "No response generated.";
      } catch (err: any) {
        aiReport = `AI domain analysis failed: ${err.message || err}`;
      }
    }

    res.json({
      success: true,
      domain: cleanedDomain,
      dns: dnsRecords,
      report: aiReport,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Internal Server Error" });
  }
});

// 3. Social Media OSINT Profile Finder (Sherlock)
app.post("/api/lookup/username", async (req: express.Request, res: express.Response) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, error: "Username is required" });
    }

    const cleanedUsername = username.trim().replace(/[^a-zA-Z0-9_\-\.]/g, "");

    // Platforms list with real profile URLs and standard matching techniques
    const platforms = [
      { name: "GitHub", url: `https://github.com/${cleanedUsername}`, profileUrl: `https://github.com/${cleanedUsername}` },
      { name: "Reddit", url: `https://www.reddit.com/user/${cleanedUsername}/about.json`, profileUrl: `https://www.reddit.com/user/${cleanedUsername}` },
      { name: "GitLab", url: `https://gitlab.com/api/v4/users?username=${cleanedUsername}`, profileUrl: `https://gitlab.com/${cleanedUsername}` },
      { name: "Pinterest", url: `https://www.pinterest.com/${cleanedUsername}/`, profileUrl: `https://www.pinterest.com/${cleanedUsername}/` },
      { name: "DeviantArt", url: `https://www.deviantart.com/${cleanedUsername}`, profileUrl: `https://www.deviantart.com/${cleanedUsername}` },
      { name: "Medium", url: `https://medium.com/@${cleanedUsername}`, profileUrl: `https://medium.com/@${cleanedUsername}` },
      { name: "Vimeo", url: `https://vimeo.com/${cleanedUsername}`, profileUrl: `https://vimeo.com/${cleanedUsername}` },
      { name: "Dribbble", url: `https://dribbble.com/${cleanedUsername}`, profileUrl: `https://dribbble.com/${cleanedUsername}` },
    ];

    const results = await Promise.all(
      platforms.map(async (platform) => {
        try {
          // fetch with short timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);

          const resFetch = await fetch(platform.url, {
            method: "GET",
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          let found = false;

          if (platform.name === "Reddit") {
            // Reddit JSON API returns 200 with kind: "t2" if exists, or 404
            if (resFetch.status === 200) {
              const data = await resFetch.json();
              if (data && data.data && data.data.name) {
                found = true;
              }
            }
          } else if (platform.name === "GitLab") {
            // GitLab users search API
            if (resFetch.status === 200) {
              const data = await resFetch.json();
              if (Array.isArray(data) && data.length > 0) {
                found = true;
              }
            }
          } else {
            // General HTML check: 200 is exists, 404 is not exists
            if (resFetch.status === 200) {
              // Double check to avoid generic pages or redirect issues (e.g. Medium soft-404)
              const text = await resFetch.text();
              const lowercaseText = text.toLowerCase();
              if (!lowercaseText.includes("page not found") && !lowercaseText.includes("cannot find") && !lowercaseText.includes("profile_not_found")) {
                found = true;
              }
            }
          }

          return {
            platform: platform.name,
            profileUrl: platform.profileUrl,
            status: found ? "FOUND" : "NOT_FOUND",
          };
        } catch (e) {
          return {
            platform: platform.name,
            profileUrl: platform.profileUrl,
            status: "UNKNOWN",
          };
        }
      })
    );

    // AI Profiling Analysis
    let aiReport = "Gemini API key not configured. Intelligence dossier compilation offline.";
    if (ai) {
      try {
        const foundPlatforms = results.filter((r) => r.status === "FOUND").map((r) => r.platform).join(", ");
        const prompt = `Perform an OSINT intelligence assessment of a target with the username "${cleanedUsername}".
We searched social platforms and found trace matches on: ${foundPlatforms || "None detected on standard checks"}.

Please search Google for other traces of this username, email addresses related to it, posts, forum threads, or coding footprints. Write a complete threat intelligence report:
1. Digital Footprint Overview & Alias Reliability.
2. Cross-platform correlation (are these profiles likely the same individual?).
3. Risk Score (Low, Medium, High risk of leaked records, credential stuffing, or exposure).
4. Standard OPSEC advice for the owner of this username to protect their identity.
Include actual web grounding references and handle this anonymously and safely in clear Markdown format.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });
        aiReport = response.text || "No response generated.";
      } catch (err: any) {
        aiReport = `AI compilation failed: ${err.message || err}`;
      }
    }

    res.json({
      success: true,
      username: cleanedUsername,
      results,
      report: aiReport,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Internal Server Error" });
  }
});

// 4. Phone Intelligence Lookup
app.post("/api/lookup/phone", async (req: express.Request, res: express.Response) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: "Phone number is required" });
    }

    const cleanedPhone = phone.trim().replace(/[^0-9\+]/g, "");

    let aiReport = "Gemini API key not configured. Advanced carrier & regional intelligence reports offline.";
    if (ai) {
      try {
        const prompt = `Analyze this phone number using your public intelligence and Google search tools:
Phone: ${cleanedPhone}

Provide:
1. Standard Country Code, Carrier identification, and Line Type (Mobile, VoIP, Landline).
2. Scam / Fraud Database check (Search if this number is flagged for phishing, telemarketing, or active robocalls).
3. Risk Rating (Safe, Suspicious, Danger).
4. OSINT investigation vectors for phone records.
Format with clean layout, lists, and professional security terminology.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });
        aiReport = response.text || "No response generated.";
      } catch (err: any) {
        aiReport = `AI phone analysis failed: ${err.message || err}`;
      }
    }

    res.json({
      success: true,
      phone: cleanedPhone,
      report: aiReport,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Internal Server Error" });
  }
});

// 5. Email Integrity & Breach Lookup
app.post("/api/lookup/email", async (req: express.Request, res: express.Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required" });
    }

    const cleanedEmail = email.trim().toLowerCase();
    const domain = cleanedEmail.split("@")[1] || "";

    // Common disposable email providers list
    const disposableDomains = new Set([
      "mailinator.com", "tempmail.com", "10minutemail.com", "yopmail.com", "guerrillamail.com",
      "sharklasers.com", "dispostable.com", "getairmail.com", "throwawaymail.com", "temp-mail.org",
      "maildrop.cc", "trashmail.com", "burnermail.io", "fakeinbox.com", "mailnesia.com"
    ]);

    const isDisposable = disposableDomains.has(domain);
    const isValidFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail);

    let aiReport = "Gemini API key not configured. Cyber leak & breach index report offline.";
    if (ai) {
      try {
        const prompt = `Analyze this email address for security breaches and public metadata exposure:
Email: ${cleanedEmail}
Domain: ${domain}
Disposable Provider: ${isDisposable ? "Yes" : "No"}

Tasks:
1. Conduct a mock breach scan status paired with active Google searches on known database breaches (e.g. Canva, Adobe, LinkedIn leaks) where this domain or email pattern was heavily impacted.
2. Domain Trust Rating (Is this domain a secure corporate host, popular public email, or custom suspect domain?).
3. Threat score (0 to 100) and actionable security steps for the email owner.
Deliver a comprehensive, readable cybersecurity report in Markdown.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });
        aiReport = response.text || "No response generated.";
      } catch (err: any) {
        aiReport = `AI email scan failed: ${err.message || err}`;
      }
    }

    res.json({
      success: true,
      email: cleanedEmail,
      isDisposable,
      isValidFormat,
      report: aiReport,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Internal Server Error" });
  }
});

// 6. KMSK Advanced OSINT Grounded Search Hub
app.post("/api/lookup/ai-osint", async (req: express.Request, res: express.Response) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: "Search query is required" });
    }

    let report = "Gemini API key is not configured. Google Search OSINT groundings are currently offline.";
    let sources: any[] = [];

    if (ai) {
      try {
        const systemPrompt = `You are "KMSK Anonymous Intelligence Core", an advanced OSINT (Open Source Intelligence) cyber investigator.
Your job is to search the public web for any information matching the target query (e.g., target name, username, IP, domain, corporate entity, online handle).
Compile a highly professional investigation dossier using real search grounding.

Format the output strictly as Markdown with clear structural headers:
- 🛠️ TARGET ANALYSIS SUMMARY
- 🕵️ PUBLIC WEB FOOTPRINT & SOCIAL PROFILE LEAKS
- 🔒 OPSEC RISK EVALUATION & SCORE
- 📈 ACTIONABLE COUNTERMEASURES & SECURITY STEPS

Never fabricate details, but compile all true public indicators found.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Perform an in-depth anonymous OSINT scan on: "${query}"`,
          config: {
            systemInstruction: systemPrompt,
            tools: [{ googleSearch: {} }],
          },
        });

        report = response.text || "No data gathered.";
        
        // Extract grounding chunks as source links
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
          sources = chunks
            .filter((chunk: any) => chunk.web && chunk.web.uri)
            .map((chunk: any) => ({
              title: chunk.web.title || "Web Source",
              uri: chunk.web.uri,
            }));
        }
      } catch (err: any) {
        report = `OSINT investigation failed: ${err.message || err}`;
      }
    }

    res.json({
      success: true,
      query,
      report,
      sources,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Internal Server Error" });
  }
});

// Serve static build or delegate to Vite
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[KMSK Anonymous] Full Stack server booted successfully on port ${PORT}`);
  });
}

startServer();
