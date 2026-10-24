
const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey() {
  const value = process.env.FACE_ENCRYPTION_KEY;

  if (!value || !/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(
      "FACE_ENCRYPTION_KEY must contain exactly 64 hexadecimal characters."
    );
  }

  return Buffer.from(value, "hex");
}

function encryptDescriptor(descriptor, userId) {
  if (
    !Array.isArray(descriptor) ||
    descriptor.length !== 128 ||
    !descriptor.every(
      (value) => typeof value === "number" && Number.isFinite(value)
    )
  ) {
    throw new Error("Invalid face descriptor.");
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    getEncryptionKey(),
    iv
  );

  // Bind the encrypted data to the user so it cannot be moved
  // between accounts without failing authentication.
  cipher.setAAD(Buffer.from(String(userId), "utf8"));

  const plaintext = Buffer.from(JSON.stringify(descriptor), "utf8");
  const encrypted = Buffer.concat([
    cipher.update(plaintext),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

function decryptDescriptor(payload, userId) {
  if (typeof payload !== "string") {
    throw new Error("Invalid encrypted face descriptor.");
  }

  const parts = payload.split(".");

  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Unsupported encrypted descriptor format.");
  }

  const [, ivText, tagText, dataText] = parts;
  const iv = Buffer.from(ivText, "base64");
  const authTag = Buffer.from(tagText, "base64");
  const encrypted = Buffer.from(dataText, "base64");

  if (
    iv.length !== IV_LENGTH ||
    authTag.length !== AUTH_TAG_LENGTH ||
    encrypted.length === 0
  ) {
    throw new Error("Invalid encrypted face descriptor.");
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    iv
  );

  decipher.setAAD(Buffer.from(String(userId), "utf8"));
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  const descriptor = JSON.parse(plaintext.toString("utf8"));

  if (
    !Array.isArray(descriptor) ||
    descriptor.length !== 128 ||
    !descriptor.every(
      (value) => typeof value === "number" && Number.isFinite(value)
    )
  ) {
    throw new Error("Decrypted descriptor is invalid.");
  }

  return descriptor;
}

module.exports = {
  encryptDescriptor,
  decryptDescriptor,
};
