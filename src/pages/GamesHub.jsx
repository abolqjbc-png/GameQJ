// ============================================================================
// GamesHub.jsx — هاب بازی‌های GameQJ
// طراحی مجدد بصری و تعاملی: مدرن، گرافیکی، روان و زنده با انیمیشن‌های اختصاصی
// ============================================================================

const GamesHub = ({
    currentUser,
    onUserUpdated,
    lobbyId,
    onCloseLobby,
    onOpenProfile,
    setIsInGame,
    onNavigateToGames,
    onOpenWheel
}) => {
    // حالت بازی: 'online' (رقابت آنلاین) یا 'bot' (تمرین با هوش مصنوعی)
    const [matchType, setMatchType] = useState('online');
    const [selectedGame, setSelectedGame] = useState(null);
    const [matchLobby, setMatchLobby] = useState(null);
    const [sessionMatchId, setSessionMatchId] = useState(null);
    const [entryFeeError, setEntryFeeError] = useState('');
    const [infoModalGame, setInfoModalGame] = useState(null);

    // صف جستجوی آنلاین
    const [searchingGame, setSearchingGame] = useState(null);
    const [foundLobby, setFoundLobby] = useState(null);
    const searchStartedRef = useRef(0);
    const handledRematchIdsRef = useRef(new Set());
    const paidEntryFeeRef = useRef(ONLINE_ENTRY_FEE);

    // محاسبه‌ی تخفیف آلیانز برای ورودی مسابقات آنلاین
    const allianceDiscounts = useMemo(() => {
        try {
            if (typeof getUserDiscounts === 'function' && currentUser?.username) {
                return getUserDiscounts(currentUser.username) || { gameDiscountPercent: 0 };
            }
        } catch (e) {}
        return { gameDiscountPercent: 0 };
    }, [currentUser?.username]);

    const gameDiscountPct = Number(allianceDiscounts?.gameDiscountPercent) || 0;
    const baseEntryFee = ONLINE_ENTRY_FEE || 25;
    const actualEntryFee = gameDiscountPct > 0
        ? Math.max(1, Math.round(baseEntryFee * (1 - gameDiscountPct / 100)))
        : baseEntryFee;

    // وضعیت حضور در بازی (جهت مخفی‌سازی هدر در لابی یا مسابقه)
    useEffect(() => {
        if (setIsInGame) {
            setIsInGame(!!selectedGame || !!lobbyId || !!searchingGame);
        }
    }, [selectedGame, lobbyId, searchingGame, setIsInGame]);

    // لغو جستجوی آنلاین و استرداد دقیق سکه‌های کسر شده
    const cancelSearch = useCallback(() => {
        if (!searchingGame) return;
        leaveMatchQueue(currentUser.username);
        const refundAmount = paidEntryFeeRef.current || actualEntryFee;
        patchUser(currentUser.username, u => ({ ...u, coins: (u.coins || 0) + refundAmount }));
        const fresh = findUser(currentUser.username);
        if (fresh && onUserUpdated) onUserUpdated(fresh);
        setSearchingGame(null);
        setFoundLobby(null);
    }, [searchingGame, currentUser.username, actualEntryFee, onUserUpdated]);

    // چرخه‌ی مچ‌میکینگ آنلاین
    useEffect(() => {
        if (!searchingGame) return;

        const checkMatch = () => {
            pruneQueue();
            heartbeatMatchQueue(currentUser.username);

            let lobby = findMatchedLobby(currentUser.username, searchStartedRef.current);
            if (!lobby) {
                lobby = tryCreateMatch(currentUser.username, searchingGame);
            }

            if (lobby) {
                setFoundLobby(lobby);
                setTimeout(() => {
                    leaveMatchQueue(currentUser.username);
                    setMatchLobby(lobby);
                    setSessionMatchId(lobby.id);
                    setSelectedGame(lobby.gameType);
                    setSearchingGame(null);
                    setFoundLobby(null);
                }, 1400);
            }
        };

        checkMatch();
        const interval = setInterval(checkMatch, 800);

        const handleBeforeUnload = () => {
            leaveMatchQueue(currentUser.username);
            const refundAmount = paidEntryFeeRef.current || actualEntryFee;
            patchUser(currentUser.username, u => ({ ...u, coins: (u.coins || 0) + refundAmount }));
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            clearInterval(interval);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [searchingGame, currentUser.username, actualEntryFee]);

    // شنود سراسری درخواست بازی مجدد (شطرنج) زمانی که بازیکن خارج از مسابقه است
    useEffect(() => {
        if (selectedGame) return;

        const checkGlobalRematch = () => {
            let lastMatch = null;
            try {
                const stored = localStorage.getItem(`gameqj_last_chess_match_${currentUser.username}`);
                if (stored) lastMatch = JSON.parse(stored);
            } catch(e) {}

            if (!lastMatch || !lastMatch.matchId) return;
            if (Date.now() - (lastMatch.timestamp || 0) > 180000) return;

            const msgs = getMessages();
            const recentReq = msgs.find(m =>
                m.text.startsWith('__REMATCH_REQUEST__') &&
                m.senderUsername?.toLowerCase() !== currentUser.username.toLowerCase() &&
                (m.matchId === lastMatch.matchId || m.recipientUsername?.toLowerCase() === currentUser.username.toLowerCase()) &&
                Date.now() - new Date(m.createdAt).getTime() < 22000
            );

            if (recentReq && !handledRematchIdsRef.current.has(recentReq.id)) {
                handledRematchIdsRef.current.add(recentReq.id);
                const nextMatchId = recentReq.text.replace('__REMATCH_REQUEST__', '');
                const opponent = recentReq.senderUsername;

                showToast({
                    id: 'rematch-global',
                    type: 'request',
                    title: 'درخواست بازی مجدد شطرنج',
                    text: `«${opponent}» می‌خواهد دوباره با شما شطرنج بازی کند!`,
                    duration: 20000,
                    showTimer: true,
                    actions: [
                        {
                            label: 'قبول بازی مجدد',
                            variant: 'success',
                            onClick: () => {
                                const fresh = findUser(currentUser.username);
                                const isFree = !!lastMatch.hasFreeRematch;
                                const requiredFee = isFree ? 0 : actualEntryFee;
                                if (!isFree && (!fresh || fresh.coins < requiredFee)) {
                                    showToast({
                                        id: 'rematch-err',
                                        type: 'error',
                                        title: 'موجودی ناکافی',
                                        text: `برای قبول بازی مجدد به ${requiredFee} کیوجی نیاز دارید.`,
                                        duration: 4000
                                    });
                                    return;
                                }

                                if (!isFree && requiredFee > 0) {
                                    deductCoins(currentUser.username, requiredFee);
                                    const u = findUser(currentUser.username);
                                    if (u && onUserUpdated) onUserUpdated(u);
                                }

                                sendMessage(currentUser.username, `__REMATCH_ACCEPTED__${nextMatchId}`, opponent, recentReq.matchId);
                                window.dispatchEvent(new Event('storage'));
                                hideToast('rematch-global');

                                try {
                                    localStorage.setItem(`gameqj_last_chess_match_${currentUser.username}`, JSON.stringify({
                                        ...lastMatch,
                                        matchId: nextMatchId,
                                        hasFreeRematch: false,
                                        timestamp: Date.now()
                                    }));
                                } catch(e) {}

                                if (onNavigateToGames) onNavigateToGames();

                                setMatchLobby({
                                    id: nextMatchId,
                                    participants: lastMatch.matchParticipants || [opponent, currentUser.username],
                                    gameType: 'chess'
                                });
                                setSessionMatchId(nextMatchId);
                                setMatchType('online');
                                setSelectedGame('chess');

                                showToast({
                                    id: 'rematch-started',
                                    type: 'success',
                                    title: 'شروع مسابقه',
                                    text: `بازی مجدد با «${opponent}» آغاز شد!`,
                                    duration: 3500
                                });
                            }
                        },
                        {
                            label: 'رد کردن',
                            variant: 'danger',
                            onClick: () => {
                                sendMessage(currentUser.username, '__REMATCH_DECLINED__', opponent, recentReq.matchId);
                                window.dispatchEvent(new Event('storage'));
                                hideToast('rematch-global');
                            }
                        }
                    ]
                });
            }
        };

        checkGlobalRematch();
        const interval = setInterval(checkGlobalRematch, 700);
        window.addEventListener('storage', checkGlobalRematch);

        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', checkGlobalRematch);
        };
    }, [selectedGame, currentUser.username, onNavigateToGames, onUserUpdated, actualEntryFee]);

    // شروع بازی
    const handleStartGame = (gameKey) => {
        setEntryFeeError('');
        try { playSound('button', currentUser.settings?.sound); } catch (e) {}

        const playBlock = getUserPlayBlock(currentUser);
        if (playBlock) {
            const untilText = playBlock.type === 'suspend' && playBlock.until ? ` (تا ${new Date(playBlock.until).toLocaleString('fa-IR')})` : '';
            setEntryFeeError(playBlock.message + untilText);
            return;
        }

        if (matchType === 'online') {
            if ((currentUser.coins || 0) < actualEntryFee) {
                setEntryFeeError(`موجودی کیوجی شما کافی نیست! برای ورود به مسابقه آنلاین به ${actualEntryFee} کیوجی نیاز دارید (موجودی فعلی: ${currentUser.coins || 0}).`);
                return;
            }
            paidEntryFeeRef.current = actualEntryFee;
            deductCoins(currentUser.username, actualEntryFee);
            const fresh = findUser(currentUser.username);
            if (fresh && onUserUpdated) onUserUpdated(fresh);

            searchStartedRef.current = Date.now();
            joinMatchQueue(currentUser.username, gameKey);
            setSearchingGame(gameKey);
            setFoundLobby(null);
        } else {
            setMatchLobby(null);
            setSessionMatchId(`bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
            setSelectedGame(gameKey);
        }
    };

    // ۱. لابی دوستان
    if (lobbyId) {
        return (
            <GameLobby
                lobbyId={lobbyId}
                currentUser={currentUser}
                onClose={onCloseLobby}
                onOpenProfile={onOpenProfile}
                onStart={(lobby) => {
                    setMatchLobby(lobby);
                    setMatchType('online');
                    setSelectedGame(lobby.gameType);
                    setSessionMatchId(lobby.id || `game-${Date.now()}`);
                    onCloseLobby();
                }}
            />
        );
    }

    // ۲. صفحه جستجوی آنلاین
    if (searchingGame) {
        return (
            <MatchmakingScreen
                game={searchingGame}
                currentUser={currentUser}
                found={foundLobby}
                onCancel={cancelSearch}
            />
        );
    }

    // ۳. شطرنج
    if (selectedGame === 'chess') {
        return (
            <ChessGame
                currentUser={currentUser}
                matchType={matchType}
                matchId={matchLobby?.id || sessionMatchId}
                matchParticipants={matchLobby?.participants}
                onOpenProfile={onOpenProfile}
                setIsInGame={setIsInGame}
                onUserUpdated={onUserUpdated}
                onNavigateToGames={onNavigateToGames}
                onExit={() => { setSelectedGame(null); setMatchLobby(null); setSessionMatchId(null); }}
                onGameFinished={(won, gameType, isOnline) => {
                    const updatedUser = recordGameResult(currentUser.username, won, gameType, isOnline);
                    if (updatedUser && onUserUpdated) onUserUpdated(updatedUser);
                }}
            />
        );
    }

    // ۴. منچ
    if (selectedGame === 'ludo') {
        return (
            <LudoGame
                currentUser={currentUser}
                gameMode={matchType}
                matchId={matchLobby?.id || sessionMatchId}
                matchParticipants={matchLobby?.participants}
                onOpenProfile={onOpenProfile}
                setIsInGame={setIsInGame}
                onUserUpdated={onUserUpdated}
                onNavigateToGames={onNavigateToGames}
                onExit={() => { setSelectedGame(null); setMatchLobby(null); setSessionMatchId(null); }}
                onGameFinished={(won, gameType, isOnline) => {
                    const updatedUser = recordGameResult(currentUser.username, won, gameType, isOnline);
                    if (updatedUser && onUserUpdated) onUserUpdated(updatedUser);
                }}
            />
        );
    }

    // ۵. دوز
    if (selectedGame === 'tictactoe') {
        return (
            <TicTacToeGame
                currentUser={currentUser}
                matchType={matchType}
                matchId={matchLobby?.id || sessionMatchId}
                matchParticipants={matchLobby?.participants}
                onOpenProfile={onOpenProfile}
                setIsInGame={setIsInGame}
                onUserUpdated={onUserUpdated}
                onNavigateToGames={onNavigateToGames}
                onExit={() => { setSelectedGame(null); setMatchLobby(null); setSessionMatchId(null); }}
                onGameFinished={(won, gameType, isOnline) => {
                    const updatedUser = recordGameResult(currentUser.username, won, gameType, isOnline);
                    if (updatedUser && onUserUpdated) onUserUpdated(updatedUser);
                }}
            />
        );
    }

    // ۶. تخته نرد
    if (selectedGame === 'backgammon') {
        return (
            <BackgammonGame
                currentUser={currentUser}
                matchType={matchType}
                matchId={matchLobby?.id || sessionMatchId}
                matchParticipants={matchLobby?.participants}
                onOpenProfile={onOpenProfile}
                setIsInGame={setIsInGame}
                onUserUpdated={onUserUpdated}
                onNavigateToGames={onNavigateToGames}
                onExit={() => { setSelectedGame(null); setMatchLobby(null); setSessionMatchId(null); }}
                onGameFinished={(won, gameType, isOnline) => {
                    const updatedUser = recordGameResult(currentUser.username, won, gameType, isOnline);
                    if (updatedUser && onUserUpdated) onUserUpdated(updatedUser);
                }}
            />
        );
    }

    // آمار سریع بازیکن
    const userStats = currentUser.stats || {};
    const totalWins = (userStats.chessWins || 0) + (userStats.ludoWins || 0) + (userStats.tictactoeWins || 0) + (userStats.backgammonWins || 0);
    const totalGames = (userStats.chessGames || 0) + (userStats.ludoGames || 0) + (userStats.tictactoeGames || 0) + (userStats.backgammonGames || 0);
    const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

    // تعریف داده‌های ۳ بازی اصلی با هویت بصری کامل
    const gamesData = [
        {
            key: 'tictactoe',
            title: 'دوز نئونی ۳×۳',
            tagline: 'سرعتی، غافلگیرکننده و تاکتیکی',
            icon: '⭕❌',
            players: '۲ نفره',
            duration: '~۱ دقیقه',
            reward: matchType === 'online' ? 40 : null,
            badge: '⚡ برق‌آسا',
            accent: 'cyan',
            theme: {
                gradient: 'from-cyan-500 via-sky-600 to-blue-700',
                border: 'border-cyan-500/40 hover:border-cyan-400',
                shadow: 'hover:shadow-[0_20px_50px_-12px_rgba(6,182,212,0.45)]',
                glowBg: 'bg-cyan-500/15',
                badgeBg: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/30',
                btnGrad: 'from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500',
                btnShadow: 'shadow-cyan-500/30',
                iconBg: 'from-cyan-500/20 to-blue-600/20 border-cyan-400/30 text-cyan-300'
            },
            desc: 'نبرد سرعتی و استراتژیک دوز روی صفحه ۳×۳. با پیش‌بینی حرکت رقیب، ۳ علامت را در یک خط افقی، عمودی یا مورب بچینید!',
            rules: [
                'هر بازیکن به نوبت یکی از ۹ خانه خالی را علامت‌گذاری می‌کند.',
                'نخستین بازیکنی که ۳ علامت متوالی بچیند برنده مسابقه خواهد بود.',
                'در صورت پر شدن تمام خانه‌ها بدون برنده، مسابقه مساوی تمام می‌شود.'
            ],
            renderPreview: () => (
                <div className="relative w-full h-32 flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950/80 to-cyan-950/40 border border-cyan-500/20 p-2">
                    {/* جلوه خطوط شبکه نئونی */}
                    <div className="grid grid-cols-3 grid-rows-3 gap-1.5 w-24 h-24 p-1 rounded-xl bg-slate-900/80 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                        <div className="flex items-center justify-center font-black text-xs text-cyan-400 drop-shadow-[0_0_8px_#22d3ee]">✕</div>
                        <div className="flex items-center justify-center font-black text-xs text-rose-400 drop-shadow-[0_0_8px_#fb7185]">○</div>
                        <div className="flex items-center justify-center font-black text-xs text-cyan-400 drop-shadow-[0_0_8px_#22d3ee]">✕</div>
                        <div className="flex items-center justify-center font-black text-xs text-rose-400 drop-shadow-[0_0_8px_#fb7185]">○</div>
                        <div className="flex items-center justify-center font-black text-xs text-cyan-300 bg-cyan-500/20 rounded-md animate-pulse">✕</div>
                        <div className="flex items-center justify-center font-black text-xs text-slate-700">·</div>
                        <div className="flex items-center justify-center font-black text-xs text-cyan-400 drop-shadow-[0_0_8px_#22d3ee]">✕</div>
                        <div className="flex items-center justify-center font-black text-xs text-rose-400 drop-shadow-[0_0_8px_#fb7185]">○</div>
                        <div className="flex items-center justify-center font-black text-xs text-slate-700">·</div>
                    </div>
                    {/* خط برد نئونی متحرک */}
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent blur-[1px] animate-pulse" />
                </div>
            )
        },
        {
            key: 'ludo',
            title: 'منچ رویال ۴ نفره',
            tagline: 'پرشورترین آوردگاه شانس و هوش',
            icon: '🎲',
            players: '۴ نفره',
            duration: '~۵ تا ۸ دقیقه',
            reward: matchType === 'online' ? 100 : null,
            badge: '🔥 پرطرفدارترین',
            accent: 'amber',
            theme: {
                gradient: 'from-amber-500 via-orange-600 to-rose-600',
                border: 'border-amber-500/40 hover:border-amber-400',
                shadow: 'hover:shadow-[0_20px_50px_-12px_rgba(245,158,11,0.45)]',
                glowBg: 'bg-amber-500/15',
                badgeBg: 'bg-amber-500/20 text-amber-200 border-amber-400/30',
                btnGrad: 'from-amber-500 via-orange-500 to-rose-600 hover:from-amber-400 hover:to-rose-500',
                btnShadow: 'shadow-amber-500/30',
                iconBg: 'from-amber-500/20 to-orange-600/20 border-amber-400/30 text-amber-300'
            },
            desc: 'رقابت داغ ۴ نفره! مهره‌های حریف را بزنید، با تاس ۶ از آشیانه بیرون بیایید و زودتر از دیگران ۴ مهره‌تان را به ستون فتح برسانید.',
            rules: [
                'برای خارج کردن مهره از آشیانه باید حتماً تاس ۶ بیاورید.',
                'با فرود آمدن روی مهره حریف در خانه‌های عادی، آن مهره به خانه بازمی‌گردد.',
                'هر بازیکن که بتواند زودتر تمام ۴ مهره خود را به مرکز صفحه برساند برنده است.'
            ],
            renderPreview: () => (
                <div className="relative w-full h-32 flex items-center justify-around overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950/80 to-amber-950/40 border border-amber-500/20 p-2">
                    {/* تاس سه بعدی متحرک */}
                    <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-600 text-slate-950 font-black shadow-[0_10px_25px_rgba(245,158,11,0.5)] transform -rotate-6 hover:rotate-6 transition-transform">
                        <span className="text-3xl leading-none">⚅</span>
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-ping" />
                    </div>
                    {/* ۴ مهره رنگی درخشان */}
                    <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-red-500 border-2 border-white shadow-[0_0_12px_#ef4444] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow-[0_0_12px_#10b981] animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-6 h-6 rounded-full bg-amber-400 border-2 border-white shadow-[0_0_12px_#f59e0b] animate-bounce" style={{ animationDelay: '300ms' }} />
                        <span className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow-[0_0_12px_#3b82f6] animate-bounce" style={{ animationDelay: '450ms' }} />
                    </div>
                </div>
            )
        },
        {
            key: 'chess',
            title: 'شطرنج کلاسیک رسمی',
            tagline: 'آوردگاه نوابغ و شاهان تاکتیک',
            icon: '♞',
            players: '۲ نفره',
            duration: '~۱۰ دقیقه',
            reward: matchType === 'online' ? 50 : null,
            badge: '👑 اوج استراتژی',
            accent: 'purple',
            theme: {
                gradient: 'from-indigo-500 via-purple-600 to-pink-600',
                border: 'border-indigo-500/40 hover:border-indigo-400',
                shadow: 'hover:shadow-[0_20px_50px_-12px_rgba(99,102,241,0.45)]',
                glowBg: 'bg-indigo-500/15',
                badgeBg: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30',
                btnGrad: 'from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500',
                btnShadow: 'shadow-indigo-500/30',
                iconBg: 'from-indigo-500/20 to-purple-600/20 border-indigo-400/30 text-indigo-300'
            },
            desc: 'نبرد فکری ۶۴ خانه‌ای با ساعت شطرنج رسمی و قوانین بین‌المللی فیده. کیش و مات کنید و نام خود را به عنوان استاد بزرگ ثبت نمایید!',
            rules: [
                'قوانین استاندارد شطرنج بین‌المللی شامل قلعه رفتن، ارتقای پیاده و آن‌پاسان.',
                'ساعت رسمی مسابقه: کنترل زمان مساوی برای هر دو بازیکن.',
                'پیروزی با کیش و مات، اتمام زمان حریف یا تسلیم شدن رقیب ثبت می‌گردد.'
            ],
            renderPreview: () => (
                <div className="relative w-full h-32 flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950/80 to-purple-950/40 border border-indigo-500/20 p-2">
                    {/* تکه‌ای از صفحه شطرنج سه‌بعدی‌نما */}
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 grid grid-cols-2 grid-rows-2 rounded-xl overflow-hidden border border-indigo-400/40 shadow-[0_0_20px_rgba(99,102,241,0.3)] transform rotate-12">
                            <div className="bg-slate-300 flex items-center justify-center text-xl text-slate-900 font-bold">♞</div>
                            <div className="bg-slate-700 flex items-center justify-center text-xl text-amber-300 font-bold">♚</div>
                            <div className="bg-slate-700 flex items-center justify-center text-xl text-slate-300 font-bold">♛</div>
                            <div className="bg-slate-300 flex items-center justify-center text-xl text-slate-900 font-bold">♜</div>
                        </div>
                        <div className="flex flex-col items-start gap-1">
                            <span className="text-xs font-black text-purple-200 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                                ساعت ۱۲ دقیقه‌ای
                            </span>
                            <span className="text-[10px] text-slate-400">قوانین رسمی بین‌المللی</span>
                            <span className="text-lg">👑 ♟ ♞</span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            key: 'backgammon',
            title: 'تخته نرد اصیل',
            tagline: 'نبرد شانس، مهارت و استراتژی',
            icon: '🎲',
            players: '۲ نفره',
            duration: '~۵ تا ۷ دقیقه',
            reward: matchType === 'online' ? '۶۰ تا ۱۸۰' : null,
            badge: '👑 بازی اصیل ایرانی',
            accent: 'amber',
            theme: {
                gradient: 'from-amber-600 via-yellow-600 to-amber-900',
                border: 'border-amber-500/40 hover:border-amber-300',
                shadow: 'hover:shadow-[0_20px_50px_-12px_rgba(245,158,11,0.5)]',
                glowBg: 'bg-amber-500/20',
                badgeBg: 'bg-amber-500/20 text-amber-200 border-amber-400/30',
                btnGrad: 'from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400',
                btnShadow: 'shadow-amber-500/30',
                iconBg: 'from-amber-500/20 to-yellow-600/20 border-amber-400/30 text-amber-300'
            },
            desc: 'بازی محبوب و پرطرفدار تخته نرد با ۲۴ خانه، قوانین فدراسیونی، پیشخوان بار، سینی برداشت و ضرایب پاداش مارس و مارس سیاه!',
            rules: [
                'حرکت بر اساس تاس‌های ریخته‌شده، جفت تاس ۴ حرکت اعطا می‌کند.',
                'زدن مهره تک حریف و فرستادن آن به پیشخوان وسط.',
                'برداشتن مهره‌ها در پایان بازی پس از جمع‌آوری تمام مهره‌ها در خانه خودی.',
                'پاداش مضاعف در صورت مارس (۲ برابر) و مارس سیاه (۳ برابر).'
            ],
            renderPreview: () => (
                <div className="relative w-full h-32 flex items-center justify-around overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950/90 to-amber-950/60 border border-amber-500/30 p-2">
                    {/* مینی تخته نرد با بافت چوب */}
                    <div className="w-20 h-20 rounded-xl bg-amber-950/80 border border-amber-600/40 p-1 flex flex-col justify-between shadow-lg">
                        <div className="flex justify-between">
                            <span className="w-2 h-6 bg-gradient-to-b from-amber-600 to-transparent rounded-t-sm" />
                            <span className="w-2 h-6 bg-gradient-to-b from-amber-800 to-transparent rounded-t-sm" />
                            <span className="w-2 h-6 bg-gradient-to-b from-amber-600 to-transparent rounded-t-sm" />
                        </div>
                        <div className="flex justify-center items-center gap-1">
                            <span className="w-4 h-4 rounded-full bg-amber-100 border border-amber-400 shadow-sm" />
                            <span className="w-4 h-4 rounded-full bg-slate-900 border border-indigo-400 shadow-sm" />
                        </div>
                        <div className="flex justify-between">
                            <span className="w-2 h-6 bg-gradient-to-t from-amber-800 to-transparent rounded-b-sm" />
                            <span className="w-2 h-6 bg-gradient-to-t from-amber-600 to-transparent rounded-b-sm" />
                            <span className="w-2 h-6 bg-gradient-to-t from-amber-800 to-transparent rounded-b-sm" />
                        </div>
                    </div>
                    {/* تاس و نماد */}
                    <div className="flex flex-col items-center gap-1.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-200 to-yellow-600 text-slate-950 font-black flex items-center justify-center text-xl shadow-md transform rotate-12 hover:rotate-0 transition-transform">
                            ⚄
                        </div>
                        <span className="text-[10px] font-black text-amber-300">قوانین رسمی فیده</span>
                    </div>
                </div>
            )
        }
    ];

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500 text-slate-100 select-none pb-12" dir="rtl">
            <style>{`
                @keyframes hubFloat { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-7px); } }
                @keyframes hubPulseGlow { 0%, 100% { opacity: 0.35; transform: scale(1); } 50% { opacity: 0.75; transform: scale(1.08); } }
                @keyframes hubSheen { 0% { transform: translateX(180%) skewX(-20deg); } 100% { transform: translateX(-180%) skewX(-20deg); } }
                @keyframes hubBadgeGlow { 0%, 100% { box-shadow: 0 0 0 rgba(251,191,36,0); } 50% { box-shadow: 0 0 14px rgba(251,191,36,0.5); } }
                .hub-float { animation: hubFloat 4s ease-in-out infinite; }
                .hub-sheen { position: relative; overflow: hidden; }
                .hub-sheen::after {
                    content: '';
                    position: absolute;
                    top: 0; left: 0;
                    width: 45%; height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent);
                    transform: translateX(180%) skewX(-20deg);
                    pointer-events: none;
                }
                .hub-sheen:hover::after {
                    animation: hubSheen 0.85s ease-out;
                }
                .hub-card-hover {
                    transition: all 0.38s cubic-bezier(0.2, 0.8, 0.2, 1);
                }
                .hub-card-hover:hover {
                    transform: translateY(-8px) scale(1.015);
                }
            `}</style>

            {/* نورهای شناور پس‌زمینه (Ambient Orbs) */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
                <div className="absolute top-1/4 right-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] animate-[hubPulseGlow_6s_ease-in-out_infinite]" />
                <div className="absolute top-1/2 left-10 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] animate-[hubPulseGlow_7s_ease-in-out_1s_infinite]" />
                <div className="absolute bottom-10 right-1/3 w-96 h-96 bg-amber-600/10 rounded-full blur-[120px] animate-[hubPulseGlow_8s_ease-in-out_2s_infinite]" />
            </div>

            {/* کارت گردونه روزانه */}
            <DailyWheelCard currentUser={currentUser} onOpen={onOpenWheel || (() => {})} />

            {/* هدر بالایی: خوش‌آمدگویی، وضعیت بازیکن و انتخاب حالت مسابقه */}
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900/75 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl shadow-indigo-950/30">
                <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-600/10 blur-3xl pointer-events-none" />
                <div className="absolute -right-16 -bottom-16 h-56 w-56 rounded-full bg-gradient-to-br from-cyan-500/15 to-blue-600/10 blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    {/* اطلاعات بازیکن و خوش‌آمدگویی */}
                    <div className="flex items-center gap-4">
                        <div className="relative hub-float">
                            <PlayerAvatar user={currentUser} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ring-4 ring-indigo-500/30 shadow-xl" />
                            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-slate-900" title="آنلاین" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-indigo-300">خوش آمدید، قهرمان!</span>
                                {currentUser.equipped?.titles && currentUser.equipped.titles !== 'classic' && (
                                    <div className="transform scale-90 origin-right">
                                        {renderPlayerTitle(currentUser.equipped.titles)}
                                    </div>
                                )}
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-l from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                                {currentUser.username}
                            </h1>
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 font-bold text-amber-300">
                                    <IconCoin className="w-4 h-4 text-amber-400" />
                                    <span>{(currentUser.coins || 0).toLocaleString('fa-IR')}</span>
                                    <span className="text-[10px] text-amber-400/80">کیوجی</span>
                                </span>
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 font-bold text-slate-300">
                                    <IconTrophy className="w-3.5 h-3.5 text-amber-400" />
                                    <span>{totalWins} برد</span>
                                    <span className="text-[10px] text-slate-500">({winRate}٪ پیروزی)</span>
                                </span>
                                {gameDiscountPct > 0 && (
                                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/40 font-bold text-emerald-300 shadow-sm animate-pulse">
                                        <span>🛡️ تخفیف آلیانز:</span>
                                        <b className="text-emerald-200">{gameDiscountPct}٪</b>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* سوییچر مدرن حالت مسابقه (PvP Online vs PvE Bot) */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-950/80 p-2 rounded-2xl border border-white/10 shadow-inner">
                        <button
                            type="button"
                            onClick={() => {
                                setMatchType('online');
                                setEntryFeeError('');
                                try { playSound('button', currentUser.settings?.sound); } catch (e) {}
                            }}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-black text-xs sm:text-sm transition-all duration-300 active:scale-95 ${
                                matchType === 'online'
                                    ? 'bg-gradient-to-l from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400/30'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                            }`}
                        >
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            <IconGlobe className="w-4 h-4" />
                            <span>رقابت آنلاین (PvP)</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                {actualEntryFee} کیوجی
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setMatchType('bot');
                                setEntryFeeError('');
                                try { playSound('button', currentUser.settings?.sound); } catch (e) {}
                            }}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-black text-xs sm:text-sm transition-all duration-300 active:scale-95 ${
                                matchType === 'bot'
                                    ? 'bg-gradient-to-l from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400/30'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                            }`}
                        >
                            <IconBot className="w-4 h-4" />
                            <span>تمرین با ربات (آفلاین)</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                                رایگان
                            </span>
                        </button>
                    </div>
                </div>

                {/* بنر توضیح وضعیت حالت انتخابی */}
                <div className="mt-6 pt-5 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${matchType === 'online' ? 'bg-indigo-400 shadow-[0_0_8px_#818cf8]' : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'}`} />
                        <span className="font-bold text-slate-300">
                            {matchType === 'online'
                                ? 'حالت فعال: رقابت زنده با بازیکنان واقعی سراسر کشور به همراه رتبه‌بندی و پاداش کیوجی'
                                : 'حالت فعال: تمرین و آماده‌سازی بدون هزینه در برابر هوش مصنوعی هوشمند'}
                        </span>
                    </div>
                    {matchType === 'online' && gameDiscountPct > 0 && (
                        <div className="text-emerald-300 font-bold bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                            ✓ {gameDiscountPct}٪ تخفیف آلیانز فعال است (ورودی: {actualEntryFee} به جای {baseEntryFee} کیوجی)
                        </div>
                    )}
                </div>
            </div>

            {/* پیغام خطای ورودی یا مسدودی حساب */}
            {entryFeeError && (
                <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/80 border-2 border-rose-500/60 text-rose-200 text-xs sm:text-sm font-bold flex items-center justify-between gap-3 shadow-xl shadow-rose-950/40 animate-bounce-slight">
                    <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-300 text-lg">⚠️</span>
                        <span>{entryFeeError}</span>
                    </div>
                    <button
                        onClick={() => setEntryFeeError('')}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-bold transition-colors"
                    >
                        متوجه شدم
                    </button>
                </div>
            )}

            {/* عنوان بخش بازی‌ها */}
            <div className="flex items-center justify-between px-2 pt-2">
                <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                        <span>🎮</span>
                        <span>بازی مورد علاقه‌ات را انتخاب کن</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1">
                        روی هر بازی کلیک کنید تا فوراً وارد زمین مسابقه شوید
                    </p>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs text-slate-300">
                    <span>⚡ ۴ بازی در دسترس</span>
                </span>
            </div>

            {/* گرید ۴ کارت اصلی بازی‌ها (طراحی سه‌بعدی و گرافیکی) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
                {gamesData.map((game, idx) => {
                    const isAffordable = matchType === 'bot' || (currentUser.coins || 0) >= actualEntryFee;

                    return (
                        <div
                            key={game.key}
                            style={{ animationDelay: `${idx * 120}ms` }}
                            className={`group relative rounded-[2.2rem] border-2 ${game.theme.border} bg-slate-900/80 p-5 sm:p-6 backdrop-blur-xl shadow-xl ${game.theme.shadow} hub-card-hover flex flex-col justify-between overflow-hidden`}
                        >
                            {/* هاله نور گوشه کارت */}
                            <div className={`absolute -right-12 -top-12 h-44 w-44 rounded-full ${game.theme.glowBg} blur-3xl group-hover:scale-125 transition-transform duration-700 pointer-events-none`} />

                            <div className="relative z-10">
                                {/* سربرگ کارت: برچسب و دکمه راهنما */}
                                <div className="flex items-center justify-between mb-4">
                                    <span className={`px-3 py-1 rounded-full text-[11px] font-black border ${game.theme.badgeBg}`}>
                                        {game.badge}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setInfoModalGame(game);
                                        }}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[11px] font-bold text-slate-300 transition-colors"
                                        title="مشاهده قوانین و جزئیات"
                                    >
                                        <span>راهنما</span>
                                        <span>ℹ️</span>
                                    </button>
                                </div>

                                {/* پیش‌نمایش گرافیکی بازی */}
                                <div className="mb-5 transition-transform duration-500 group-hover:scale-[1.03]">
                                    {game.renderPreview()}
                                </div>

                                {/* عنوان و اطلاعات بازی */}
                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-l group-hover:from-white group-hover:to-slate-200 transition-colors">
                                            {game.title}
                                        </h3>
                                        <span className="text-xl">{game.icon}</span>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-400">
                                        {game.tagline}
                                    </p>
                                </div>

                                {/* برچسب‌های مشخصات (تعداد نفرات، زمان، پاداش) */}
                                <div className="grid grid-cols-2 gap-2 mb-4 text-center">
                                    <div className="p-2 rounded-xl bg-slate-950/60 border border-white/[0.06]">
                                        <div className="text-[10px] text-slate-500 font-bold">ظرفیت</div>
                                        <div className="text-xs font-black text-slate-200 mt-0.5">{game.players}</div>
                                    </div>
                                    <div className="p-2 rounded-xl bg-slate-950/60 border border-white/[0.06]">
                                        <div className="text-[10px] text-slate-500 font-bold">مدت زمان</div>
                                        <div className="text-xs font-black text-slate-200 mt-0.5">{game.duration}</div>
                                    </div>
                                </div>

                                {/* باکس پاداش یا وضعیت مسابقه */}
                                <div className={`p-3 rounded-2xl mb-6 border ${
                                    matchType === 'online'
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                                } flex items-center justify-between`}>
                                    <span className="text-xs font-bold">
                                        {matchType === 'online' ? 'جایزه پیروزی:' : 'وضعیت بازی:'}
                                    </span>
                                    <div className="flex items-center gap-1.5 font-black text-sm">
                                        {matchType === 'online' ? (
                                            <>
                                                <span>{game.reward}</span>
                                                <IconCoin className="w-4 h-4 text-amber-400" />
                                                <span className="text-[10px] text-amber-400/80">کیوجی</span>
                                            </>
                                        ) : (
                                            <span className="text-emerald-300">تمرینی و رایگان</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* دکمه ورود به بازی */}
                            <div className="relative z-10 pt-2">
                                <button
                                    type="button"
                                    onClick={() => handleStartGame(game.key)}
                                    className={`w-full py-4 rounded-2xl font-black text-sm text-white shadow-lg ${game.theme.btnGrad} ${game.theme.btnShadow} hub-sheen transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 group-hover:shadow-2xl`}
                                >
                                    {matchType === 'online' ? (
                                        <>
                                            <IconGlobe className="w-4 h-4" />
                                            <span>شروع رقابت آنلاین</span>
                                            <span className="px-2 py-0.5 rounded-lg bg-black/25 text-amber-300 text-xs font-black flex items-center gap-1">
                                                {actualEntryFee} <IconCoin className="w-3.5 h-3.5" />
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <IconBot className="w-4 h-4" />
                                            <span>شروع تمرین با ربات</span>
                                            <span className="px-2 py-0.5 rounded-lg bg-black/20 text-emerald-200 text-xs font-black">
                                                رایگان
                                            </span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* پنجره راهنما و قوانین بازی (مودال تعاملی) */}
            {infoModalGame && (
                <div
                    className="fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setInfoModalGame(null)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
                    >
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">{infoModalGame.icon}</span>
                                <div>
                                    <h3 className="text-xl font-black text-white">{infoModalGame.title}</h3>
                                    <p className="text-xs text-slate-400">{infoModalGame.tagline}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setInfoModalGame(null)}
                                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-black flex items-center justify-center transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4 text-xs sm:text-sm leading-relaxed text-slate-300">
                            <div>
                                <h4 className="font-black text-indigo-300 mb-1">درباره این بازی:</h4>
                                <p className="text-slate-400">{infoModalGame.desc}</p>
                            </div>

                            <div>
                                <h4 className="font-black text-emerald-300 mb-2">قوانین و شیوه بازی:</h4>
                                <ul className="space-y-1.5 pr-4 list-disc list-outside text-slate-400">
                                    {infoModalGame.rules.map((rule, rIdx) => (
                                        <li key={rIdx}>{rule}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200">
                                <b className="block mb-1 font-black">پاداش مسابقه آنلاین:</b>
                                <span>
                                    با شکست حریف در حالت آنلاین، بلافاصله مبلغ <b>{infoModalGame.reward} کیوجی</b> به حساب شما واریز خواهد شد.
                                </span>
                            </div>
                        </div>

                        <div className="pt-2 flex gap-3">
                            <button
                                onClick={() => {
                                    const gKey = infoModalGame.key;
                                    setInfoModalGame(null);
                                    handleStartGame(gKey);
                                }}
                                className={`flex-1 py-3.5 rounded-xl text-white font-black text-sm bg-gradient-to-r ${infoModalGame.theme.btnGrad} shadow-lg active:scale-95 transition-all`}
                            >
                                ورود به این بازی
                            </button>
                            <button
                                onClick={() => setInfoModalGame(null)}
                                className="px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-colors"
                            >
                                بستن
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
