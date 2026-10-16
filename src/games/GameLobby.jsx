const GameLobby = ({ lobbyId, currentUser, onClose, onStart, onOpenProfile }) => {
    const [lobby, setLobby] = useState(() => getLobbies().find(item => item.id === lobbyId));
    const [selectedFriends, setSelectedFriends] = useState([]);

    useEffect(() => {
        const refreshLobby = () => setLobby(getLobbies().find(item => item.id === lobbyId));
        const timer = setInterval(refreshLobby, 1000);
        return () => clearInterval(timer);
    }, [lobbyId]);

    useEffect(() => {
        if (lobby?.status === 'started') onStart(lobby);
    }, [lobby?.status, lobbyId]);

    if (!lobby) {
        return (
            <div className="w-full max-w-md mx-auto glass-panel p-8 rounded-3xl text-center space-y-4">
                <div className="text-4xl">⚠️</div>
                <p className="text-slate-300 text-sm font-bold">این لابی دیگر در دسترس نیست یا لغو شده است.</p>
                <button onClick={onClose} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold">
                    بازگشت
                </button>
            </div>
        );
    }

    const isHost = lobby.host === currentUser.username;
    const availableFriends = (currentUser.friends || []).filter(name => !lobby.invitees.includes(name) && !lobby.participants.includes(name));

    const inviteMore = () => {
        if (!selectedFriends.length) return;
        const lobbies = getLobbies().map(item => item.id === lobby.id ? { ...item, invitees: [...item.invitees, ...selectedFriends] } : item);
        saveLobbies(lobbies);
        selectedFriends.forEach(username => patchUser(username, user => ({
            ...user,
            gameInvitations: [...user.gameInvitations, { lobbyId: lobby.id, from: currentUser.username, gameType: lobby.gameType, seen: false }]
        })));
        setSelectedFriends([]);
        setLobby(lobbies.find(item => item.id === lobby.id));
    };

    const gameTitle = lobby.gameType === 'ludo'
        ? 'منچ ۴ نفره (جایزه برد: ۱۰۰ کیوجی)'
        : lobby.gameType === 'tictactoe'
        ? 'دوز ۲ نفره (جایزه برد: ۴۰ کیوجی)'
        : lobby.gameType === 'backgammon'
        ? 'تخته نرد ۲ نفره (جایزه برد: ۶۰ تا ۱۸۰ کیوجی)'
        : 'شطرنج ۲ نفره (جایزه برد: ۵۰ کیوجی)';

    return (
        <div className="w-full max-w-3xl mx-auto glass-panel lobby-glow rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 sm:space-y-8 text-center border border-indigo-500/30 animate-in fade-in">
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl bg-gradient-to-br from-indigo-500/30 to-purple-500/20 border-2 border-indigo-400/40 flex items-center justify-center animate-pulse-slow shadow-lg shadow-indigo-500/20">
                <IconUsers className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-300" />
            </div>
            <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">در انتظار پیوستن بازیکنان</h2>
                <p className="text-sm sm:text-base text-slate-400 mt-2">
                    بازی انتخاب‌شده: {gameTitle}
                </p>
            </div>

            <div className="p-4 sm:p-5 bg-slate-900/60 rounded-2xl sm:rounded-3xl text-right space-y-2 border border-slate-700/60 shadow-inner max-w-lg mx-auto">
                {lobby.participants.map(name => {
                    const u = findUser(name);
                    return (
                        <button key={name} onClick={() => onOpenProfile(name)} className="invite-row text-sm sm:text-base font-bold text-white py-2.5 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-3 w-full hover:bg-emerald-500/25 transition-colors">
                            <PlayerAvatar user={u} className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl shadow-sm" />
                            <div className="flex flex-col items-start">
                                <span>✓ {name}{name === lobby.host ? ' (میزبان)' : ''}</span>
                                {u?.equipped?.titles && u.equipped.titles !== 'classic' && (
                                    <div className="origin-right transform scale-90 -mt-0.5">
                                        {renderPlayerTitle(u.equipped.titles)}
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
                {lobby.invitees.filter(name => !lobby.participants.includes(name)).map(name => (
                    <div key={name} className="invite-row text-xs sm:text-sm font-medium text-slate-400 py-2.5 px-4 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center gap-2 w-full">
                        <span className="w-2 h-2 rounded-full bg-amber-500/60 animate-pulse"></span>
                        <span>{name} (در انتظار پاسخ...)</span>
                    </div>
                ))}
            </div>

            {isHost && (
                <div className="space-y-4 sm:space-y-5 text-right mt-8 border-t border-slate-700/60 pt-6">
                    <p className="text-sm sm:text-base font-black text-white text-center">دعوت از دوستان دیگر (انتخاب با کلیک روی کارت)</p>
                    {availableFriends.length ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
                            {availableFriends.map(name => {
                                const isSel = selectedFriends.includes(name);
                                const friendData = findUser(name);
                                return (
                                    <div key={name} onClick={() => setSelectedFriends(current => isSel ? current.filter(item => item !== name) : [...current, name])}
                                        className={`relative cursor-pointer rounded-[1.5rem] p-4 flex flex-col items-center gap-2 border-2 transition-all duration-300 hover:-translate-y-1 ${isSel ? 'border-indigo-500 bg-indigo-500/20 shadow-[0_10px_20px_-5px_rgba(99,102,241,0.4)]' : 'border-slate-700/50 bg-slate-800/60 hover:bg-slate-700/80 hover:border-slate-600'}`}>
                                        <PlayerAvatar user={friendData} className="w-12 h-12 rounded-[inherit] shadow-inner" />
                                        <div className="flex flex-col items-center">
                                            <span className="text-xs sm:text-sm font-bold text-white max-w-full truncate">{name}</span>
                                            {friendData?.equipped?.titles && friendData.equipped.titles !== 'classic' && (
                                                <div className="origin-top transform scale-[0.8] mt-0.5">
                                                    {renderPlayerTitle(friendData.equipped.titles)}
                                                </div>
                                            )}
                                        </div>
                                        <div className={`absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm shadow-md transition-transform ${isSel ? 'bg-indigo-500 scale-100' : 'bg-slate-700 scale-0'}`}>✓</div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : <p className="text-xs sm:text-sm text-slate-500 bg-slate-800/50 p-4 rounded-xl text-center border border-slate-700/50">دوست دیگری برای دعوت یافت نشد.</p>}
                    <button disabled={!selectedFriends.length} onClick={inviteMore} className="game-action w-full py-3.5 sm:py-4 bg-gradient-to-l from-indigo-600 to-purple-600 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white rounded-xl sm:rounded-2xl text-sm sm:text-base font-black shadow-lg shadow-indigo-700/25 mt-4 hover:scale-[1.01] transition-transform disabled:hover:scale-100 disabled:border disabled:border-slate-700">
                        ارسال دعوت‌نامه برای دوست
                    </button>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 border-t border-slate-700/60 mt-4">
                {isHost && (
                    <button disabled={lobby.participants.length < 2} onClick={() => { const updated = { ...lobby, status: 'started' }; saveLobbies(getLobbies().map(item => item.id === lobby.id ? updated : item)); onStart(updated); }} className="game-action flex-1 py-3.5 sm:py-4 bg-gradient-to-l from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 rounded-2xl font-black shadow-lg shadow-emerald-500/25 text-sm sm:text-base disabled:hover:scale-100 transition-all active:scale-95">
                        شروع بازی
                    </button>
                )}
                <button onClick={() => { if (isHost) cancelLobby(lobby.id, currentUser.username); onClose(); }} className="danger-action flex-1 py-3.5 sm:py-4 bg-slate-800 hover:bg-rose-600 border border-slate-700 hover:border-rose-500 text-slate-300 hover:text-white rounded-2xl font-bold text-sm sm:text-base transition-all active:scale-95">
                    {isHost ? 'لغو درخواست و خروج' : 'خروج از لابی'}
                </button>
            </div>
        </div>
    );
};