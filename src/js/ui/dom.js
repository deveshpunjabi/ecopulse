// ==========================================
// EcoPulse — DOM Controller & Event Coordinator
// ==========================================

import { state, calculateTotalSaved, recalculateStreak, getLevel, saveLocalStorage, getTodayString, getYesterdayString, loadLocalStorage } from '../state.js';
import { CARBON_FACTORS, REGION_FACTORS, HABIT_CATALOG, CHALLENGES, ACHIEVEMENTS, OFFSETS, FEED_TRANSACTIONS } from '../constants.js';
import { initOrbCanvas, updateOrbState } from './orb.js';
import { renderProceduralForest } from './forest.js';
import { renderMiniChart, renderTrendChart, renderBreakdownChart, getLast7DaysData } from './charts.js';
import { triggerCloudSync, restoreFromCloud, updateSyncLed } from '../crypto.js';
import { AuditorAgent } from '../agents/auditor.js';
import { QuantAgent } from '../agents/quant.js';
import { CoachAgent } from '../agents/coach.js';

let feedInterval = null;
let feedStats = { processed: 0, totalCo2: 0 };
let pipelineActive = false;
let autoPipelineInterval = null;

const INSIGHTS = [
    { condition: s => s.totalSaved === 0 && s.profile.dietType === 'HIGH_MEAT', text: '<strong>Eco nudge (Loss Aversion)</strong>: Skip meat for dinner today to protect your weekly carbon allowance! It saves <strong>4.8 kg CO₂</strong> — equivalent to charging your phone 600 times.' },
    { condition: s => s.totalSaved === 0, text: '<strong>Get started</strong>: Log your first eco-action. A tiny choice today forms a massive habit tomorrow. All data stays 100% on-device.' },
    { condition: s => s.profile.commuteMode === 'PETROL_CAR' && s.totalSaved > 0, text: () => `<strong>Social Proof check</strong>: 86% of green professionals in your region commuted sustainably today. Swap one ride to save <strong>1.8 kg CO₂</strong>!` },
    { condition: s => s.streak >= 7, text: () => `<strong>Implementation Intention</strong>: 'If it is Monday morning, then I will commute by rail.' Maintain your ${state.streak}-day streak to earn the Week Warrior reward!` },
    { condition: s => s.streak >= 3, text: () => `Incredible consistency! Your ${state.streak}-day streak is in the top 15% of your local community. Keep it up!` },
    { condition: s => s.totalSaved >= 50, text: () => `You've saved <strong>${state.totalSaved.toFixed(1)} kg CO₂</strong> total. You've grown ${Math.floor(state.totalSaved / 10)} trees — saving the planet, branch by branch.` },
    { condition: () => true, text: () => `Climate habits grow through steady defaults. Choose active transport or plant-based meals today.` }
];

export function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
}

export function switchView(viewId) {
    document.querySelectorAll('.view-panel').forEach(v => v.classList.add('hidden'));
    const panel = document.getElementById(`view-${viewId}`);
    if (panel) {
        panel.classList.remove('hidden');
        panel.style.animation = 'none';
        panel.offsetHeight; // Reflow
        panel.style.animation = '';
    }

    document.querySelectorAll('.nav-btn, .mob-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll(`[data-view="${viewId}"]`).forEach(b => b.classList.add('active'));

    if (viewId === 'dashboard') {
        renderDashboard();
        if (feedInterval) { clearInterval(feedInterval); feedInterval = null; }
    } else if (viewId === 'feed') {
        renderFeed();
    } else if (viewId === 'pipeline') {
        if (feedInterval) { clearInterval(feedInterval); feedInterval = null; }
    } else if (viewId === 'analytics') {
        renderAnalytics();
        if (feedInterval) { clearInterval(feedInterval); feedInterval = null; }
    } else if (viewId === 'leaderboard') {
        renderLeaderboard();
        renderActiveChallenges();
        renderAchievements();
        if (feedInterval) { clearInterval(feedInterval); feedInterval = null; }
    } else if (viewId === 'marketplace') {
        renderMarketplace();
        if (feedInterval) { clearInterval(feedInterval); feedInterval = null; }
    } else if (viewId === 'settings') {
        renderSettings();
        if (feedInterval) { clearInterval(feedInterval); feedInterval = null; }
    }
}

export function setupNavigation() {
    document.querySelectorAll('.nav-btn, .mob-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });
}

// Onboarding logic
export function setupOnboarding() {
    let step = 1;
    const totalSteps = 5;

    document.querySelectorAll('.stepper-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            let val = parseInt(input.value) || 1;
            if (btn.dataset.action === 'inc') val = Math.min(10, val + 1);
            else val = Math.max(1, val - 1);
            input.value = val;
        });
    });

    const slider = document.getElementById('weekly-distance');
    const display = document.getElementById('distance-display');
    if (slider) {
        slider.addEventListener('input', () => {
            display.textContent = `${slider.value} km`;
        });
    }

    document.querySelectorAll('.option-card').forEach(card => {
        card.addEventListener('click', function() {
            const parent = this.closest('.option-grid');
            if (parent) {
                parent.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
                this.classList.add('selected');
            }
        });
    });

    document.getElementById('next-btn')?.addEventListener('click', () => {
        captureStepData(step);
        if (step < totalSteps) {
            step++;
            updateStep(step, totalSteps);
            if (step === totalSteps) {
                calculateBaseline();
                document.getElementById('next-btn').innerHTML = 'Start Your Journey <i data-lucide="sparkles"></i>';
                lucide.createIcons();
            }
        } else {
            saveLocalStorage();
            showScreen('main-dashboard');
            renderDashboard();
            showToast('Welcome to EcoPulse! 🌱', 'success');
        }
    });

    document.getElementById('prev-btn')?.addEventListener('click', () => {
        if (step > 1) {
            step--;
            updateStep(step, totalSteps);
            document.getElementById('next-btn').innerHTML = 'Continue <i data-lucide="arrow-right"></i>';
            lucide.createIcons();
        }
    });
}

