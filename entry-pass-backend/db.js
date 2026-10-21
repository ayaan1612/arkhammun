const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Cache connection across Vercel serverless function invocations
let cached = global.mongooseConnection;
if (!cached) {
  cached = global.mongooseConnection = { conn: null, promise: null };
}

// -------------------------------------------------------------
// 1. DATA SCHEMAS
// -------------------------------------------------------------

// User Schema
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "users" }
);

// Event Schema
const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    date: { type: String, required: true },
    venue: { type: String, required: true },
    time: { type: String, default: "09:00 AM - 05:00 PM" },
    entryFee: { type: Number, default: 2200 },
    upiId: { type: String, default: "chauhan5408k@okaxis" },
    registrationOpen: { type: Boolean, default: true },
    registrationNotice: { type: String, default: "" },
    paymentQrUrl: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "events" }
);

// Registration Schema
const registrationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    registeredAt: { type: Date, default: Date.now },
    name: { type: String, required: true, trim: true },
    contact: { type: String, default: "" },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, default: "" },
    organization: { type: String, default: "" },
    committee: { type: String, default: "" },
    amount: { type: Number, default: 2200 },
    status: {
      type: String,
      enum: ["pending_payment", "payment_submitted", "approved", "rejected"],
      default: "payment_submitted",
    },
    utr: { type: String, default: null },
    screenshot_path: { type: String, default: null },
    reject_reason: { type: String, default: null },
    entry_payload: { type: String, default: null },
    used_at: { type: Date, default: null },
    email_status: { type: String, default: null },
    email_sent_at: { type: Date, default: null },
    email_error: { type: String, default: null },
  },
  { collection: "registrations" }
);

// Unique compound index: No duplicate registration per user and event
registrationSchema.index({ userId: 1, eventId: 1 }, { unique: true });

// Notification Schema
const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", default: null },
    type: {
      type: String,
      enum: ["system", "registration", "approval", "rejection", "announcement", "reply"],
      default: "system",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "notifications" }
);

// Contact Inquiry Schema
const contactQuerySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: null },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: ["pending", "replied"], default: "pending" },
    reply_message: { type: String, default: null },
    replied_at: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { collection: "contact_queries" }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
const Event = mongoose.models.Event || mongoose.model("Event", eventSchema);
const Registration = mongoose.models.Registration || mongoose.model("Registration", registrationSchema);
const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
const ContactQuery = mongoose.models.ContactQuery || mongoose.model("ContactQuery", contactQuerySchema);

// -------------------------------------------------------------
// 2. CONNECTION FUNCTION WITH SERVERLESS CACHING
// -------------------------------------------------------------
async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return null;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
    };
    cached.promise = mongoose.connect(uri, opts).then(async (m) => {
      console.log("[MongoDB] Connected successfully to MongoDB Atlas");
      await seedDefaults();
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error("[MongoDB] Connection error:", error.message);
    throw error;
  }

  return cached.conn;
}

// -------------------------------------------------------------
// 3. SEED INITIAL DEFAULTS (Arkham Conference & First Admin)
// -------------------------------------------------------------
async function seedDefaults() {
  try {
    // 1. Seed default Event if database has 0 events
    const eventCount = await Event.countDocuments();
    if (eventCount === 0) {
      await Event.create({
        title: "Arkham MUN 2026",
        description:
          "Arkham Model United Nations — diplomacy, debate and ideas that move nations. Join international delegates and future leaders.",
        date: "October 24-25, 2026",
        venue: "Arkham Assembly Hall & International Dais, New Delhi",
        time: "09:00 AM - 05:00 PM",
        entryFee: Number(process.env.ENTRY_FEE) || 2200,
        upiId: "chauhan5408k@okaxis",
        registrationOpen: true,
        registrationNotice: "Early bird delegate registration is currently live. Limited seats per committee.",
      });
      console.log("[MongoDB Seed] Created initial Arkham MUN 2026 conference event");
    }

    // 2. Seed Admin user if ADMIN_EMAIL is set
    const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    if (adminEmail) {
      const existingAdmin = await User.findOne({ email: adminEmail });
      if (!existingAdmin) {
        const defaultPassword = process.env.ADMIN_PASSWORD || "AdminArkham2026!";
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(defaultPassword, salt);
        await User.create({
          name: "Arkham MUN Administrator",
          email: adminEmail,
          passwordHash,
          role: "admin",
        });
        console.log(`[MongoDB Seed] Created initial admin user for ${adminEmail}`);
      } else if (existingAdmin.role !== "admin") {
        existingAdmin.role = "admin";
        await existingAdmin.save();
        console.log(`[MongoDB Seed] Elevated ${adminEmail} to admin role`);
      }
    }
  } catch (seedErr) {
    console.error("[MongoDB Seed] Error during seed:", seedErr.message);
  }
}

module.exports = {
  connectToDatabase,
  User,
  Event,
  Registration,
  Notification,
  ContactQuery,
};
