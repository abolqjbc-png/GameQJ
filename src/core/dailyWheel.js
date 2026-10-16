// ---------- گردونه‌ی روزانه — هر ۲۴ ساعت یک بار ----------
// برای تست موقتاً روی ۰ تنظیم شده است
const DAILY_WHEEL_COOLDOWN = 24*60*60*1000; // در حالت اصلی باید 24 * 60 * 60 * 1000 باشد

// ۷ جایزه — از کم به زیاد، با پالت رنگ‌های پرزرق‌وبرق جواهری با کنتراست فوق‌العاده
const WHEEL_PRIZES = [
    { amount: 5,   weight: 30, color: '#2563eb', label: '۵',  tier: 'common',    light: '#93c5fd', dark: '#1e3a8a', name: 'یاقوت آبی' },
    { amount: 10,  weight: 25, color: '#059669', label: '۱۰', tier: 'common',    light: '#6ee7b7', dark: '#064e3b', name: 'زمرد سبز' },
    { amount: 20,  weight: 18, color: '#7c3aed', label: '۲۰', tier: 'uncommon',  light: '#c4b5fd', dark: '#4c1d95', name: 'آمتیست بنفش' },
    { amount: 35,  weight: 12, color: '#db2777', label: '۳۵', tier: 'uncommon',  light: '#f472b6', dark: '#831843', name: 'رز کوارتز' },
    { amount: 50,  weight: 8,  color: '#ea580c', label: '۵۰', tier: 'rare',      light: '#fdba74', dark: '#7c2d12', name: 'عقیق آتشین' },
    { amount: 100, weight: 5,  color: '#dc2626', label: '۱۰۰', tier: 'epic',      light: '#fca5a5', dark: '#7f1d1d', name: 'یاقوت سرخ اژدها' },
    { amount: 200, weight: 2,  color: '#eab308', label: '۲۰۰', tier: 'legendary', light: '#fef08a', dark: '#713f12', name: 'طلای ۲۴ عیار افسانه‌ای' },
];

// مجموع وزن‌ها = ۱۰۰
const TOTAL_WEIGHT = WHEEL_PRIZES.reduce((s, p) => s + p.weight, 0);

// انتخاب جایزه با وزن
const pickWheelPrize = () => {
    let r = Math.random() * TOTAL_WEIGHT;
    for (const p of WHEEL_PRIZES) {
        r -= p.weight;
        if (r <= 0) return p;
    }
    return WHEEL_PRIZES[0];
};

// --- ذخیره‌ی زمان آخرین چرخش در خود کاربر (داخل users) ---
const getWheelState = (username) => {
    const u = findUser(username);
    if (!u) return { lastSpinAt: 0, spinCount: 0 };
    return {
        lastSpinAt: u.wheelLastSpinAt || 0,
        spinCount: u.wheelSpinCount || 0,
    };
};

const canSpinWheel = (username) => {
    const { lastSpinAt } = getWheelState(username);
    if (!lastSpinAt) return true;
    return Date.now() - lastSpinAt >= DAILY_WHEEL_COOLDOWN;
};

const getWheelCooldownLeft = (username) => {
    const { lastSpinAt } = getWheelState(username);
    if (!lastSpinAt) return 0;
    const left = DAILY_WHEEL_COOLDOWN - (Date.now() - lastSpinAt);
    return left > 0 ? left : 0;
};

const recordWheelSpin = (username, amount) => {
    const updated = patchUser(username, u => ({
        ...u,
        coins: (u.coins || 0) + amount,
        wheelLastSpinAt: Date.now(),
        wheelSpinCount: (u.wheelSpinCount || 0) + 1,
    }));
    return updated;
};

// فرمت زمان باقی‌مانده: "۰۵:۱۲:۳۰"
const formatWheelCooldown = (ms) => {
    if (ms <= 0) return 'آماده!';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

// شاخص گردونه روی کدام قطعه ایستاده (برای محاسبه‌ی زاویه)
const getPrizeIndex = (prize) => WHEEL_PRIZES.findIndex(p => p.amount === prize.amount);
