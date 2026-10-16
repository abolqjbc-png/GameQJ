let gameSoundContext = null;

const playSound = (type, soundEnabled = true) => {
    if (!soundEnabled) return;
    try {
        if (!gameSoundContext || gameSoundContext.state === 'closed') {
            gameSoundContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = gameSoundContext;
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.onended = () => {
            osc.disconnect();
            gain.disconnect();
        };

        if (type === 'dice') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
            osc.start();
            osc.stop(ctx.currentTime + 0.12);
        } else if (type === 'move') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(320, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(540, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
            osc.start();
            osc.stop(ctx.currentTime + 0.08);
        } else if (type === 'capture') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(250, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        } else if (type === 'tick') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
            osc.start();
            osc.stop(ctx.currentTime + 0.05);
        } else if (type === 'win') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.15);
            osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
            osc.start();
            osc.stop(ctx.currentTime + 0.8);
        } else if (type === 'whoosh') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.35);
            gain.gain.setValueAtTime(0.01, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
        } else if (type === 'jackpot') {
            osc.disconnect();
            gain.disconnect();
            [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, idx) => {
                const subOsc = ctx.createOscillator();
                const subGain = ctx.createGain();
                subOsc.type = 'triangle';
                subOsc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
                subGain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.1);
                subGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.5);
                subOsc.connect(subGain);
                subGain.connect(ctx.destination);
                subOsc.onended = () => {
                    subOsc.disconnect();
                    subGain.disconnect();
                };
                subOsc.start(ctx.currentTime + idx * 0.1);
                subOsc.stop(ctx.currentTime + idx * 0.1 + 0.5);
            });
            return;
        } else if (type === 'coin') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(987.77, ctx.currentTime);
            osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.18, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } else {
            osc.disconnect();
            gain.disconnect();
        }
    } catch (e) {}
};
