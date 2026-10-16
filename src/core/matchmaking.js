// ---------- جستجوی حریف آنلاین (صف مسابقه) ----------
// هر بازیکنی که «آنلاین» وارد یک بازی شود در صف همان بازی قرار می‌گیرد. قدیمی‌ترین بازیکنِ صف، وقتی شرایط کامل شد
// مسابقه (یک لابیِ آماده‌ی شروع) می‌سازد و بقیه با همان لابی وارد بازی می‌شوند.
const MATCHMAKING_KEY = 'gameqj_matchmaking_v1';
const MATCH_STALE_MS = 9000;            // بازیکنی که این‌قدر «ضربان» نفرستد از صف حذف و ورودی‌اش برگردانده می‌شود
const MATCH_RULES = {
    chess: { min: 2, max: 2, label: 'شطرنج', waitMs: 0 },
    ludo: { min: 2, max: 4, label: 'منچ', waitMs: 12000 },
    tictactoe: { min: 2, max: 2, label: 'دوز', waitMs: 0 },
    backgammon: { min: 2, max: 2, label: 'تخته نرد', waitMs: 0 }
};

// ورودی مسابقه با احتساب تخفیف آلیانز (سطح بازی)
const getEntryFee = username => {
    try { const { gameDiscountPercent } = getUserDiscounts(username); return Math.max(0, Math.round(ONLINE_ENTRY_FEE * (1 - (gameDiscountPercent || 0) / 100))); } catch (e) { return ONLINE_ENTRY_FEE; }
};

const getQueue = () => {
    try { return JSON.parse(localStorage.getItem(MATCHMAKING_KEY)) || []; } catch (e) { return []; }
};
const saveQueue = (queue) => localStorage.setItem(MATCHMAKING_KEY, JSON.stringify(queue));

// حذف ورودی‌های منقضی (تب بسته‌شده) + بازگرداندن ورودیِ پرداخت‌شده‌شان
const pruneQueue = () => {
    const now = Date.now();
    const queue = getQueue();
    const alive = queue.filter(entry => now - entry.heartbeat < MATCH_STALE_MS || entry.lobbyId);
    const dead = queue.filter(entry => !alive.includes(entry));
    if (dead.length) {
        saveQueue(alive);
        dead.forEach(entry => patchUser(entry.username, u => ({ ...u, coins: u.coins + getEntryFee(entry.username) })));
    }
    // ورودی‌هایی که لابی‌شان ساخته شده و مدتی گذشته (بازیکن هرگز وارد نشده) پاک می‌شوند
    const fresh = getQueue().filter(entry => !entry.lobbyId || now - entry.heartbeat < 60000);
    if (fresh.length !== getQueue().length) saveQueue(fresh);
};

const joinMatchQueue = (username, game) => {
    const now = Date.now();
    const queue = getQueue().filter(entry => entry.username !== username);
    queue.push({ username, game, joinedAt: now, heartbeat: now, lobbyId: null });
    saveQueue(queue);
};

const leaveMatchQueue = (username) => {
    saveQueue(getQueue().filter(entry => entry.username !== username));
};

const heartbeatMatchQueue = (username) => {
    const queue = getQueue();
    const mine = queue.find(entry => entry.username === username);
    if (!mine) return false;
    mine.heartbeat = Date.now();
    saveQueue(queue);
    return true;
};

const getMatchEntry = (username) => getQueue().find(entry => entry.username === username) || null;
const getWaitingPlayers = (game) => getQueue().filter(entry => entry.game === game && !entry.lobbyId).sort((a, b) => a.joinedAt - b.joinedAt || a.username.localeCompare(b.username));

// فقط «رهبرِ صف» (قدیمی‌ترین) مسابقه می‌سازد تا دو مسابقه‌ی هم‌زمان برای یک نفر ساخته نشود
const tryCreateMatch = (username, game) => {
    const rule = MATCH_RULES[game];
    const waiting = getWaitingPlayers(game);
    if (!rule || !waiting.length || waiting[0].username !== username || waiting.length < rule.min) return null;
    const now = Date.now();
    const full = waiting.length >= rule.max;
    const patientEnough = waiting.length >= rule.min && now - waiting[rule.min - 1].joinedAt >= rule.waitMs;
    if (!full && !patientEnough) return null;
    const chosen = waiting.slice(0, rule.max).map(entry => entry.username);
    const lobby = { id: `mm-${now}-${Math.random().toString(36).slice(2, 8)}`, host: username, gameType: game, participants: chosen, invitees: [], status: 'started', matchmade: true, createdAt: now };
    saveLobbies([...getLobbies(), lobby]);
    saveQueue(getQueue().map(entry => (chosen.includes(entry.username) && entry.game === game && !entry.lobbyId ? { ...entry, lobbyId: lobby.id, heartbeat: now } : entry)));
    return lobby;
};

// منبع حقیقتِ مسابقه: خودِ لابیِ ساخته‌شده (حتی اگر علامت‌گذاری صف به‌خاطر نوشتن هم‌زمان چند تب از بین رفته باشد)
const findMatchedLobby = (username, sinceMs) =>
    getLobbies().find(lobby => lobby.matchmade && lobby.status === 'started' && lobby.participants.includes(username) && lobby.createdAt >= sinceMs - 1000) || null;