function updateStep(step, total) {
    document.querySelectorAll('.step-pane').forEach(p => p.classList.remove('active'));
    const pane = document.querySelector(`.step-pane[data-step="${step}"]`);
    if (pane) pane.classList.add('active');

    const progressFill = document.getElementById('onboarding-progress');
    if (progressFill) progressFill.style.width = `${(step / total) * 100}%`;
    const counter = document.getElementById('step-counter');
    if (counter) counter.textContent = `${step} / ${total}`;

    const prevBtn = document.getElementById('prev-btn');
    if (prevBtn) {
        if (step === 1) prevBtn.classList.add('hidden');
        else prevBtn.classList.remove('hidden');
    }

    lucide.createIcons();
}

function captureStepData(step) {
    if (step === 1) {
        const regionEl = document.getElementById('user-region');
        if (regionEl) state.profile.region = regionEl.value;
        const sizeEl = document.getElementById('household-size');
        if (sizeEl) state.profile.householdSize = parseInt(sizeEl.value) || 1;
    } else if (step === 2) {
        const sel = document.querySelector('.step-pane[data-step="2"] .option-card.selected');
        if (sel) state.profile.dietType = sel.dataset.value;
    } else if (step === 3) {
        const sel = document.querySelector('.step-pane[data-step="3"] .option-card.selected');
        if (sel) state.profile.commuteMode = sel.dataset.value;
        const distEl = document.getElementById('weekly-distance');
        if (distEl) state.profile.weeklyMileage = parseFloat(distEl.value) || 0;
    } else if (step === 4) {
        const sel = document.querySelector('.step-pane[data-step="4"] .option-card.selected');
        if (sel) state.profile.heatingSource = sel.dataset.value;
    }
}

export function calculateBaseline() {
    captureStepData(4);

    const transport = state.profile.weeklyMileage * 52 * CARBON_FACTORS.transport[state.profile.commuteMode];
    const diet = 365 * CARBON_FACTORS.diet[state.profile.dietType];

    const usage = state.profile.householdSize > 2 ? CARBON_FACTORS.energyUsage.large : CARBON_FACTORS.energyUsage.small;
    let ef = CARBON_FACTORS.energy[state.profile.heatingSource] || CARBON_FACTORS.energy.NATURAL_GAS;
    if (state.profile.heatingSource === 'ELECTRICITY') {
        ef = REGION_FACTORS[state.profile.region] || CARBON_FACTORS.energy.ELECTRICITY;
    }
    const energy = (usage * ef) / state.profile.householdSize;
    const waste = 200;

    const total = transport + diet + energy + waste;

    state.baseline = {
        transport: Math.round(transport),
        diet: Math.round(diet),
        energy: Math.round(energy),
        waste: Math.round(waste),
        total: Math.round(total)
    };

    animateNumber('baseline-total-value', 0, Math.round(total), 1200);

    const pct = Math.min((total / 8000) * 100, 100);
    setTimeout(() => {
        const bar = document.getElementById('user-baseline-bar');
        const label = document.getElementById('user-baseline-label');
        if (bar) bar.style.width = `${pct}%`;
        if (label) label.textContent = `${Math.round(total).toLocaleString()} kg`;
    }, 300);
}

export function calculateBaselineFromProfile() {
    const transport = state.profile.weeklyMileage * 52 * CARBON_FACTORS.transport[state.profile.commuteMode];
    const diet = 365 * CARBON_FACTORS.diet[state.profile.dietType];
    const usage = state.profile.householdSize > 2 ? CARBON_FACTORS.energyUsage.large : CARBON_FACTORS.energyUsage.small;
    let ef = CARBON_FACTORS.energy[state.profile.heatingSource] || CARBON_FACTORS.energy.NATURAL_GAS;
    if (state.profile.heatingSource === 'ELECTRICITY') ef = REGION_FACTORS[state.profile.region] || CARBON_FACTORS.energy.ELECTRICITY;
    const energy = (usage * ef) / state.profile.householdSize;
    const waste = 200;

    state.baseline = {
        transport: Math.round(transport),
        diet: Math.round(diet),
        energy: Math.round(energy),
        waste: Math.round(waste),
        total: Math.round(transport + diet + energy + waste)
    };
}

function animateNumber(elementId, from, to, duration) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const start = performance.now();
    const update = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
        el.textContent = Math.round(from + (to - from) * eased).toLocaleString();
        if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
}

// Dashboard rendering
export function renderDashboard() {
    const today = getTodayString();
    calculateTotalSaved();
    recalculateStreak();

    const dateEl = document.getElementById('date-label');
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    setText('dash-saved', state.totalSaved.toFixed(1));
    setText('dash-streak', state.streak);
    const treeCount = Math.floor(state.totalSaved / 10);
    setText('dash-trees', treeCount);
    
    // Update virtual forest progress elements
    const rem = state.totalSaved % 10;
    const progressPct = rem * 10;
    setText('forest-count', `${treeCount} tree${treeCount !== 1 ? 's' : ''}`);
    const forestFill = document.getElementById('forest-progress-fill');
    if (forestFill) forestFill.style.width = `${progressPct}%`;
    setText('forest-progress-label', `${rem.toFixed(1)}/10 kg`);

    setText('dash-level', getLevel());

    renderProceduralForest();
    renderEquivalency();
    renderChecklist(today);
    renderInsight();
    renderMiniChart();
    updateCarbonPulseOrb();
    updateCarbonBudget();
}

function updateCarbonPulseOrb() {
    const orb = document.getElementById('pulse-orb');
    const orbVal = document.getElementById('orb-value');
    const orbStatus = document.getElementById('orb-status');
    if (!orb) return;

    orb.classList.remove('excellent', 'good', 'warning', 'critical');
    
    const weeklyAllowance = (state.baseline?.total || 4700) / 52;
    const { data } = getLast7DaysData();
    const savingsThisWeek = data.reduce((a, b) => a + b, 0);
    const netEmissions = Math.max(0, weeklyAllowance - savingsThisWeek);
    const pct = (netEmissions / weeklyAllowance) * 100;
    
    if (orbVal) orbVal.textContent = savingsThisWeek.toFixed(1);

    let stateClass = 'excellent';
    let statusText = 'On Track';
    if (pct <= 50) {
        stateClass = 'excellent';
        statusText = 'Excellent';
    } else if (pct <= 75) {
        stateClass = 'good';
        statusText = 'On Track';
    } else if (pct <= 90) {
        stateClass = 'warning';
        statusText = 'Warning';
    } else {
        stateClass = 'critical';
        statusText = 'Critical';
    }

    orb.classList.add(stateClass);
    if (orbStatus) orbStatus.textContent = statusText;

    updateOrbState(stateClass);
    initOrbCanvas();
}

