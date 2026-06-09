import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { state } from '../src/js/state.js';
import { getLast7DaysData, getLast30DaysData, renderMiniChart, renderTrendChart, renderBreakdownChart, destroyCharts } from '../src/js/ui/charts.js';
import { renderProceduralForest } from '../src/js/ui/forest.js';
import { initOrbCanvas, updateOrbState, stopOrbAnimation } from '../src/js/ui/orb.js';

// Setup Mocks
beforeAll(() => {
    // Mock window and matchMedia
    globalThis.window = {
        matchMedia: () => ({ matches: false })
    };

    // Mock Canvas & Context
    const mockContext = {
        createRadialGradient: () => ({
            addColorStop: () => {}
        }),
        beginPath: () => {},
        arc: () => {},
        fill: () => {},
        stroke: () => {},
        moveTo: () => {},
        lineTo: () => {},
        clearRect: () => {},
        rect: () => {},
        fillText: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        font: '',
        textAlign: ''
    };

    const mockCanvas = {
        getContext: () => mockContext,
        getBoundingClientRect: () => ({ width: 200, height: 100 }),
        width: 200,
        height: 100
    };

    // Mock document.getElementById
    globalThis.document = {
        getElementById: (id) => {
            if (id === 'miniChart' || id === 'trendChart' || id === 'breakdownChart' || id === 'forestCanvas' || id === 'orbCanvas') {
                return mockCanvas;
            }
            return null;
        }
    };

    // Mock Chart.js
    globalThis.Chart = class MockChart {
        constructor(ctx, config) {
            this.ctx = ctx;
            this.config = config;
        }
        destroy() {}
    };

    // Mock animation frames
    globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 16);
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
});

describe('UI Charts', () => {
    beforeEach(() => {
        state.logs = {};
        state.baseline = { transport: 2000, diet: 1000, energy: 1500, waste: 500 };
    });

    it('should calculate last 7 days data', () => {
        const { labels, data } = getLast7DaysData();
        expect(labels).toHaveLength(7);
        expect(data).toHaveLength(7);
    });

    it('should calculate last 30 days data', () => {
        const { labels, data } = getLast30DaysData();
        expect(labels).toHaveLength(30);
        expect(data).toHaveLength(30);
    });

    it('should render mini chart, trend chart, and breakdown chart without crashing', () => {
        renderMiniChart();
        renderTrendChart();
        renderBreakdownChart();
        destroyCharts();
    });
});

describe('UI Forest', () => {
    beforeEach(() => {
        state.totalSaved = 25;
    });

    it('should render procedural forest on canvas', () => {
        renderProceduralForest();
    });
});

describe('UI Orb Canvas', () => {
    it('should initialize and animate orb canvas', () => {
        initOrbCanvas();
        updateOrbState('good');
        updateOrbState('warning');
        updateOrbState('critical');
        stopOrbAnimation();
    });
});
