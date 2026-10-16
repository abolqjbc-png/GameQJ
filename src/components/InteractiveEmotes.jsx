const THROWABLE_ITEMS = [
    { id: 'egg', emoji: '🥚', splash: '🍳', name: 'تخم‌مرغ', cost: 2 },
    { id: 'tomato', emoji: '🍅', splash: '💥', name: 'گوجه', cost: 2 },
    { id: 'bomb', emoji: '💣', splash: '🔥', name: 'بمب', cost: 5 },
    { id: 'rose', emoji: '🌹', splash: '✨', name: 'گل', cost: 3 }
];

const InteractiveEmotes = ({ currentUser, matchId, peerName, onUserUpdated }) => {
    const [cooldown, setCooldown] = useState(0);
    const [activeAnimations, setActiveAnimations] = useState([]);
    const processedThrows = useRef(new Set());

    // مدیریت زمان جلوگیری از اسپم
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => setCooldown(c => c - 1), 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    // شنود پیام‌های پرتاب از سمت شبکه
    useEffect(() => {
        if (!matchId) return;
        const checkThrows = () => {
            const msgs = getMessages().filter(m => m.matchId === matchId && m.text.startsWith('__THROW__'));
            msgs.forEach(msg => {
                if (!processedThrows.current.has(msg.id)) {
                    processedThrows.current.add(msg.id);
                    const itemId = msg.text.replace('__THROW__', '');
                    const isSender = msg.senderUsername === currentUser.username;
                    
                    triggerAnimation(itemId, isSender);
                }
            });
        };
        
        checkThrows();
        window.addEventListener('storage', checkThrows);
        const poll = setInterval(checkThrows, 500);
        return () => {
            window.removeEventListener('storage', checkThrows);
            clearInterval(poll);
        };
    }, [matchId, currentUser.username]);

    const triggerAnimation = (itemId, isSender) => {
        const item = THROWABLE_ITEMS.find(i => i.id === itemId);
        if (!item) return;

        const animId = Date.now() + Math.random();
        setActiveAnimations(prev => [...prev, { id: animId, item, isSender }]);

        // پخش صدای متناسب
        if (currentUser.settings?.sound) {
            playSound(item.id === 'bomb' ? 'capture' : 'move', true);
        }

        // حذف انیمیشن از DOM بعد از اتمام
        setTimeout(() => {
            setActiveAnimations(prev => prev.filter(a => a.id !== animId));
        }, 1500);
    };

    const handleThrow = (item) => {
        if (cooldown > 0) {
            showToast({ id: 'spam', type: 'warning', title: 'محدودیت پرتاب', text: `لطفاً ${cooldown} ثانیه صبر کنید.`, duration: 2000 });
            return;
        }
        
        // بررسی و کسر کیوجی
        const freshUser = findUser(currentUser.username);
        if (!freshUser || freshUser.coins < item.cost) {
            showToast({ id: 'no-coin', type: 'error', title: 'موجودی ناکافی', text: `برای پرتاب ${item.name} به ${item.cost} کیوجی نیاز دارید.` });
            return;
        }

        deductCoins(currentUser.username, item.cost);
        if (onUserUpdated) onUserUpdated(findUser(currentUser.username));
        setCooldown(5); // ۵ ثانیه محدودیت اسپم

        // ارسال پیام شبکه
        sendMessage(currentUser.username, `__THROW__${item.id}`, peerName, matchId);
        window.dispatchEvent(new Event('storage'));
        
        // اجرای انیمیشن سمت خودمان
        triggerAnimation(item.id, true);
    };

    // عدم نمایش پنل پرتاب در صورت بازی با ربات
    if (!peerName || peerName === 'حریف هوش مصنوعی' || peerName.includes('هوش مصنوعی')) return null;

    return (
        <Fragment>
            {/* کنترل پنل پرتاب اشیاء */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3 glass-panel p-2.5 rounded-2xl border border-slate-700/60 shadow-lg relative z-[50]">
                <span className="text-[10px] text-slate-400 font-bold ml-1">پرتاب به حریف:</span>
                {THROWABLE_ITEMS.map(item => (
                    <button
                        key={item.id}
                        onClick={() => handleThrow(item)}
                        disabled={cooldown > 0}
                        className={`relative px-3 py-1.5 rounded-xl text-lg sm:text-xl transition-all ${cooldown > 0 ? 'bg-slate-800 opacity-50 grayscale cursor-not-allowed' : 'bg-slate-800/80 hover:bg-slate-700 hover:scale-110 active:scale-95 border border-slate-700/50'}`}
                        title={`${item.name} (${item.cost} کیوجی)`}
                    >
                        {item.emoji}
                        <span className="absolute -bottom-1.5 -right-1.5 text-[9px] font-black bg-amber-500 text-slate-900 px-1.5 py-0.5 rounded-md border-2 border-slate-800 shadow-sm">
                            {item.cost}
                        </span>
                    </button>
                ))}
                {cooldown > 0 && <span className="text-[10px] text-rose-400 font-mono font-black ml-2 animate-pulse">{cooldown}s</span>}
            </div>

            {/* رندر انیمیشن‌های فعال در لایه رویی صفحه */}
            {activeAnimations.map(({ id, item, isSender }) => (
                <Fragment key={id}>
                    <div 
                        className="gq-throw-item"
                        style={{ 
                            bottom: isSender ? '15vh' : 'auto',
                            top: isSender ? 'auto' : '15vh',
                            animation: `${isSender ? 'throw-up' : 'throw-down'} 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards` 
                        }}
                    >
                        {item.emoji}
                    </div>
                    <div 
                        className="gq-splash"
                        style={{
                            top: isSender ? '15vh' : 'auto',
                            bottom: isSender ? 'auto' : '15vh',
                            animationDelay: '0.85s'
                        }}
                    >
                        {item.splash}
                    </div>
                </Fragment>
            ))}
        </Fragment>
    );
};