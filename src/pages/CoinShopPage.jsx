// ---------- خزانه‌ی کیوجی ----------
const COIN_PACKAGES = [
    { id: 'c100', coins: 100, bonus: 0, price: 49000, icon: '🪙', color: 'from-slate-400 to-slate-600', glow: 'shadow-slate-500/30', tag: '' },
    { id: 'c300', coins: 300, bonus: 20, price: 129000, icon: '💰', color: 'from-amber-500 to-orange-500', glow: 'shadow-orange-500/40', tag: '' },
    { id: 'c700', coins: 700, bonus: 80, price: 269000, icon: '💎', color: 'from-sky-400 to-indigo-500', glow: 'shadow-indigo-500/40', tag: 'محبوب‌ترین' },
    { id: 'c1500', coins: 1500, bonus: 250, price: 529000, icon: '👑', color: 'from-yellow-400 to-amber-600', glow: 'shadow-yellow-500/40', tag: '' },
    { id: 'c3500', coins: 3500, bonus: 800, price: 1190000, icon: '🏆', color: 'from-fuchsia-500 to-purple-600', glow: 'shadow-fuchsia-500/40', tag: 'بهترین ارزش' },
    { id: 'c8000', coins: 8000, bonus: 2400, price: 2490000, icon: '🚀', color: 'from-rose-500 to-red-600', glow: 'shadow-rose-500/40', tag: 'ویژه' }
];

