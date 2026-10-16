// ---------- اسکریپت موقت برای ریست کردن خریدهای قبلی کاربران ----------
(function autoResetStore() {
    try {
        if (localStorage.getItem('gameqj_store_reset_v3')) return;
        const usersStr = localStorage.getItem('gameqj_users_v2');
        if (usersStr) {
            let users = JSON.parse(usersStr);
            users = users.map(u => ({
                ...u,
                inventory: [],
                unlockedAvatars: [],
                equipped: { chess: 'classic', ludo: 'classic', dice: 'classic', frames: 'classic', titles: 'classic' }
            }));
            localStorage.setItem('gameqj_users_v2', JSON.stringify(users));
        }
        localStorage.setItem('gameqj_store_reset_v3', '1');
        console.log('تمام خریدهای فروشگاه برای همه بازیکنان ریست شد.');
    } catch(e) {}
})();

// ---------- فروشگاه: کاتالوگ، خرید، استفاده و استایل مهره‌ی هر بازیکن ----------
const STORE_RARITY = {
    common: { label: 'پایه', text: 'text-slate-300', badge: 'bg-slate-600/40 border-slate-500/50 text-slate-200', ring: 'border-slate-700/70', glow: 'shadow-slate-500/10' },
    rare: { label: 'نادر', text: 'text-sky-300', badge: 'bg-sky-500/20 border-sky-400/50 text-sky-200', ring: 'border-sky-500/50', glow: 'shadow-sky-500/25' },
    epic: { label: 'حماسی', text: 'text-fuchsia-300', badge: 'bg-fuchsia-500/20 border-fuchsia-400/50 text-fuchsia-200', ring: 'border-fuchsia-500/50', glow: 'shadow-fuchsia-500/30' },
    legendary: { label: 'افسانه‌ای', text: 'text-amber-300', badge: 'bg-amber-500/20 border-amber-400/50 text-amber-200', ring: 'border-amber-400/60', glow: 'shadow-amber-500/35' }
};

// استایل مهره‌ها فقط «شکل و مدل» را عوض می‌کند؛ رنگ مهره‌ها (سفید/سیاه در شطرنج، رنگ بازیکن در منچ) ثابت می‌ماند.
const CHESS_STYLES = [
    { id: 'classic', name: 'کلاسیک', price: 0, rarity: 'common', desc: 'مهره‌های سنتی و آشنای شطرنج' },
    { id: 'modern', name: 'مدرن هندسی', price: 150, rarity: 'rare', desc: 'خطوط تمیز و شکل‌های هندسی مینیمال' },
    { id: 'minimal', name: 'انتزاعی ذِن', price: 250, rarity: 'rare', desc: 'طراحی کاملاً مفهومی بر اساس مسیر حرکت مهره‌ها' },
    { id: 'pixel', name: 'پیکسلی ۸ بیتی', price: 400, rarity: 'epic', desc: 'مهره‌هایی به سبک بازی‌های قدیمی آرکید' },
    { id: 'medal', name: 'مدال سلطنتی', price: 750, rarity: 'epic', desc: 'قرص‌های مدالی با نشان حکاکی‌شده' },
    { id: 'cosmic', name: 'مدار کیهانی', price: 1200, rarity: 'legendary', desc: 'طراحی فضایی با سیارات، اوربیتال‌ها و حلقه‌های کیهانی' },
    { id: 'runic', name: 'سنگ‌های رونیک', price: 1500, rarity: 'legendary', desc: 'مونولیت‌های باستانی معلق با حکاکی‌های جادویی' }
];
const LUDO_STYLES = [
    { id: 'classic', name: 'کلاسیک', price: 0, rarity: 'common', desc: 'مهره‌ی گرد و ساده‌ی همیشگی' },
    { id: 'pawn', name: 'پیاده‌ی رومیزی', price: 100, rarity: 'common', desc: 'مهره‌ی سنتی بازی‌های رومیزی' },
    { id: 'star', name: 'ستاره', price: 200, rarity: 'rare', desc: 'ستاره‌ای پنج‌پر برای مسیر منچ' },
    { id: 'gem', name: 'جواهر', price: 350, rarity: 'epic', desc: 'مهره‌ای تراش‌خورده و درخشان' },
    { id: 'shuriken', name: 'ستاره نینجا', price: 500, rarity: 'epic', desc: 'شوریکن تیز و خطرناک برای زدن حریفان' },
    { id: 'ufo', name: 'بشقاب‌پرنده', price: 750, rarity: 'legendary', desc: 'سفینه فضایی با کابین شیشه‌ای روشن' },
    { id: 'ghost', name: 'روح کوچولو', price: 900, rarity: 'legendary', desc: 'یک روح بامزه و سرگردان در صفحه' },
    { id: 'crown', name: 'تاج شاهی', price: 1200, rarity: 'legendary', desc: 'مهره‌ای شاهانه برای قهرمانان' },
    { id: 'cat', name: 'پیشی ملوس', price: 1500, rarity: 'legendary', desc: 'یک گربه‌ی دوست‌داشتنی، محبوب‌ترین مهره!' }
];
const DICE_STYLES = [
    { id: 'classic', name: 'سفید کلاسیک', price: 0, rarity: 'common', desc: 'تاس ساده با نقطه‌های مشکی' },
    { id: 'wood', name: 'چوب بلوط', price: 150, rarity: 'rare', desc: 'حکاکی شده روی چوب با حس کلاسیک' },
    { id: 'crystal', name: 'کریستال یخی', price: 450, rarity: 'epic', desc: 'شفاف و سرد با نقطه‌های فیروزه‌ای درخشان' },
    { id: 'neon', name: 'نئون سایبرپانک', price: 600, rarity: 'epic', desc: 'تاس مشکی با نقطه‌های درخشان صورتی و آبی' },
    { id: 'gold', name: 'طلای خالص', price: 950, rarity: 'legendary', desc: 'ریخته‌گری شده از طلای ۲۴ عیار سلطنتی' }
];

