const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const collections = {
  User: [],
  Analysis: [],
  CustomWord: [],
  Activity: [],
  FaceEnrollment: [],
  Passkey: [],
  PasswordReset: [],
  PasswordlessChallenge: [],
  WebAuthnChallenge: [],
};

// Seed default admin, demo user, custom words, and sample analyses
function seedDefaultData() {
  if (collections.User.length > 0) return;

  const adminId = new mongoose.Types.ObjectId().toString();
  const userId = new mongoose.Types.ObjectId().toString();
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  const adminPasswordHash = bcrypt.hashSync("Admin@123456", 10);
  const userPasswordHash = bcrypt.hashSync("User@123456", 10);

  collections.User.push(
    {
      _id: adminId,
      name: "System Admin",
      email: "admin@toxicguard.com",
      password: adminPasswordHash,
      role: "admin",
      faceVerificationEnabled: false,
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    },
    {
      _id: userId,
      name: "Alex Rivera",
      email: "user@toxicguard.com",
      password: userPasswordHash,
      role: "user",
      faceVerificationEnabled: false,
      createdAt: yesterday,
      updatedAt: yesterday,
    }
  );

  collections.CustomWord.push(
    {
      _id: new mongoose.Types.ObjectId().toString(),
      word: "scammer",
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      word: "spambot",
      createdAt: yesterday,
      updatedAt: yesterday,
    }
  );

  collections.Analysis.push(
    {
      _id: new mongoose.Types.ObjectId().toString(),
      user: userId,
      comment: "Thank you for sharing this tutorial, it was super helpful and clear!",
      result: "Safe",
      category: "Non-Toxic",
      confidence: 97.4,
      detectedLabels: [],
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      user: userId,
      comment: "You are a complete idiot and nobody wants to hear your garbage.",
      result: "Toxic",
      category: "Insult",
      confidence: 92.8,
      detectedLabels: ["toxic", "insult"],
      createdAt: yesterday,
      updatedAt: yesterday,
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      user: adminId,
      comment: "Great community guidelines update. Looking forward to the next release.",
      result: "Safe",
      category: "Non-Toxic",
      confidence: 98.9,
      detectedLabels: [],
      createdAt: now,
      updatedAt: now,
    }
  );

  collections.Activity.push(
    {
      _id: new mongoose.Types.ObjectId().toString(),
      user: adminId,
      userName: "System Admin",
      userEmail: "admin@toxicguard.com",
      action: "LOGIN",
      details: "Admin session initialized",
      ipAddress: "127.0.0.1",
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      user: userId,
      userName: "Alex Rivera",
      userEmail: "user@toxicguard.com",
      action: "ANALYSIS",
      details: "Comment analyzed. Result: Toxic; Category: Insult",
      ipAddress: "127.0.0.1",
      createdAt: yesterday,
      updatedAt: yesterday,
    }
  );
}

seedDefaultData();

function normalizeVal(v) {
  if (v && typeof v === "object" && v._id) return String(v._id);
  if (v instanceof mongoose.Types.ObjectId) return v.toString();
  return v;
}

function matchesFilter(doc, filter = {}) {
  if (!filter || Object.keys(filter).length === 0) return true;

  for (const [key, cond] of Object.entries(filter)) {
    if (cond === undefined) continue;

    if (key === "$or" && Array.isArray(cond)) {
      if (!cond.some((sub) => matchesFilter(doc, sub))) return false;
      continue;
    }

    const docVal = doc[key];

    if (cond && typeof cond === "object" && !(cond instanceof Date) && !(cond instanceof mongoose.Types.ObjectId)) {
      if ("$regex" in cond) {
        const flags = cond.$options || "";
        const re = cond.$regex instanceof RegExp ? cond.$regex : new RegExp(cond.$regex, flags);
        if (!re.test(String(docVal ?? ""))) return false;
        continue;
      }
      if ("$gte" in cond || "$lte" in cond || "$gt" in cond || "$lt" in cond) {
        const dVal = docVal instanceof Date ? docVal.getTime() : new Date(docVal).getTime();
        if (cond.$gte !== undefined && dVal < new Date(cond.$gte).getTime()) return false;
        if (cond.$gt !== undefined && dVal <= new Date(cond.$gt).getTime()) return false;
        if (cond.$lte !== undefined && dVal > new Date(cond.$lte).getTime()) return false;
        if (cond.$lt !== undefined && dVal >= new Date(cond.$lt).getTime()) return false;
        continue;
      }
    }

    if (String(normalizeVal(docVal)) !== String(normalizeVal(cond))) {
      return false;
    }
  }

  return true;
}

