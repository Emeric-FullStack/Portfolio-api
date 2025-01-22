import crypto from "crypto";

// Utiliser une clé de 32 octets (256 bits) pour AES-256
if (!process.env.SERCRET_AI_API) {
  throw new Error("SERCRET_AI_API is not defined");
}
const ENCRYPTION_KEY = process.env.SERCRET_AI_API;
const KEY_BYTES = Buffer.from(ENCRYPTION_KEY).subarray(0, 32); // Utilise subarray au lieu de slice
const IV_LENGTH = 16;
const ALGORITHM = "aes-256-gcm";
const AUTH_TAG_LENGTH = 16;

export function encryptApiKey(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY_BYTES, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${encrypted}:${authTag.toString("hex")}`;
}

export async function decryptApiKey(text: string | undefined): Promise<string> {
  if (!text) {
    throw new Error("Clé API non configurée");
  }

  try {
    const [ivHex, encryptedHex, authTagHex] = text.split(":");

    if (!ivHex || !encryptedHex || !authTagHex) {
      throw new Error("Format de clé invalide");
    }

    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    if (!iv || !encrypted || !authTag) {
      throw new Error("Données de cryptage invalides");
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, KEY_BYTES, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Erreur de décryptage:", error);
    throw new Error("Impossible de décrypter la clé API");
  }
}