const STORE_FRAMES = [
    { id: 'classic', name: 'بدون قاب', price: 0, rarity: 'common', desc: 'آواتار ساده و مینیمال' },
    { id: 'neon_pulse', name: 'مرز نئونی', price: 300, rarity: 'rare', desc: 'حاشیه‌ی بسیار ظریف با گرادیانت متحرک سایبرپانک' },
    { id: 'fire_ring', name: 'اخگر', price: 650, rarity: 'epic', desc: 'تیرگی عمیق با ذرات ریز و درخشان آتشین در پس‌زمینه' },
    { id: 'lightning', name: 'انرژی خلأ', price: 900, rarity: 'epic', desc: 'هاله‌ی تاریک و جذب‌کننده با پالس‌های ملایم بنفش' },
    { id: 'diamond', name: 'طیف منشوری', price: 1200, rarity: 'legendary', desc: 'لبه‌های شیشه‌ای با انعکاس ملایم رنگ‌های هولوگرافیک' },
    { id: 'hacker', name: 'پروتکل', price: 1500, rarity: 'legendary', desc: 'طراحی مینیمال و تکنو با کروشه‌های گوشه‌ای و خط اسکن' },
    { id: 'gold_crown', name: 'امپریال', price: 2500, rarity: 'legendary', desc: 'حاشیه‌ی فوق‌العاده ظریف و اشرافی از طلای مات' }
];

const STORE_TITLES = [
    { id: 'classic', name: 'بدون لقب', price: 0, rarity: 'common', desc: 'فقط نام کاربری شما نمایش داده می‌شود' },
    { id: 'shadow_hunter', name: 'تاکتیسین ارشد', price: 500, rarity: 'epic', desc: 'طراحی شارپ و حرفه‌ای با رنگ آبی فولادی' },
    { id: 'god_of_dice', name: 'شبح', price: 800, rarity: 'epic', desc: 'تایپوگرافی محو و ظریف با رنگ‌های دودی و نقره‌ای' },
    { id: 'ruthless', name: 'معمار', price: 1200, rarity: 'legendary', desc: 'استایلی ساختاریافته و مدرن با رگه‌های طلایی تیره' },
    { id: 'veteran', name: 'کهنه‌کار', price: 1800, rarity: 'legendary', desc: 'طرحی فلزی و مقاوم با سایه‌های عمیق برنزی' },
    { id: 'grandmaster', name: 'استاد بزرگ', price: 2500, rarity: 'legendary', desc: 'درخششی بسیار لوکس، مات و چشم‌نواز از ورق طلا' }
];

const STORE_STYLES = { chess: CHESS_STYLES, ludo: LUDO_STYLES, dice: DICE_STYLES, frames: STORE_FRAMES, titles: STORE_TITLES };