function updateCarbonBudget() {
    const weeklyAllowance = (state.baseline?.total || 4700) / 52;
    const { data } = getLast7DaysData();
    const savingsThisWeek = data.reduce((a, b) => a + b, 0);
    const netEmissions = Math.max(0, weeklyAllowance - savingsThisWeek);
    const remaining = Math.max(0, weeklyAllowance - netEmissions);
    
    const pctRemaining = Math.max(0, Math.min(100, (remaining / weeklyAllowance) * 100));
    
    setText('budget-percent', `${Math.round(pctRemaining)}%`);
    setText('budget-remaining', `${remaining.toFixed(1)} kg saved`);
    setText('budget-total', `of ${weeklyAllowance.toFixed(0)} kg allowance`);

    const fill = document.getElementById('budget-fill');
    if (fill) {
        fill.style.width = `${pctRemaining}%`;
        if (pctRemaining > 50) fill.style.background = 'linear-gradient(90deg, var(--green-400), var(--green-600))';
        else if (pctRemaining > 15) fill.style.background = 'linear-gradient(90deg, var(--amber-400), var(--orange-500))';
        else fill.style.background = 'linear-gradient(90deg, var(--red-500), var(--red-600))';
    }
}

function renderChecklist(dateStr) {
    const container = document.getElementById('daily-checklist');
    if (!container) return;
    container.innerHTML = '';

    const logged = state.logs[dateStr] || [];
    const recommended = getRecommendedHabits();

    recommended.forEach(habit => {
        const isLogged = logged.includes(habit.id);
        const row = document.createElement('div');
        row.className = `habit-row${isLogged ? ' logged' : ''}`;
        row.innerHTML = `
            <div class="habit-check"><i data-lucide="check"></i></div>
            <div class="habit-body">
                <div class="habit-name">${habit.name}</div>
                <div class="habit-desc">${habit.desc}</div>
            </div>
            <div class="habit-saving">-${habit.saving} kg</div>
        `;
        row.addEventListener('click', () => toggleHabit(habit.id, dateStr, habit.saving));
        container.appendChild(row);
    });

    const allDone = recommended.every(h => logged.includes(h.id));
    const completeMsg = document.getElementById('all-done-msg');
    if (completeMsg) {
        if (allDone && recommended.length > 0) completeMsg.classList.remove('hidden');
        else completeMsg.classList.add('hidden');
    }

    lucide.createIcons();
}

function getRecommendedHabits() {
    const scored = HABIT_CATALOG.map(h => {
        let score = 0;
        if (state.profile.commuteMode === 'PETROL_CAR' && h.category === 'TRANSPORT') score += 3;
        if (state.profile.dietType === 'HIGH_MEAT' && h.category === 'DIET') score += 3;
        if (state.profile.dietType === 'LOW_MEAT' && h.category === 'DIET') score += 2;
        if (state.profile.heatingSource === 'NATURAL_GAS' && h.category === 'ENERGY') score += 2;
        score += h.saving;
        return { ...h, score };
    });

    const filterNormal = scored.filter(h => !h.id.startsWith('offset_'));
    filterNormal.sort((a, b) => b.score - a.score);
    return filterNormal.slice(0, 6);
}

function toggleHabit(habitId, dateStr, saving) {
    if (!state.logs[dateStr]) state.logs[dateStr] = [];

    const idx = state.logs[dateStr].indexOf(habitId);
    if (idx === -1) {
        state.logs[dateStr].push(habitId);
        triggerConfetti();
        showToast(`-${saving} kg CO₂ saved! 🌿`, 'success');
    } else {
        state.logs[dateStr].splice(idx, 1);
    }

    calculateTotalSaved();
    recalculateStreak();
    saveLocalStorage();
    renderDashboard();

    if (state.syncEnabled) triggerCloudSync();
}

function renderEquivalency() {
    const s = state.totalSaved;
    setText('eq-phones', Math.round(s / 0.008).toLocaleString());
    setText('eq-trees', (s / 0.06).toFixed(1));
    setText('eq-gas', (s / 2.3).toFixed(1));
    setText('eq-flight', (s / 0.255).toFixed(0));
}

function renderInsight() {
    const el = document.getElementById('dynamic-insight-text');
    if (!el) return;

    for (const insight of INSIGHTS) {
        if (insight.condition(state)) {
            el.innerHTML = typeof insight.text === 'function' ? insight.text() : insight.text;
            return;
        }
    }
}

// Analytics rendering
export function renderAnalytics() {
    if (!state.baseline) return;
    renderTrendChart();
    renderBreakdownChart();
    renderComparisonBars();
    renderHeatmap();
}

function renderComparisonBars() {
    if (!state.baseline) return;
    setText('ana-footprint', `${state.baseline.total.toLocaleString()} kg`);
    const pct = Math.min((state.baseline.total / 16000) * 100, 100);
    const bar = document.getElementById('ana-footprint-bar');
    if (bar) bar.style.width = `${pct}%`;
}

function renderHeatmap() {
    const container = document.getElementById('heatmap');
    if (!container) return;
    container.innerHTML = '';

    for (let i = 27; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const logCount = (state.logs[dateStr] || []).length;

        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        cell.title = `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${logCount} action${logCount !== 1 ? 's' : ''}`;

        let level = 0;
        if (logCount >= 4) level = 4;
        else if (logCount >= 3) level = 3;
        else if (logCount >= 2) level = 2;
        else if (logCount >= 1) level = 1;

        cell.setAttribute('data-level', level);
        container.appendChild(cell);
    }
}

