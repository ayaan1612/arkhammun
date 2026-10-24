const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (e) {
  // Ignore in restricted environments
}

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Cache connection across Vercel serverless function invocations
let cached = global.mongooseConnection;
if (!cached) {
  cached = global.mongooseConnection = { conn: null, promise: null };
}

// -------------------------------------------------------------
// 1. DATA SCHEMAS (Mongoose)
// -------------------------------------------------------------

// Default Form Configuration
const defaultFormSections = {
  delegateDetails: {
    title: "Delegate details",
    instructions: "Enter your official delegate information for verification and certification.",
    gradeLabel: "Class / Year / Grade",
    gradePlaceholder: "e.g. 11th Grade / 2nd Year",
  },
  experience: {
    title: "Experience",
    tiers: ["0-5", "5-12", "12-20", "20+"],
  },
  committees: {
    title: "Committee preferences",
    items: [
      "UNCSW (Advancing Women's Protection, Leadership and Rights in Conflict Zones, with Special Emphasis on the Russia–Ukraine War.)",
      "UNGA (Strengthening Nuclear Weapon-Free Zones, with a Focus on the Middle East and South Asia.)",
      "Lok Sabha (Indian parliamentary committee simulation.)",
      "IPL — Mega Auction (Simulated IPL Mega Auction committee.)",
      "IP — International Press (Journalists, Caricaturists and Photographers to Cover Conference Proceedings.)",
      "UNODC (Human Rights Implications of the Global War on Drugs.)",
      "WHO (Strengthening Global Preparedness for Future Pandemics and Ensuring Fair Access to Vaccines, Diagnostics and Treatments for All Countries.)",
      "UNEP (Protecting Global Biodiversity While Balancing Economic Growth and Environmental Sustainability.)",
      "AIPPM (Use of Central Agencies (ED/CBI): Law Enforcement Tool or Political Tool?)",
      "UNHRC (Deliberating on safeguarding Political Leaders under International Human Rights Law.)",
    ],
  },
  portfolioPreferences: {
    title: "Portfolio preferences",
    flexiblePrompt: "Are you open to being assigned to any committee or portfolio if your top preferences are full?",
  },
  references: {
    title: "References",
    label: "CA Reference (IF NO TYPE NIL)",
    placeholder: "NIL",
  },
  paymentSection: {
    title: "Payment & Verification",
    note: "Scan the official Arkham MUN UPI QR poster below in any payment app (Google Pay, PhonePe, Paytm, etc.). Then enter the UPI Transaction Reference (UTR), upload your screenshot, and check the payment confirmation box.",
    paymentQrUrl: null,
  },
  specialRequests: {
    title: "Special requests / Notes",
    placeholder: "Any dietary restrictions, special accommodations, or notes for the secretariat",
  },
};

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
    registrationDeadline: { type: Date, default: null },
    registrationNotice: { type: String, default: "" },
    paymentQrUrl: { type: String, default: null },
    formSections: { type: Object, default: defaultFormSections },
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

const RealUser = mongoose.models.User || mongoose.model("User", userSchema);
const RealEvent = mongoose.models.Event || mongoose.model("Event", eventSchema);
const RealRegistration = mongoose.models.Registration || mongoose.model("Registration", registrationSchema);
const RealNotification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
const RealContactQuery = mongoose.models.ContactQuery || mongoose.model("ContactQuery", contactQuerySchema);

// Disable buffering so disconnected calls don't hang for 10 seconds
mongoose.set("bufferCommands", false);

// -------------------------------------------------------------
// 2. IN-MEMORY RESILIENT FALLBACK DATA STORE
// (Ensures zero-downtime if MONGODB_URI is pending in Vercel)
// -------------------------------------------------------------

const memoryStore = {
  users: [],
  events: [],
  registrations: [],
  notifications: [],
  queries: [],
};

// Seed default event into memory
const defaultMemoryEventId = new mongoose.Types.ObjectId();
memoryStore.events.push({
  _id: defaultMemoryEventId,
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
  paymentQrUrl: null,
  formSections: { ...defaultFormSections },
  createdAt: new Date(),
  save: async function () {
    const idx = memoryStore.events.findIndex((e) => e._id.toString() === this._id.toString());
    if (idx >= 0) memoryStore.events[idx] = this;
    else memoryStore.events.push(this);
    return this;
  },
});

