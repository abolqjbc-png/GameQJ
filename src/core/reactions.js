// ---------- واکنش‌های بازی: پرتاب آیتم‌های خنده‌دار روی پروفایل حریف (برای همه‌ی بازیکنانِ همان مسابقه نمایش داده می‌شود) ----------
const REACTIONS_KEY = 'gameqj_reactions_v1';
const REACTION_MUTE_KEY = 'gameqj_reactions_muted';
const REACTION_COOLDOWN_MS = 5000;     // فاصله‌ی دو پرتاب یک بازیکن (ضد اسپم)
const REACTION_MAX_PER_MATCH = 30;     // سقف پرتاب هر بازیکن در یک مسابقه
const REACTION_MAX_AGE_MS = 12000;     // واکنش‌های قدیمی‌تر نمایش داده نمی‌شوند
const REACTION_MAX_CONCURRENT = 4;     // حداکثر انیمیشن هم‌زمان روی صفحه

// قیمت‌ها عمداً کم است (ورودی مسابقه ۲۵ کیوجی است)
const REACTION_ITEMS = [
    { id: 'egg', emoji: '🥚', name: 'تخم‌مرغ', price: 3, impact: 'egg', sound: 'splat', ms: 3600, flight: 'arc' },
    { id: 'tomato', emoji: '🍅', name: 'گوجه‌فرنگی', price: 3, impact: 'tomato', sound: 'splat', ms: 3600, flight: 'arc' },
    { id: 'banana', emoji: '🍌', name: 'پوست موز', price: 4, impact: 'slip', sound: 'boing', ms: 2800, flight: 'low', targetClass: 'gq-fx-slip' },
    { id: 'rose', emoji: '🌹', name: 'گل رز', price: 4, impact: 'hearts', sound: 'chime', ms: 3200, flight: 'arc' },
    { id: 'cake', emoji: '🎂', name: 'کیک خامه‌ای', price: 5, impact: 'cream', sound: 'splat', ms: 3800, flight: 'arc' },
    { id: 'party', emoji: '🎉', name: 'جشن و کنفتی', price: 5, impact: 'confetti', sound: 'pop', ms: 3000, flight: 'arc' },
    { id: 'hammer', emoji: '🔨', name: 'چکش', price: 6, impact: 'bonk', sound: 'bonk', ms: 2800, flight: 'drop', targetClass: 'gq-fx-shake' },
    { id: 'ice', emoji: '🧊', name: 'یخ‌زده', price: 6, impact: 'freeze', sound: 'crack', ms: 3800, flight: 'arc', targetClass: 'gq-fx-shiver' },
    { id: 'bomb', emoji: '💣', name: 'بمب', price: 8, impact: 'boom', sound: 'boom', ms: 3400, flight: 'arc', targetClass: 'gq-fx-shake' }
];

// وضعیت زمان اجرا (مسابقه‌ی فعلیِ این تب)
const reactionRuntime = { matchId: null, me: null, lastSent: {}, sentCount: {} };
const setReactionSession = (matchId, me) => { reactionRuntime.matchId = matchId; reactionRuntime.me = me; };

const isReactionMuted = () => { try { return localStorage.getItem(REACTION_MUTE_KEY) === '1'; } catch (e) { return false; } };
const setReactionMuted = (value) => { try { localStorage.setItem(REACTION_MUTE_KEY, value ? '1' : '0'); } catch (e) {} };
const reactionCooldownLeft = (username) => Math.max(0, REACTION_COOLDOWN_MS - (Date.now() - (reactionRuntime.lastSent[username] || 0)));
const readReactionLog = () => { try { return JSON.parse(localStorage.getItem(REACTIONS_KEY)) || []; } catch (e) { return []; } };

// ثبت واکنش در «صندوق مشترک» (برای تب‌های دیگر) + پخش محلی برای همین تب
const emitReaction = (event) => {
    const now = Date.now();
    const log = readReactionLog().filter(item => now - item.at < 60000).slice(-39);
    log.push(event);
    try { localStorage.setItem(REACTIONS_KEY, JSON.stringify(log)); } catch (e) {}
    window.dispatchEvent(new CustomEvent('gq:reaction', { detail: event }));
};

