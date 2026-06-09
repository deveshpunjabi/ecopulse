// ==========================================
// EcoPulse — Quant Agent Node
// ==========================================

import { REGION_FACTORS } from '../constants.js';
import { state } from '../state.js';

export const QuantAgent = {
    name: 'Quant',
    role: 'Compute Lifecycle Assessment (LCA) Carbon Values',

    /**
     * Compute emissions based on auditor classification and regional grid factors
     * @param {Object} auditPayload
     * @param {Object} rawLog - access factors directly
     * @returns {Object} quantResult
     */
    calculate(auditPayload, rawLog) {
        const region = state.profile.region || 'GLOBAL';
        const gridFactor = REGION_FACTORS[region] || 0.380;
        
        let rawEmissions = parseFloat(rawLog.co2);
        
        // Adjust for electricity usage grid intensity if regional electricity emissions
        if (auditPayload.classification === 'ENERGY' && rawLog.title.toLowerCase().includes('electricity')) {
            // Adjust factor based on regional grid factor relative to baseline global
            rawEmissions = rawEmissions * (gridFactor / 0.380);
        }

        const netEmissions = rawLog.type === 'saving' ? -rawEmissions : rawEmissions;

        return {
            emissions_kg: parseFloat(netEmissions.toFixed(3)),
            source: 'IPCC AR6 Factors',
            region_applied: region,
            grid_intensity_adjustment: gridFactor,
            calculated_status: 'SUCCESS'
        };
    }
};