function matchesQuery(doc, query = {}) {
  if (!doc) return false;
  for (const [key, val] of Object.entries(query)) {
    if (val === undefined) continue;
    if (key === "$or" && Array.isArray(val)) {
      const anyMatch = val.some((subQ) => matchesQuery(doc, subQ));
      if (!anyMatch) return false;
    } else if (key === "_id" || key === "id") {
      const docId = doc._id ? doc._id.toString() : String(doc.id);
      const targetId = val && val.toString ? val.toString() : String(val);
      if (docId !== targetId) return false;
    } else if (key === "userId" || key === "eventId") {
      const docVal = doc[key] ? (doc[key]._id ? doc[key]._id.toString() : doc[key].toString()) : "";
      const targetVal = val && val.toString ? val.toString() : String(val);
      if (docVal !== targetVal) return false;
    } else if (val && typeof val === "object" && Array.isArray(val.$in)) {
      if (!val.$in.includes(doc[key])) return false;
    } else if (val && typeof val === "object" && val.$regex) {
      const regex = new RegExp(val.$regex, val.$options || "");
      if (!regex.test(String(doc[key] || ""))) return false;
    } else if (typeof val === "boolean") {
      if (Boolean(doc[key]) !== val) return false;
    } else if (doc[key] !== val) {
      return false;
    }
  }
  return true;
}

function cloneDoc(doc, collectionName) {
  if (!doc) return null;
  const copy = { ...doc };
  copy._collectionName = collectionName;
  copy.save = async function () {
    const col = this._collectionName || collectionName;
    if (col && memoryStore[col]) {
      const targetId = (this._id || copy._id).toString();
      const idx = memoryStore[col].findIndex(
        (d) => d._id && d._id.toString() === targetId
      );
      const toSave = { ...this };
      if (idx >= 0) {
        memoryStore[col][idx] = toSave;
      } else {
        memoryStore[col].push(toSave);
      }
    }
    return this;
  };
  return copy;
}

class FallbackQuery {
  constructor(promise) {
    this._promise = promise;
  }
  sort(criteria) {
    this._promise = this._promise.then((res) => {
      if (!Array.isArray(res)) return res;
      const [field, dir] = Object.entries(criteria || {})[0] || [];
      if (!field) return res;
      const order = dir === -1 || dir === "desc" ? -1 : 1;
      return [...res].sort((a, b) => {
        const valA = a[field] instanceof Date ? a[field].getTime() : a[field];
        const valB = b[field] instanceof Date ? b[field].getTime() : b[field];
        if (valA < valB) return -1 * order;
        if (valA > valB) return 1 * order;
        return 0;
      });
    });
    return this;
  }
  populate(field) {
    this._promise = this._promise.then((res) => {
      if (!res) return res;
      const populateOne = (item) => {
        if (!item) return item;
        const copy = cloneDoc(item, item._collectionName || "registrations");
        if (field === "eventId" && copy.eventId) {
          const evId = copy.eventId._id ? copy.eventId._id.toString() : copy.eventId.toString();
          const found = memoryStore.events.find((e) => e._id.toString() === evId);
          if (found) copy.eventId = cloneDoc(found, "events");
        } else if (field === "userId" && copy.userId) {
          const uId = copy.userId._id ? copy.userId._id.toString() : copy.userId.toString();
          const found = memoryStore.users.find((u) => u._id.toString() === uId);
          if (found) copy.userId = cloneDoc(found, "users");
        }
        return copy;
      };
      if (Array.isArray(res)) return res.map(populateOne);
      return populateOne(res);
    });
    return this;
  }
  select(fields) {
    this._promise = this._promise.then((res) => {
      if (!res) return res;
      const stripOne = (item) => {
        if (!item || typeof item !== "object") return item;
        const copy = { ...item };
        if (typeof fields === "string") {
          for (const token of fields.split(" ")) {
            if (token.startsWith("-")) {
              delete copy[token.slice(1)];
            }
          }
        }
        return copy;
      };
      if (Array.isArray(res)) return res.map(stripOne);
      return stripOne(res);
    });
    return this;
  }
  then(resolve, reject) {
    return this._promise.then(resolve, reject);
  }
  catch(reject) {
    return this._promise.catch(reject);
  }
}

// -------------------------------------------------------------
// 3. HYBRID PROXIES (Auto-switches to MongoDB Atlas when active)
// -------------------------------------------------------------

function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

