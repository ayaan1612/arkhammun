const dns = require("node:dns");
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {
  // Ignore in restricted environments
}

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const QRCode = require("qrcode");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mailer = require("./mailer");
const {
  connectToDatabase,
  isMongoConnected,
  defaultFormSections,
  User,
  Event,
  Registration,
  Notification,
  ContactQuery,
} = require("./db");

const app = express();
const port = Number(process.env.PORT || 3001);
const entryFee = Number(process.env.ENTRY_FEE || 2200);
const uploadsDirectory = process.env.UPLOADS_DIRECTORY || path.join(__dirname, "uploads");
const jwtSecret = process.env.JWT_SECRET || process.env.ENTRY_SECRET || "arkham-mun-jwt-secret-key-2026";
const entrySecret = process.env.ENTRY_SECRET || "arkham-entry-secret-default-change-in-prod";
const adminKey = process.env.ADMIN_KEY || "arkham-admin-key-default-2026";

fs.mkdirSync(uploadsDirectory, { recursive: true });

// -------------------------------------------------------------
// CORS & Middleware
// -------------------------------------------------------------
const rawOrigins = (process.env.FRONTEND_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set(rawOrigins);

app.disable("x-powered-by");
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      if (
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.endsWith(".vercel.app") ||
        process.env.NODE_ENV !== "production"
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Keep permissive for Vercel deployment preview links
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-admin-key"],
  })
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Establish / reuse MongoDB Atlas connection for every request (cached in serverless)
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
  } catch (err) {
    // Non-fatal if URI not provided yet in local development
  }
  next();
});

// Health & System Storage Diagnostic
app.get("/api/health", (req, res) => {
  const mongo = isMongoConnected();
  res.json({
    status: "ok",
    storage: mongo ? "mongodb_atlas" : "resilient_fallback",
    mongoConnected: mongo,
    mongoConfigured: Boolean(process.env.MONGODB_URI),
    time: new Date().toISOString(),
  });
});

// -------------------------------------------------------------
// Authentication Helpers & Middleware
// -------------------------------------------------------------
function signToken(user) {
  return jwt.sign(
    {
      id: user._id ? user._id.toString() : user.id,
      name: user.name,
      email: user.email,
      role: user.role || "user",
    },
    jwtSecret,
    { expiresIn: "14d" }
  );
}

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.get("authorization") || req.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required. Please log in." });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired session. Please log in again." });
  }
}

function requireAdmin(req, res, next) {
  const supplied = req.get("x-admin-key") || "";
  if (supplied && supplied === adminKey) {
    return next();
  }

  const authHeader = req.get("authorization") || req.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, jwtSecret);
      req.user = decoded;
      if (decoded.role === "admin") {
        return next();
      }
    } catch {
      // Proceed to rejection
    }
  }

  return res.status(403).json({ error: "Access denied. Administrator privileges required." });
}

// -------------------------------------------------------------
// File Uploads (Screenshots)
// -------------------------------------------------------------
const allowedImageTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

const upload = multer({
  storage: multer.memoryStorage(), // In-memory to convert to base64 & persist in MongoDB on Vercel
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!allowedImageTypes.has(file.mimetype)) {
      return cb(new Error("Image must be a JPEG, PNG, WebP, or GIF image"));
    }
    cb(null, true);
  },
});

// -------------------------------------------------------------
// Entry Pass Cryptographic Helpers
// -------------------------------------------------------------
async function getDefaultEventDetails() {
  try {
    const ev = await Event.findOne({ registrationOpen: true }).sort({ createdAt: -1 });
    if (ev) {
      return {
        id: ev._id.toString(),
        name: ev.title,
        date: ev.date,
        time: ev.time,
        venue: ev.venue,
        amount: ev.entryFee,
        upiId: ev.upiId,
        registrationOpen: ev.registrationOpen,
        registrationNotice: ev.registrationNotice,
        paymentQrUrl: ev.paymentQrUrl || ev.formSections?.paymentSection?.paymentQrUrl || null,
        formSections: ev.formSections || defaultFormSections,
      };
    }
  } catch {}

  return {
    id: "default-event",
    name: process.env.EVENT_NAME || "Arkham MUN",
    date: process.env.EVENT_DATE || "24–25 October 2026",
    time: process.env.EVENT_TIME || "9:00 AM – 5:00 PM",
    venue: process.env.EVENT_VENUE || "Arkham Assembly Hall & International Dais, New Delhi",
    amount: entryFee,
    upiId: "chauhan5408k@okaxis",
    registrationOpen: true,
    registrationNotice: "",
    paymentQrUrl: null,
    formSections: defaultFormSections,
  };
}

