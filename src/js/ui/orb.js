// ==========================================
// EcoPulse — Canvas Orb particle Loop
// ==========================================

let orbCanvas = null;
let orbCtx = null;
let orbParticles = [];
let currentOrbState = 'excellent';
let orbAnimationId = null;

export function initOrbCanvas() {
    orbCanvas = document.getElementById('orbCanvas');
    if (!orbCanvas) return;
    orbCtx = orbCanvas.getContext('2d');
    
    // Create particles
    orbParticles = [];
    for (let i = 0; i < 40; i++) {
        orbParticles.push({
            x: orbCanvas.width / 2 + (Math.random() - 0.5) * 40,
            y: orbCanvas.height / 2 + (Math.random() - 0.5) * 40,
            radius: 1 + Math.random() * 2,
            angle: Math.random() * Math.PI * 2,
            speed: 0.015 + Math.random() * 0.02,
            distance: 30 + Math.random() * 40,
            opacity: 0.2 + Math.random() * 0.6
        });
    }

    if (orbAnimationId) cancelAnimationFrame(orbAnimationId);
    animateOrb();
}

export function updateOrbState(stateClass) {
    currentOrbState = stateClass;
}

export function stopOrbAnimation() {
    if (orbAnimationId) {
        cancelAnimationFrame(orbAnimationId);
        orbAnimationId = null;
    }
}

function animateOrb() {
    if (!orbCanvas || !orbCtx) return;
    orbCtx.clearRect(0, 0, orbCanvas.width, orbCanvas.height);

    const cx = orbCanvas.width / 2;
    const cy = orbCanvas.height / 2;

    // Base styling and parameters based on status
    let color, particleColor, speedMultiplier, chaos;
    if (currentOrbState === 'excellent') {
        color = 'rgba(34, 197, 94, 0.45)';
        particleColor = 'rgba(74, 222, 128, ';
        speedMultiplier = 0.6;
        chaos = 0.0;
    } else if (currentOrbState === 'good') {
        color = 'rgba(59, 130, 246, 0.45)';
        particleColor = 'rgba(96, 165, 250, ';
        speedMultiplier = 1.0;
        chaos = 0.15;
    } else if (currentOrbState === 'warning') {
        color = 'rgba(245, 158, 11, 0.45)';
        particleColor = 'rgba(251, 191, 36, ';
        speedMultiplier = 1.8;
        chaos = 0.6;
    } else { // critical
        color = 'rgba(239, 68, 68, 0.55)';
        particleColor = 'rgba(248, 113, 113, ';
        speedMultiplier = 3.0;
        chaos = 2.5; // vibratory chaos
    }

    // 1. Draw glowing orb background
    const grad = orbCtx.createRadialGradient(cx, cy, 10, cx, cy, 70);
    grad.addColorStop(0, color);
    grad.addColorStop(0.5, color.replace('0.45', '0.2').replace('0.55', '0.3'));
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    orbCtx.beginPath();
    orbCtx.arc(cx, cy, 70, 0, Math.PI * 2);
    orbCtx.fillStyle = grad;
    orbCtx.fill();

    // Draw core highlights
    orbCtx.beginPath();
    orbCtx.arc(cx, cy, 55, 0, Math.PI * 2);
    orbCtx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    orbCtx.fill();

    // 2. Animate and draw particles
    orbParticles.forEach(p => {
        // Move particles in a vortex circle
        p.angle += p.speed * speedMultiplier;
        
        // Apply status-based chaotic vibration
        let rx = cx + Math.cos(p.angle) * p.distance;
        let ry = cy + Math.sin(p.angle) * p.distance;
        
        if (chaos > 0) {
            rx += (Math.random() - 0.5) * chaos * 5;
            ry += (Math.random() - 0.5) * chaos * 5;
        }

        orbCtx.beginPath();
        orbCtx.arc(rx, ry, p.radius, 0, Math.PI * 2);
        orbCtx.fillStyle = particleColor + p.opacity + ')';
        orbCtx.fill();

        // Slight glow shadow for particles
        orbCtx.shadowBlur = 4;
        orbCtx.shadowColor = particleColor + '0.5)';
    });

    orbCtx.shadowBlur = 0; // Reset shadow

    orbAnimationId = requestAnimationFrame(animateOrb);
}
