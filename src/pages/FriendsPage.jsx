const FriendsPage = ({ currentUser, onUserUpdated, onOpenLobby, onOpenProfile }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [friendFilter, setFriendFilter] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [activeSubTab, setActiveSubTab] = useState('find');
    const [selectedChat, setSelectedChat] = useState(null);
    const [lobbySetup, setLobbySetup] = useState(null);
    const [armedRemove, setArmedRemove] = useState(null);

    const myFriendsList = useMemo(() => {
        const raw = (currentUser.friends || []).map(name => findUser(name) || { username: name, isGhost: true });
        const pinnedSet = new Set((currentUser.pinnedFriends || []).map(name => name.toLowerCase()));
        return raw.sort((a, b) => {
            const aPinned = pinnedSet.has(a.username.toLowerCase());
            const bPinned = pinnedSet.has(b.username.toLowerCase());
            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;
            return a.username.localeCompare(b.username);
        });
    }, [currentUser.friends, currentUser.pinnedFriends]);

    const filteredFriends = useMemo(() => {
        if (!friendFilter.trim()) return myFriendsList;
        return myFriendsList.filter(friend => friend.username.toLowerCase().includes(friendFilter.trim().toLowerCase()));
    }, [myFriendsList, friendFilter]);
    const incomingRequests = currentUser.friendRequests || [];
    const canSeeOthersLastSeen = currentUser.settings?.showLastSeen ?? true;
    const gameInvitations = currentUser.gameInvitations || [];
    const onlineFriendsCount = useMemo(() => myFriendsList.filter(friend => {
        if (friend.isGhost || !friend.lastSeen) return false;
        return Date.now() - new Date(friend.lastSeen).getTime() < 90000;
    }).length, [myFriendsList]);

    useEffect(() => {
        if (selectedChat && !(currentUser.friends || []).some(name => name.toLowerCase() === selectedChat.toLowerCase())) setSelectedChat(null);
    }, [selectedChat, currentUser.friends]);
    useEffect(() => {
        if (!armedRemove) return undefined;
        const timer = setTimeout(() => setArmedRemove(null), 3000);
        return () => clearTimeout(timer);
    }, [armedRemove]);

    const togglePinFriend = (friendName) => {
        const pins = currentUser.pinnedFriends || [];
        const isPinned = pins.some(name => name.toLowerCase() === friendName.toLowerCase());
        const updated = patchUser(currentUser.username, user => ({
            ...user,
            pinnedFriends: isPinned ? pins.filter(name => name.toLowerCase() !== friendName.toLowerCase()) : [friendName, ...pins]
        }));
        if (updated) onUserUpdated(updated);
    };

    const endFriendship = (friendName) => {
        const meUpdated = patchUser(currentUser.username, user => ({
            ...user,
            friends: (user.friends || []).filter(name => name.toLowerCase() !== friendName.toLowerCase()),
            pinnedFriends: (user.pinnedFriends || []).filter(name => name.toLowerCase() !== friendName.toLowerCase())
        }));
        patchUser(friendName, user => ({
            ...user,
            friends: (user.friends || []).filter(name => name.toLowerCase() !== currentUser.username.toLowerCase()),
            pinnedFriends: (user.pinnedFriends || []).filter(name => name.toLowerCase() !== currentUser.username.toLowerCase())
        }));
        if (meUpdated) onUserUpdated(meUpdated);
        setArmedRemove(null);
        setFeedback({ type: 'info', msg: `رفاقت شما با «${friendName}» پایان یافت.` });
    };

    const sendGameInvites = (gameType, selectedFriends) => {
        if ((currentUser.coins || 0) < ONLINE_ENTRY_FEE) return setFeedback({ type: 'warning', msg: `موجودی کیوجی کافی نیست! ورود به بازی آنلاین به ${ONLINE_ENTRY_FEE} کیوجی نیاز دارد.` });
        if (!selectedFriends.length) return setFeedback({ type: 'warning', msg: 'حداقل یک دوست را انتخاب کنید.' });
        deductCoins(currentUser.username, ONLINE_ENTRY_FEE);
        onUserUpdated(findUser(currentUser.username));
        const lobby = createLobby(currentUser.username, gameType, selectedFriends);
        setLobbySetup(null);
        onOpenLobby(lobby.id);
    };

    const acceptGameInvite = (invite) => {
        if ((currentUser.coins || 0) < ONLINE_ENTRY_FEE) return setFeedback({ type: 'warning', msg: `برای قبول دعوت آنلاین به ${ONLINE_ENTRY_FEE} کیوجی نیاز دارید.` });
        deductCoins(currentUser.username, ONLINE_ENTRY_FEE);
        onUserUpdated(findUser(currentUser.username));
        const lobby = joinLobby(invite.lobbyId, currentUser.username);
        if (lobby) onOpenLobby(lobby.id);
        else setFeedback({ type: 'warning', msg: 'این لابی دیگر در دسترس نیست.' });
    };

    const handleSearch = (event) => {
        event.preventDefault();
        setFeedback(null);
        const query = searchTerm.trim();
        if (!query) return;
        if (query.toLowerCase() === currentUser.username.toLowerCase()) {
            setSearchResult(null);
            setFeedback({ type: 'warning', msg: 'شما نمی‌توانید به خودتان درخواست بدهید!' });
            return;
        }
        const target = findUser(query);
        if (!target) {
            setSearchResult(null);
            setFeedback({ type: 'warning', msg: `بازیکنی با نام «${query}» یافت نشد.` });
            return;
        }
        const isFriend = (currentUser.friends || []).some(name => name.toLowerCase() === target.username.toLowerCase());
        const requestSent = (target.friendRequests || []).some(request => request.from.toLowerCase() === currentUser.username.toLowerCase());
        setSearchResult({ ...target, isFriend, requestSent });
    };

    const handleSendRequest = (targetUsername) => {
        const target = findUser(targetUsername);
        if (!target) return;
        patchUser(target.username, user => {
            const requests = user.friendRequests || [];
            if (!requests.some(request => request.from.toLowerCase() === currentUser.username.toLowerCase())) {
                requests.push({ from: currentUser.username, timestamp: new Date().toISOString() });
            }
            return { ...user, friendRequests: requests };
        });
        setFeedback({ type: 'success', msg: `درخواست دوستی برای «${target.username}» فرستاده شد.` });
        setSearchResult(previous => previous ? { ...previous, requestSent: true } : previous);
    };

    const handleAcceptRequest = (requesterName) => {
        const meUpdated = patchUser(currentUser.username, user => ({
            ...user,
            friendRequests: (user.friendRequests || []).filter(request => request.from.toLowerCase() !== requesterName.toLowerCase()),
            friends: [...new Set([...(user.friends || []), requesterName])]
        }));
        patchUser(requesterName, user => {
            const notifications = user.notifications || [];
            notifications.unshift({ id: Date.now() + Math.random(), text: `«${currentUser.username}» درخواست رفاقت شما را پذیرفت! 🎉`, type: 'success', time: new Date().toISOString() });
            return { ...user, friends: [...new Set([...(user.friends || []), currentUser.username])], notifications };
        });
        if (meUpdated) onUserUpdated(meUpdated);
        setFeedback({ type: 'success', msg: `شما و «${requesterName}» رفیق شدید!` });
    };

    const handleDeclineRequest = (requesterName) => {
        const meUpdated = patchUser(currentUser.username, user => ({
            ...user,
            friendRequests: (user.friendRequests || []).filter(request => request.from.toLowerCase() !== requesterName.toLowerCase())
        }));
        if (meUpdated) onUserUpdated(meUpdated);
        setFeedback({ type: 'info', msg: `درخواست «${requesterName}» رد شد.` });
    };

    const tabs = [
        { id: 'find', label: 'جستجوی کاربر', icon: <IconSearch className="w-4 h-4" /> },
        { id: 'requests', label: 'درخواست‌ها', icon: <IconUserPlus className="w-4 h-4" />, badge: incomingRequests.length },
        { id: 'myFriends', label: 'فهرست دوستان', icon: <IconUsers className="w-4 h-4" />, badge: myFriendsList.length },
        { id: 'messenger', label: 'پیام‌رسان', icon: <IconMessageSquare className="w-4 h-4" /> }
    ];
    const tabIndex = Math.max(0, tabs.findIndex(tab => tab.id === activeSubTab));

    return (
        <div dir="rtl" className="friends-page w-full max-w-6xl mx-auto px-4 py-6 space-y-6 sm:space-y-8 pb-10">
            <style>{`
                @keyframes fr2-enter { from { opacity: 0; transform: translateY(12px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
                @keyframes fr2-pop { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: scale(1); } }
                @keyframes fr2-toast { from { opacity: 0; transform: translate(-50%, -8px); } to { opacity: 1; transform: translate(-50%, 0); } }
                @keyframes fr2-float { 0%, 100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(0,-7px,0); } }
                @keyframes fr2-dot { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }
            `}</style>

            <header className="rounded-3xl border border-white/[.06] bg-gradient-to-l from-indigo-950/60 via-slate-900/60 to-slate-900/40 p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                <div className="flex items-center gap-4">
                    <div className="rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-500/20 border border-indigo-300/20 p-3"><IconUsers className="w-10 h-10 text-indigo-200" /></div>
                    <div><h1 className="text-2xl sm:text-3xl font-black text-white">شبکه دوستان گیمر</h1><p className="mt-1 text-sm text-slate-400">رفقای تازه پیدا کنید، گفتگو کنید و با هم لابی بسازید.</p></div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/20 px-3 py-2 flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-[fr2-dot_1.5s_ease-in-out_infinite]" /><span className="text-slate-300">دوستان آنلاین</span><b className="text-white">{onlineFriendsCount}</b></div>
                    <div className="rounded-xl bg-indigo-500/10 border border-indigo-400/20 px-3 py-2 flex items-center gap-2 text-sm"><IconUsers className="w-4 h-4 text-indigo-300" /><span className="text-slate-300">کل دوستان</span><b className="text-white">{myFriendsList.length}</b></div>
                    <button onClick={() => setLobbySetup({ gameType: null, selected: [] })} className="rounded-xl px-4 py-3 text-white font-black text-sm bg-gradient-to-l from-violet-600 to-fuchsia-600 active:scale-95 transition-transform duration-200 flex items-center gap-2"><IconGamepad className="w-5 h-5" />ایجاد لابی مسابقه</button>
                </div>
            </header>

            {feedback && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)] rounded-xl border px-4 py-3 shadow-xl animate-[fr2-toast_.3s_both] ${feedback.type === 'success' ? 'bg-emerald-950 border-emerald-500/40 text-emerald-200' : feedback.type === 'warning' ? 'bg-amber-950 border-amber-500/40 text-amber-200' : 'bg-sky-950 border-sky-500/40 text-sky-200'}`}>
                    <div className="flex items-center gap-3"><span className="font-bold">{feedback.msg}</span><button onClick={() => setFeedback(null)} aria-label="بستن" className="text-white/60 hover:text-white">✕</button></div>
                </div>
            )}

            {gameInvitations.length > 0 && (
                <section className="rounded-3xl border border-rose-500/20 bg-slate-900/50 p-5 space-y-4">
                    <h2 className="text-lg font-black text-white">دعوت‌نامه‌های مسابقه</h2>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        {gameInvitations.map((invite, i) => (
                            <article key={invite.lobbyId} className="min-w-[270px] rounded-2xl border border-white/[.06] bg-white/[.03] p-4 space-y-3 hover:-translate-y-0.5 transition-transform duration-200" style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}>
                                <div className="flex items-center gap-3"><span className="text-2xl">{invite.gameType === 'ludo' ? '🎲' : invite.gameType === 'chess' ? '♟' : invite.gameType === 'backgammon' ? '🎲' : '⭕'}</span><div><div className="font-bold text-white">دعوت از <button className="text-rose-200" onClick={() => onOpenProfile?.(invite.from)}>{invite.from}</button></div><div className="text-xs text-slate-400">بازی: {invite.gameType === 'ludo' ? 'منچ ۴ نفره' : invite.gameType === 'chess' ? 'شطرنج' : invite.gameType === 'backgammon' ? 'تخته نرد' : 'دوز'}</div></div></div>
                                <button onClick={() => acceptGameInvite(invite)} className="w-full rounded-xl py-2.5 bg-gradient-to-l from-emerald-600 to-teal-500 text-white font-bold text-sm flex justify-center items-center gap-2"><IconCoin className="w-4 h-4" />ورود به بازی ({ONLINE_ENTRY_FEE} کیوجی)</button>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            <nav className="relative grid grid-cols-4 rounded-2xl bg-white/[.04] border border-white/[.06] p-1">
                <span className="absolute top-1 bottom-1 right-1 w-[calc(25%-0.25rem)] rounded-xl bg-gradient-to-l from-indigo-600/80 to-violet-600/80 transition-transform duration-300" style={{ transform: `translateX(-${tabIndex * 100}%)` }} />
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => { setActiveSubTab(tab.id); setFeedback(null); }} className={`relative z-10 min-w-0 px-1 sm:px-3 py-3 rounded-xl flex items-center justify-center gap-1 sm:gap-2 text-[11px] sm:text-sm font-bold transition-colors duration-200 ${activeSubTab === tab.id ? 'text-white' : 'text-slate-400 hover:text-white'}`}>
                        {tab.icon}<span className="truncate">{tab.label}</span>{tab.badge > 0 && <span className="rounded-full bg-rose-500 px-1.5 text-[10px] text-white">{tab.badge}</span>}
                    </button>
                ))}
            </nav>

            <div key={activeSubTab} className="animate-[fr2-enter_.35s_cubic-bezier(.2,.8,.2,1)_both]">
                {activeSubTab === 'find' && (
                    <section className="rounded-3xl border border-white/[.06] bg-slate-900/50 p-5 sm:p-8">
                        <div className="text-center mb-6"><div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center animate-[fr2-float_3s_ease-in-out_infinite]"><IconSearch className="w-7 h-7 text-indigo-300" /></div><h2 className="text-xl font-black text-white">بازیکنان جدید پیدا کنید</h2><p className="text-sm text-slate-400 mt-2">نام کاربری دوست خود را جست‌وجو کنید و درخواست رفاقت بفرستید.</p></div>
                        <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2">
                            <input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="نام کاربری (مثلاً Ali_Gamer)..." className="min-w-0 flex-1 rounded-xl bg-slate-950/70 border border-white/10 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400" />
                            <button type="submit" className="rounded-xl px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-2"><IconSearch className="w-4 h-4" />جستجو</button>
                        </form>
                        {searchResult && (
                            <article className="max-w-xl mx-auto mt-5 rounded-2xl border border-indigo-400/20 bg-indigo-500/[.06] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-[fr2-pop_.25s_both]">
                                <div className="flex items-center gap-3"><button onClick={() => onOpenProfile?.(searchResult.username)}><PlayerAvatar user={searchResult} className="w-12 h-12 rounded-xl" /></button><div><button onClick={() => onOpenProfile?.(searchResult.username)} className="font-black text-white">{searchResult.username}</button><p className="text-xs text-slate-400">{formatLastSeen(searchResult.lastSeen, canViewLastSeen(currentUser, searchResult))}</p></div></div>
                                <div>{searchResult.isFriend ? <span className="rounded-lg bg-slate-700/60 px-3 py-2 text-sm text-slate-200">در فهرست رفقا</span> : searchResult.requestSent ? <span className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-300">درخواست ارسال شده</span> : <button onClick={() => handleSendRequest(searchResult.username)} className="rounded-xl px-4 py-2.5 bg-gradient-to-l from-emerald-600 to-teal-500 text-white text-sm font-bold flex items-center gap-2"><IconUserPlus className="w-4 h-4" />افزودن به دوستان</button>}</div>
                            </article>
                        )}
                    </section>
                )}

                {activeSubTab === 'requests' && (
                    <section className="rounded-3xl border border-white/[.06] bg-slate-900/50 p-5 sm:p-8">
                        <h2 className="text-xl font-black text-white mb-5">درخواست‌های دوستی</h2>
                        {incomingRequests.length === 0 ? (
                            <div className="py-12 text-center"><div className="text-4xl mb-4 animate-[fr2-float_3s_ease-in-out_infinite]">✉</div><p className="font-bold text-slate-200">هیچ درخواست جدیدی ندارید.</p><p className="text-sm text-slate-500 mt-2">زمانی که کسی به شما درخواست دوستی بدهد، در این بخش نمایش داده می‌شود.</p></div>
                        ) : (
                            <div className="grid sm:grid-cols-2 gap-3" style={{ contain: 'content' }}>
                                {incomingRequests.map((request, i) => (
                                    <article key={`${request.from}-${i}`} className="rounded-2xl border border-white/[.06] bg-white/[.03] p-4 flex flex-col gap-4 animate-[fr2-enter_.3s_both]" style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}>
                                        <div className="flex items-center gap-3"><button onClick={() => onOpenProfile?.(request.from)}><PlayerAvatar user={findUser(request.from)} className="w-12 h-12 rounded-xl" /></button><div><button onClick={() => onOpenProfile?.(request.from)} className="font-bold text-white">{request.from}</button><p className="text-xs text-slate-400">می‌خواهد با شما دوست شود · {request.timestamp ? new Date(request.timestamp).toLocaleDateString('fa-IR') : ''}</p></div></div>
                                        <div className="flex gap-2"><button onClick={() => handleAcceptRequest(request.from)} className="flex-1 rounded-xl bg-gradient-to-l from-emerald-600 to-teal-500 py-2.5 text-white font-bold flex items-center justify-center gap-2"><IconCheck className="w-4 h-4" />قبول</button><button onClick={() => handleDeclineRequest(request.from)} className="flex-1 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2.5 text-rose-300 font-bold flex items-center justify-center gap-2"><IconUserX className="w-4 h-4" />رد کردن</button></div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {activeSubTab === 'myFriends' && (
                    <section className="space-y-4">
                        <div className="rounded-2xl border border-white/[.06] bg-white/[.03] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><h2 className="text-xl font-black text-white">فهرست رفقا <span className="text-indigo-300">{myFriendsList.length}</span></h2><div className="relative"><IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><input value={friendFilter} onChange={event => setFriendFilter(event.target.value)} placeholder="جستجو در بین دوستان..." className="w-full sm:w-72 rounded-xl bg-slate-950/60 border border-white/10 py-2.5 pr-9 pl-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400" /></div></div>
                        {myFriendsList.length === 0 ? (
                            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[.02] p-10 text-center"><div className="text-5xl animate-[fr2-float_3s_ease-in-out_infinite]">🔭</div><h3 className="mt-4 text-xl font-black text-white">کسی اینجا نیست!</h3><p className="mt-2 text-sm text-slate-400">فهرست دوستان شما خالی است. همین حالا اولین دوست خود را پیدا کنید.</p><button onClick={() => setActiveSubTab('find')} className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 text-white font-bold">جستجوی بازیکنان</button></div>
                        ) : filteredFriends.length === 0 ? (
                            <div className="rounded-2xl border border-white/[.06] bg-white/[.02] p-10 text-center text-slate-400">بازیکنی با این نام پیدا نشد.</div>
                        ) : (
                            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3" style={{ contain: 'content' }}>
                                {filteredFriends.map((friend, i) => {
                                    const isPinned = (currentUser.pinnedFriends || []).some(name => name.toLowerCase() === friend.username.toLowerCase());
                                    const isOnline = !friend.isGhost && friend.lastSeen && Date.now() - new Date(friend.lastSeen).getTime() < 90000;
                                    const isArmed = armedRemove === friend.username;
                                    return (
                                        <article key={friend.username} className={`rounded-2xl border border-white/[.06] bg-white/[.03] p-3 flex items-center gap-3 animate-[fr2-enter_.3s_both] ${friend.isGhost ? 'opacity-50' : 'hover:bg-white/[.06]'} transition-colors`} style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}>
                                            <div className="relative shrink-0"><button onClick={() => !friend.isGhost && onOpenProfile?.(friend.username)}><PlayerAvatar user={friend} className="w-12 h-12 rounded-xl" /></button><span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${isOnline && canSeeOthersLastSeen && friend.settings?.showLastSeen !== false ? 'bg-emerald-400 animate-[fr2-dot_1.5s_ease-in-out_infinite]' : 'bg-slate-600'}`} /></div>
                                            <div className="min-w-0 flex-1"><button onClick={() => !friend.isGhost && onOpenProfile?.(friend.username)} className="block max-w-full truncate font-bold text-white">{friend.username}</button><p className="text-xs text-slate-400 truncate">{friend.isGhost ? 'کاربر حذف شده' : formatLastSeen(friend.lastSeen, canViewLastSeen(currentUser, friend))}</p></div>
                                            {friend.isGhost ? (
                                                <button onClick={() => isArmed ? endFriendship(friend.username) : setArmedRemove(friend.username)} className={`shrink-0 rounded-lg px-2.5 py-2 text-xs font-bold ${isArmed ? 'bg-rose-600 text-white' : 'text-rose-300 bg-rose-500/10'}`} title="حذف از دوستان">{isArmed ? 'مطمئن؟' : <IconUserX className="w-4 h-4" />}</button>
                                            ) : (
                                                <div className="flex shrink-0 items-center gap-1">
                                                    <button onClick={() => togglePinFriend(friend.username)} title={isPinned ? 'برداشتن سنجاق' : 'سنجاق کردن'} className={`p-2 transition-transform hover:rotate-12 ${isPinned ? 'text-amber-400' : 'text-slate-500'}`}><IconPin className="w-4 h-4" filled={isPinned} /></button>
                                                    <button onClick={() => { setSelectedChat(friend.username); setActiveSubTab('messenger'); }} title="پیام" className="rounded-lg bg-slate-800/80 p-2 text-slate-300 hover:text-white"><IconMessageSquare className="w-4 h-4" /></button>
                                                    <button onClick={() => setLobbySetup({ gameType: null, selected: [friend.username] })} title="بازی" className="rounded-lg bg-slate-800/80 p-2 text-slate-300 hover:text-emerald-300"><IconGamepad className="w-4 h-4" /></button>
                                                    <button onClick={() => isArmed ? endFriendship(friend.username) : setArmedRemove(friend.username)} title="حذف از دوستان" className={`rounded-lg p-2 ${isArmed ? 'bg-rose-600 text-white' : 'bg-slate-800/80 text-slate-400 hover:text-rose-300'}`}>{isArmed ? 'مطمئن؟' : <IconUserX className="w-4 h-4" />}</button>
                                                </div>
                                            )}
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                )}
            </div>
            {activeSubTab === 'messenger' && (
                <section className="min-h-[420px] rounded-3xl border border-white/[.06] bg-slate-900/50 p-4 sm:p-6">
                    {!selectedChat ? (
                        <>
                            <div className="mb-5"><h2 className="text-xl font-black text-white">پیام‌های شما</h2><p className="mt-1 text-sm text-slate-400">برای شروع یا ادامه گفتگو، یکی از دوستان خود را انتخاب کنید.</p></div>
                            <div className="space-y-2" style={{ contain: 'content' }}>
                                {myFriendsList.filter(friend => !friend.isGhost).length === 0 ? <div className="py-16 text-center text-slate-500">دوستی برای چت کردن ندارید.</div> : myFriendsList.filter(friend => !friend.isGhost).map((friend, i) => {
                                    const isPinned = (currentUser.pinnedFriends || []).some(name => name.toLowerCase() === friend.username.toLowerCase());
                                    const isOnline = friend.lastSeen && Date.now() - new Date(friend.lastSeen).getTime() < 90000;
                                    return <button key={friend.username} onClick={() => setSelectedChat(friend.username)} className="w-full rounded-2xl border border-white/[.05] bg-white/[.02] p-3 flex items-center gap-3 text-right hover:bg-white/[.06] transition-colors animate-[fr2-enter_.3s_both]" style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}><span className="relative"><PlayerAvatar user={friend} className="w-12 h-12 rounded-xl" /><span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${isOnline ? 'bg-emerald-400 animate-[fr2-dot_1.5s_ease-in-out_infinite]' : 'bg-slate-600'}`} /></span><span className="min-w-0 flex-1"><span className="block truncate font-bold text-white">{friend.username}</span><span className="block truncate text-xs text-slate-400">{formatLastSeen(friend.lastSeen, canViewLastSeen(currentUser, friend))}</span></span>{isPinned && <IconPin className="w-4 h-4 text-amber-400" filled />}<IconMessageSquare className="w-4 h-4 text-indigo-300" /></button>;
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="flex min-h-[380px] flex-col overflow-hidden rounded-2xl border border-indigo-500/20 bg-slate-950/40">
                            <div className="flex items-center justify-between border-b border-white/[.06] p-3"><div className="flex items-center gap-3"><PlayerAvatar user={findUser(selectedChat)} className="w-10 h-10 rounded-xl" /><span className="font-bold text-white">{selectedChat}</span></div><button onClick={() => setSelectedChat(null)} className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200">بازگشت</button></div>
                            <div className="flex-1 min-h-[350px]"><ChatPanel key={selectedChat} currentUser={currentUser} peerName={selectedChat} onOpenProfile={onOpenProfile} /></div>
                        </div>
                    )}
                </section>
            )}

            {lobbySetup && (
                <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={event => { if (event.target === event.currentTarget) setLobbySetup(null); }}>
                    <section role="dialog" aria-modal="true" className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 p-5 sm:p-6 space-y-4 animate-[fr2-pop_.3s_both]">
                        <div className="flex items-center justify-between"><h2 className="text-xl font-black text-white">ایجاد مسابقه اختصاصی <span className="text-xs text-violet-300">مخفی</span></h2><button onClick={() => setLobbySetup(null)} aria-label="بستن" className="rounded-lg bg-slate-800 px-3 py-2 text-slate-300">✕</button></div>
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 flex items-center gap-2 text-sm text-amber-200"><IconCoin className="w-5 h-5 shrink-0" /><span>ورود به مسابقه {ONLINE_ENTRY_FEE} کیوجی نیاز دارد (موجودی فعلی: {currentUser.coins || 0}).</span></div>
                        {!lobbySetup.gameType ? (
                            <div className="space-y-3"><p className="text-sm font-bold text-slate-300">بازی مورد نظر را انتخاب کنید:</p><div className="grid grid-cols-2 gap-2.5">
                                <button onClick={() => setLobbySetup(previous => ({ ...previous, gameType: 'tictactoe' }))} className="rounded-2xl border border-cyan-500/30 bg-slate-950/40 p-3 sm:p-4 text-center hover:border-cyan-300 transition-colors"><span className="block text-2xl">⭕❌</span><strong className="mt-2 block text-white text-xs sm:text-sm">دوز ۲ نفره</strong><span className="text-[10px] sm:text-[11px] text-cyan-300">جایزه ۴۰ کیوجی</span></button>
                                <button onClick={() => setLobbySetup(previous => ({ ...previous, gameType: 'ludo' }))} className="rounded-2xl border border-amber-500/30 bg-slate-950/40 p-3 sm:p-4 text-center hover:border-amber-300 transition-colors"><span className="block text-2xl">🎲</span><strong className="mt-2 block text-white text-xs sm:text-sm">منچ ۴ نفره</strong><span className="text-[10px] sm:text-[11px] text-amber-300">جایزه ۱۰۰ کیوجی</span></button>
                                <button onClick={() => setLobbySetup(previous => ({ ...previous, gameType: 'chess' }))} className="rounded-2xl border border-indigo-500/30 bg-slate-950/40 p-3 sm:p-4 text-center hover:border-indigo-300 transition-colors"><span className="block text-2xl">♟</span><strong className="mt-2 block text-white text-xs sm:text-sm">شطرنج کلاسیک</strong><span className="text-[10px] sm:text-[11px] text-indigo-300">جایزه ۵۰ کیوجی</span></button>
                                <button onClick={() => setLobbySetup(previous => ({ ...previous, gameType: 'backgammon' }))} className="rounded-2xl border border-amber-500/40 bg-slate-950/40 p-3 sm:p-4 text-center hover:border-amber-400 transition-colors ring-1 ring-amber-500/20"><span className="block text-2xl">🎲</span><strong className="mt-2 block text-white text-xs sm:text-sm">تخته نرد</strong><span className="text-[10px] sm:text-[11px] text-amber-300">جایزه ۶۰ تا ۱۸۰ کیوجی</span></button>
                            </div></div>
                        ) : (
                            <div className="space-y-3"><div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-300">دوستان خود را دعوت کنید:</p><span className="rounded-full bg-indigo-500/15 px-3 py-1 text-xs text-indigo-200">{lobbySetup.selected.length} نفر انتخاب شده</span></div>
                                {myFriendsList.filter(friend => !friend.isGhost).length === 0 ? <p className="rounded-xl bg-white/[.03] p-4 text-center text-sm text-slate-400">دوستی برای دعوت ندارید.</p> : <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" style={{ contain: 'content' }}>{myFriendsList.filter(friend => !friend.isGhost).map((friend, i) => {
                                    const isSelected = lobbySetup.selected.includes(friend.username);
                                    return <button key={friend.username} onClick={() => setLobbySetup(previous => ({ ...previous, selected: isSelected ? previous.selected.filter(name => name !== friend.username) : [...previous.selected, friend.username] }))} className={`rounded-2xl border p-3 flex flex-col items-center gap-2 transition-colors ${isSelected ? 'ring-2 ring-indigo-400 bg-indigo-500/10 border-indigo-400' : 'border-white/10 bg-slate-950/40 hover:border-white/20'}`} style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}><PlayerAvatar user={friend} className="w-11 h-11 rounded-xl" /><span className="w-full truncate text-xs font-bold text-white">{friend.username}</span></button>;
                                })}</div>}
                                <div className="flex gap-2 border-t border-white/[.06] pt-3"><button onClick={() => setLobbySetup(previous => ({ ...previous, gameType: null }))} className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold text-white">بازگشت</button><button disabled={!lobbySetup.selected.length} onClick={() => sendGameInvites(lobbySetup.gameType, lobbySetup.selected)} className="flex-1 rounded-xl bg-gradient-to-l from-indigo-600 to-violet-600 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">تأیید و ورود ({ONLINE_ENTRY_FEE} کیوجی)</button></div>
                            </div>
                        )}
                        <button onClick={() => setLobbySetup(null)} className="w-full rounded-xl border border-white/10 py-2.5 text-sm text-slate-400 hover:text-white">انصراف</button>
                    </section>
                </div>
            )}
        </div>
    );
};
