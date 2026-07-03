/**
 * Client-side encryption utilities för sensitive data
 * Uses Web Crypto API för secure encryption/decryption
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

/**
 * Derives a encryption key from a password using PBKDF2
 */
async function deriveKey(password: string, salt: BufferSource): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts sensitive data
 * Returns base64 encoded string with salt and IV prepended
 */
export async function encryptSensitiveData(
  data: string,
  encryptionKey: string
): Promise<string> {
  try {
    const encoder = new TextEncoder();
    
    // Generate random salt and IV
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);
    
    // Derive encryption key
    const key = await deriveKey(encryptionKey, salt);
    
    // Encrypt the data
    const encrypted = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv
      },
      key,
      encoder.encode(data)
    );
    
    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt sensitive data');
  }
}

/**
 * Decrypts sensitive data
 */
export async function decryptSensitiveData(
  encryptedData: string,
  encryptionKey: string
): Promise<string> {
  try {
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    
    // Extract salt, IV and encrypted data
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);
    
    // Derive decryption key
    const key = await deriveKey(encryptionKey, salt);
    
    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv
      },
      key,
      encrypted
    );
    
    // Convert to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt sensitive data');
  }
}

/**
 * Masks sensitive data för display (e.g., "123456-XXXX")
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (!data || data.length <= visibleChars) return data;
  
  const visible = data.slice(0, visibleChars);
  const masked = 'X'.repeat(Math.min(data.length - visibleChars, 8));
  
  return `${visible}-${masked}`;
}

/**
 * Validates Swedish personal number format (YYYYMMDD-XXXX)
 */
export function validatePersonalNumber(personalNumber: string): boolean {
  // Remove any spaces or dashes
  const cleaned = personalNumber.replace(/[\s-]/g, '');
  
  // Should be 10 or 12 digits
  if (!/^\d{10}$|^\d{12}$/.test(cleaned)) {
    return false;
  }
  
  // Basic Luhn check could be added here
  return true;
}

/**
 * Validates Swedish bank account number
 */
export function validateBankAccount(bankAccount: string): boolean {
  // Remove any spaces or dashes
  const cleaned = bankAccount.replace(/[\s-]/g, '');
  
  // Should be 10-14 digits depending on bank
  return /^\d{10,14}$/.test(cleaned);
}

/**
 * Generates a secure random encryption key
 */
export function generateEncryptionKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...Array.from(array)));
}
