const ChatPanel = ({ currentUser, peerName, matchId = null, onOpenProfile, isCompact = false }) => {
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [error, setError] = useState('');
    const [pendingDeleteMsg, setPendingDeleteMsg] = useState(null);
    const endRef = useRef(null);

    const refresh = useCallback(() => {
        const list = matchId
            ? matchMessages(matchId, currentUser.username)
            : (peerName ? conversationMessages(currentUser.username, peerName, currentUser.username) : []);
        setMessages(list);
    }, [matchId, currentUser.username, peerName]);

    useEffect(() => {
        refresh();
        const handleStorage = event => { if (event.key === MESSAGES_KEY) refresh(); };
        window.addEventListener('storage', handleStorage);
        const timer = setInterval(refresh, 1500);
        return () => { window.removeEventListener('storage', handleStorage); clearInterval(timer); };
    }, [refresh]);

    useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [messages.length]);

    const submit = event => {
        event.preventDefault();
        if (!draft.trim()) return;
        try {
            const sent = sendMessage(currentUser.username, draft, peerName, matchId);
            if (!sent) throw new Error('ارسال پیام ممکن نیست.');
            setDraft('');
            setError('');
            refresh();

            if (peerName === 'حریف هوش مصنوعی' || (!matchId && peerName?.includes('(بات)'))) {
                setTimeout(() => {
                    const botReplies = [
                        'حرکت هوشمندانه‌ای بود، ولی برای بردن باید بیشتر تلاش کنی! 😉',
                        'من یک هوش مصنوعی‌ام، تسلیم نمیشم! 🤖',
                        'تاس و حرکت بعدی همه‌‌چیز رو معلوم می‌‌کنه...',
                        'مراقب مهره‌هات باش، کمین کردم! 🎯',
                        'بازی عالی‌ای داری، لذت می‌برم! 🔥'
                    ];
                    const randomReply = botReplies[Math.floor(Math.random() * botReplies.length)];
                    sendMessage('حریف هوش مصنوعی', randomReply, currentUser.username, matchId);
                    refresh();
                }, 1200);
            }
        } catch (failure) {
            setError(failure.message || 'خطا در ارسال پیام.');
        }
    };

    const handleConfirmDelete = (forEveryone) => {
        if (!pendingDeleteMsg) return;
        deleteMessage(pendingDeleteMsg.id, forEveryone, currentUser.username);
        setPendingDeleteMsg(null);
        refresh();
    };

    // فیلتر کردن پیام‌های سیستمی (شروع با __)
    const displayMessages = messages.filter(m => !m.text.startsWith('__'));

    return (
        <section className={`glass-panel rounded-3xl ${isCompact ? 'p-3' : 'p-4 sm:p-5'} flex flex-col gap-3 w-full relative`}>
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                <div className="flex items-center gap-2">
                    <IconMessageSquare className="w-5 h-5 text-indigo-300" />
                    <h3 className="font-black text-white text-sm sm:text-base">
                        {matchId ? 'گفتگوی زنده مسابقه' : `گفتگو با ${peerName}`}
                    </h3>
                </div>
                {!matchId && peerName && findUser(peerName) && (
                    <button onClick={() => onOpenProfile(peerName)} className="text-indigo-300 hover:text-white text-xs font-bold">
                        مشاهده پروفایل
                    </button>
                )}
            </div>

            <div role="log" aria-live="polite" className={`${isCompact ? 'h-48' : 'h-64'} overflow-y-auto custom-scrollbar space-y-2.5 p-2 bg-slate-950/40 rounded-2xl`}>
                {displayMessages.length === 0 && (
                    <p className="text-center text-slate-500 text-xs pt-16">
                        هنوز پیامی ارسال نشده است. اولین پیام را ارسال کنید! 💬
                    </p>
                )}
                {displayMessages.map(message => {
                    const isMe = message.senderUsername.toLowerCase() === currentUser.username.toLowerCase();
                    return (
                        <div key={message.id} className={`group flex ${isMe ? 'justify-start' : 'justify-end'} items-start gap-1.5`}>
                            {isMe && (
                                <button
                                    onClick={() => setPendingDeleteMsg(message)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-500 hover:text-rose-400 mt-1"
                                    title="حذف پیام"
                                >
                                    <IconTrash className="w-3.5 h-3.5" />
                                </button>
                            )}

                            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words relative ${
                                isMe ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/20' : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700/60'
                            }`}>
                                {!isMe && (
                                    <span className="block font-bold text-amber-300 text-xs mb-1">
                                        {message.senderUsername}
                                    </span>
                                )}
                                <span className="leading-relaxed">{message.text}</span>
                                <time className="block text-[10px] opacity-60 mt-1 text-left" dir="ltr" dateTime={message.createdAt}>
                                    {new Date(message.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                                </time>
                            </div>

                            {!isMe && (
                                <button
                                    onClick={() => setPendingDeleteMsg(message)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-500 hover:text-rose-400 mt-1"
                                    title="حذف پیام برای من"
                                >
                                    <IconTrash className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    );
                })}
                <div ref={endRef} />
            </div>

            <form onSubmit={submit} className="flex gap-2">
                <input
                    value={draft}
                    maxLength={2000}
                    onChange={event => setDraft(event.target.value)}
                    placeholder="پیام بنویسید… 😊"
                    className="flex-1 min-w-0 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:border-indigo-400 transition-all"
                />
                <button
                    type="submit"
                    disabled={!draft.trim()}
                    className="game-action px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 disabled:opacity-50 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md"
                >
                    ارسال
                </button>
            </form>

            {error && <p role="alert" className="text-rose-300 text-xs">{error}</p>}

            {pendingDeleteMsg && (
                <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md rounded-3xl p-4 flex flex-col items-center justify-center text-center animate-in fade-in">
                    <div className="p-3 bg-rose-500/20 text-rose-300 rounded-2xl mb-3">
                        <IconTrash className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-white text-sm mb-1">حذف پیام</h4>

                    {pendingDeleteMsg.senderUsername.toLowerCase() === currentUser.username.toLowerCase() ? (
                        <>
                            <p className="text-xs text-slate-300 mb-4 leading-5">
                                آیا می‌خواهید این پیام برای طرف مقابل هم پاک شود یا فقط برای خودتان؟
                            </p>
                            <div className="flex flex-col gap-2 w-full max-w-xs">
                                <button
                                    onClick={() => handleConfirmDelete(true)}
                                    className="py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                                >
                                    حذف برای هر دو نفر
                                </button>
                                <button
                                    onClick={() => handleConfirmDelete(false)}
                                    className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all"
                                >
                                    حذف فقط برای من
                                </button>
                                <button
                                    onClick={() => setPendingDeleteMsg(null)}
                                    className="py-1 text-slate-400 hover:text-white text-xs mt-1"
                                >
                                    انصراف
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-xs text-slate-300 mb-4 leading-5">
                                این پیام فرستاده‌شده توسط حریف است. مایلید فقط از دید شما حذف شود؟
                            </p>
                            <div className="flex gap-2 w-full max-w-xs">
                                <button
                                    onClick={() => handleConfirmDelete(false)}
                                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md"
                                >
                                    بله، حذف کن
                                </button>
                                <button
                                    onClick={() => setPendingDeleteMsg(null)}
                                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold"
                                >
                                    انصراف
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </section>
    );
};