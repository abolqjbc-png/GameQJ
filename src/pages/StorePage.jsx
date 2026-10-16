// ============================================================================
// StorePage.jsx — تالار بزرگ گنجینه‌ها و فروشگاه رسمی GameQJ
// بازطراحی کامل: مدرن، گرافیکی، دسته‌بندی پیشرفته، ویترین تعاملی و روان
// ============================================================================

const STORE_CATEGORIES = [
    {
        id: 'game_assets',
        label: 'تجهیزات و مهره‌های بازی',
        icon: '🎮',
        tabs: [
            { id: 'chess', label: 'مهره‌های شطرنج', icon: '♞', desc: 'استایل بصری مهره‌های صفحه ۶۴ خانه‌ای' },
            { id: 'ludo', label: 'مهره‌های منچ', icon: '🎲', desc: 'طراحی ۴ رنگه مهره‌های رویال منچ' },
            { id: 'dice', label: 'تاس‌ها', icon: '🧊', desc: 'تاس‌های ۳ بعدی با متریال و بافت‌های خاص' }
        ]
    },
    {
        id: 'player_identity',
        label: 'هویت و پروفایل بازیکن',
        icon: '👑',
        tabs: [
            { id: 'avatars', label: 'آواتارهای ویژه', icon: '🖼️', desc: 'نمادها و آیکون‌های وکتور شخصی‌سازی‌شده' },
            { id: 'frames', label: 'قاب‌های پروفایل', icon: '✨', desc: 'هاله‌ها و حاشیه‌های نئونی و سلطنتی آواتار' },
            { id: 'titles', label: 'القاب قهرمانی', icon: '👑', desc: 'نشان‌های متنی افتخار در زیر نام کاربری' }
        ]
    }
];

const STORE_TABS = [
    { id: 'chess', label: 'مهره‌های شطرنج', icon: '♞', cat: 'game_assets' },
    { id: 'ludo', label: 'مهره‌های منچ', icon: '🎲', cat: 'game_assets' },
    { id: 'dice', label: 'تاس‌ها', icon: '🧊', cat: 'game_assets' },
    { id: 'avatars', label: 'آواتارها', icon: '🖼️', cat: 'player_identity' },
    { id: 'frames', label: 'قاب پروفایل', icon: '✨', cat: 'player_identity' },
    { id: 'titles', label: 'القاب', icon: '👑', cat: 'player_identity' }
];

const LUDO_PREVIEW_COLORS = ['#ef4444', '#10b981', '#f59e0b', '#3b82f6'];

// پیش‌نمایش صفحه مهره شطرنج
const ChessStylePreview = ({ styleId }) => (
    <div className="grid grid-cols-6 rounded-2xl overflow-hidden border border-white/10 bg-slate-950/80 shadow-inner p-1">
        {['w', 'b'].map((color, row) => ['k', 'q', 'r', 'b', 'n', 'p'].map((type, i) => (
            <div key={color + type} className={`aspect-square flex items-center justify-center text-lg sm:text-xl rounded-lg transition-transform hover:scale-125 ${(row + i) % 2 === 0 ? 'bg-slate-700/60' : 'bg-slate-800/80'}`}>
                {renderChessPiece(color + type, styleId)}
            </div>
        )))}
    </div>
);

// پیش‌نمایش مهره‌های منچ با قابلیت هاور و جهش
const LudoStylePreview = ({ styleId }) => (
    <div className="flex items-center justify-around rounded-2xl bg-gradient-to-br from-slate-950/90 via-slate-900/90 to-slate-950/90 border border-white/10 py-5 px-3 shadow-inner">
        {LUDO_PREVIEW_COLORS.map((hex, i) => (
            <div key={hex} className="w-10 h-10 sm:w-11 sm:h-11 store-float transform hover:scale-125 transition-transform cursor-pointer" style={{ animationDelay: `${i * 160}ms` }}>
                {renderLudoToken(hex, styleId, false)}
            </div>
        ))}
    </div>
);

