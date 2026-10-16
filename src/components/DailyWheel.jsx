// ---------- گردونه‌ی روزانه — نسخه‌ی پریمیوم کازینویی ----------
// وابستگی‌ها (global، مطابق modules.json): WHEEL_PRIZES, pickWheelPrize, getPrizeIndex,
// canSpinWheel, getWheelCooldownLeft, recordWheelSpin, formatWheelCooldown, playSound, IconCoin
// کاملاً خودکفا: تمام استایل‌ها (CSS/Tailwind) داخل همین فایل هستند.

const DW_SEG = 360 / WHEEL_PRIZES.length;
const DW_SIZE = 360, DW_C = 180, DW_R = 150;
const DW_PEGS = WHEEL_PRIZES.length; // یک پگ روی لبه‌ی هر قطعه

const dwToRad = (d) => (d * Math.PI) / 180;
const dwPolar = (r, deg) => [DW_C + r * Math.sin(dwToRad(deg)), DW_C - r * Math.cos(dwToRad(deg))];
const dwSlicePath = (start, end) => {
    const [x1, y1] = dwPolar(DW_R, start);
    const [x2, y2] = dwPolar(DW_R, end);
    return `M ${DW_C} ${DW_C} L ${x1} ${y1} A ${DW_R} ${DW_R} 0 ${DW_SEG > 180 ? 1 : 0} 1 ${x2} ${y2} Z`;
};

// --- صداهای لمسی (خودکفا، بدون وابستگی به core/sound.js) ---
let dwAudioCtx = null;
const dwCtx = () => {
    try { dwAudioCtx = dwAudioCtx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { dwAudioCtx = null; }
    return dwAudioCtx;
};
const dwTick = (vol = 0.08, freq = 1600) => {
    const ctx = dwCtx(); if (!ctx) return;
    try {
        const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
        f.type = 'highpass'; f.frequency.value = 600;
        o.type = 'square'; o.frequency.setValueAtTime(freq, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(freq * 0.4, ctx.currentTime + 0.03);
        g.gain.setValueAtTime(vol, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.045);
        o.connect(f); f.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.05);
    } catch (e) {}
};
const dwClack = () => dwTick(0.05, 2600); // برخورد پگ با فلز
const dwWhoosh = () => { try { playSound('whoosh'); } catch (e) {} };
const dwWinSound = (tier) => {
    try {
        playSound(tier === 'legendary' ? 'jackpot' : tier === 'epic' ? 'win' : 'coin');
    } catch (e) {}
};
const dwBuzz = (ms = 20) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

// --- ذرات انفجاری جشن ---
const DWBurst = ({ color }) => {
    const parts = useMemo(() => Array.from({ length: 44 }, (_, i) => {
        const a = (i / 44) * 360 + Math.random() * 14;
        return {
            id: i,
            c: [color, '#fde047', '#ffffff', '#f59e0b'][i % 4],
            dur: 0.9 + Math.random() * 0.8,
            dist: 90 + Math.random() * 160,
            angle: a,
            size: 4 + Math.random() * 7,
        };
    }), []);
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-[60]">
            {parts.map(p => (
                <span key={p.id} className="absolute left-1/2 top-1/2 rounded-sm"
                    style={{
                        width: p.size, height: p.size, backgroundColor: p.c,
                        boxShadow: `0 0 8px ${p.c}`,
                        animation: `dwBurst ${p.dur}s cubic-bezier(0.1,0.7,0.3,1) forwards`,
                        '--dw-tx': `${Math.cos(dwToRad(p.angle)) * p.dist}px`,
                        '--dw-ty': `${Math.sin(dwToRad(p.angle)) * p.dist}px`,
                    }} />
            ))}
            <style>{`@keyframes dwBurst{0%{transform:translate(-50%,-50%) rotate(0deg);opacity:1}
            100%{transform:translate(calc(-50% + var(--dw-tx)),calc(-50% + var(--dw-ty))) rotate(540deg);opacity:0}}`}</style>
        </div>
    );
};

