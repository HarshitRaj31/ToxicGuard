
const { generateRegistrationOptions, generateAuthenticationOptions } =
  require("@simplewebauthn/server");

const rpName = process.env.WEBAUTHN_RP_NAME || "ToxicGuard";
const rpID = process.env.WEBAUTHN_RP_ID || "localhost";

const expectedOrigin = process.env.WEBAUTHN_ORIGIN || "http://localhost:5173";

module.exports = {
  rpName,
  rpID,
  expectedOrigin,
  generateRegistrationOptions,
  generateAuthenticationOptions,
};
