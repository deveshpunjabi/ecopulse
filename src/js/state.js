import { HABIT_CATALOG } from './constants.js';

export const state = {
    baseline: null,
    logs: {},
    streak: 0,
    totalSaved: 0.0,
    lastLoggedDate: null,
    theme: 'auto',
    syncEnabled: false,
    syncPassphrase: null,
    profile: {
        region: 'EU',
        householdSize: 1,
        dietType: 'VEGETARIAN',
        commuteMode: 'PETROL_CAR',
        weeklyMileage: 100,
        heatingSource: 'NATURAL_GAS'
    }
};

export function loadLocalStorage() {
    const saved = localStorage.getItem('bloom_state_v2');
    if (saved) {
        try { 
            Object.assign(state, JSON.parse(saved)); 
        } catch (e) { 
            console.error('State parse error:', e); 
        }
    }
}

export function saveLocalStorage() {
    localStorage.setItem('bloom_state_v2', JSON.stringify(state));
}

export function calculateTotalSaved() {
    let total = 0;
    Object.values(state.logs).forEach(ids => {
        ids.forEach(id => {
            const h = HABIT_CATALOG.find(x => x.id === id);
            if (h) total += h.saving;
        });
    });
    state.totalSaved = total;
    return total;
}

export function getLevel() {
    const total = state.totalSaved;
    if (total >= 1000) return 10;
    if (total >= 500) return 9;
    if (total >= 250) return 8;
    if (total >= 150) return 7;
    if (total >= 100) return 6;
    if (total >= 50) return 5;
    if (total >= 25) return 4;
    if (total >= 10) return 3;
    if (total >= 5) return 2;
    return 1;
}

export function recalculateStreak() {
    let streak = 0;
    let checkDate = getTodayString();

    while (state.logs[checkDate] && state.logs[checkDate].length > 0) {
        streak++;
        const d = new Date(checkDate);
        d.setDate(d.getDate() - 1);
        checkDate = d.toISOString().split('T')[0];
    }

    if (streak === 0) {
        checkDate = getYesterdayString();
        while (state.logs[checkDate] && state.logs[checkDate].length > 0) {
            streak++;
            const d = new Date(checkDate);
            d.setDate(d.getDate() - 1);
            checkDate = d.toISOString().split('T')[0];
        }
        if (streak > 0) state.lastLoggedDate = getYesterdayString();
    } else {
        state.lastLoggedDate = getTodayString();
    }

    state.streak = streak;
    return streak;
}

export function getTodayString() { 
    return new Date().toISOString().split('T')[0]; 
}

export function getYesterdayString() { 
    const d = new Date(); 
    d.setDate(d.getDate() - 1); 
    return d.toISOString().split('T')[0]; 
}
