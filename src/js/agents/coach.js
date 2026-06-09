// ==========================================
// EcoPulse — Coach Agent Node
// ==========================================

import { state } from '../state.js';

export const CoachAgent = {
    name: 'Coach',
    role: 'Generate Context-Aware Behavioral Nudges',

    /**
     * Generate nudges using Loss Aversion, Social Proof, and If-Then Rules
     * @param {Object} auditPayload
     * @param {Object} quantPayload
     * @param {Object} rawLog
     * @returns {Object} coachAdvice
     */
    formulate(auditPayload, quantPayload, rawLog) {
        const isSaving = rawLog.type === 'saving';
        let nudge = '';
        let methodology = '';

        if (isSaving) {
            methodology = 'Social Proof';
            nudge = `Awesome work! Staying consistent on ${auditPayload.classification.toLowerCase()} savings grows your eco level. 85% of eco-conscious professionals logged similar actions today!`;
        } else {
            methodology = 'Loss Aversion';
            nudge = `Eco nudge: Commuting via transit or choosing plant-based meals next time can save up to 5.7kg CO₂. Maintain your ${state.streak}-day streak to protect your forest canopy!`;
        }

        return {
            behavioral_framing: methodology,
            nudge_text: nudge,
            coach_status: 'SUCCESS'
        };
    }
};
