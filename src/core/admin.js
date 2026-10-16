// ============================================================
//  admin.js — هسته مدیریت (بن، تعلیق، سکه، ریست گردونه)
// ============================================================

const USERS_CHANGED_EVENT = 'gq:users-changed';

// اطلاع سایر ماژول‌ها از تغییر کاربران
const notifyUsersChanged = () => {
    try { window.dispatchEvent(new CustomEvent(USERS_CHANGED_EVENT)); } catch (e) { /* noop */ }
};

// کاربران ادمین پیش‌فرض
const ADMIN_USERNAMES = ['admin', 'Admin'];

const isAdminUser = (user) => !!user && (user.role === 'admin' || ADMIN_USERNAMES.includes(user.username));

// اطمینان از وجود پرچم‌های مدیریتی روی همه کاربران
const ensureAdminFlags = () => {
    const users = getUsers();
    let changed = false;
    users.forEach((u) => {
        if (u.role === undefined) { u.role = 'user'; changed = true; }
        if (u.banned === undefined) { u.banned = false; changed = true; }
        if (u.gameSuspendedUntil === undefined) { u.gameSuspendedUntil = 0; changed = true; }
        if (ADMIN_USERNAMES.includes(u.username) && u.role !== 'admin') { u.role = 'admin'; changed = true; }
    });
    if (changed) saveUsers(users);
    return users;
};

// ساخت حساب ادمین پیش‌فرض در صورت نبودن
const ensureAdminSeed = () => {
    const users = getUsers();
    if (users.some((u) => u.username === 'admin')) return false;
    users.push({
        username: 'admin',
        passwordHash: hashPassword('admin123'),
        role: 'admin',
        banned: false,
        gameSuspendedUntil: 0,
        coins: 0,
        unlockedAvatars: [],
        createdAt: Date.now(),
    });
    saveUsers(users);
    return true;
};

// بن / رفع بن
const adminSetBan = (actorUsername, targetUsername, banned) => {
    const target = findUser(targetUsername);
    if (!target) return { ok: false, error: 'کاربر یافت نشد.' };
    if (isAdminUser(target)) return { ok: false, error: 'امکان بن کردن مدیر وجود ندارد.' };
    const patch = { banned: !!banned };
    if (banned) patch.kickedAt = Date.now();
    const updated = patchUser(targetUsername, patch);
    notifyUsersChanged();
    return { ok: true, user: updated };
};

// تعلیق بازی به مدت ساعت؛ ۰ یعنی رفع تعلیق
const adminSuspendGames = (actorUsername, targetUsername, hours) => {
    const target = findUser(targetUsername);
    if (!target) return { ok: false, error: 'کاربر یافت نشد.' };
    if (isAdminUser(target)) return { ok: false, error: 'امکان تعلیق مدیر وجود ندارد.' };
    const h = Number(hours);
    if (!Number.isFinite(h) || h < 0) return { ok: false, error: 'مدت تعلیق معتبر نیست.' };
    const until = h === 0 ? 0 : Date.now() + h * 3600000;
    const updated = patchUser(targetUsername, { gameSuspendedUntil: until });
    notifyUsersChanged();
    return { ok: true, user: updated };
};

// افزودن/کسر سکه (دلتا مثبت یا منفی)
const adminAdjustCoins = (actorUsername, targetUsername, delta) => {
    const target = findUser(targetUsername);
    if (!target) return { ok: false, error: 'کاربر یافت نشد.' };
    const d = Number(delta);
    if (!Number.isFinite(d) || d === 0 || !Number.isInteger(d)) return { ok: false, error: 'مقدار سکه معتبر نیست.' };
    const next = Math.max(0, (Number(target.coins) || 0) + d);
    const updated = patchUser(targetUsername, { coins: next });
    notifyUsersChanged();
    return { ok: true, user: updated };
};

// ریست گردونه روزانه
const adminResetWheel = (actorUsername, targetUsername) => {
    const target = findUser(targetUsername);
    if (!target) return { ok: false, error: 'کاربر یافت نشد.' };
    const updated = patchUser(targetUsername, { wheelLastSpinAt: 0 });
    notifyUsersChanged();
    return { ok: true, user: updated };
};

// فهرست سبک کاربران برای پنل مدیریت
const adminGetUserList = () => ensureAdminFlags().map((u) => ({
    username: u.username,
    role: u.role,
    banned: u.banned === true,
    gameSuspendedUntil: Number(u.gameSuspendedUntil) || 0,
    coins: Number(u.coins) || 0,
    createdAt: u.createdAt,
    lastSeen: u.lastSeen,
    stats: { games: (u.stats && u.stats.games) || 0, wins: (u.stats && u.stats.wins) || 0 },
    avatar: u.avatar,
}));

// بررسی مانع بازی کردن کاربر
const getUserPlayBlock = (user) => {
    if (!user) return null;
    if (user.banned === true) return { type: 'ban', message: 'حساب شما توسط مدیریت مسدود شده است.' };
    const until = Number(user.gameSuspendedUntil) || 0;
    if (until > Date.now()) return { type: 'suspend', until, message: 'حساب شما از بازی کردن موقتاً تعلیق شده است.' };
    return null;
};
