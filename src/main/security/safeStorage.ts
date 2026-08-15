import { safeStorage } from 'electron';

export function encryptString(plainText: string): string {
  if (!plainText) return '';
  try {
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      const buffer = safeStorage.encryptString(plainText);
      return buffer.toString('base64');
    }
  } catch (err) {
    console.warn('safeStorage encryption failed, falling back to base64 encoding:', err);
  }
  // Fallback if safeStorage is not available (e.g. Linux headless or dev test environments)
  return Buffer.from(plainText, 'utf-8').toString('base64');
}

export function decryptString(encryptedBase64: string): string {
  if (!encryptedBase64) return '';
  try {
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(encryptedBase64, 'base64');
      return safeStorage.decryptString(buffer);
    }
  } catch (err) {
    console.warn('safeStorage decryption failed, falling back to base64 decode:', err);
  }
  return Buffer.from(encryptedBase64, 'base64').toString('utf-8');
}
