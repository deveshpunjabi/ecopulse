import { describe, it, expect } from 'vitest';
import { AuditorAgent } from '../src/js/agents/auditor.js';
import { QuantAgent } from '../src/js/agents/quant.js';
import { CoachAgent } from '../src/js/agents/coach.js';
import { state } from '../src/js/state.js';

describe('Auditor Agent', () => {
    it('should classify raw log categories correctly', () => {
        const rawLog = { category: 'transport', amount: 15.00, title: 'Uber ride' };
        const result = AuditorAgent.audit(rawLog);
        expect(result.classification).toBe('TRANSPORT');
        expect(result.amount).toBe(15.00);
        expect(result.title).toBe('Uber ride');
        expect(result.audit_status).toBe('SUCCESS');
    });

    it('should default to OTHER category for invalid inputs', () => {
        const rawLog = { category: 'unknown_category', amount: 'abc' };
        const result = AuditorAgent.audit(rawLog);
        expect(result.classification).toBe('OTHER');
        expect(result.amount).toBe(0.00);
    });
});

describe('Quant Agent', () => {
    it('should calculate emissions without grid adjustment for non-electricity category', () => {
        state.profile.region = 'IN';
        const auditPayload = { classification: 'TRANSPORT', amount: 0 };
        const rawLog = { co2: 2.5, type: 'emission' };
        const result = QuantAgent.calculate(auditPayload, rawLog);
        expect(result.emissions_kg).toBe(2.5);
        expect(result.region_applied).toBe('IN');
    });

    it('should apply grid intensity adjustment for electricity under ENERGY category', () => {
        state.profile.region = 'IN'; // multiplier: 0.72
        const auditPayload = { classification: 'ENERGY', amount: 0 };
        const rawLog = { title: 'Electricity bill', co2: 10.0, type: 'emission' };
        const result = QuantAgent.calculate(auditPayload, rawLog);
        // adjustment = 10 * (0.72 / 0.380) = 18.947 kg
        expect(result.emissions_kg).toBeCloseTo(18.947, 3);
        expect(result.region_applied).toBe('IN');
        expect(result.grid_intensity_adjustment).toBe(0.72);
    });

    it('should output negative emissions for saving type', () => {
        state.profile.region = 'US'; // multiplier: 0.45
        const auditPayload = { classification: 'TRANSPORT', amount: 0 };
        const rawLog = { co2: 1.5, type: 'saving' };
        const result = QuantAgent.calculate(auditPayload, rawLog);
        expect(result.emissions_kg).toBe(-1.5);
    });
});

describe('Coach Agent', () => {
    it('should formulate Social Proof nudges for saving transactions', () => {
        const auditPayload = { classification: 'TRANSPORT' };
        const quantPayload = { emissions_kg: -1.8 };
        const rawLog = { type: 'saving' };
        const result = CoachAgent.formulate(auditPayload, quantPayload, rawLog);
        expect(result.behavioral_framing).toBe('Social Proof');
        expect(result.nudge_text).toContain('85% of eco-conscious professionals');
    });

    it('should formulate Loss Aversion nudges for emission transactions', () => {
        state.streak = 5;
        const auditPayload = { classification: 'TRANSPORT' };
        const quantPayload = { emissions_kg: 3.5 };
        const rawLog = { type: 'emission' };
        const result = CoachAgent.formulate(auditPayload, quantPayload, rawLog);
        expect(result.behavioral_framing).toBe('Loss Aversion');
        expect(result.nudge_text).toContain('5-day streak');
    });
});