// ---------- آواتارهای فروشگاه ----------
const makeStoreAvatar = (id, name, price, rarity, [c1, c2, glow], emblem) => ({
    id, name, price, rarity, isPremium: true,
    src: svgAvatarUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient><radialGradient id="g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${glow}" stop-opacity=".75"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient></defs><rect width="64" height="64" fill="url(#b)"/><circle cx="32" cy="32" r="30" fill="url(#g)"/><circle cx="8" cy="10" r="1.2" fill="#fff" opacity=".8"/><circle cx="55" cy="14" r="1.6" fill="#fff" opacity=".7"/><circle cx="52" cy="52" r="1.1" fill="#fff" opacity=".8"/><circle cx="11" cy="50" r="1.5" fill="#fff" opacity=".6"/>${emblem}<rect x="1.5" y="1.5" width="61" height="61" rx="9" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="1.5"/></svg>`)
});
const STORE_AVATARS = [
    makeStoreAvatar('store_moon', 'ماه نقره‌ای', 300, 'rare', ['#1e3a8a', '#0ea5e9', '#7dd3fc'],
        '<path d="M40 10A23 23 0 1 0 54 42 18 18 0 0 1 40 10z" fill="#e0f2fe" stroke="#fff" stroke-width="1.2"/><path d="M47 18l1.6 3.6 3.9.4-2.9 2.6.8 3.9L47 26.4l-3.4 2.1.8-3.9-2.9-2.6 3.9-.4z" fill="#fef9c3"/>'),
    makeStoreAvatar('store_planet', 'سیاره‌ی حلقه‌دار', 350, 'rare', ['#4c1d95', '#db2777', '#f9a8d4'],
        '<ellipse cx="32" cy="32" rx="26" ry="8" transform="rotate(-22 32 32)" fill="none" stroke="#fbcfe8" stroke-width="3" opacity=".7"/><circle cx="32" cy="32" r="14" fill="#f472b6" stroke="#fff" stroke-width="1.5"/><circle cx="27" cy="27" r="4" fill="#fff" opacity=".35"/><path d="M9.5 37.5Q32 47 54.5 26.5" fill="none" stroke="#fbcfe8" stroke-width="3" stroke-linecap="round"/>'),
    makeStoreAvatar('store_bolt', 'رعد بنفش', 500, 'epic', ['#312e81', '#7c3aed', '#c4b5fd'],
        '<path d="M37 8L17 35h13l-4 21 21-29H33z" fill="#fef08a" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>'),
    makeStoreAvatar('store_shield', 'سپر افسانه‌ای', 600, 'epic', ['#064e3b', '#0f766e', '#5eead4'],
        '<path d="M32 8l20 7v15c0 14-9 22-20 26C21 52 12 44 12 30V15z" fill="#a78bfa" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path d="M32 8l20 7v15c0 14-9 22-20 26z" fill="#7c3aed" opacity=".55"/><path d="M32 20l3.4 7.4 8 .8-6 5.3 1.8 7.9L32 37l-7.2 4.4 1.8-7.9-6-5.3 8-.8z" fill="#fde68a"/>'),
    makeStoreAvatar('store_diamond', 'الماس یخی', 800, 'epic', ['#0c4a6e', '#0891b2', '#a5f3fc'],
        '<path d="M20 14h24l10 12-22 26L10 26z" fill="#e0f2fe" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 26h44M25 14l-5 12 12 26 12-26-5-12M32 14l-7 12M32 14l7 12" fill="none" stroke="#0891b2" stroke-opacity=".6" stroke-width="1.3"/>'),
    makeStoreAvatar('store_crown', 'تاج زرین', 1500, 'legendary', ['#431407', '#b45309', '#fcd34d'],
        '<g stroke-linejoin="round"><path d="M14 44L11 22l12 9 9-15 9 15 12-9-3 22z" fill="#fde68a" stroke="#f59e0b" stroke-width="2"/><rect x="14" y="46" width="36" height="6" rx="2.5" fill="#f59e0b"/><circle cx="11" cy="21" r="3" fill="#fff7ed"/><circle cx="32" cy="14" r="3" fill="#fff7ed"/><circle cx="53" cy="21" r="3" fill="#fff7ed"/></g>'),
    makeStoreAvatar('store_flame', 'شعله‌ی ققنوس', 1800, 'legendary', ['#450a0a', '#dc2626', '#fb923c'],
        '<path d="M32 7c3 9 14 15 14 28a14 14 0 0 1-28 0c0-7 4-11 8-15 0 6 3 8 5 8-3-9-2-15 1-21z" fill="#fb923c" stroke="#fff7ed" stroke-width="1.6" stroke-linejoin="round"/><path d="M32 30c2 5 7 8 7 14a7 7 0 0 1-14 0c0-4 3-6 4-8 1 2 2 3 3 3-1-4-1-6 0-9z" fill="#fde047"/>'),
    makeStoreAvatar('store_knight', 'شوالیه‌ی طلایی', 2000, 'legendary', ['#1c1917', '#78350f', '#fbbf24'],
        '<g stroke-linejoin="round"><path d="M17 52v-5c0-12 4-21 11-27l-3-9 9 5c9 4 11 17 11 31v5z" fill="#fde68a" stroke="#f59e0b" stroke-width="2"/><path d="M14 52h36v4H14z" fill="#f59e0b"/><path d="M30 13l-1.5-4.5L34 11" fill="#fde68a" stroke="#f59e0b" stroke-width="1.4"/><circle cx="31" cy="23" r="2.2" fill="#7c2d12"/></g>')
];

// ---------- مالکیت، خرید و استفاده ----------
const isStyleOwned = (user, kind, style) => style.price === 0 || (Array.isArray(user.inventory) ? user.inventory : []).includes(`${kind}:${style.id}`);
const isAvatarOwned = (user, avatar) => (user.unlockedAvatars || []).includes(avatar.id);
const getEquippedStyle = (user, kind) => (user && user.equipped && user.equipped[kind]) || 'classic';

const buyStyle = (username, kind, style) => {
    const outcome = { ok: false, msg: '', user: null };
    let reason = '';
    let pct = 0;
    try {
        const disc = (typeof getUserDiscounts === 'function') ? (getUserDiscounts(username) || {}) : {};
        pct = Number(disc.storeDiscountPercent || disc.store || disc.discountPercent || 0) || 0;
    } catch (e) { pct = 0; }
    const rawPrice = Number(style.price) || 0;
    const finalPrice = Math.max(0, Math.round(rawPrice * (1 - pct / 100)));
    const updated = patchUser(username, u => {
        if (isStyleOwned(u, kind, style)) { reason = 'این آیتم را از قبل دارید.'; return u; }
        if (u.coins < finalPrice) { reason = `موجودی کافی نیست؛ ${finalPrice - u.coins} کیوجی کم دارید.`; return u; }
        return { ...u, coins: u.coins - finalPrice, inventory: [...u.inventory, `${kind}:${style.id}`], equipped: { ...u.equipped, [kind]: style.id } };
    });
    outcome.ok = !!updated && !reason; outcome.user = updated; outcome.msg = reason || (updated ? '' : 'حساب کاربری پیدا نشد.');
    return outcome;
};

const buyAvatar = (username, avatar) => {
    const outcome = { ok: false, msg: '', user: null };
    let reason = '';
    let pct = 0;
    try {
        const disc = (typeof getUserDiscounts === 'function') ? (getUserDiscounts(username) || {}) : {};
        pct = Number(disc.storeDiscountPercent || disc.store || disc.discountPercent || 0) || 0;
    } catch (e) { pct = 0; }
    const rawPrice = Number(avatar.price) || 0;
    const finalPrice = Math.max(0, Math.round(rawPrice * (1 - pct / 100)));
    const updated = patchUser(username, u => {
        if (isAvatarOwned(u, avatar)) { reason = 'این آواتار را از قبل دارید.'; return u; }
        if (u.coins < finalPrice) { reason = `موجودی کافی نیست؛ ${finalPrice - u.coins} کیوجی کم دارید.`; return u; }
        return { ...u, coins: u.coins - finalPrice, unlockedAvatars: [...u.unlockedAvatars, avatar.id], avatar: avatar.src };
    });
    outcome.ok = !!updated && !reason; outcome.user = updated; outcome.msg = reason || (updated ? '' : 'حساب کاربری پیدا نشد.');
    return outcome;
};

const equipStyle = (username, kind, styleId) => {
    const style = STORE_STYLES[kind].find(s => s.id === styleId);
    if (!style) return null;
    return patchUser(username, u => (isStyleOwned(u, kind, style) ? { ...u, equipped: { ...u.equipped, [kind]: styleId } } : u));
};

const equipAvatar = (username, avatar) =>
    patchUser(username, u => (isAvatarOwned(u, avatar) ? { ...u, avatar: avatar.src } : u));

// استایل مهره‌ی «هر بازیکن» از حساب خودش خوانده می‌شود (نه از حساب من) و با تغییر داده‌ها به‌روز می‌ماند.
const useEquippedStyles = (usernames, currentUser) => {
    const key = usernames.filter(Boolean).join('|');
    const read = () => {
        const map = {};
        usernames.forEach(name => {
            if (!name) return;
            const account = name.toLowerCase() === currentUser.username.toLowerCase() ? currentUser : findUser(name);
            map[name] = (account && account.equipped) || {};
        });
        return map;
    };
    const [map, setMap] = useState(read);
    useEffect(() => {
        setMap(read());
        const onStorage = (event) => { if (!event.key || event.key === AUTH_USERS_KEY) setMap(read()); };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, [
        key,
        currentUser.equipped && currentUser.equipped.chess,
        currentUser.equipped && currentUser.equipped.ludo,
        currentUser.equipped && currentUser.equipped.dice,
        currentUser.equipped && currentUser.equipped.frames,
        currentUser.equipped && currentUser.equipped.titles
    ]);
    return map;
};