// Leaderboard, challenges, achievements
export function renderLeaderboard() {
    const lbTable = document.getElementById('leaderboard-table');
    if (!lbTable) return;
    
    const weeklyAllowance = (state.baseline?.total || 4700) / 52;
    const { data } = getLast7DaysData();
    const userSavings = data.reduce((a, b) => a + b, 0);
    const userNet = Math.max(0, weeklyAllowance - userSavings);
    const userPctRemaining = Math.max(0, Math.min(100, (1 - userNet / weeklyAllowance) * 100));

    const mockCompetitors = [
        { name: 'Sophia Green', streak: 12, saved: 124.5, pct: 90, me: false },
        { name: 'Liam Eco', streak: 8, saved: 98.2, pct: 82, me: false },
        { name: 'Olivia Forest', streak: 5, saved: 76.8, pct: 75, me: false },
        { name: 'You', streak: state.streak, saved: userSavings, pct: userPctRemaining, me: true },
        { name: 'Emma Planet', streak: 4, saved: 54.0, pct: 60, me: false },
        { name: 'Jackson Carbon', streak: 2, saved: 28.5, pct: 45, me: false }
    ];

    mockCompetitors.sort((a, b) => b.saved - a.saved);

    lbTable.innerHTML = `
        <div class="lb-row header" style="border: none; font-weight: bold; background: transparent; color: var(--text-secondary); pointer-events: none; padding-bottom: 4px;">
            <div class="lb-rank">Rank</div>
            <div class="lb-user">User</div>
            <div class="lb-streak">Streak</div>
            <div class="lb-val">Saved (Wk)</div>
        </div>
    `;

    mockCompetitors.forEach((c, idx) => {
        const rank = idx + 1;
        const rankClass = rank === 1 ? 'first' : rank === 2 ? 'second' : rank === 3 ? 'third' : '';
        const rankLabel = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
        
        const row = document.createElement('div');
        row.className = `lb-row${c.me ? ' me' : ''}`;
        row.innerHTML = `
            <div class="lb-rank ${rankClass}">${rankLabel}</div>
            <div class="lb-user">${c.name}</div>
            <div class="lb-streak">🔥 ${c.streak} days</div>
            <div class="lb-val">${c.saved.toFixed(1)} kg</div>
        `;
        lbTable.appendChild(row);
    });
}