const User = {
  findOne(query) {
    if (isMongoConnected()) return RealUser.findOne(query);
    const found = memoryStore.users.find((u) => matchesQuery(u, query));
    return new FallbackQuery(Promise.resolve(found ? cloneDoc(found, "users") : null));
  },
  findById(id) {
    if (isMongoConnected()) return RealUser.findById(id);
    const targetId = id && id.toString ? id.toString() : String(id);
    const found = memoryStore.users.find((u) => u._id.toString() === targetId);
    return new FallbackQuery(Promise.resolve(found ? cloneDoc(found, "users") : null));
  },
  find(query = {}) {
    if (isMongoConnected()) return RealUser.find(query);
    const list = memoryStore.users.filter((u) => matchesQuery(u, query)).map((u) => cloneDoc(u, "users"));
    return new FallbackQuery(Promise.resolve(list));
  },
  async create(data) {
    if (isMongoConnected()) return RealUser.create(data);
    const existing = memoryStore.users.find(
      (u) => u.email && u.email.toLowerCase() === (data.email || "").toLowerCase()
    );
    if (existing) {
      const err = new Error("E11000 duplicate key error: An account with this email address already exists.");
      err.code = 11000;
      throw err;
    }
    const doc = {
      _id: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
      role: "user",
      ...data,
    };
    doc.save = async function () {
      const idx = memoryStore.users.findIndex((u) => u._id.toString() === doc._id.toString());
      if (idx >= 0) memoryStore.users[idx] = { ...doc };
      else memoryStore.users.push(doc);
      return doc;
    };
    memoryStore.users.push(doc);
    return cloneDoc(doc, "users");
  },
  async findByIdAndUpdate(id, update, opts = {}) {
    if (isMongoConnected()) return RealUser.findByIdAndUpdate(id, update, opts);
    const targetId = id && id.toString ? id.toString() : String(id);
    const idx = memoryStore.users.findIndex((u) => u._id.toString() === targetId);
    if (idx < 0) return null;
    const existing = memoryStore.users[idx];
    const updateFields = update.$set ? { ...update.$set } : { ...update };
    delete updateFields.$set;
    const updated = { ...existing, ...updateFields };
    memoryStore.users[idx] = updated;
    return cloneDoc(updated, "users");
  },
};

const Event = {
  findOne(query = {}) {
    if (isMongoConnected()) return RealEvent.findOne(query);
    const found = memoryStore.events.find((e) => matchesQuery(e, query));
    return new FallbackQuery(Promise.resolve(found ? cloneDoc(found, "events") : null));
  },
  findById(id) {
    if (isMongoConnected()) return RealEvent.findById(id);
    const targetId = id && id.toString ? id.toString() : String(id);
    const found = memoryStore.events.find((e) => e._id.toString() === targetId);
    return new FallbackQuery(Promise.resolve(found ? cloneDoc(found, "events") : null));
  },
  find(query = {}) {
    if (isMongoConnected()) return RealEvent.find(query);
    const list = memoryStore.events.filter((e) => matchesQuery(e, query)).map((e) => cloneDoc(e, "events"));
    return new FallbackQuery(Promise.resolve(list));
  },
  async create(data) {
    if (isMongoConnected()) return RealEvent.create(data);
    const doc = {
      _id: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
      registrationOpen: true,
      entryFee: 2200,
      upiId: "chauhan5408k@okaxis",
      formSections: { ...defaultFormSections },
      ...data,
    };
    doc.save = async function () {
      const idx = memoryStore.events.findIndex((e) => e._id.toString() === doc._id.toString());
      if (idx >= 0) memoryStore.events[idx] = { ...doc };
      else memoryStore.events.push(doc);
      return doc;
    };
    memoryStore.events.push(doc);
    return cloneDoc(doc, "events");
  },
  async findByIdAndUpdate(id, update, opts = {}) {
    if (isMongoConnected()) return RealEvent.findByIdAndUpdate(id, update, opts);
    const targetId = id && id.toString ? id.toString() : String(id);
    const idx = memoryStore.events.findIndex((e) => e._id.toString() === targetId);
    if (idx < 0) return null;
    const existing = memoryStore.events[idx];
    const updated = { ...existing, ...update };
    updated.save = async function () {
      return updated;
    };
    memoryStore.events[idx] = updated;
    return cloneDoc(updated, "events");
  },
  async findByIdAndDelete(id) {
    if (isMongoConnected()) return RealEvent.findByIdAndDelete(id);
    const targetId = id && id.toString ? id.toString() : String(id);
    const idx = memoryStore.events.findIndex((e) => e._id.toString() === targetId);
    if (idx < 0) return null;
    const deleted = memoryStore.events.splice(idx, 1)[0];
    return deleted;
  },
  async countDocuments(query = {}) {
    if (isMongoConnected()) return RealEvent.countDocuments(query);
    return memoryStore.events.filter((e) => matchesQuery(e, query)).length;
  },
};