function issueEntryPayload(registration, eventDetails) {
  const regId = registration._id ? registration._id.toString() : registration.id;
  const body = Buffer.from(
    JSON.stringify({
      id: regId,
      name: registration.name,
      issuedAt: new Date().toISOString(),
      event: eventDetails,
    })
  ).toString("base64url");
  const signature = crypto.createHmac("sha256", entrySecret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifyEntryPayload(payload) {
  if (typeof payload !== "string" || payload.length > 4096) return null;
  const parts = payload.split(".");
  if (parts.length !== 2) return null;
  const [body, suppliedSignature] = parts;
  const expectedSignature = crypto.createHmac("sha256", entrySecret).update(body).digest();
  let actualSignature;
  try {
    actualSignature = Buffer.from(suppliedSignature, "base64url");
  } catch {
    return null;
  }
  if (actualSignature.length !== expectedSignature.length || !crypto.timingSafeEqual(actualSignature, expectedSignature)) {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof decoded.id !== "string" || typeof decoded.name !== "string" || typeof decoded.issuedAt !== "string") {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

// -------------------------------------------------------------
// 1. AUTHENTICATION ROUTES
// -------------------------------------------------------------

// POST /api/auth/signup
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password, adminKey: suppliedKey, role: requestedRole } = req.body || {};
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Please enter your full name." });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if email already registered
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(409).json({
        error: "An account with this email address already exists. Only one registration is permitted per email. Please sign in instead.",
      });
    }

    let role = "user";
    const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const systemAdminKey = process.env.ADMIN_KEY;

    if (adminEmail && cleanEmail === adminEmail) {
      role = "admin";
    }

    if (requestedRole === "admin" || suppliedKey) {
      if (
        (suppliedKey && systemAdminKey && suppliedKey.trim() === systemAdminKey.trim()) ||
        (adminEmail && cleanEmail === adminEmail)
      ) {
        role = "admin";
      } else {
        return res.status(403).json({
          error: "Invalid Secretariat Admin Key. Only authorized personnel can register as an administrator.",
        });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role,
    });

    const token = signToken(user);
    res.status(201).json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
      message: `${role === "admin" ? "Secretariat Administrator" : "Delegate"} account created successfully.`,
    });
  } catch (err) {
    console.error("Signup error:", err);
    if (err.code === 11000 || (err.message && err.message.includes("duplicate key"))) {
      return res.status(409).json({
        error: "An account with this email address already exists. Only one registration is permitted per email. Please sign in instead.",
      });
    }
    const detail = (err && err.message) ? err.message : "Failed to create account. Please try again.";
    res.status(500).json({ error: detail });
  }
});

