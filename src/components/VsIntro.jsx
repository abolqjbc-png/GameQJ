// ---------- انیمیشن شروع بازی (حالت VS): نمایش حریف‌ها، پروفایل و مهره‌های هرکس ----------
// players: [{ key, name, tag, hex, avatar, wins, isMe, isBot, preview }]   preview = نودِ مهره‌ها با استایل خود بازیکن
const VsIntro = ({ title, subtitle, players, onDone }) => {
    const [leaving, setLeaving] = useState(false);
    const doneRef = useRef(onDone);
    doneRef.current = onDone;
    const leavingRef = useRef(false);

    const finish = useCallback(() => {
        if (leavingRef.current) return;
        leavingRef.current = true;
        setLeaving(true);
        setTimeout(() => doneRef.current && doneRef.current(), 480);
    }, []);

    useEffect(() => {
        const timer = setTimeout(finish, 3600);
        return () => clearTimeout(timer);
    }, [finish]);

    const four = players.length > 2;
    const mobile = typeof window !== 'undefined' && window.innerWidth < 640;
    // مسیر ورود هر کارت (دو نفره: از دو طرف | چهار نفره: از چهار گوشه)
    const fromVec = (i) => {
        if (!four) return mobile ? ['0', i === 0 ? '-80vh' : '80vh'] : [i === 0 ? '-90vw' : '90vw', '0'];
        return [(i % 2 === 0 ? '-80vw' : '80vw'), (i < 2 ? '-50vh' : '50vh')];
    };

    return (
        <div dir="ltr" onClick={finish} className={`gq-vs-root fixed inset-0 z-[9000] overflow-hidden flex flex-col items-center justify-center px-3 cursor-pointer ${leaving ? 'gq-vs-out' : ''}`}>
            <div className="gq-vs-bg absolute inset-0"></div>
            <div className="gq-vs-streaks absolute inset-0"></div>
            <div className="gq-vs-flash absolute inset-0"></div>

            <div dir="rtl" className="relative z-10 text-center mb-3 sm:mb-6 gq-vs-title">
                <div className="gq-vs-subtitle text-xs sm:text-sm font-bold tracking-widest text-indigo-300">{subtitle}</div>
                <h2 className="gq-vs-heading text-2xl sm:text-4xl font-black text-white mt-1" style={{ textShadow: '0 0 24px rgba(129,140,248,.8)' }}>{title}</h2>
            </div>

            <div className={`relative z-10 w-full ${four ? 'max-w-3xl grid grid-cols-2 gap-3 sm:gap-6' : 'max-w-4xl flex flex-col sm:flex-row items-stretch justify-center gap-3 sm:gap-10'}`}>
                {players.map((p, i) => {
                    const [fx, fy] = fromVec(i);
                    return (
                        <div
                            key={p.key}
                            dir="rtl"
                            className="gq-vs-card relative rounded-3xl p-3 sm:p-5 flex flex-col items-center text-center overflow-hidden sm:flex-1"
                            style={{
                                '--fx': fx, '--fy': fy, animationDelay: `${i * 0.12}s`,
                                '--player-accent': p.hex,
                                background: `linear-gradient(160deg, ${p.hex}40, rgba(15,23,42,.92) 62%)`,
                                border: `1.5px solid ${p.hex}`,
                                boxShadow: `0 0 34px ${p.hex}55, inset 0 1px 0 rgba(255,255,255,.18)`
                            }}
                        >
                            <span className="gq-vs-sheen absolute inset-0 pointer-events-none"></span>
                            <div className={`gq-vs-avatar relative ${four ? 'w-16 h-16 sm:w-24 sm:h-24' : 'w-24 h-24 sm:w-36 sm:h-36'} rounded-3xl shrink-0`} style={{ border: `3px solid ${p.hex}`, boxShadow: `0 0 22px ${p.hex}99`, animationDelay: `${0.5 + i * 0.12}s` }}>
                                <div className="gq-vs-avatar-placeholder absolute inset-0 rounded-[inherit] overflow-hidden flex items-center justify-center bg-slate-800">
                                    {p.avatar
                                        ? <img src={p.avatar} alt={p.name} draggable={false} className="w-full h-full object-cover" />
                                        : <span className={four ? 'text-3xl sm:text-5xl' : 'text-5xl sm:text-7xl'}>{p.isBot ? '🤖' : '👤'}</span>}
                                </div>
                                {p.account?.equipped?.frames && renderAvatarFrame(p.account.equipped.frames)}
                            </div>
                            <div className="flex flex-col items-center mt-2 sm:mt-3">
                                <div className={`gq-vs-name font-black text-white max-w-full truncate ${four ? 'text-sm sm:text-xl' : 'text-lg sm:text-2xl'}`}>{p.name}</div>
                                {p.account?.equipped?.titles && p.account.equipped.titles !== 'classic' && (
                                    <div className="transform scale-110 origin-top mt-1">
                                        {renderPlayerTitle(p.account.equipped.titles)}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
                                <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full text-white" style={{ background: `${p.hex}cc` }}>{p.tag}</span>
                                {p.isMe && <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-400/40">شما</span>}
                                {p.isBot && <span className="gq-vs-bot text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">ربات</span>}
                            </div>
                            {typeof p.wins === 'number' && (
                                <div className="text-[10px] sm:text-xs text-amber-300 font-bold mt-1.5">🏆 {p.wins.toLocaleString('fa-IR')} برد</div>
                            )}
                            <div className="flex items-center justify-center gap-1 sm:gap-2 mt-2 sm:mt-3 h-8 sm:h-11">{p.preview}</div>
                        </div>
                    );
                })}

                <div className="gq-vs-badge absolute z-20 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <span className="gq-vs-ring"></span>
                    <span className="gq-vs-ring" style={{ animationDelay: '.45s' }}></span>
                    <span className="gq-vs-text">VS</span>
                </div>
            </div>

            <div className="gq-vs-progress-track relative z-10 w-48 sm:w-64 h-1.5 rounded-full bg-white/10 overflow-hidden mt-5 sm:mt-8">
                <div className="gq-vs-progress h-full rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-amber-300"></div>
            </div>
            <div dir="rtl" className="gq-vs-skip relative z-10 text-[10px] sm:text-xs text-slate-400 mt-2">برای رد شدن لمس کنید</div>
        </div>
    );
};

// داده‌ی نمایشی یک بازیکن (آواتار و آمار از حساب خودش خوانده می‌شود)
const buildVsPlayer = (name, currentUser, extra) => {
    const acc = name && name.toLowerCase() === currentUser.username.toLowerCase() ? currentUser : (name ? findUser(name) : null);
    return {
        name: name || extra.fallbackName,
        avatar: acc ? getAvatarSrc(acc) : '',
        wins: acc && acc.stats ? acc.stats.wins : undefined,
        isMe: !!acc && acc.username.toLowerCase() === currentUser.username.toLowerCase(),
        account: acc,
        ...extra
    };
};
