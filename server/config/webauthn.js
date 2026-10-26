const { generateRegistrationOptions, generateAuthenticationOptions } =
  require("@simplewebauthn/server");

const rpName = process.env.WEBAUTHN_RP_NAME || "ToxicGuard";
const rpID = process.env.WEBAUTHN_RP_ID || "localhost";
const expectedOrigin = process.env.WEBAUTHN_ORIGIN || "http://localhost:5173";

function getWebAuthnConfig(req) {
  const originHeader = req?.headers?.origin;
  if (originHeader) {
    try {
      const parsed = new URL(originHeader);
      return {
        rpName,
        rpID: parsed.hostname,
        expectedOrigin: parsed.origin,
      };
    } catch {
      // Fallback to defaults
    }
  }
  return { rpName, rpID, expectedOrigin };
}

module.exports = {
  rpName,
  rpID,
  expectedOrigin,
  getWebAuthnConfig,
  generateRegistrationOptions,
  generateAuthenticationOptions,
};
