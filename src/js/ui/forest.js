// ==========================================
// EcoPulse — Procedural Fractal Forest
// ==========================================

import { state } from '../state.js';

function isDarkMode() {
    if (state.theme === 'dark') return true;
    if (state.theme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function drawTree(ctx, startX, startY, len, angle, branchWidth, color, leafColor) {
    ctx.beginPath();
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = branchWidth;
    ctx.translate(startX, startY);
    ctx.rotate(angle * Math.PI / 180);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -len);
    ctx.stroke();

    if (len < 9) {
        // Draw leaves
        ctx.beginPath();
        ctx.arc(0, -len, 4 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fillStyle = leafColor;
        ctx.fill();
        ctx.restore();
        return;
    }

    // Left and right branches
    drawTree(ctx, 0, -len, len * 0.75, -20 - Math.random() * 10, branchWidth * 0.7, color, leafColor);
    drawTree(ctx, 0, -len, len * 0.75, 20 + Math.random() * 10, branchWidth * 0.7, color, leafColor);
    
    ctx.restore();
}

export function renderProceduralForest() {
    const canvas = document.getElementById('forestCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Handle HDPI scaling
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const totalTrees = Math.floor(state.totalSaved / 10);
    const fractional = (state.totalSaved % 10) / 10;

    // Ground
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 20);
    ctx.lineTo(canvas.width, canvas.height - 20);
    ctx.strokeStyle = 'rgba(94, 117, 106, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Fill Ground
    ctx.beginPath();
    ctx.rect(0, canvas.height - 20, canvas.width, 20);
    ctx.fillStyle = isDarkMode() ? 'rgba(18, 29, 23, 0.6)' : 'rgba(240, 245, 241, 0.6)';
    ctx.fill();

    // Draw stable trees
    const maxVisibleTrees = Math.min(10, totalTrees);
    const spacing = canvas.width / (maxVisibleTrees + 1);

    // Set colors
    const trunkColor = isDarkMode() ? '#5e756a' : '#7d9a8b';
    const leafColors = [
        '#22C55E', // Green
        '#10B981', // Emerald
        '#4ADE80', // Mint
        '#84CC16', // Lime
        '#3B82F6'  // Blue spruce
    ];

    for (let i = 0; i < maxVisibleTrees; i++) {
        const x = spacing * (i + 1);
        const y = canvas.height - 20;
        // Deterministic tree properties based on index
        const height = 30 + (i * 3 % 12);
        const angle = (i * 7 % 6) - 3; // slight trunk tilt
        const leafColor = leafColors[i % leafColors.length];
        
        drawTree(ctx, x, y, height, angle, 3.5, trunkColor, leafColor);
    }

    // If more than 10 trees, draw a forest count text
    if (totalTrees > 10) {
        ctx.fillStyle = isDarkMode() ? '#E8F0EC' : '#0F1E15';
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(`+ ${totalTrees - 10} more trees in back`, canvas.width - 20, 25);
    }

    // Draw growing seedling
    if (fractional > 0.05) {
        const nextX = spacing * (maxVisibleTrees + 1);
        if (nextX < canvas.width - 20) {
            const y = canvas.height - 20;
            const size = 8 + fractional * 12;
            // Draw a tiny seedling
            ctx.beginPath();
            ctx.moveTo(nextX, y);
            ctx.lineTo(nextX, y - size);
            ctx.strokeStyle = '#10B981';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Draw tiny leaves
            ctx.beginPath();
            ctx.arc(nextX - 3, y - size + 2, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#4ADE80';
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(nextX + 3, y - size + 1, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#4ADE80';
            ctx.fill();
        }
    }
    
    if (totalTrees === 0 && fractional <= 0.05) {
        // Show empty state text on canvas
        ctx.fillStyle = 'rgba(94, 117, 106, 0.7)';
        ctx.font = '13px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Log eco-actions to grow your virtual forest 🌲', canvas.width / 2, canvas.height / 2);
    }
}