const Registration = {
  findOne(query) {
    if (isMongoConnected()) return RealRegistration.findOne(query);
    const found = memoryStore.registrations.find((r) => matchesQuery(r, query));
    return new FallbackQuery(Promise.resolve(found ? cloneDoc(found, "registrations") : null));
  },
  findById(id) {
    if (isMongoConnected()) return RealRegistration.findById(id);
    const targetId = id && id.toString ? id.toString() : String(id);
    const found = memoryStore.registrations.find((r) => r._id.toString() === targetId);
    return new FallbackQuery(Promise.resolve(found ? cloneDoc(found, "registrations") : null));
  },
  find(query = {}) {
    if (isMongoConnected()) return RealRegistration.find(query);
    const list = memoryStore.registrations
      .filter((r) => matchesQuery(r, query))
      .map((r) => cloneDoc(r, "registrations"));
    return new FallbackQuery(Promise.resolve(list));
  },
  async create(data) {
    if (isMongoConnected()) return RealRegistration.create(data);
    const doc = {
      _id: new mongoose.Types.ObjectId(),
      registeredAt: new Date(),
      status: "payment_submitted",
      ...data,
    };
    doc.save = async function () {
      const idx = memoryStore.registrations.findIndex((r) => r._id.toString() === doc._id.toString());
      if (idx >= 0) memoryStore.registrations[idx] = { ...doc };
      else memoryStore.registrations.push(doc);
      return doc;
    };
    memoryStore.registrations.push(doc);
    return cloneDoc(doc, "registrations");
  },
  async deleteMany(query = {}) {
    if (isMongoConnected()) return RealRegistration.deleteMany(query);
    const before = memoryStore.registrations.length;
    memoryStore.registrations = memoryStore.registrations.filter((r) => !matchesQuery(r, query));
    return { deletedCount: before - memoryStore.registrations.length };
  },
  async findByIdAndUpdate(id, update, opts = {}) {
    if (isMongoConnected()) return RealRegistration.findByIdAndUpdate(id, update, opts);
    const targetId = id && id.toString ? id.toString() : String(id);
    const idx = memoryStore.registrations.findIndex((r) => r._id && r._id.toString() === targetId);
    if (idx < 0) return null;
    const current = memoryStore.registrations[idx];
    const updateFields = update.$set ? { ...update.$set } : { ...update };
    delete updateFields.$set;
    const updated = { ...current, ...updateFields };
    memoryStore.registrations[idx] = updated;
    return cloneDoc(updated, "registrations");
  },
  async countDocuments(query = {}) {
    if (isMongoConnected()) return RealRegistration.countDocuments(query);
    return memoryStore.registrations.filter((r) => matchesQuery(r, query)).length;
  },
};

const Notification = {
  find(query = {}) {
    if (isMongoConnected()) return RealNotification.find(query);
    const list = memoryStore.notifications
      .filter((n) => matchesQuery(n, query))
      .map((n) => cloneDoc(n, "notifications"));
    return new FallbackQuery(Promise.resolve(list));
  },
  async countDocuments(query = {}) {
    if (isMongoConnected()) return RealNotification.countDocuments(query);
    return memoryStore.notifications.filter((n) => matchesQuery(n, query)).length;
  },
  async create(data) {
    if (isMongoConnected()) return RealNotification.create(data);
    const doc = {
      _id: new mongoose.Types.ObjectId(),
      read: false,
      createdAt: new Date(),
      ...data,
    };
    doc.save = async function () {
      return doc;
    };
    memoryStore.notifications.push(doc);
    return cloneDoc(doc, "notifications");
  },
  async insertMany(docs = []) {
    if (isMongoConnected()) return RealNotification.insertMany(docs);
    const created = docs.map((d) => ({
      _id: new mongoose.Types.ObjectId(),
      read: false,
      createdAt: new Date(),
      ...d,
      save: async function () {
        return this;
      },
    }));
    memoryStore.notifications.push(...created);
    return created;
  },
  async findOneAndUpdate(query, update, opts = {}) {
    if (isMongoConnected()) return RealNotification.findOneAndUpdate(query, update, opts);
    const found = memoryStore.notifications.find((n) => matchesQuery(n, query));
    if (!found) return null;
    Object.assign(found, update);
    return cloneDoc(found, "notifications");
  },
  async deleteMany(query = {}) {
    if (isMongoConnected()) return RealNotification.deleteMany(query);
    const before = memoryStore.notifications.length;
    memoryStore.notifications = memoryStore.notifications.filter((n) => !matchesQuery(n, query));
    return { deletedCount: before - memoryStore.notifications.length };
  },
};

