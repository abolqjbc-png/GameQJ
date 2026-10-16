const DailyWheelButton = ({ currentUser, isInGame, onOpen }) => {
    const [, setWheelTick] = useState(0);
    useEffect(() => {
        if (isInGame) return;
        const timer = setInterval(() => setWheelTick(tick => tick + 1), 1000);
        return () => clearInterval(timer);
    }, [isInGame, currentUser.username]);

    const ready = typeof canSpinWheel === "function" ? canSpinWheel(currentUser.username) : false;
    const remaining = typeof getWheelCooldownLeft === "function" ? getWheelCooldownLeft(currentUser.username) : 0;
    const formatted = typeof formatWheelCooldown === "function" ? formatWheelCooldown(remaining) : "";
    return (
        <button
            onClick={() => { if (!isInGame) onOpen(); }}
            className={"relative flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-black border transition-all shadow-md active:scale-95 " + (ready ? "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 border-amber-300 shadow-amber-500/30 animate-pulse" : "bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-700/80")}
            title={ready ? "گردونه روزانه آماده است — بچرخان!" : "تا چرخش بعدی: " + formatted}
        >
            <span className="text-[14px] sm:text-base leading-none">🎡</span>
            <span className="hidden sm:inline">{ready ? "گردونه" : formatted}</span>
            <span className="sm:hidden font-mono text-[10px]">{ready ? "!" : formatted.slice(0, 5)}</span>
            {ready && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900"><span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></span></span>}
        </button>
    );
};

const App = () => {
    const [currentUser, setCurrentUser] = useState(null);
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const [currentTab, setCurrentTab] = useState('games');
    const [activeLobbyId, setActiveLobbyId] = useState(null);
    const [viewedProfile, setViewedProfile] = useState(null);
    const [isInGame, setIsInGame] = useState(false);
    const [showDailyWheel, setShowDailyWheel] = useState(false);
    const openLobby = (lobbyId) => {
        setActiveLobbyId(lobbyId);
        setCurrentTab('games');
    };

    const isLightMode = currentUser?.settings?.lightMode ?? (typeof getInitialThemeIsLight === 'function' ? getInitialThemeIsLight() : false);

    useEffect(() => {
        if (typeof applyThemeToDOM === 'function') {
            applyThemeToDOM(isLightMode);
        }
    }, [isLightMode]);

    const handleToggleTheme = () => {
        const next = !isLightMode;
        if (typeof applyThemeToDOM === 'function') {
            applyThemeToDOM(next);
        }
        if (currentUser) {
            const updated = patchUser(currentUser.username, account => ({
                ...account,
                settings: { ...(account.settings || {}), lightMode: next }
            }));
            if (updated) setCurrentUser(updated);
        }
    };

    useEffect(() => {
        const session = getSession();
        if (session && session.username) {
            const u = findUser(session.username);
            if (u) {
                const fresh = patchUser(u.username, x => ({ ...x, lastSeen: new Date().toISOString() }));
                setCurrentUser(fresh);
            } else {
                clearSession();
            }
        }
        setIsAuthChecking(false);
    }, []);

    useEffect(() => {
        if (!currentUser) return;
        const syncUser = event => {
            if (event.key !== AUTH_USERS_KEY) return;
            const updated = findUser(currentUser.username);
            if (updated) setCurrentUser(updated);
        };
        window.addEventListener('storage', syncUser);
        return () => window.removeEventListener('storage', syncUser);
    }, [currentUser?.username]);

    // ---- دعوت‌های بازی: نوتیف سریع بالای صفحه + نقطه‌ی قرمز روی «دوستان» ----
    const toastedInvitesRef = useRef(null);
    const invitations = currentUser ? (currentUser.gameInvitations || []) : [];

    useEffect(() => {
        if (!currentUser) { toastedInvitesRef.current = null; return; }
        if (toastedInvitesRef.current === null) {
            // اولین بار بعد از ورود: دعوت‌های قبلی نوتیف دوباره نمی‌گیرند
            toastedInvitesRef.current = new Set(invitations.map(i => i.lobbyId));
            return;
        }
        invitations.forEach(invite => {
            if (toastedInvitesRef.current.has(invite.lobbyId)) return;
            toastedInvitesRef.current.add(invite.lobbyId);
            showToast({
                id: `invite-${invite.lobbyId}`, type: 'invite',
                title: `«${invite.from}» شما را به بازی دعوت کرد!`,
                text: invite.gameType === 'ludo' ? 'منچ ۴ نفره — از بخش دوستان به لابی بپیوندید.' : invite.gameType === 'backgammon' ? 'تخته نرد — از بخش دوستان به لابی بپیوندید.' : invite.gameType === 'tictactoe' ? 'دوز — از بخش دوستان به لابی بپیوندید.' : 'شطرنج — از بخش دوستان به لابی بپیوندید.',
                duration: 3500
            });
        });
    }, [currentUser, invitations.length]);

    // با ورود به بخش دوستان، دعوت‌های جدید «دیده‌شده» می‌شوند و نقطه‌ی قرمز می‌رود
    useEffect(() => {
        if (!currentUser || currentTab !== 'friends') return;
        if (!invitations.some(i => i.seen === false)) return;
        const updated = patchUser(currentUser.username, u => ({
            ...u, gameInvitations: u.gameInvitations.map(i => (i.seen === false ? { ...i, seen: true } : i))
        }));
        if (updated) setCurrentUser(updated);
    }, [currentTab, currentUser, invitations.length]);

    useEffect(() => {
        ensureAdminSeed();
        ensureAdminFlags();
        const sync = () => {
            setCurrentUser((prev) => {
                if (!prev) return prev;
                const fresh = findUser(prev.username);
                if (!fresh) return prev;
                if (fresh.banned === true && prev.banned !== true) {
                    showToast({ type: 'error', title: 'مسدود شد', text: 'حساب شما توسط مدیریت مسدود شد.' });
                }
                return fresh;
            });
        };
        window.addEventListener('gq:users-changed', sync);
        window.addEventListener('storage', sync);
        const iv = setInterval(sync, 15000);
        sync();
        return () => {
            window.removeEventListener('gq:users-changed', sync);
            window.removeEventListener('storage', sync);
            clearInterval(iv);
        };
    }, []);

    const hasUnseenInvite = currentTab !== 'friends' && invitations.some(i => i.seen === false);

    const handleLogin = (user) => {
        const u = patchUser(user.username, x => ({ ...x, lastSeen: new Date().toISOString() }));
        setCurrentUser(u || normalizeUser(user));
    };

    const handleLogout = () => {
        if (currentUser) {
            patchUser(currentUser.username, user => ({ ...user, lastSeen: new Date().toISOString() }));
        }
        clearSession();
        setCurrentUser(null);
        setCurrentTab('games');
        setActiveLobbyId(null);
        setViewedProfile(null);
    };

    const handleAccountDeleted = () => {
        clearSession();
        setCurrentUser(null);
        setCurrentTab('games');
        setActiveLobbyId(null);
        setViewedProfile(null);
    };

    if (isAuthChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-indigo-400 text-lg font-bold animate-pulse">در حال آماده‌سازی GameQJ...</div>
            </div>
        );
    }

    if (!currentUser) {
        return <AuthModal onLoginSuccess={handleLogin} />;
    }

    return (
        <div className="flex flex-col min-h-screen pb-6 sm:pb-0">
            <ToastCenter />
            <ReactionLayer />
            {/* Header کاملا ریسپانسیو */}
            <header className="p-3 sm:p-5 flex flex-wrap justify-between items-center border-b border-slate-700/50 glass-panel sticky top-0 z-50 transition-all gap-y-3">
                <div
                    className="flex items-center gap-2 sm:gap-3 cursor-pointer order-1"
                    onClick={() => { if(!isInGame) setCurrentTab('games'); }}
                >
                    <div className="bg-indigo-500/20 p-1.5 sm:p-2 rounded-xl border border-indigo-500/40">
                        <IconGamepad className="text-indigo-400 w-5 h-5 sm:w-7 sm:h-7" />
                    </div>
                    <span className="text-xl sm:text-2xl font-black bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
                        GameQJ
                    </span>
                </div>

                {!isInGame && (
                    <nav className="w-full sm:w-auto order-3 sm:order-2 flex items-center justify-center bg-slate-900/80 p-1.5 rounded-xl sm:rounded-2xl border border-slate-700/60 gap-1 mt-1 sm:mt-0">
                        <button
                            onClick={() => setCurrentTab('games')}
                            className={`flex-1 sm:flex-none flex justify-center items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all ${
                                currentTab === 'games'
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <IconGamepad className="w-4 h-4" />
                            <span>بازی</span>
                        </button>

                        <button
                            onClick={() => setCurrentTab('atom')}
                            className={`flex-1 sm:flex-none flex justify-center items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all ${
                                currentTab === 'atom'
                                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <ellipse cx="12" cy="12" rx="9" ry="3.8" stroke="currentColor" strokeWidth="1.7" transform="rotate(45 12 12)" />
                                <ellipse cx="12" cy="12" rx="9" ry="3.8" stroke="currentColor" strokeWidth="1.7" transform="rotate(-45 12 12)" />
                                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                            </svg>
                            <span>اتم</span>
                        </button>

                        <button
                            onClick={() => setCurrentTab('friends')}
                            className={`flex-1 sm:flex-none flex justify-center items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all relative ${
                                currentTab === 'friends'
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <IconUsers className="w-4 h-4" />
                            <span>دوستان</span>
                            {hasUnseenInvite && (
                                <span className="absolute top-1 right-1 flex h-2.5 w-2.5" title="دعوت بازی جدید">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-80"></span>
                                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500"></span>
                                </span>
                            )}
                            {!hasUnseenInvite && (currentUser.friendRequests || []).length > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
                            )}
                        </button>

                        <button
                            onClick={() => setCurrentTab('store')}
                            className={`flex-1 sm:flex-none flex justify-center items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all ${
                                currentTab === 'store'
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <IconShoppingBag className="w-4 h-4" />
                            <span>فروشگاه</span>
                        </button>

                        <button
                            onClick={() => setCurrentTab('alliances')}
                            className={`flex-1 sm:flex-none flex justify-center items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all ${
                                currentTab === 'alliances'
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M12 3 3 7v6c0 5 4 7.5 9 8 5-0.5 9-3 9-8V7l-9-4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                                <path d="M12 8v8M9 11h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                            </svg>
                            <span>آلیانز</span>
                        </button>
                        {isAdminUser(currentUser) && (
                            <button
                                onClick={() => setCurrentTab('admin')}
                                className={`flex-1 sm:flex-none flex justify-center items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all ${
                                    currentTab === 'admin'
                                        ? 'bg-gradient-to-r from-amber-500 to-red-600 text-white shadow-md'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                                </svg>
                                <span>مدیریت</span>
                            </button>
                        )}
                    </nav>
                )}

                <div className="flex items-center gap-2 sm:gap-2.5 order-2 sm:order-3">
                    <DailyWheelButton currentUser={currentUser} isInGame={isInGame} onOpen={() => setShowDailyWheel(true)} />

                    {/* دکمه تم روشن/تاریک (لایت مود) */}
                    <button
                        onClick={handleToggleTheme}
                        className={`p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border transition-all shadow-md active:scale-95 flex items-center justify-center ${
                            isLightMode
                                ? 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-700 shadow-amber-500/15'
                                : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300'
                        }`}
                        title={isLightMode ? 'تغییر به تم تاریک' : 'تغییر به حالت روشن (۹۰٪ سفید و ۱۰٪ تیره)'}
                        aria-label="تغییر تم"
                    >
                        {isLightMode ? (
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="5" />
                                <line x1="12" y1="1" x2="12" y2="3" />
                                <line x1="12" y1="21" x2="12" y2="23" />
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                <line x1="1" y1="12" x2="3" y2="12" />
                                <line x1="21" y1="12" x2="23" y2="12" />
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        )}
                    </button>

                    <div
                        onClick={() => { if(!isInGame) setCurrentTab('coins'); }}
                        className={`flex items-center gap-1 sm:gap-1.5 bg-amber-500/15 border border-amber-500/35 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl transition-all shadow-md shadow-amber-500/10 ${!isInGame ? 'hover:bg-amber-500/25 cursor-pointer active:scale-95' : 'cursor-default opacity-80'}`}
                        title="موجودی کیوجی شما"
                    >
                        <IconCoin className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="font-black text-amber-300 text-xs sm:text-sm">{currentUser.coins ?? 0}</span>
                        <span className="text-[10px] text-amber-400 font-bold hidden sm:inline">کیوجی</span>
                    </div>

                    <button
                        onClick={() => { if(!isInGame) setCurrentTab('profile'); }}
                        className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl text-xs sm:text-sm font-bold border transition-all ${
                            currentTab === 'profile'
                                ? 'bg-slate-800/80 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                : 'bg-slate-900/60 border-slate-700/80 text-indigo-300'
                        } ${!isInGame ? 'hover:bg-slate-800' : 'cursor-default opacity-80'}`}
                    >
                        <PlayerAvatar user={currentUser} className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl" />
                        <div className="hidden sm:flex flex-col items-start justify-center">
                            <span className="max-w-[100px] truncate leading-tight">{currentUser.username}</span>
                            {currentUser.equipped?.titles && currentUser.equipped.titles !== 'classic' && (
                                <div className="-mt-1 origin-right transform scale-90">
                                    {renderPlayerTitle(currentUser.equipped.titles)}
                                </div>
                            )}
                        </div>
                    </button>
                </div>
            </header>

            <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 flex flex-col justify-center relative">
                {/* بخش بازی برای مخفی شدن بدون Unmount به کلاس hidden تغییر می‌کند */}
                <div className={currentTab === 'games' ? 'w-full flex-1 flex flex-col' : 'hidden'}>
                    <GamesHub
                        currentUser={currentUser}
                        onUserUpdated={(updated) => setCurrentUser(updated)}
                        lobbyId={activeLobbyId}
                        onCloseLobby={() => setActiveLobbyId(null)}
                        onOpenProfile={setViewedProfile}
                        setIsInGame={setIsInGame}
                        onNavigateToGames={() => setCurrentTab('games')}
                        onOpenWheel={() => setShowDailyWheel(true)}
                    />
                </div>
                {currentTab === 'atom' && (
                    <section dir="rtl" className="w-full max-w-5xl mx-auto py-8 sm:py-14">
                        <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-slate-950/80 p-6 sm:p-12 shadow-[0_0_70px_rgba(6,182,212,0.10)]">
                            <div className="absolute -top-28 -left-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl animate-pulse" />
                            <div className="absolute -bottom-32 -right-16 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />
                            <span className="absolute top-12 left-[18%] h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)] animate-ping" />
                            <span className="absolute top-[32%] right-[12%] h-2 w-2 rounded-full bg-blue-300 shadow-[0_0_14px_rgba(147,197,253,0.9)] animate-pulse" />
                            <span className="absolute bottom-[20%] left-[12%] h-1.5 w-1.5 rounded-full bg-indigo-300 shadow-[0_0_12px_rgba(165,180,252,0.9)] animate-ping" />
                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className="relative mb-7 flex h-28 w-28 items-center justify-center rounded-[2rem] border border-cyan-300/25 bg-slate-900/80 text-cyan-300 shadow-[0_0_35px_rgba(34,211,238,0.18)]">
                                    <svg className="h-16 w-16 animate-[spin_18s_linear_infinite]" viewBox="0 0 64 64" fill="none" aria-hidden="true">
                                        <ellipse cx="32" cy="32" rx="26" ry="11" stroke="currentColor" strokeWidth="1.8" />
                                        <ellipse cx="32" cy="32" rx="26" ry="11" stroke="currentColor" strokeWidth="1.8" transform="rotate(60 32 32)" />
                                        <ellipse cx="32" cy="32" rx="26" ry="11" stroke="currentColor" strokeWidth="1.8" transform="rotate(120 32 32)" />
                                        <circle cx="32" cy="32" r="4" fill="currentColor" />
                                        <circle cx="32" cy="6" r="2.5" fill="#93c5fd" />
                                    </svg>
                                    <span className="absolute inset-0 rounded-[2rem] ring-1 ring-cyan-300/10" />
                                </div>
                                <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-1.5 text-xs font-bold tracking-wide text-cyan-200">
                                    <span className="h-2 w-2 rounded-full bg-cyan-300 animate-pulse" />
                                    در حال طراحی و توسعه
                                </span>
                                <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
                                    پروژه اتم <span className="bg-gradient-to-l from-cyan-300 to-blue-400 bg-clip-text text-transparent">(Atom)</span>
                                </h1>
                                <p className="mt-3 text-lg sm:text-xl font-bold text-blue-200">بازی اصلی GameQJ</p>
                                <div className="mt-7 h-px w-24 bg-gradient-to-l from-transparent via-cyan-400/70 to-transparent" />
                                <p className="mt-7 text-base sm:text-lg font-bold text-slate-100">این بخش در حال طراحی و توسعه است...</p>
                                <p className="mt-3 max-w-2xl text-sm sm:text-base leading-8 text-slate-300">
                                    بازی اصلی و بزرگ GameQJ به‌زودی در این بخش رونمایی خواهد شد.
                                </p>
                                <p className="mt-2 text-sm sm:text-base font-semibold text-cyan-200">منتظر یک تجربهٔ هیجان‌انگیز و متفاوت باشید!</p>
                                <div className="mt-8 flex items-center gap-2 text-xs font-medium text-slate-500">
                                    <span className="h-1 w-8 rounded-full bg-cyan-400/70" />
                                    <span>جهانی تازه در راه است</span>
                                    <span className="h-1 w-8 rounded-full bg-blue-500/70" />
                                </div>
                            </div>
                        </div>
                    </section>
                )}
                {currentTab === 'friends' && (
                    <FriendsPage
                        currentUser={currentUser}
                        onUserUpdated={(updated) => setCurrentUser(updated)}
                        onOpenLobby={openLobby}
                        onOpenProfile={setViewedProfile}
                    />
                )}
                {currentTab === 'alliances' && (
                    <AlliancePage
                        currentUser={currentUser}
                        onUserUpdated={(updated) => setCurrentUser(updated)}
                        onOpenProfile={setViewedProfile}
                    />
                )}
                {currentTab === 'coins' && <CoinShopPage currentUser={currentUser} onBack={() => setCurrentTab('games')} />}
                {currentTab === 'store' && <StorePage currentUser={currentUser} onUserUpdated={(updated) => setCurrentUser(updated)} />}
                {currentTab === 'profile' && (
                    <ProfilePage
                        user={currentUser}
                        onBack={() => setCurrentTab('games')}
                        onLogout={handleLogout}
                        onUserUpdated={(updated) => setCurrentUser(updated)}
                        onAccountDeleted={handleAccountDeleted}
                    />
                )}
                {currentTab === 'admin' && isAdminUser(currentUser) && (
                    <AdminPage currentUser={currentUser} onUserUpdated={(u) => setCurrentUser(u)} onBack={() => setCurrentTab('games')} />
                )}
            </main>
            {viewedProfile && <PlayerProfileModal username={viewedProfile} onClose={() => setViewedProfile(null)} />}
            {showDailyWheel && (
                <DailyWheelModal
                    currentUser={currentUser}
                    onUserUpdated={(u) => setCurrentUser(u)}
                    onClose={() => { setShowDailyWheel(false); const fresh = findUser(currentUser.username); if(fresh) setCurrentUser(fresh); }}
                />
            )}
        </div>
    );
};
