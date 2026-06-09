import { state, saveLocalStorage } from './state.js';

export async function deriveKey(passphrase) {
    const enc = new TextEncoder();
    const material = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: enc.encode('bloom-zk-salt-v2'), iterations: 100000, hash: 'SHA-256' },
        material,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

export async function encrypt(text, key) {
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
    return { ct: bufHex(ct), iv: bufHex(iv) };
}

export async function decrypt(ctHex, ivHex, key) {
    const ct = hexBuf(ctHex);
    const iv = hexBuf(ivHex);
    const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return new TextDecoder().decode(dec);
}

function bufHex(buf) { 
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join(''); 
}

function hexBuf(hex) { 
    return new Uint8Array(hex.match(/.{2}/g).map(b => parseInt(b, 16))); 
}

export async function hashPass(p) {
    const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(p));
    return bufHex(h);
}

export async function triggerCloudSync() {
    if (!state.syncEnabled || !state.syncPassphrase) return;
    updateSyncLed('syncing');
    try {
        const key = await deriveKey(state.syncPassphrase);
        const hash = await hashPass(state.syncPassphrase);
        const payload = JSON.stringify({
            baseline: state.baseline, 
            logs: state.logs, 
            streak: state.streak,
            totalSaved: state.totalSaved, 
            lastLoggedDate: state.lastLoggedDate, 
            profile: state.profile
        });
        const { ct, iv } = await encrypt(payload, key);
        const db = JSON.parse(localStorage.getItem('bloom_mock_server_db') || '{}');
        db[hash] = { ct, iv, ts: new Date().toISOString() };
        localStorage.setItem('bloom_mock_server_db', JSON.stringify(db));
        setTimeout(() => updateSyncLed('active'), 500);
    } catch (e) {
        console.error('Sync error:', e);
        updateSyncLed('error');
    }
}

export async function restoreFromCloud(passphrase) {
    const key = await deriveKey(passphrase);
    const hash = await hashPass(passphrase);
    const db = JSON.parse(localStorage.getItem('bloom_mock_server_db') || '{}');
    const rec = db[hash];
    if (!rec) return false;

    const data = JSON.parse(await decrypt(rec.ct, rec.iv, key));
    Object.assign(state, {
        baseline: data.baseline, 
        logs: data.logs, 
        streak: data.streak,
        totalSaved: data.totalSaved, 
        lastLoggedDate: data.lastLoggedDate, 
        profile: data.profile,
        syncEnabled: true, 
        syncPassphrase: passphrase
    });
    saveLocalStorage();
    return true;
}

export function updateSyncLed(status) {
    const led = document.getElementById('sync-led');
    if (!led) return;
    led.className = 'sync-led';
    if (status === 'syncing') led.classList.add('syncing');
    else if (status === 'offline') led.classList.add('offline');
    else if (status === 'error') led.classList.add('error');
    else if (status === 'active') led.classList.add('active'); // Added direct support
}
