// ---------- لایه‌ی نمایش واکنش‌ها: پرواز آیتم از پروفایل فرستنده تا پروفایل هدف + افکت برخورد ----------
// فقط روی یک لایه‌ی ثابتِ بدون کلیک (pointer-events: none) رسم می‌شود و DOM بازی را تغییر نمی‌دهد
// (تنها یک کلاسِ انیمیشنیِ موقتی روی آواتار هدف می‌نشیند و پس از پایان برداشته می‌شود).
const findReactionAnchor = (name) => {
    if (!name) return null;
    const nodes = document.querySelectorAll('[data-gq-player]');
    for (const node of nodes) {
        if (node.getAttribute('data-gq-player') !== name) continue;
        const r = node.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return node;
    }
    return null;
};

const makeParticles = (kind) => {
    const rnd = (a, b) => a + Math.random() * (b - a);
    const list = [];
    if (kind === 'hearts') {
        for (let i = 0; i < 9; i++) list.push({ ch: ['❤️', '💖', '💕', '🌹'][i % 4], x: rnd(-40, 40), delay: rnd(0, 1.1), size: rnd(14, 24), sway: rnd(-18, 18) });
    } else if (kind === 'confetti') {
        const colors = ['#f43f5e', '#f59e0b', '#22c55e', '#38bdf8', '#a855f7', '#fde047'];
        for (let i = 0; i < 26; i++) { const a = rnd(0, Math.PI * 2), d = rnd(50, 120); list.push({ c: colors[i % colors.length], dx: Math.cos(a) * d, dy: Math.sin(a) * d - 30, rot: rnd(-540, 540), delay: rnd(0, 0.18), w: rnd(5, 9), h: rnd(8, 14) }); }
    } else if (kind === 'boom') {
        for (let i = 0; i < 6; i++) list.push({ dx: rnd(-45, 45), dy: rnd(-90, -30), delay: rnd(0.55, 1), size: rnd(18, 32) });
    } else if (kind === 'cream') {
        const colors = ['#f43f5e', '#facc15', '#38bdf8', '#22c55e', '#f472b6'];
        for (let i = 0; i < 12; i++) { const a = rnd(0, Math.PI * 2), d = rnd(30, 70); list.push({ c: colors[i % colors.length], dx: Math.cos(a) * d, dy: Math.sin(a) * d - 20, delay: rnd(0, 0.15) }); }
    } else if (kind === 'bonk') {
        for (let i = 0; i < 3; i++) list.push({ ch: '💫', angle: i * 120 });
    } else if (kind === 'freeze') {
        for (let i = 0; i < 7; i++) list.push({ ch: i % 2 ? '❄️' : '✨', x: rnd(-45, 45), y: rnd(-40, 40), delay: rnd(0, 1.4), size: rnd(11, 18) });
    }
    return list;
};