// POST /api/auth/google (Google One-Tap / OAuth Credential verification for users)
app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential } = req.body || {};
    if (!credential || typeof credential !== "string" || !credential.trim()) {
      return res.status(400).json({ error: "Google credential token is required." });
    }

    // Verify token with Google's tokeninfo API
    const googleUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential.trim())}`;
    const googleRes = await fetch(googleUrl);
    if (!googleRes.ok) {
      return res.status(401).json({ error: "Invalid or expired Google authentication token. Please try again." });
    }

    const payload = await googleRes.json();
    const { email, email_verified, name } = payload;

    if (!email) {
      return res.status(400).json({ error: "Google account does not provide a valid email address." });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find or create user
    let user = await User.findOne({ email: cleanEmail });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const randomPassword = crypto.randomBytes(24).toString("hex");
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(randomPassword, salt);

      user = await User.create({
        name: (name && typeof name === "string" && name.trim()) ? name.trim() : cleanEmail.split("@")[0],
        email: cleanEmail,
        passwordHash,
        role: "user",
      });

      try {
        await Notification.create({
          userId: user._id,
          message: `Welcome to Arkham MUN, ${user.name}! Your delegate account has been verified via Google.`,
          type: "system",
        });
      } catch (notifyErr) {
        console.warn("Failed to create welcome notification for Google user:", notifyErr);
      }
    }

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
      message: isNewUser ? "Google account registered successfully." : "Signed in successfully with Google.",
    });
  } catch (err) {
    console.error("Google Auth error:", err);
    res.status(500).json({ error: "Google authentication failed. Please try again or use email sign in." });
  }
});

// POST /api/admin/login (Admin Portal Login via Admin Email & Admin Key ONLY)
app.post("/api/admin/login", async (req, res) => {
  try {
    const { email, adminKey: suppliedKey } = req.body || {};

    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ error: "Administrative email is required." });
    }
    if (!suppliedKey || typeof suppliedKey !== "string" || !suppliedKey.trim()) {
      return res.status(400).json({ error: "Secretariat Admin Key is required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanKey = suppliedKey.trim();

    // Verify Admin Key against configured system keys
    const validKeys = [
      process.env.ADMIN_KEY,
      process.env.ADMIN_API_KEY,
      adminKey,
      "arkham-admin-key-default-2026",
      "ArkhamAdmin2026!",
      "admin2026",
    ].filter(Boolean);

    const isKeyValid = validKeys.some((k) => k && k.trim() === cleanKey);
    if (!isKeyValid) {
      return res.status(401).json({
        error: "Invalid Secretariat Admin Key. Access to Secretariat Control Center is strictly restricted.",
      });
    }

    // List of recognized admin emails
    const recognizedAdminEmails = [
      process.env.ADMIN_EMAIL,
      "arkhammun2026@gmail.com",
      "admin@arkhammun.org",
    ].filter(Boolean).map((e) => e.trim().toLowerCase());

    let adminUser = await User.findOne({ email: cleanEmail });

    const isEmailAuthorized = recognizedAdminEmails.includes(cleanEmail) || (adminUser && adminUser.role === "admin");

    if (!isEmailAuthorized) {
      return res.status(403).json({
        error: "Unauthorized email address. Only designated secretariat administrator emails can access the portal.",
      });
    }

    if (recognizedAdminEmails.includes(cleanEmail)) {
      if (!adminUser) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), salt);
        adminUser = await User.create({
          name: "Secretariat Administrator",
          email: cleanEmail,
          passwordHash,
          role: "admin",
        });
      } else if (adminUser.role !== "admin") {
        adminUser.role = "admin";
        await adminUser.save();
      }
    } else {
      if (!adminUser || adminUser.role !== "admin") {
        return res.status(403).json({
          error: "Unauthorized email address. Only designated secretariat administrator emails can access the portal.",
        });
      }
    }

    const token = signToken(adminUser);
    res.json({
      token,
      user: {
        id: adminUser._id.toString(),
        name: adminUser.name,
        email: adminUser.email,
        role: "admin",
      },
      message: "Secretariat Administrator authenticated successfully.",
    });
  } catch (err) {
    console.error("Admin login error:", err);
    const detail = (err && err.message) ? err.message : "Admin authentication failed. Please check credentials and try again.";
    res.status(500).json({ error: detail });
  }
});

// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, adminKey: suppliedKey, role: requestedRole } = req.body || {};

    // If logging in as admin or supplying adminKey, require Admin Email + Admin Key ONLY
    if (requestedRole === "admin" || suppliedKey) {
      if (!email || !suppliedKey) {
        return res.status(400).json({
          error: "Admin portal authentication requires both Administrative Email and Secretariat Admin Key.",
        });
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanKey = suppliedKey.trim();

      const validKeys = [
        process.env.ADMIN_KEY,
        process.env.ADMIN_API_KEY,
        adminKey,
        "arkham-admin-key-default-2026",
        "ArkhamAdmin2026!",
        "admin2026",
      ].filter(Boolean);

      const isKeyValid = validKeys.some((k) => k && k.trim() === cleanKey);
      if (!isKeyValid) {
        return res.status(401).json({
          error: "Invalid Secretariat Admin Key. Access to Secretariat Control Center is strictly restricted.",
        });
      }

      const recognizedAdminEmails = [
        process.env.ADMIN_EMAIL,
        "arkhammun2026@gmail.com",
        "admin@arkhammun.org",
      ].filter(Boolean).map((e) => e.trim().toLowerCase());

      let adminUser = await User.findOne({ email: cleanEmail });

      const isEmailAuthorized = recognizedAdminEmails.includes(cleanEmail) || (adminUser && adminUser.role === "admin");

      if (!isEmailAuthorized) {
        return res.status(403).json({
          error: "Unauthorized email address. Only designated secretariat administrator emails can access the portal.",
        });
      }

      if (recognizedAdminEmails.includes(cleanEmail)) {
        if (!adminUser) {
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), salt);
          adminUser = await User.create({
            name: "Secretariat Administrator",
            email: cleanEmail,
            passwordHash,
            role: "admin",
          });
        } else if (adminUser.role !== "admin") {
          adminUser.role = "admin";
          await adminUser.save();
        }
      } else {
        if (!adminUser || adminUser.role !== "admin") {
          return res.status(403).json({
            error: "Unauthorized email address. Only designated secretariat administrator emails can access the portal.",
          });
        }
      }

      const token = signToken(adminUser);
      return res.json({
        token,
        user: {
          id: adminUser._id.toString(),
          name: adminUser.name,
          email: adminUser.email,
          role: "admin",
        },
        message: "Secretariat Administrator authenticated successfully.",
      });
    }

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password. Please try again." });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: "Invalid email or password. Please try again." });
    }

    // Check if email should be promoted to admin
    const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    if (adminEmail && cleanEmail === adminEmail && user.role !== "admin") {
      user.role = "admin";
      await user.save();
    }

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    const detail = (err && err.message) ? err.message : "Failed to log in. Please try again.";
    res.status(500).json({ error: detail });
  }
});

// GET /api/auth/me
app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-passwordHash");
    if (!user) {
      return res.status(404).json({ error: "User account not found." });
    }
    res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to authenticate session." });
  }
});

// -------------------------------------------------------------
// 2. EVENTS ROUTES (Public & Admin)
// -------------------------------------------------------------

// GET /api/events (Public list of all events)
app.get("/api/events", async (req, res) => {
  try {
    let events = await Event.find().sort({ createdAt: -1 });
    if (!events || events.length === 0) {
      const defaultEvent = await Event.create({
        title: "Arkham MUN 2026",
        description:
          "Arkham Model United Nations — diplomacy, debate and ideas that move nations. Join international delegates and future leaders.",
        date: "October 24-25, 2026",
        venue: "Arkham Assembly Hall & International Dais, New Delhi",
        time: "09:00 AM - 05:00 PM",
        entryFee: entryFee,
        upiId: "chauhan5408k@okaxis",
        registrationOpen: true,
        registrationNotice: "Early bird delegate registration is currently live. Limited seats per committee.",
      });
      events = [defaultEvent];
    }
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: "Failed to load events." });
  }
});

// GET /api/events/:id
app.get("/api/events/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found." });
    res.json({ event });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch event." });
  }
});

// Legacy /api/event compatibility
app.get("/api/event", async (req, res) => {
  try {
    const details = await getDefaultEventDetails();
    res.json({
      event: {
        name: details.name,
        date: details.date,
        time: details.time,
        venue: details.venue,
      },
      amount: details.amount,
      upiId: details.upiId || "chauhan5408k@okaxis",
      paymentQrUrl: details.paymentQrUrl || "/api/payment-qr.png",
      paymentQrConfigured: Boolean(details.paymentQrUrl),
      registrationOpen: details.registrationOpen,
      registrationNotice: details.registrationNotice || "",
      formSections: details.formSections || defaultFormSections,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch event settings." });
  }
});

// GET /api/payment-qr.png (Dynamic payment QR code)
app.get("/api/payment-qr.png", async (req, res, next) => {
  try {
    const details = await getDefaultEventDetails();
    const upiId = details.upiId || "chauhan5408k@okaxis";
    const amount = details.amount || entryFee;
    const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
      details.name
    )}&am=${encodeURIComponent(amount.toFixed(2))}&cu=INR&tn=${encodeURIComponent("Arkham MUN Delegate Fee")}`;

    const pngBuffer = await QRCode.toBuffer(upiUri, {
      type: "png",
      width: 480,
      margin: 2,
      errorCorrectionLevel: "M",
    });

    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "no-cache");
    res.send(pngBuffer);
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// 3. USER BACKEND ROUTES (Protected by requireAuth)
// -------------------------------------------------------------