const ContactQuery = {
  find(query = {}) {
    if (isMongoConnected()) return RealContactQuery.find(query);
    const list = memoryStore.queries
      .filter((q) => matchesQuery(q, query))
      .map((q) => cloneDoc(q, "queries"));
    return new FallbackQuery(Promise.resolve(list));
  },
  findById(id) {
    if (isMongoConnected()) return RealContactQuery.findById(id);
    const targetId = id && id.toString ? id.toString() : String(id);
    const found = memoryStore.queries.find((q) => q._id.toString() === targetId);
    return new FallbackQuery(Promise.resolve(found ? cloneDoc(found, "queries") : null));
  },
  async create(data) {
    if (isMongoConnected()) return RealContactQuery.create(data);
    const doc = {
      _id: new mongoose.Types.ObjectId(),
      status: "pending",
      createdAt: new Date(),
      ...data,
    };
    doc.save = async function () {
      const idx = memoryStore.queries.findIndex((q) => q._id.toString() === doc._id.toString());
      if (idx >= 0) memoryStore.queries[idx] = { ...doc };
      else memoryStore.queries.push(doc);
      return doc;
    };
    memoryStore.queries.push(doc);
    return cloneDoc(doc, "queries");
  },
  async findByIdAndUpdate(id, update, opts = {}) {
    if (isMongoConnected()) return RealContactQuery.findByIdAndUpdate(id, update, opts);
    const targetId = id && id.toString ? id.toString() : String(id);
    const idx = memoryStore.queries.findIndex((q) => q._id && q._id.toString() === targetId);
    if (idx < 0) return null;
    const current = memoryStore.queries[idx];
    const updateFields = update.$set ? { ...update.$set } : { ...update };
    delete updateFields.$set;
    const updated = { ...current, ...updateFields };
    memoryStore.queries[idx] = updated;
    return cloneDoc(updated, "queries");
  },
};

// -------------------------------------------------------------
// 4. CONNECTION FUNCTION WITH SERVERLESS REUSE & 5S TIMEOUT
// -------------------------------------------------------------
async function connectToDatabase() {
  const defaultAtlasUri =
    "mongodb+srv://arkhammun2026_db_user:arkummun12345@cluster0.iod6fwu.mongodb.net/arkhammun?retryWrites=true&w=majority";
  const uri = process.env.MONGODB_URI || defaultAtlasUri;
  if (!uri) {
    return null;
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    };
    cached.promise = mongoose
      .connect(uri, opts)
      .then(async (m) => {
        console.log("[MongoDB Atlas] Connected successfully to cloud database");
        await seedDefaults();
        return m;
      })
      .catch((error) => {
        cached.promise = null;
        console.warn("[MongoDB Atlas] Connection attempt failed (using resilient fallback store):", error.message);
        return null;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    cached.conn = null;
    cached.promise = null;
    return null;
  }
}

// -------------------------------------------------------------
// 5. SEED INITIAL DEFAULTS TO MONGODB ATLAS
// -------------------------------------------------------------
async function seedDefaults() {
  try {
    const eventCount = await RealEvent.countDocuments();
    if (eventCount === 0) {
      await RealEvent.create({
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
        paymentQrUrl: null,
        formSections: { ...defaultFormSections },
      });
      console.log("[MongoDB Seed] Created initial Arkham MUN 2026 conference event");
    }

    const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    if (adminEmail) {
      const existingAdmin = await RealUser.findOne({ email: adminEmail });
      if (!existingAdmin) {
        const defaultPassword = process.env.ADMIN_PASSWORD || "AdminArkham2026!";
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(defaultPassword, salt);
        await RealUser.create({
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
  isMongoConnected,
  defaultFormSections,
  memoryStore,
  RealUser,
  RealEvent,
  RealRegistration,
  RealNotification,
  RealContactQuery,
  User,
  Event,
  Registration,
  Notification,
  ContactQuery,
};
