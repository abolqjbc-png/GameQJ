// ---------- صفحه‌ی «در حال جستجوی حریف» ----------
const MatchmakingScreen = ({ game, currentUser, found, onCancel }) => {
    const rule = MATCH_RULES[game] || { min: 2, max: 2, label: 'بازی' };
    const [now, setNow] = useState(Date.now());
    const startedRef = useRef(Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 500);
        return () => clearInterval(timer);
    }, []);

    const waiting = getWaitingPlayers(game);
    const names = found ? found.participants : waiting.map(entry => entry.username);
    const slots = Array.from({ length: rule.max }, (_, i) => names[i] || null);
    const elapsed = Math.floor((now - startedRef.current) / 1000);
    const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
    const isLudo = game === 'ludo';
    const isTicTacToe = game === 'tictactoe';
    const secondJoinedAt = waiting[1] ? waiting[1].joinedAt : null;
    const startIn = isLudo && !found && secondJoinedAt && waiting.length < rule.max ? Math.max(0, Math.ceil((rule.waitMs - (now - secondJoinedAt)) / 1000)) : null;
    const me = findUser(currentUser.username) || currentUser;

    return (
        <div className="w-full max-w-2xl mx-auto py-4 sm:py-8 animate-in fade-in">
            <div className={`mm-card relative overflow-hidden glass-panel rounded-3xl p-6 sm:p-10 text-center border ${found ? 'border-emerald-400/60' : 'border-indigo-400/30'} shadow-2xl`}>
                <div className="mm-glow absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

                {/* رادار جستجو و آواتار من */}
                <div className="relative mx-auto w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center mb-5">
                    {!found && (
                        <Fragment>
                            <span className="mm-ring"></span>
                            <span className="mm-ring" style={{ animationDelay: '0.8s' }}></span>
                            <span className="mm-ring" style={{ animationDelay: '1.6s' }}></span>
                            <span className="mm-sweep"></span>
                        </Fragment>
                    )}
                    <div className={`relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-3xl border-4 ${found ? 'border-emerald-400 shadow-emerald-500/50' : 'border-indigo-400 shadow-indigo-500/50'} shadow-2xl bg-slate-800 ${found ? 'mm-found' : ''}`}>
                        <PlayerAvatar user={me} className="w-full h-full rounded-[inherit]" />
                    </div>
                </div>

                <h2 className="text-xl sm:text-3xl font-black text-white">
                    {found ? '🎉 حریف پیدا شد!' : (<span>در حال جستجوی حریف آنلاین<span className="mm-dots"></span></span>)}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-6">
                    {found ? 'مسابقه تا لحظاتی دیگر آغاز می‌شود…'
                        : isLudo ? `منچ آنلاین؛ با ۴ بازیکن فوری شروع می‌شود، وگرنه حداقل ۲ نفر و جاهای خالی با ربات پر می‌شود.`
                        : isTicTacToe ? 'دوز آنلاین؛ به‌محض پیدا شدن حریف، مسابقه شروع می‌شود.'
                        : 'شطرنج آنلاین؛ به‌محض پیدا شدن یک بازیکنِ آماده، مسابقه شروع می‌شود.'}
                </p>

                {/* اسلات‌های بازیکنان */}
                <div className={`mt-6 grid gap-3 ${rule.max === 4 ? 'grid-cols-4' : 'grid-cols-2 max-w-xs mx-auto'}`}>
                    {slots.map((name, i) => {
                        const acc = name ? findUser(name) : null;
                        return (
                            <div key={i} className="flex flex-col items-center gap-1.5">
                                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${name ? 'border-emerald-400 bg-slate-800 mm-slot-in' : 'border-slate-700 border-dashed bg-slate-900/60 mm-slot-wait'}`}>
                                    {acc ? <PlayerAvatar user={acc} className="w-full h-full rounded-[inherit]" /> : <span className="text-slate-600 text-xl font-black">؟</span>}
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className={`text-[10px] sm:text-xs font-bold truncate max-w-full ${name ? 'text-white' : 'text-slate-600'}`}>{name ? (name === currentUser.username ? `${name} (شما)` : name) : 'در انتظار…'}</span>
                                    {acc?.equipped?.titles && acc.equipped.titles !== 'classic' && (
                                        <div className="-mt-1 origin-top transform scale-[0.8]">
                                            {renderPlayerTitle(acc.equipped.titles)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] sm:text-xs">
                    <span className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 tabular-nums">⏱ {mmss}</span>
                    <span className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300">👥 {Math.min(names.length, rule.max).toLocaleString('fa-IR')} از {rule.max.toLocaleString('fa-IR')} بازیکن</span>
                    {startIn !== null && <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold">شروع با همین بازیکنان تا {startIn.toLocaleString('fa-IR')} ثانیه</span>}
                </div>

                <p className="mt-5 text-[10px] sm:text-xs text-slate-500">ورودی ۲۵ کیوجی پرداخت شده است؛ با لغو جستجو به‌طور کامل برمی‌گردد.</p>

                {!found && (
                    <button onClick={onCancel} className="mt-5 w-full sm:w-auto px-8 py-3 rounded-2xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-black text-sm active:scale-95 transition-all">
                        لغو جستجو
                    </button>
                )}
            </div>
        </div>
    );
};