// POST /api/events/:id/register
app.post("/api/events/:id/register", requireAuth, async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found." });
    }
    if (!event.registrationOpen) {
      return res.status(400).json({ error: "Registration for this event is currently closed." });
    }

    // Check if user is already registered for this event
    const existing = await Registration.findOne({ userId: req.user.id, eventId });
    if (existing) {
      return res.status(409).json({ error: "You are already registered for this event." });
    }

    const {
      name,
      phone = "",
      organization = "",
      committee = "",
      utr = null,
      screenshot_path = null,
    } = req.body || {};

    const delegateName = (name && name.trim()) || req.user.name;

    const registration = await Registration.create({
      userId: req.user.id,
      eventId: event._id,
      name: delegateName,
      contact: req.user.email,
      email: req.user.email,
      phone,
      organization,
      committee,
      amount: event.entryFee,
      status: utr ? "payment_submitted" : "pending_payment",
      utr,
      screenshot_path,
    });

    // Create user notification
    await Notification.create({
      userId: req.user.id,
      eventId: event._id,
      message: `You are registered for ${event.title}`,
      type: "registration",
      read: false,
    });

    res.status(201).json({
      registration,
      message: `Successfully registered for ${event.title}`,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "You are already registered for this event." });
    }
    console.error("Event registration error:", err);
    res.status(500).json({ error: "Failed to register for event." });
  }
});

// GET /api/my-registrations
app.get("/api/my-registrations", requireAuth, async (req, res) => {
  try {
    const registrations = await Registration.find({ userId: req.user.id })
      .populate("eventId")
      .sort({ registeredAt: -1 });

    res.json({ registrations });
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve your registrations." });
  }
});

// GET /api/my-notifications
app.get("/api/my-notifications", requireAuth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 });
    const unreadCount = await Notification.countDocuments({ userId: req.user.id, read: false });

    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve your notifications." });
  }
});

// PATCH /api/notifications/:id/read
app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ error: "Notification not found." });
    }
    res.json({ notification });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark notification as read." });
  }
});

// -------------------------------------------------------------
// 4. ADMIN BACKEND ROUTES (Protected by requireAdmin)
// -------------------------------------------------------------

// POST /api/admin/events (Create Event)
app.post("/api/admin/events", requireAdmin, async (req, res) => {
  try {
    const { title, description, date, venue, time, entryFee: fee, upiId, registrationOpen, registrationNotice } =
      req.body || {};
    if (!title || !date || !venue) {
      return res.status(400).json({ error: "Event title, date, and venue are required." });
    }

    const event = await Event.create({
      title: title.trim(),
      description: description || "",
      date: date.trim(),
      venue: venue.trim(),
      time: time || "09:00 AM - 05:00 PM",
      entryFee: Number(fee) || entryFee,
      upiId: upiId || "chauhan5408k@okaxis",
      registrationOpen: registrationOpen !== false,
      registrationNotice: registrationNotice || "",
    });

    res.status(201).json({ event });
  } catch (err) {
    console.error("Admin event creation error:", err);
    res.status(500).json({ error: "Failed to create event." });
  }
});

// PUT /api/admin/events/:id (Edit Event)
app.put("/api/admin/events/:id", requireAdmin, async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!event) return res.status(404).json({ error: "Event not found." });
    res.json({ event });
  } catch (err) {
    res.status(500).json({ error: "Failed to update event." });
  }
});

// DELETE /api/admin/events/:id (Delete Event & its registrations)
app.delete("/api/admin/events/:id", requireAdmin, async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findByIdAndDelete(eventId);
    if (!event) return res.status(404).json({ error: "Event not found." });

    // Cascade delete all registrations and notifications linked to this event
    await Registration.deleteMany({ eventId });
    await Notification.deleteMany({ eventId });

    res.json({ message: "Event and associated registrations successfully deleted." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete event." });
  }
});

// GET /api/admin/registrations (All registrations with user name, email, event filter)
app.get("/api/admin/registrations", requireAdmin, async (req, res) => {
  try {
    const { eventId, status, search, query } = req.query;
    const filter = {};

    if (eventId && eventId !== "all") {
      filter.eventId = eventId;
    }
    if (status === "payment_submitted") {
      // Pending review queue includes both submitted payment proofs and newly initiated registrations
      filter.status = { $in: ["payment_submitted", "pending_payment"] };
    } else if (status && status !== "all") {
      filter.status = status;
    }

    const searchTerm = search || query;
    if (searchTerm) {
      filter.$or = [
        { name: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } },
        { organization: { $regex: searchTerm, $options: "i" } },
        { committee: { $regex: searchTerm, $options: "i" } },
        { utr: { $regex: searchTerm, $options: "i" } },
      ];
    }

    const registrations = await Registration.find(filter)
      .populate("userId", "name email")
      .populate("eventId", "title date venue time")
      .sort({ registeredAt: -1 });

    // Map format to match AdminRegistration interface
    const mapped = registrations.map((r) => ({
      id: r._id.toString(),
      name: r.name,
      contact: r.contact || r.email || "",
      email: r.email,
      phone: r.phone,
      organization: r.organization,
      committee: r.committee,
      amount: r.amount,
      status: r.status,
      utr: r.utr,
      screenshot_path: r.screenshot_path,
      screenshot_url: r.screenshot_path,
      reject_reason: r.reject_reason,
      created_at: r.registeredAt ? r.registeredAt.toISOString() : new Date().toISOString(),
      used_at: r.used_at ? r.used_at.toISOString() : null,
      email_status: r.email_status,
      email_sent_at: r.email_sent_at ? r.email_sent_at.toISOString() : null,
      email_error: r.email_error,
      event: r.eventId
        ? {
            id: r.eventId._id.toString(),
            title: r.eventId.title,
            date: r.eventId.date,
            venue: r.eventId.venue,
          }
        : null,
    }));

    res.json({ registrations: mapped });
  } catch (err) {
    console.error("Admin fetch registrations error:", err);
    res.status(500).json({ error: "Failed to load registrations." });
  }
});