// پیش‌نمایش تاس تعاملی با تست پرتاب
const DiceStylePreview = ({ styleId }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [val1, setVal1] = useState(5);
    const [val2, setVal2] = useState(6);
    const [rot1, setRot1] = useState(-10);
    const [rot2, setRot2] = useState(15);

    const handleSpin = (e) => {
        e?.stopPropagation();
        if (isSpinning) return;
        setIsSpinning(true);
        try { playSound('dice', true); } catch (e) {}

        const targetRot1 = rot1 + 360 + Math.random() * 360;
        const targetRot2 = rot2 - 360 - Math.random() * 360;
        setRot1(targetRot1);
        setRot2(targetRot2);

        let ticks = 0;
        const interval = setInterval(() => {
            setVal1(Math.floor(Math.random() * 6) + 1);
            setVal2(Math.floor(Math.random() * 6) + 1);
            ticks++;
            if (ticks > 10) {
                clearInterval(interval);
                setVal1(Math.floor(Math.random() * 6) + 1);
                setVal2(6);
                setIsSpinning(false);
                try { playSound('tick', true); } catch (e) {}
            }
        }, 60);
    };

    return (
        <div
            onClick={handleSpin}
            className="group relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-slate-950/90 via-slate-900/90 to-slate-950/90 border border-white/10 py-5 px-3 gap-5 cursor-pointer overflow-hidden transition-all hover:border-amber-400/50 hover:shadow-[0_0_25px_rgba(251,191,36,0.2)]"
        >
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-300" />
            <span className="absolute top-1.5 right-2 text-[9px] font-bold text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                لمس برای چرخش 🎲
            </span>

            <div className="w-12 h-12 store-float z-10" style={{ animationDelay: '0ms' }}>
                <div
                    className="w-full h-full"
                    style={{
                        transform: `rotate(${rot1}deg) scale(${isSpinning ? 1.2 : 1})`,
                        transition: isSpinning ? 'transform 0.75s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'transform 0.3s ease-out',
                        filter: isSpinning ? 'drop-shadow(0 12px 10px rgba(0,0,0,0.6))' : 'drop-shadow(0 4px 5px rgba(0,0,0,0.4))'
                    }}
                >
                    {renderCustomDice(val1, styleId)}
                </div>
            </div>
            <div className="w-13 h-13 store-float z-10" style={{ animationDelay: '300ms' }}>
                <div
                    className="w-full h-full"
                    style={{
                        transform: `rotate(${rot2}deg) scale(${isSpinning ? 1.25 : 1})`,
                        transition: isSpinning ? 'transform 0.75s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'transform 0.3s ease-out',
                        filter: isSpinning ? 'drop-shadow(0 14px 12px rgba(0,0,0,0.7))' : 'drop-shadow(0 5px 6px rgba(0,0,0,0.4))'
                    }}
                >
                    {renderCustomDice(val2, styleId)}
                </div>
            </div>
        </div>
    );
};

// پیش‌نمایش زنده قاب روی آواتار با نام کاربری خود بازیکن
const FramePreview = ({ styleId, username = 'نام کاربری' }) => (
    <div className="flex flex-col items-center justify-center py-4 rounded-2xl bg-slate-950/70 border border-white/10">
        <div className="w-20 h-20 relative flex items-center justify-center">
            <PlayerAvatar user={{ equipped: { frames: styleId }, avatar: '' }} className="w-full h-full rounded-2xl" />
        </div>
        <span className="text-[11px] font-bold text-slate-400 mt-2">{username}</span>
    </div>
);

// پیش‌نمایش لقب با آیکون و درخشش
const TitlePreview = ({ styleId, username = 'نام کاربری' }) => (
    <div className="flex flex-col items-center justify-center py-5 rounded-2xl bg-slate-950/70 border border-white/10">
        <span className="text-white font-black text-base mb-1">{username}</span>
        <div className="transform scale-110 origin-center mt-1">
            {renderPlayerTitle(styleId)}
        </div>
    </div>
);

