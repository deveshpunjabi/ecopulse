import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { deriveKey, encrypt, decrypt, hashPass, triggerCloudSync, restoreFromCloud } from '../src/js/crypto.js';
import { state } from '../src/js/state.js';

// Setup localStorage Mock
beforeAll(() => {
    const store = {};
    globalThis.localStorage = {
        getItem(key) {
            return store[key] || null;
        },
        setItem(key, value) {
            store[key] = String(value);
        },
        clear() {
            for (const key in store) {
                delete store[key];
            }
        },
        removeItem(key) {
            delete store[key];
        }
    };
});

describe('Cryptography Engine', () => {
    beforeEach(() => {
        state.baseline = null;
        state.logs = {};
        state.streak = 0;
        state.totalSaved = 0.0;
        state.lastLoggedDate = null;
        state.syncEnabled = false;
        state.syncPassphrase = null;
        localStorage.clear();
    });

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

    it('should throw an error during decryption with a mismatching key', async () => {
        const key1 = await deriveKey('passphrase-one');
        const key2 = await deriveKey('passphrase-two');
        const secretText = 'secret data';
        
        const encrypted = await encrypt(secretText, key1);
        
        // Decrypting with key2 should throw
        await expect(decrypt(encrypted.ct, encrypted.iv, key2)).rejects.toThrow();
    });

    it('should perform cloud sync and restore correctly', async () => {
        // Set up initial state and sync configuration
        state.baseline = 3200;
        state.streak = 4;
        state.logs = { '2026-06-09': ['h_vegan', 'h_hang_dry'] };
        state.syncEnabled = true;
        state.syncPassphrase = 'my-super-secret-sync-phrase';
        
        // Trigger cloud synchronization
        await triggerCloudSync();
        
        // Verify mock server database record was created
        const db = JSON.parse(localStorage.getItem('bloom_mock_server_db') || '{}');
        const hash = await hashPass(state.syncPassphrase);
        expect(db[hash]).toBeDefined();
        expect(db[hash].ct).toBeDefined();
        expect(db[hash].iv).toBeDefined();
        
        // Reset local state completely
        state.baseline = null;
        state.streak = 0;
        state.logs = {};
        state.syncEnabled = false;
        state.syncPassphrase = null;
        
        // Restore from cloud using the passphrase
        const restoreSuccess = await restoreFromCloud('my-super-secret-sync-phrase');
        expect(restoreSuccess).toBe(true);
        
        // Verify state is restored perfectly
        expect(state.baseline).toBe(3200);
        expect(state.streak).toBe(4);
        expect(state.logs).toEqual({ '2026-06-09': ['h_vegan', 'h_hang_dry'] });
        expect(state.syncEnabled).toBe(true);
        expect(state.syncPassphrase).toBe('my-super-secret-sync-phrase');
    });

    it('should return false when restoring with a non-existent passphrase', async () => {
        const restoreSuccess = await restoreFromCloud('non-existent-passphrase');
        expect(restoreSuccess).toBe(false);
    });
});
