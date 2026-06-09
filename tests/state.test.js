import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { state, calculateTotalSaved, getLevel, recalculateStreak, getTodayString, getYesterdayString, loadLocalStorage, saveLocalStorage } from '../src/js/state.js';

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

describe('State Manager', () => {
    beforeEach(() => {
        state.baseline = null;
        state.logs = {};
        state.streak = 0;
        state.totalSaved = 0.0;
        state.lastLoggedDate = null;
        localStorage.clear();
    });

    it('should calculate total saved carbon emissions from logs correctly', () => {
        state.logs = {
            '2026-06-09': ['h_bike', 'h_vegan'], // 1.8 + 5.7 = 7.5
            '2026-06-08': ['h_cold_wash']         // 0.6
        };
        const total = calculateTotalSaved();
        expect(total).toBe(8.1);
        expect(state.totalSaved).toBe(8.1);
    });

    it('should map levels based on total carbon saved', () => {
        const testCases = [
            { total: 0, expected: 1 },
            { total: 4.9, expected: 1 },
            { total: 5, expected: 2 },
            { total: 9.9, expected: 2 },
            { total: 10, expected: 3 },
            { total: 24.9, expected: 3 },
            { total: 25, expected: 4 },
            { total: 49.9, expected: 4 },
            { total: 50, expected: 5 },
            { total: 99.9, expected: 5 },
            { total: 100, expected: 6 },
            { total: 149.9, expected: 6 },
            { total: 150, expected: 7 },
            { total: 249.9, expected: 7 },
            { total: 250, expected: 8 },
            { total: 499.9, expected: 8 },
            { total: 500, expected: 9 },
            { total: 999.9, expected: 9 },
            { total: 1000, expected: 10 },
            { total: 1500, expected: 10 }
        ];
        testCases.forEach(({ total, expected }) => {
            state.totalSaved = total;
            expect(getLevel()).toBe(expected);
        });
    });

    it('should calculate active streaks correctly', () => {
        const today = getTodayString();
        const yesterday = getYesterdayString();

        // 1. Logged today only
        state.logs = {
            [today]: ['h_bike']
        };
        expect(recalculateStreak()).toBe(1);
        expect(state.lastLoggedDate).toBe(today);

        // 2. Logged today and yesterday
        state.logs = {
            [today]: ['h_bike'],
            [yesterday]: ['h_vegan']
        };
        expect(recalculateStreak()).toBe(2);

        // 3. Logged yesterday but not today
        state.logs = {
            [yesterday]: ['h_vegan']
        };
        expect(recalculateStreak()).toBe(1);
        expect(state.lastLoggedDate).toBe(yesterday);

        // 4. Broken streak (no logs today or yesterday, but logs exist from 2 days ago)
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];
        state.logs = {
            [twoDaysAgoStr]: ['h_vegan']
        };
        expect(recalculateStreak()).toBe(0);
    });

    it('should load and save local storage state correctly', () => {
        state.baseline = 4500;
        state.streak = 5;
        state.logs = { '2026-06-09': ['h_bike'] };
        
        saveLocalStorage();
        
        // Reset state values
        state.baseline = null;
        state.streak = 0;
        state.logs = {};
        
        loadLocalStorage();
        
        expect(state.baseline).toBe(4500);
        expect(state.streak).toBe(5);
        expect(state.logs).toEqual({ '2026-06-09': ['h_bike'] });
    });

    it('should fail gracefully when parsing invalid local storage state JSON', () => {
        localStorage.setItem('bloom_state_v2', '{invalid_json}');
        
        // Initialize values
        state.baseline = 1200;
        state.streak = 2;
        
        // This should log an error but not throw an exception
        loadLocalStorage();
        
        // Values should remain unchanged
        expect(state.baseline).toBe(1200);
        expect(state.streak).toBe(2);
    });
});