// --- خودِ گردونه ---
const DWheel = ({ spinning, rotation, spinDuration, onSegmentCross }) => {
    const wheelEl = useRef(null);
    const lastSeg = useRef(-1);

    // ردیابی زاویه با rAF برای صدای تیک‌تاک + لرزش هپتیک سوزنی
    useEffect(() => {
        if (!spinning) { lastSeg.current = -1; return; }
        let raf;
        const step = () => {
            const el = wheelEl.current;
            if (el) {
                try {
                    const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
                    const ang = ((Math.atan2(m.b, m.a) * 180) / Math.PI + 360) % 360;
                    const seg = Math.floor(ang / DW_SEG);
                    if (lastSeg.current !== -1 && seg !== lastSeg.current) {
                        dwClack(); onSegmentCross && onSegmentCross();
                    }
                    lastSeg.current = seg;
                } catch (e) {}
            }
            raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [spinning]);

    return (
        <div className="dw-wheel-stage relative w-full max-w-[360px] mx-auto aspect-square select-none">
            {/* هاله‌ی نئونی پشت گردونه */}
            <div className={`absolute -inset-6 rounded-full blur-3xl transition-all duration-700 ${spinning ? 'opacity-90 scale-105' : 'opacity-40'}`}
                style={{ background: 'radial-gradient(circle,rgba(251,191,36,0.45) 0%,rgba(168,85,247,0.25) 55%,transparent 75%)' }} />

            {/* حلقه‌ی لامپ‌های نئون */}
            <div className="dw-wheel-lights absolute inset-0 rounded-full z-10 pointer-events-none">
                {Array.from({ length: 32 }, (_, i) => (
                    <div key={i} className="absolute left-1/2 top-1/2 w-[7px] h-[7px] rounded-full"
                        style={{
                            transform: `translate(-50%,-50%) rotate(${i * (360 / 32)}deg) translateY(-${DW_R + 16}px)`,
                            background: '#fff7d6',
                            boxShadow: '0 0 6px #fde047, 0 0 14px #f59e0b',
                            opacity: 0.35,
                            animation: spinning
                                ? `dwLed 0.5s ${i * 0.03}s infinite alternate`
                                : `dwIdle 2.4s ${i * 0.09}s infinite alternate`,
                        }} />
                ))}
            </div>

            {/* رینگ فلزی-طلایی بیرونی */}
            <div className="dw-wheel-bezel absolute inset-0 rounded-full z-[5]"
                style={{
                    background: 'conic-gradient(from 0deg,#fef3c7,#b45309,#fde68a,#92400e,#fcd34d,#78350f,#fef9c3,#b45309,#fef3c7)',
                    padding: 10,
                    boxShadow: '0 0 0 3px #1c1917, 0 0 45px rgba(245,158,11,0.55), 0 25px 60px rgba(0,0,0,0.75), inset 0 2px 6px rgba(255,255,255,0.6), inset 0 -3px 8px rgba(120,53,15,0.9)',
                }}>
                <div className="dw-wheel-bezel-inner w-full h-full rounded-full" style={{ background: '#1c1917', boxShadow: 'inset 0 0 25px rgba(0,0,0,0.9)' }} />
            </div>

            {/* دیسک چرخان */}
            <div ref={wheelEl}
                className="dw-wheel-disc absolute inset-[10px] rounded-full overflow-hidden z-20"
                style={{
                    transform: `translateZ(0) rotate(${rotation}deg)`,
                    transition: spinning ? `transform ${spinDuration}s cubic-bezier(0.08,0.92,0.06,1)` : 'none',
                    willChange: 'transform',
                    boxShadow: 'inset 0 0 40px rgba(0,0,0,0.55)',
                }}>
                <svg viewBox={`0 0 ${DW_SIZE} ${DW_SIZE}`} className="dw-wheel-svg w-full h-full">
                    <defs>
                        {WHEEL_PRIZES.map((p, i) => (
                            <radialGradient key={i} id={`dwg-${i}`} cx="35%" cy="30%" r="90%">
                                <stop offset="0%" stopColor={p.light} />
                                <stop offset="55%" stopColor={p.color} />
                                <stop offset="100%" stopColor={p.dark} />
                            </radialGradient>
                        ))}
                        <radialGradient id="dwHub" cx="35%" cy="30%" r="80%">
                            <stop offset="0%" stopColor="#fffbeb" />
                            <stop offset="45%" stopColor="#f59e0b" />
                            <stop offset="100%" stopColor="#78350f" />
                        </radialGradient>
                        <filter id="dwShadow"><feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.7" /></filter>
                    </defs>

                    {WHEEL_PRIZES.map((p, i) => {
                        const center = i * DW_SEG;
                        const [tx, ty] = dwPolar(DW_R * 0.66, center);
                        const [ix, iy] = dwPolar(DW_R * 0.85, center);
                        const [px, py] = dwPolar(DW_R - 3, center + DW_SEG / 2);
                        const icon = p.tier === 'legendary' ? '👑' : p.tier === 'epic' ? '💎' : p.tier === 'rare' ? '⭐' : '';
                        return (
                            <g key={i}>
                                <path d={dwSlicePath(center - DW_SEG / 2, center + DW_SEG / 2)}
                                    fill={`url(#dwg-${i})`} stroke="#fde68a" strokeWidth="1.4" strokeOpacity="0.55" />
                                {/* پگ طلایی */}
                                <circle cx={px} cy={py} r="5" fill="url(#dwHub)" stroke="#78350f" strokeWidth="1.4" filter="url(#dwShadow)" />
                                <circle cx={px - 1.5} cy={py - 1.5} r="1.6" fill="#fff" opacity="0.9" />
                                <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
                                    transform={`rotate(${center},${tx},${ty})`}
                                    fontSize="30" fontWeight="900" fill="#ffffff"
                                    style={{ textShadow: '0 2px 5px rgba(0,0,0,0.85), 0 0 12px rgba(0,0,0,0.5)' }}>
                                    {p.label}
                                </text>
                                {icon && (
                                    <text x={ix} y={iy} textAnchor="middle" dominantBaseline="middle"
                                        transform={`rotate(${center},${ix},${iy})`} fontSize="15"
                                        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{icon}</text>
                                )}
                            </g>
                        );
                    })}

                    {/* توپی مرکزی */}
                    <circle cx={DW_C} cy={DW_C} r="42" fill="#1c1917" stroke="#f59e0b" strokeWidth="3" filter="url(#dwShadow)" />
                    <circle cx={DW_C} cy={DW_C} r="30" fill="url(#dwHub)" stroke="#fef08a" strokeWidth="2" />
                    <text x={DW_C} y={DW_C + 1} textAnchor="middle" dominantBaseline="central"
                        fontSize="20" fontWeight="900" fill="#451a03" style={{ textShadow: '0 1px 0 rgba(255,255,255,0.4)' }}>QJ</text>
                </svg>
            </div>

            {/* نشانگر سه‌بعدی فلزی */}
            <div className={`dw-wheel-pointer absolute top-[-16px] left-1/2 -translate-x-1/2 z-30 ${spinning ? 'dw-pointer-kick' : ''}`}
                style={{ filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.7))' }}>
                <svg width="44" height="58" viewBox="0 0 44 58">
                    <defs>
                        <linearGradient id="dwPtr" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#fef9c3" /><stop offset="45%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#7c2d12" />
                        </linearGradient>
                    </defs>
                    <path d="M 22 56 L 6 22 C 6 10 13 4 22 4 C 31 4 38 10 38 22 Z" fill="url(#dwPtr)" stroke="#451a03" strokeWidth="2.5" />
                    <circle cx="22" cy="20" r="7" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.5" />
                    <circle cx="19.5" cy="17.5" r="2.4" fill="#fff" opacity="0.85" />
                </svg>
            </div>

            <style>{`
                @keyframes dwLed { from { opacity:.3 } to { opacity:1; box-shadow:0 0 10px #fff,0 0 22px #fde047 } }
                @keyframes dwIdle { from { opacity:.25 } to { opacity:.7 } }
                .dw-pointer-kick { animation: dwKick .12s ease-out infinite alternate; transform-origin: 50% 8%; }
                @keyframes dwKick { from { transform: translateX(-50%) rotate(0deg) } to { transform: translateX(-50%) rotate(-9deg) } }
            `}</style>
        </div>
    );
};

// --- نمایش شفاف شانس/سطوح جوایز ---
const DWOddsTable = () => (
    <div className="dw-odds-panel w-full rounded-2xl border border-amber-500/20 bg-black/40 p-3">
        <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[10px] font-black tracking-widest text-amber-400/80">جوایز و شانس‌ها</span>
            <span className="text-[10px] font-bold text-slate-500">وزن / ۱۰۰</span>
        </div>
        <div className="flex flex-col gap-1.5">
            {WHEEL_PRIZES.slice().reverse().map(p => (
                <div key={p.amount} className="flex items-center gap-2">
                    <span className="w-5 h-5 shrink-0 rounded-full border border-white/20 flex items-center justify-center text-[9px]"
                        style={{ background: `linear-gradient(135deg,${p.light},${p.color})` }}>
                        {p.tier === 'legendary' ? '👑' : p.tier === 'epic' ? '💎' : ''}
                    </span>
                    <div className="flex-1 h-2.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700/60">
                        <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${p.weight}%`, background: `linear-gradient(90deg,${p.dark},${p.color},${p.light})`, boxShadow: `0 0 8px ${p.color}` }} />
                    </div>
                    <span className="w-12 text-left font-black text-xs" style={{ color: p.light }} dir="ltr">{p.label}</span>
                    <span className="w-9 text-left text-[10px] font-bold text-slate-400" dir="ltr">{p.weight}%</span>
                </div>
            ))}
        </div>
    </div>
);

// --- مودال اصلی ---
const DailyWheelModal = ({ currentUser, onUserUpdated, onClose }) => {
    const [rotation, setRotation] = useState(0);
    const [spinDuration, setSpinDuration] = useState(0);
    const [spinning, setSpinning] = useState(false);
    const [prize, setPrize] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const [burstKey, setBurstKey] = useState(0);
    const [cooldown, setCooldown] = useState(() => getWheelCooldownLeft(currentUser.username));

    useEffect(() => {
        const id = setInterval(() => setCooldown(getWheelCooldownLeft(currentUser.username)), 1000);
        return () => clearInterval(id);
    }, [currentUser.username]);

    const ready = cooldown <= 0 && !spinning;

    const handleSpin = () => {
        if (!canSpinWheel(currentUser.username) || spinning) return;
        dwCtx(); dwWhoosh(); dwBuzz(35);

        const picked = pickWheelPrize();
        const idx = getPrizeIndex(picked);
        const jitter = (Math.random() - 0.5) * DW_SEG * 0.6;
        const target = 7 * 360 + (360 - idx * DW_SEG + jitter);
        const dur = 6.5 + Math.random() * 1.5;

        setSpinDuration(dur);
        setPrize(picked);
        setSpinning(true);
        setShowResult(false);
        setRotation(r => r + target);

        setTimeout(() => {
            setSpinning(false);
            setShowResult(true);
            setBurstKey(k => k + 1);
            dwWinSound(picked.tier); dwBuzz([30, 40, 60]);
            const updated = recordWheelSpin(currentUser.username, picked.amount);
            if (updated && onUserUpdated) onUserUpdated(updated);
            setCooldown(getWheelCooldownLeft(currentUser.username));
        }, dur * 1000 + 150);
    };

    const modalContent = (
            <div className="dw-backdrop" dir="rtl">
            <div className="absolute inset-0" onClick={!spinning ? onClose : undefined} />
            <style>{`
                @keyframes dwShine { 0% { transform: translateX(-120%) } 100% { transform: translateX(220%) } }
                @keyframes dwFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
                @keyframes dwGlowPulse { 0%,100% { opacity:.5 } 50% { opacity:1 } }
                @keyframes dwBackdropFadeIn { from { opacity: 0 } to { opacity: 1 } }
                @keyframes dwPopIn { from { opacity: 0; transform: translateY(12px) scale(.96) } to { opacity: 1; transform: translateY(0) scale(1) } }
                .dw-backdrop {
                    position: fixed !important; top: 0; left: 0; right: 0; bottom: 0;
                    width: 100vw; height: 100vh; height: 100dvh;
                    display: flex; align-items: center; justify-content: center;
                    z-index: 99999; background: rgba(2,6,23,.78);
                    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
                    padding: 16px; box-sizing: border-box; margin: 0;
                    animation: dwBackdropFadeIn .22s ease-out both;
                }
                .dw-modal {
                    position: relative; margin: auto; max-height: calc(100vh - 40px);
                    max-height: calc(100dvh - 40px); overflow-y: auto;
                    width: min(480px, 94vw); animation: dwPopIn .28s cubic-bezier(.2,.8,.2,1) both;
                }
                .dw-spin-btn {
                    min-height: 56px; width: 100%; font-size: 20px; font-weight: 800;
                    border-radius: 16px; border: none; cursor: pointer;
                    background: linear-gradient(135deg,#fde68a,#f59e0b) !important;
                    color: #1f2937 !important; box-shadow: 0 0 24px rgba(245,158,11,.55) !important;
                    animation: dwGlowPulse 1.8s ease-in-out infinite;
                }
                .dw-spin-btn:disabled {
                    background: rgba(148,163,184,.18) !important; color: #94a3b8 !important;
                    cursor: not-allowed; box-shadow: none !important; animation: none;
                }
                .dw-spin-btn:active:not(:disabled) { transform: scale(.97); }
                .dw-close {
                    position: absolute; top: 14px; inset-inline-start: 14px; z-index: 30;
                    width: 38px; height: 38px; border-radius: 50%;
                    background: rgba(148,163,184,.15); color: #e2e8f0;
                    font-size: 18px; border: 1px solid rgba(148,163,184,.3); cursor: pointer;
                    display: inline-flex; align-items: center; justify-content: center;
                    transition: background .18s ease, transform .18s ease;
                }
                .dw-close:hover { background: rgba(244,63,94,.35); }
                .dw-result-ok {
                    min-height: 48px; padding: 0 40px; font-size: 17px; font-weight: 800;
                    border-radius: 14px; cursor: pointer; color: #1f2937 !important;
                    background: linear-gradient(135deg,#fde68a,#f59e0b) !important;
                    box-shadow: 0 0 24px rgba(245,158,11,.55) !important;
                }
            `}</style>

            <div className="dw-modal dw-dialog rounded-[36px] border border-amber-500/30 p-5 sm:p-7 flex flex-col items-center gap-4"
                role="dialog" aria-modal="true" aria-labelledby="dw-title">

                {/* خط نئونی بالای کادر */}
                <div className="absolute top-0 inset-x-10 h-[2px] rounded-full"
                    style={{ background: 'linear-gradient(90deg,transparent,#fbbf24,transparent)', boxShadow: '0 0 14px #f59e0b' }} />

                <button onClick={onClose} disabled={spinning}
                    className="dw-close disabled:opacity-40">
                    ✕
                </button>

                {/* سربرگ */}
                <div className="dw-header text-center mt-2">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-[11px] font-black tracking-[0.25em] mb-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        گردونه‌ی طلایی کیوجی
                    </div>
                    <h2 id="dw-title" className="text-3xl sm:text-4xl font-black"
                        style={{
                            background: 'linear-gradient(180deg,#fffbeb 10%,#fbbf24 55%,#92400e 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            filter: 'drop-shadow(0 3px 8px rgba(245,158,11,0.35))',
                        }}>
                        شانست رو امتحان کن!
                    </h2>
                </div>

                {/* گردونه */}
                <div className="dw-wheel-wrap w-full flex justify-center py-2">
                    <DWheel spinning={spinning} rotation={rotation} spinDuration={spinDuration} />
                </div>

                {/* دکمه‌ی چرخش / تایمر */}
                <div className="dw-controls w-full">
                    {spinning ? (
                        <div className="dw-status w-full py-4 rounded-2xl bg-indigo-950/60 border border-indigo-400/30 text-indigo-200 font-black text-lg flex items-center justify-center gap-3">
                            <span className="w-5 h-5 rounded-full border-[3px] border-indigo-400/30 border-t-indigo-300 animate-spin" />
                            گردونه در حال چرخش...
                        </div>
                    ) : ready ? (
                        <button onClick={handleSpin} className="dw-spin-btn group relative overflow-hidden">
                            <span className="absolute inset-y-0 w-1/3 bg-white/50 blur-md skew-x-[-20deg]"
                                style={{ animation: 'dwShine 2.4s ease-in-out infinite' }} />
                            <span className="relative flex items-center justify-center gap-2 drop-shadow-sm">🎡 بچـرخـون!</span>
                        </button>
                    ) : (
                        <div className="dw-countdown w-full py-4 rounded-2xl bg-black/50 border border-slate-700/60 text-center">
                            <div className="text-[11px] font-bold text-slate-400 mb-1">چرخش رایگان بعدی در:</div>
                            <div className="font-mono font-black text-2xl text-amber-400 tracking-widest" dir="ltr"
                                style={{ textShadow: '0 0 14px rgba(251,191,36,0.6)' }}>
                                {formatWheelCooldown(cooldown)}
                            </div>
                        </div>
                    )}
                </div>

                {/* جدول شانس */}
                <DWOddsTable />
                <p className="text-[10px] text-slate-500 text-center -mt-2">شانس هر جایزه بر اساس وزن واقعی سیستم محاسبه می‌شود</p>

                {/* کارت جشن جایزه */}
                {showResult && prize && (
                    <div className="dw-result absolute inset-0 z-50 flex flex-col items-center justify-center p-6 text-center rounded-[36px]"
                        style={{ background: 'rgba(5,3,12,0.96)', backdropFilter: 'blur(20px)' }}>
                        <DWBurst key={burstKey} color={prize.color} />

                        <div className="relative mb-5" style={{ animation: 'dwFloat 2.4s ease-in-out infinite' }}>
                            <div className="absolute inset-0 scale-[1.9] rounded-full blur-2xl"
                                style={{ backgroundColor: prize.color, animation: 'dwGlowPulse 1.6s infinite' }} />
                            <div className="relative w-28 h-28 rounded-full flex items-center justify-center text-5xl border-4 z-10"
                                style={{
                                    background: `radial-gradient(circle at 30% 30%,${prize.light},${prize.color} 60%,${prize.dark})`,
                                    borderColor: prize.light,
                                    boxShadow: `0 0 45px ${prize.color}, inset 0 4px 10px rgba(255,255,255,0.5)`,
                                }}>
                                {prize.tier === 'legendary' ? '👑' : prize.tier === 'epic' ? '💎' : prize.tier === 'rare' ? '⭐' : <IconCoin className="w-14 h-14" />}
                            </div>
                        </div>

                        <div className="px-5 py-1.5 rounded-full text-xs font-black border tracking-widest mb-3 bg-black/60"
                            style={{ color: prize.light, borderColor: prize.color, boxShadow: `0 0 18px ${prize.color}55` }}>
                            {prize.name}
                        </div>

                        <h3 className="text-3xl font-black text-white mb-4">
                            {prize.tier === 'legendary' ? 'افسانه‌ای بود! 🎉' : prize.tier === 'epic' ? 'شگفت‌انگیز! 🤩' : 'تبریک! 🎉'}
                        </h3>

                        <div className="relative overflow-hidden py-4 px-12 rounded-3xl border-2 z-10"
                            style={{
                                borderColor: `${prize.color}99`,
                                background: `linear-gradient(120deg,${prize.dark}33,${prize.color}44,${prize.dark}33)`,
                                boxShadow: `0 0 35px ${prize.color}55`,
                            }}>
                            <div className="text-5xl font-black font-mono tracking-tighter flex items-center justify-center gap-1" style={{ color: prize.light, textShadow: `0 0 20px ${prize.color}` }}>
                                <span className="text-3xl">+</span>{prize.amount}
                            </div>
                            <span className="block text-xs text-white/70 font-bold mt-1">کیوجی به حسابت اضافه شد</span>
                        </div>

                        <button onClick={() => { setShowResult(false); setPrize(null); onClose(); }}
                            className="dw-result-ok mt-6 w-full max-w-[240px] z-10">
                            دریافت و بازگشت
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
    return (typeof ReactDOM !== 'undefined' && ReactDOM && typeof ReactDOM.createPortal === 'function' && typeof document !== 'undefined')
        ? ReactDOM.createPortal(modalContent, document.body)
        : modalContent;
};

// --- کارت داخل صفحه‌ی بازی‌ها ---
const DailyWheelCard = ({ currentUser, onOpen }) => {
    const [left, setLeft] = useState(() => getWheelCooldownLeft(currentUser.username));
    useEffect(() => {
        const id = setInterval(() => setLeft(getWheelCooldownLeft(currentUser.username)), 1000);
        return () => clearInterval(id);
    }, [currentUser.username]);
    const ready = left <= 0;

    return (
        <button onClick={onOpen} data-wheel-entry="true"
            className={`group w-full text-right relative overflow-hidden rounded-[28px] border-2 p-5 flex items-center gap-4 transition-all duration-300 hover:-translate-y-1.5 text-white ${
                ready ? 'border-amber-300/70' : 'bg-slate-900/60 backdrop-blur-md border-slate-700/50 hover:border-amber-500/40'}`}
            style={ready ? {
                background: 'linear-gradient(120deg,#7c2d12,#b45309 40%,#92400e 75%,#3b0764)',
                boxShadow: '0 14px 40px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
            } : undefined}>

            {ready && (
                <div className="absolute -left-8 -top-8 w-44 h-44 rounded-full bg-amber-300/40 blur-3xl pointer-events-none"
                    style={{ animation: 'dwGlowPulse 2.2s infinite' }} />
            )}

            <div data-wheel-icon="true" className={`relative w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shrink-0 border-2 shadow-xl transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110 ${
                ready ? 'bg-gradient-to-tr from-amber-100 to-white text-amber-600 border-white/80' : 'bg-slate-800 border-slate-600 text-slate-400'}`}>
                🎡
            </div>

            <div className="relative flex-1 min-w-0 z-10">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-black text-xl drop-shadow-md">گردونه‌ی شانس</h3>
                    {ready ? (
                        <span className="px-3 py-1 rounded-full bg-white/25 backdrop-blur-sm border border-white/40 text-white text-[10px] font-black tracking-wider animate-pulse">
                            یک چرخش داری!
                        </span>
                    ) : (
                        <span className="px-3 py-1 rounded-full bg-black/70 text-amber-400 border border-amber-500/30 text-xs font-black font-mono" dir="ltr">
                            {formatWheelCooldown(left)}
                        </span>
                    )}
                </div>
                <p className={`text-sm leading-relaxed ${ready ? 'text-white/90 font-medium' : 'text-slate-400'}`}>
                    {ready ? 'وارد شو، گردونه را بچرخان و تا ۲۰۰ سکه کیوجی برنده شو!' : 'هر روز یک فرصت. فردا دوباره سر بزن.'}
                </p>
                <div className="flex gap-1.5 flex-wrap items-center mt-2.5">
                    {WHEEL_PRIZES.slice().reverse().map(p => (
                        <span key={p.amount} className="px-2 py-0.5 rounded-md text-[10px] font-black border"
                            style={ready
                                ? { background: `${p.color}55`, borderColor: `${p.light}66`, color: p.light }
                                : { background: 'rgba(30,41,59,0.8)', borderColor: '#334155', color: '#64748b' }}>
                            {p.label}
                        </span>
                    ))}
                </div>
            </div>

            <div className={`relative shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:-translate-x-1.5 ${
                ready ? 'bg-white text-amber-600' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                <span className="text-2xl font-black">‹</span>
            </div>
        </button>
    );
};
