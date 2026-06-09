// ==========================================
// EcoPulse — Auditor Agent Node
// ==========================================

export const AuditorAgent = {
    name: 'Auditor',
    role: 'Classify & Normalize Ingestion Logs',
    
    /**
     * Parse raw transactional telemetry or text logs
     * @param {Object} rawLog
     * @returns {Object} auditPayload
     */
    audit(rawLog) {
        // Classifies category based on text search or explicit properties
        let category = rawLog.category || 'OTHER';
        
        // Ensure standard uppercase categories
        category = category.toUpperCase();
        if (!['TRANSPORT', 'DIET', 'ENERGY', 'SHOPPING', 'WASTE', 'OTHER'].includes(category)) {
            category = 'OTHER';
        }

        return {
            classification: category,
            amount: parseFloat(rawLog.amount) || 0.00,
            title: rawLog.title || 'Unknown Activity',
            audit_status: 'SUCCESS',
            timestamp: new Date().toISOString()
        };
    }
};