function wrapDoc(collectionName, rawDoc, selectStr = "") {
  if (!rawDoc) return null;
  const copy = { ...rawDoc };

  // By default hide password and encryptedDescriptor unless explicitly requested with +
  const includePassword = selectStr.includes("+password");
  const excludePassword = selectStr.includes("-password");
  const includeEncrypted = selectStr.includes("+encryptedDescriptor");

  if (collectionName === "User" && !includePassword && excludePassword) {
    delete copy.password;
  }
  if (collectionName === "FaceEnrollment" && !includeEncrypted && selectStr !== "") {
    if (!selectStr.includes("encryptedDescriptor")) {
      delete copy.encryptedDescriptor;
    }
  }

  Object.defineProperty(copy, "save", {
    enumerable: false,
    writable: true,
    value: async function () {
      const list = collections[collectionName] || [];
      const idx = list.findIndex((item) => String(item._id) === String(copy._id));
      copy.updatedAt = new Date();
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...copy };
      } else {
        list.push({ ...copy });
      }
      return copy;
    },
  });

  return copy;
}

class MemoryQuery {
  constructor(collectionName, filter = {}, isSingle = false) {
    this.collectionName = collectionName;
    this.filter = filter;
    this.isSingle = isSingle;
    this._select = "";
    this._sort = null;
    this._skip = 0;
    this._limit = null;
    this._populate = null;
    this._lean = false;
  }

  select(fields) {
    this._select = fields || "";
    return this;
  }

  sort(sortSpec) {
    this._sort = sortSpec;
    return this;
  }

  skip(n) {
    this._skip = Number(n) || 0;
    return this;
  }

  limit(n) {
    this._limit = Number(n) || null;
    return this;
  }

  populate(field, selectFields) {
    this._populate = { field, selectFields };
    return this;
  }

  lean() {
    this._lean = true;
    return this;
  }