export function renderActiveChallenges() {
    const container = document.getElementById('active-challenges');
    if (!container) return;
    container.innerHTML = '';

    CHALLENGES.forEach(ch => {
        let current = 0;
        if (ch.type === 'streak') current = Math.min(state.streak, ch.target);
        else if (ch.type === 'saved') current = Math.min(state.totalSaved, ch.target);
        else if (ch.type === 'trees') current = Math.min(Math.floor(state.totalSaved / 10), ch.target);
        else if (ch.type === 'perfect') {
            const today = getTodayString();
            const logged = (state.logs[today] || []).length;
            const total = getRecommendedHabits().length;
            current = logged >= total && total > 0 ? 1 : 0;
        }

        const pct = Math.min((current / ch.target) * 100, 100);
        const isComplete = current >= ch.target;

        const card = document.createElement('div');
        card.className = 'glass-card challenge-card';
        card.innerHTML = `
            <div class="challenge-header">
                <span class="challenge-icon">${ch.icon}</span>
                <span class="challenge-status ${isComplete ? 'status-complete' : 'status-active'}">
                    ${isComplete ? '✓ Complete' : 'Active'}
                </span>
            </div>
            <h4>${ch.title}</h4>
            <p>${ch.desc}</p>
            <div class="challenge-progress">
                <div class="challenge-progress-fill" style="width:${pct}%"></div>
            </div>
            <div class="challenge-meta">
                <span>${current.toFixed(ch.type === 'saved' ? 1 : 0)} / ${ch.target}</span>
                <span>${isComplete ? `🏆 ${ch.reward}` : `${Math.round(pct)}%`}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

export function renderAchievements() {
    const container = document.getElementById('achievements-grid');
    if (!container) return;
    container.innerHTML = '';

    ACHIEVEMENTS.forEach(ach => {
        const unlocked = ach.condition(state);
        const card = document.createElement('div');
        card.className = `glass-card achievement-card${unlocked ? ' unlocked' : ''}`;
        card.innerHTML = `
            <div class="achievement-icon">${ach.icon}</div>
            <h4>${ach.title}</h4>
            <p>${ach.desc}</p>
        `;
        container.appendChild(card);
    });
}

// Offsets
export function renderMarketplace() {
    const grid = document.getElementById('marketplace-grid');
    if (!grid) return;
    grid.innerHTML = '';

    OFFSETS.forEach(project => {
        const card = document.createElement('div');
        card.className = 'glass-card marketplace-card';
        card.innerHTML = `
            <div class="marketplace-card-image" style="background-image: url('${project.image}')">
                <span class="marketplace-badge">${project.badge}</span>
            </div>
            <div class="marketplace-card-body">
                <h4>${project.title}</h4>
                <p style="font-size: 0.8rem; line-height: 1.4; color: var(--text-secondary); margin-top: 4px;">${project.desc}</p>
            </div>
            <div class="marketplace-card-footer">
                <div class="marketplace-price">
                    <span>$${project.costPer100kg.toFixed(2)}</span>
                    <small>per 100 kg CO₂e</small>
                </div>
                <button class="btn btn-primary" data-offset-id="${project.id}" data-offset-saving="${project.saving}">Offset 100 kg</button>
            </div>
        `;
        
        card.querySelector('button').addEventListener('click', function() {
            buyOffset(this.dataset.offsetId, parseFloat(this.dataset.offsetSaving));
        });
        
        grid.appendChild(card);
    });
}

function buyOffset(projectId, saving) {
    const today = getTodayString();
    if (!state.logs[today]) state.logs[today] = [];
    
    const habitId = `offset_${projectId}_${Date.now()}`;
    const offsetProject = OFFSETS.find(x => x.id === projectId);
    
    const customHabit = {
        id: habitId,
        name: `Offset: ${offsetProject.title}`,
        category: 'WASTE',
        saving: saving,
        desc: 'Verified carbon offset purchase.',
        icon: 'trees'
    };
    HABIT_CATALOG.push(customHabit);
    state.logs[today].push(habitId);

    triggerConfetti();
    showToast(`Successfully offset 100 kg CO₂e! 🌳`, 'success');
    
    calculateTotalSaved();
    saveLocalStorage();
    
    if (state.syncEnabled) triggerCloudSync();
    
    renderMarketplace();
    updateCarbonPulseOrb();
}

// Live feed simulator
export function renderFeed() {
    if (feedInterval) clearInterval(feedInterval);

    const feedList = document.getElementById('feed-list');
    if (!feedList) return;

    if (feedList.children.length === 0) {
        for (let i = 0; i < 4; i++) {
            const txn = FEED_TRANSACTIONS[Math.floor(Math.random() * FEED_TRANSACTIONS.length)];
            addFeedItem(txn, false);
        }
    }

    feedInterval = setInterval(() => {
        const txn = FEED_TRANSACTIONS[Math.floor(Math.random() * FEED_TRANSACTIONS.length)];
        simulatePipelineFlow(txn, () => {
            addFeedItem(txn, true);
        });
    }, 7000);
}

function addFeedItem(txn, animate = true) {
    const feedList = document.getElementById('feed-list');
    if (!feedList) return;

    const item = document.createElement('div');
    item.className = 'feed-item';
    if (!animate) item.style.animation = 'none';

    const iconMap = {
        TRANSPORT: 'car',
        DIET: 'salad',
        ENERGY: 'zap',
        SHOPPING: 'shopping-bag',
        WASTE: 'trash-2'
    };
    const icon = iconMap[txn.category] || 'credit-card';

    item.innerHTML = `
        <div class="feed-item-icon" style="background: var(--surface); color: var(--green-500); border: 1px solid var(--border);">
            <i data-lucide="${icon}"></i>
        </div>
        <div class="feed-item-body">
            <div class="feed-item-title">${txn.title}</div>
            <div class="feed-item-time">${new Date().toLocaleTimeString()} • ${txn.category}</div>
        </div>
        <div class="feed-item-val ${txn.type === 'saving' ? 'saving' : 'emission'}">
            ${txn.type === 'saving' ? '-' : '+'}${txn.co2.toFixed(1)} kg
        </div>
    `;

    feedList.insertBefore(item, feedList.firstChild);
    if (feedList.children.length > 8) {
        feedList.lastChild.remove();
    }

    lucide.createIcons();

    feedStats.processed++;
    if (txn.type === 'saving') {
        feedStats.totalCo2 -= txn.co2;
    } else {
        feedStats.totalCo2 += txn.co2;
    }

    setText('feed-processed', feedStats.processed);
    setText('feed-total-co2', `${feedStats.totalCo2.toFixed(1)} kg`);
    setText('feed-avg-co2', `${(feedStats.totalCo2 / feedStats.processed).toFixed(1)} kg`);
}

// Pipeline visualizer
export function setupPipelineEvents() {
    document.getElementById('run-pipeline-btn')?.addEventListener('click', () => {
        if (pipelineActive) return;
        const txn = FEED_TRANSACTIONS[Math.floor(Math.random() * FEED_TRANSACTIONS.length)];
        simulatePipelineFlow(txn, () => {
            showToast('Pipeline execution complete! 🚀', 'success');
        });
    });

    document.getElementById('auto-pipeline-btn')?.addEventListener('click', function() {
        if (autoPipelineInterval) {
            clearInterval(autoPipelineInterval);
            autoPipelineInterval = null;
            this.classList.remove('btn-primary');
            this.classList.add('btn-ghost');
            this.innerHTML = '<i data-lucide="repeat"></i> Auto Mode';
            showToast('Auto Mode disabled.', 'info');
        } else {
            this.classList.remove('btn-ghost');
            this.classList.add('btn-primary');
            this.innerHTML = '<i data-lucide="repeat-2"></i> Stop Auto';
            showToast('Auto Mode active.', 'success');
            autoPipelineInterval = setInterval(() => {
                const txn = FEED_TRANSACTIONS[Math.floor(Math.random() * FEED_TRANSACTIONS.length)];
                simulatePipelineFlow(txn);
            }, 8000);
        }
        lucide.createIcons();
    });
}

function renderPipelineVisualOutput(payload) {
    const pipeOutput = document.getElementById('pipeline-output');
    if (!pipeOutput) return;

    const iconMap = {
        TRANSPORT: 'car',
        DIET: 'salad',
        ENERGY: 'zap',
        SHOPPING: 'shopping-bag',
        WASTE: 'trash-2'
    };
    const icon = iconMap[payload.input.category] || 'credit-card';

    // Format narrative log strings
    const impactText = payload.quant.emissions_kg < 0 
        ? `offset/saved <strong style="color: var(--green-400);">${Math.abs(payload.quant.emissions_kg).toFixed(2)} kg CO₂e</strong>` 
        : `emitted <strong style="color: var(--red-500);">${payload.quant.emissions_kg.toFixed(2)} kg CO₂e</strong>`;

    pipeOutput.innerHTML = `
        <div class="pipeline-tabbed-output">
            <div class="pvo-tabs">
                <button class="pvo-tab-btn active" data-tab="cards" type="button"><i data-lucide="layout"></i> Cards View</button>
                <button class="pvo-tab-btn" data-tab="narrative" type="button"><i data-lucide="file-text"></i> Narrative Log</button>
                <button class="pvo-tab-btn" data-tab="raw" type="button"><i data-lucide="code"></i> Raw Payload</button>
            </div>

            <!-- CARDS TAB -->
            <div class="pvo-tab-content" id="pvc-cards">
                <div class="pipeline-visual-output">
                    <div class="pvo-header">
                        <div class="pvo-title-wrap">
                            <div class="pvo-icon"><i data-lucide="${icon}"></i></div>
                            <div style="text-align: left;">
                                <h4 class="pvo-title">${payload.input.title}</h4>
                                <span class="pvo-meta">${payload.input.category} • $${payload.input.amount.toFixed(2)}</span>
                            </div>
                        </div>
                        <span class="pvo-badge ${payload.quant.emissions_kg < 0 ? 'saving' : 'emission'}">
                            ${payload.quant.emissions_kg < 0 ? '-' : '+'}${Math.abs(payload.quant.emissions_kg).toFixed(1)} kg
                        </span>
                    </div>

                    <div class="pvo-agents-grid">
                        <div class="pvo-agent-card">
                            <div class="pvo-agent-header">
                                <span class="pvo-agent-name">🔍 Auditor Agent</span>
                                <span class="pvo-agent-status status-success">Passed</span>
                            </div>
                            <div class="pvo-agent-body" style="text-align: left;">
                                <div class="pvo-field"><span class="pvo-label">Class:</span> <span class="pvo-val">${payload.auditor.classification}</span></div>
                                <div class="pvo-field"><span class="pvo-label">Amount:</span> <span class="pvo-val">$${payload.auditor.amount.toFixed(2)}</span></div>
                            </div>
                        </div>

                        <div class="pvo-agent-card">
                            <div class="pvo-agent-header">
                                <span class="pvo-agent-name">📊 Quant Agent</span>
                                <span class="pvo-agent-status status-success">Calculated</span>
                            </div>
                            <div class="pvo-agent-body" style="text-align: left;">
                                <div class="pvo-field"><span class="pvo-label">Source:</span> <span class="pvo-val">${payload.quant.source}</span></div>
                                <div class="pvo-field"><span class="pvo-label">Grid Mix:</span> <span class="pvo-val">${payload.quant.region_applied} (${payload.quant.grid_intensity_adjustment})</span></div>
                            </div>
                        </div>

                        <div class="pvo-agent-card span-2">
                            <div class="pvo-agent-header">
                                <span class="pvo-agent-name">🧠 Coach Agent</span>
                                <span class="pvo-agent-status status-success">Formulated</span>
                            </div>
                            <div class="pvo-agent-body" style="text-align: left;">
                                <div class="pvo-field"><span class="pvo-label">Framing:</span> <span class="pvo-val highlight">${payload.coach.behavioral_framing}</span></div>
                                <div class="pvo-nudge">"${payload.coach.nudge_text}"</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- NARRATIVE TAB -->
            <div class="pvo-tab-content hidden" id="pvc-narrative">
                <div class="pvo-narrative-box">
                    <div class="pvo-narrative-step">
                        <div class="pvo-step-icon">📥</div>
                        <div class="pvo-step-text">
                            <div class="pvo-step-title">1. Raw Data Ingestion</div>
                            <div class="pvo-step-desc">Ingested raw transaction log: <strong>"${payload.input.title}"</strong> under category <strong>${payload.input.category}</strong> with a financial value of <strong>$${payload.input.amount.toFixed(2)}</strong>.</div>
                        </div>
                    </div>
                    
                    <div class="pvo-narrative-step">
                        <div class="pvo-step-icon">🔍</div>
                        <div class="pvo-step-text">
                            <div class="pvo-step-title">2. Auditor Classification</div>
                            <div class="pvo-step-desc">Auditor parsed the raw text payload. Confirmed activity category as <strong>${payload.auditor.classification}</strong> and normalized unit amounts to match standard LCA registers. Audit status: <span style="color: var(--green-400); font-weight: bold;">SUCCESS</span>.</div>
                        </div>
                    </div>

                    <div class="pvo-narrative-step">
                        <div class="pvo-step-icon">📊</div>
                        <div class="pvo-step-text">
                            <div class="pvo-step-title">3. Quant LCA Calculation</div>
                            <div class="pvo-step-desc">Quant loader evaluated carbon coefficients using <strong>${payload.quant.source}</strong>. Adjusted grid intensity factor for region <strong>${payload.quant.region_applied}</strong> with multiplier coefficient <strong>${payload.quant.grid_intensity_adjustment}</strong>. Final calculated footprint impact: user ${impactText}.</div>
                        </div>
                    </div>

                    <div class="pvo-narrative-step">
                        <div class="pvo-step-icon">🧠</div>
                        <div class="pvo-step-text">
                            <div class="pvo-step-title">4. Coach Nudge Generation</div>
                            <div class="pvo-step-desc">Coach agent formulated a behavioral science nudge framed using <strong>${payload.coach.behavioral_framing}</strong> psychology to maximize habit adherence. Nudge payload: <em>"${payload.coach.nudge_text}"</em></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- RAW JSON TAB -->
            <div class="pvo-tab-content hidden" id="pvc-raw">
                <div class="pvo-raw-json">
                    <pre>${JSON.stringify(payload, null, 2)}</pre>
                </div>
            </div>
        </div>
    `;

    lucide.createIcons();

    // Hook up tabs switcher
    const tabBtns = pipeOutput.querySelectorAll('.pvo-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const targetTab = btn.dataset.tab;
            const tabCards = pipeOutput.querySelector('#pvc-cards');
            const tabNarrative = pipeOutput.querySelector('#pvc-narrative');
            const tabRaw = pipeOutput.querySelector('#pvc-raw');

            tabCards.classList.add('hidden');
            tabNarrative.classList.add('hidden');
            tabRaw.classList.add('hidden');

            if (targetTab === 'cards') tabCards.classList.remove('hidden');
            else if (targetTab === 'narrative') tabNarrative.classList.remove('hidden');
            else if (targetTab === 'raw') tabRaw.classList.remove('hidden');
        });
    });
}

function simulatePipelineFlow(txn, callback) {
    if (pipelineActive) return;
    pipelineActive = true;

    const nodes = {
        input: document.getElementById('pipe-input'),
        auditor: document.getElementById('pipe-auditor'),
        quant: document.getElementById('pipe-quant'),
        coach: document.getElementById('pipe-coach'),
        output: document.getElementById('pipe-output')
    };

    const conns = {
        c1: document.getElementById('pipe-conn-1'),
        c2: document.getElementById('pipe-conn-2'),
        c3: document.getElementById('pipe-conn-3'),
        c4: document.getElementById('pipe-conn-4')
    };

    const dot = {
        auditor: document.getElementById('agent-dot-auditor'),
        quant: document.getElementById('agent-dot-quant'),
        coach: document.getElementById('agent-dot-coach')
    };

    const statusText = {
        auditor: document.getElementById('agent-status-auditor'),
        quant: document.getElementById('agent-status-quant'),
        coach: document.getElementById('agent-status-coach')
    };

    const pipeOutput = document.getElementById('pipeline-output');
    const pipeLog = document.getElementById('pipeline-log');

    if (!pipeLog) {
        pipelineActive = false;
        if (callback) callback();
        return;
    }

    Object.values(nodes).forEach(n => n?.classList.remove('active'));
    Object.values(conns).forEach(c => c?.classList.remove('active'));
    Object.values(dot).forEach(d => { if (d) d.className = 'agent-dot'; });
    Object.values(statusText).forEach(s => { if (s) s.textContent = 'Idle'; });

    const log = (msg) => {
        const time = new Date().toLocaleTimeString();
        pipeLog.innerHTML += `<div>[${time}] ${msg}</div>`;
        pipeLog.scrollTop = pipeLog.scrollHeight;
    };

    pipeLog.innerHTML = '';
    log(`[System] Input data received: "${txn.title}"`);
    nodes.input?.classList.add('active');

    // auditor step
    setTimeout(() => {
        conns.c1?.classList.add('active');
        log('[System] Transferring data to Auditor Agent...');
        
        setTimeout(() => {
            nodes.auditor?.classList.add('active');
            if (dot.auditor) dot.auditor.className = 'agent-dot processing';
            if (statusText.auditor) statusText.auditor.textContent = 'Auditing...';
            
            const auditRes = AuditorAgent.audit(txn);
            log('[Auditor] Classification successful. Category: ' + auditRes.classification + ' | Value: $' + auditRes.amount.toFixed(2));
            log('[Auditor] Creating normalized carbon audit payload...');

            // Quant step
            setTimeout(() => {
                conns.c2?.classList.add('active');
                if (dot.auditor) dot.auditor.className = 'agent-dot active';
                if (statusText.auditor) statusText.auditor.textContent = 'Idle';
                log('[System] Passing audit payload to Quant Agent...');

                setTimeout(() => {
                    nodes.quant?.classList.add('active');
                    if (dot.quant) dot.quant.className = 'agent-dot processing';
                    if (statusText.quant) statusText.quant.textContent = 'Quantifying...';
                    
                    const quantRes = QuantAgent.calculate(auditRes, txn);
                    log('[Quant] Fetching LCA factors. Regional grid correction: ' + quantRes.region_applied);
                    log('[Quant] Calculated emission impact: ' + (quantRes.emissions_kg < 0 ? '-' : '+') + Math.abs(quantRes.emissions_kg).toFixed(2) + ' kg CO₂e');

                    // Coach step
                    setTimeout(() => {
                        conns.c3?.classList.add('active');
                        if (dot.quant) dot.quant.className = 'agent-dot active';
                        if (statusText.quant) statusText.quant.textContent = 'Idle';
                        log('[System] Calculations finalized. Transferring to Coach Agent...');

                        setTimeout(() => {
                            nodes.coach?.classList.add('active');
                            if (dot.coach) dot.coach.className = 'agent-dot processing';
                            if (statusText.coach) statusText.coach.textContent = 'Coaching...';
                            
                            const coachRes = CoachAgent.formulate(auditRes, quantRes, txn);
                            log('[Coach] Formulating behavioral nudge framing...');
                            log('[Coach] Generated nudge text: "' + coachRes.nudge_text + '"');

                            // UI step
                            setTimeout(() => {
                                conns.c4?.classList.add('active');
                                if (dot.coach) dot.coach.className = 'agent-dot active';
                                if (statusText.coach) statusText.coach.textContent = 'Idle';
                                log('[System] Pipeline processing complete. Dispatching to UI controller...');

                                setTimeout(() => {
                                    nodes.output?.classList.add('active');
                                    log('[System] UI render successfully updated.');
                                    
                                    const payload = {
                                        input: { title: txn.title, amount: txn.amount, category: txn.category },
                                        auditor: auditRes,
                                        quant: quantRes,
                                        coach: coachRes
                                    };
                                    renderPipelineVisualOutput(payload);
                                    
                                    if (txn.type === 'saving') {
                                        const today = getTodayString();
                                        if (!state.logs[today]) state.logs[today] = [];
                                        const mockActionId = `sim_${txn.category.toLowerCase()}_${Date.now()}`;
                                        const simHabit = {
                                            id: mockActionId,
                                            name: txn.title,
                                            category: txn.category,
                                            saving: txn.co2,
                                            desc: 'Auto-detected by EcoPulse agents.',
                                            icon: txn.icon
                                        };
                                        HABIT_CATALOG.push(simHabit);
                                        state.logs[today].push(mockActionId);
                                        
                                        calculateTotalSaved();
                                        saveLocalStorage();
                                        renderDashboard();
                                        if (state.syncEnabled) triggerCloudSync();
                                    }

                                    pipelineActive = false;
                                    if (callback) callback();
                                }, 800);
                            }, 800);
                        }, 800);
                    }, 800);
                }, 800);
            }, 800);
        }, 800);
    }, 800);
}

// Settings handlers
export function setupSettings() {
    document.getElementById('save-settings-btn')?.addEventListener('click', () => {
        state.profile.region = document.getElementById('s-region').value;
        state.profile.householdSize = parseInt(document.getElementById('s-household').value) || 1;
        calculateBaselineFromProfile();
        saveLocalStorage();
        showToast('Settings saved successfully!', 'success');
        if (state.syncEnabled) triggerCloudSync();
        renderDashboard();
    });

    document.getElementById('export-btn')?.addEventListener('click', () => {
        const data = JSON.stringify(state, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ecopulse_export_${getTodayString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Data exported! 📦', 'info');
    });

    document.getElementById('delete-btn')?.addEventListener('click', () => {
        if (confirm('Delete ALL local data? This cannot be undone.')) {
            localStorage.removeItem('bloom_state_v2');
            localStorage.removeItem('bloom_mock_server_db');
            showToast('All data deleted.', 'warning');
            setTimeout(() => window.location.reload(), 800);
        }
    });

    document.querySelector('.toggle-password')?.addEventListener('click', () => {
        const input = document.getElementById('sync-pass');
        const icon = document.querySelector('.toggle-password i');
        if (input && icon) {
            if (input.type === 'password') {
                input.type = 'text';
                icon.setAttribute('data-lucide', 'eye-off');
            } else {
                input.type = 'password';
                icon.setAttribute('data-lucide', 'eye');
            }
            lucide.createIcons();
        }
    });

    document.getElementById('sync-enable-btn')?.addEventListener('click', async () => {
        const passphrase = document.getElementById('sync-pass')?.value.trim();
        const status = document.getElementById('sync-status');
        if (!passphrase || passphrase.length < 8) {
            showToast('Passphrase must be 8+ characters.', 'error');
            return;
        }
        if (status) {
            status.classList.remove('hidden');
            status.textContent = 'Deriving encryption keys...';
        }
        updateSyncLed('syncing');

        try {
            state.syncPassphrase = passphrase;
            state.syncEnabled = true;
            await triggerCloudSync();
            if (status) status.textContent = '✓ Encrypted sync active. Your data is backed up.';
            updateSyncLed('active');
            saveLocalStorage();
            showToast('Cloud sync enabled! 🔐', 'success');
        } catch (e) {
            console.error(e);
            if (status) status.textContent = '✗ Sync failed. Check console.';
            updateSyncLed('error');
        }
    });

    document.getElementById('sync-restore-btn')?.addEventListener('click', async () => {
        const passphrase = document.getElementById('sync-pass')?.value.trim();
        const status = document.getElementById('sync-status');
        if (!passphrase || passphrase.length < 8) {
            showToast('Enter a valid passphrase.', 'error');
            return;
        }
        if (status) {
            status.classList.remove('hidden');
            status.textContent = 'Decrypting cloud backup...';
        }
        updateSyncLed('syncing');

        try {
            const ok = await restoreFromCloud(passphrase);
            if (ok) {
                if (status) status.textContent = '✓ Restore successful!';
                updateSyncLed('active');
                triggerConfetti();
                renderDashboard();
                showToast('Data restored! 🎉', 'success');
            } else {
                if (status) status.textContent = 'No backup found for this passphrase.';
                updateSyncLed('offline');
            }
        } catch (e) {
            console.error(e);
            if (status) status.textContent = '✗ Decryption failed. Check passphrase.';
            updateSyncLed('error');
        }
    });

    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.theme = btn.dataset.theme;
            applyTheme(state.theme);
            saveLocalStorage();
            
            const activeView = document.querySelector('.nav-btn.active')?.dataset.view || 'dashboard';
            if (activeView === 'dashboard') renderDashboard();
            if (activeView === 'analytics') renderAnalytics();
        });
    });

    const activeThemeBtn = document.querySelector(`.theme-btn[data-theme="${state.theme}"]`);
    if (activeThemeBtn) activeThemeBtn.classList.add('active');

    if (state.syncEnabled && state.syncPassphrase) {
        updateSyncLed('active');
        const passInput = document.getElementById('sync-pass');
        if (passInput) passInput.value = state.syncPassphrase;
    } else {
        updateSyncLed('offline');
    }
}

export function renderSettings() {
    const regionEl = document.getElementById('s-region');
    const householdEl = document.getElementById('s-household');
    if (regionEl) regionEl.value = state.profile.region;
    if (householdEl) householdEl.value = state.profile.householdSize;
}

export function applyTheme(theme) {
    const root = document.documentElement;
    root.removeAttribute('data-theme');
    document.body.classList.remove('theme-dark');

    if (theme === 'dark') {
        root.setAttribute('data-theme', 'dark');
        document.body.classList.add('theme-dark');
    } else if (theme === 'light') {
        root.setAttribute('data-theme', 'light');
    }
}

export function setupSimulatorFeeds() {
    document.getElementById('btn-sim-eco')?.addEventListener('click', () => {
        const log = { title: 'Commuted by Bicycle', category: 'TRANSPORT', amount: 0.00, co2: 1.8, type: 'saving', icon: 'bike' };
        simulatePipelineFlow(log, () => {
            showToast('Eco-Warrior Commute simulated! 🚲', 'success');
        });
    });

    document.getElementById('btn-sim-high')?.addEventListener('click', () => {
        const log = { title: 'Flight: London to Paris', category: 'TRANSPORT', amount: 120.00, co2: 64.5, type: 'emission', icon: 'plane' };
        simulatePipelineFlow(log, () => {
            showToast('High-Carbon Flight simulated! ✈️', 'warning');
        });
    });

    document.getElementById('btn-sim-home')?.addEventListener('click', () => {
        const log = { title: 'EcoSmart Thermostat optimization', category: 'ENERGY', amount: 0.00, co2: 2.1, type: 'saving', icon: 'thermometer' };
        simulatePipelineFlow(log, () => {
            showToast('IoT Smart Heat Pump active! 🌡️', 'success');
        });
    });
}

// Helpers
function setText(id, val) { 
    const el = document.getElementById(id); 
    if (el) el.textContent = val; 
}

export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: 'check-circle-2', info: 'info', warning: 'alert-triangle', error: 'x-circle' };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i data-lucide="${icons[type] || 'info'}" class="toast-icon"></i><span>${message}</span>`;
    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

export function triggerConfetti() {
    if (typeof confetti !== 'function') return;
    confetti({
        particleCount: 60,
        spread: 55,
        origin: { y: 0.75 },
        colors: ['#22C55E', '#16A34A', '#4ADE80', '#BBF7D0'],
        disableForReducedMotion: true,
    });
}