const CoinShopPage = ({ currentUser, onBack }) => {
    const [selectedId, setSelectedId] = useState('c700');
    const [showSoon, setShowSoon] = useState(false);
    const [displayedTotal, setDisplayedTotal] = useState(0);
    const selected = COIN_PACKAGES.find(p => p.id === selectedId);
    const fa = (n) => n.toLocaleString('fa-IR');
    const total = selected.coins + selected.bonus;
    const maxRatio = Math.max(...COIN_PACKAGES.map(p => p.coins / p.price));
    const style = <style>{`
        @keyframes cq-rise { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cq-fadeSlide { from { opacity: 0; transform: translateY(20px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes cq-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
        @keyframes cq-floatSlow { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(16px,-18px,0) scale(1.08); } }
        @keyframes cq-shine { from { transform: translateX(-130%) rotate(18deg); } to { transform: translateX(230%) rotate(18deg); } }
        @keyframes cq-coinSpin { 0%,100% { transform: rotateY(0deg) scale(1); } 50% { transform: rotateY(180deg) scale(1.06); } }
        @keyframes cq-pop { 0% { opacity: 0; transform: scale(.8); } 75% { opacity: 1; transform: scale(1.12); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes cq-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(251,191,36,.28); } 50% { box-shadow: 0 0 0 9px rgba(251,191,36,0); } }
        @keyframes cq-glowPulse { 0%,100% { filter: drop-shadow(0 0 9px rgba(251,191,36,.18)); opacity: .72; } 50% { filter: drop-shadow(0 0 20px rgba(251,191,36,.38)); opacity: 1; } }
        @keyframes cq-shimmer { to { background-position: 220% center; } }
        @keyframes cq-sparkle { 0%,100% { opacity: .25; transform: scale(.65) rotate(0deg); } 50% { opacity: 1; transform: scale(1.2) rotate(35deg); } }
        @keyframes cq-checkDraw { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }
        @keyframes cq-slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cq-ripple { from { transform: scale(.2); opacity: .45; } to { transform: scale(1.8); opacity: 0; } }
        @keyframes cq-gradientShift { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .cq-glass { background:linear-gradient(145deg,rgba(30,41,59,.76),rgba(15,23,42,.66)); border:1px solid rgba(255,255,255,.1); box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 18px 55px rgba(2,6,23,.24); backdrop-filter:blur(18px); }
        .cq-tilt-wrap { perspective:1000px; }
        .cq-card3d { transform-style:preserve-3d; will-change:transform; transition:transform .15s ease-out; }
        .cq-shine-line { position:absolute; width:34%; height:180%; top:-40%; left:-35%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent); transform:rotate(18deg); animation:cq-shine 5.5s ease-in-out infinite; pointer-events:none; }
        .cq-grad-text { color:transparent; background-image:linear-gradient(100deg,#fbbf24,#fef3c7,#f59e0b,#fff7cc); background-size:220% auto; background-clip:text; -webkit-background-clip:text; animation:cq-shimmer 5s linear infinite; }
        .cq-cta { position:relative; isolation:isolate; overflow:hidden; background-size:200% 200%; animation:cq-gradientShift 5s ease infinite; }
        .cq-cta::after { content:''; position:absolute; inset:-40% auto -40% -45%; width:35%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.32),transparent); transform:skewX(-20deg); transition:left .65s ease; pointer-events:none; z-index:1; }
        .cq-cta:hover::after { left:120%; }
        .cq-ripple::before { content:''; position:absolute; inset:0; border-radius:inherit; border:2px solid rgba(255,255,255,.5); animation:cq-ripple 1.8s ease-out infinite; pointer-events:none; }
        .cq-scroll { scrollbar-width:thin; scrollbar-color:rgba(251,191,36,.45) rgba(15,23,42,.2); }
        .cq-scroll::-webkit-scrollbar { width:6px; } .cq-scroll::-webkit-scrollbar-thumb { background:rgba(251,191,36,.45); border-radius:9px; }
        @media (prefers-reduced-motion: reduce) { *,*::before,*::after { animation-duration:.01ms !important; animation-iteration-count:1 !important; scroll-behavior:auto !important; transition-duration:.01ms !important; } }
    `}</style>;

    useEffect(() => {
        const start = Date.now();
        const from = displayedTotal;
        const duration = 500;
        const timer = setInterval(() => {
            const progress = Math.min(1, (Date.now() - start) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayedTotal(Math.round(from + (total - from) * eased));
            if (progress >= 1) clearInterval(timer);
        }, 16);
        return () => clearInterval(timer);
    }, [total]);

    const openSoon = () => {
        setShowSoon(true);
        if (typeof showToast === 'function') showToast('درگاه پرداخت در نسخه آزمایشی فعال نیست', 'info');
    };
    const tiltCard = (e) => {
        const box = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - box.left) / box.width - .5;
        const y = (e.clientY - box.top) / box.height - .5;
        e.currentTarget.style.transition = 'transform .12s ease-out';
        e.currentTarget.style.transform = `translateZ(0) rotateX(${(-y * 14).toFixed(2)}deg) rotateY(${(x * 14).toFixed(2)}deg) scale(1.025)`;
    };
    const resetTilt = (e) => {
        e.currentTarget.style.transition = 'transform .35s ease-out';
        e.currentTarget.style.transform = 'translateZ(0) rotateX(0deg) rotateY(0deg) scale(1)';
    };

    return (
        <main dir="rtl" className="w-full max-w-6xl mx-auto flex flex-col gap-5 sm:gap-7 pb-8 px-1 sm:px-0 overflow-hidden">
            {style}
            <section className="relative isolate overflow-hidden rounded-3xl border border-amber-300/20 bg-gradient-to-br from-amber-600 via-yellow-600 to-orange-700 p-5 sm:p-8 shadow-[0_24px_70px_rgba(180,83,9,.24)]" style={{ animation: 'cq-rise .65s ease both' }}>
                <div className="absolute -top-20 -right-8 w-64 h-64 rounded-full bg-yellow-200/20 blur-3xl pointer-events-none" style={{ animation: 'cq-floatSlow 9s ease-in-out infinite' }}></div>
                <div className="absolute -bottom-24 left-1/4 w-72 h-72 rounded-full bg-orange-950/25 blur-3xl pointer-events-none" style={{ animation: 'cq-floatSlow 11s ease-in-out infinite reverse' }}></div>
                <div className="absolute top-8 left-8 w-40 h-40 rounded-full bg-amber-200/15 blur-3xl pointer-events-none" style={{ animation: 'cq-floatSlow 8s ease-in-out infinite 1s' }}></div>
                <div className="cq-shine-line opacity-70"></div>
                <span className="absolute top-[18%] left-[14%] text-yellow-100 text-xl pointer-events-none" style={{ animation: 'cq-sparkle 2.2s infinite' }}>✦</span>
                <span className="absolute top-[68%] left-[30%] text-amber-100 text-xs pointer-events-none" style={{ animation: 'cq-sparkle 2.8s .4s infinite' }}>✧</span>
                <span className="absolute top-[22%] right-[34%] text-yellow-50 text-sm pointer-events-none" style={{ animation: 'cq-sparkle 2.4s .8s infinite' }}>✦</span>
                <span className="absolute bottom-[18%] right-[14%] text-amber-100 text-lg pointer-events-none" style={{ animation: 'cq-sparkle 3s .3s infinite' }}>✧</span>
                <span className="absolute top-[48%] right-[48%] text-yellow-50 text-xs pointer-events-none" style={{ animation: 'cq-sparkle 2.6s 1s infinite' }}>✦</span>
                <span className="absolute top-[12%] right-[72%] text-amber-100 text-sm pointer-events-none" style={{ animation: 'cq-sparkle 2.1s .6s infinite' }}>✧</span>
                <span className="absolute bottom-[12%] left-[9%] text-yellow-50 text-xs pointer-events-none" style={{ animation: 'cq-sparkle 2.7s 1.1s infinite' }}>✦</span>
                <span className="absolute bottom-[22%] right-[68%] text-amber-100 text-base pointer-events-none" style={{ animation: 'cq-sparkle 2.5s .5s infinite' }}>✧</span>
                <button onClick={onBack} aria-label="بازگشت" className="absolute z-20 top-4 right-4 sm:top-6 sm:right-6 w-11 h-11 rounded-full flex items-center justify-center bg-black/15 hover:bg-black/25 border border-white/20 text-white transition-all hover:scale-110 active:scale-95">
                    <IconArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 sm:pt-2">
                    <div className="flex flex-col sm:flex-row items-center text-center sm:text-right gap-4 sm:gap-5">
                        <div className="cq-tilt-wrap shrink-0">
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-[5px] bg-[conic-gradient(from_30deg,#fff2aa,#f59e0b,#92400e,#fde68a,#fff2aa)] shadow-[0_15px_35px_rgba(69,26,3,.36)]" style={{ animation: 'cq-coinSpin 8s ease-in-out infinite' }}>
                                <div className="w-full h-full rounded-full bg-[radial-gradient(circle_at_32%_25%,#fff7c2,#fbbf24_42%,#b45309_100%)] border border-yellow-100/70 flex items-center justify-center shadow-[inset_0_3px_12px_rgba(255,255,255,.55),inset_0_-8px_15px_rgba(120,53,15,.35)]">
                                    <IconCoin className="w-12 h-12 sm:w-14 sm:h-14 text-amber-950 drop-shadow-[0_3px_1px_rgba(255,255,255,.32)]" />
                                </div>
                            </div>
                        </div>
                        <div>
                            <div className="text-[11px] font-black tracking-[.22em] uppercase text-amber-100/75 mb-1">GAMEQJ • COIN VAULT</div>
                            <h1 className="text-3xl sm:text-5xl font-black cq-grad-text leading-tight">خزانه‌ی کیوجی</h1>
                            <p className="mt-2 text-xs sm:text-sm text-amber-50/85 leading-6">یک قدم تا بازی‌های بیشتر؛ بسته‌ی دلخواهت را انتخاب کن.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-center">
                        <div key={currentUser.coins} className="relative flex items-center gap-2.5 px-4 sm:px-5 py-3 rounded-2xl bg-white/15 border border-white/25 text-white shadow-xl backdrop-blur-md" style={{ animation: 'cq-pop .55s cubic-bezier(.34,1.56,.64,1) both, cq-pulse 2.8s 1s infinite' }}>
                            <IconCoin className="w-6 h-6 text-yellow-100" />
                            <span className="text-lg sm:text-xl font-black">{fa(currentUser.coins ?? 0)}</span>
                            <span className="text-[10px] sm:text-xs text-amber-50/80 font-bold">موجودی</span>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" aria-label="نرخ و مزایا">
                <div className="cq-glass rounded-2xl px-3 py-3 flex items-center justify-center gap-2 text-[11px] sm:text-xs text-amber-100 font-bold" style={{ animation: 'cq-fadeSlide .5s .08s both' }}><IconCoin className="w-4 h-4 text-amber-300" /> هر ۱۰۰ کیوجی ≈ ۴۹٬۰۰۰ تومان</div>
                <div className="cq-glass rounded-2xl px-3 py-3 flex items-center justify-center gap-2 text-[11px] sm:text-xs text-slate-200 font-bold" style={{ animation: 'cq-fadeSlide .5s .16s both' }}><span className="text-emerald-300">✦</span> بسته‌های بزرگ‌تر، هدیه‌ی بیشتر</div>
                <div className="cq-glass rounded-2xl px-3 py-3 flex items-center justify-center gap-2 text-[11px] sm:text-xs text-slate-200 font-bold" style={{ animation: 'cq-fadeSlide .5s .24s both' }}><span className="text-sky-300">◈</span> انتخاب امن؛ پرداخت فعلاً غیرفعال</div>
            </div>

            <section aria-label="بسته‌های کیوجی" className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                {COIN_PACKAGES.map((pkg, i) => {
                    const active = pkg.id === selectedId;
                    const ratio = Math.max(8, Math.round((pkg.coins / pkg.price / maxRatio) * 100));
                    return (
                        <div key={pkg.id} className="cq-tilt-wrap" style={{ animation: `cq-fadeSlide .55s ${i * 80}ms both` }}>
                            <button type="button" aria-pressed={active} onClick={() => setSelectedId(pkg.id)} onMouseMove={tiltCard} onMouseLeave={resetTilt}
                                className={`cq-card3d group relative w-full min-h-[245px] sm:min-h-[285px] text-center rounded-3xl p-4 sm:p-6 overflow-hidden ${active ? 'border-2 border-amber-300/90 shadow-[0_0_34px_rgba(251,191,36,.24)] scale-[1.02]' : 'cq-glass border border-white/10 hover:border-amber-300/40'}`}>
                                <div className={`absolute inset-0 bg-gradient-to-br ${pkg.color} pointer-events-none ${active ? 'opacity-[.17]' : 'opacity-[.07]'}`}></div>
                                {active && <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ animation: 'cq-glowPulse 2.8s ease-in-out infinite' }}></div>}
                                {pkg.tag && <span className={`absolute -left-8 top-4 z-10 w-32 -rotate-45 py-1 bg-gradient-to-r ${pkg.color} text-white text-[9px] sm:text-[10px] font-black shadow-lg`}>{pkg.tag}</span>}
                                {active && <span className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-amber-300 text-amber-950 flex items-center justify-center shadow-lg" style={{ animation: 'cq-pop .4s cubic-bezier(.34,1.56,.64,1) both' }}>
                                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 12 4 4L19 6" strokeDasharray="24" strokeDashoffset="0" style={{ animation: 'cq-checkDraw .45s ease both' }} /></svg>
                                </span>}
                                <div className="relative z-10">
                                    <div className={`mx-auto mt-2 sm:mt-1 w-[68px] h-[68px] sm:w-[82px] sm:h-[82px] rounded-full p-[4px] bg-[conic-gradient(from_35deg,#fff2b2,#f59e0b,#92400e,#fde68a,#fff2b2)] shadow-xl ${pkg.glow} ${active ? '' : 'group-hover:animate-[cq-coinSpin_1.2s_ease-in-out]'}`} style={active ? { animation: 'cq-coinSpin 7s ease-in-out infinite' } : undefined}>
                                        <div className="w-full h-full rounded-full bg-[radial-gradient(circle_at_30%_25%,#fff8ce,#fbbf24_45%,#a16207_100%)] border border-yellow-100/60 flex items-center justify-center text-3xl sm:text-4xl shadow-[inset_0_3px_8px_rgba(255,255,255,.6),inset_0_-7px_12px_rgba(120,53,15,.35)]">{pkg.icon}</div>
                                    </div>
                                    <div className="mt-3 text-2xl sm:text-3xl font-black cq-grad-text">{fa(pkg.coins)}</div>
                                    <div className="text-[10px] sm:text-xs text-amber-200/90 font-bold">کیوجی سکه</div>
                                    <div className="h-7 mt-2 flex items-center justify-center">
                                        {pkg.bonus > 0 && <span className="text-[9px] sm:text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-300/20" style={{ animation: 'cq-pop .5s .15s both' }}>+{fa(pkg.bonus)} هدیه</span>}
                                    </div>
                                    <div className="mt-1 text-sm sm:text-base font-black text-white">{fa(pkg.price)} <span className="text-[9px] sm:text-[10px] text-slate-400">تومان</span></div>
                                    <div className="mt-3 h-1.5 rounded-full bg-slate-950/50 overflow-hidden"><div className={`h-full rounded-full bg-gradient-to-r ${pkg.color}`} style={{ width: `${ratio}%`, transition: 'width .9s cubic-bezier(.2,.8,.2,1)', animation: 'cq-rise .8s ease both' }}></div></div>
                                </div>
                            </button>
                        </div>
                    );
                })}
            </section>

            <section className="cq-glass relative overflow-hidden rounded-3xl p-4 sm:p-6 border border-amber-200/15 shadow-2xl sm:sticky sm:bottom-3 z-20">
                <div className="absolute -top-16 left-1/3 w-48 h-32 bg-amber-400/10 blur-3xl rounded-full pointer-events-none"></div>
                <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className={`shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${selected.color} flex items-center justify-center text-3xl shadow-lg ${selected.glow}`} style={{ animation: 'cq-pop .4s cubic-bezier(.34,1.56,.64,1) both' }}>{selected.icon}</div>
                        <div className="min-w-0">
                            <div className="text-[11px] text-slate-400 font-bold">خلاصه‌ی سفارش</div>
                            <div className="text-sm sm:text-base font-black text-white mt-1">{fa(selected.coins)} کیوجی <span className="text-emerald-300">{selected.bonus > 0 ? `+ ${fa(selected.bonus)} هدیه` : ''}</span></div>
                            <div className="text-[10px] text-slate-400 mt-1">مجموع دریافتی: <b className="text-amber-200">{fa(displayedTotal)} کیوجی</b></div>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                        <div className="text-xl sm:text-2xl font-black text-white sm:text-left">{fa(selected.price)} <span className="text-[10px] text-slate-400">تومان</span></div>
                        <button onClick={openSoon} className={`cq-cta cq-ripple w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r ${selected.color} text-white font-black text-sm sm:text-base shadow-xl ${selected.glow} hover:-translate-y-1 hover:shadow-2xl active:scale-95 transition-all`}>
                            <span className="relative z-10">خرید و اتصال به درگاه <span className="mr-1">←</span></span>
                        </button>
                    </div>
                </div>
            </section>

            <p className="flex items-center justify-center gap-2 text-center text-[10px] sm:text-xs text-slate-500 leading-6 px-2"><IconLock className="w-4 h-4 text-emerald-500/70" /> پرداخت امن از طریق درگاه شتاب (به‌زودی)</p>

            {showSoon && (
                <div className="fixed inset-0 z-[120] bg-slate-950/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-5" onClick={() => setShowSoon(false)}>
                    <section role="dialog" aria-modal="true" aria-labelledby="cq-modal-title" onClick={e => e.stopPropagation()} className="cq-glass cq-scroll relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 border border-amber-300/25 shadow-[0_25px_90px_rgba(0,0,0,.6)] text-center" style={{ animation: 'cq-slideUp .45s cubic-bezier(.2,.8,.2,1) both' }}>
                        <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-5 sm:hidden"></div>
                        <div className="relative overflow-hidden mx-auto w-24 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 border border-white/25 shadow-xl flex items-center justify-center" style={{ animation: 'cq-float 3.2s ease-in-out infinite' }}>
                            <div className="cq-shine-line opacity-90" style={{ animationDuration: '2.4s' }}></div><span className="relative z-10 text-3xl">💳</span>
                        </div>
                        <h2 id="cq-modal-title" className="mt-5 text-xl sm:text-2xl font-black cq-grad-text">درگاه پرداخت به‌زودی</h2>
                        <p className="mt-3 text-sm text-slate-300 leading-7">اتصال به شبکه‌ی شتاب در حال آماده‌سازی است. این نسخه‌ی آزمایشی است و هیچ مبلغی از حساب شما کسر نمی‌شود.</p>
                        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-white/[.04] border border-white/10 px-4 py-3 text-xs sm:text-sm">
                            <span className="text-slate-300">سفارش شما: <b className="text-white">{fa(selected.coins)} کیوجی {selected.bonus > 0 ? `+ ${fa(selected.bonus)} هدیه` : ''}</b></span>
                            <b className="shrink-0 text-amber-200">{fa(selected.price)} تومان</b>
                        </div>
                        <button onClick={() => setShowSoon(false)} className="cq-cta mt-5 w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-amber-950 font-black text-sm shadow-lg hover:-translate-y-0.5 transition-all"><span className="relative z-10">متوجه شدم</span></button>
                        <button onClick={() => setShowSoon(false)} className="mt-2 w-full py-2.5 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 font-bold text-xs transition-colors">بستن</button>
                    </section>
                </div>
            )}
        </main>
    );
};
