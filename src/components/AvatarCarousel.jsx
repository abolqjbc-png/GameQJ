// ---------- انتخاب آواتار به‌صورت اسلایدر (کشیدن چپ/راست، فلش‌ها، کیبورد و نقطه‌ها) ----------
const AVATAR_ITEM_W = 132;
const AVATAR_GAP = 14;

const AvatarPicker = ({ items, user, unlocked, onSelect }) => {
    const trackRef = useRef(null);
    const dragRef = useRef({ active: false, startX: 0, startLeft: 0, moved: false });
    const [active, setActive] = useState(0);
    const currentSrc = getAvatarSrc(user);

    const itemEls = () => Array.from(trackRef.current ? trackRef.current.children : []);
    const centerOf = (el) => el.offsetLeft + el.offsetWidth / 2;

    // اثر «تمرکز»: آواتار وسط بزرگ‌تر و روشن‌تر، بقیه کوچک‌تر و کم‌رنگ‌تر
    const applyFocus = useCallback(() => {
        const track = trackRef.current;
        if (!track) return;
        const mid = track.scrollLeft + track.clientWidth / 2;
        let best = 0, bestDist = Infinity;
        itemEls().forEach((el, i) => {
            const dist = Math.abs(centerOf(el) - mid);
            const t = Math.min(1, dist / 190);
            const inner = el.firstChild;
            inner.style.transform = `scale(${1 - 0.24 * t}) translateY(${t * 6}px)`;
            inner.style.opacity = String(1 - 0.5 * t);
            if (dist < bestDist) { bestDist = dist; best = i; }
        });
        setActive(prev => (prev === best ? prev : best));
    }, []);

    const scrollToIndex = useCallback((index, smooth = true) => {
        const track = trackRef.current;
        const el = itemEls()[Math.max(0, Math.min(items.length - 1, index))];
        if (!track || !el) return;
        track.style.scrollBehavior = smooth ? 'smooth' : 'auto';
        track.scrollTo({ left: centerOf(el) - track.clientWidth / 2 });
    }, [items.length]);

    // اولین نمایش: مستقیم روی آواتار فعلی کاربر؛ با هر تغییر اندازه (انیمیشن ورود، چرخش گوشی، ...) دوباره وسط‌چین می‌شود
    const activeRef = useRef(0);
    useEffect(() => { activeRef.current = active; }, [active]);
    useEffect(() => {
        const track = trackRef.current;
        const start = Math.max(0, items.findIndex(a => a.src === currentSrc));
        activeRef.current = start;
        const recenter = () => { scrollToIndex(activeRef.current, false); applyFocus(); };
        recenter();
        const t1 = setTimeout(recenter, 120);
        const t2 = setTimeout(recenter, 450);
        let observer = null;
        if (typeof ResizeObserver !== 'undefined') {
            let first = true;
            observer = new ResizeObserver(() => { if (first) { first = false; return; } recenter(); });
            observer.observe(track);
        }
        return () => { clearTimeout(t1); clearTimeout(t2); if (observer) observer.disconnect(); };
    }, []);

    useEffect(() => {
        const track = trackRef.current;
        let raf = 0;
        const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(applyFocus); };
        track.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => { track.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
    }, [applyFocus]);

    // کشیدن با ماوس (روی لمسی و تاچ‌پد خودِ مرورگر اسکرول نرم دارد)
    const onPointerDown = (e) => {
        if (e.pointerType !== 'mouse') return;
        const track = trackRef.current;
        dragRef.current = { active: true, startX: e.clientX, startLeft: track.scrollLeft, moved: false };
        track.style.scrollBehavior = 'auto';
        track.style.scrollSnapType = 'none';
        track.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e) => {
        const d = dragRef.current;
        if (!d.active) return;
        const dx = e.clientX - d.startX;
        if (Math.abs(dx) > 5) d.moved = true;
        trackRef.current.scrollLeft = d.startLeft - dx;
    };
    const endDrag = (e) => {
        const d = dragRef.current;
        if (!d.active) return;
        d.active = false;
        const track = trackRef.current;
        try { track.releasePointerCapture(e.pointerId); } catch (err) {}
        track.style.scrollSnapType = '';
        if (d.moved) {
            const mid = track.scrollLeft + track.clientWidth / 2;
            let best = 0, bestDist = Infinity;
            itemEls().forEach((el, i) => { const dist = Math.abs(centerOf(el) - mid); if (dist < bestDist) { bestDist = dist; best = i; } });
            scrollToIndex(best);
            setTimeout(() => { dragRef.current.moved = false; }, 0);
        }
    };

    const onKeyDown = (e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); scrollToIndex(active - 1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); scrollToIndex(active + 1); }
    };

    const current = items[active] || items[0];
    const isOwned = (a) => !a.isPremium || unlocked.includes(a.id);
    const isCurrent = (a) => currentSrc === a.src;
    const cost = (a) => a.price || PREMIUM_AVATAR_COST;

    return (
        <div className="space-y-3" dir="ltr">
            <div className="relative">
                <button type="button" aria-label="قبلی" onClick={() => scrollToIndex(active - 1)} disabled={active === 0}
                    className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-slate-900/90 border border-slate-600 text-white text-xl hover:bg-indigo-600 hover:border-indigo-400 active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none">‹</button>
                <button type="button" aria-label="بعدی" onClick={() => scrollToIndex(active + 1)} disabled={active === items.length - 1}
                    className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-slate-900/90 border border-slate-600 text-white text-xl hover:bg-indigo-600 hover:border-indigo-400 active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none">›</button>

                <div className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-16 z-10 bg-gradient-to-r from-slate-900/90 to-transparent"></div>
                <div className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-16 z-10 bg-gradient-to-l from-slate-900/90 to-transparent"></div>

                <div
                    ref={trackRef}
                    tabIndex={0}
                    onKeyDown={onKeyDown}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onClickCapture={(e) => { if (dragRef.current.moved) { e.stopPropagation(); e.preventDefault(); } }}
                    className="relative flex overflow-x-auto snap-x snap-mandatory no-scrollbar py-5 cursor-grab active:cursor-grabbing select-none focus:outline-none"
                    style={{ gap: AVATAR_GAP, paddingInline: `calc(50% - ${AVATAR_ITEM_W / 2}px)`, touchAction: 'pan-x pan-y', overscrollBehaviorX: 'contain' }}
                >
                    {items.map((a, i) => {
                        const selected = isCurrent(a);
                        return (
                            <div key={a.id} className="snap-center shrink-0" style={{ width: AVATAR_ITEM_W }}>
                                <button
                                    type="button"
                                    onClick={() => scrollToIndex(i)}
                                    title={a.name}
                                    style={{ transition: 'transform .35s cubic-bezier(.22,1,.36,1), opacity .35s ease', willChange: 'transform, opacity' }}
                                    className={`avatar-slide relative block w-full rounded-3xl overflow-hidden border-2 p-1.5 bg-slate-900/70 ${selected ? 'border-amber-400 shadow-lg shadow-amber-500/30' : i === active ? 'border-indigo-400 shadow-lg shadow-indigo-500/30' : 'border-slate-700/70'}`}
                                >
                                    <div className="relative aspect-square rounded-2xl overflow-hidden pointer-events-none">
                                        <img src={a.src} alt={a.name} draggable={false} className={`w-full h-full object-cover ${isOwned(a) ? '' : 'saturate-50 brightness-75'}`} />
                                        {!isOwned(a) && <span className="absolute inset-0 flex items-center justify-center text-3xl bg-slate-950/35">🔒</span>}
                                    </div>
                                    {selected && <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center shadow-md">✓</span>}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* اطلاعات و دکمه‌ی آواتار وسط */}
            <div dir="rtl" className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
                <div key={current.id} className="avatar-caption text-center sm:text-right">
                    <div className="font-black text-white text-sm sm:text-base">{current.name}</div>
                    <div className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                        {isCurrent(current) ? 'آواتار فعلی شما' : isOwned(current) ? 'در مجموعه‌ی شماست' : `آواتار ویژه — ${cost(current).toLocaleString('fa-IR')} کیوجی`}
                    </div>
                </div>
                {isCurrent(current) ? (
                    <div className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-black text-xs sm:text-sm text-center">✓ فعال</div>
                ) : (
                    <button type="button" onClick={() => onSelect(current)} className="game-action w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-xs sm:text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5">
                        {isOwned(current) ? 'انتخاب این آواتار' : (<Fragment>خرید و انتخاب <span className="flex items-center gap-0.5 bg-black/20 px-1.5 py-0.5 rounded-md">{cost(current).toLocaleString('fa-IR')} <IconCoin className="w-3.5 h-3.5" /></span></Fragment>)}
                    </button>
                )}
            </div>

            {/* نقطه‌ها و شمارنده */}
            <div dir="rtl" className="flex items-center justify-center gap-3">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 tabular-nums">{(active + 1).toLocaleString('fa-IR')} از {items.length.toLocaleString('fa-IR')}</span>
                <div dir="ltr" className="flex items-center gap-1 max-w-[60%] overflow-hidden">
                    {items.map((a, i) => (
                        <button key={a.id} type="button" aria-label={a.name} onClick={() => scrollToIndex(i)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? 'w-5 bg-indigo-400' : 'w-1.5 bg-slate-600 hover:bg-slate-400'}`}></button>
                    ))}
                </div>
            </div>
        </div>
    );
};
