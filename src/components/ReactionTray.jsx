// ---------- دکمه و منوی پرتاب واکنش (شناور، گوشه‌ی پایین-راست) ----------
const ReactionTray = ({ matchId, currentUser, targets = [], onUserUpdated, hidden = false }) => {
    const [open, setOpen] = useState(false);
    const [targetName, setTargetName] = useState('');
    const [cool, setCool] = useState(0);
    const [msg, setMsg] = useState('');
    const [muted, setMuted] = useState(isReactionMuted());
    const [visible, setVisible] = useState(true);
    const sentinelRef = useRef(null);

    const target = targets.find(t => t.name === targetName) || targets[0];

    // ثبت مسابقه‌ی فعلی برای لایه‌ی نمایش
    useEffect(() => {
        setReactionSession(matchId, currentUser.username);
        return () => setReactionSession(null, null);
    }, [matchId, currentUser.username]);

    // شمارش معکوس cooldown + نمایش فقط وقتی تبِ بازی دیده می‌شود
    useEffect(() => {
        const timer = setInterval(() => {
            setCool(reactionCooldownLeft(currentUser.username));
            setVisible(!!sentinelRef.current && sentinelRef.current.offsetParent !== null);
        }, 250);
        return () => clearInterval(timer);
    }, [currentUser.username]);

    const throwItem = (item) => {
        if (!target) return;
        const result = sendReaction({ matchId, from: currentUser.username, to: target.name, itemId: item.id });
        if (!result.ok) { setMsg(result.msg); return; }
        setMsg('');
        setOpen(false);
        if (onUserUpdated && result.user) onUserUpdated(result.user);
        setCool(REACTION_COOLDOWN_MS);
        // ربات‌ها گاهی (۴۰٪) تلافی می‌کنند؛ رایگان و فقط برای سرگرمی
        if (target.isBot && Math.random() < 0.4) {
            const cheap = REACTION_ITEMS.filter(entry => entry.price <= 5);
            const pick = cheap[Math.floor(Math.random() * cheap.length)];
            const mid = matchId;
            setTimeout(() => {
                if (reactionRuntime.matchId !== mid) return;
                emitReaction({ id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, matchId: mid, from: target.name, to: currentUser.username, item: pick.id, at: Date.now() });
            }, 2600 + Math.random() * 2600);
        }
    };

    useEffect(() => {
        const onPanel = (e) => { if (e.detail !== 'tray') setOpen(false); };
        window.addEventListener('gq:panel-open', onPanel);
        return () => window.removeEventListener('gq:panel-open', onPanel);
    }, []);

    const toggleTray = () => {
        setOpen(prev => {
            if (!prev) window.dispatchEvent(new CustomEvent('gq:panel-open', { detail: 'tray' }));
            return !prev;
        });
        setMsg('');
    };

    const toggleMute = () => { const next = !muted; setMuted(next); setReactionMuted(next); };
    const coins = currentUser.coins ?? 0;
    const show = !hidden && visible && !!matchId && targets.length > 0;

    return (
        <Fragment>
            <span ref={sentinelRef} style={{ position: 'absolute', width: 0, height: 0 }}></span>
            {ReactDOM.createPortal(
                <div className="gq-react-tray" dir="ltr" style={{ display: show ? 'flex' : 'none' }}>
                    {open && <div className="gq-react-backdrop" style={{ pointerEvents: 'auto', position: 'fixed' }} onClick={() => setOpen(false)}></div>}
                    {open && (
                        <div className="gq-react-panel" dir="rtl">
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <button type="button" className="gq-react-close" aria-label="بستن" onClick={() => setOpen(false)}>✕</button>
                                <strong className="text-white text-sm">پرتاب به حریف 🎯</strong>
                                <span className="flex items-center gap-1 text-[11px] font-black text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">{coins.toLocaleString('fa-IR')} <IconCoin className="w-3.5 h-3.5" /></span>
                            </div>
                            {targets.length > 1 && (
                                <div className="flex gap-1.5 flex-wrap mb-2">
                                    {targets.map(t => (
                                        <button key={t.name} onClick={() => setTargetName(t.name)} className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${(target && target.name === t.name) ? 'text-white' : 'text-slate-300 border-slate-700 bg-slate-800/70'}`} style={(target && target.name === t.name) ? { background: `${t.hex || '#6366f1'}55`, borderColor: t.hex || '#6366f1' } : undefined}>
                                            {t.isBot ? '🤖 ' : ''}{t.label || t.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {targets.length === 1 && <div className="text-[11px] text-slate-400 mb-2">هدف: <b className="text-slate-200">{target.label || target.name}</b></div>}
                            <div className="grid grid-cols-3 gap-2">
                                {REACTION_ITEMS.map(item => {
                                    const blocked = cool > 0 || coins < item.price;
                                    return (
                                        <button key={item.id} disabled={blocked} onClick={() => throwItem(item)} className="gq-react-item">
                                            <span className="text-2xl leading-none">{item.emoji}</span>
                                            <span className="text-[10px] font-bold text-slate-200 leading-tight">{item.name}</span>
                                            <span className="flex items-center gap-0.5 text-[10px] font-black text-amber-300">{item.price.toLocaleString('fa-IR')} <IconCoin className="w-3 h-3" /></span>
                                        </button>
                                    );
                                })}
                            </div>
                            {cool > 0 && <div className="mt-2 text-[11px] text-amber-300 font-bold text-center">⏳ پرتاب بعدی تا {Math.ceil(cool / 1000).toLocaleString('fa-IR')} ثانیه‌ی دیگر</div>}
                            {msg && <div className="mt-2 text-[11px] text-rose-300 font-bold text-center">{msg}</div>}
                            <label className="mt-2.5 pt-2 border-t border-slate-700/70 flex items-center justify-between gap-2 text-[11px] text-slate-400 cursor-pointer">
                                <span>نمایش واکنش‌های دیگران</span>
                                <input type="checkbox" checked={!muted} onChange={toggleMute} className="accent-indigo-500" />
                            </label>
                        </div>
                    )}
                    <button type="button" onClick={toggleTray} aria-expanded={open} aria-label="پرتاب واکنش" className={`gq-react-fab ${open ? 'is-open' : ''}`}>
                        <span className="text-2xl leading-none">{open ? '✕' : '🥚'}</span>
                        {cool > 0 && !open && <span className="gq-react-cool">{Math.ceil(cool / 1000).toLocaleString('fa-IR')}</span>}
                    </button>
                </div>,
                document.body
            )}
        </Fragment>
    );
};
