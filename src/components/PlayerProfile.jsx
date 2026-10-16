// ---------- رندر قاب و عنوان ----------
// تمام افکت‌های قاب فرزند مستقیم محدودهٔ بریده‌شدهٔ آواتار هستند.
const renderAvatarFrame = (frameId) => {
    if (!frameId || frameId === 'classic') return null;

    const frameClasses = {
        classic: null,
        neon_pulse: 'frame-neon-edge',
        fire_ring: 'frame-ember',
        lightning: 'frame-void',
        diamond: 'frame-prismatic',
        hacker: 'frame-cyber',
        gold_crown: 'frame-imperial'
    };
    const frameClass = frameClasses[frameId];
    if (!frameClass) return null;

    return (
        <>
        <div className={`avatar-frame-overlay ${frameClass}`} aria-hidden="true">
            {frameId === 'fire_ring' && <>
                <i className="pf-ember-particle" style={{ left: '24%', animationDelay: '0.15s' }} />
                <i className="pf-ember-particle" style={{ left: '48%', animationDelay: '1.05s', animationDuration: '2s' }} />
                <i className="pf-ember-particle" style={{ left: '74%', animationDelay: '0.55s', animationDuration: '2.9s' }} />
            </>}
            {frameId === 'lightning' && <>
                <i className="pf-void-star void-star-one" />
                <i className="pf-void-star void-star-two" />
            </>}
            {frameId === 'diamond' && <>
                <i className="pf-diamond-spark" style={{ top: '8%', left: '18%', animationDelay: '0.2s' }} />
                <i className="pf-diamond-spark" style={{ top: '74%', right: '13%', animationDelay: '1.1s' }} />
                <i className="pf-diamond-spark" style={{ bottom: '8%', left: '43%', animationDelay: '1.7s' }} />
            </>}
            {frameId === 'hacker' && <>
                <i className="frame-cyber-corner cyber-tl" /><i className="frame-cyber-corner cyber-tr" />
                <i className="frame-cyber-corner cyber-bl" /><i className="frame-cyber-corner cyber-br" />
                <span className="frame-cyber-scanline" />
                <span className="pf-hud-badge top-1 left-1.5">SYS</span>
                <span className="pf-hud-badge bottom-1 right-1.5">LIVE</span>
            </>}
        </div>
        {frameId === 'gold_crown' && <span className="pf-crown-mark" aria-hidden="true">♛</span>}
        </>
    );
};

const renderPlayerTitle = (titleId) => {
    if (!titleId || titleId === 'classic') return null;
    const titles = {
        shadow_hunter: { text: 'شکارچی سایه', cls: 'title-shadow-hunter' },
        god_of_dice: { text: 'خدای تاس', cls: 'title-god-of-dice' },
        ruthless: { text: 'بی‌رحم', cls: 'title-ruthless' },
        veteran: { text: 'کهنه‌کار', cls: 'title-veteran' },
        grandmaster: { text: 'استاد بزرگ', cls: 'title-grandmaster' }
    };
    const title = titles[titleId];
    if (!title) return null;
    return <div className="mt-1.5 text-[11px] sm:text-xs flex justify-center"><span className={`player-title-badge ${title.cls}`}>{title.text}</span></div>;
};

const PlayerAvatar = ({ user, className = 'w-10 h-10' }) => {
    const frameId = user?.equipped?.frames;
    return (
        <div className={`avatar-frame-scope ${frameId === 'gold_crown' ? 'avatar-frame-scope-imperial' : 'relative isolate overflow-hidden'} rounded-2xl ${className} shrink-0`}>
            <span className="absolute inset-0 z-0 rounded-[inherit] bg-indigo-600/30 border border-indigo-400/40 overflow-hidden flex items-center justify-center text-indigo-200">
                {user?.avatar ? <img src={user.avatar} alt={`آواتار ${user.username}`} className="w-full h-full object-cover" /> : <IconUserCircle className="w-2/3 h-2/3" />}
            </span>
            {renderAvatarFrame(frameId)}
        </div>
    );
};

const PlayerProfileModal = ({ username, onClose }) => {
    const player = findUser(username);
    if (!player) return null;
    return (
        <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose} dir="rtl">
            <div role="dialog" aria-modal="true" className="relative glass-panel w-full max-w-sm rounded-3xl p-6 shadow-[0_0_40px_rgba(99,102,241,0.2)] border border-indigo-400/30 animate-in zoom-in-95 duration-300" onClick={event => event.stopPropagation()}>
                <button onClick={onClose} aria-label="بستن" className="absolute top-5 left-5 w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors">✕</button>
                <div className="flex flex-col items-center gap-2 mt-4">
                    <PlayerAvatar user={player} className="w-24 h-24 rounded-[1.5rem]" />
                    <div className="mt-4 text-center">
                        <h3 className="text-2xl font-black text-white">{player.username}</h3>
                        <div className="transform scale-110 origin-top mt-1">
                            {renderPlayerTitle(player.equipped?.titles)}
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-4 py-1.5 mt-2 bg-amber-500/15 text-amber-300 border border-amber-500/40 rounded-full font-black text-sm shadow-inner">
                        <IconCoin className="w-4 h-4" />
                        <span>{player.coins?.toLocaleString('fa-IR') ?? 0} کیوجی</span>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-8 text-center">
                    {[['بازی', player.stats.games], ['برد', player.stats.wins], ['باخت', player.stats.losses]].map(([label, value]) =>
                        <div key={label} className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-3 shadow-sm hover:border-indigo-500/40 transition-colors">
                            <div className="text-indigo-300 font-black text-2xl drop-shadow-md">{value}</div>
                            <div className="text-slate-400 text-xs font-bold mt-1">{label}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
