import { describe, it, expect } from 'vitest';
import { deriveKey, encrypt, decrypt, hashPass } from '../src/js/crypto.js';

describe('Cryptography Engine', () => {
    it('should calculate SHA-256 hash correctly', async () => {
        const passphrase = 'test-passphrase-1234';
        const hash = await hashPass(passphrase);
        expect(hash).toBeDefined();
        expect(hash).toHaveLength(64); // SHA-256 hex output is 64 chars
        
        // Verifying consistent output
        const hash2 = await hashPass(passphrase);
        expect(hash).toBe(hash2);
    });

    it('should derive key, encrypt text, and decrypt it back successfully', async () => {
        const passphrase = 'my-secure-backup-phrase';
        const secretText = JSON.stringify({ data: 'secret message', list: [1, 2, 3] });
        
        // Derive key
        const key = await deriveKey(passphrase);
        expect(key).toBeDefined();
        
        // Encrypt
        const encrypted = await encrypt(secretText, key);
        expect(encrypted.ct).toBeDefined();
        expect(encrypted.iv).toBeDefined();
        expect(encrypted.ct).not.toBe(secretText);
        
        // Decrypt
        const decrypted = await decrypt(encrypted.ct, encrypted.iv, key);
        expect(decrypted).toBe(secretText);
        
        const parsed = JSON.parse(decrypted);
        expect(parsed.data).toBe('secret message');
        expect(parsed.list).toEqual([1, 2, 3]);
    });
});
