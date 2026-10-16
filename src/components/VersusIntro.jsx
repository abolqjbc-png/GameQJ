const MatchPlayerBadge = ({ player, gameType, onOpenProfile, active = false }) => {
    const account = player.isBot ? null : findUser(player.name);
    return <button type="button" disabled={!account || !onOpenProfile} onClick={() => onOpenProfile(player.name)}
        className={`match-player-badge ${active ? 'match-player-active' : ''}`} style={{ '--player-color': player.hex || '#818cf8' }}>
        <PlayerAvatar user={account} className="w-8 h-8 sm:w-10 sm:h-10" />
        <span className="min-w-0 text-right"><span className="block truncate font-bold text-xs sm:text-sm">{player.name}</span>
            <span className="block text-[10px] sm:text-xs text-slate-400">{gameType === 'chess' ? (player.side === 'white' ? '♔ مهره‌های سفید' : '♚ مهره‌های سیاه') : `مهره‌های ${player.colorName}`}</span></span>
    </button>;
};

const VersusIntro = ({ players = [], gameType, onComplete }) => {
    const completeRef = useRef(onComplete);
    completeRef.current = onComplete;
    useEffect(() => {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const timer = setTimeout(() => completeRef.current(), reducedMotion ? 1200 : 3000);
        return () => clearTimeout(timer);
    }, []);
    return <div className="versus-intro" role="dialog" aria-modal="true" aria-label="معرفی حریفان" dir="rtl">
        <div className="versus-beam" aria-hidden="true" />
        <div className="versus-heading">{gameType === 'chess' ? 'نبرد شطرنج' : 'رقابت منچ'}<span>حریف‌ها آماده‌اند</span></div>
        <div className={`versus-roster ${players.length > 2 ? 'versus-roster-four' : ''}`}>
            {players.map((player, index) => <div key={player.id ?? player.name} className="versus-card"
                style={{ '--player-color': player.hex || '#818cf8', '--entry-x': index % 2 ? '-70px' : '70px', '--entry-delay': `${index * 80}ms` }}>
                <div className="versus-avatar"><PlayerAvatar user={player.isBot ? null : findUser(player.name)} className="w-full h-full" /></div>
                <strong>{player.name}</strong>
                <span>{gameType === 'chess' ? (player.side === 'white' ? '♔ سفید' : '♚ سیاه') : player.colorName}</span>
                <small>{player.isBot ? 'هوش مصنوعی' : 'بازیکن'}</small>
            </div>)}
            <div className="versus-mark" aria-hidden="true">VS</div>
        </div>
        <div className="versus-progress" aria-hidden="true"><span /></div>
        <p className="text-slate-400 text-xs mt-4">آمادهٔ شروع باشید…</p>
    </div>;
};
