const TOAST_THEME = {
    request: { icon: '🎮', ring: 'border-indigo-500/60', glow: 'shadow-indigo-500/20', bar: 'bg-indigo-400' },
    waiting: { icon: '⏳', ring: 'border-indigo-500/40', glow: 'shadow-indigo-500/10', bar: 'bg-indigo-400' },
    success: { icon: '✅', ring: 'border-emerald-500/60', glow: 'shadow-emerald-500/20', bar: 'bg-emerald-400' },
    error: { icon: '⛔', ring: 'border-rose-500/60', glow: 'shadow-rose-500/20', bar: 'bg-rose-400' },
        invite: { icon: '🎲', ring: 'border-fuchsia-500/60', glow: 'shadow-fuchsia-500/25', bar: 'bg-fuchsia-400' },
    info: { icon: '🔔', ring: 'border-sky-500/50', glow: 'shadow-sky-500/10', bar: 'bg-sky-400' }
};
const TOAST_BTN = {
    success: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white',
    danger: 'bg-slate-800 hover:bg-rose-600 text-white border border-slate-700 hover:border-rose-500',
    neutral: 'bg-slate-700 hover:bg-slate-600 text-white'
};

const ToastCard = ({ toast, onClose }) => {
    const [now, setNow] = useState(Date.now());
    const theme = TOAST_THEME[toast.type] || TOAST_THEME.info;
    const total = Math.max(1, toast.expiresAt - toast.createdAt);
    const remaining = Math.max(0, toast.expiresAt - now);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 200);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (remaining <= 0 && !toast.leaving) onClose(toast.id, true);
    }, [remaining, toast.leaving]);

    return (
        <div
            role="status"
            dir="rtl"
            className={`pointer-events-auto w-full max-w-md glass-panel bg-slate-900/95 backdrop-blur-xl border ${theme.ring} shadow-2xl ${theme.glow} rounded-2xl overflow-hidden ${toast.leaving ? 'gq-toast-out' : 'gq-toast-in'}`}
        >
            <div className="p-4 flex items-start gap-3">
                <div className="w-11 h-11 shrink-0 rounded-full bg-slate-800/80 flex items-center justify-center text-xl">{theme.icon}</div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-black text-white text-sm sm:text-base leading-6">{toast.title}</h4>
                    {toast.text && <p className="text-xs sm:text-sm text-slate-300 mt-0.5 leading-6">{toast.text}</p>}
                    {toast.showTimer && (
                        <span className="inline-block mt-1.5 text-[11px] font-bold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-md">
                            {Math.ceil(remaining / 1000).toLocaleString('fa-IR')} ثانیه
                        </span>
                    )}
                </div>
                {!(toast.actions && toast.actions.length) && (
                    <button onClick={() => onClose(toast.id)} aria-label="بستن" className="text-slate-500 hover:text-white text-lg leading-none px-1">×</button>
                )}
            </div>
            {toast.actions && toast.actions.length > 0 && (
                <div className="px-4 pb-4 flex gap-2">
                    {toast.actions.map((action, i) => (
                        <button
                            key={i}
                            onClick={() => { onClose(toast.id); if (action.onClick) action.onClick(); }}
                            className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all active:scale-95 ${TOAST_BTN[action.variant] || TOAST_BTN.neutral}`}
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            )}
            {toast.duration > 0 && (
                <div className="h-1 bg-slate-800">
                    <div className={`h-full ${theme.bar} transition-[width] duration-200 ease-linear`} style={{ width: `${(remaining / total) * 100}%` }}></div>
                </div>
            )}
        </div>
    );
};

const ToastCenter = () => {
    const [toasts, setToasts] = useState([]);
    const toastsRef = useRef([]);
    useEffect(() => { toastsRef.current = toasts; }, [toasts]);

    const closeToast = useCallback((id, expired = false) => {
        setToasts(prev => prev.map(t => (t.id === id ? { ...t, leaving: true } : t)));
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id || !t.leaving)), 280);
        if (expired) {
            const t = toastsRef.current.find(x => x.id === id);
            if (t && t.onExpire) t.onExpire();
        }
    }, []);

    useEffect(() => {
        const handler = (event) => {
            const { action, toast, id } = event.detail || {};
            if (action === 'hide') { closeToast(id); return; }
            if (action !== 'show' || !toast || !toast.id) return;
            const createdAt = Date.now();
            const duration = toast.duration ?? 5000;
            setToasts(prev => {
                const old = prev.find(t => t.id === toast.id && !t.leaving);
                const entry = { ...toast, duration, createdAt, expiresAt: createdAt + duration, leaving: false, key: old && old.type === toast.type ? old.key : `${toast.id}-${createdAt}` };
                return old ? prev.map(t => (t.id === toast.id ? entry : t)) : [...prev.filter(t => t.id !== toast.id), entry];
            });
        };
        window.addEventListener(TOAST_EVENT, handler);
        return () => window.removeEventListener(TOAST_EVENT, handler);
    }, [closeToast]);

    return (
        <div className="fixed top-0 inset-x-0 z-[10000] flex flex-col items-center gap-3 px-3 pt-3 sm:pt-5 pointer-events-none">
            {toasts.map(t => <ToastCard key={t.key} toast={t} onClose={closeToast} />)}
        </div>
    );
};