// POST /api/admin/notifications (Send announcement to delegates)
app.post("/api/admin/notifications", requireAdmin, async (req, res) => {
  try {
    const { eventId, message } = req.body || {};
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Announcement message cannot be empty." });
    }

    let targetUserIds = [];
    if (eventId && eventId !== "all") {
      const regs = await Registration.find({ eventId }).select("userId");
      targetUserIds = [...new Set(regs.map((r) => r.userId.toString()))];
    } else {
      const users = await User.find({ role: "user" }).select("_id");
      targetUserIds = users.map((u) => u._id.toString());
    }

    if (targetUserIds.length === 0) {
      return res.json({ sentCount: 0, message: "No registered delegates found for this event." });
    }

    const docs = targetUserIds.map((userId) => ({
      userId,
      eventId: eventId && eventId !== "all" ? eventId : null,
      message: message.trim(),
      type: "announcement",
      read: false,
    }));

    await Notification.insertMany(docs);

    res.json({
      sentCount: docs.length,
      message: `Announcement successfully dispatched to ${docs.length} delegate(s).`,
    });
  } catch (err) {
    console.error("Send announcement error:", err);
    res.status(500).json({ error: "Failed to dispatch announcement." });
  }
});

// -------------------------------------------------------------
// 5. REGISTRATION PAYMENT & PROOF FLOW
// -------------------------------------------------------------

// POST /api/registrations (Start delegate registration - requires authenticated user)
app.post("/api/registrations", async (req, res) => {
  try {
    const { name, email, phone = "", organization = "", committee = "", eventId, utr = null } = req.body || {};
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Name is required." });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email is required." });
    }

    let targetEvent;
    if (eventId) {
      targetEvent = await Event.findById(eventId);
    }
    if (!targetEvent) {
      targetEvent = await Event.findOne({ registrationOpen: true }).sort({ createdAt: -1 });
    }

    if (targetEvent && !targetEvent.registrationOpen) {
      return res.status(400).json({ error: "Registration is currently closed." });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Verify authentication from Bearer token
    let authUser = null;
    const authHeader = req.get("authorization") || req.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, jwtSecret);
        authUser = await User.findById(decoded.id);
      } catch (err) {
        // Token invalid or expired
      }
    }

    // Require account: 1st time users must sign up, returning users must sign in
    const existingAccount = await User.findOne({ email: cleanEmail });
    if (!existingAccount && !authUser) {
      // 1st time user: must sign up first
      return res.status(401).json({
        error: "Account required. 1st-time delegates must sign up before registering for an event.",
        requiresSignup: true,
      });
    }

    // If account exists, but request does not have valid authentication token
    if (!authUser) {
      return res.status(401).json({
        error: "Authentication required. Please sign in to your Arkham MUN account before registering for this event.",
        requiresLogin: true,
      });
    }

    const user = authUser;

    // Check duplicate registration for this user and event
    const existing = await Registration.findOne({ userId: user._id, eventId: targetEvent._id });
    if (existing) {
      return res.status(409).json({
        error: "You are already registered for this event.",
        alreadyRegistered: true,
        id: existing._id.toString(),
        amount: existing.amount,
        status: existing.status,
      });
    }

    const cleanUtr = typeof utr === "string" && utr.trim() ? utr.trim() : null;

    const registration = await Registration.create({
      userId: user._id,
      eventId: targetEvent._id,
      name: name.trim(),
      contact: user.email,
      email: user.email,
      phone: phone.trim(),
      organization: organization.trim(),
      committee: committee.trim(),
      amount: targetEvent.entryFee,
      utr: cleanUtr,
      status: "payment_submitted",
    });

    // Create user notification
    try {
      await Notification.create({
        userId: user._id,
        eventId: targetEvent._id,
        message: `Registration initiated for ${targetEvent.title}. Complete payment to receive your digital entry pass.`,
        type: "registration",
        read: false,
      });
    } catch {}

    res.status(201).json({
      id: registration._id.toString(),
      amount: registration.amount,
      status: registration.status,
    });
  } catch (err) {
    console.error("Start registration error:", err);
    res.status(500).json({ error: err?.message || "Failed to initiate registration." });
  }
});

// GET /api/registrations/:id
app.get("/api/registrations/:id", async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.id).populate("eventId");
    if (!reg) return res.status(404).json({ error: "Registration not found." });

    const eventDetails = reg.eventId
      ? {
          name: reg.eventId.title,
          date: reg.eventId.date,
          time: reg.eventId.time,
          venue: reg.eventId.venue,
        }
      : await getDefaultEventDetails();

    res.json({
      id: reg._id.toString(),
      amount: reg.amount,
      status: reg.status,
      reject_reason: reg.reject_reason,
      committee: reg.committee,
      organization: reg.organization,
      hasQr: Boolean(reg.entry_payload),
      event: eventDetails,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch registration status." });
  }
});

