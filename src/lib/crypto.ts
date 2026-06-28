const MASTER_SECRET = 'obscura-shared-secret-key-for-b2b-settlement';

async function getInvoiceKey(invoiceHash: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(MASTER_SECRET + invoiceHash),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(invoiceHash),
      iterations: 1000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptMetadata(metadata: any, invoiceHash: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await getInvoiceKey(invoiceHash);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(JSON.stringify(metadata))
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  const binString = Array.from(combined, (x) => String.fromCharCode(x)).join('');
  return btoa(binString);
}

export async function decryptMetadata(encryptedBase64: string, invoiceHash: string): Promise<any> {
  const dec = new TextDecoder();
  const binString = atob(encryptedBase64);
  const combined = new Uint8Array(binString.length);
  for (let i = 0; i < binString.length; i++) {
    combined[i] = binString.charCodeAt(i);
  }

  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const key = await getInvoiceKey(invoiceHash);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return JSON.parse(dec.decode(decrypted));
}
