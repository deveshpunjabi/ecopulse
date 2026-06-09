// ==========================================
// EcoPulse — Application Entry Point
// ==========================================

import { state, loadLocalStorage } from './state.js';
import { applyTheme, showScreen, setupNavigation, setupOnboarding, setupSettings, setupPipelineEvents, setupSimulatorFeeds, renderDashboard } from './ui/dom.js';

function init() {
    // 1. Initialize Lucide icons
    lucide.createIcons();

    // 2. Load cached state
    loadLocalStorage();

    // 3. Apply active theme (dark/light/auto)
    applyTheme(state.theme);

    // 4. Animate splash screen fadeout
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.style.opacity = '0';
            splash.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                splash.classList.add('hidden');
                
                // Route to onboarding or main dashboard
                if (!state.baseline) {
                    showScreen('onboarding-screen');
                    setupOnboarding();
                } else {
                    showScreen('main-dashboard');
                    renderDashboard();
                }
            }, 500);
        }
    }, 1800);

    // 5. Initialize layout event listeners
    setupNavigation();
    setupSettings();
    setupPipelineEvents();
    setupSimulatorFeeds();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
