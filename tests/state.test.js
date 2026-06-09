import { describe, it, expect, beforeEach } from 'vitest';
import { state, calculateTotalSaved, getLevel, recalculateStreak, getTodayString, getYesterdayString } from '../src/js/state.js';

describe('State Manager', () => {
    beforeEach(() => {
        state.baseline = null;
        state.logs = {};
        state.streak = 0;
        state.totalSaved = 0.0;
        state.lastLoggedDate = null;
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
        state.totalSaved = 0;
        expect(getLevel()).toBe(1);
        state.totalSaved = 8;
        expect(getLevel()).toBe(2);
        state.totalSaved = 55;
        expect(getLevel()).toBe(5);
        state.totalSaved = 1200;
        expect(getLevel()).toBe(10);
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
    });
});
