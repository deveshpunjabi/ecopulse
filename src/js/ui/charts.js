// ==========================================
// EcoPulse — Chart.js Visualizers
// ==========================================

import { state } from '../state.js';
import { HABIT_CATALOG } from '../constants.js';

let trendChartInstance = null;
let breakdownChartInstance = null;
let miniChartInstance = null;

function isDarkMode() {
    if (state.theme === 'dark') return true;
    if (state.theme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function getLast7DaysData() {
    const labels = [], data = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
        const dateStr = d.toISOString().split('T')[0];
        let sum = 0;
        (state.logs[dateStr] || []).forEach(id => {
            const h = HABIT_CATALOG.find(x => x.id === id);
            if (h) sum += h.saving;
        });
        data.push(sum);
    }
    return { labels, data };
}

export function getLast30DaysData() {
    const labels = [], data = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        const dateStr = d.toISOString().split('T')[0];
        let sum = 0;
        (state.logs[dateStr] || []).forEach(id => {
            const h = HABIT_CATALOG.find(x => x.id === id);
            if (h) sum += h.saving;
        });
        data.push(sum);
    }
    return { labels, data };
}

export function renderMiniChart() {
    const ctx = document.getElementById('miniChart');
    if (!ctx) return;

    if (miniChartInstance) miniChartInstance.destroy();

    const { labels, data } = getLast7DaysData();
    const isDark = isDarkMode();

    miniChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: 'rgba(34, 197, 94, 0.5)',
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { display: false },
                y: { display: false }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? '#121D17' : '#fff',
                    titleColor: isDark ? '#e8f0ec' : '#0f1e15',
                    bodyColor: isDark ? '#94a89c' : '#4b6358',
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    borderWidth: 1,
                    cornerRadius: 10,
                    padding: 10,
                }
            }
        }
    });
}

export function renderTrendChart() {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;
    if (trendChartInstance) trendChartInstance.destroy();

    const { labels, data } = getLast30DaysData();
    const isDark = isDarkMode();

    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'CO₂ Saved (kg)',
                data,
                borderColor: '#22C55E',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointBackgroundColor: '#22C55E',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: isDark ? '#5e756a' : '#7d9a8b' },
                    grid: { color: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }
                },
                x: {
                    ticks: { color: isDark ? '#5e756a' : '#7d9a8b', maxTicksLimit: 10 },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? '#121D17' : '#fff',
                    titleColor: isDark ? '#e8f0ec' : '#0f1e15',
                    bodyColor: isDark ? '#94a89c' : '#4b6358',
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    borderWidth: 1,
                    cornerRadius: 10,
                    padding: 12,
                }
            }
        }
    });
}

export function renderBreakdownChart() {
    const ctx = document.getElementById('breakdownChart');
    if (!ctx) return;
    if (breakdownChartInstance) breakdownChartInstance.destroy();

    const isDark = isDarkMode();

    breakdownChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Transport', 'Diet', 'Home Energy', 'Waste'],
            datasets: [{
                data: [state.baseline.transport, state.baseline.diet, state.baseline.energy, state.baseline.waste],
                backgroundColor: ['#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6'],
                borderWidth: 0,
                hoverOffset: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: isDark ? '#94a89c' : '#4b6358',
                        font: { family: 'Inter', weight: '600', size: 12 },
                        padding: 16,
                        usePointStyle: true,
                        pointStyleWidth: 10,
                    }
                }
            }
        }
    });
}

export function destroyCharts() {
    if (trendChartInstance) trendChartInstance.destroy();
    if (breakdownChartInstance) breakdownChartInstance.destroy();
    if (miniChartInstance) miniChartInstance.destroy();
}
