const InGameChatDrawer = ({ currentUser, matchId, peerName = 'حریف', onOpenProfile }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const lastMessageCountRef = useRef(0);

    useEffect(() => {
        if (!matchId) return;

        const checkMessages = () => {
            const msgs = getMessages().filter(m => m.matchId === matchId && !m.text.startsWith('__'));
            
            if (isOpen) {
                lastMessageCountRef.current = msgs.length;
                setHasUnread(false);
                return;
            }

            if (msgs.length > lastMessageCountRef.current) {
                const latestMsg = msgs[msgs.length - 1];
                if (latestMsg && latestMsg.senderUsername !== currentUser.username) {
                    setHasUnread(true);
                }
            }
            lastMessageCountRef.current = msgs.length;
        };

        checkMessages();
        const timer = setInterval(checkMessages, 1000);
        
        const handleStorage = (e) => {
            if (e.key === MESSAGES_KEY) {
                checkMessages();
            }
        };
        window.addEventListener('storage', handleStorage);
        
        return () => {
            clearInterval(timer);
            window.removeEventListener('storage', handleStorage);
        };
    }, [matchId, isOpen, currentUser.username]);

    // اگر پنل واکنش‌ها باز شد، گفتگو بسته می‌شود (هم‌پوشانی روی موبایل)
    useEffect(() => {
        const onPanel = (e) => { if (e.detail !== 'chat') setIsOpen(false); };
        window.addEventListener('gq:panel-open', onPanel);
        return () => window.removeEventListener('gq:panel-open', onPanel);
    }, []);

    const toggleChat = () => {
        const nextState = !isOpen;
        if (nextState) window.dispatchEvent(new CustomEvent('gq:panel-open', { detail: 'chat' }));
        setIsOpen(nextState);
        
        setHasUnread(false); 
        const msgs = getMessages().filter(m => m.matchId === matchId && !m.text.startsWith('__'));
        lastMessageCountRef.current = msgs.length;
    };

    return ReactDOM.createPortal(
        <div className="gq-floating-chat" dir="rtl">
            <div className="flex justify-between items-center mb-2 relative">
                <button
                    onClick={toggleChat}
                    aria-expanded={isOpen}
                    className="game-action w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600/80 to-purple-600/80 hover:from-indigo-600 hover:to-purple-600 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-indigo-400/30 shadow-lg relative"
                >
                    <IconMessageSquare className="w-4 h-4" />
                    <span>{isOpen ? 'بستن گفتگوی بازی' : 'گفتگوی مسابقه'}</span>
                    
                    {!isOpen && hasUnread && (
                        <span className="absolute top-1 right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                        </span>
                    )}
                </button>
            </div>

            {isOpen && (
                <div className="mt-3 animate-in fade-in zoom-in-95 duration-200">
                    <ChatPanel
                        key={`chat-${matchId}`}
                        currentUser={currentUser}
                        peerName={peerName}
                        matchId={matchId}
                        onOpenProfile={onOpenProfile}
                        isCompact={true}
                    />
                </div>
            )}
        </div>, document.body
    );
};