  async exec() {
    const list = collections[this.collectionName] || [];
    let results = list.filter((item) => matchesFilter(item, this.filter));

    if (this._sort) {
      const entries = Object.entries(this._sort);
      results.sort((a, b) => {
        for (const [field, dir] of entries) {
          const av = a[field] instanceof Date ? a[field].getTime() : a[field];
          const bv = b[field] instanceof Date ? b[field].getTime() : b[field];
          if (av < bv) return dir === -1 ? 1 : -1;
          if (av > bv) return dir === -1 ? -1 : 1;
        }
        return 0;
      });
    }

    if (this.isSingle) {
      const first = results[0] || null;
      if (!first) return null;
      return wrapDoc(this.collectionName, first, this._select);
    }

    if (this._skip > 0) {
      results = results.slice(this._skip);
    }
    if (this._limit !== null) {
      results = results.slice(0, this._limit);
    }

    return results.map((doc) => {
      const wrapped = wrapDoc(this.collectionName, doc, this._select);
      if (this._populate && this._populate.field === "user" && wrapped.user) {
        const foundUser = collections.User.find(
          (u) => String(u._id) === String(wrapped.user)
        );
        if (foundUser) {
          wrapped.user = {
            _id: foundUser._id,
            name: foundUser.name,
            email: foundUser.email,
          };
        }
      }
      return wrapped;
    });
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
}

function createModel(name, schema) {
  const MongooseModel = mongoose.models[name] || mongoose.model(name, schema);
  if (!collections[name]) {
    collections[name] = [];
  }

  const isConnected = () => mongoose.connection.readyState === 1;

  return {
    find(filter = {}) {
      if (isConnected()) return MongooseModel.find(filter);
      return new MemoryQuery(name, filter, false);
    },

    findOne(filter = {}) {
      if (isConnected()) return MongooseModel.findOne(filter);
      return new MemoryQuery(name, filter, true);
    },

    findById(id) {
      if (isConnected()) return MongooseModel.findById(id);
      return new MemoryQuery(name, { _id: String(id) }, true);
    },

    async findByIdAndDelete(id) {
      if (isConnected()) return MongooseModel.findByIdAndDelete(id);
      const list = collections[name];
      const idx = list.findIndex((item) => String(item._id) === String(id));
      if (idx === -1) return null;
      const [deleted] = list.splice(idx, 1);
      return wrapDoc(name, deleted);
    },

    async findOneAndDelete(filter = {}) {
      if (isConnected()) return MongooseModel.findOneAndDelete(filter);
      const list = collections[name];
      const idx = list.findIndex((item) => matchesFilter(item, filter));
      if (idx === -1) return null;
      const [deleted] = list.splice(idx, 1);
      return wrapDoc(name, deleted);
    },

    async findOneAndUpdate(filter = {}, update = {}, options = {}) {
      if (isConnected()) return MongooseModel.findOneAndUpdate(filter, update, options);
      const list = collections[name];
      let idx = list.findIndex((item) => matchesFilter(item, filter));
      const now = new Date();
      const setFields = update.$set ? { ...update.$set } : { ...update };
      delete setFields.$set;

      if (idx === -1) {
        if (!options.upsert) return null;
        const newDoc = {
          _id: new mongoose.Types.ObjectId().toString(),
          ...filter,
          ...setFields,
          createdAt: now,
          updatedAt: now,
        };
        list.push(newDoc);
        return wrapDoc(name, newDoc);
      }

      list[idx] = {
        ...list[idx],
        ...setFields,
        updatedAt: now,
      };
      return wrapDoc(name, list[idx]);
    },

    async create(data) {
      if (isConnected()) return MongooseModel.create(data);
      const now = new Date();
      const doc = {
        _id: new mongoose.Types.ObjectId().toString(),
        ...data,
        createdAt: data.createdAt || now,
        updatedAt: data.updatedAt || now,
      };
      collections[name].push(doc);
      return wrapDoc(name, doc, "+password +encryptedDescriptor");
    },

    async updateOne(filter = {}, update = {}) {
      if (isConnected()) return MongooseModel.updateOne(filter, update);
      const list = collections[name];
      const idx = list.findIndex((item) => matchesFilter(item, filter));
      if (idx === -1) return { modifiedCount: 0 };
      const setFields = update.$set ? { ...update.$set } : { ...update };
      delete setFields.$set;
      list[idx] = {
        ...list[idx],
        ...setFields,
        updatedAt: new Date(),
      };
      return { modifiedCount: 1 };
    },

    async deleteOne(filter = {}) {
      if (isConnected()) return MongooseModel.deleteOne(filter);
      const list = collections[name];
      const idx = list.findIndex((item) => matchesFilter(item, filter));
      if (idx === -1) return { deletedCount: 0 };
      list.splice(idx, 1);
      return { deletedCount: 1 };
    },

    async deleteMany(filter = {}) {
      if (isConnected()) return MongooseModel.deleteMany(filter);
      const list = collections[name];
      const initialLength = list.length;
      collections[name] = list.filter((item) => !matchesFilter(item, filter));
      return { deletedCount: initialLength - collections[name].length };
    },

    async countDocuments(filter = {}) {
      if (isConnected()) return MongooseModel.countDocuments(filter);
      return collections[name].filter((item) => matchesFilter(item, filter)).length;
    },

    async exists(filter = {}) {
      if (isConnected()) return MongooseModel.exists(filter);
      const found = collections[name].find((item) => matchesFilter(item, filter));
      return found ? { _id: found._id } : null;
    },

    async aggregate(pipeline = []) {
      if (isConnected()) return MongooseModel.aggregate(pipeline);
      let docs = [...collections[name]];

      for (const stage of pipeline) {
        if (stage.$match) {
          docs = docs.filter((item) => matchesFilter(item, stage.$match));
        } else if (stage.$group) {
          const groupSpec = stage.$group;
          const groups = new Map();

          for (const doc of docs) {
            let groupKey;
            if (typeof groupSpec._id === "string" && groupSpec._id.startsWith("$")) {
              const field = groupSpec._id.slice(1);
              groupKey = doc[field];
            } else if (groupSpec._id && groupSpec._id.$dateToString) {
              const dateField = groupSpec._id.$dateToString.date.slice(1);
              const d = new Date(doc[dateField] || Date.now());
              groupKey = Number.isNaN(d.getTime())
                ? new Date().toISOString().slice(0, 10)
                : d.toISOString().slice(0, 10);
            } else {
              groupKey = null;
            }

            const prev = groups.get(groupKey) || { _id: groupKey };
            for (const [aggField, aggOp] of Object.entries(groupSpec)) {
              if (aggField === "_id") continue;
              if (aggOp && aggOp.$sum) {
                prev[aggField] = (prev[aggField] || 0) + Number(aggOp.$sum);
              }
            }
            groups.set(groupKey, prev);
          }

          docs = Array.from(groups.values());
        } else if (stage.$sort) {
          const entries = Object.entries(stage.$sort);
          docs.sort((a, b) => {
            for (const [field, dir] of entries) {
              if (a[field] < b[field]) return dir === -1 ? 1 : -1;
              if (a[field] > b[field]) return dir === -1 ? -1 : 1;
            }
            return 0;
          });
        }
      }

      return docs;
    },
  };
}

module.exports = { createModel, collections };