const ReactionEffect = ({ event, onDone }) => {
    const item = REACTION_ITEMS.find(entry => entry.id === event.item);
    const projRef = useRef(null);
    const overlayRef = useRef(null);
    const [phase, setPhase] = useState('fly');
    const [geo, setGeo] = useState(null);
    const parts = useMemo(() => makeParticles(item ? item.impact : ''), []);

    useEffect(() => {
        if (!item) { onDone(event.id); return; }
        const me = reactionRuntime.me;
        let dstEl = findReactionAnchor(event.to);
        let srcEl = findReactionAnchor(event.from);
        if (!dstEl || document.querySelector('.gq-vs-root')) {
            if (event.to === me) showToast({ id: `react-${event.id}`, type: 'invite', title: `«${event.from}» برایتان ${item.name} پرتاب کرد ${item.emoji}`, text: '', duration: 2600 });
            onDone(event.id);
            return;
        }
        const centerOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };
        // اگر عنصر از DOM رفت یا پنهان شد (رندر دوباره / تغییر تب)، دوباره پیدا می‌شود
        const live = (el, name) => (el && el.isConnected && el.getBoundingClientRect().width > 0 ? el : findReactionAnchor(name));
        const first = centerOf(dstEl);
        const size = Math.max(70, Math.min(116, Math.max(first.w, first.h)));
        setGeo({ x: first.x, y: first.y, size });
        const soundOn = !((findUser(me) || {}).settings && findUser(me).settings.sound === false);
        reactionSound('whoosh', soundOn);

        const spin = (Math.random() > 0.5 ? 1 : -1) * (540 + Math.random() * 360);
        const sideOffset = Math.random() * 240 - 120;
        const flightMs = item.flight === 'drop' ? 520 : 780;
        const t0 = performance.now();
        let raf = 0, impactAt = 0, finished = false;
        const guard = setTimeout(() => finish(), flightMs + item.ms + 4000);   // اگر تب در پس‌زمینه بود، لایه گیر نکند
        function finish() {
            if (finished) return;
            finished = true;
            cancelAnimationFrame(raf);
            clearTimeout(guard);
            if (item.targetClass && dstEl) dstEl.classList.remove(item.targetClass);
            onDone(event.id);
        }
        // هر فریم موقعیت پروفایل‌ها دوباره خوانده می‌شود؛ پس با اسکرول صفحه، آیتم و افکت روی پروفایل می‌مانند
        const frame = (now) => {
            if (finished) return;
            dstEl = live(dstEl, event.to);
            srcEl = live(srcEl, event.from);
            const proj = projRef.current, ov = overlayRef.current;
            if (!dstEl) {
                if (proj) proj.style.visibility = 'hidden';
                if (ov) ov.style.visibility = 'hidden';
                raf = requestAnimationFrame(frame);
                return;
            }
            const dst = centerOf(dstEl);
            if (!impactAt) {
                const t = Math.min(1, (now - t0) / flightMs);
                const e = 1 - Math.pow(1 - t, 2);
                let x, y, rot, sc;
                if (item.flight === 'drop') {
                    const fx = dst.x + 14, fy = dst.y - 190;
                    x = fx + (dst.x - fx) * e * e; y = fy + (dst.y - fy) * e * e;
                    rot = -70 + 95 * t; sc = 1.5 - 0.5 * t;
                } else {
                    const s = srcEl ? centerOf(srcEl) : { x: dst.x + sideOffset, y: window.innerHeight + 50 };
                    const arc = item.flight === 'low' ? 36 : Math.min(220, 90 + Math.hypot(dst.x - s.x, dst.y - s.y) * 0.28);
                    x = s.x + (dst.x - s.x) * e;
                    y = s.y + (dst.y - s.y) * e - arc * 4 * e * (1 - e);
                    rot = spin * e; sc = 0.7 + 0.7 * Math.sin(Math.PI * e) + 0.25 * e;
                }
                if (proj) {
                    proj.style.visibility = 'visible';
                    proj.style.opacity = String(Math.min(1, 0.25 + t * 3));
                    proj.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${rot}deg) scale(${sc})`;
                }
                if (t >= 1) {
                    impactAt = now;
                    setPhase('impact');
                    reactionSound(item.sound, soundOn);
                    if (item.targetClass) dstEl.classList.add(item.targetClass);
                }
            } else {
                if (ov) {
                    ov.style.visibility = 'visible';
                    ov.style.left = `${dst.x - size / 2}px`;
                    ov.style.top = `${dst.y - size / 2}px`;
                }
                if (now - impactAt >= item.ms) { finish(); return; }
            }
            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        return () => { finished = true; cancelAnimationFrame(raf); clearTimeout(guard); if (item.targetClass && dstEl) dstEl.classList.remove(item.targetClass); };
    }, []);

    if (!item) return null;
    const P = (i, style, child) => <span key={i} className="gq-p" style={style}>{child}</span>;
    let inner = null;
    const k = item.impact;
    if (k === 'egg' || k === 'tomato') {
        inner = (
            <div className={`gq-splat gq-splat-${k}`}>
                <span className="gq-splat-blob"></span>
                {k === 'egg' && <span className="gq-yolk"></span>}
                {k === 'tomato' && [0, 1, 2, 3, 4].map(i => <span key={i} className="gq-seed" style={{ left: `${30 + i * 10}%`, top: `${34 + (i % 2) * 18}%` }}></span>)}
                {[22, 48, 70].map((left, i) => <i key={i} className="gq-drip" style={{ left: `${left}%`, '--h': `${34 + i * 9}%`, animationDelay: `${0.45 + i * 0.25}s` }}></i>)}
            </div>
        );
    } else if (k === 'cream') {
        inner = (<div className="gq-splat gq-splat-cream"><span className="gq-splat-blob"></span><span className="gq-cherry">🍒</span>
            {parts.map((p, i) => P(i, { '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--rot': '200deg', '--dur': '.9s', '--delay': `${p.delay}s`, width: 7, height: 7, borderRadius: 9999, background: p.c }))}
            {[24, 52, 74].map((left, i) => <i key={i} className="gq-drip" style={{ left: `${left}%`, '--h': `${30 + i * 8}%`, animationDelay: `${0.5 + i * 0.25}s` }}></i>)}</div>);
    } else if (k === 'slip') {
        inner = (<div className="gq-slip"><span className="gq-slip-peel">🍌</span><span className="gq-slip-stars">💫</span><span className="gq-comic">ایییی!</span></div>);
    } else if (k === 'hearts') {
        inner = (<div className="gq-hearts"><span className="gq-glow-pink"></span>
            {parts.map((p, i) => P(i, { '--x': `${p.x}px`, '--sway': `${p.sway}px`, '--delay': `${p.delay}s`, fontSize: p.size, animation: `gqHeartUp 2.1s ease-out ${p.delay}s both` }, p.ch))}</div>);
    } else if (k === 'confetti') {
        inner = (<div className="gq-confetti"><span className="gq-pop-emoji">🎊</span>
            {parts.map((p, i) => P(i, { '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--rot': `${p.rot}deg`, '--dur': '1.6s', '--delay': `${p.delay}s`, width: p.w, height: p.h, background: p.c, borderRadius: 2 }))}</div>);
    } else if (k === 'bonk') {
        inner = (<div className="gq-bonk"><span className="gq-shock"></span><span className="gq-comic gq-comic-big">بونگ!</span>
            <span className="gq-orbit">{parts.map((p, i) => <span key={i} style={{ transform: `rotate(${p.angle}deg) translateX(34px)` }}>{p.ch}</span>)}</span></div>);
    } else if (k === 'freeze') {
        inner = (<div className="gq-freeze"><span className="gq-ice"></span>
            {parts.map((p, i) => P(i, { left: `calc(50% + ${p.x}px)`, top: `calc(50% + ${p.y}px)`, fontSize: p.size, animation: `gqTwinkle 1.4s ease-in-out ${p.delay}s infinite` }, p.ch))}
            <span className="gq-comic gq-comic-cold">برررر!</span></div>);
    } else if (k === 'boom') {
        inner = (<div className="gq-boom"><span className="gq-flash"></span><span className="gq-shock gq-shock-fire"></span><span className="gq-soot"></span><span className="gq-boom-emoji">💥</span>
            {parts.map((p, i) => P(i, { '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--rot': '60deg', '--dur': '1.6s', '--delay': `${p.delay}s`, fontSize: p.size }, '💨'))}
            <span className="gq-comic gq-comic-big gq-comic-fire">بووم!</span></div>);
    }

    return (
        <Fragment>
            <span ref={projRef} className="gq-fx-proj" style={{ display: phase === 'fly' ? 'block' : 'none', visibility: 'hidden' }}>{item.emoji}</span>
            {phase === 'impact' && geo && (
                <div ref={overlayRef} className="gq-fx" style={{ left: geo.x - geo.size / 2, top: geo.y - geo.size / 2, width: geo.size, height: geo.size, '--ms': `${item.ms}ms` }}>
                    {inner}
                    <span className="gq-fx-from">{event.from}</span>
                </div>
            )}
        </Fragment>
    );
};

const ReactionLayer = () => {
    const [active, setActive] = useState([]);
    const queueRef = useRef([]);
    const activeRef = useRef([]);
    const seenRef = useRef(new Set());

    const pump = useCallback(() => {
        while (activeRef.current.length < REACTION_MAX_CONCURRENT && queueRef.current.length) activeRef.current = [...activeRef.current, queueRef.current.shift()];
        setActive(activeRef.current);
    }, []);
    const done = useCallback((id) => { activeRef.current = activeRef.current.filter(entry => entry.id !== id); pump(); }, [pump]);

    const enqueue = useCallback((event) => {
        if (!event || !event.id || seenRef.current.has(event.id)) return;
        seenRef.current.add(event.id);
        if (seenRef.current.size > 300) seenRef.current = new Set([...seenRef.current].slice(-150));
        if (Date.now() - event.at > REACTION_MAX_AGE_MS) return;
        if (!reactionRuntime.matchId || event.matchId !== reactionRuntime.matchId) return;
        if (event.from !== reactionRuntime.me && isReactionMuted()) return;       // بازیکن نمایش واکنش‌های دیگران را خاموش کرده
        queueRef.current.push(event);
        if (queueRef.current.length > 6) queueRef.current.shift();               // صفِ طولانی ساخته نمی‌شود
        pump();
    }, [pump]);

    useEffect(() => {
        const scan = () => readReactionLog().forEach(event => { if (event.from !== reactionRuntime.me) enqueue(event); });
        const onLocal = (e) => enqueue(e.detail);
        const onStorage = (e) => { if (e.key === REACTIONS_KEY) scan(); };
        window.addEventListener('gq:reaction', onLocal);
        window.addEventListener('storage', onStorage);
        const timer = setInterval(scan, 2000);
        return () => { window.removeEventListener('gq:reaction', onLocal); window.removeEventListener('storage', onStorage); clearInterval(timer); };
    }, [enqueue]);

    return ReactDOM.createPortal(<div className="gq-fx-root" aria-hidden="true">{active.map(event => <ReactionEffect key={event.id} event={event} onDone={done} />)}</div>, document.body);
};