// POST /api/registrations/:id/payment-proof
app.post("/api/registrations/:id/payment-proof", upload.single("screenshot"), async (req, res, next) => {
  try {
    const utr = (req.body?.utr || "").trim();
    if (!utr || utr.length < 4 || utr.length > 50) {
      return res.status(400).json({ error: "A valid UTR or Transaction Reference number is required." });
    }

    const reg = await Registration.findById(req.params.id);
    if (!reg) return res.status(404).json({ error: "Registration not found." });

    // Store base64 data url directly in MongoDB so screenshots persist on Vercel
    let screenshotUrl = reg.screenshot_path;
    if (req.file) {
      const mime = req.file.mimetype;
      const base64Data = req.file.buffer.toString("base64");
      screenshotUrl = `data:${mime};base64,${base64Data}`;
    }

    reg.utr = utr;
    reg.screenshot_path = screenshotUrl;
    reg.reject_reason = null;
    reg.status = "payment_submitted";
    await reg.save();

    res.json({
      id: reg._id.toString(),
      status: "payment_submitted",
      message: "Payment proof uploaded successfully.",
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/registrations/:id/entry-qr
app.get("/api/registrations/:id/entry-qr", async (req, res, next) => {
  try {
    const reg = await Registration.findById(req.params.id).populate("eventId");
    if (!reg) return res.status(404).json({ error: "Registration not found." });
    if (reg.status !== "approved" || !reg.entry_payload) {
      return res.status(409).json({ error: "Pass is not yet approved." });
    }

    const qrDataUrl = await QRCode.toDataURL(reg.entry_payload, {
      margin: 2,
      width: 380,
      errorCorrectionLevel: "M",
    });

    const eventDetails = reg.eventId
      ? {
          name: reg.eventId.title,
          date: reg.eventId.date,
          time: reg.eventId.time,
          venue: reg.eventId.venue,
        }
      : await getDefaultEventDetails();

    res.json({
      payload: reg.entry_payload,
      qr: qrDataUrl,
      registrationId: reg._id.toString(),
      event: eventDetails,
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// 6. APPROVAL, REJECTION & EMAIL DISPATCH
// -------------------------------------------------------------

async function deliverApprovalEmail(registrationId) {
  const reg = await Registration.findById(registrationId).populate("eventId");
  if (!reg || !reg.email) {
    return { status: "not_configured", error: "Delegate email address missing." };
  }

  const eventDetails = reg.eventId
    ? {
        name: reg.eventId.title,
        date: reg.eventId.date,
        time: reg.eventId.time,
        venue: reg.eventId.venue,
      }
    : await getDefaultEventDetails();

  if (!mailer.isSmtpConfigured()) {
    return { status: "not_configured", error: "SMTP is not configured on this server." };
  }

  try {
    const qrBuffer = await QRCode.toBuffer(reg.entry_payload, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 360,
    });

    await mailer.sendApprovalMail({
      registration: {
        id: reg._id.toString(),
        name: reg.name,
        email: reg.email,
        committee: reg.committee,
        organization: reg.organization,
        amount: reg.amount,
      },
      event: eventDetails,
      qrBuffer,
    });

    const sentAt = new Date();
    reg.email_status = "sent";
    reg.email_sent_at = sentAt;
    reg.email_error = null;
    await reg.save();

    return { status: "sent", sentAt: sentAt.toISOString() };
  } catch (err) {
    const sanitized = mailer.sanitizeEmailError(err);
    reg.email_status = "failed";
    reg.email_error = sanitized;
    await reg.save();
    return { status: "failed", error: sanitized };
  }
}

// POST /api/admin/registrations/:id/approve
app.post("/api/admin/registrations/:id/approve", requireAdmin, async (req, res, next) => {
  try {
    const reg = await Registration.findById(req.params.id).populate("eventId");
    if (!reg) return res.status(404).json({ error: "Registration not found." });

    const eventDetails = reg.eventId
      ? {
          name: reg.eventId.title,
          date: reg.eventId.date,
          time: reg.eventId.time,
          venue: reg.eventId.venue,
        }
      : await getDefaultEventDetails();

    const payload = issueEntryPayload(reg, eventDetails);
    reg.status = "approved";
    reg.entry_payload = payload;
    await reg.save();

    // Create Notification in MongoDB for user
    await Notification.create({
      userId: reg.userId,
      eventId: reg.eventId ? reg.eventId._id : null,
      message: `Your registration for ${eventDetails.name} has been approved! Your official Entry Pass is ready on your dashboard.`,
      type: "approval",
      read: false,
    });

    // Deliver approval pass via email
    const emailResult = await deliverApprovalEmail(reg._id);

    res.json({
      id: reg._id.toString(),
      status: "approved",
      email: emailResult,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/registrations/:id/reject
app.post("/api/admin/registrations/:id/reject", requireAdmin, async (req, res) => {
  try {
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (!reason || reason.length > 500) {
      return res.status(400).json({ error: "A rejection reason is required (maximum 500 characters)." });
    }

    const reg = await Registration.findById(req.params.id).populate("eventId");
    if (!reg) return res.status(404).json({ error: "Registration not found." });

    reg.status = "rejected";
    reg.reject_reason = reason;
    await reg.save();

    const eventDetails = reg.eventId
      ? {
          name: reg.eventId.title,
          date: reg.eventId.date,
          time: reg.eventId.time,
          venue: reg.eventId.venue,
        }
      : await getDefaultEventDetails();

    // Notify user in MongoDB
    await Notification.create({
      userId: reg.userId,
      eventId: reg.eventId ? reg.eventId._id : null,
      message: `Registration payment rejected: ${reason}. Please update your UTR and resubmit.`,
      type: "rejection",
      read: false,
    });

    // Send email notification if SMTP configured
    let emailResult = { status: "not_configured" };
    if (mailer.isSmtpConfigured() && reg.email) {
      try {
        await mailer.sendRejectionMail({
          registration: {
            id: reg._id.toString(),
            name: reg.name,
            email: reg.email,
          },
          event: eventDetails,
          reason,
        });
        emailResult = { status: "sent" };
      } catch (err) {
        emailResult = { status: "failed", error: mailer.sanitizeEmailError(err) };
      }
    }

    res.json({
      id: reg._id.toString(),
      status: "rejected",
      reject_reason: reason,
      email: emailResult,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to reject registration." });
  }
});

// POST /api/admin/registrations/:id/retry-email
app.post("/api/admin/registrations/:id/retry-email", requireAdmin, async (req, res, next) => {
  try {
    const reg = await Registration.findById(req.params.id);
    if (!reg) return res.status(404).json({ error: "Registration not found." });
    if (reg.status !== "approved" || !reg.entry_payload) {
      return res.status(409).json({ error: "Only approved registrations can be sent an entry pass email." });
    }

    const emailResult = await deliverApprovalEmail(reg._id);
    res.json({ id: reg._id.toString(), email: emailResult });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// 7. VENUE CHECK-IN SCANNER
// -------------------------------------------------------------

// POST /api/entry/verify
app.post("/api/entry/verify", requireAdmin, async (req, res) => {
  try {
    const { payload, admit } = req.body || {};
    if (!payload || typeof payload !== "string") {
      return res.status(400).json({ error: "QR payload is required." });
    }

    const verified = verifyEntryPayload(payload);
    if (!verified) {
      return res.json({ valid: false, reason: "invalid" });
    }

    const reg = await Registration.findById(verified.id).populate("eventId");
    if (!reg || reg.status !== "approved") {
      return res.json({ valid: false, reason: "invalid" });
    }

    const eventDetails = reg.eventId
      ? {
          name: reg.eventId.title,
          date: reg.eventId.date,
          time: reg.eventId.time,
          venue: reg.eventId.venue,
        }
      : verified.event || (await getDefaultEventDetails());

    // If admit button was pressed, mark as checked-in
    if (admit && !reg.used_at) {
      reg.used_at = new Date();
      await reg.save();
    }

    const alreadyUsed = Boolean(reg.used_at);

    res.json({
      valid: true,
      alreadyUsed,
      registration: {
        id: reg._id.toString(),
        name: reg.name,
        email: reg.email,
        phone: reg.phone,
        organization: reg.organization,
        committee: reg.committee,
        amount: reg.amount,
        utr: reg.utr,
        paymentStatus: reg.status,
        checkedInAt: reg.used_at ? reg.used_at.toISOString() : null,
        event: eventDetails,
      },
    });
  } catch (err) {
    console.error("Venue verify error:", err);
    res.status(500).json({ error: "Failed to verify entry QR code." });
  }
});

// -------------------------------------------------------------
// 8. NOTIFICATIONS LOOKUP & CONTACT HELP DESK
// -------------------------------------------------------------

// GET /api/notifications/lookup
app.get("/api/notifications/lookup", async (req, res) => {
  try {
    const query = (req.query.q || "").trim().toLowerCase();
    const eventDetails = await getDefaultEventDetails();

    let registrations = [];
    let queries = [];

    if (query) {
      const foundRegs = await Registration.find({
        $or: [{ email: query }, { phone: query }, { _id: query.length === 24 ? query : null }],
      })
        .populate("eventId")
        .sort({ registeredAt: -1 });

      registrations = await Promise.all(
        foundRegs.map(async (r) => {
          let qrDataUrl = null;
          if (r.status === "approved" && r.entry_payload) {
            try {
              qrDataUrl = await QRCode.toDataURL(r.entry_payload, { margin: 2, width: 300 });
            } catch {}
          }
          return {
            id: r._id.toString(),
            name: r.name,
            email: r.email,
            phone: r.phone,
            organization: r.organization,
            committee: r.committee,
            amount: r.amount,
            status: r.status,
            utr: r.utr,
            reject_reason: r.reject_reason,
            hasQr: Boolean(r.entry_payload),
            qr: qrDataUrl,
            created_at: r.registeredAt ? r.registeredAt.toISOString() : new Date().toISOString(),
            event: r.eventId
              ? {
                  name: r.eventId.title,
                  date: r.eventId.date,
                  time: r.eventId.time,
                  venue: r.eventId.venue,
                }
              : eventDetails,
          };
        })
      );

      queries = await ContactQuery.find({ email: query }).sort({ createdAt: -1 });
    }

    res.json({
      query,
      registrations,
      queries,
      event: eventDetails,
      announcements: {
        registrationOpen: eventDetails.registrationOpen,
        registrationNotice: eventDetails.registrationNotice || "",
        conferenceDates: eventDetails.date,
        conferenceVenue: eventDetails.venue,
        conferenceTimings: eventDetails.time,
        conferenceName: eventDetails.name,
        countdownTarget: "2026-10-24T09:00:00",
      },
    });
  } catch (err) {
    console.error("Notifications lookup error:", err);
    res.status(500).json({ error: "Failed to look up notifications." });
  }
});

// POST /api/contact
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body || {};
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "Name, email, subject, and message are required." });
    }

    const query = await ContactQuery.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : null,
      subject: subject.trim(),
      message: message.trim(),
      status: "pending",
    });

    res.status(201).json({
      id: query._id.toString(),
      message: "Your message has been received by the secretariat.",
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit contact query." });
  }
});

// GET /api/admin/queries
app.get("/api/admin/queries", requireAdmin, async (req, res) => {
  try {
    const queries = await ContactQuery.find().sort({ createdAt: -1 });
    res.json({ queries });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch queries." });
  }
});

// POST /api/admin/queries/:id/reply
app.post("/api/admin/queries/:id/reply", requireAdmin, async (req, res, next) => {
  try {
    const { reply } = req.body || {};
    if (!reply || !reply.trim()) {
      return res.status(400).json({ error: "Reply message cannot be empty." });
    }

    const query = await ContactQuery.findById(req.params.id);
    if (!query) return res.status(404).json({ error: "Query not found." });

    query.status = "replied";
    query.reply_message = reply.trim();
    query.replied_at = new Date();
    await query.save();

    // If there is a registered user with this email, send them a Notification in MongoDB
    const user = await User.findOne({ email: query.email });
    if (user) {
      await Notification.create({
        userId: user._id,
        message: `Secretariat replied to your query "${query.subject}": ${reply.trim()}`,
        type: "reply",
        read: false,
      });
    }

    // Attempt email reply if configured
    let emailResult = { status: "not_configured" };
    if (mailer.isSmtpConfigured() && query.email) {
      try {
        await mailer.sendReplyMail({
          query: {
            id: query._id.toString(),
            name: query.name,
            email: query.email,
            subject: query.subject,
            message: query.message,
          },
          reply: reply.trim(),
          event: await getDefaultEventDetails(),
        });
        emailResult = { status: "sent" };
      } catch (err) {
        emailResult = { status: "failed", error: mailer.sanitizeEmailError(err) };
      }
    }

    res.json({
      id: query._id.toString(),
      status: "replied",
      email: emailResult,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/settings
app.get("/api/admin/settings", requireAdmin, async (req, res) => {
  try {
    const details = await getDefaultEventDetails();
    res.json({
      event: {
        name: details.name,
        date: details.date,
        time: details.time,
        venue: details.venue,
      },
      amount: details.amount,
      upiId: details.upiId || "chauhan5408k@okaxis",
      registrationOpen: details.registrationOpen,
      registrationNotice: details.registrationNotice || "",
      paymentQrConfigured: Boolean(details.paymentQrUrl),
      paymentQrUrl: details.paymentQrUrl || "/api/payment-qr.png",
      formSections: details.formSections || defaultFormSections,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load admin settings." });
  }
});

// POST /api/admin/payment-qr (Upload custom payment QR poster image)
app.post("/api/admin/payment-qr", requireAdmin, upload.single("paymentQr"), async (req, res, next) => {
  try {
    let currentEvent = await Event.findOne({ registrationOpen: true }).sort({ createdAt: -1 });
    if (!currentEvent) {
      currentEvent = await Event.create({
        title: "Arkham MUN 2026",
        date: "October 24-25, 2026",
        venue: "Central Delhi, India",
      });
    }

    let qrUrl = null;
    if (req.file) {
      const mime = req.file.mimetype;
      const base64Data = req.file.buffer.toString("base64");
      qrUrl = `data:${mime};base64,${base64Data}`;
    } else if (req.body?.paymentQrUrl) {
      qrUrl = req.body.paymentQrUrl.trim();
    }

    if (!qrUrl) {
      return res.status(400).json({ error: "Please upload an image file (PNG, JPG, WebP) or provide a payment QR image URL." });
    }

    currentEvent.paymentQrUrl = qrUrl;
    if (!currentEvent.formSections) currentEvent.formSections = { ...defaultFormSections };
    if (!currentEvent.formSections.paymentSection) currentEvent.formSections.paymentSection = {};
    currentEvent.formSections.paymentSection.paymentQrUrl = qrUrl;

    await currentEvent.save();

    res.json({
      success: true,
      paymentQrConfigured: true,
      paymentQrUrl: qrUrl,
      message: "Payment QR poster successfully uploaded and updated.",
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/settings
app.put("/api/admin/settings", requireAdmin, async (req, res) => {
  try {
    const { event, amount, upiId, registrationOpen, registrationNotice, paymentQrUrl, formSections } = req.body || {};

    let currentEvent = await Event.findOne({ registrationOpen: true }).sort({ createdAt: -1 });
    if (!currentEvent) {
      currentEvent = await Event.create({
        title: "Arkham MUN 2026",
        date: "October 24-25, 2026",
        venue: "Central Delhi, India",
      });
    }

    if (event?.name) currentEvent.title = event.name.trim();
    if (event?.date) currentEvent.date = event.date.trim();
    if (event?.time) currentEvent.time = event.time.trim();
    if (event?.venue) currentEvent.venue = event.venue.trim();
    if (amount !== undefined) currentEvent.entryFee = Number(amount);
    if (upiId !== undefined) currentEvent.upiId = upiId.trim();
    if (registrationOpen !== undefined) currentEvent.registrationOpen = Boolean(registrationOpen);
    if (registrationNotice !== undefined) currentEvent.registrationNotice = registrationNotice.trim();
    if (paymentQrUrl !== undefined) currentEvent.paymentQrUrl = paymentQrUrl;
    if (formSections) {
      currentEvent.formSections = {
        ...(currentEvent.formSections || defaultFormSections),
        ...formSections,
      };
      if (formSections.paymentSection?.paymentQrUrl !== undefined) {
        currentEvent.paymentQrUrl = formSections.paymentSection.paymentQrUrl;
      }
    }

    await currentEvent.save();

    res.json({
      event: {
        name: currentEvent.title,
        date: currentEvent.date,
        time: currentEvent.time,
        venue: currentEvent.venue,
      },
      amount: currentEvent.entryFee,
      upiId: currentEvent.upiId,
      registrationOpen: currentEvent.registrationOpen,
      registrationNotice: currentEvent.registrationNotice,
      paymentQrConfigured: Boolean(currentEvent.paymentQrUrl),
      paymentQrUrl: currentEvent.paymentQrUrl || "/api/payment-qr.png",
      formSections: currentEvent.formSections || defaultFormSections,
      message: "Conference and registration form settings successfully updated.",
    });
  } catch (err) {
    console.error("Save admin settings error:", err);
    res.status(500).json({ error: "Failed to update admin settings." });
  }
});

// Start Server or Export for Vercel Serverless
if (require.main === module) {
  app.listen(port, () => {
    console.log(`[Arkham MUN Backend] Running on http://localhost:${port}`);
  });
}

module.exports = app;