const sendReaction = ({ matchId, from, to, itemId }) => {
    const item = REACTION_ITEMS.find(entry => entry.id === itemId);
    if (!item || !matchId || !from || !to) return { ok: false, msg: 'ارسال واکنش ممکن نیست.' };
    if (from === to) return { ok: false, msg: 'نمی‌توانید به خودتان پرتاب کنید.' };
    const wait = reactionCooldownLeft(from);
    if (wait > 0) return { ok: false, msg: `برای جلوگیری از اسپم، ${Math.ceil(wait / 1000).toLocaleString('fa-IR')} ثانیه صبر کنید.` };
    const countKey = `${matchId}|${from}`;
    if ((reactionRuntime.sentCount[countKey] || 0) >= REACTION_MAX_PER_MATCH) return { ok: false, msg: 'به سقف واکنش‌های این مسابقه رسیده‌اید.' };
    const account = findUser(from);
    if (!account || account.coins < item.price) return { ok: false, msg: `برای این واکنش ${item.price.toLocaleString('fa-IR')} کیوجی لازم است.` };

    const user = patchUser(from, u => ({ ...u, coins: u.coins - item.price }));
    reactionRuntime.lastSent[from] = Date.now();
    reactionRuntime.sentCount[countKey] = (reactionRuntime.sentCount[countKey] || 0) + 1;
    emitReaction({ id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, matchId, from, to, item: item.id, at: Date.now() });
    return { ok: true, user };
};

// ---------- صدا (Web Audio، بدون فایل) ----------
const reactionSound = (kind, enabled = true) => {
    if (!enabled) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const t0 = ctx.currentTime;
        const master = ctx.createGain();
        master.connect(ctx.destination);
        const noise = (dur, type, freq, gainValue) => {
            const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
            const src = ctx.createBufferSource();
            src.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = type; filter.frequency.value = freq;
            const g = ctx.createGain();
            g.gain.setValueAtTime(gainValue, t0);
            g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
            src.connect(filter); filter.connect(g); g.connect(master);
            src.start(t0);
        };
        const tone = (type, f0, f1, dur, gainValue, delay = 0) => {
            const osc = ctx.createOscillator(), g = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(f0, t0 + delay);
            osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + delay + dur);
            g.gain.setValueAtTime(gainValue, t0 + delay);
            g.gain.exponentialRampToValueAtTime(0.001, t0 + delay + dur);
            osc.connect(g); g.connect(master);
            osc.start(t0 + delay); osc.stop(t0 + delay + dur + 0.02);
        };
        master.gain.value = 0.55;
        if (kind === 'whoosh') noise(0.32, 'bandpass', 1400, 0.22);
        else if (kind === 'splat') { noise(0.22, 'lowpass', 900, 0.5); tone('sine', 220, 70, 0.18, 0.25); }
        else if (kind === 'boom') { noise(0.7, 'lowpass', 500, 0.8); tone('sine', 110, 28, 0.6, 0.6); }
        else if (kind === 'bonk') { tone('square', 190, 55, 0.16, 0.35); noise(0.06, 'highpass', 2500, 0.3); }
        else if (kind === 'pop') { tone('sine', 500, 1100, 0.09, 0.3); noise(0.12, 'highpass', 3000, 0.2); }
        else if (kind === 'chime') { tone('sine', 880, 880, 0.35, 0.22); tone('sine', 1318, 1318, 0.45, 0.2, 0.12); }
        else if (kind === 'boing') { tone('sine', 180, 520, 0.18, 0.3); tone('sine', 520, 200, 0.28, 0.28, 0.17); }
        else if (kind === 'crack') { noise(0.05, 'highpass', 3500, 0.5); noise(0.05, 'highpass', 2500, 0.4); tone('triangle', 1700, 900, 0.2, 0.15, 0.06); }
        setTimeout(() => { try { ctx.close(); } catch (e) {} }, 1200);
    } catch (e) {}
};