// پیش‌نمایش آواتارهای پریمیوم
const AvatarPreview = ({ item, size = 'w-24 h-24 sm:w-28 sm:h-28' }) => {
    const rarity = STORE_RARITY[item.rarity];
    return (
        <div className={`store-shine relative mx-auto ${size} rounded-3xl overflow-hidden border-2 ${rarity.ring} shadow-xl ${rarity.glow} store-float`}>
            <img src={item.src} alt={item.name} className="w-full h-full object-cover" />
        </div>
    );
};

// ============================================================================
// کامپوننت اصلی صفحه فروشگاه
// ============================================================================
const StorePage = ({ currentUser, onUserUpdated }) => {
    const user = currentUser;
    const [tab, setTab] = useState('chess');
    const [rarityFilter, setRarityFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'owned', 'unowned'
    const [searchQuery, setSearchQuery] = useState('');
    const [spotlightItem, setSpotlightItem] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const [boughtId, setBoughtId] = useState(null);
    const [shakeId, setShakeId] = useState(null);

    // محاسبه تخفیف آلیانز
    let storePct = 0;
    try {
        const d = (typeof getUserDiscounts === 'function') ? (getUserDiscounts(user?.username) || {}) : {};
        storePct = Number(d.storeDiscountPercent || d.store || d.discountPercent || 0) || 0;
    } catch (e) { storePct = 0; }

    const getFinalPrice = (price) => {
        const p = Number(price) || 0;
        if (p <= 0 || storePct <= 0) return p;
        return Math.max(0, Math.round(p * (1 - storePct / 100)));
    };

    const statusOf = (kind, item) => {
        const owned = kind === 'avatars' ? isAvatarOwned(user, item) : isStyleOwned(user, kind, item);
        const equipped = kind === 'avatars' ? user.avatar === item.src : getEquippedStyle(user, kind) === item.id;
        return { owned, equipped };
    };

    const handleUse = (kind, item) => {
        const updated = kind === 'avatars' ? equipAvatar(user.username, item) : equipStyle(user.username, kind, item.id);
        if (updated) {
            onUserUpdated(updated);
            try { playSound('button', user.settings?.sound); } catch (e) {}
            showToast({ id: 'store-use', type: 'success', title: 'فعال شد ✨', text: `«${item.name}» تجهیز و برگزیده شد.`, duration: 2500 });
        }
    };

    const handleBuy = () => {
        if (!confirm) return;
        const { kind, item } = confirm;
        const result = kind === 'avatars' ? buyAvatar(user.username, item) : buyStyle(user.username, kind, item);
        setConfirm(null);
        if (!result.ok) {
            setShakeId(item.id);
            setTimeout(() => setShakeId(null), 650);
            showToast({ id: 'store-err', type: 'error', title: 'خرید انجام نشد', text: result.msg, duration: 4000 });
            return;
        }
        playSound('coin', user.settings?.sound);
        onUserUpdated(result.user);
        setBoughtId(item.id);
        setTimeout(() => setBoughtId(null), 1500);
        showToast({ id: 'store-ok', type: 'success', title: 'خرید موفقیت‌آمیز! 🎉', text: `«${item.name}» به مجموعه‌ی شما اضافه شد و اکنون فعال است.`, duration: 3500 });
    };

    const renderPreview = (kind, item) => {
        if (kind === 'chess') return <ChessStylePreview styleId={item.id} />;
        if (kind === 'ludo') return <LudoStylePreview styleId={item.id} />;
        if (kind === 'dice') return <DiceStylePreview styleId={item.id} />;
        if (kind === 'frames') return <FramePreview styleId={item.id} username={user.username} />;
        if (kind === 'titles') return <TitlePreview styleId={item.id} username={user.username} />;
        return <AvatarPreview item={item} />;
    };

    const rawItems = tab === 'avatars' ? STORE_AVATARS : STORE_STYLES[tab];

    // آمار اقلام این تب
    const ownedCountInTab = rawItems.filter(item => {
        const { owned } = statusOf(tab, item);
        return owned;
    }).length;

    // فیلتر کردن اقلام
    const filteredItems = useMemo(() => {
        return rawItems.filter(item => {
            if (rarityFilter !== 'all' && item.rarity !== rarityFilter) return false;
            const { owned } = statusOf(tab, item);
            if (statusFilter === 'owned' && !owned) return false;
            if (statusFilter === 'unowned' && owned) return false;
            if (searchQuery.trim() && !item.name.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
            return true;
        });
    }, [rawItems, rarityFilter, statusFilter, searchQuery, user]);

    // آیتم فعال در ویترین بالا
    const activeShowcase = spotlightItem || filteredItems[0] || rawItems[0];
    const cfmFinalPrice = confirm ? getFinalPrice(confirm.item.price) : 0;
    const cfmAfter = confirm ? (user.coins || 0) - cfmFinalPrice : 0;

    return (
        <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 sm:gap-8 pb-12 animate-in fade-in select-none text-slate-100" dir="rtl">
            <style>{`
                @keyframes storeHeroGlow {
                    0%, 100% { opacity: 0.35; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.08); }
                }
                @keyframes storeCardFloat {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-6px); }
                }
                @keyframes storeAuraPulse {
                    0%, 100% { box-shadow: 0 0 15px rgba(251,191,36,0.3); }
                    50% { box-shadow: 0 0 32px rgba(251,191,36,0.65); }
                }
                .store-hero-glow { animation: storeHeroGlow 5s ease-in-out infinite; }
                .store-aura-legendary { animation: storeAuraPulse 2.8s ease-in-out infinite; }
            `}</style>

            {/* بنر بزرگ و مجلل هدر فروشگاه */}
            <div className="relative overflow-hidden rounded-[2.5rem] p-6 sm:p-8 border border-white/10 bg-slate-900/80 backdrop-blur-2xl shadow-2xl shadow-purple-950/40">
                <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-br from-purple-600/25 to-pink-600/10 rounded-full blur-[90px] store-hero-glow pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-gradient-to-tr from-amber-500/20 to-indigo-600/15 rounded-full blur-[90px] store-hero-glow pointer-events-none" style={{ animationDelay: '2s' }} />

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    {/* عنوان و توضیحات */}
                    <div className="flex items-center gap-4 sm:gap-5">
                        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-tr from-indigo-500/30 via-purple-500/20 to-pink-500/30 border border-indigo-400/30 shadow-xl shadow-indigo-500/20 store-float">
                            <span className="text-3xl sm:text-4xl">🛍️</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <span className="px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[11px] font-black tracking-wider">
                                    ★ بازارچه سلطنتی
                                </span>
                                {storePct > 0 && (
                                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-black animate-pulse flex items-center gap-1">
                                        <span>🛡️ تخفیف آلیانز:</span>
                                        <b>{storePct}٪</b>
                                    </span>
                                )}
                            </div>
                            <h1 className="text-2xl sm:text-4xl font-black bg-gradient-to-l from-white via-indigo-100 to-amber-200 bg-clip-text text-transparent">
                                فروشگاه اقلام و استایل‌ها
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                                استایل مهره‌های شطرنج و منچ، تاس‌های سه‌بعدی، آواتارها و القاب ویژه را با سکه‌های کیوجی خریداری و فعال کنید.
                            </p>
                        </div>
                    </div>

                    {/* باکس موجودی کیوجی با انیمیشن درخشش */}
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-orange-500/20 border-2 border-amber-400/50 text-amber-300 font-black text-xl shadow-xl shadow-amber-500/15">
                            <IconCoin className="w-7 h-7 text-amber-400 animate-spin-slow" />
                            <div className="flex flex-col text-right">
                                <span className="text-[10px] text-amber-400/80 font-bold -mb-1">موجودی کیوجی شما</span>
                                <span className="font-mono text-2xl font-black">{(user.coins || 0).toLocaleString('fa-IR')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* دسته‌بندی پیشرفته (Super Tabs با شمارنده مالکیت) */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                    <span className="text-xs font-black text-slate-400 flex items-center gap-1.5">
                        <span>📂</span>
                        <span>دسته‌بندی‌های فروشگاه</span>
                    </span>
                    <span className="text-xs font-bold text-amber-300/90 bg-slate-900/80 px-3 py-1 rounded-xl border border-white/10">
                        مالکیت این بخش: <b>{ownedCountInTab}</b> از <b>{rawItems.length}</b>
                    </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    {STORE_TABS.map(t => {
                        const isSelected = tab === t.id;
                        const itemsOfTab = t.id === 'avatars' ? STORE_AVATARS : STORE_STYLES[t.id];
                        const ownedOfTab = itemsOfTab.filter(item => statusOf(t.id, item).owned).length;

                        return (
                            <button
                                key={t.id}
                                onClick={() => {
                                    setTab(t.id);
                                    setSpotlightItem(null);
                                    try { playSound('button', user.settings?.sound); } catch (e) {}
                                }}
                                className={`relative p-3.5 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-all duration-300 active:scale-95 ${
                                    isSelected
                                        ? 'bg-gradient-to-b from-indigo-600/35 to-purple-700/25 border-indigo-400 text-white shadow-lg shadow-indigo-600/30 -translate-y-1'
                                        : 'bg-slate-900/60 border-white/[0.08] text-slate-400 hover:text-white hover:border-white/20 hover:bg-slate-800/60'
                                }`}
                            >
                                <span className="text-2xl leading-none">{t.icon}</span>
                                <span className="text-xs font-black truncate max-w-full">{t.label}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    isSelected
                                        ? 'bg-indigo-400/20 text-indigo-200 border-indigo-400/40'
                                        : 'bg-slate-800 text-slate-500 border-slate-700'
                                }`}>
                                    {ownedOfTab} / {itemsOfTab.length}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ویترین زنده و کانون توجه آیتم انتخابی (Spotlight Room) */}
            {activeShowcase && (
                <div className="relative rounded-[2.2rem] p-5 sm:p-7 border border-white/10 bg-slate-900/70 backdrop-blur-xl shadow-xl overflow-hidden">
                    <div className="absolute top-0 right-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
                        {/* پیش‌نمایش بزرگ و زنده */}
                        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-3">
                            <span className="text-[11px] font-black text-indigo-300 mb-3 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                                <span>ویترین تست و بررسی زنده:</span>
                            </span>
                            <div className="w-full max-w-md">
                                {renderPreview(tab, activeShowcase)}
                            </div>
                        </div>

                        {/* اطلاعات، وضعیت و دکمه خرید در ویترین */}
                        <div className="w-full lg:w-1/2 flex flex-col gap-3.5 border-t lg:border-t-0 lg:border-r border-white/10 pt-4 lg:pt-0 lg:pr-6">
                            <div className="flex items-center justify-between">
                                <span className={`px-3 py-1 rounded-full text-xs font-black border ${STORE_RARITY[activeShowcase.rarity].badge}`}>
                                    {STORE_RARITY[activeShowcase.rarity].label}
                                </span>
                                <span className="text-xs text-slate-400">کد آیتم: #{activeShowcase.id}</span>
                            </div>

                            <div>
                                <h3 className="text-2xl font-black text-white">{activeShowcase.name}</h3>
                                {activeShowcase.desc && (
                                    <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">{activeShowcase.desc}</p>
                                )}
                            </div>

                            {/* قیمت و وضعیت */}
                            {(() => {
                                const { owned, equipped } = statusOf(tab, activeShowcase);
                                const finalPrice = getFinalPrice(activeShowcase.price);
                                return (
                                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            {owned ? (
                                                <span className="text-xs font-black text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                                                    ✓ در مالکیت شما
                                                </span>
                                            ) : (
                                                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-400/30 px-4 py-1.5 rounded-xl font-black text-amber-300 text-base">
                                                    <span>قیمت: {finalPrice.toLocaleString('fa-IR')}</span>
                                                    {storePct > 0 && finalPrice !== activeShowcase.price && (
                                                        <span className="text-xs text-slate-500 line-through">
                                                            {activeShowcase.price.toLocaleString('fa-IR')}
                                                        </span>
                                                    )}
                                                    <IconCoin className="w-4 h-4 text-amber-400" />
                                                    <span className="text-[10px] text-amber-400/80">کیوجی</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 sm:flex-initial">
                                            {equipped ? (
                                                <div className="px-6 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-black text-sm text-center shadow-lg shadow-emerald-500/10">
                                                    ✓ فعال در بازی
                                                </div>
                                            ) : owned ? (
                                                <button
                                                    onClick={() => handleUse(tab, activeShowcase)}
                                                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-sm shadow-lg active:scale-95 transition-all"
                                                >
                                                    استفاده و فعال‌سازی
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setConfirm({ kind: tab, item: activeShowcase })}
                                                    className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <span>خرید این آیتم</span>
                                                    <IconCoin className="w-4 h-4 text-slate-950" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* نوار ابزار: فیلتر نادر بودن، فیلتر مالکیت و جستجو */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-950/70 border border-white/10 shadow-inner">
                {/* فیلتر سطح نادر بودن */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
                    {[
                        { id: 'all', label: 'همه سطوح' },
                        { id: 'common', label: 'پایه' },
                        { id: 'rare', label: 'نادر' },
                        { id: 'epic', label: 'حماسی' },
                        { id: 'legendary', label: 'افسانه‌ای' }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setRarityFilter(f.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                rarityFilter === f.id
                                    ? 'bg-white/15 text-white font-black shadow-sm ring-1 ring-white/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* وضعیت مالکیت و جستجو */}
                <div className="flex items-center gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-300 outline-none"
                    >
                        <option value="all">همه آیتم‌ها</option>
                        <option value="owned">فقط خریداری‌شده‌ها</option>
                        <option value="unowned">قابل خرید</option>
                    </select>

                    <div className="relative min-w-[140px] sm:min-w-[180px]">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="جستجوی مدل..."
                            className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-400/60"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* گرید کارت‌های آیتم‌ها */}
            {filteredItems.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/15 p-12 text-center space-y-3 bg-slate-950/40">
                    <span className="text-4xl block">🔍</span>
                    <h3 className="text-base font-black text-slate-300">هیچ آیتمی با این فیلترها پیدا نشد</h3>
                    <p className="text-xs text-slate-500">فیلترهای انتخاب‌شده یا عبارت جستجو را تغییر دهید.</p>
                </div>
            ) : (
                <div key={tab} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                    {filteredItems.map((item, index) => {
                        const { owned, equipped } = statusOf(tab, item);
                        const rarity = STORE_RARITY[item.rarity];
                        const finalPrice = getFinalPrice(item.price);
                        const isLegendary = item.rarity === 'legendary';
                        const isEpic = item.rarity === 'epic';

                        return (
                            <div
                                key={item.id}
                                style={{ animationDelay: `${index * 55}ms` }}
                                onClick={() => setSpotlightItem(item)}
                                className={`store-card-in store-shine group relative rounded-[2rem] p-5 sm:p-6 border-2 flex flex-col justify-between transition-all duration-300 cursor-pointer hover:-translate-y-2 ${
                                    isLegendary
                                        ? 'border-amber-400/60 bg-gradient-to-b from-slate-900 via-amber-950/20 to-slate-900 shadow-xl shadow-amber-500/20 store-aura-legendary'
                                        : isEpic
                                        ? 'border-fuchsia-500/50 bg-gradient-to-b from-slate-900 via-purple-950/20 to-slate-900 shadow-xl shadow-fuchsia-500/20'
                                        : 'border-white/10 bg-slate-900/75 hover:border-indigo-400/40 shadow-lg'
                                } ${boughtId === item.id ? 'store-bought' : ''} ${shakeId === item.id ? 'store-shake' : ''}`}
                            >
                                {boughtId === item.id && <span className="store-burst absolute inset-0 rounded-[2rem] pointer-events-none" />}

                                <div>
                                    {/* برچسب رده و آیکون بررسی */}
                                    <div className="flex items-center justify-between mb-3">
                                        <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black ${rarity.badge}`}>
                                            {rarity.label}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-bold group-hover:text-indigo-300 transition-colors">
                                            🔍 بررسی در ویترین
                                        </span>
                                    </div>

                                    {/* پیش‌نمایش گرافیکی آیتم */}
                                    <div className="py-2 transition-transform duration-300 group-hover:scale-105">
                                        {renderPreview(tab, item)}
                                    </div>

                                    {/* نام و توضیح */}
                                    <div className="text-center mt-3">
                                        <h3 className="font-black text-white text-base sm:text-lg group-hover:text-amber-200 transition-colors">
                                            {item.name}
                                        </h3>
                                        {item.desc && (
                                            <p className="text-xs text-slate-400 mt-1 leading-5 min-h-[38px]">
                                                {item.desc}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* دکمه خرید یا فعال‌سازی در پایین کارت */}
                                <div className="mt-5 pt-3 border-t border-white/[0.08]" onClick={(e) => e.stopPropagation()}>
                                    {equipped ? (
                                        <div className="w-full py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-xs text-center shadow-md shadow-emerald-500/10">
                                            ✓ فعال روی حساب شما
                                        </div>
                                    ) : owned ? (
                                        <button
                                            onClick={() => handleUse(tab, item)}
                                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs shadow-lg active:scale-95 transition-all"
                                        >
                                            استفاده و فعال‌سازی
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setConfirm({ kind: tab, item })}
                                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <span>خرید</span>
                                            <span className="flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded-lg text-slate-950">
                                                <span>{finalPrice.toLocaleString('fa-IR')}</span>
                                                {storePct > 0 && finalPrice !== item.price && (
                                                    <span className="text-[9px] opacity-60 line-through">
                                                        {item.price.toLocaleString('fa-IR')}
                                                    </span>
                                                )}
                                                <IconCoin className="w-3.5 h-3.5" />
                                            </span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* پنجره تأیید خرید با پیش‌نمایش و شفافیت قیمت */}
            {confirm && (
                <div
                    className="fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
                    onClick={() => setConfirm(null)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        onClick={(e) => e.stopPropagation()}
                        className="glass-panel w-full max-w-sm rounded-3xl p-6 border-2 border-amber-400/40 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95"
                    >
                        <h3 className="text-center font-black text-lg text-white">تأیید خرید از فروشگاه</h3>
                        <div className="py-2">{renderPreview(confirm.kind, confirm.item)}</div>
                        <div className="text-center">
                            <div className="font-black text-white text-lg">{confirm.item.name}</div>
                            <div className={`text-xs font-bold mt-0.5 ${STORE_RARITY[confirm.item.rarity].text}`}>
                                رده {STORE_RARITY[confirm.item.rarity].label}
                            </div>
                        </div>

                        <div className="bg-slate-950/80 rounded-2xl p-3.5 text-xs space-y-2 border border-white/10">
                            <div className="flex justify-between text-slate-300">
                                <span>موجودی کیوجی شما:</span>
                                <b>{(user.coins || 0).toLocaleString('fa-IR')} کیوجی</b>
                            </div>
                            <div className="flex justify-between text-amber-300 font-bold">
                                <span>مبلغ پرداختی:</span>
                                <b className="flex items-center gap-1.5">
                                    <span>{cfmFinalPrice.toLocaleString('fa-IR')} کیوجی</span>
                                    {storePct > 0 && cfmFinalPrice !== confirm.item.price && (
                                        <span className="text-[10px] text-slate-500 line-through">
                                            {confirm.item.price.toLocaleString('fa-IR')}
                                        </span>
                                    )}
                                </b>
                            </div>
                            <div className={`flex justify-between border-t border-slate-700/60 pt-2 ${cfmAfter < 0 ? 'text-rose-300' : 'text-emerald-300'} font-black`}>
                                <span>{cfmAfter < 0 ? 'کسری موجودی:' : 'موجودی پس از خرید:'}</span>
                                <b>{Math.abs(cfmAfter).toLocaleString('fa-IR')} کیوجی</b>
                            </div>
                        </div>

                        <div className="flex gap-2.5 pt-1">
                            <button
                                onClick={() => setConfirm(null)}
                                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                            >
                                انصراف
                            </button>
                            <button
                                disabled={cfmAfter < 0}
                                onClick={handleBuy}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs disabled:opacity-40 disabled:cursor-not-allowed shadow-lg active:scale-95 transition-all"
                            >
                                خرید و فعال‌سازی
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
