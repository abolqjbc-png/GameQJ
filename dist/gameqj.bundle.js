/* خودکار ساخته شده توسط build.js — مستقیم ویرایش نشود */
/* ===== core/react.js ===== */
const { useState, useEffect, useCallback, useMemo, useRef, Fragment } = React;

/* ===== core/constants.js ===== */
const AUTH_USERS_KEY = 'gameqj_users_v2';
const AUTH_SESSION_KEY = 'gameqj_session_v2';
const GAME_LOBBIES_KEY = 'gameqj_lobbies_v1';
const MESSAGES_KEY = 'gameqj_messages_v1';

const INITIAL_QJ_COINS = 100;
const ONLINE_ENTRY_FEE = 25;
const CHESS_WIN_REWARD = 50;
const LUDO_WIN_REWARD = 100;
const TICTACTOE_WIN_REWARD = 40;
const BACKGAMMON_WIN_REWARD = 60;
const GALLERY_AVATAR_COST = 1000;
const PREMIUM_AVATAR_COST = 150;
/* ===== core/auth.js ===== */
const hashPassword = (password) => {
    const salt = 'GameQJ_Secured_Salt_2026';
    const encoded = unescape(encodeURIComponent(password + salt));
    return btoa(encoded).split('').reverse().join('');
};

const getUsers = () => {
    try {
        return JSON.parse(localStorage.getItem(AUTH_USERS_KEY)) || [];
    } catch (e) {
        return [];
    }
};

const saveUsers = (users) => {
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
};

const getSession = () => {
    try {
        const local = localStorage.getItem(AUTH_SESSION_KEY);
        if (local) return JSON.parse(local);
        const session = sessionStorage.getItem(AUTH_SESSION_KEY);
        if (session) return JSON.parse(session);
    } catch (e) {}
    return null;
};

const saveSession = (userData, rememberMe) => {
    const sessionPayload = {
        username: userData.username,
        loginTime: new Date().toISOString(),
        rememberMe: rememberMe
    };
    if (rememberMe) {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionPayload));
        sessionStorage.removeItem(AUTH_SESSION_KEY);
    } else {
        sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionPayload));
        localStorage.removeItem(AUTH_SESSION_KEY);
    }
};

const clearSession = () => {
    localStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.removeItem(AUTH_SESSION_KEY);
};

/* ===== core/users.js ===== */
const DEFAULT_STATS = { games: 0, wins: 0, losses: 0, ludoGames: 0, ludoWins: 0 };
const DEFAULT_SETTINGS = { sound: true, showLastSeen: true, lightMode: false };
const THEME_STORAGE_KEY = 'gameqj_theme';

const applyThemeToDOM = (isLight) => {
    try {
        if (typeof document !== 'undefined') {
            if (isLight) {
                document.documentElement.classList.add('light-mode');
                document.body && document.body.classList.add('light-mode');
            } else {
                document.documentElement.classList.remove('light-mode');
                document.body && document.body.classList.remove('light-mode');
            }
        }
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(THEME_STORAGE_KEY, isLight ? 'light' : 'dark');
        }
    } catch (e) {}
};

const getInitialThemeIsLight = () => {
    try {
        if (typeof localStorage !== 'undefined') {
            const saved = localStorage.getItem(THEME_STORAGE_KEY);
            if (saved === 'light') return true;
            if (saved === 'dark') return false;
        }
    } catch (e) {}
    return false;
};

const normalizeUser = (u) => ({
    ...u,
    friends: u.friends || [],
    friendRequests: u.friendRequests || [],
    notifications: u.notifications || [],
    gameInvitations: u.gameInvitations || [],
    pinnedFriends: u.pinnedFriends || [],
    unlockedAvatars: Array.isArray(u.unlockedAvatars) ? u.unlockedAvatars : [],
    inventory: Array.isArray(u.inventory) ? u.inventory : [],
    equipped: { chess: 'classic', ludo: 'classic', ...(u.equipped || {}) },
    coins: typeof u.coins === 'number' ? u.coins : INITIAL_QJ_COINS,
    stats: { ...DEFAULT_STATS, ...(u.stats || {}) },
    settings: { ...DEFAULT_SETTINGS, ...(u.settings || {}) },
    avatar: u.avatar || '',
    role: (u.role === 'admin' ? 'admin' : 'user'),
    banned: u.banned === true,
    gameSuspendedUntil: Number(u.gameSuspendedUntil) || 0,
    lastSeen: u.lastSeen || u.createdAt || new Date().toISOString()
});

const findUser = (name) => {
    if (!name) return null;
    const u = getUsers().find(x => x.username.toLowerCase() === name.toLowerCase());
    return u ? normalizeUser(u) : null;
};

const patchUser = (username, fn) => {
    const users = getUsers();
    const idx = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
    if (idx === -1) return null;
    const normalized = normalizeUser(users[idx]);
    const updated = typeof fn === 'function' ? fn(normalized) : { ...normalized, ...(fn || {}) };
    users[idx] = updated;
    saveUsers(users);
    return updated;
};

const isUsernameAvailable = (username, currentUsername = null) => {
    const normalizedName = username.trim().toLowerCase();
    return !getUsers().some(user =>
        user.username.toLowerCase() === normalizedName &&
        user.username.toLowerCase() !== currentUsername?.toLowerCase()
    );
};

const renameUser = (currentUsername, nextUsername) => {
    const cleanedName = nextUsername.trim();
    if (!cleanedName || !isUsernameAvailable(cleanedName, currentUsername)) return null;

    const users = getUsers();
    const currentUser = users.find(user => user.username.toLowerCase() === currentUsername.toLowerCase());
    if (!currentUser) return null;

    const renamedUsers = users.map(user => {
        const normalizedUser = normalizeUser(user);
        if (normalizedUser.username.toLowerCase() === currentUsername.toLowerCase()) {
            return { ...normalizedUser, username: cleanedName };
        }

        return {
            ...normalizedUser,
            friends: normalizedUser.friends.map(friend =>
                friend.toLowerCase() === currentUsername.toLowerCase() ? cleanedName : friend
            ),
            pinnedFriends: (normalizedUser.pinnedFriends || []).map(friend =>
                friend.toLowerCase() === currentUsername.toLowerCase() ? cleanedName : friend
            ),
            friendRequests: normalizedUser.friendRequests.map(request =>
                request.from.toLowerCase() === currentUsername.toLowerCase()
                    ? { ...request, from: cleanedName }
                    : request
            ),
            gameInvitations: normalizedUser.gameInvitations.map(invite =>
                invite.from.toLowerCase() === currentUsername.toLowerCase() ? { ...invite, from: cleanedName } : invite
            ),
            notifications: normalizedUser.notifications.map(notification => ({
                ...notification,
                text: typeof notification.text === 'string'
                    ? notification.text.split(currentUsername).join(cleanedName)
                    : notification.text
            }))
        };
    });

    saveUsers(renamedUsers);
    saveMessages(getMessages().map(message => ({
        ...message,
        senderUsername: message.senderUsername?.toLowerCase() === currentUsername.toLowerCase() ? cleanedName : message.senderUsername,
        recipientUsername: message.recipientUsername?.toLowerCase() === currentUsername.toLowerCase() ? cleanedName : message.recipientUsername
    })));
    saveLobbies(getLobbies().map(lobby => ({
        ...lobby,
        host: lobby.host.toLowerCase() === currentUsername.toLowerCase() ? cleanedName : lobby.host,
        participants: lobby.participants.map(name => name.toLowerCase() === currentUsername.toLowerCase() ? cleanedName : name),
        invitees: lobby.invitees.map(name => name.toLowerCase() === currentUsername.toLowerCase() ? cleanedName : name)
    })));
    const renamedUser = renamedUsers.find(user => user.username === cleanedName);
    const session = getSession();
    saveSession(renamedUser, session?.rememberMe ?? true);
    return normalizeUser(renamedUser);
};

const deleteUser = (username, password) => {
    const account = findUser(username);
    if (!account || account.passwordHash !== hashPassword(password)) return false;

    const remainingUsers = getUsers()
        .filter(user => user.username.toLowerCase() !== username.toLowerCase())
        .map(user => {
            const normalizedUser = normalizeUser(user);
            return {
                ...normalizedUser,
                friends: normalizedUser.friends.filter(friend => friend.toLowerCase() !== username.toLowerCase()),
                pinnedFriends: (normalizedUser.pinnedFriends || []).filter(friend => friend.toLowerCase() !== username.toLowerCase()),
                friendRequests: normalizedUser.friendRequests.filter(request => request.from.toLowerCase() !== username.toLowerCase()),
                gameInvitations: normalizedUser.gameInvitations.filter(invite => invite.from.toLowerCase() !== username.toLowerCase()),
                notifications: normalizedUser.notifications.filter(notification =>
                    !String(notification.text || '').includes(username)
                )
            };
        });

    saveUsers(remainingUsers);
    saveMessages(getMessages().filter(message =>
        message.senderUsername?.toLowerCase() !== username.toLowerCase() &&
        message.recipientUsername?.toLowerCase() !== username.toLowerCase() &&
        !getLobbies().some(lobby => lobby.host.toLowerCase() === username.toLowerCase() && lobby.id === message.matchId)
    ));
    saveLobbies(getLobbies().filter(lobby => lobby.host.toLowerCase() !== username.toLowerCase()).map(lobby => ({
        ...lobby,
        participants: lobby.participants.filter(name => name.toLowerCase() !== username.toLowerCase()),
        invitees: lobby.invitees.filter(name => name.toLowerCase() !== username.toLowerCase())
    })));
    clearSession();
    return true;
};

const recordGameResult = (username, won, gameType, isOnline = false) => {
    return patchUser(username, user => {
        let gainedCoins = 0;
        if (isOnline && won) {
            if (gameType === 'ludo') gainedCoins = LUDO_WIN_REWARD;
            else if (gameType === 'chess') gainedCoins = CHESS_WIN_REWARD;
            else if (gameType === 'tictactoe') gainedCoins = TICTACTOE_WIN_REWARD;
            else if (gameType === 'backgammon') gainedCoins = BACKGAMMON_WIN_REWARD;
        }
        return {
            ...user,
            coins: user.coins + gainedCoins,
            stats: {
                ...user.stats,
                games: user.stats.games + 1,
                wins: user.stats.wins + (won ? 1 : 0),
                losses: user.stats.losses + (won ? 0 : 1),
                ludoGames: user.stats.ludoGames + (gameType === 'ludo' ? 1 : 0),
                ludoWins: user.stats.ludoWins + (gameType === 'ludo' && won ? 1 : 0),
                backgammonGames: (user.stats.backgammonGames || 0) + (gameType === 'backgammon' ? 1 : 0),
                backgammonWins: (user.stats.backgammonWins || 0) + (gameType === 'backgammon' && won ? 1 : 0)
            }
        };
    });
};

const deductCoins = (username, amount) => {
    const user = findUser(username);
    if (!user || user.coins < amount) return false;
    patchUser(username, u => ({ ...u, coins: u.coins - amount }));
    return true;
};

/* ===== core/lobbies.js ===== */
const getLobbies = () => {
    try { return JSON.parse(localStorage.getItem(GAME_LOBBIES_KEY)) || []; } catch (e) { return []; }
};
const saveLobbies = (lobbies) => localStorage.setItem(GAME_LOBBIES_KEY, JSON.stringify(lobbies));
const createLobby = (host, gameType, invitees) => {
    const lobby = { id: `${Date.now()}-${Math.random()}`, host, gameType, participants: [host], invitees, status: 'waiting' };
    saveLobbies([...getLobbies(), lobby]);
    invitees.forEach(username => patchUser(username, user => ({
        ...user,
        gameInvitations: [...user.gameInvitations, { lobbyId: lobby.id, from: host, gameType, seen: false }]
    })));
    return lobby;
};
const joinLobby = (lobbyId, username) => {
    let joined = null;
    const lobbies = getLobbies().map(lobby => {
        if (lobby.id !== lobbyId || lobby.status !== 'waiting') return lobby;
        joined = { ...lobby, participants: [...new Set([...lobby.participants, username])] };
        return joined;
    });
    saveLobbies(lobbies);
    patchUser(username, user => ({ ...user, gameInvitations: user.gameInvitations.filter(invite => invite.lobbyId !== lobbyId) }));
    return joined;
};
const cancelLobby = (lobbyId, host) => {
    const lobby = getLobbies().find(item => item.id === lobbyId && item.host === host);
    if (!lobby) return false;
    saveLobbies(getLobbies().filter(item => item.id !== lobbyId));
    [...lobby.invitees, ...lobby.participants.filter(name => name !== host)].forEach(username => patchUser(username, user => ({
        ...user,
        gameInvitations: user.gameInvitations.filter(invite => invite.lobbyId !== lobbyId),
        notifications: [{ id: Date.now() + Math.random(), text: `دعوت بازی «${host}» لغو شد.`, type: 'info', time: new Date().toISOString() }, ...user.notifications]
    })));
    return true;
};

/* ===== core/matchmaking.js ===== */
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

/* ===== core/format.js ===== */
const canViewLastSeen = (viewer, subject) =>
    (viewer?.settings?.showLastSeen ?? true) && (subject?.settings?.showLastSeen ?? true);

const formatLastSeen = (iso, isVisible = true) => {
    if (!isVisible) return 'نمایش داده نمی‌شود';
    const d = new Date(iso);
    if (isNaN(d)) return 'نامشخص';
    if (Date.now() - d.getTime() < 90000) return 'هم‌اکنون آنلاین';
    return d.toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' });
};

/* ===== ui/icons.jsx ===== */
// ---------- آیکون‌ها ----------
const IconCoin = ({ className = "w-5 h-5" }) => (React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className },
    React.createElement("circle", { cx: "12", cy: "12", r: "9", className: "fill-amber-400 stroke-amber-500" }),
    React.createElement("path", { d: "M12 7v10M9 9.5h6a1.5 1.5 0 0 1 0 3H9h6a1.5 1.5 0 0 1 0 3H9", className: "stroke-amber-950 stroke-[2.2]" })));
const IconGamepad = ({ className = "w-6 h-6" }) => (React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className },
    React.createElement("line", { x1: "6", x2: "10", y1: "12", y2: "12" }),
    React.createElement("line", { x1: "8", x2: "8", y1: "10", y2: "14" }),
    React.createElement("line", { x1: "15", x2: "15.01", y1: "13", y2: "13" }),
    React.createElement("line", { x1: "18", x2: "18.01", y1: "11", y2: "11" }),
    React.createElement("rect", { width: "20", height: "12", x: "2", y: "6", rx: "6" })));
const IconUsers = ({ className = "w-6 h-6" }) => (React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className },
    React.createElement("path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }),
    React.createElement("circle", { cx: "9", cy: "7", r: "4" }),
    React.createElement("path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" }),
    React.createElement("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })));
const IconShoppingBag = ({ className = "w-6 h-6" }) => (React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className },
    React.createElement("path", { d: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" }),
    React.createElement("path", { d: "M3 6h18" }),
    React.createElement("path", { d: "M16 10a4 4 0 0 1-8 0" })));
const IconUserCircle = ({ className = "w-6 h-6" }) => (React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className },
    React.createElement("circle", { cx: "12", cy: "12", r: "10" }),
    React.createElement("circle", { cx: "12", cy: "10", r: "3" }),
    React.createElement("path", { d: "M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" })));
const IconBot = ({ className = "w-6 h-6" }) => (React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className },
    React.createElement("rect", { width: "18", height: "12", x: "3", y: "6", rx: "2" }),
    React.createElement("path", { d: "M9 13h.01" }),
    React.createElement("path", { d: "M15 13h.01" }),
    React.createElement("path", { d: "M12 6V3" }),
    React.createElement("path", { d: "M2 12h1" }),
    React.createElement("path", { d: "M21 12h1" })));
const IconGlobe = ({ className = "w-6 h-6" }) => (React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className },
    React.createElement("circle", { cx: "12", cy: "12", r: "10" }),
    React.createElement("path", { d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" }),
    React.createElement("path", { d: "M2 12h20" })));
const IconSearch = ({ className = "w-6 h-6" }) => (React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className },
    React.createElement("circle", { cx: "11", cy: "11", r: "8" }),
    React.createElement("path", { d: "m21 21-4.3-4.3" })));
const IconUserPlus = ({ className = "w-6 h-6" }) => (React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className },
    React.createElement("path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }),
    React.createElement("circle", { cx: "9", cy: "7", r: "4" }),
    React.createElement("line", { x1: "19", x2: "19", y1: "8", y2: "14" }),
    React.createElement("line", { x1: "22", x2: "16", y1: "11", y2: "11" })));
const IconUserX = ({ className = "w-6 h-6" }) => (React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className },
    React.createElement("path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }),
    React.createElement("circle", { cx: "9", cy: "7", r: "4" }),
    React.createElement("line", { x1: "17", x2: "22", y1: "8", y2: "13" }),
    React.createElement("line", { x1: "22", x2: "17", y1: "8", y2: "13" })));
const IconCheck = ({ className = "w-6 h-6" }) => (React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", className: className },
    React.createElement("polyline", { points: "20 6 9 17 4 12" })));
const IconDice = ({ className = "w-6 h-6" }) => (React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className },
    React.createElement("rect", { width: "18", height: "18", x: "3", y: "3", rx: "4" }),
    React.createElement("path", { d: "M16 8h.01" }),
    React.createElement("path", { d: "M8 8h.01" }),
    React.createElement("path", { d: "M8 16h.01" }),
    React.createElement("path", { d: "M16 16h.01" }),
    React.createElement("path", { d: "M12 12h.01" })));
const IconRotate = ({ className = "w-6 h-6" }) => (React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className },
    React.createElement("path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }),
    React.createElement("path", { d: "M3 3v5h5" })));
const IconTrophy = ({ className = "w-6 h-6" }) => (React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className },
    React.createElement("path", { d: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6" }),
    React.createElement("path", { d: "M18 9h1.5a2.5 2.5 0 0 0 0-5H18" }),
    React.createElement("path", { d: "M4 22h16" }),
    React.createElement("path", { d: "M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" }),
    React.createElement("path", { d: "M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" }),
    React.createElement("path", { d: "M18 2H6v7a6 6 0 0 0 12 0V2Z" })));
const IconLogout = ({ className = "w-6 h-6" }) => (React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className },
    React.createElement("path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }),
    React.createElement("polyline", { points: "16 17 21 12 16 7" }),
    React.createElement("line", { x1: "21", y1: "12", x2: "9", y2: "12" })));
const IconLock = ({ className = "w-6 h-6" }) => (React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className },
    React.createElement("rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2" }),
    React.createElement("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" })));
const IconBell = ({ className = "w-6 h-6" }) => (React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className },
    React.createElement("path", { d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" }),
    React.createElement("path", { d: "M10.3 21a1.94 1.94 0 0 0 3.4 0" })));
const IconArrowLeft = ({ className = "w-6 h-6" }) => (React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className },
    React.createElement("line", { x1: "19", y1: "12", x2: "5", y2: "12" }),
    React.createElement("polyline", { points: "12 19 5 12 12 5" })));
const IconPin = ({ className = "w-5 h-5", filled = false }) => (React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: filled ? "currentColor" : "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className },
    React.createElement("line", { x1: "12", y1: "17", x2: "12", y2: "22" }),
    React.createElement("path", { d: "M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" })));
const IconTrash = ({ className = "w-4 h-4" }) => (React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className },
    React.createElement("path", { d: "M3 6h18" }),
    React.createElement("path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" }),
    React.createElement("path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" }),
    React.createElement("line", { x1: "10", x2: "10", y1: "11", y2: "17" }),
    React.createElement("line", { x1: "14", x2: "14", y1: "11", y2: "17" })));
const IconMessageSquare = ({ className = "w-5 h-5" }) => (React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className },
    React.createElement("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" })));

/* ===== core/sound.js ===== */
let gameSoundContext = null;

const playSound = (type, soundEnabled = true) => {
    if (!soundEnabled) return;
    try {
        if (!gameSoundContext || gameSoundContext.state === 'closed') {
            gameSoundContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = gameSoundContext;
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.onended = () => {
            osc.disconnect();
            gain.disconnect();
        };

        if (type === 'dice') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
            osc.start();
            osc.stop(ctx.currentTime + 0.12);
        } else if (type === 'move') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(320, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(540, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
            osc.start();
            osc.stop(ctx.currentTime + 0.08);
        } else if (type === 'capture') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(250, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        } else if (type === 'tick') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
            osc.start();
            osc.stop(ctx.currentTime + 0.05);
        } else if (type === 'win') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.15);
            osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
            osc.start();
            osc.stop(ctx.currentTime + 0.8);
        } else if (type === 'whoosh') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.35);
            gain.gain.setValueAtTime(0.01, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
        } else if (type === 'jackpot') {
            osc.disconnect();
            gain.disconnect();
            [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, idx) => {
                const subOsc = ctx.createOscillator();
                const subGain = ctx.createGain();
                subOsc.type = 'triangle';
                subOsc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
                subGain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.1);
                subGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.5);
                subOsc.connect(subGain);
                subGain.connect(ctx.destination);
                subOsc.onended = () => {
                    subOsc.disconnect();
                    subGain.disconnect();
                };
                subOsc.start(ctx.currentTime + idx * 0.1);
                subOsc.stop(ctx.currentTime + idx * 0.1 + 0.5);
            });
            return;
        } else if (type === 'coin') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(987.77, ctx.currentTime);
            osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.18, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } else {
            osc.disconnect();
            gain.disconnect();
        }
    } catch (e) {}
};

/* ===== core/toast.js ===== */
// ---------- نوتیف‌های سراسری (بالای صفحه، روی همه‌ی تب‌ها) ----------
// از هر جای برنامه صدا بزنید:  showToast({ id, type, title, text, duration, showTimer, actions })
//   type     : 'request' | 'waiting' | 'success' | 'error' | 'info'
//   duration : مدت نمایش به میلی‌ثانیه (پیش‌فرض ۵۰۰۰)
//   actions  : [{ label, variant: 'success'|'danger'|'neutral', onClick }]
const TOAST_EVENT = 'gq:toast';
const showToast = (toast) => window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { action: 'show', toast } }));
const hideToast = (id) => window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { action: 'hide', id } }));

/* ===== core/reactions.js ===== */
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

/* ===== core/dailyWheel.js ===== */
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

/* ===== core/admin.js ===== */
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

/* ===== components/AuthModal.jsx ===== */
const AuthModal = ({ onLoginSuccess }) => {
    const [mode, setMode] = useState('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const resetForm = (newMode) => {
        setMode(newMode);
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setError('');
        setSuccessMsg('');
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        const cleanUsername = username.trim();
        if (!cleanUsername)
            return setError('لطفاً نام کاربری را وارد کنید.');
        if (cleanUsername.length < 3)
            return setError('نام کاربری باید حداقل ۳ کاراکتر باشد.');
        if (!password || password.length < 4)
            return setError('رمز عبور باید حداقل ۴ نویسه باشد.');
        const users = getUsers();
        if (mode === 'register') {
            if (password !== confirmPassword)
                return setError('رمز عبور و تکرار آن یکسان نیستند.');
            if (users.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
                return setError('این نام کاربری قبلاً ثبت شده است. نام دیگری برگزینید.');
            }
            const newUser = {
                username: cleanUsername,
                passwordHash: hashPassword(password),
                coins: INITIAL_QJ_COINS,
                unlockedAvatars: [],
                createdAt: new Date().toISOString()
            };
            saveUsers([...users, normalizeUser(newUser)]);
            saveSession(newUser, rememberMe);
            setSuccessMsg(`ثبت‌‌نام با موفقیت انجام شد! ${INITIAL_QJ_COINS} کیوجی هدیه شروع دریافت کردید.`);
            setTimeout(() => onLoginSuccess(newUser), 400);
        }
        else {
            const user = users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
            if (!user)
                return setError('کاربری با این نام کاربری یافت نشد.');
            if (user.passwordHash !== hashPassword(password))
                return setError('رمز عبور وارد شده اشتباه است.');
            saveSession(user, rememberMe);
            setSuccessMsg('خوش آمدید! ورود موفقیت‌آمیز بود.');
            setTimeout(() => onLoginSuccess(user), 350);
        }
    };
    return (React.createElement("div", { className: "flex flex-col items-center justify-center min-h-[85vh] p-4 sm:p-6" },
        React.createElement("div", { className: "w-full max-w-md" },
            React.createElement("div", { className: "text-center mb-6 sm:mb-8" },
                React.createElement("div", { className: "inline-flex p-3 sm:p-4 rounded-3xl bg-indigo-500/20 border border-indigo-500/40 mb-3 shadow-xl" },
                    React.createElement(IconGamepad, { className: "w-10 h-10 sm:w-12 sm:h-12 text-indigo-400" })),
                React.createElement("h1", { className: "text-3xl sm:text-4xl font-black bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent" }, "GameQJ"),
                React.createElement("p", { className: "text-slate-400 mt-2 text-xs sm:text-sm" }, "\u067E\u0644\u062A\u0641\u0631\u0645 \u062C\u0627\u0645\u0639 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0631\u0648\u0645\u06CC\u0632\u06CC \u0648 \u0622\u0646\u0644\u0627\u06CC\u0646")),
            React.createElement("div", { className: "glass-panel p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl relative overflow-hidden" },
                React.createElement("div", { className: "flex bg-slate-900/80 p-1 rounded-xl sm:rounded-2xl mb-5 sm:mb-6 border border-slate-700/60" },
                    React.createElement("button", { type: "button", onClick: () => resetForm('login'), className: `flex-1 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all ${mode === 'login' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}` }, "\u0648\u0631\u0648\u062F \u0628\u0647 \u062D\u0633\u0627\u0628"),
                    React.createElement("button", { type: "button", onClick: () => resetForm('register'), className: `flex-1 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all ${mode === 'register' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}` }, "\u062B\u0628\u062A\u200C\u0646\u0627\u0645 \u062C\u062F\u06CC\u062F")),
                error && (React.createElement("div", { className: "mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs sm:text-sm font-medium flex items-center gap-2" },
                    React.createElement("span", null, "\u26A0\uFE0F"),
                    React.createElement("span", null, error))),
                successMsg && (React.createElement("div", { className: "mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-medium flex items-center gap-2" },
                    React.createElement("span", null, "\u2713"),
                    React.createElement("span", null, successMsg))),
                React.createElement("form", { onSubmit: handleSubmit, className: "space-y-4" },
                    React.createElement("div", null,
                        React.createElement("label", { className: "block text-[10px] sm:text-xs font-semibold text-slate-300 mb-1.5 mr-1" }, "\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC"),
                        React.createElement("div", { className: "relative" },
                            React.createElement("div", { className: "absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400" },
                                React.createElement(IconUserCircle, { className: "w-4 h-4 sm:w-5 sm:h-5" })),
                            React.createElement("input", { type: "text", value: username, onChange: (e) => setUsername(e.target.value), placeholder: "\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC (\u062D\u062F\u0627\u0642\u0644 \u06F3 \u062D\u0631\u0641)", className: "w-full pr-9 sm:pr-10 pl-4 py-2.5 sm:py-3 bg-slate-900/80 border border-slate-700/80 rounded-xl sm:rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs sm:text-sm", required: true }))),
                    React.createElement("div", null,
                        React.createElement("label", { className: "block text-[10px] sm:text-xs font-semibold text-slate-300 mb-1.5 mr-1" }, "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631"),
                        React.createElement("div", { className: "relative" },
                            React.createElement("div", { className: "absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400" },
                                React.createElement(IconLock, { className: "w-4 h-4 sm:w-5 sm:h-5" })),
                            React.createElement("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631", className: "w-full pr-9 sm:pr-10 pl-4 py-2.5 sm:py-3 bg-slate-900/80 border border-slate-700/80 rounded-xl sm:rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs sm:text-sm", required: true }))),
                    mode === 'register' && (React.createElement("div", null,
                        React.createElement("label", { className: "block text-[10px] sm:text-xs font-semibold text-slate-300 mb-1.5 mr-1" }, "\u062A\u06A9\u0631\u0627\u0631 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631"),
                        React.createElement("div", { className: "relative" },
                            React.createElement("div", { className: "absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400" },
                                React.createElement(IconLock, { className: "w-4 h-4 sm:w-5 sm:h-5" })),
                            React.createElement("input", { type: "password", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), placeholder: "\u062A\u06A9\u0631\u0627\u0631 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631", className: "w-full pr-9 sm:pr-10 pl-4 py-2.5 sm:py-3 bg-slate-900/80 border border-slate-700/80 rounded-xl sm:rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs sm:text-sm", required: true })))),
                    React.createElement("label", { className: "flex items-center gap-2 cursor-pointer pt-1" },
                        React.createElement("input", { type: "checkbox", checked: rememberMe, onChange: (e) => setRememberMe(e.target.checked), className: "w-3.5 h-3.5 sm:w-4 sm:h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 accent-indigo-500 cursor-pointer" }),
                        React.createElement("span", { className: "text-[10px] sm:text-xs text-slate-300 font-medium" }, "\u0645\u0631\u0627 \u0628\u0647 \u062E\u0627\u0637\u0631 \u0628\u0633\u067E\u0627\u0631")),
                    React.createElement("button", { type: "submit", className: "w-full py-3 sm:py-3.5 mt-2 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold rounded-xl sm:rounded-2xl shadow-lg shadow-indigo-600/30 active:scale-[0.98] transition-all text-sm" }, mode === 'login' ? 'ورود به بازی' : 'ایجاد حساب کاربری'))))));
};

/* ===== core/messages.js ===== */
// ---------- پیام‌رسان و سیستم حذف پیام پیشرفته ----------
const getMessages = () => {
    try {
        const messages = JSON.parse(localStorage.getItem(MESSAGES_KEY)) || [];
        return Array.isArray(messages) ? messages : [];
    } catch (error) { return []; }
};
const saveMessages = (messages) => localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));

const conversationMessages = (first, second, currentViewer) => {
    return getMessages().filter(message => {
        if (message.matchId) return false;
        const matchUser = (
            (message.senderUsername?.toLowerCase() === first.toLowerCase() && message.recipientUsername?.toLowerCase() === second.toLowerCase()) ||
            (message.senderUsername?.toLowerCase() === second.toLowerCase() && message.recipientUsername?.toLowerCase() === first.toLowerCase())
        );
        if (!matchUser) return false;
        const deletedFor = (message.deletedFor || []).map(u => u.toLowerCase());
        return !deletedFor.includes(currentViewer.toLowerCase());
    });
};

const matchMessages = (matchId, currentViewer) => {
    return getMessages().filter(message => {
        if (message.matchId !== matchId) return false;
        const deletedFor = (message.deletedFor || []).map(u => u.toLowerCase());
        return !deletedFor.includes(currentViewer.toLowerCase());
    });
};

const sendMessage = (senderUsername, text, recipientUsername = null, matchId = null) => {
    const value = text.trim();
    if (!value || value.length > 2000) return false;
    if (matchId) {
        const lobby = getLobbies().find(item => item.id === matchId);
        if (lobby && !lobby.participants.some(name => name.toLowerCase() === senderUsername.toLowerCase())) return false;
    } else if (recipientUsername && recipientUsername !== 'حریف هوش مصنوعی' && recipientUsername !== 'ربات') {
        const sender = findUser(senderUsername);
        const recipient = findUser(recipientUsername);
        if (!sender || !recipient || !sender.friends.some(name => name.toLowerCase() === recipientUsername.toLowerCase()) ||
            !recipient.friends.some(name => name.toLowerCase() === senderUsername.toLowerCase())) return false;
    }
    const message = {
        id: `${Date.now()}-${window.crypto?.randomUUID?.() || Math.random()}`,
        senderUsername,
        recipientUsername,
        matchId,
        text: value,
        createdAt: new Date().toISOString(),
        deletedFor: []
    };
    saveMessages([...getMessages(), message]);
    return message;
};

const deleteMessage = (messageId, forEveryone = false, currentUsername) => {
    const messages = getMessages();
    let updated;
    if (forEveryone) {
        updated = messages.filter(m => m.id !== messageId);
    } else {
        updated = messages.map(m => {
            if (m.id === messageId) {
                const currentDeleted = m.deletedFor || [];
                return {
                    ...m,
                    deletedFor: [...new Set([...currentDeleted, currentUsername.toLowerCase()])]
                };
            }
            return m;
        });
    }
    saveMessages(updated);
};

/* ===== core/gameClock.js ===== */
const gameClockStart = (key) => {
    const stored = Number(localStorage.getItem(key));
    if (stored > 0) return stored;
    const now = Date.now();
    localStorage.setItem(key, String(now));
    return now;
};
const chessClockRemaining = (startedAt, moves, now) => {
    const remaining = { w: 720000, b: 720000 };
    let previous = startedAt;
    let active = 'w';
    for (const timestamp of moves) {
        const at = Math.max(previous, timestamp);
        remaining[active] = Math.max(0, remaining[active] - (at - previous));
        previous = at;
        active = active === 'w' ? 'b' : 'w';
    }
    remaining[active] = Math.max(0, remaining[active] - Math.max(0, now - previous));
    return { ...remaining, active };
};
const formatGameTime = (milliseconds) => {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
};

/* ===== components/FriendInvitePicker.jsx ===== */
const FriendInvitePicker = ({ names, selected, onChange }) => {
    const [query, setQuery] = useState('');
    const visibleNames = names.filter(name => name.toLowerCase().includes(query.trim().toLowerCase()));
    return React.createElement("section", { className: "gq-invite-picker", dir: "rtl" },
        React.createElement("div", { className: "flex items-center justify-between gap-3 mb-3" },
            React.createElement("strong", { className: "text-white" }, "\u0647\u0645\u200C\u062A\u06CC\u0645\u06CC\u200C\u0647\u0627 \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646"),
            React.createElement("span", { className: "text-xs text-indigo-300" },
                selected.length,
                " \u0646\u0641\u0631 \u0627\u0646\u062A\u062E\u0627\u0628 \u0634\u062F\u0647")),
        React.createElement("input", { className: "gq-friend-search", "aria-label": "\u062C\u0633\u062A\u062C\u0648\u06CC \u062F\u0648\u0633\u062A\u0627\u0646", placeholder: "\u062C\u0633\u062A\u062C\u0648\u06CC \u0646\u0627\u0645 \u062F\u0648\u0633\u062A\u2026", value: query, onChange: event => setQuery(event.target.value) }),
        React.createElement("div", { className: "gq-friend-grid custom-scrollbar" },
            visibleNames.map(name => {
                const u = findUser(name);
                return (React.createElement("label", { key: name, className: "gq-friend-card " + (selected.includes(name) ? "is-selected" : "") },
                    React.createElement("input", { type: "checkbox", checked: selected.includes(name), onChange: () => onChange(selected.includes(name) ? selected.filter(item => item !== name) : [...selected, name]) }),
                    React.createElement(PlayerAvatar, { user: u, className: "w-11 h-11 rounded-xl shrink-0" }),
                    React.createElement("span", { className: "min-w-0 flex-1 flex flex-col justify-center" },
                        React.createElement("strong", { className: "block truncate text-sm" }, name),
                        u?.equipped?.titles && u.equipped.titles !== 'classic' && (React.createElement("div", { className: "origin-right transform scale-75 -mt-1 text-right" }, renderPlayerTitle(u.equipped.titles))),
                        React.createElement("small", { className: "text-slate-400 mt-0.5" }, selected.includes(name) ? 'آمادهٔ دعوت ✓' : 'برای دعوت انتخاب کن'))));
            }),
            !visibleNames.length && React.createElement("p", { className: "p-4 text-sm text-slate-400" }, "\u062F\u0648\u0633\u062A\u06CC \u0628\u0631\u0627\u06CC \u0646\u0645\u0627\u06CC\u0634 \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F.")));
};

/* ===== components/PlayerProfile.jsx ===== */
// ---------- رندر قاب و عنوان ----------
// تمام افکت‌های قاب فرزند مستقیم محدودهٔ بریده‌شدهٔ آواتار هستند.
const renderAvatarFrame = (frameId) => {
    if (!frameId || frameId === 'classic')
        return null;
    const frameClasses = {
        classic: null,
        neon_pulse: 'frame-neon-edge',
        fire_ring: 'frame-ember',
        lightning: 'frame-void',
        diamond: 'frame-prismatic',
        hacker: 'frame-cyber',
        gold_crown: 'frame-imperial'
    };
    const frameClass = frameClasses[frameId];
    if (!frameClass)
        return null;
    return (React.createElement(React.Fragment, null,
        React.createElement("div", { className: `avatar-frame-overlay ${frameClass}`, "aria-hidden": "true" },
            frameId === 'fire_ring' && React.createElement(React.Fragment, null,
                React.createElement("i", { className: "pf-ember-particle", style: { left: '24%', animationDelay: '0.15s' } }),
                React.createElement("i", { className: "pf-ember-particle", style: { left: '48%', animationDelay: '1.05s', animationDuration: '2s' } }),
                React.createElement("i", { className: "pf-ember-particle", style: { left: '74%', animationDelay: '0.55s', animationDuration: '2.9s' } })),
            frameId === 'lightning' && React.createElement(React.Fragment, null,
                React.createElement("i", { className: "pf-void-star void-star-one" }),
                React.createElement("i", { className: "pf-void-star void-star-two" })),
            frameId === 'diamond' && React.createElement(React.Fragment, null,
                React.createElement("i", { className: "pf-diamond-spark", style: { top: '8%', left: '18%', animationDelay: '0.2s' } }),
                React.createElement("i", { className: "pf-diamond-spark", style: { top: '74%', right: '13%', animationDelay: '1.1s' } }),
                React.createElement("i", { className: "pf-diamond-spark", style: { bottom: '8%', left: '43%', animationDelay: '1.7s' } })),
            frameId === 'hacker' && React.createElement(React.Fragment, null,
                React.createElement("i", { className: "frame-cyber-corner cyber-tl" }),
                React.createElement("i", { className: "frame-cyber-corner cyber-tr" }),
                React.createElement("i", { className: "frame-cyber-corner cyber-bl" }),
                React.createElement("i", { className: "frame-cyber-corner cyber-br" }),
                React.createElement("span", { className: "frame-cyber-scanline" }),
                React.createElement("span", { className: "pf-hud-badge top-1 left-1.5" }, "SYS"),
                React.createElement("span", { className: "pf-hud-badge bottom-1 right-1.5" }, "LIVE"))),
        frameId === 'gold_crown' && React.createElement("span", { className: "pf-crown-mark", "aria-hidden": "true" }, "\u265B")));
};
const renderPlayerTitle = (titleId) => {
    if (!titleId || titleId === 'classic')
        return null;
    const titles = {
        shadow_hunter: { text: 'شکارچی سایه', cls: 'title-shadow-hunter' },
        god_of_dice: { text: 'خدای تاس', cls: 'title-god-of-dice' },
        ruthless: { text: 'بی‌رحم', cls: 'title-ruthless' },
        veteran: { text: 'کهنه‌کار', cls: 'title-veteran' },
        grandmaster: { text: 'استاد بزرگ', cls: 'title-grandmaster' }
    };
    const title = titles[titleId];
    if (!title)
        return null;
    return React.createElement("div", { className: "mt-1.5 text-[11px] sm:text-xs flex justify-center" },
        React.createElement("span", { className: `player-title-badge ${title.cls}` }, title.text));
};
const PlayerAvatar = ({ user, className = 'w-10 h-10' }) => {
    const frameId = user?.equipped?.frames;
    return (React.createElement("div", { className: `avatar-frame-scope ${frameId === 'gold_crown' ? 'avatar-frame-scope-imperial' : 'relative isolate overflow-hidden'} rounded-2xl ${className} shrink-0` },
        React.createElement("span", { className: "absolute inset-0 z-0 rounded-[inherit] bg-indigo-600/30 border border-indigo-400/40 overflow-hidden flex items-center justify-center text-indigo-200" }, user?.avatar ? React.createElement("img", { src: user.avatar, alt: `آواتار ${user.username}`, className: "w-full h-full object-cover" }) : React.createElement(IconUserCircle, { className: "w-2/3 h-2/3" })),
        renderAvatarFrame(frameId)));
};
const PlayerProfileModal = ({ username, onClose }) => {
    const player = findUser(username);
    if (!player)
        return null;
    return (React.createElement("div", { className: "fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4", onClick: onClose, dir: "rtl" },
        React.createElement("div", { role: "dialog", "aria-modal": "true", className: "relative glass-panel w-full max-w-sm rounded-3xl p-6 shadow-[0_0_40px_rgba(99,102,241,0.2)] border border-indigo-400/30 animate-in zoom-in-95 duration-300", onClick: event => event.stopPropagation() },
            React.createElement("button", { onClick: onClose, "aria-label": "\u0628\u0633\u062A\u0646", className: "absolute top-5 left-5 w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors" }, "\u2715"),
            React.createElement("div", { className: "flex flex-col items-center gap-2 mt-4" },
                React.createElement(PlayerAvatar, { user: player, className: "w-24 h-24 rounded-[1.5rem]" }),
                React.createElement("div", { className: "mt-4 text-center" },
                    React.createElement("h3", { className: "text-2xl font-black text-white" }, player.username),
                    React.createElement("div", { className: "transform scale-110 origin-top mt-1" }, renderPlayerTitle(player.equipped?.titles))),
                React.createElement("div", { className: "flex items-center gap-1.5 px-4 py-1.5 mt-2 bg-amber-500/15 text-amber-300 border border-amber-500/40 rounded-full font-black text-sm shadow-inner" },
                    React.createElement(IconCoin, { className: "w-4 h-4" }),
                    React.createElement("span", null,
                        player.coins?.toLocaleString('fa-IR') ?? 0,
                        " \u06A9\u06CC\u0648\u062C\u06CC"))),
            React.createElement("div", { className: "grid grid-cols-3 gap-3 mt-8 text-center" }, [['بازی', player.stats.games], ['برد', player.stats.wins], ['باخت', player.stats.losses]].map(([label, value]) => React.createElement("div", { key: label, className: "bg-slate-900/60 border border-slate-700/50 rounded-2xl p-3 shadow-sm hover:border-indigo-500/40 transition-colors" },
                React.createElement("div", { className: "text-indigo-300 font-black text-2xl drop-shadow-md" }, value),
                React.createElement("div", { className: "text-slate-400 text-xs font-bold mt-1" }, label)))))));
};

/* ===== components/ChatPanel.jsx ===== */
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
        const handleStorage = event => { if (event.key === MESSAGES_KEY)
            refresh(); };
        window.addEventListener('storage', handleStorage);
        const timer = setInterval(refresh, 1500);
        return () => { window.removeEventListener('storage', handleStorage); clearInterval(timer); };
    }, [refresh]);
    useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [messages.length]);
    const submit = event => {
        event.preventDefault();
        if (!draft.trim())
            return;
        try {
            const sent = sendMessage(currentUser.username, draft, peerName, matchId);
            if (!sent)
                throw new Error('ارسال پیام ممکن نیست.');
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
        }
        catch (failure) {
            setError(failure.message || 'خطا در ارسال پیام.');
        }
    };
    const handleConfirmDelete = (forEveryone) => {
        if (!pendingDeleteMsg)
            return;
        deleteMessage(pendingDeleteMsg.id, forEveryone, currentUser.username);
        setPendingDeleteMsg(null);
        refresh();
    };
    // فیلتر کردن پیام‌های سیستمی (شروع با __)
    const displayMessages = messages.filter(m => !m.text.startsWith('__'));
    return (React.createElement("section", { className: `glass-panel rounded-3xl ${isCompact ? 'p-3' : 'p-4 sm:p-5'} flex flex-col gap-3 w-full relative` },
        React.createElement("div", { className: "flex items-center justify-between border-b border-slate-700/60 pb-3" },
            React.createElement("div", { className: "flex items-center gap-2" },
                React.createElement(IconMessageSquare, { className: "w-5 h-5 text-indigo-300" }),
                React.createElement("h3", { className: "font-black text-white text-sm sm:text-base" }, matchId ? 'گفتگوی زنده مسابقه' : `گفتگو با ${peerName}`)),
            !matchId && peerName && findUser(peerName) && (React.createElement("button", { onClick: () => onOpenProfile(peerName), className: "text-indigo-300 hover:text-white text-xs font-bold" }, "\u0645\u0634\u0627\u0647\u062F\u0647 \u067E\u0631\u0648\u0641\u0627\u06CC\u0644"))),
        React.createElement("div", { role: "log", "aria-live": "polite", className: `${isCompact ? 'h-48' : 'h-64'} overflow-y-auto custom-scrollbar space-y-2.5 p-2 bg-slate-950/40 rounded-2xl` },
            displayMessages.length === 0 && (React.createElement("p", { className: "text-center text-slate-500 text-xs pt-16" }, "\u0647\u0646\u0648\u0632 \u067E\u06CC\u0627\u0645\u06CC \u0627\u0631\u0633\u0627\u0644 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A. \u0627\u0648\u0644\u06CC\u0646 \u067E\u06CC\u0627\u0645 \u0631\u0627 \u0627\u0631\u0633\u0627\u0644 \u06A9\u0646\u06CC\u062F! \uD83D\uDCAC")),
            displayMessages.map(message => {
                const isMe = message.senderUsername.toLowerCase() === currentUser.username.toLowerCase();
                return (React.createElement("div", { key: message.id, className: `group flex ${isMe ? 'justify-start' : 'justify-end'} items-start gap-1.5` },
                    isMe && (React.createElement("button", { onClick: () => setPendingDeleteMsg(message), className: "opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-500 hover:text-rose-400 mt-1", title: "\u062D\u0630\u0641 \u067E\u06CC\u0627\u0645" },
                        React.createElement(IconTrash, { className: "w-3.5 h-3.5" }))),
                    React.createElement("div", { className: `max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words relative ${isMe ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/20' : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700/60'}` },
                        !isMe && (React.createElement("span", { className: "block font-bold text-amber-300 text-xs mb-1" }, message.senderUsername)),
                        React.createElement("span", { className: "leading-relaxed" }, message.text),
                        React.createElement("time", { className: "block text-[10px] opacity-60 mt-1 text-left", dir: "ltr", dateTime: message.createdAt }, new Date(message.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }))),
                    !isMe && (React.createElement("button", { onClick: () => setPendingDeleteMsg(message), className: "opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-500 hover:text-rose-400 mt-1", title: "\u062D\u0630\u0641 \u067E\u06CC\u0627\u0645 \u0628\u0631\u0627\u06CC \u0645\u0646" },
                        React.createElement(IconTrash, { className: "w-3.5 h-3.5" })))));
            }),
            React.createElement("div", { ref: endRef })),
        React.createElement("form", { onSubmit: submit, className: "flex gap-2" },
            React.createElement("input", { value: draft, maxLength: 2000, onChange: event => setDraft(event.target.value), placeholder: "\u067E\u06CC\u0627\u0645 \u0628\u0646\u0648\u06CC\u0633\u06CC\u062F\u2026 \uD83D\uDE0A", className: "flex-1 min-w-0 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:border-indigo-400 transition-all" }),
            React.createElement("button", { type: "submit", disabled: !draft.trim(), className: "game-action px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 disabled:opacity-50 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md" }, "\u0627\u0631\u0633\u0627\u0644")),
        error && React.createElement("p", { role: "alert", className: "text-rose-300 text-xs" }, error),
        pendingDeleteMsg && (React.createElement("div", { className: "absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md rounded-3xl p-4 flex flex-col items-center justify-center text-center animate-in fade-in" },
            React.createElement("div", { className: "p-3 bg-rose-500/20 text-rose-300 rounded-2xl mb-3" },
                React.createElement(IconTrash, { className: "w-6 h-6" })),
            React.createElement("h4", { className: "font-bold text-white text-sm mb-1" }, "\u062D\u0630\u0641 \u067E\u06CC\u0627\u0645"),
            pendingDeleteMsg.senderUsername.toLowerCase() === currentUser.username.toLowerCase() ? (React.createElement(React.Fragment, null,
                React.createElement("p", { className: "text-xs text-slate-300 mb-4 leading-5" }, "\u0622\u06CC\u0627 \u0645\u06CC\u200C\u062E\u0648\u0627\u0647\u06CC\u062F \u0627\u06CC\u0646 \u067E\u06CC\u0627\u0645 \u0628\u0631\u0627\u06CC \u0637\u0631\u0641 \u0645\u0642\u0627\u0628\u0644 \u0647\u0645 \u067E\u0627\u06A9 \u0634\u0648\u062F \u06CC\u0627 \u0641\u0642\u0637 \u0628\u0631\u0627\u06CC \u062E\u0648\u062F\u062A\u0627\u0646\u061F"),
                React.createElement("div", { className: "flex flex-col gap-2 w-full max-w-xs" },
                    React.createElement("button", { onClick: () => handleConfirmDelete(true), className: "py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md" }, "\u062D\u0630\u0641 \u0628\u0631\u0627\u06CC \u0647\u0631 \u062F\u0648 \u0646\u0641\u0631"),
                    React.createElement("button", { onClick: () => handleConfirmDelete(false), className: "py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all" }, "\u062D\u0630\u0641 \u0641\u0642\u0637 \u0628\u0631\u0627\u06CC \u0645\u0646"),
                    React.createElement("button", { onClick: () => setPendingDeleteMsg(null), className: "py-1 text-slate-400 hover:text-white text-xs mt-1" }, "\u0627\u0646\u0635\u0631\u0627\u0641")))) : (React.createElement(React.Fragment, null,
                React.createElement("p", { className: "text-xs text-slate-300 mb-4 leading-5" }, "\u0627\u06CC\u0646 \u067E\u06CC\u0627\u0645 \u0641\u0631\u0633\u062A\u0627\u062F\u0647\u200C\u0634\u062F\u0647 \u062A\u0648\u0633\u0637 \u062D\u0631\u06CC\u0641 \u0627\u0633\u062A. \u0645\u0627\u06CC\u0644\u06CC\u062F \u0641\u0642\u0637 \u0627\u0632 \u062F\u06CC\u062F \u0634\u0645\u0627 \u062D\u0630\u0641 \u0634\u0648\u062F\u061F"),
                React.createElement("div", { className: "flex gap-2 w-full max-w-xs" },
                    React.createElement("button", { onClick: () => handleConfirmDelete(false), className: "flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md" }, "\u0628\u0644\u0647\u060C \u062D\u0630\u0641 \u06A9\u0646"),
                    React.createElement("button", { onClick: () => setPendingDeleteMsg(null), className: "flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold" }, "\u0627\u0646\u0635\u0631\u0627\u0641"))))))));
};

/* ===== components/InGameChatDrawer.jsx ===== */
const InGameChatDrawer = ({ currentUser, matchId, peerName = 'حریف', onOpenProfile }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const lastMessageCountRef = useRef(0);
    useEffect(() => {
        if (!matchId)
            return;
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
        const onPanel = (e) => { if (e.detail !== 'chat')
            setIsOpen(false); };
        window.addEventListener('gq:panel-open', onPanel);
        return () => window.removeEventListener('gq:panel-open', onPanel);
    }, []);
    const toggleChat = () => {
        const nextState = !isOpen;
        if (nextState)
            window.dispatchEvent(new CustomEvent('gq:panel-open', { detail: 'chat' }));
        setIsOpen(nextState);
        setHasUnread(false);
        const msgs = getMessages().filter(m => m.matchId === matchId && !m.text.startsWith('__'));
        lastMessageCountRef.current = msgs.length;
    };
    return ReactDOM.createPortal(React.createElement("div", { className: "gq-floating-chat", dir: "rtl" },
        React.createElement("div", { className: "flex justify-between items-center mb-2 relative" },
            React.createElement("button", { onClick: toggleChat, "aria-expanded": isOpen, className: "game-action w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600/80 to-purple-600/80 hover:from-indigo-600 hover:to-purple-600 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-indigo-400/30 shadow-lg relative" },
                React.createElement(IconMessageSquare, { className: "w-4 h-4" }),
                React.createElement("span", null, isOpen ? 'بستن گفتگوی بازی' : 'گفتگوی مسابقه'),
                !isOpen && hasUnread && (React.createElement("span", { className: "absolute top-1 right-1 flex h-3 w-3" },
                    React.createElement("span", { className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" }),
                    React.createElement("span", { className: "relative inline-flex rounded-full h-3 w-3 bg-rose-500" }))))),
        isOpen && (React.createElement("div", { className: "mt-3 animate-in fade-in zoom-in-95 duration-200" },
            React.createElement(ChatPanel, { key: `chat-${matchId}`, currentUser: currentUser, peerName: peerName, matchId: matchId, onOpenProfile: onOpenProfile, isCompact: true })))), document.body);
};

/* ===== components/ReactionLayer.jsx ===== */
// ---------- لایه‌ی نمایش واکنش‌ها: پرواز آیتم از پروفایل فرستنده تا پروفایل هدف + افکت برخورد ----------
// فقط روی یک لایه‌ی ثابتِ بدون کلیک (pointer-events: none) رسم می‌شود و DOM بازی را تغییر نمی‌دهد
// (تنها یک کلاسِ انیمیشنیِ موقتی روی آواتار هدف می‌نشیند و پس از پایان برداشته می‌شود).
const findReactionAnchor = (name) => {
    if (!name)
        return null;
    const nodes = document.querySelectorAll('[data-gq-player]');
    for (const node of nodes) {
        if (node.getAttribute('data-gq-player') !== name)
            continue;
        const r = node.getBoundingClientRect();
        if (r.width > 0 && r.height > 0)
            return node;
    }
    return null;
};
const makeParticles = (kind) => {
    const rnd = (a, b) => a + Math.random() * (b - a);
    const list = [];
    if (kind === 'hearts') {
        for (let i = 0; i < 9; i++)
            list.push({ ch: ['❤️', '💖', '💕', '🌹'][i % 4], x: rnd(-40, 40), delay: rnd(0, 1.1), size: rnd(14, 24), sway: rnd(-18, 18) });
    }
    else if (kind === 'confetti') {
        const colors = ['#f43f5e', '#f59e0b', '#22c55e', '#38bdf8', '#a855f7', '#fde047'];
        for (let i = 0; i < 26; i++) {
            const a = rnd(0, Math.PI * 2), d = rnd(50, 120);
            list.push({ c: colors[i % colors.length], dx: Math.cos(a) * d, dy: Math.sin(a) * d - 30, rot: rnd(-540, 540), delay: rnd(0, 0.18), w: rnd(5, 9), h: rnd(8, 14) });
        }
    }
    else if (kind === 'boom') {
        for (let i = 0; i < 6; i++)
            list.push({ dx: rnd(-45, 45), dy: rnd(-90, -30), delay: rnd(0.55, 1), size: rnd(18, 32) });
    }
    else if (kind === 'cream') {
        const colors = ['#f43f5e', '#facc15', '#38bdf8', '#22c55e', '#f472b6'];
        for (let i = 0; i < 12; i++) {
            const a = rnd(0, Math.PI * 2), d = rnd(30, 70);
            list.push({ c: colors[i % colors.length], dx: Math.cos(a) * d, dy: Math.sin(a) * d - 20, delay: rnd(0, 0.15) });
        }
    }
    else if (kind === 'bonk') {
        for (let i = 0; i < 3; i++)
            list.push({ ch: '💫', angle: i * 120 });
    }
    else if (kind === 'freeze') {
        for (let i = 0; i < 7; i++)
            list.push({ ch: i % 2 ? '❄️' : '✨', x: rnd(-45, 45), y: rnd(-40, 40), delay: rnd(0, 1.4), size: rnd(11, 18) });
    }
    return list;
};
const ReactionEffect = ({ event, onDone }) => {
    const item = REACTION_ITEMS.find(entry => entry.id === event.item);
    const projRef = useRef(null);
    const overlayRef = useRef(null);
    const [phase, setPhase] = useState('fly');
    const [geo, setGeo] = useState(null);
    const parts = useMemo(() => makeParticles(item ? item.impact : ''), []);
    useEffect(() => {
        if (!item) {
            onDone(event.id);
            return;
        }
        const me = reactionRuntime.me;
        let dstEl = findReactionAnchor(event.to);
        let srcEl = findReactionAnchor(event.from);
        if (!dstEl || document.querySelector('.gq-vs-root')) {
            if (event.to === me)
                showToast({ id: `react-${event.id}`, type: 'invite', title: `«${event.from}» برایتان ${item.name} پرتاب کرد ${item.emoji}`, text: '', duration: 2600 });
            onDone(event.id);
            return;
        }
        const centerOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };
        // اگر عنصر از DOM رفت یا پنهان شد (رندر دوباره / تغییر تب)، دوباره پیدا می‌شود
        const live = (el, name) => (el && el.isConnected && el.getBoundingClientRect().width > 0 ? el : findReactionAnchor(name));
        const first = centerOf(dstEl);
        const size = Math.max(70, Math.min(116, Math.max(first.w, first.h)));
        setGeo({ x: first.x, y: first.y, size });
        const soundOn = !((findUser(me) || {}).settings && findUser(me).settings.sound === false);
        reactionSound('whoosh', soundOn);
        const spin = (Math.random() > 0.5 ? 1 : -1) * (540 + Math.random() * 360);
        const sideOffset = Math.random() * 240 - 120;
        const flightMs = item.flight === 'drop' ? 520 : 780;
        const t0 = performance.now();
        let raf = 0, impactAt = 0, finished = false;
        const guard = setTimeout(() => finish(), flightMs + item.ms + 4000); // اگر تب در پس‌زمینه بود، لایه گیر نکند
        function finish() {
            if (finished)
                return;
            finished = true;
            cancelAnimationFrame(raf);
            clearTimeout(guard);
            if (item.targetClass && dstEl)
                dstEl.classList.remove(item.targetClass);
            onDone(event.id);
        }
        // هر فریم موقعیت پروفایل‌ها دوباره خوانده می‌شود؛ پس با اسکرول صفحه، آیتم و افکت روی پروفایل می‌مانند
        const frame = (now) => {
            if (finished)
                return;
            dstEl = live(dstEl, event.to);
            srcEl = live(srcEl, event.from);
            const proj = projRef.current, ov = overlayRef.current;
            if (!dstEl) {
                if (proj)
                    proj.style.visibility = 'hidden';
                if (ov)
                    ov.style.visibility = 'hidden';
                raf = requestAnimationFrame(frame);
                return;
            }
            const dst = centerOf(dstEl);
            if (!impactAt) {
                const t = Math.min(1, (now - t0) / flightMs);
                const e = 1 - Math.pow(1 - t, 2);
                let x, y, rot, sc;
                if (item.flight === 'drop') {
                    const fx = dst.x + 14, fy = dst.y - 190;
                    x = fx + (dst.x - fx) * e * e;
                    y = fy + (dst.y - fy) * e * e;
                    rot = -70 + 95 * t;
                    sc = 1.5 - 0.5 * t;
                }
                else {
                    const s = srcEl ? centerOf(srcEl) : { x: dst.x + sideOffset, y: window.innerHeight + 50 };
                    const arc = item.flight === 'low' ? 36 : Math.min(220, 90 + Math.hypot(dst.x - s.x, dst.y - s.y) * 0.28);
                    x = s.x + (dst.x - s.x) * e;
                    y = s.y + (dst.y - s.y) * e - arc * 4 * e * (1 - e);
                    rot = spin * e;
                    sc = 0.7 + 0.7 * Math.sin(Math.PI * e) + 0.25 * e;
                }
                if (proj) {
                    proj.style.visibility = 'visible';
                    proj.style.opacity = String(Math.min(1, 0.25 + t * 3));
                    proj.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${rot}deg) scale(${sc})`;
                }
                if (t >= 1) {
                    impactAt = now;
                    setPhase('impact');
                    reactionSound(item.sound, soundOn);
                    if (item.targetClass)
                        dstEl.classList.add(item.targetClass);
                }
            }
            else {
                if (ov) {
                    ov.style.visibility = 'visible';
                    ov.style.left = `${dst.x - size / 2}px`;
                    ov.style.top = `${dst.y - size / 2}px`;
                }
                if (now - impactAt >= item.ms) {
                    finish();
                    return;
                }
            }
            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        return () => { finished = true; cancelAnimationFrame(raf); clearTimeout(guard); if (item.targetClass && dstEl)
            dstEl.classList.remove(item.targetClass); };
    }, []);
    if (!item)
        return null;
    const P = (i, style, child) => React.createElement("span", { key: i, className: "gq-p", style: style }, child);
    let inner = null;
    const k = item.impact;
    if (k === 'egg' || k === 'tomato') {
        inner = (React.createElement("div", { className: `gq-splat gq-splat-${k}` },
            React.createElement("span", { className: "gq-splat-blob" }),
            k === 'egg' && React.createElement("span", { className: "gq-yolk" }),
            k === 'tomato' && [0, 1, 2, 3, 4].map(i => React.createElement("span", { key: i, className: "gq-seed", style: { left: `${30 + i * 10}%`, top: `${34 + (i % 2) * 18}%` } })),
            [22, 48, 70].map((left, i) => React.createElement("i", { key: i, className: "gq-drip", style: { left: `${left}%`, '--h': `${34 + i * 9}%`, animationDelay: `${0.45 + i * 0.25}s` } }))));
    }
    else if (k === 'cream') {
        inner = (React.createElement("div", { className: "gq-splat gq-splat-cream" },
            React.createElement("span", { className: "gq-splat-blob" }),
            React.createElement("span", { className: "gq-cherry" }, "\uD83C\uDF52"),
            parts.map((p, i) => P(i, { '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--rot': '200deg', '--dur': '.9s', '--delay': `${p.delay}s`, width: 7, height: 7, borderRadius: 9999, background: p.c })),
            [24, 52, 74].map((left, i) => React.createElement("i", { key: i, className: "gq-drip", style: { left: `${left}%`, '--h': `${30 + i * 8}%`, animationDelay: `${0.5 + i * 0.25}s` } }))));
    }
    else if (k === 'slip') {
        inner = (React.createElement("div", { className: "gq-slip" },
            React.createElement("span", { className: "gq-slip-peel" }, "\uD83C\uDF4C"),
            React.createElement("span", { className: "gq-slip-stars" }, "\uD83D\uDCAB"),
            React.createElement("span", { className: "gq-comic" }, "\u0627\u06CC\u06CC\u06CC\u06CC!")));
    }
    else if (k === 'hearts') {
        inner = (React.createElement("div", { className: "gq-hearts" },
            React.createElement("span", { className: "gq-glow-pink" }),
            parts.map((p, i) => P(i, { '--x': `${p.x}px`, '--sway': `${p.sway}px`, '--delay': `${p.delay}s`, fontSize: p.size, animation: `gqHeartUp 2.1s ease-out ${p.delay}s both` }, p.ch))));
    }
    else if (k === 'confetti') {
        inner = (React.createElement("div", { className: "gq-confetti" },
            React.createElement("span", { className: "gq-pop-emoji" }, "\uD83C\uDF8A"),
            parts.map((p, i) => P(i, { '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--rot': `${p.rot}deg`, '--dur': '1.6s', '--delay': `${p.delay}s`, width: p.w, height: p.h, background: p.c, borderRadius: 2 }))));
    }
    else if (k === 'bonk') {
        inner = (React.createElement("div", { className: "gq-bonk" },
            React.createElement("span", { className: "gq-shock" }),
            React.createElement("span", { className: "gq-comic gq-comic-big" }, "\u0628\u0648\u0646\u06AF!"),
            React.createElement("span", { className: "gq-orbit" }, parts.map((p, i) => React.createElement("span", { key: i, style: { transform: `rotate(${p.angle}deg) translateX(34px)` } }, p.ch)))));
    }
    else if (k === 'freeze') {
        inner = (React.createElement("div", { className: "gq-freeze" },
            React.createElement("span", { className: "gq-ice" }),
            parts.map((p, i) => P(i, { left: `calc(50% + ${p.x}px)`, top: `calc(50% + ${p.y}px)`, fontSize: p.size, animation: `gqTwinkle 1.4s ease-in-out ${p.delay}s infinite` }, p.ch)),
            React.createElement("span", { className: "gq-comic gq-comic-cold" }, "\u0628\u0631\u0631\u0631\u0631!")));
    }
    else if (k === 'boom') {
        inner = (React.createElement("div", { className: "gq-boom" },
            React.createElement("span", { className: "gq-flash" }),
            React.createElement("span", { className: "gq-shock gq-shock-fire" }),
            React.createElement("span", { className: "gq-soot" }),
            React.createElement("span", { className: "gq-boom-emoji" }, "\uD83D\uDCA5"),
            parts.map((p, i) => P(i, { '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--rot': '60deg', '--dur': '1.6s', '--delay': `${p.delay}s`, fontSize: p.size }, '💨')),
            React.createElement("span", { className: "gq-comic gq-comic-big gq-comic-fire" }, "\u0628\u0648\u0648\u0645!")));
    }
    return (React.createElement(Fragment, null,
        React.createElement("span", { ref: projRef, className: "gq-fx-proj", style: { display: phase === 'fly' ? 'block' : 'none', visibility: 'hidden' } }, item.emoji),
        phase === 'impact' && geo && (React.createElement("div", { ref: overlayRef, className: "gq-fx", style: { left: geo.x - geo.size / 2, top: geo.y - geo.size / 2, width: geo.size, height: geo.size, '--ms': `${item.ms}ms` } },
            inner,
            React.createElement("span", { className: "gq-fx-from" }, event.from)))));
};
const ReactionLayer = () => {
    const [active, setActive] = useState([]);
    const queueRef = useRef([]);
    const activeRef = useRef([]);
    const seenRef = useRef(new Set());
    const pump = useCallback(() => {
        while (activeRef.current.length < REACTION_MAX_CONCURRENT && queueRef.current.length)
            activeRef.current = [...activeRef.current, queueRef.current.shift()];
        setActive(activeRef.current);
    }, []);
    const done = useCallback((id) => { activeRef.current = activeRef.current.filter(entry => entry.id !== id); pump(); }, [pump]);
    const enqueue = useCallback((event) => {
        if (!event || !event.id || seenRef.current.has(event.id))
            return;
        seenRef.current.add(event.id);
        if (seenRef.current.size > 300)
            seenRef.current = new Set([...seenRef.current].slice(-150));
        if (Date.now() - event.at > REACTION_MAX_AGE_MS)
            return;
        if (!reactionRuntime.matchId || event.matchId !== reactionRuntime.matchId)
            return;
        if (event.from !== reactionRuntime.me && isReactionMuted())
            return; // بازیکن نمایش واکنش‌های دیگران را خاموش کرده
        queueRef.current.push(event);
        if (queueRef.current.length > 6)
            queueRef.current.shift(); // صفِ طولانی ساخته نمی‌شود
        pump();
    }, [pump]);
    useEffect(() => {
        const scan = () => readReactionLog().forEach(event => { if (event.from !== reactionRuntime.me)
            enqueue(event); });
        const onLocal = (e) => enqueue(e.detail);
        const onStorage = (e) => { if (e.key === REACTIONS_KEY)
            scan(); };
        window.addEventListener('gq:reaction', onLocal);
        window.addEventListener('storage', onStorage);
        const timer = setInterval(scan, 2000);
        return () => { window.removeEventListener('gq:reaction', onLocal); window.removeEventListener('storage', onStorage); clearInterval(timer); };
    }, [enqueue]);
    return ReactDOM.createPortal(React.createElement("div", { className: "gq-fx-root", "aria-hidden": "true" }, active.map(event => React.createElement(ReactionEffect, { key: event.id, event: event, onDone: done }))), document.body);
};

/* ===== components/ReactionTray.jsx ===== */
// ---------- دکمه و منوی پرتاب واکنش (شناور، گوشه‌ی پایین-راست) ----------
const ReactionTray = ({ matchId, currentUser, targets = [], onUserUpdated, hidden = false }) => {
    const [open, setOpen] = useState(false);
    const [targetName, setTargetName] = useState('');
    const [cool, setCool] = useState(0);
    const [msg, setMsg] = useState('');
    const [muted, setMuted] = useState(isReactionMuted());
    const [visible, setVisible] = useState(true);
    const sentinelRef = useRef(null);
    const target = targets.find(t => t.name === targetName) || targets[0];
    // ثبت مسابقه‌ی فعلی برای لایه‌ی نمایش
    useEffect(() => {
        setReactionSession(matchId, currentUser.username);
        return () => setReactionSession(null, null);
    }, [matchId, currentUser.username]);
    // شمارش معکوس cooldown + نمایش فقط وقتی تبِ بازی دیده می‌شود
    useEffect(() => {
        const timer = setInterval(() => {
            setCool(reactionCooldownLeft(currentUser.username));
            setVisible(!!sentinelRef.current && sentinelRef.current.offsetParent !== null);
        }, 250);
        return () => clearInterval(timer);
    }, [currentUser.username]);
    const throwItem = (item) => {
        if (!target)
            return;
        const result = sendReaction({ matchId, from: currentUser.username, to: target.name, itemId: item.id });
        if (!result.ok) {
            setMsg(result.msg);
            return;
        }
        setMsg('');
        setOpen(false);
        if (onUserUpdated && result.user)
            onUserUpdated(result.user);
        setCool(REACTION_COOLDOWN_MS);
        // ربات‌ها گاهی (۴۰٪) تلافی می‌کنند؛ رایگان و فقط برای سرگرمی
        if (target.isBot && Math.random() < 0.4) {
            const cheap = REACTION_ITEMS.filter(entry => entry.price <= 5);
            const pick = cheap[Math.floor(Math.random() * cheap.length)];
            const mid = matchId;
            setTimeout(() => {
                if (reactionRuntime.matchId !== mid)
                    return;
                emitReaction({ id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, matchId: mid, from: target.name, to: currentUser.username, item: pick.id, at: Date.now() });
            }, 2600 + Math.random() * 2600);
        }
    };
    useEffect(() => {
        const onPanel = (e) => { if (e.detail !== 'tray')
            setOpen(false); };
        window.addEventListener('gq:panel-open', onPanel);
        return () => window.removeEventListener('gq:panel-open', onPanel);
    }, []);
    const toggleTray = () => {
        setOpen(prev => {
            if (!prev)
                window.dispatchEvent(new CustomEvent('gq:panel-open', { detail: 'tray' }));
            return !prev;
        });
        setMsg('');
    };
    const toggleMute = () => { const next = !muted; setMuted(next); setReactionMuted(next); };
    const coins = currentUser.coins ?? 0;
    const show = !hidden && visible && !!matchId && targets.length > 0;
    return (React.createElement(Fragment, null,
        React.createElement("span", { ref: sentinelRef, style: { position: 'absolute', width: 0, height: 0 } }),
        ReactDOM.createPortal(React.createElement("div", { className: "gq-react-tray", dir: "ltr", style: { display: show ? 'flex' : 'none' } },
            open && React.createElement("div", { className: "gq-react-backdrop", style: { pointerEvents: 'auto', position: 'fixed' }, onClick: () => setOpen(false) }),
            open && (React.createElement("div", { className: "gq-react-panel", dir: "rtl" },
                React.createElement("div", { className: "flex items-center justify-between gap-2 mb-2" },
                    React.createElement("button", { type: "button", className: "gq-react-close", "aria-label": "\u0628\u0633\u062A\u0646", onClick: () => setOpen(false) }, "\u2715"),
                    React.createElement("strong", { className: "text-white text-sm" }, "\u067E\u0631\u062A\u0627\u0628 \u0628\u0647 \u062D\u0631\u06CC\u0641 \uD83C\uDFAF"),
                    React.createElement("span", { className: "flex items-center gap-1 text-[11px] font-black text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full" },
                        coins.toLocaleString('fa-IR'),
                        " ",
                        React.createElement(IconCoin, { className: "w-3.5 h-3.5" }))),
                targets.length > 1 && (React.createElement("div", { className: "flex gap-1.5 flex-wrap mb-2" }, targets.map(t => (React.createElement("button", { key: t.name, onClick: () => setTargetName(t.name), className: `px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${(target && target.name === t.name) ? 'text-white' : 'text-slate-300 border-slate-700 bg-slate-800/70'}`, style: (target && target.name === t.name) ? { background: `${t.hex || '#6366f1'}55`, borderColor: t.hex || '#6366f1' } : undefined },
                    t.isBot ? '🤖 ' : '',
                    t.label || t.name))))),
                targets.length === 1 && React.createElement("div", { className: "text-[11px] text-slate-400 mb-2" },
                    "\u0647\u062F\u0641: ",
                    React.createElement("b", { className: "text-slate-200" }, target.label || target.name)),
                React.createElement("div", { className: "grid grid-cols-3 gap-2" }, REACTION_ITEMS.map(item => {
                    const blocked = cool > 0 || coins < item.price;
                    return (React.createElement("button", { key: item.id, disabled: blocked, onClick: () => throwItem(item), className: "gq-react-item" },
                        React.createElement("span", { className: "text-2xl leading-none" }, item.emoji),
                        React.createElement("span", { className: "text-[10px] font-bold text-slate-200 leading-tight" }, item.name),
                        React.createElement("span", { className: "flex items-center gap-0.5 text-[10px] font-black text-amber-300" },
                            item.price.toLocaleString('fa-IR'),
                            " ",
                            React.createElement(IconCoin, { className: "w-3 h-3" }))));
                })),
                cool > 0 && React.createElement("div", { className: "mt-2 text-[11px] text-amber-300 font-bold text-center" },
                    "\u23F3 \u067E\u0631\u062A\u0627\u0628 \u0628\u0639\u062F\u06CC \u062A\u0627 ",
                    Math.ceil(cool / 1000).toLocaleString('fa-IR'),
                    " \u062B\u0627\u0646\u06CC\u0647\u200C\u06CC \u062F\u06CC\u06AF\u0631"),
                msg && React.createElement("div", { className: "mt-2 text-[11px] text-rose-300 font-bold text-center" }, msg),
                React.createElement("label", { className: "mt-2.5 pt-2 border-t border-slate-700/70 flex items-center justify-between gap-2 text-[11px] text-slate-400 cursor-pointer" },
                    React.createElement("span", null, "\u0646\u0645\u0627\u06CC\u0634 \u0648\u0627\u06A9\u0646\u0634\u200C\u0647\u0627\u06CC \u062F\u06CC\u06AF\u0631\u0627\u0646"),
                    React.createElement("input", { type: "checkbox", checked: !muted, onChange: toggleMute, className: "accent-indigo-500" })))),
            React.createElement("button", { type: "button", onClick: toggleTray, "aria-expanded": open, "aria-label": "\u067E\u0631\u062A\u0627\u0628 \u0648\u0627\u06A9\u0646\u0634", className: `gq-react-fab ${open ? 'is-open' : ''}` },
                React.createElement("span", { className: "text-2xl leading-none" }, open ? '✕' : '🥚'),
                cool > 0 && !open && React.createElement("span", { className: "gq-react-cool" }, Math.ceil(cool / 1000).toLocaleString('fa-IR')))), document.body)));
};

/* ===== components/DailyWheel.jsx ===== */
// ---------- گردونه‌ی روزانه — نسخه‌ی پریمیوم کازینویی ----------
// وابستگی‌ها (global، مطابق modules.json): WHEEL_PRIZES, pickWheelPrize, getPrizeIndex,
// canSpinWheel, getWheelCooldownLeft, recordWheelSpin, formatWheelCooldown, playSound, IconCoin
// کاملاً خودکفا: تمام استایل‌ها (CSS/Tailwind) داخل همین فایل هستند.
const DW_SEG = 360 / WHEEL_PRIZES.length;
const DW_SIZE = 360, DW_C = 180, DW_R = 150;
const DW_PEGS = WHEEL_PRIZES.length; // یک پگ روی لبه‌ی هر قطعه
const dwToRad = (d) => (d * Math.PI) / 180;
const dwPolar = (r, deg) => [DW_C + r * Math.sin(dwToRad(deg)), DW_C - r * Math.cos(dwToRad(deg))];
const dwSlicePath = (start, end) => {
    const [x1, y1] = dwPolar(DW_R, start);
    const [x2, y2] = dwPolar(DW_R, end);
    return `M ${DW_C} ${DW_C} L ${x1} ${y1} A ${DW_R} ${DW_R} 0 ${DW_SEG > 180 ? 1 : 0} 1 ${x2} ${y2} Z`;
};
// --- صداهای لمسی (خودکفا، بدون وابستگی به core/sound.js) ---
let dwAudioCtx = null;
const dwCtx = () => {
    try {
        dwAudioCtx = dwAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
    }
    catch (e) {
        dwAudioCtx = null;
    }
    return dwAudioCtx;
};
const dwTick = (vol = 0.08, freq = 1600) => {
    const ctx = dwCtx();
    if (!ctx)
        return;
    try {
        const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = 600;
        o.type = 'square';
        o.frequency.setValueAtTime(freq, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(freq * 0.4, ctx.currentTime + 0.03);
        g.gain.setValueAtTime(vol, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.045);
        o.connect(f);
        f.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.05);
    }
    catch (e) { }
};
const dwClack = () => dwTick(0.05, 2600); // برخورد پگ با فلز
const dwWhoosh = () => { try {
    playSound('whoosh');
}
catch (e) { } };
const dwWinSound = (tier) => {
    try {
        playSound(tier === 'legendary' ? 'jackpot' : tier === 'epic' ? 'win' : 'coin');
    }
    catch (e) { }
};
const dwBuzz = (ms = 20) => { try {
    navigator.vibrate && navigator.vibrate(ms);
}
catch (e) { } };
// --- ذرات انفجاری جشن ---
const DWBurst = ({ color }) => {
    const parts = useMemo(() => Array.from({ length: 44 }, (_, i) => {
        const a = (i / 44) * 360 + Math.random() * 14;
        return {
            id: i,
            c: [color, '#fde047', '#ffffff', '#f59e0b'][i % 4],
            dur: 0.9 + Math.random() * 0.8,
            dist: 90 + Math.random() * 160,
            angle: a,
            size: 4 + Math.random() * 7,
        };
    }), []);
    return (React.createElement("div", { className: "absolute inset-0 overflow-hidden pointer-events-none z-[60]" },
        parts.map(p => (React.createElement("span", { key: p.id, className: "absolute left-1/2 top-1/2 rounded-sm", style: {
                width: p.size, height: p.size, backgroundColor: p.c,
                boxShadow: `0 0 8px ${p.c}`,
                animation: `dwBurst ${p.dur}s cubic-bezier(0.1,0.7,0.3,1) forwards`,
                '--dw-tx': `${Math.cos(dwToRad(p.angle)) * p.dist}px`,
                '--dw-ty': `${Math.sin(dwToRad(p.angle)) * p.dist}px`,
            } }))),
        React.createElement("style", null, `@keyframes dwBurst{0%{transform:translate(-50%,-50%) rotate(0deg);opacity:1}
            100%{transform:translate(calc(-50% + var(--dw-tx)),calc(-50% + var(--dw-ty))) rotate(540deg);opacity:0}}`)));
};
// --- خودِ گردونه ---
const DWheel = ({ spinning, rotation, spinDuration, onSegmentCross }) => {
    const wheelEl = useRef(null);
    const lastSeg = useRef(-1);
    // ردیابی زاویه با rAF برای صدای تیک‌تاک + لرزش هپتیک سوزنی
    useEffect(() => {
        if (!spinning) {
            lastSeg.current = -1;
            return;
        }
        let raf;
        const step = () => {
            const el = wheelEl.current;
            if (el) {
                try {
                    const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
                    const ang = ((Math.atan2(m.b, m.a) * 180) / Math.PI + 360) % 360;
                    const seg = Math.floor(ang / DW_SEG);
                    if (lastSeg.current !== -1 && seg !== lastSeg.current) {
                        dwClack();
                        onSegmentCross && onSegmentCross();
                    }
                    lastSeg.current = seg;
                }
                catch (e) { }
            }
            raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [spinning]);
    return (React.createElement("div", { className: "dw-wheel-stage relative w-full max-w-[360px] mx-auto aspect-square select-none" },
        React.createElement("div", { className: `absolute -inset-6 rounded-full blur-3xl transition-all duration-700 ${spinning ? 'opacity-90 scale-105' : 'opacity-40'}`, style: { background: 'radial-gradient(circle,rgba(251,191,36,0.45) 0%,rgba(168,85,247,0.25) 55%,transparent 75%)' } }),
        React.createElement("div", { className: "dw-wheel-lights absolute inset-0 rounded-full z-10 pointer-events-none" }, Array.from({ length: 32 }, (_, i) => (React.createElement("div", { key: i, className: "absolute left-1/2 top-1/2 w-[7px] h-[7px] rounded-full", style: {
                transform: `translate(-50%,-50%) rotate(${i * (360 / 32)}deg) translateY(-${DW_R + 16}px)`,
                background: '#fff7d6',
                boxShadow: '0 0 6px #fde047, 0 0 14px #f59e0b',
                opacity: 0.35,
                animation: spinning
                    ? `dwLed 0.5s ${i * 0.03}s infinite alternate`
                    : `dwIdle 2.4s ${i * 0.09}s infinite alternate`,
            } })))),
        React.createElement("div", { className: "dw-wheel-bezel absolute inset-0 rounded-full z-[5]", style: {
                background: 'conic-gradient(from 0deg,#fef3c7,#b45309,#fde68a,#92400e,#fcd34d,#78350f,#fef9c3,#b45309,#fef3c7)',
                padding: 10,
                boxShadow: '0 0 0 3px #1c1917, 0 0 45px rgba(245,158,11,0.55), 0 25px 60px rgba(0,0,0,0.75), inset 0 2px 6px rgba(255,255,255,0.6), inset 0 -3px 8px rgba(120,53,15,0.9)',
            } },
            React.createElement("div", { className: "dw-wheel-bezel-inner w-full h-full rounded-full", style: { background: '#1c1917', boxShadow: 'inset 0 0 25px rgba(0,0,0,0.9)' } })),
        React.createElement("div", { ref: wheelEl, className: "dw-wheel-disc absolute inset-[10px] rounded-full overflow-hidden z-20", style: {
                transform: `translateZ(0) rotate(${rotation}deg)`,
                transition: spinning ? `transform ${spinDuration}s cubic-bezier(0.08,0.92,0.06,1)` : 'none',
                willChange: 'transform',
                boxShadow: 'inset 0 0 40px rgba(0,0,0,0.55)',
            } },
            React.createElement("svg", { viewBox: `0 0 ${DW_SIZE} ${DW_SIZE}`, className: "dw-wheel-svg w-full h-full" },
                React.createElement("defs", null,
                    WHEEL_PRIZES.map((p, i) => (React.createElement("radialGradient", { key: i, id: `dwg-${i}`, cx: "35%", cy: "30%", r: "90%" },
                        React.createElement("stop", { offset: "0%", stopColor: p.light }),
                        React.createElement("stop", { offset: "55%", stopColor: p.color }),
                        React.createElement("stop", { offset: "100%", stopColor: p.dark })))),
                    React.createElement("radialGradient", { id: "dwHub", cx: "35%", cy: "30%", r: "80%" },
                        React.createElement("stop", { offset: "0%", stopColor: "#fffbeb" }),
                        React.createElement("stop", { offset: "45%", stopColor: "#f59e0b" }),
                        React.createElement("stop", { offset: "100%", stopColor: "#78350f" })),
                    React.createElement("filter", { id: "dwShadow" },
                        React.createElement("feDropShadow", { dx: "0", dy: "2", stdDeviation: "3", floodOpacity: "0.7" }))),
                WHEEL_PRIZES.map((p, i) => {
                    const center = i * DW_SEG;
                    const [tx, ty] = dwPolar(DW_R * 0.66, center);
                    const [ix, iy] = dwPolar(DW_R * 0.85, center);
                    const [px, py] = dwPolar(DW_R - 3, center + DW_SEG / 2);
                    const icon = p.tier === 'legendary' ? '👑' : p.tier === 'epic' ? '💎' : p.tier === 'rare' ? '⭐' : '';
                    return (React.createElement("g", { key: i },
                        React.createElement("path", { d: dwSlicePath(center - DW_SEG / 2, center + DW_SEG / 2), fill: `url(#dwg-${i})`, stroke: "#fde68a", strokeWidth: "1.4", strokeOpacity: "0.55" }),
                        React.createElement("circle", { cx: px, cy: py, r: "5", fill: "url(#dwHub)", stroke: "#78350f", strokeWidth: "1.4", filter: "url(#dwShadow)" }),
                        React.createElement("circle", { cx: px - 1.5, cy: py - 1.5, r: "1.6", fill: "#fff", opacity: "0.9" }),
                        React.createElement("text", { x: tx, y: ty, textAnchor: "middle", dominantBaseline: "middle", transform: `rotate(${center},${tx},${ty})`, fontSize: "30", fontWeight: "900", fill: "#ffffff", style: { textShadow: '0 2px 5px rgba(0,0,0,0.85), 0 0 12px rgba(0,0,0,0.5)' } }, p.label),
                        icon && (React.createElement("text", { x: ix, y: iy, textAnchor: "middle", dominantBaseline: "middle", transform: `rotate(${center},${ix},${iy})`, fontSize: "15", style: { textShadow: '0 1px 3px rgba(0,0,0,0.8)' } }, icon))));
                }),
                React.createElement("circle", { cx: DW_C, cy: DW_C, r: "42", fill: "#1c1917", stroke: "#f59e0b", strokeWidth: "3", filter: "url(#dwShadow)" }),
                React.createElement("circle", { cx: DW_C, cy: DW_C, r: "30", fill: "url(#dwHub)", stroke: "#fef08a", strokeWidth: "2" }),
                React.createElement("text", { x: DW_C, y: DW_C + 1, textAnchor: "middle", dominantBaseline: "central", fontSize: "20", fontWeight: "900", fill: "#451a03", style: { textShadow: '0 1px 0 rgba(255,255,255,0.4)' } }, "QJ"))),
        React.createElement("div", { className: `dw-wheel-pointer absolute top-[-16px] left-1/2 -translate-x-1/2 z-30 ${spinning ? 'dw-pointer-kick' : ''}`, style: { filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.7))' } },
            React.createElement("svg", { width: "44", height: "58", viewBox: "0 0 44 58" },
                React.createElement("defs", null,
                    React.createElement("linearGradient", { id: "dwPtr", x1: "0", y1: "0", x2: "1", y2: "1" },
                        React.createElement("stop", { offset: "0%", stopColor: "#fef9c3" }),
                        React.createElement("stop", { offset: "45%", stopColor: "#f59e0b" }),
                        React.createElement("stop", { offset: "100%", stopColor: "#7c2d12" }))),
                React.createElement("path", { d: "M 22 56 L 6 22 C 6 10 13 4 22 4 C 31 4 38 10 38 22 Z", fill: "url(#dwPtr)", stroke: "#451a03", strokeWidth: "2.5" }),
                React.createElement("circle", { cx: "22", cy: "20", r: "7", fill: "#ef4444", stroke: "#7f1d1d", strokeWidth: "1.5" }),
                React.createElement("circle", { cx: "19.5", cy: "17.5", r: "2.4", fill: "#fff", opacity: "0.85" }))),
        React.createElement("style", null, `
                @keyframes dwLed { from { opacity:.3 } to { opacity:1; box-shadow:0 0 10px #fff,0 0 22px #fde047 } }
                @keyframes dwIdle { from { opacity:.25 } to { opacity:.7 } }
                .dw-pointer-kick { animation: dwKick .12s ease-out infinite alternate; transform-origin: 50% 8%; }
                @keyframes dwKick { from { transform: translateX(-50%) rotate(0deg) } to { transform: translateX(-50%) rotate(-9deg) } }
            `)));
};
// --- نمایش شفاف شانس/سطوح جوایز ---
const DWOddsTable = () => (React.createElement("div", { className: "dw-odds-panel w-full rounded-2xl border border-amber-500/20 bg-black/40 p-3" },
    React.createElement("div", { className: "mb-2 flex items-center justify-between px-1" },
        React.createElement("span", { className: "text-[10px] font-black tracking-widest text-amber-400/80" }, "\u062C\u0648\u0627\u06CC\u0632 \u0648 \u0634\u0627\u0646\u0633\u200C\u0647\u0627"),
        React.createElement("span", { className: "text-[10px] font-bold text-slate-500" }, "\u0648\u0632\u0646 / \u06F1\u06F0\u06F0")),
    React.createElement("div", { className: "flex flex-col gap-1.5" }, WHEEL_PRIZES.slice().reverse().map(p => (React.createElement("div", { key: p.amount, className: "flex items-center gap-2" },
        React.createElement("span", { className: "w-5 h-5 shrink-0 rounded-full border border-white/20 flex items-center justify-center text-[9px]", style: { background: `linear-gradient(135deg,${p.light},${p.color})` } }, p.tier === 'legendary' ? '👑' : p.tier === 'epic' ? '💎' : ''),
        React.createElement("div", { className: "flex-1 h-2.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700/60" },
            React.createElement("div", { className: "h-full rounded-full transition-all duration-700", style: { width: `${p.weight}%`, background: `linear-gradient(90deg,${p.dark},${p.color},${p.light})`, boxShadow: `0 0 8px ${p.color}` } })),
        React.createElement("span", { className: "w-12 text-left font-black text-xs", style: { color: p.light }, dir: "ltr" }, p.label),
        React.createElement("span", { className: "w-9 text-left text-[10px] font-bold text-slate-400", dir: "ltr" },
            p.weight,
            "%")))))));
// --- مودال اصلی ---
const DailyWheelModal = ({ currentUser, onUserUpdated, onClose }) => {
    const [rotation, setRotation] = useState(0);
    const [spinDuration, setSpinDuration] = useState(0);
    const [spinning, setSpinning] = useState(false);
    const [prize, setPrize] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const [burstKey, setBurstKey] = useState(0);
    const [cooldown, setCooldown] = useState(() => getWheelCooldownLeft(currentUser.username));
    useEffect(() => {
        const id = setInterval(() => setCooldown(getWheelCooldownLeft(currentUser.username)), 1000);
        return () => clearInterval(id);
    }, [currentUser.username]);
    const ready = cooldown <= 0 && !spinning;
    const handleSpin = () => {
        if (!canSpinWheel(currentUser.username) || spinning)
            return;
        dwCtx();
        dwWhoosh();
        dwBuzz(35);
        const picked = pickWheelPrize();
        const idx = getPrizeIndex(picked);
        const jitter = (Math.random() - 0.5) * DW_SEG * 0.6;
        const target = 7 * 360 + (360 - idx * DW_SEG + jitter);
        const dur = 6.5 + Math.random() * 1.5;
        setSpinDuration(dur);
        setPrize(picked);
        setSpinning(true);
        setShowResult(false);
        setRotation(r => r + target);
        setTimeout(() => {
            setSpinning(false);
            setShowResult(true);
            setBurstKey(k => k + 1);
            dwWinSound(picked.tier);
            dwBuzz([30, 40, 60]);
            const updated = recordWheelSpin(currentUser.username, picked.amount);
            if (updated && onUserUpdated)
                onUserUpdated(updated);
            setCooldown(getWheelCooldownLeft(currentUser.username));
        }, dur * 1000 + 150);
    };
    const modalContent = (React.createElement("div", { className: "dw-backdrop", dir: "rtl" },
        React.createElement("div", { className: "absolute inset-0", onClick: !spinning ? onClose : undefined }),
        React.createElement("style", null, `
                @keyframes dwShine { 0% { transform: translateX(-120%) } 100% { transform: translateX(220%) } }
                @keyframes dwFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
                @keyframes dwGlowPulse { 0%,100% { opacity:.5 } 50% { opacity:1 } }
                @keyframes dwBackdropFadeIn { from { opacity: 0 } to { opacity: 1 } }
                @keyframes dwPopIn { from { opacity: 0; transform: translateY(12px) scale(.96) } to { opacity: 1; transform: translateY(0) scale(1) } }
                .dw-backdrop {
                    position: fixed !important; top: 0; left: 0; right: 0; bottom: 0;
                    width: 100vw; height: 100vh; height: 100dvh;
                    display: flex; align-items: center; justify-content: center;
                    z-index: 99999; background: rgba(2,6,23,.78);
                    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
                    padding: 16px; box-sizing: border-box; margin: 0;
                    animation: dwBackdropFadeIn .22s ease-out both;
                }
                .dw-modal {
                    position: relative; margin: auto; max-height: calc(100vh - 40px);
                    max-height: calc(100dvh - 40px); overflow-y: auto;
                    width: min(480px, 94vw); animation: dwPopIn .28s cubic-bezier(.2,.8,.2,1) both;
                }
                .dw-spin-btn {
                    min-height: 56px; width: 100%; font-size: 20px; font-weight: 800;
                    border-radius: 16px; border: none; cursor: pointer;
                    background: linear-gradient(135deg,#fde68a,#f59e0b) !important;
                    color: #1f2937 !important; box-shadow: 0 0 24px rgba(245,158,11,.55) !important;
                    animation: dwGlowPulse 1.8s ease-in-out infinite;
                }
                .dw-spin-btn:disabled {
                    background: rgba(148,163,184,.18) !important; color: #94a3b8 !important;
                    cursor: not-allowed; box-shadow: none !important; animation: none;
                }
                .dw-spin-btn:active:not(:disabled) { transform: scale(.97); }
                .dw-close {
                    position: absolute; top: 14px; inset-inline-start: 14px; z-index: 30;
                    width: 38px; height: 38px; border-radius: 50%;
                    background: rgba(148,163,184,.15); color: #e2e8f0;
                    font-size: 18px; border: 1px solid rgba(148,163,184,.3); cursor: pointer;
                    display: inline-flex; align-items: center; justify-content: center;
                    transition: background .18s ease, transform .18s ease;
                }
                .dw-close:hover { background: rgba(244,63,94,.35); }
                .dw-result-ok {
                    min-height: 48px; padding: 0 40px; font-size: 17px; font-weight: 800;
                    border-radius: 14px; cursor: pointer; color: #1f2937 !important;
                    background: linear-gradient(135deg,#fde68a,#f59e0b) !important;
                    box-shadow: 0 0 24px rgba(245,158,11,.55) !important;
                }
            `),
        React.createElement("div", { className: "dw-modal dw-dialog rounded-[36px] border border-amber-500/30 p-5 sm:p-7 flex flex-col items-center gap-4", role: "dialog", "aria-modal": "true", "aria-labelledby": "dw-title" },
            React.createElement("div", { className: "absolute top-0 inset-x-10 h-[2px] rounded-full", style: { background: 'linear-gradient(90deg,transparent,#fbbf24,transparent)', boxShadow: '0 0 14px #f59e0b' } }),
            React.createElement("button", { onClick: onClose, disabled: spinning, className: "dw-close disabled:opacity-40" }, "\u2715"),
            React.createElement("div", { className: "dw-header text-center mt-2" },
                React.createElement("div", { className: "inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-[11px] font-black tracking-[0.25em] mb-2" },
                    React.createElement("span", { className: "w-2 h-2 rounded-full bg-amber-400 animate-ping" }),
                    "\u06AF\u0631\u062F\u0648\u0646\u0647\u200C\u06CC \u0637\u0644\u0627\u06CC\u06CC \u06A9\u06CC\u0648\u062C\u06CC"),
                React.createElement("h2", { id: "dw-title", className: "text-3xl sm:text-4xl font-black", style: {
                        background: 'linear-gradient(180deg,#fffbeb 10%,#fbbf24 55%,#92400e 100%)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 3px 8px rgba(245,158,11,0.35))',
                    } }, "\u0634\u0627\u0646\u0633\u062A \u0631\u0648 \u0627\u0645\u062A\u062D\u0627\u0646 \u06A9\u0646!")),
            React.createElement("div", { className: "dw-wheel-wrap w-full flex justify-center py-2" },
                React.createElement(DWheel, { spinning: spinning, rotation: rotation, spinDuration: spinDuration })),
            React.createElement("div", { className: "dw-controls w-full" }, spinning ? (React.createElement("div", { className: "dw-status w-full py-4 rounded-2xl bg-indigo-950/60 border border-indigo-400/30 text-indigo-200 font-black text-lg flex items-center justify-center gap-3" },
                React.createElement("span", { className: "w-5 h-5 rounded-full border-[3px] border-indigo-400/30 border-t-indigo-300 animate-spin" }),
                "\u06AF\u0631\u062F\u0648\u0646\u0647 \u062F\u0631 \u062D\u0627\u0644 \u0686\u0631\u062E\u0634...")) : ready ? (React.createElement("button", { onClick: handleSpin, className: "dw-spin-btn group relative overflow-hidden" },
                React.createElement("span", { className: "absolute inset-y-0 w-1/3 bg-white/50 blur-md skew-x-[-20deg]", style: { animation: 'dwShine 2.4s ease-in-out infinite' } }),
                React.createElement("span", { className: "relative flex items-center justify-center gap-2 drop-shadow-sm" }, "\uD83C\uDFA1 \u0628\u0686\u0640\u0631\u062E\u0640\u0648\u0646!"))) : (React.createElement("div", { className: "dw-countdown w-full py-4 rounded-2xl bg-black/50 border border-slate-700/60 text-center" },
                React.createElement("div", { className: "text-[11px] font-bold text-slate-400 mb-1" }, "\u0686\u0631\u062E\u0634 \u0631\u0627\u06CC\u06AF\u0627\u0646 \u0628\u0639\u062F\u06CC \u062F\u0631:"),
                React.createElement("div", { className: "font-mono font-black text-2xl text-amber-400 tracking-widest", dir: "ltr", style: { textShadow: '0 0 14px rgba(251,191,36,0.6)' } }, formatWheelCooldown(cooldown))))),
            React.createElement(DWOddsTable, null),
            React.createElement("p", { className: "text-[10px] text-slate-500 text-center -mt-2" }, "\u0634\u0627\u0646\u0633 \u0647\u0631 \u062C\u0627\u06CC\u0632\u0647 \u0628\u0631 \u0627\u0633\u0627\u0633 \u0648\u0632\u0646 \u0648\u0627\u0642\u0639\u06CC \u0633\u06CC\u0633\u062A\u0645 \u0645\u062D\u0627\u0633\u0628\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F"),
            showResult && prize && (React.createElement("div", { className: "dw-result absolute inset-0 z-50 flex flex-col items-center justify-center p-6 text-center rounded-[36px]", style: { background: 'rgba(5,3,12,0.96)', backdropFilter: 'blur(20px)' } },
                React.createElement(DWBurst, { key: burstKey, color: prize.color }),
                React.createElement("div", { className: "relative mb-5", style: { animation: 'dwFloat 2.4s ease-in-out infinite' } },
                    React.createElement("div", { className: "absolute inset-0 scale-[1.9] rounded-full blur-2xl", style: { backgroundColor: prize.color, animation: 'dwGlowPulse 1.6s infinite' } }),
                    React.createElement("div", { className: "relative w-28 h-28 rounded-full flex items-center justify-center text-5xl border-4 z-10", style: {
                            background: `radial-gradient(circle at 30% 30%,${prize.light},${prize.color} 60%,${prize.dark})`,
                            borderColor: prize.light,
                            boxShadow: `0 0 45px ${prize.color}, inset 0 4px 10px rgba(255,255,255,0.5)`,
                        } }, prize.tier === 'legendary' ? '👑' : prize.tier === 'epic' ? '💎' : prize.tier === 'rare' ? '⭐' : React.createElement(IconCoin, { className: "w-14 h-14" }))),
                React.createElement("div", { className: "px-5 py-1.5 rounded-full text-xs font-black border tracking-widest mb-3 bg-black/60", style: { color: prize.light, borderColor: prize.color, boxShadow: `0 0 18px ${prize.color}55` } }, prize.name),
                React.createElement("h3", { className: "text-3xl font-black text-white mb-4" }, prize.tier === 'legendary' ? 'افسانه‌ای بود! 🎉' : prize.tier === 'epic' ? 'شگفت‌انگیز! 🤩' : 'تبریک! 🎉'),
                React.createElement("div", { className: "relative overflow-hidden py-4 px-12 rounded-3xl border-2 z-10", style: {
                        borderColor: `${prize.color}99`,
                        background: `linear-gradient(120deg,${prize.dark}33,${prize.color}44,${prize.dark}33)`,
                        boxShadow: `0 0 35px ${prize.color}55`,
                    } },
                    React.createElement("div", { className: "text-5xl font-black font-mono tracking-tighter flex items-center justify-center gap-1", style: { color: prize.light, textShadow: `0 0 20px ${prize.color}` } },
                        React.createElement("span", { className: "text-3xl" }, "+"),
                        prize.amount),
                    React.createElement("span", { className: "block text-xs text-white/70 font-bold mt-1" }, "\u06A9\u06CC\u0648\u062C\u06CC \u0628\u0647 \u062D\u0633\u0627\u0628\u062A \u0627\u0636\u0627\u0641\u0647 \u0634\u062F")),
                React.createElement("button", { onClick: () => { setShowResult(false); setPrize(null); onClose(); }, className: "dw-result-ok mt-6 w-full max-w-[240px] z-10" }, "\u062F\u0631\u06CC\u0627\u0641\u062A \u0648 \u0628\u0627\u0632\u06AF\u0634\u062A"))))));
    return (typeof ReactDOM !== 'undefined' && ReactDOM && typeof ReactDOM.createPortal === 'function' && typeof document !== 'undefined')
        ? ReactDOM.createPortal(modalContent, document.body)
        : modalContent;
};
// --- کارت داخل صفحه‌ی بازی‌ها ---
const DailyWheelCard = ({ currentUser, onOpen }) => {
    const [left, setLeft] = useState(() => getWheelCooldownLeft(currentUser.username));
    useEffect(() => {
        const id = setInterval(() => setLeft(getWheelCooldownLeft(currentUser.username)), 1000);
        return () => clearInterval(id);
    }, [currentUser.username]);
    const ready = left <= 0;
    return (React.createElement("button", { onClick: onOpen, "data-wheel-entry": "true", className: `group w-full text-right relative overflow-hidden rounded-[28px] border-2 p-5 flex items-center gap-4 transition-all duration-300 hover:-translate-y-1.5 text-white ${ready ? 'border-amber-300/70' : 'bg-slate-900/60 backdrop-blur-md border-slate-700/50 hover:border-amber-500/40'}`, style: ready ? {
            background: 'linear-gradient(120deg,#7c2d12,#b45309 40%,#92400e 75%,#3b0764)',
            boxShadow: '0 14px 40px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
        } : undefined },
        ready && (React.createElement("div", { className: "absolute -left-8 -top-8 w-44 h-44 rounded-full bg-amber-300/40 blur-3xl pointer-events-none", style: { animation: 'dwGlowPulse 2.2s infinite' } })),
        React.createElement("div", { "data-wheel-icon": "true", className: `relative w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shrink-0 border-2 shadow-xl transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110 ${ready ? 'bg-gradient-to-tr from-amber-100 to-white text-amber-600 border-white/80' : 'bg-slate-800 border-slate-600 text-slate-400'}` }, "\uD83C\uDFA1"),
        React.createElement("div", { className: "relative flex-1 min-w-0 z-10" },
            React.createElement("div", { className: "flex items-center gap-2 mb-1 flex-wrap" },
                React.createElement("h3", { className: "font-black text-xl drop-shadow-md" }, "\u06AF\u0631\u062F\u0648\u0646\u0647\u200C\u06CC \u0634\u0627\u0646\u0633"),
                ready ? (React.createElement("span", { className: "px-3 py-1 rounded-full bg-white/25 backdrop-blur-sm border border-white/40 text-white text-[10px] font-black tracking-wider animate-pulse" }, "\u06CC\u06A9 \u0686\u0631\u062E\u0634 \u062F\u0627\u0631\u06CC!")) : (React.createElement("span", { className: "px-3 py-1 rounded-full bg-black/70 text-amber-400 border border-amber-500/30 text-xs font-black font-mono", dir: "ltr" }, formatWheelCooldown(left)))),
            React.createElement("p", { className: `text-sm leading-relaxed ${ready ? 'text-white/90 font-medium' : 'text-slate-400'}` }, ready ? 'وارد شو، گردونه را بچرخان و تا ۲۰۰ سکه کیوجی برنده شو!' : 'هر روز یک فرصت. فردا دوباره سر بزن.'),
            React.createElement("div", { className: "flex gap-1.5 flex-wrap items-center mt-2.5" }, WHEEL_PRIZES.slice().reverse().map(p => (React.createElement("span", { key: p.amount, className: "px-2 py-0.5 rounded-md text-[10px] font-black border", style: ready
                    ? { background: `${p.color}55`, borderColor: `${p.light}66`, color: p.light }
                    : { background: 'rgba(30,41,59,0.8)', borderColor: '#334155', color: '#64748b' } }, p.label))))),
        React.createElement("div", { className: `relative shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:-translate-x-1.5 ${ready ? 'bg-white text-amber-600' : 'bg-slate-800 text-slate-400 border border-slate-700'}` },
            React.createElement("span", { className: "text-2xl font-black" }, "\u2039"))));
};

/* ===== core/alliances.js ===== */
// Alliance subsystem backed by localStorage, matching the project's local user store.
const ALLIANCES_STORAGE_KEY = 'gameqj_alliances_v1';
const allianceMemberName = m => typeof m==='string'?m:(m?.username||'');
const normalizeAlliance = a => { if(!a||typeof a!=='object')return a; a.privacy=a.privacy||'public'; a.admins=Array.isArray(a.admins)?a.admins:[]; a.joinRequests=Array.isArray(a.joinRequests)?a.joinRequests:[]; a.messages=Array.isArray(a.messages)?a.messages:[]; a.treasury=a.treasury??0; a.entryFee=a.entryFee??0; a.capacity=a.capacity??10; a.storeLevel=a.storeLevel??0; a.gameLevel=a.gameLevel??0; a.members=Array.isArray(a.members)?a.members:[]; return a; };
const getAlliances = () => { try { const a=JSON.parse(localStorage.getItem(ALLIANCES_STORAGE_KEY)||'[]'); return Array.isArray(a)?a.map(normalizeAlliance):[]; } catch(e){return [];} };
const saveAlliances = a => localStorage.setItem(ALLIANCES_STORAGE_KEY,JSON.stringify(a));
const getUserAlliance = username => { if(!username)return null; const key=username.toLowerCase(); return getAlliances().find(a=>a.members.some(m=>allianceMemberName(m).toLowerCase()===key))||null; };
const getUserDiscounts = username => { const a=getUserAlliance(username); if(!a)return {storeDiscountPercent:0,gameDiscountPercent:0}; return {storeDiscountPercent:Math.min(30,(a.storeLevel||0)*5),gameDiscountPercent:Math.min(30,(a.gameLevel||0)*5)}; };
const isAllianceCreator = (username,alliance) => !!alliance&&(alliance.creator||'').toLowerCase()===(username||'').toLowerCase();
const isAllianceAdmin = (username,alliance) => !!alliance&&((alliance.creator||'').toLowerCase()===(username||'').toLowerCase()||(alliance.admins||[]).some(x=>(x||'').toLowerCase()===(username||'').toLowerCase()));
const createAlliance = (username,name) => { const n=(name||'').trim(); if(!n)return {ok:false,msg:'نام آلیانز را وارد کنید.'}; if(n.length>32)return {ok:false,msg:'نام آلیانز حداکثر ۳۲ نویسه است.'}; if(getUserAlliance(username))return {ok:false,msg:'شما هم‌اکنون عضو یک آلیانز هستید.'}; if(getAlliances().some(a=>a.name.toLowerCase()===n.toLowerCase()))return {ok:false,msg:'این نام آلیانز قبلاً استفاده شده است.'}; const user=findUser(username); if(!user||user.coins<500)return {ok:false,msg:'برای ساخت آلیانز به ۵۰۰ کیوجی نیاز دارید.'}; const now=new Date().toISOString(); const a={id:`alliance-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,name:n,creator:username,members:[username],capacity:10,treasury:0,entryFee:0,storeLevel:0,gameLevel:0,privacy:'public',admins:[],joinRequests:[],createdAt:now,messages:[]}; patchUser(username,u=>({...u,coins:u.coins-500})); saveAlliances([...getAlliances(),a]); return {ok:true,alliance:a,user:findUser(username)}; };
const requestToJoinAlliance = (username,id) => { const user=findUser(username),all=getAlliances(),i=all.findIndex(a=>a.id===id); if(i<0)return {ok:false,msg:'آلیانز پیدا نشد.'}; const a=all[i],key=(username||'').toLowerCase(); if(!user||getUserAlliance(username))return {ok:false,msg:'ابتدا از آلیانز فعلی خارج شوید.'}; if(a.members.some(m=>allianceMemberName(m).toLowerCase()===key))return {ok:false,msg:'شما هم‌اکنون عضو این آلیانز هستید.'}; if(a.members.length>=a.capacity)return {ok:false,msg:'ظرفیت آلیانز تکمیل است.'}; if(a.joinRequests.some(r=>(r.username||'').toLowerCase()===key))return {ok:false,msg:'درخواست عضویت شما در انتظار تأیید است.'}; if(user.coins<(a.entryFee||0))return {ok:false,msg:`برای ورود ${a.entryFee} کیوجی نیاز دارید.`}; if(a.entryFee)patchUser(username,u=>({...u,coins:u.coins-a.entryFee})); a.treasury=(a.treasury||0)+(a.entryFee||0); a.joinRequests.push({username,at:new Date().toISOString()}); saveAlliances(all); return {ok:true,pending:true,alliance:a,user:findUser(username)}; };
const joinAlliance = (username,id) => { const all=getAlliances(),i=all.findIndex(a=>a.id===id); if(i<0)return {ok:false,msg:'آلیانز پیدا نشد.'}; if(all[i].privacy==='private')return requestToJoinAlliance(username,id); const user=findUser(username); if(!user||getUserAlliance(username))return {ok:false,msg:'ابتدا از آلیانز فعلی خارج شوید.'}; const a=all[i]; if(a.members.length>=a.capacity)return {ok:false,msg:'ظرفیت آلیانز تکمیل است.'}; if(user.coins<(a.entryFee||0))return {ok:false,msg:`برای ورود ${a.entryFee} کیوجی نیاز دارید.`}; if(a.entryFee)patchUser(username,u=>({...u,coins:u.coins-a.entryFee})); a.treasury=(a.treasury||0)+(a.entryFee||0); a.members.push(username); saveAlliances(all); return {ok:true,pending:false,alliance:a,user:findUser(username)}; };
const leaveAlliance = username => { const all=getAlliances(),a=getUserAlliance(username); if(!a)return false; const idx=all.findIndex(x=>x.id===a.id); if(idx<0)return false; if(isAllianceCreator(username,a)){all.splice(idx,1);saveAlliances(all);return true;} const key=(username||'').toLowerCase(); all[idx].members=all[idx].members.filter(m=>allianceMemberName(m).toLowerCase()!==key); all[idx].admins=all[idx].admins.filter(x=>(x||'').toLowerCase()!==key); saveAlliances(all); return true; };
const setAlliancePrivacy = (username,privacy) => { const a=getUserAlliance(username); if(!a||!isAllianceCreator(username,a)||!['public','private'].includes(privacy))return false; const all=getAlliances(),i=all.findIndex(x=>x.id===a.id); if(i<0)return false; all[i].privacy=privacy; saveAlliances(all); return true; };
const setAllianceAdmin = (username,targetUsername,makeAdmin) => { const a=getUserAlliance(username); if(!a||!isAllianceCreator(username,a))return {ok:false,msg:'فقط سازنده می‌تواند ادمین‌ها را مدیریت کند.'}; const target=(targetUsername||'').toLowerCase(); if(!a.members.some(m=>allianceMemberName(m).toLowerCase()===target)||target===(a.creator||'').toLowerCase())return {ok:false,msg:'این بازیکن عضو قابل انتخابی نیست.'}; const all=getAlliances(),i=all.findIndex(x=>x.id===a.id); if(i<0)return {ok:false,msg:'آلیانز پیدا نشد.'}; const admins=all[i].admins; if(makeAdmin){if(!admins.some(x=>(x||'').toLowerCase()===target))admins.push(all[i].members.map(allianceMemberName).find(x=>x.toLowerCase()===target)||targetUsername);}else all[i].admins=admins.filter(x=>(x||'').toLowerCase()!==target); saveAlliances(all); return {ok:true,msg:makeAdmin?'این عضو ادمین شد.':'دسترسی ادمین حذف شد.'}; };
const respondJoinRequest = (username,allianceId,requesterUsername,accept) => { const all=getAlliances(),i=all.findIndex(a=>a.id===allianceId); if(i<0)return {ok:false,msg:'آلیانز پیدا نشد.'}; const a=all[i]; if(!isAllianceAdmin(username,a))return {ok:false,msg:'اجازه انجام این کار را ندارید.'}; const key=(requesterUsername||'').toLowerCase(),ri=a.joinRequests.findIndex(r=>(r.username||'').toLowerCase()===key); if(ri<0)return {ok:false,msg:'درخواست پیدا نشد.'}; const req=a.joinRequests[ri]; a.joinRequests.splice(ri,1); const refund=()=>{a.treasury=Math.max(0,(a.treasury||0)-(a.entryFee||0)); if(findUser(req.username))patchUser(req.username,u=>({...u,coins:(u.coins||0)+(a.entryFee||0)}));}; if(accept){if(a.members.length>=a.capacity){refund();saveAlliances(all);return {ok:false,msg:'ظرفیت تکمیل است؛ مبلغ بازگردانده شد.'};} if(!a.members.some(m=>allianceMemberName(m).toLowerCase()===key))a.members.push(req.username);}else refund(); saveAlliances(all); return {ok:true,alliance:a}; };
const sendAllianceMessage = (username,text) => { const value=(text||'').trim(),all=getAlliances(),a=getUserAlliance(username); if(!a||!value||value.length>2000)return false; const i=all.findIndex(x=>x.id===a.id); all[i].messages.push({id:`${Date.now()}-${Math.random()}`,sender:username,text:value,createdAt:new Date().toISOString()}); all[i].messages=all[i].messages.slice(-500); saveAlliances(all); return true; };
const updateAllianceSettings = (username,entryFee) => { const a=getUserAlliance(username); if(!a||!isAllianceAdmin(username,a))return false; const n=Number(entryFee); if(!Number.isInteger(n)||n<0||n>100000)return false; const all=getAlliances(),i=all.findIndex(x=>x.id===a.id); if(i<0)return false; all[i].entryFee=n; saveAlliances(all); return true; };
const donateAlliance = (username,amount) => { const n=Number(amount),user=findUser(username),a=getUserAlliance(username); if(!a||!Number.isInteger(n)||n<1||!user||user.coins<n)return false; patchUser(username,u=>({...u,coins:u.coins-n})); const all=getAlliances(),i=all.findIndex(x=>x.id===a.id); all[i].treasury=(all[i].treasury||0)+n; saveAlliances(all); return true; };
const upgradeAlliance = (username,kind) => { const a=getUserAlliance(username); if(!a||!isAllianceCreator(username,a))return {ok:false,msg:'فقط سازنده می‌تواند ارتقا دهد.'}; const all=getAlliances(),i=all.findIndex(x=>x.id===a.id),target=all[i]; let cost=0; if(kind==='store'||kind==='game'){const field=kind==='store'?'storeLevel':'gameLevel'; if((target[field]||0)>=6)return {ok:false,msg:'این خدمت به بالاترین سطح رسیده است.'}; cost=300+(target[field]||0)*200; if(target.treasury<cost)return {ok:false,msg:'موجودی خزانه کافی نیست.'}; target.treasury-=cost; target[field]=(target[field]||0)+1;}else if(kind==='capacity'){if(target.capacity>=30)return {ok:false,msg:'ظرفیت به حداکثر رسیده است.'};cost=300;if(target.treasury<cost)return {ok:false,msg:'موجودی خزانه کافی نیست.'};target.treasury-=cost;target.capacity=Math.min(30,target.capacity+5);}else return {ok:false,msg:'ارتقای نامعتبر است.'};saveAlliances(all);return {ok:true,alliance:target}; };

/* ===== pages/FriendsPage.jsx ===== */
const FriendsPage = ({ currentUser, onUserUpdated, onOpenLobby, onOpenProfile }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [friendFilter, setFriendFilter] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [activeSubTab, setActiveSubTab] = useState('find');
    const [selectedChat, setSelectedChat] = useState(null);
    const [lobbySetup, setLobbySetup] = useState(null);
    const [armedRemove, setArmedRemove] = useState(null);
    const myFriendsList = useMemo(() => {
        const raw = (currentUser.friends || []).map(name => findUser(name) || { username: name, isGhost: true });
        const pinnedSet = new Set((currentUser.pinnedFriends || []).map(name => name.toLowerCase()));
        return raw.sort((a, b) => {
            const aPinned = pinnedSet.has(a.username.toLowerCase());
            const bPinned = pinnedSet.has(b.username.toLowerCase());
            if (aPinned && !bPinned)
                return -1;
            if (!aPinned && bPinned)
                return 1;
            return a.username.localeCompare(b.username);
        });
    }, [currentUser.friends, currentUser.pinnedFriends]);
    const filteredFriends = useMemo(() => {
        if (!friendFilter.trim())
            return myFriendsList;
        return myFriendsList.filter(friend => friend.username.toLowerCase().includes(friendFilter.trim().toLowerCase()));
    }, [myFriendsList, friendFilter]);
    const incomingRequests = currentUser.friendRequests || [];
    const canSeeOthersLastSeen = currentUser.settings?.showLastSeen ?? true;
    const gameInvitations = currentUser.gameInvitations || [];
    const onlineFriendsCount = useMemo(() => myFriendsList.filter(friend => {
        if (friend.isGhost || !friend.lastSeen)
            return false;
        return Date.now() - new Date(friend.lastSeen).getTime() < 90000;
    }).length, [myFriendsList]);
    useEffect(() => {
        if (selectedChat && !(currentUser.friends || []).some(name => name.toLowerCase() === selectedChat.toLowerCase()))
            setSelectedChat(null);
    }, [selectedChat, currentUser.friends]);
    useEffect(() => {
        if (!armedRemove)
            return undefined;
        const timer = setTimeout(() => setArmedRemove(null), 3000);
        return () => clearTimeout(timer);
    }, [armedRemove]);
    const togglePinFriend = (friendName) => {
        const pins = currentUser.pinnedFriends || [];
        const isPinned = pins.some(name => name.toLowerCase() === friendName.toLowerCase());
        const updated = patchUser(currentUser.username, user => ({
            ...user,
            pinnedFriends: isPinned ? pins.filter(name => name.toLowerCase() !== friendName.toLowerCase()) : [friendName, ...pins]
        }));
        if (updated)
            onUserUpdated(updated);
    };
    const endFriendship = (friendName) => {
        const meUpdated = patchUser(currentUser.username, user => ({
            ...user,
            friends: (user.friends || []).filter(name => name.toLowerCase() !== friendName.toLowerCase()),
            pinnedFriends: (user.pinnedFriends || []).filter(name => name.toLowerCase() !== friendName.toLowerCase())
        }));
        patchUser(friendName, user => ({
            ...user,
            friends: (user.friends || []).filter(name => name.toLowerCase() !== currentUser.username.toLowerCase()),
            pinnedFriends: (user.pinnedFriends || []).filter(name => name.toLowerCase() !== currentUser.username.toLowerCase())
        }));
        if (meUpdated)
            onUserUpdated(meUpdated);
        setArmedRemove(null);
        setFeedback({ type: 'info', msg: `رفاقت شما با «${friendName}» پایان یافت.` });
    };
    const sendGameInvites = (gameType, selectedFriends) => {
        if ((currentUser.coins || 0) < ONLINE_ENTRY_FEE)
            return setFeedback({ type: 'warning', msg: `موجودی کیوجی کافی نیست! ورود به بازی آنلاین به ${ONLINE_ENTRY_FEE} کیوجی نیاز دارد.` });
        if (!selectedFriends.length)
            return setFeedback({ type: 'warning', msg: 'حداقل یک دوست را انتخاب کنید.' });
        deductCoins(currentUser.username, ONLINE_ENTRY_FEE);
        onUserUpdated(findUser(currentUser.username));
        const lobby = createLobby(currentUser.username, gameType, selectedFriends);
        setLobbySetup(null);
        onOpenLobby(lobby.id);
    };
    const acceptGameInvite = (invite) => {
        if ((currentUser.coins || 0) < ONLINE_ENTRY_FEE)
            return setFeedback({ type: 'warning', msg: `برای قبول دعوت آنلاین به ${ONLINE_ENTRY_FEE} کیوجی نیاز دارید.` });
        deductCoins(currentUser.username, ONLINE_ENTRY_FEE);
        onUserUpdated(findUser(currentUser.username));
        const lobby = joinLobby(invite.lobbyId, currentUser.username);
        if (lobby)
            onOpenLobby(lobby.id);
        else
            setFeedback({ type: 'warning', msg: 'این لابی دیگر در دسترس نیست.' });
    };
    const handleSearch = (event) => {
        event.preventDefault();
        setFeedback(null);
        const query = searchTerm.trim();
        if (!query)
            return;
        if (query.toLowerCase() === currentUser.username.toLowerCase()) {
            setSearchResult(null);
            setFeedback({ type: 'warning', msg: 'شما نمی‌توانید به خودتان درخواست بدهید!' });
            return;
        }
        const target = findUser(query);
        if (!target) {
            setSearchResult(null);
            setFeedback({ type: 'warning', msg: `بازیکنی با نام «${query}» یافت نشد.` });
            return;
        }
        const isFriend = (currentUser.friends || []).some(name => name.toLowerCase() === target.username.toLowerCase());
        const requestSent = (target.friendRequests || []).some(request => request.from.toLowerCase() === currentUser.username.toLowerCase());
        setSearchResult({ ...target, isFriend, requestSent });
    };
    const handleSendRequest = (targetUsername) => {
        const target = findUser(targetUsername);
        if (!target)
            return;
        patchUser(target.username, user => {
            const requests = user.friendRequests || [];
            if (!requests.some(request => request.from.toLowerCase() === currentUser.username.toLowerCase())) {
                requests.push({ from: currentUser.username, timestamp: new Date().toISOString() });
            }
            return { ...user, friendRequests: requests };
        });
        setFeedback({ type: 'success', msg: `درخواست دوستی برای «${target.username}» فرستاده شد.` });
        setSearchResult(previous => previous ? { ...previous, requestSent: true } : previous);
    };
    const handleAcceptRequest = (requesterName) => {
        const meUpdated = patchUser(currentUser.username, user => ({
            ...user,
            friendRequests: (user.friendRequests || []).filter(request => request.from.toLowerCase() !== requesterName.toLowerCase()),
            friends: [...new Set([...(user.friends || []), requesterName])]
        }));
        patchUser(requesterName, user => {
            const notifications = user.notifications || [];
            notifications.unshift({ id: Date.now() + Math.random(), text: `«${currentUser.username}» درخواست رفاقت شما را پذیرفت! 🎉`, type: 'success', time: new Date().toISOString() });
            return { ...user, friends: [...new Set([...(user.friends || []), currentUser.username])], notifications };
        });
        if (meUpdated)
            onUserUpdated(meUpdated);
        setFeedback({ type: 'success', msg: `شما و «${requesterName}» رفیق شدید!` });
    };
    const handleDeclineRequest = (requesterName) => {
        const meUpdated = patchUser(currentUser.username, user => ({
            ...user,
            friendRequests: (user.friendRequests || []).filter(request => request.from.toLowerCase() !== requesterName.toLowerCase())
        }));
        if (meUpdated)
            onUserUpdated(meUpdated);
        setFeedback({ type: 'info', msg: `درخواست «${requesterName}» رد شد.` });
    };
    const tabs = [
        { id: 'find', label: 'جستجوی کاربر', icon: React.createElement(IconSearch, { className: "w-4 h-4" }) },
        { id: 'requests', label: 'درخواست‌ها', icon: React.createElement(IconUserPlus, { className: "w-4 h-4" }), badge: incomingRequests.length },
        { id: 'myFriends', label: 'فهرست دوستان', icon: React.createElement(IconUsers, { className: "w-4 h-4" }), badge: myFriendsList.length },
        { id: 'messenger', label: 'پیام‌رسان', icon: React.createElement(IconMessageSquare, { className: "w-4 h-4" }) }
    ];
    const tabIndex = Math.max(0, tabs.findIndex(tab => tab.id === activeSubTab));
    return (React.createElement("div", { dir: "rtl", className: "friends-page w-full max-w-6xl mx-auto px-4 py-6 space-y-6 sm:space-y-8 pb-10" },
        React.createElement("style", null, `
                @keyframes fr2-enter { from { opacity: 0; transform: translateY(12px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
                @keyframes fr2-pop { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: scale(1); } }
                @keyframes fr2-toast { from { opacity: 0; transform: translate(-50%, -8px); } to { opacity: 1; transform: translate(-50%, 0); } }
                @keyframes fr2-float { 0%, 100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(0,-7px,0); } }
                @keyframes fr2-dot { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }
            `),
        React.createElement("header", { className: "rounded-3xl border border-white/[.06] bg-gradient-to-l from-indigo-950/60 via-slate-900/60 to-slate-900/40 p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5" },
            React.createElement("div", { className: "flex items-center gap-4" },
                React.createElement("div", { className: "rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-500/20 border border-indigo-300/20 p-3" },
                    React.createElement(IconUsers, { className: "w-10 h-10 text-indigo-200" })),
                React.createElement("div", null,
                    React.createElement("h1", { className: "text-2xl sm:text-3xl font-black text-white" }, "\u0634\u0628\u06A9\u0647 \u062F\u0648\u0633\u062A\u0627\u0646 \u06AF\u06CC\u0645\u0631"),
                    React.createElement("p", { className: "mt-1 text-sm text-slate-400" }, "\u0631\u0641\u0642\u0627\u06CC \u062A\u0627\u0632\u0647 \u067E\u06CC\u062F\u0627 \u06A9\u0646\u06CC\u062F\u060C \u06AF\u0641\u062A\u06AF\u0648 \u06A9\u0646\u06CC\u062F \u0648 \u0628\u0627 \u0647\u0645 \u0644\u0627\u0628\u06CC \u0628\u0633\u0627\u0632\u06CC\u062F."))),
            React.createElement("div", { className: "flex flex-wrap items-center gap-3" },
                React.createElement("div", { className: "rounded-xl bg-emerald-500/10 border border-emerald-400/20 px-3 py-2 flex items-center gap-2 text-sm" },
                    React.createElement("span", { className: "w-2 h-2 rounded-full bg-emerald-400 animate-[fr2-dot_1.5s_ease-in-out_infinite]" }),
                    React.createElement("span", { className: "text-slate-300" }, "\u062F\u0648\u0633\u062A\u0627\u0646 \u0622\u0646\u0644\u0627\u06CC\u0646"),
                    React.createElement("b", { className: "text-white" }, onlineFriendsCount)),
                React.createElement("div", { className: "rounded-xl bg-indigo-500/10 border border-indigo-400/20 px-3 py-2 flex items-center gap-2 text-sm" },
                    React.createElement(IconUsers, { className: "w-4 h-4 text-indigo-300" }),
                    React.createElement("span", { className: "text-slate-300" }, "\u06A9\u0644 \u062F\u0648\u0633\u062A\u0627\u0646"),
                    React.createElement("b", { className: "text-white" }, myFriendsList.length)),
                React.createElement("button", { onClick: () => setLobbySetup({ gameType: null, selected: [] }), className: "rounded-xl px-4 py-3 text-white font-black text-sm bg-gradient-to-l from-violet-600 to-fuchsia-600 active:scale-95 transition-transform duration-200 flex items-center gap-2" },
                    React.createElement(IconGamepad, { className: "w-5 h-5" }),
                    "\u0627\u06CC\u062C\u0627\u062F \u0644\u0627\u0628\u06CC \u0645\u0633\u0627\u0628\u0642\u0647"))),
        feedback && (React.createElement("div", { className: `fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)] rounded-xl border px-4 py-3 shadow-xl animate-[fr2-toast_.3s_both] ${feedback.type === 'success' ? 'bg-emerald-950 border-emerald-500/40 text-emerald-200' : feedback.type === 'warning' ? 'bg-amber-950 border-amber-500/40 text-amber-200' : 'bg-sky-950 border-sky-500/40 text-sky-200'}` },
            React.createElement("div", { className: "flex items-center gap-3" },
                React.createElement("span", { className: "font-bold" }, feedback.msg),
                React.createElement("button", { onClick: () => setFeedback(null), "aria-label": "\u0628\u0633\u062A\u0646", className: "text-white/60 hover:text-white" }, "\u2715")))),
        gameInvitations.length > 0 && (React.createElement("section", { className: "rounded-3xl border border-rose-500/20 bg-slate-900/50 p-5 space-y-4" },
            React.createElement("h2", { className: "text-lg font-black text-white" }, "\u062F\u0639\u0648\u062A\u200C\u0646\u0627\u0645\u0647\u200C\u0647\u0627\u06CC \u0645\u0633\u0627\u0628\u0642\u0647"),
            React.createElement("div", { className: "flex gap-3 overflow-x-auto pb-2" }, gameInvitations.map((invite, i) => (React.createElement("article", { key: invite.lobbyId, className: "min-w-[270px] rounded-2xl border border-white/[.06] bg-white/[.03] p-4 space-y-3 hover:-translate-y-0.5 transition-transform duration-200", style: { animationDelay: `${Math.min(i, 10) * 35}ms` } },
                React.createElement("div", { className: "flex items-center gap-3" },
                    React.createElement("span", { className: "text-2xl" }, invite.gameType === 'ludo' ? '🎲' : invite.gameType === 'chess' ? '♟' : invite.gameType === 'backgammon' ? '🎲' : '⭕'),
                    React.createElement("div", null,
                        React.createElement("div", { className: "font-bold text-white" },
                            "\u062F\u0639\u0648\u062A \u0627\u0632 ",
                            React.createElement("button", { className: "text-rose-200", onClick: () => onOpenProfile?.(invite.from) }, invite.from)),
                        React.createElement("div", { className: "text-xs text-slate-400" },
                            "\u0628\u0627\u0632\u06CC: ",
                            invite.gameType === 'ludo' ? 'منچ ۴ نفره' : invite.gameType === 'chess' ? 'شطرنج' : invite.gameType === 'backgammon' ? 'تخته نرد' : 'دوز'))),
                React.createElement("button", { onClick: () => acceptGameInvite(invite), className: "w-full rounded-xl py-2.5 bg-gradient-to-l from-emerald-600 to-teal-500 text-white font-bold text-sm flex justify-center items-center gap-2" },
                    React.createElement(IconCoin, { className: "w-4 h-4" }),
                    "\u0648\u0631\u0648\u062F \u0628\u0647 \u0628\u0627\u0632\u06CC (",
                    ONLINE_ENTRY_FEE,
                    " \u06A9\u06CC\u0648\u062C\u06CC)"))))))),
        React.createElement("nav", { className: "relative grid grid-cols-4 rounded-2xl bg-white/[.04] border border-white/[.06] p-1" },
            React.createElement("span", { className: "absolute top-1 bottom-1 right-1 w-[calc(25%-0.25rem)] rounded-xl bg-gradient-to-l from-indigo-600/80 to-violet-600/80 transition-transform duration-300", style: { transform: `translateX(-${tabIndex * 100}%)` } }),
            tabs.map(tab => (React.createElement("button", { key: tab.id, onClick: () => { setActiveSubTab(tab.id); setFeedback(null); }, className: `relative z-10 min-w-0 px-1 sm:px-3 py-3 rounded-xl flex items-center justify-center gap-1 sm:gap-2 text-[11px] sm:text-sm font-bold transition-colors duration-200 ${activeSubTab === tab.id ? 'text-white' : 'text-slate-400 hover:text-white'}` },
                tab.icon,
                React.createElement("span", { className: "truncate" }, tab.label),
                tab.badge > 0 && React.createElement("span", { className: "rounded-full bg-rose-500 px-1.5 text-[10px] text-white" }, tab.badge))))),
        React.createElement("div", { key: activeSubTab, className: "animate-[fr2-enter_.35s_cubic-bezier(.2,.8,.2,1)_both]" },
            activeSubTab === 'find' && (React.createElement("section", { className: "rounded-3xl border border-white/[.06] bg-slate-900/50 p-5 sm:p-8" },
                React.createElement("div", { className: "text-center mb-6" },
                    React.createElement("div", { className: "mx-auto mb-3 w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center animate-[fr2-float_3s_ease-in-out_infinite]" },
                        React.createElement(IconSearch, { className: "w-7 h-7 text-indigo-300" })),
                    React.createElement("h2", { className: "text-xl font-black text-white" }, "\u0628\u0627\u0632\u06CC\u06A9\u0646\u0627\u0646 \u062C\u062F\u06CC\u062F \u067E\u06CC\u062F\u0627 \u06A9\u0646\u06CC\u062F"),
                    React.createElement("p", { className: "text-sm text-slate-400 mt-2" }, "\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC \u062F\u0648\u0633\u062A \u062E\u0648\u062F \u0631\u0627 \u062C\u0633\u062A\u200C\u0648\u062C\u0648 \u06A9\u0646\u06CC\u062F \u0648 \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u0631\u0641\u0627\u0642\u062A \u0628\u0641\u0631\u0633\u062A\u06CC\u062F.")),
                React.createElement("form", { onSubmit: handleSearch, className: "max-w-xl mx-auto flex gap-2" },
                    React.createElement("input", { value: searchTerm, onChange: event => setSearchTerm(event.target.value), placeholder: "\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC (\u0645\u062B\u0644\u0627\u064B Ali_Gamer)...", className: "min-w-0 flex-1 rounded-xl bg-slate-950/70 border border-white/10 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400" }),
                    React.createElement("button", { type: "submit", className: "rounded-xl px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-2" },
                        React.createElement(IconSearch, { className: "w-4 h-4" }),
                        "\u062C\u0633\u062A\u062C\u0648")),
                searchResult && (React.createElement("article", { className: "max-w-xl mx-auto mt-5 rounded-2xl border border-indigo-400/20 bg-indigo-500/[.06] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-[fr2-pop_.25s_both]" },
                    React.createElement("div", { className: "flex items-center gap-3" },
                        React.createElement("button", { onClick: () => onOpenProfile?.(searchResult.username) },
                            React.createElement(PlayerAvatar, { user: searchResult, className: "w-12 h-12 rounded-xl" })),
                        React.createElement("div", null,
                            React.createElement("button", { onClick: () => onOpenProfile?.(searchResult.username), className: "font-black text-white" }, searchResult.username),
                            React.createElement("p", { className: "text-xs text-slate-400" }, formatLastSeen(searchResult.lastSeen, canViewLastSeen(currentUser, searchResult))))),
                    React.createElement("div", null, searchResult.isFriend ? React.createElement("span", { className: "rounded-lg bg-slate-700/60 px-3 py-2 text-sm text-slate-200" }, "\u062F\u0631 \u0641\u0647\u0631\u0633\u062A \u0631\u0641\u0642\u0627") : searchResult.requestSent ? React.createElement("span", { className: "rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-300" }, "\u062F\u0631\u062E\u0648\u0627\u0633\u062A \u0627\u0631\u0633\u0627\u0644 \u0634\u062F\u0647") : React.createElement("button", { onClick: () => handleSendRequest(searchResult.username), className: "rounded-xl px-4 py-2.5 bg-gradient-to-l from-emerald-600 to-teal-500 text-white text-sm font-bold flex items-center gap-2" },
                        React.createElement(IconUserPlus, { className: "w-4 h-4" }),
                        "\u0627\u0641\u0632\u0648\u062F\u0646 \u0628\u0647 \u062F\u0648\u0633\u062A\u0627\u0646")))))),
            activeSubTab === 'requests' && (React.createElement("section", { className: "rounded-3xl border border-white/[.06] bg-slate-900/50 p-5 sm:p-8" },
                React.createElement("h2", { className: "text-xl font-black text-white mb-5" }, "\u062F\u0631\u062E\u0648\u0627\u0633\u062A\u200C\u0647\u0627\u06CC \u062F\u0648\u0633\u062A\u06CC"),
                incomingRequests.length === 0 ? (React.createElement("div", { className: "py-12 text-center" },
                    React.createElement("div", { className: "text-4xl mb-4 animate-[fr2-float_3s_ease-in-out_infinite]" }, "\u2709"),
                    React.createElement("p", { className: "font-bold text-slate-200" }, "\u0647\u06CC\u0686 \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u062C\u062F\u06CC\u062F\u06CC \u0646\u062F\u0627\u0631\u06CC\u062F."),
                    React.createElement("p", { className: "text-sm text-slate-500 mt-2" }, "\u0632\u0645\u0627\u0646\u06CC \u06A9\u0647 \u06A9\u0633\u06CC \u0628\u0647 \u0634\u0645\u0627 \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u062F\u0648\u0633\u062A\u06CC \u0628\u062F\u0647\u062F\u060C \u062F\u0631 \u0627\u06CC\u0646 \u0628\u062E\u0634 \u0646\u0645\u0627\u06CC\u0634 \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F."))) : (React.createElement("div", { className: "grid sm:grid-cols-2 gap-3", style: { contain: 'content' } }, incomingRequests.map((request, i) => (React.createElement("article", { key: `${request.from}-${i}`, className: "rounded-2xl border border-white/[.06] bg-white/[.03] p-4 flex flex-col gap-4 animate-[fr2-enter_.3s_both]", style: { animationDelay: `${Math.min(i, 10) * 35}ms` } },
                    React.createElement("div", { className: "flex items-center gap-3" },
                        React.createElement("button", { onClick: () => onOpenProfile?.(request.from) },
                            React.createElement(PlayerAvatar, { user: findUser(request.from), className: "w-12 h-12 rounded-xl" })),
                        React.createElement("div", null,
                            React.createElement("button", { onClick: () => onOpenProfile?.(request.from), className: "font-bold text-white" }, request.from),
                            React.createElement("p", { className: "text-xs text-slate-400" },
                                "\u0645\u06CC\u200C\u062E\u0648\u0627\u0647\u062F \u0628\u0627 \u0634\u0645\u0627 \u062F\u0648\u0633\u062A \u0634\u0648\u062F \u00B7 ",
                                request.timestamp ? new Date(request.timestamp).toLocaleDateString('fa-IR') : ''))),
                    React.createElement("div", { className: "flex gap-2" },
                        React.createElement("button", { onClick: () => handleAcceptRequest(request.from), className: "flex-1 rounded-xl bg-gradient-to-l from-emerald-600 to-teal-500 py-2.5 text-white font-bold flex items-center justify-center gap-2" },
                            React.createElement(IconCheck, { className: "w-4 h-4" }),
                            "\u0642\u0628\u0648\u0644"),
                        React.createElement("button", { onClick: () => handleDeclineRequest(request.from), className: "flex-1 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2.5 text-rose-300 font-bold flex items-center justify-center gap-2" },
                            React.createElement(IconUserX, { className: "w-4 h-4" }),
                            "\u0631\u062F \u06A9\u0631\u062F\u0646"))))))))),
            activeSubTab === 'myFriends' && (React.createElement("section", { className: "space-y-4" },
                React.createElement("div", { className: "rounded-2xl border border-white/[.06] bg-white/[.03] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" },
                    React.createElement("h2", { className: "text-xl font-black text-white" },
                        "\u0641\u0647\u0631\u0633\u062A \u0631\u0641\u0642\u0627 ",
                        React.createElement("span", { className: "text-indigo-300" }, myFriendsList.length)),
                    React.createElement("div", { className: "relative" },
                        React.createElement(IconSearch, { className: "absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" }),
                        React.createElement("input", { value: friendFilter, onChange: event => setFriendFilter(event.target.value), placeholder: "\u062C\u0633\u062A\u062C\u0648 \u062F\u0631 \u0628\u06CC\u0646 \u062F\u0648\u0633\u062A\u0627\u0646...", className: "w-full sm:w-72 rounded-xl bg-slate-950/60 border border-white/10 py-2.5 pr-9 pl-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400" }))),
                myFriendsList.length === 0 ? (React.createElement("div", { className: "rounded-3xl border border-dashed border-white/10 bg-white/[.02] p-10 text-center" },
                    React.createElement("div", { className: "text-5xl animate-[fr2-float_3s_ease-in-out_infinite]" }, "\uD83D\uDD2D"),
                    React.createElement("h3", { className: "mt-4 text-xl font-black text-white" }, "\u06A9\u0633\u06CC \u0627\u06CC\u0646\u062C\u0627 \u0646\u06CC\u0633\u062A!"),
                    React.createElement("p", { className: "mt-2 text-sm text-slate-400" }, "\u0641\u0647\u0631\u0633\u062A \u062F\u0648\u0633\u062A\u0627\u0646 \u0634\u0645\u0627 \u062E\u0627\u0644\u06CC \u0627\u0633\u062A. \u0647\u0645\u06CC\u0646 \u062D\u0627\u0644\u0627 \u0627\u0648\u0644\u06CC\u0646 \u062F\u0648\u0633\u062A \u062E\u0648\u062F \u0631\u0627 \u067E\u06CC\u062F\u0627 \u06A9\u0646\u06CC\u062F."),
                    React.createElement("button", { onClick: () => setActiveSubTab('find'), className: "mt-5 rounded-xl bg-indigo-600 px-5 py-3 text-white font-bold" }, "\u062C\u0633\u062A\u062C\u0648\u06CC \u0628\u0627\u0632\u06CC\u06A9\u0646\u0627\u0646"))) : filteredFriends.length === 0 ? (React.createElement("div", { className: "rounded-2xl border border-white/[.06] bg-white/[.02] p-10 text-center text-slate-400" }, "\u0628\u0627\u0632\u06CC\u06A9\u0646\u06CC \u0628\u0627 \u0627\u06CC\u0646 \u0646\u0627\u0645 \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F.")) : (React.createElement("div", { className: "grid sm:grid-cols-2 xl:grid-cols-3 gap-3", style: { contain: 'content' } }, filteredFriends.map((friend, i) => {
                    const isPinned = (currentUser.pinnedFriends || []).some(name => name.toLowerCase() === friend.username.toLowerCase());
                    const isOnline = !friend.isGhost && friend.lastSeen && Date.now() - new Date(friend.lastSeen).getTime() < 90000;
                    const isArmed = armedRemove === friend.username;
                    return (React.createElement("article", { key: friend.username, className: `rounded-2xl border border-white/[.06] bg-white/[.03] p-3 flex items-center gap-3 animate-[fr2-enter_.3s_both] ${friend.isGhost ? 'opacity-50' : 'hover:bg-white/[.06]'} transition-colors`, style: { animationDelay: `${Math.min(i, 10) * 35}ms` } },
                        React.createElement("div", { className: "relative shrink-0" },
                            React.createElement("button", { onClick: () => !friend.isGhost && onOpenProfile?.(friend.username) },
                                React.createElement(PlayerAvatar, { user: friend, className: "w-12 h-12 rounded-xl" })),
                            React.createElement("span", { className: `absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${isOnline && canSeeOthersLastSeen && friend.settings?.showLastSeen !== false ? 'bg-emerald-400 animate-[fr2-dot_1.5s_ease-in-out_infinite]' : 'bg-slate-600'}` })),
                        React.createElement("div", { className: "min-w-0 flex-1" },
                            React.createElement("button", { onClick: () => !friend.isGhost && onOpenProfile?.(friend.username), className: "block max-w-full truncate font-bold text-white" }, friend.username),
                            React.createElement("p", { className: "text-xs text-slate-400 truncate" }, friend.isGhost ? 'کاربر حذف شده' : formatLastSeen(friend.lastSeen, canViewLastSeen(currentUser, friend)))),
                        friend.isGhost ? (React.createElement("button", { onClick: () => isArmed ? endFriendship(friend.username) : setArmedRemove(friend.username), className: `shrink-0 rounded-lg px-2.5 py-2 text-xs font-bold ${isArmed ? 'bg-rose-600 text-white' : 'text-rose-300 bg-rose-500/10'}`, title: "\u062D\u0630\u0641 \u0627\u0632 \u062F\u0648\u0633\u062A\u0627\u0646" }, isArmed ? 'مطمئن؟' : React.createElement(IconUserX, { className: "w-4 h-4" }))) : (React.createElement("div", { className: "flex shrink-0 items-center gap-1" },
                            React.createElement("button", { onClick: () => togglePinFriend(friend.username), title: isPinned ? 'برداشتن سنجاق' : 'سنجاق کردن', className: `p-2 transition-transform hover:rotate-12 ${isPinned ? 'text-amber-400' : 'text-slate-500'}` },
                                React.createElement(IconPin, { className: "w-4 h-4", filled: isPinned })),
                            React.createElement("button", { onClick: () => { setSelectedChat(friend.username); setActiveSubTab('messenger'); }, title: "\u067E\u06CC\u0627\u0645", className: "rounded-lg bg-slate-800/80 p-2 text-slate-300 hover:text-white" },
                                React.createElement(IconMessageSquare, { className: "w-4 h-4" })),
                            React.createElement("button", { onClick: () => setLobbySetup({ gameType: null, selected: [friend.username] }), title: "\u0628\u0627\u0632\u06CC", className: "rounded-lg bg-slate-800/80 p-2 text-slate-300 hover:text-emerald-300" },
                                React.createElement(IconGamepad, { className: "w-4 h-4" })),
                            React.createElement("button", { onClick: () => isArmed ? endFriendship(friend.username) : setArmedRemove(friend.username), title: "\u062D\u0630\u0641 \u0627\u0632 \u062F\u0648\u0633\u062A\u0627\u0646", className: `rounded-lg p-2 ${isArmed ? 'bg-rose-600 text-white' : 'bg-slate-800/80 text-slate-400 hover:text-rose-300'}` }, isArmed ? 'مطمئن؟' : React.createElement(IconUserX, { className: "w-4 h-4" }))))));
                })))))),
        activeSubTab === 'messenger' && (React.createElement("section", { className: "min-h-[420px] rounded-3xl border border-white/[.06] bg-slate-900/50 p-4 sm:p-6" }, !selectedChat ? (React.createElement(React.Fragment, null,
            React.createElement("div", { className: "mb-5" },
                React.createElement("h2", { className: "text-xl font-black text-white" }, "\u067E\u06CC\u0627\u0645\u200C\u0647\u0627\u06CC \u0634\u0645\u0627"),
                React.createElement("p", { className: "mt-1 text-sm text-slate-400" }, "\u0628\u0631\u0627\u06CC \u0634\u0631\u0648\u0639 \u06CC\u0627 \u0627\u062F\u0627\u0645\u0647 \u06AF\u0641\u062A\u06AF\u0648\u060C \u06CC\u06A9\u06CC \u0627\u0632 \u062F\u0648\u0633\u062A\u0627\u0646 \u062E\u0648\u062F \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F.")),
            React.createElement("div", { className: "space-y-2", style: { contain: 'content' } }, myFriendsList.filter(friend => !friend.isGhost).length === 0 ? React.createElement("div", { className: "py-16 text-center text-slate-500" }, "\u062F\u0648\u0633\u062A\u06CC \u0628\u0631\u0627\u06CC \u0686\u062A \u06A9\u0631\u062F\u0646 \u0646\u062F\u0627\u0631\u06CC\u062F.") : myFriendsList.filter(friend => !friend.isGhost).map((friend, i) => {
                const isPinned = (currentUser.pinnedFriends || []).some(name => name.toLowerCase() === friend.username.toLowerCase());
                const isOnline = friend.lastSeen && Date.now() - new Date(friend.lastSeen).getTime() < 90000;
                return React.createElement("button", { key: friend.username, onClick: () => setSelectedChat(friend.username), className: "w-full rounded-2xl border border-white/[.05] bg-white/[.02] p-3 flex items-center gap-3 text-right hover:bg-white/[.06] transition-colors animate-[fr2-enter_.3s_both]", style: { animationDelay: `${Math.min(i, 10) * 35}ms` } },
                    React.createElement("span", { className: "relative" },
                        React.createElement(PlayerAvatar, { user: friend, className: "w-12 h-12 rounded-xl" }),
                        React.createElement("span", { className: `absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${isOnline ? 'bg-emerald-400 animate-[fr2-dot_1.5s_ease-in-out_infinite]' : 'bg-slate-600'}` })),
                    React.createElement("span", { className: "min-w-0 flex-1" },
                        React.createElement("span", { className: "block truncate font-bold text-white" }, friend.username),
                        React.createElement("span", { className: "block truncate text-xs text-slate-400" }, formatLastSeen(friend.lastSeen, canViewLastSeen(currentUser, friend)))),
                    isPinned && React.createElement(IconPin, { className: "w-4 h-4 text-amber-400", filled: true }),
                    React.createElement(IconMessageSquare, { className: "w-4 h-4 text-indigo-300" }));
            })))) : (React.createElement("div", { className: "flex min-h-[380px] flex-col overflow-hidden rounded-2xl border border-indigo-500/20 bg-slate-950/40" },
            React.createElement("div", { className: "flex items-center justify-between border-b border-white/[.06] p-3" },
                React.createElement("div", { className: "flex items-center gap-3" },
                    React.createElement(PlayerAvatar, { user: findUser(selectedChat), className: "w-10 h-10 rounded-xl" }),
                    React.createElement("span", { className: "font-bold text-white" }, selectedChat)),
                React.createElement("button", { onClick: () => setSelectedChat(null), className: "rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200" }, "\u0628\u0627\u0632\u06AF\u0634\u062A")),
            React.createElement("div", { className: "flex-1 min-h-[350px]" },
                React.createElement(ChatPanel, { key: selectedChat, currentUser: currentUser, peerName: selectedChat, onOpenProfile: onOpenProfile })))))),
        lobbySetup && (React.createElement("div", { className: "fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4", onClick: event => { if (event.target === event.currentTarget)
                setLobbySetup(null); } },
            React.createElement("section", { role: "dialog", "aria-modal": "true", className: "w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 p-5 sm:p-6 space-y-4 animate-[fr2-pop_.3s_both]" },
                React.createElement("div", { className: "flex items-center justify-between" },
                    React.createElement("h2", { className: "text-xl font-black text-white" },
                        "\u0627\u06CC\u062C\u0627\u062F \u0645\u0633\u0627\u0628\u0642\u0647 \u0627\u062E\u062A\u0635\u0627\u0635\u06CC ",
                        React.createElement("span", { className: "text-xs text-violet-300" }, "\u0645\u062E\u0641\u06CC")),
                    React.createElement("button", { onClick: () => setLobbySetup(null), "aria-label": "\u0628\u0633\u062A\u0646", className: "rounded-lg bg-slate-800 px-3 py-2 text-slate-300" }, "\u2715")),
                React.createElement("div", { className: "rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 flex items-center gap-2 text-sm text-amber-200" },
                    React.createElement(IconCoin, { className: "w-5 h-5 shrink-0" }),
                    React.createElement("span", null,
                        "\u0648\u0631\u0648\u062F \u0628\u0647 \u0645\u0633\u0627\u0628\u0642\u0647 ",
                        ONLINE_ENTRY_FEE,
                        " \u06A9\u06CC\u0648\u062C\u06CC \u0646\u06CC\u0627\u0632 \u062F\u0627\u0631\u062F (\u0645\u0648\u062C\u0648\u062F\u06CC \u0641\u0639\u0644\u06CC: ",
                        currentUser.coins || 0,
                        ").")),
                !lobbySetup.gameType ? (React.createElement("div", { className: "space-y-3" },
                    React.createElement("p", { className: "text-sm font-bold text-slate-300" }, "\u0628\u0627\u0632\u06CC \u0645\u0648\u0631\u062F \u0646\u0638\u0631 \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F:"),
                    React.createElement("div", { className: "grid grid-cols-2 gap-2.5" },
                        React.createElement("button", { onClick: () => setLobbySetup(previous => ({ ...previous, gameType: 'tictactoe' })), className: "rounded-2xl border border-cyan-500/30 bg-slate-950/40 p-3 sm:p-4 text-center hover:border-cyan-300 transition-colors" },
                            React.createElement("span", { className: "block text-2xl" }, "\u2B55\u274C"),
                            React.createElement("strong", { className: "mt-2 block text-white text-xs sm:text-sm" }, "\u062F\u0648\u0632 \u06F2 \u0646\u0641\u0631\u0647"),
                            React.createElement("span", { className: "text-[10px] sm:text-[11px] text-cyan-300" }, "\u062C\u0627\u06CC\u0632\u0647 \u06F4\u06F0 \u06A9\u06CC\u0648\u062C\u06CC")),
                        React.createElement("button", { onClick: () => setLobbySetup(previous => ({ ...previous, gameType: 'ludo' })), className: "rounded-2xl border border-amber-500/30 bg-slate-950/40 p-3 sm:p-4 text-center hover:border-amber-300 transition-colors" },
                            React.createElement("span", { className: "block text-2xl" }, "\uD83C\uDFB2"),
                            React.createElement("strong", { className: "mt-2 block text-white text-xs sm:text-sm" }, "\u0645\u0646\u0686 \u06F4 \u0646\u0641\u0631\u0647"),
                            React.createElement("span", { className: "text-[10px] sm:text-[11px] text-amber-300" }, "\u062C\u0627\u06CC\u0632\u0647 \u06F1\u06F0\u06F0 \u06A9\u06CC\u0648\u062C\u06CC")),
                        React.createElement("button", { onClick: () => setLobbySetup(previous => ({ ...previous, gameType: 'chess' })), className: "rounded-2xl border border-indigo-500/30 bg-slate-950/40 p-3 sm:p-4 text-center hover:border-indigo-300 transition-colors" },
                            React.createElement("span", { className: "block text-2xl" }, "\u265F"),
                            React.createElement("strong", { className: "mt-2 block text-white text-xs sm:text-sm" }, "\u0634\u0637\u0631\u0646\u062C \u06A9\u0644\u0627\u0633\u06CC\u06A9"),
                            React.createElement("span", { className: "text-[10px] sm:text-[11px] text-indigo-300" }, "\u062C\u0627\u06CC\u0632\u0647 \u06F5\u06F0 \u06A9\u06CC\u0648\u062C\u06CC")),
                        React.createElement("button", { onClick: () => setLobbySetup(previous => ({ ...previous, gameType: 'backgammon' })), className: "rounded-2xl border border-amber-500/40 bg-slate-950/40 p-3 sm:p-4 text-center hover:border-amber-400 transition-colors ring-1 ring-amber-500/20" },
                            React.createElement("span", { className: "block text-2xl" }, "\uD83C\uDFB2"),
                            React.createElement("strong", { className: "mt-2 block text-white text-xs sm:text-sm" }, "\u062A\u062E\u062A\u0647 \u0646\u0631\u062F"),
                            React.createElement("span", { className: "text-[10px] sm:text-[11px] text-amber-300" }, "\u062C\u0627\u06CC\u0632\u0647 \u06F6\u06F0 \u062A\u0627 \u06F1\u06F8\u06F0 \u06A9\u06CC\u0648\u062C\u06CC"))))) : (React.createElement("div", { className: "space-y-3" },
                    React.createElement("div", { className: "flex items-center justify-between" },
                        React.createElement("p", { className: "text-sm font-bold text-slate-300" }, "\u062F\u0648\u0633\u062A\u0627\u0646 \u062E\u0648\u062F \u0631\u0627 \u062F\u0639\u0648\u062A \u06A9\u0646\u06CC\u062F:"),
                        React.createElement("span", { className: "rounded-full bg-indigo-500/15 px-3 py-1 text-xs text-indigo-200" },
                            lobbySetup.selected.length,
                            " \u0646\u0641\u0631 \u0627\u0646\u062A\u062E\u0627\u0628 \u0634\u062F\u0647")),
                    myFriendsList.filter(friend => !friend.isGhost).length === 0 ? React.createElement("p", { className: "rounded-xl bg-white/[.03] p-4 text-center text-sm text-slate-400" }, "\u062F\u0648\u0633\u062A\u06CC \u0628\u0631\u0627\u06CC \u062F\u0639\u0648\u062A \u0646\u062F\u0627\u0631\u06CC\u062F.") : React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-2", style: { contain: 'content' } }, myFriendsList.filter(friend => !friend.isGhost).map((friend, i) => {
                        const isSelected = lobbySetup.selected.includes(friend.username);
                        return React.createElement("button", { key: friend.username, onClick: () => setLobbySetup(previous => ({ ...previous, selected: isSelected ? previous.selected.filter(name => name !== friend.username) : [...previous.selected, friend.username] })), className: `rounded-2xl border p-3 flex flex-col items-center gap-2 transition-colors ${isSelected ? 'ring-2 ring-indigo-400 bg-indigo-500/10 border-indigo-400' : 'border-white/10 bg-slate-950/40 hover:border-white/20'}`, style: { animationDelay: `${Math.min(i, 10) * 35}ms` } },
                            React.createElement(PlayerAvatar, { user: friend, className: "w-11 h-11 rounded-xl" }),
                            React.createElement("span", { className: "w-full truncate text-xs font-bold text-white" }, friend.username));
                    })),
                    React.createElement("div", { className: "flex gap-2 border-t border-white/[.06] pt-3" },
                        React.createElement("button", { onClick: () => setLobbySetup(previous => ({ ...previous, gameType: null })), className: "rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold text-white" }, "\u0628\u0627\u0632\u06AF\u0634\u062A"),
                        React.createElement("button", { disabled: !lobbySetup.selected.length, onClick: () => sendGameInvites(lobbySetup.gameType, lobbySetup.selected), className: "flex-1 rounded-xl bg-gradient-to-l from-indigo-600 to-violet-600 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40" },
                            "\u062A\u0623\u06CC\u06CC\u062F \u0648 \u0648\u0631\u0648\u062F (",
                            ONLINE_ENTRY_FEE,
                            " \u06A9\u06CC\u0648\u062C\u06CC)")))),
                React.createElement("button", { onClick: () => setLobbySetup(null), className: "w-full rounded-xl border border-white/10 py-2.5 text-sm text-slate-400 hover:text-white" }, "\u0627\u0646\u0635\u0631\u0627\u0641"))))));
};

/* ===== pages/AlliancePage.jsx ===== */
const AlliancePage = ({ currentUser, onUserUpdated, onOpenProfile }) => {
    const [alliance, setAlliance] = useState(() => getUserAlliance(currentUser.username));
    const [tab, setTab] = useState('members');
    const [query, setQuery] = useState('');
    const [name, setName] = useState('');
    const [toast, setToast] = useState(null);
    const [message, setMessage] = useState('');
    const [donation, setDonation] = useState('');
    const [donateOpen, setDonateOpen] = useState(false);
    const [leaveOpen, setLeaveOpen] = useState(false);
    const [entryFee, setEntryFee] = useState(() => getUserAlliance(currentUser.username)?.entryFee || 0);
    const chatRef = useRef(null);
    // Global helper available to this page: getUserDiscounts.
    const refresh = () => setAlliance(getUserAlliance(currentUser.username));
    useEffect(() => { refresh(); }, [currentUser.username]);
    useEffect(() => { const id = setInterval(refresh, 1500); return () => clearInterval(id); }, [currentUser.username]);
    useEffect(() => { setEntryFee(alliance?.entryFee || 0); }, [alliance?.id]);
    useEffect(() => { if (chatRef.current)
        chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [alliance?.messages?.length, tab]);
    const feedback = (type, text) => { setToast({ type, text }); setTimeout(() => setToast(null), 3500); };
    const leader = alliance?.creator;
    const isLeader = !!alliance && leader?.toLowerCase() === currentUser.username.toLowerCase();
    const isAdmin = !!alliance && isAllianceAdmin(currentUser.username, alliance);
    const memberNames = a => (a?.members || []).map(m => typeof m === 'string' ? m : m.username);
    const create = () => { const r = createAlliance(currentUser.username, name); if (!r.ok)
        return feedback('error', r.msg); setName(''); onUserUpdated?.(r.user); refresh(); feedback('success', 'آلیانز با موفقیت ساخته شد.'); };
    const join = a => { const r = joinAlliance(currentUser.username, a.id); if (!r.ok)
        return feedback('error', r.msg); onUserUpdated?.(r.user); refresh(); feedback('success', r.pending ? 'درخواست عضویت ثبت شد و هزینه ورود پرداخت گردید؛ منتظر تأیید مدیران باشید.' : `به آلیانز «${a.name}» پیوستید.`); };
    const submitMessage = e => { e.preventDefault(); if (sendAllianceMessage(currentUser.username, message)) {
        setMessage('');
        refresh();
    } };
    const donate = () => { const n = parseInt(donation, 10); if (!donateAlliance(currentUser.username, n))
        return feedback('error', 'مبلغ یا موجودی کیوجی نامعتبر است.'); onUserUpdated?.(findUser(currentUser.username)); setDonateOpen(false); setDonation(''); refresh(); feedback('success', 'مبلغ به خزانه واریز شد.'); };
    const upgrade = k => { const r = upgradeAlliance(currentUser.username, k); if (!r.ok)
        return feedback('error', r.msg); refresh(); feedback('success', 'ارتقا با موفقیت انجام شد.'); };
    const saveFee = () => { const n = Math.max(0, Math.min(100000, Number(entryFee) || 0)); if (!updateAllianceSettings(currentUser.username, n))
        feedback('error', 'مبلغ ورود نامعتبر است.');
    else {
        setEntryFee(n);
        refresh();
        feedback('success', 'شرایط ورود ذخیره شد.');
    } };
    const confirmLeave = () => { const creator = isAllianceCreator(currentUser.username, alliance), ok = leaveAlliance(currentUser.username); setLeaveOpen(false); if (!ok)
        return feedback('error', 'خروج از آلیانز انجام نشد.'); refresh(); setTab('members'); feedback('success', creator ? 'آلیانز منحل شد.' : 'از آلیانز خارج شدید.'); };
    const toggleAdmin = username => { const r = setAllianceAdmin(currentUser.username, username, !alliance.admins?.some(x => x.toLowerCase() === username.toLowerCase())); if (!r.ok)
        return feedback('error', r.msg); refresh(); feedback('success', r.msg || 'وضعیت ادمین به‌روزرسانی شد.'); };
    const respond = (req, accept) => { const r = respondJoinRequest(currentUser.username, alliance.id, req.username, accept); if (!r.ok)
        feedback('error', r.msg);
    else
        feedback('success', accept ? 'درخواست عضویت پذیرفته شد.' : 'درخواست رد شد و مبلغ بازگردانده شد.'); refresh(); };
    const tabs = [['members', 'اعضای آلیانز', '♟'], ['chat', 'تالار چت گروهی', '◉'], ['services', 'خدمات و ارتقا', '✦'], ['settings', 'تنظیمات', '⚙'], ...(isAdmin ? [['requests', 'درخواست‌ها', '✉']] : [])];
    const card = 'rounded-2xl bg-white/[.04] border border-white/[.06] backdrop-blur-xl p-5 shadow-2xl shadow-black/40 transition-all duration-300 hover:border-indigo-400/30 hover:-translate-y-1';
    const btnBase = 'font-bold transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:pointer-events-none';
    const btnPrimary = `bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/40 ${btnBase}`;
    const btnEmerald = `bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-600/25 hover:shadow-emerald-500/40 ${btnBase}`;
    const btnRose = `bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-600/25 hover:shadow-rose-500/40 ${btnBase}`;
    const inputCls = 'w-full rounded-xl border border-white/10 bg-white/[.05] px-4 py-3 text-slate-100 placeholder-slate-500 outline-none transition-all duration-300 focus:border-indigo-400/50 focus:bg-white/[.08] focus:shadow-lg focus:shadow-indigo-500/10';
    const AvatarLetter = ({ u, size = 'w-10 h-10' }) => {
        const letter = (u?.username || '?').trim().charAt(0).toUpperCase();
        const hue = [...(u?.username || 'x')].reduce((s, c) => s + c.charCodeAt(0), 0) % 360;
        return React.createElement("span", { className: `${size} shrink-0 rounded-full grid place-items-center font-black text-white shadow-lg ring-2 ring-white/10`, style: { background: `linear-gradient(135deg,hsl(${hue} 70% 45%),hsl(${(hue + 60) % 360} 70% 35%))` } }, letter);
    };
    const style = React.createElement("style", null, `
    @keyframes alz2-rise{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
    @keyframes alz2-fadeSlide{from{opacity:0;transform:translateY(14px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes alz2-float{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-26px) scale(1.08)}}
    @keyframes alz2-shine{from{transform:translateX(-120%)}to{transform:translateX(220%)}}
    @keyframes alz2-toastIn{from{opacity:0;transform:translateY(-20px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes alz2-pop{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}
    @keyframes alz2-pulse{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,.45)}50%{box-shadow:0 0 0 12px rgba(99,102,241,0)}}
    @keyframes alz2-crown{0%,100%{transform:translateY(0) rotate(-6deg)}50%{transform:translateY(-3px) rotate(6deg)}}
    .alz2-scroll::-webkit-scrollbar{width:6px}
    .alz2-scroll::-webkit-scrollbar-thumb{background:rgba(99,102,241,.4);border-radius:99px}
  `);
    /* ---------- no alliance ---------- */
    if (!alliance)
        return React.createElement("main", { className: "mx-auto w-full max-w-6xl p-3 sm:p-6 text-slate-100", dir: "rtl" },
            style,
            React.createElement("section", { className: "relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-l from-indigo-700 via-violet-700 to-fuchsia-700 p-8 sm:p-10 text-center shadow-2xl shadow-indigo-900/50 animate-[alz2-rise_.5s_cubic-bezier(.2,.8,.2,1)_both]" },
                React.createElement("div", { className: "pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-fuchsia-400/30 blur-3xl animate-[alz2-float_7s_ease-in-out_infinite]" }),
                React.createElement("div", { className: "pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-indigo-300/25 blur-3xl animate-[alz2-float_9s_ease-in-out_infinite_1s]" }),
                React.createElement("h1", { className: "relative text-3xl sm:text-4xl font-black text-white drop-shadow-lg animate-[alz2-fadeSlide_.5s_ease_both]" }, "\uD83D\uDEE1\uFE0F \u0622\u0644\u06CC\u0627\u0646\u0632\u0647\u0627"),
                React.createElement("p", { className: "relative mt-2 text-indigo-100/90 animate-[alz2-fadeSlide_.5s_ease_both]" }, "\u0628\u0647 \u06CC\u06A9 \u0622\u0644\u06CC\u0627\u0646\u0632 \u0628\u067E\u06CC\u0648\u0646\u062F\u06CC\u062F \u06CC\u0627 \u0622\u0644\u06CC\u0627\u0646\u0632 \u062E\u0648\u062F\u062A\u0627\u0646 \u0631\u0627 \u0628\u0633\u0627\u0632\u06CC\u062F \u0648 \u0628\u0627 \u062A\u06CC\u0645 \u0642\u0648\u06CC\u200C\u062A\u0631 \u0634\u0648\u06CC\u062F.")),
            React.createElement("div", { className: "mt-5 grid gap-5 lg:grid-cols-3" },
                React.createElement("section", { className: `${card} lg:col-span-2 animate-[alz2-fadeSlide_.45s_ease_both]`, style: { animationDelay: '80ms' } },
                    React.createElement("div", { className: "mb-5 flex flex-wrap items-center justify-between gap-2" },
                        React.createElement("h2", { className: "text-2xl font-black" }, "\uD83D\uDD0D \u062C\u0633\u062A\u062C\u0648 \u0648 \u0645\u0631\u0648\u0631 \u0622\u0644\u06CC\u0627\u0646\u0632\u0647\u0627"),
                        React.createElement("span", { className: "text-sm text-slate-400" }, "\u0639\u0636\u0648\u06CC\u062A \u062F\u0631 \u0622\u0644\u06CC\u0627\u0646\u0632 \u0631\u0627\u06CC\u06AF\u0627\u0646 \u0627\u0633\u062A*")),
                    React.createElement("input", { value: query, onChange: e => setQuery(e.target.value), placeholder: "\u062C\u0633\u062A\u062C\u0648\u06CC \u0646\u0627\u0645 \u0622\u0644\u06CC\u0627\u0646\u0632...", className: `${inputCls} mb-4` }),
                    React.createElement("div", { className: "space-y-3" },
                        getAlliances().filter(a => a.name.toLowerCase().includes(query.trim().toLowerCase())).map((a, i) => {
                            const pending = (a.joinRequests || []).some(r => r.username.toLowerCase() === currentUser.username.toLowerCase());
                            const full = a.members.length >= a.capacity;
                            const pct = Math.min(100, Math.round(a.members.length * 100 / a.capacity));
                            return React.createElement("div", { key: a.id, className: "group flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[.06] bg-white/[.03] p-4 transition-all duration-300 hover:border-indigo-400/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-900/30 animate-[alz2-fadeSlide_.4s_ease_both]", style: { animationDelay: `${i * 50}ms` } },
                                React.createElement("div", { className: "min-w-0" },
                                    React.createElement("div", { className: "flex items-center gap-2" },
                                        React.createElement("span", { className: "text-lg font-black group-hover:text-indigo-300 transition-colors duration-300" }, a.name),
                                        React.createElement("span", { className: `rounded-full px-2 py-.5 text-[11px] font-bold ${a.privacy === 'private' ? 'border border-rose-400/40 bg-rose-500/10 text-rose-300' : 'border border-emerald-400/40 bg-emerald-500/10 text-emerald-300'}` }, a.privacy === 'private' ? 'پرایوت' : 'پابلیک'),
                                        React.createElement("span", { className: `rounded-full px-2 py-.5 text-[11px] font-bold border ${a.entryFee ? 'border-amber-400/40 bg-amber-500/10 text-amber-300' : 'border-white/10 bg-white/5 text-slate-300'}` }, a.entryFee ? `${a.entryFee} کیوجی` : 'رایگان')),
                                    React.createElement("div", { className: "mt-1 text-sm text-slate-400" },
                                        "\u0631\u0647\u0628\u0631: ",
                                        a.creator,
                                        " \u00B7 \u0627\u0639\u0636\u0627: ",
                                        a.members.length,
                                        "/",
                                        a.capacity),
                                    React.createElement("div", { className: "mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-white/10" },
                                        React.createElement("div", { className: "h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all duration-500", style: { width: `${pct}%` } }))),
                                React.createElement("button", { onClick: () => join(a), disabled: pending || full, className: `${pending ? 'border border-white/10 bg-white/5 text-slate-400' : btnPrimary} rounded-xl px-5 py-2.5 ${btnBase}` }, pending ? 'در انتظار تأیید' : full ? 'تکمیل ظرفیت' : 'عضویت'));
                        }),
                        !getAlliances().some(a => a.name.toLowerCase().includes(query.trim().toLowerCase())) && React.createElement("p", { className: "py-6 text-center text-slate-400" }, "\u0622\u0644\u06CC\u0627\u0646\u0632\u06CC \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F."))),
                React.createElement("section", { className: `${card} animate-[alz2-fadeSlide_.45s_ease_both]`, style: { animationDelay: '160ms' } },
                    React.createElement("h2", { className: "mb-2 text-xl font-black" }, "\u2728 \u0633\u0627\u062E\u062A \u0622\u0644\u06CC\u0627\u0646\u0632"),
                    React.createElement("p", { className: "mb-4 text-sm text-slate-400" },
                        "\u0647\u0632\u06CC\u0646\u0647 \u0633\u0627\u062E\u062A: ",
                        React.createElement("b", { className: "inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-.5 text-amber-300" },
                            React.createElement(IconCoin, { className: "h-4 w-4" }),
                            "\u06F5\u06F0\u06F0")),
                    React.createElement("input", { value: name, onChange: e => setName(e.target.value), maxLength: 32, placeholder: "\u0646\u0627\u0645 \u0622\u0644\u06CC\u0627\u0646\u0632", className: `${inputCls} mb-3` }),
                    React.createElement("button", { onClick: create, className: `${btnPrimary} w-full rounded-xl p-3 text-lg` }, "\u0633\u0627\u062E\u062A \u0622\u0644\u06CC\u0627\u0646\u0632"),
                    React.createElement("p", { className: "mt-3 text-xs leading-6 text-slate-500" }, "\u0647\u0631 \u06A9\u0627\u0631\u0628\u0631 \u0641\u0642\u0637 \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u062F \u0639\u0636\u0648 \u06CC\u06A9 \u0622\u0644\u06CC\u0627\u0646\u0632 \u0628\u0627\u0634\u062F. \u0646\u0627\u0645\u200C\u0647\u0627\u06CC \u062A\u06A9\u0631\u0627\u0631\u06CC \u067E\u0630\u06CC\u0631\u0641\u062A\u0647 \u0646\u0645\u06CC\u200C\u0634\u0648\u0646\u062F."))),
            toast && React.createElement("div", { className: `fixed top-4 right-1/2 translate-x-1/2 z-[110] rounded-xl border px-5 py-3 font-bold shadow-2xl animate-[alz2-toastIn_.35s_cubic-bezier(.2,.8,.2,1)_both] ${toast.type === 'error' ? 'border-rose-400/40 bg-rose-500/15 text-rose-200 backdrop-blur-xl' : 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200 backdrop-blur-xl'}` }, toast.text));
    const pct = Math.min(100, Math.round((alliance.members?.length || 0) * 100 / (alliance.capacity || 1)));
    return React.createElement("main", { className: "mx-auto w-full max-w-6xl p-3 sm:p-6 text-slate-100", dir: "rtl" },
        style,
        toast && React.createElement("div", { className: `fixed top-4 right-1/2 translate-x-1/2 z-[110] rounded-xl border px-5 py-3 font-bold shadow-2xl animate-[alz2-toastIn_.35s_cubic-bezier(.2,.8,.2,1)_both] ${toast.type === 'error' ? 'border-rose-400/40 bg-rose-500/15 text-rose-200 backdrop-blur-xl' : 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200 backdrop-blur-xl'}` }, toast.text),
        React.createElement("header", { className: "relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-l from-indigo-700 via-violet-700 to-fuchsia-700 p-6 sm:p-8 shadow-2xl shadow-indigo-900/40 animate-[alz2-rise_.5s_cubic-bezier(.2,.8,.2,1)_both]" },
            React.createElement("div", { className: "pointer-events-none absolute -top-14 -right-8 h-52 w-52 rounded-full bg-fuchsia-400/30 blur-3xl animate-[alz2-float_7s_ease-in-out_infinite]" }),
            React.createElement("div", { className: "pointer-events-none absolute -bottom-16 -left-8 h-56 w-56 rounded-full bg-indigo-300/25 blur-3xl animate-[alz2-float_9s_ease-in-out_infinite_1.2s]" }),
            React.createElement("div", { className: "pointer-events-none absolute inset-x-0 top-1/2 h-1/2 overflow-hidden" },
                React.createElement("div", { className: "h-px w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[alz2-shine_4s_linear_infinite]" })),
            React.createElement("div", { className: "relative flex flex-wrap items-center justify-between gap-4" },
                React.createElement("div", null,
                    React.createElement("div", { className: "flex flex-wrap items-center gap-3" },
                        React.createElement("h1", { className: "text-2xl sm:text-3xl font-black text-white drop-shadow" },
                            "\uD83D\uDEE1\uFE0F ",
                            alliance.name),
                        React.createElement("span", { className: `rounded-full border px-3 py-1 text-xs font-bold ${alliance.privacy === 'private' ? 'border-rose-200/50 bg-rose-500/20 text-rose-100' : 'border-emerald-200/50 bg-emerald-500/20 text-emerald-50'}` }, alliance.privacy === 'private' ? 'پرایوت' : 'پابلیک')),
                    React.createElement("p", { className: "mt-1 text-sm text-indigo-100/90" },
                        "\u0631\u0647\u0628\u0631: ",
                        leader,
                        " \u00B7 \u0627\u0639\u0636\u0627: ",
                        alliance.members.length,
                        "/",
                        alliance.capacity),
                    React.createElement("div", { className: "mt-3 h-2 w-56 overflow-hidden rounded-full bg-black/25" },
                        React.createElement("div", { className: "h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300 transition-all duration-700 animate-[alz2-pulse_2.6s_ease-in-out_infinite]", style: { width: `${pct}%` } }))),
                React.createElement("div", { className: "flex items-center gap-3" },
                    React.createElement("div", { className: "rounded-2xl border border-amber-300/40 bg-black/25 px-5 py-3 text-center backdrop-blur-md" },
                        React.createElement("div", { className: "text-xs text-amber-200" }, "\u062E\u0632\u0627\u0646\u0647 \u06A9\u06CC\u0648\u062C\u06CC"),
                        React.createElement("b", { className: "inline-flex items-center gap-1 text-xl text-amber-300" },
                            React.createElement(IconCoin, { className: "h-5 w-5" }),
                            (alliance.treasury || 0).toLocaleString('fa-IR'))),
                    React.createElement("button", { onClick: () => setDonateOpen(true), className: `rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-3 font-black text-slate-950 shadow-lg shadow-amber-500/30 hover:shadow-amber-400/50 ${btnBase}` }, "\u0648\u0627\u0631\u06CC\u0632 \u0628\u0647 \u062E\u0632\u0627\u0646\u0647")))),
        React.createElement("nav", { className: "relative mt-5 rounded-2xl border border-white/[.06] bg-white/[.03] p-1.5 backdrop-blur-xl animate-[alz2-fadeSlide_.4s_ease_both]" },
            React.createElement("div", { className: "relative flex" },
                React.createElement("div", { className: "absolute inset-y-0 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg shadow-indigo-600/30 transition-all duration-300", style: { width: `calc(${100 / tabs.length}% - 6px)`, right: '3px', right: `calc(3px + ${tabs.findIndex(t => t[0] === tab) * 100 / tabs.length}%)`, width: `calc(${100 / tabs.length}% - 6px)` } }),
                tabs.map(([id, label, icon]) => React.createElement("button", { key: id, onClick: () => setTab(id), className: `relative z-10 flex-1 rounded-xl px-2 py-2.5 text-xs sm:text-sm font-bold transition-all duration-300 ${tab === id ? 'text-white' : 'text-slate-400 hover:text-slate-200'}` },
                    icon,
                    " ",
                    label)))),
        React.createElement("div", { key: tab, className: "mt-5 animate-[alz2-fadeSlide_.4s_ease_both]" },
            tab === 'members' && React.createElement("section", { className: `${card} space-y-3` },
                React.createElement("h2", { className: "mb-4 text-xl font-black" }, "\uD83D\uDC65 \u0627\u0639\u0636\u0627\u06CC \u0622\u0644\u06CC\u0627\u0646\u0632"),
                memberNames(alliance).map((username, i) => {
                    const u = findUser(username) || { username };
                    const admin = alliance.admins?.some(x => x.toLowerCase() === username.toLowerCase());
                    const creator = username.toLowerCase() === leader.toLowerCase();
                    return React.createElement("div", { key: username, className: "group flex items-center justify-between rounded-2xl border border-white/[.06] bg-white/[.03] p-3 transition-all duration-300 hover:border-indigo-400/30 hover:-translate-y-1 animate-[alz2-fadeSlide_.4s_ease_both]", style: { animationDelay: `${i * 50}ms` } },
                        React.createElement("button", { onClick: () => onOpenProfile?.(username), className: "flex min-w-0 items-center gap-3" },
                            React.createElement("span", { className: "relative" },
                                React.createElement(AvatarLetter, { u: u }),
                                creator && React.createElement("span", { className: "absolute -top-3 -left-2 text-amber-400 text-lg animate-[alz2-crown_1.6s_ease-in-out_infinite] drop-shadow" }, "\u265B")),
                            React.createElement("span", { className: "text-right min-w-0" },
                                React.createElement("b", { className: "flex items-center gap-1" },
                                    username,
                                    admin && !creator && React.createElement("span", { className: "text-amber-300" }, "\u2605")),
                                React.createElement("span", { className: "block text-xs text-slate-400" },
                                    creator ? 'سازنده آلیانز' : admin ? 'ادمین آلیانز' : 'عضو',
                                    u.equipped?.title ? ` · ${u.equipped.title}` : ''))),
                        React.createElement("div", { className: "flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300" },
                            isLeader && !creator && React.createElement("button", { onClick: () => toggleAdmin(username), className: `${btnPrimary} rounded-lg px-3 py-2 text-sm` }, admin ? 'حذف ادمین' : 'ادمین'),
                            username.toLowerCase() === currentUser.username.toLowerCase() && React.createElement("button", { onClick: () => setLeaveOpen(true), className: `${btnRose} rounded-lg px-3 py-2 text-sm` }, "\u062E\u0631\u0648\u062C \u0627\u0632 \u0622\u0644\u06CC\u0627\u0646\u0632")));
                })),
            tab === 'chat' && React.createElement("section", { className: `${card} flex min-h-[440px] flex-col` },
                React.createElement("div", { ref: chatRef, className: "alz2-scroll mb-4 flex-1 space-y-3 overflow-y-auto p-1" },
                    (alliance.messages || []).map((m, i) => {
                        const own = m.sender?.toLowerCase() === currentUser.username.toLowerCase();
                        return React.createElement("div", { key: m.id, className: `flex items-end gap-3 animate-[alz2-fadeSlide_.35s_ease_both] ${own ? 'flex-row-reverse' : ''}`, style: { animationDelay: `${Math.min(i, 20) * 40}ms` } },
                            React.createElement(AvatarLetter, { u: findUser(m.sender) || { username: m.sender }, size: "w-8 h-8" }),
                            React.createElement("div", { className: `max-w-[75%] min-w-0 rounded-2xl px-4 py-2.5 shadow-lg ${own ? 'bg-gradient-to-l from-indigo-600 to-violet-600 text-white rounded-br-sm' : 'border border-white/[.06] bg-slate-800/80 text-slate-100 rounded-bl-sm'}` },
                                React.createElement("div", { className: `flex gap-3 text-xs ${own ? 'text-indigo-200' : 'text-slate-400'}` },
                                    React.createElement("button", { onClick: () => onOpenProfile?.(m.sender), className: `font-bold ${own ? 'text-amber-200 hover:underline' : 'text-indigo-300 hover:underline'}` }, m.sender),
                                    React.createElement("time", null, new Date(m.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }))),
                                React.createElement("p", { className: "break-words pt-1 leading-6" }, m.text)));
                    }),
                    !alliance.messages?.length && React.createElement("p", { className: "py-10 text-center text-slate-500" }, "\u0627\u0648\u0644\u06CC\u0646 \u067E\u06CC\u0627\u0645 \u0622\u0644\u06CC\u0627\u0646\u0632 \u0631\u0627 \u0628\u0646\u0648\u06CC\u0633\u06CC\u062F.")),
                React.createElement("form", { onSubmit: submitMessage, className: "flex gap-2" },
                    React.createElement("input", { value: message, onChange: e => setMessage(e.target.value), maxLength: 2000, placeholder: "\u067E\u06CC\u0627\u0645 \u062E\u0648\u062F \u0631\u0627 \u0628\u0646\u0648\u06CC\u0633\u06CC\u062F...", className: inputCls }),
                    React.createElement("button", { className: `${btnPrimary} rounded-xl px-6` }, "\u0627\u0631\u0633\u0627\u0644"))),
            tab === 'services' && React.createElement("section", { className: "grid gap-4 md:grid-cols-3" },
                [['store', 'تخفیف فروشگاه', alliance.storeLevel || 0], ['game', 'تخفیف ورودی بازی‌ها', alliance.gameLevel || 0]].map(([kind, label, level], i) => React.createElement("div", { key: kind, className: `${card} animate-[alz2-fadeSlide_.4s_ease_both]`, style: { animationDelay: `${i * 60}ms` } },
                    React.createElement("h3", { className: "text-lg font-black" }, label),
                    React.createElement("div", { className: "my-3 flex items-center gap-1.5" }, [0, 1, 2, 3, 4, 5].map(p => React.createElement("span", { key: p, className: `h-2 flex-1 rounded-full transition-all duration-500 ${p < level ? 'bg-gradient-to-r from-emerald-400 to-green-500' : 'bg-white/10'}` }))),
                    React.createElement("p", { className: "my-3" },
                        "\u0633\u0637\u062D ",
                        level,
                        " \u00B7 \u062A\u062E\u0641\u06CC\u0641 ",
                        React.createElement("b", { className: "text-emerald-300" },
                            Math.min(30, level * 5),
                            "\u066A")),
                    React.createElement("p", { className: "mb-4 text-sm text-slate-400" },
                        "\u0647\u0632\u06CC\u0646\u0647 \u0627\u0631\u062A\u0642\u0627: ",
                        300 + level * 200,
                        " \u06A9\u06CC\u0648\u062C\u06CC \u0627\u0632 \u062E\u0632\u0627\u0646\u0647"),
                    React.createElement("button", { disabled: !isLeader || alliance.treasury < 300 + level * 200 || level >= 6, onClick: () => upgrade(kind), className: `${btnPrimary} w-full rounded-xl p-2.5` }, "\u0627\u0631\u062A\u0642\u0627\u06CC \u062E\u062F\u0645\u062A"))),
                React.createElement("div", { className: `${card} animate-[alz2-fadeSlide_.4s_ease_both]`, style: { animationDelay: '120ms' } },
                    React.createElement("h3", { className: "text-lg font-black" }, "\u0627\u0631\u062A\u0642\u0627\u06CC \u0638\u0631\u0641\u06CC\u062A \u0622\u0644\u06CC\u0627\u0646\u0632"),
                    React.createElement("div", { className: "my-3 flex items-center gap-1.5" }, [0, 1, 2, 3, 4, 5].map(p => React.createElement("span", { key: p, className: `h-2 flex-1 rounded-full transition-all duration-500 ${alliance.capacity >= (p + 1) * 5 ? 'bg-gradient-to-r from-indigo-400 to-fuchsia-500' : 'bg-white/10'}` }))),
                    React.createElement("p", { className: "my-3" },
                        "\u0638\u0631\u0641\u06CC\u062A \u0641\u0639\u0644\u06CC: ",
                        React.createElement("b", null, alliance.capacity),
                        " / \u06F3\u06F0 \u0646\u0641\u0631"),
                    React.createElement("p", { className: "mb-4 text-sm text-slate-400" }, "\u06F5 \u0639\u0636\u0648 \u0628\u06CC\u0634\u062A\u0631 \u00B7 \u06F3\u06F0\u06F0 \u06A9\u06CC\u0648\u062C\u06CC \u0627\u0632 \u062E\u0632\u0627\u0646\u0647"),
                    React.createElement("button", { disabled: !isLeader || alliance.treasury < 300 || alliance.capacity >= 30, onClick: () => upgrade('capacity'), className: `${btnPrimary} w-full rounded-xl p-2.5` }, "\u0627\u0631\u062A\u0642\u0627\u06CC \u0638\u0631\u0641\u06CC\u062A")),
                React.createElement("div", { className: `${card} md:col-span-3 animate-[alz2-fadeSlide_.4s_ease_both]`, style: { animationDelay: '180ms' } },
                    React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-4" },
                        React.createElement("div", null,
                            React.createElement("h3", { className: "text-lg font-black" }, "\uD83D\uDCB0 \u0648\u0627\u0631\u06CC\u0632 \u0628\u0647 \u062E\u0632\u0627\u0646\u0647"),
                            React.createElement("p", { className: "mt-1 text-sm text-slate-400" },
                                "\u0628\u0627 \u0648\u0627\u0631\u06CC\u0632 \u06A9\u06CC\u0648\u062C\u06CC\u060C \u062E\u0632\u0627\u0646\u0647 \u0628\u0631\u0627\u06CC \u0627\u0631\u062A\u0642\u0627\u0647\u0627 \u0634\u0627\u0631\u0698 \u0645\u06CC\u200C\u0634\u0648\u062F. \u0645\u0648\u062C\u0648\u062F\u06CC \u0634\u0645\u0627: ",
                                currentUser.coins?.toLocaleString('fa-IR'))),
                        React.createElement("div", { className: "flex flex-wrap items-center gap-2" },
                            [100, 500, 1000].map(v => React.createElement("button", { key: v, onClick: () => { setDonateOpen(true); setDonation(String(v)); }, className: `rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-2 font-bold text-amber-300 transition-all duration-200 hover:bg-amber-500/20 active:scale-95` }, v)),
                            React.createElement("button", { onClick: () => setDonateOpen(true), className: `rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-2 font-bold text-white shadow-lg shadow-emerald-600/25 ${btnBase}` }, "\u0648\u0627\u0631\u06CC\u0632 \u0628\u0647 \u062E\u0632\u0627\u0646\u0647"))))),
            tab === 'settings' && React.createElement("section", { className: `${card} space-y-7` },
                React.createElement("h2", { className: "text-xl font-black" }, "\u2699\uFE0F \u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0622\u0644\u06CC\u0627\u0646\u0632"),
                isAdmin ? React.createElement(React.Fragment, null,
                    React.createElement("div", { className: "rounded-2xl border border-white/[.06] bg-white/[.03] p-5" },
                        React.createElement("label", { className: "mb-2 block font-bold" }, "\u0647\u0632\u06CC\u0646\u0647 \u0648\u0631\u0648\u062F (\u06F0 \u0628\u0631\u0627\u06CC \u0631\u0627\u06CC\u06AF\u0627\u0646)"),
                        React.createElement("div", { className: "flex max-w-md gap-2" },
                            React.createElement("input", { type: "number", min: "0", max: "100000", value: entryFee, onChange: e => setEntryFee(e.target.value), className: inputCls }),
                            React.createElement("button", { onClick: saveFee, className: `${btnPrimary} rounded-xl px-6` }, "\u0630\u062E\u06CC\u0631\u0647")),
                        React.createElement("p", { className: "mt-2 text-sm text-slate-400" }, "\u0647\u0632\u06CC\u0646\u0647 \u0648\u0631\u0648\u062F \u0627\u0639\u0636\u0627\u06CC \u062C\u062F\u06CC\u062F \u0645\u0633\u062A\u0642\u06CC\u0645\u0627\u064B \u0628\u0647 \u062E\u0632\u0627\u0646\u0647 \u0648\u0627\u0631\u06CC\u0632 \u0645\u06CC\u200C\u0634\u0648\u062F.")),
                    isLeader && React.createElement(React.Fragment, null,
                        React.createElement("div", { className: "rounded-2xl border border-white/[.06] bg-white/[.03] p-5" },
                            React.createElement("h3", { className: "mb-3 font-bold" }, "\u0646\u0648\u0639 \u0639\u0636\u0648\u06CC\u062A"),
                            React.createElement("div", { className: "inline-flex rounded-xl border border-white/10 bg-black/25 p-1" }, [['public', 'پابلیک'], ['private', 'پرایوت']].map(([value, label]) => React.createElement("button", { key: value, onClick: () => { if (setAlliancePrivacy(currentUser.username, value)) {
                                    refresh();
                                    feedback('success', 'تنظیم حریم عضویت ذخیره شد.');
                                }
                                else
                                    feedback('error', 'ذخیره تنظیم حریم عضویت ناموفق بود.'); }, className: `rounded-lg px-6 py-2 font-bold transition-all duration-300 active:scale-95 ${alliance.privacy === value ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-600/25' : 'text-slate-300 hover:text-white'}` }, label))),
                            React.createElement("div", { className: "mt-4 rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-4 text-sm leading-7 text-indigo-100/80" }, "\u067E\u0627\u0628\u0644\u06CC\u06A9: \u0647\u0631 \u0628\u0627\u0632\u06CC\u06A9\u0646 \u0628\u0644\u0627\u0641\u0627\u0635\u0644\u0647 \u067E\u0633 \u0627\u0632 \u067E\u0631\u062F\u0627\u062E\u062A \u0647\u0632\u06CC\u0646\u0647 \u0648\u0631\u0648\u062F (\u062F\u0631 \u0635\u0648\u0631\u062A \u0648\u062C\u0648\u062F \u0638\u0631\u0641\u06CC\u062A) \u0639\u0636\u0648 \u0645\u06CC\u200C\u0634\u0648\u062F. \u067E\u0631\u0627\u06CC\u0648\u062A: \u067E\u0633 \u0627\u0632 \u067E\u0631\u062F\u0627\u062E\u062A \u0647\u0632\u06CC\u0646\u0647 \u0648\u0631\u0648\u062F\u060C \u062F\u0631\u062E\u0648\u0627\u0633\u062A \u0639\u0636\u0648\u06CC\u062A \u062F\u0631 \u0628\u062E\u0634 \u00AB\u062F\u0631\u062E\u0648\u0627\u0633\u062A\u200C\u0647\u0627\u00BB \u062B\u0628\u062A \u0645\u06CC\u200C\u0634\u0648\u062F \u0648 \u0633\u0627\u0632\u0646\u062F\u0647 \u06CC\u0627 \u0627\u062F\u0645\u06CC\u0646\u200C\u0647\u0627 \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u0646\u062F \u067E\u0631\u0648\u0641\u0627\u06CC\u0644 \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u200C\u06A9\u0646\u0646\u062F\u0647 (\u0628\u0631\u062F\u060C \u0628\u0627\u062E\u062A\u060C \u06A9\u06CC\u0648\u062C\u06CC) \u0631\u0627 \u0628\u0628\u06CC\u0646\u0646\u062F \u0648 \u0642\u0628\u0648\u0644 \u06CC\u0627 \u0631\u062F \u06A9\u0646\u0646\u062F\u061B \u062F\u0631 \u0635\u0648\u0631\u062A \u0631\u062F\u060C \u0645\u0628\u0644\u063A \u0628\u0627\u0632\u06AF\u0631\u062F\u0627\u0646\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F.")),
                        React.createElement("div", { className: "rounded-2xl border border-white/[.06] bg-white/[.03] p-5" },
                            React.createElement("h3", { className: "mb-3 font-bold" }, "\u0645\u062F\u06CC\u0631\u06CC\u062A \u0627\u062F\u0645\u06CC\u0646\u200C\u0647\u0627"),
                            (alliance.admins || []).length ? alliance.admins.map((u, i) => React.createElement("div", { key: u, className: "mb-2 flex items-center justify-between rounded-2xl border border-white/[.06] bg-white/[.03] p-3 transition-all duration-300 hover:border-indigo-400/30 animate-[alz2-fadeSlide_.4s_ease_both]", style: { animationDelay: `${i * 50}ms` } },
                                React.createElement("button", { onClick: () => onOpenProfile?.(u), className: "flex items-center gap-2 font-bold" },
                                    React.createElement("span", { className: "text-amber-300" }, "\u2605"),
                                    u),
                                React.createElement("button", { onClick: () => { const r = setAllianceAdmin(currentUser.username, u, false); if (!r.ok)
                                        return feedback('error', r.msg); refresh(); feedback('success', r.msg || 'ادمین حذف شد.'); }, className: `${btnRose} rounded-lg px-3 py-2 text-sm` }, "\u062D\u0630\u0641 \u0627\u062F\u0645\u06CC\u0646"))) : React.createElement("p", { className: "text-sm text-slate-400" }, "\u0627\u062F\u0645\u06CC\u0646\u06CC \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A\u061B \u0627\u0632 \u0641\u0647\u0631\u0633\u062A \u0627\u0639\u0636\u0627 \u0627\u062F\u0645\u06CC\u0646 \u0627\u0636\u0627\u0641\u0647 \u06A9\u0646\u06CC\u062F."))),
                    React.createElement("div", { className: "rounded-2xl border border-rose-500/30 bg-rose-500/[.06] p-5" },
                        React.createElement("h3", { className: "mb-1 font-black text-rose-300" }, "\u26A0\uFE0F Danger Zone"),
                        React.createElement("p", { className: "mb-4 text-sm text-rose-200/70" },
                            "\u062E\u0631\u0648\u062C \u0627\u0632 \u0622\u0644\u06CC\u0627\u0646\u0632 \u0642\u0627\u0628\u0644 \u0628\u0627\u0632\u06AF\u0634\u062A \u0646\u06CC\u0633\u062A",
                            isLeader ? ' و با خروج شما آلیانز برای همیشه منحل می‌شود.' : '.'),
                        React.createElement("button", { onClick: () => setLeaveOpen(true), className: `${btnRose} rounded-xl px-5 py-2.5` }, isLeader ? 'انحلال آلیانز' : 'خروج از آلیانز'))) : React.createElement("p", { className: "text-slate-400" }, "\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0641\u0642\u0637 \u0628\u0631\u0627\u06CC \u0633\u0627\u0632\u0646\u062F\u0647 \u06CC\u0627 \u0627\u062F\u0645\u06CC\u0646 \u0622\u0644\u06CC\u0627\u0646\u0632 \u0642\u0627\u0628\u0644 \u0648\u06CC\u0631\u0627\u06CC\u0634 \u0627\u0633\u062A.")),
            tab === 'requests' && isAdmin && React.createElement("section", { className: `${card} space-y-3` },
                React.createElement("h2", { className: "mb-4 text-xl font-black" }, "\u2709\uFE0F \u062F\u0631\u062E\u0648\u0627\u0633\u062A\u200C\u0647\u0627\u06CC \u0639\u0636\u0648\u06CC\u062A"),
                [...(alliance.joinRequests || [])].sort((a, b) => new Date(b.at) - new Date(a.at)).map((req, i) => {
                    const u = findUser(req.username) || { username: req.username, coins: 0, stats: {} };
                    return React.createElement("div", { key: `${req.username}-${req.at}`, className: "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[.06] bg-white/[.03] p-4 transition-all duration-300 hover:border-indigo-400/30 hover:-translate-y-1 animate-[alz2-fadeSlide_.4s_ease_both]", style: { animationDelay: `${i * 50}ms` } },
                        React.createElement("div", { className: "flex flex-wrap items-center gap-3" },
                            React.createElement(AvatarLetter, { u: u }),
                            React.createElement("button", { onClick: () => onOpenProfile?.(req.username), className: "font-bold text-indigo-300 hover:underline" }, req.username),
                            React.createElement("span", { className: "text-sm text-slate-300" },
                                "\u0628\u0631\u062F: ",
                                u.stats?.wins || 0,
                                " \u00B7 \u0628\u0627\u062E\u062A: ",
                                u.stats?.losses || 0,
                                " \u00B7 \u06A9\u06CC\u0648\u062C\u06CC: ",
                                (u.coins || 0).toLocaleString('fa-IR'))),
                        React.createElement("div", { className: "flex gap-2" },
                            React.createElement("button", { onClick: () => respond(req, true), className: `${btnEmerald} rounded-xl px-5 py-2 text-sm` }, "\u0642\u0628\u0648\u0644"),
                            React.createElement("button", { onClick: () => respond(req, false), className: `${btnRose} rounded-xl px-5 py-2 text-sm` }, "\u0631\u062F")));
                }),
                !alliance.joinRequests?.length && React.createElement("p", { className: "py-6 text-center text-slate-400" }, "\u062F\u0631\u062E\u0648\u0627\u0633\u062A\u06CC \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0631\u062F."))),
        leaveOpen && React.createElement("div", { className: "fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm", onClick: () => setLeaveOpen(false) },
            React.createElement("div", { className: "w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl animate-[alz2-pop_.3s_cubic-bezier(.2,.8,.2,1)_both]", onClick: e => e.stopPropagation() },
                React.createElement("h3", { className: "mb-3 text-xl font-black" }, "\u062E\u0631\u0648\u062C \u0627\u0632 \u0622\u0644\u06CC\u0627\u0646\u0632"),
                React.createElement("p", { className: "mb-5 leading-7 text-slate-300" }, isLeader ? React.createElement("span", { className: "font-bold text-rose-300" }, "\u0628\u0627 \u062E\u0631\u0648\u062C \u0634\u0645\u0627 \u0622\u0644\u06CC\u0627\u0646\u0632 \u0645\u0646\u062D\u0644 \u0645\u06CC\u200C\u0634\u0648\u062F! \u0627\u062F\u0627\u0645\u0647 \u0645\u06CC\u200C\u062F\u0647\u06CC\u062F\u061F") : 'آیا از خروج از آلیانز مطمئن هستید؟'),
                React.createElement("div", { className: "flex gap-2" },
                    React.createElement("button", { onClick: confirmLeave, className: `${btnRose} flex-1 rounded-xl p-3` }, "\u062A\u0623\u06CC\u06CC\u062F \u062E\u0631\u0648\u062C"),
                    React.createElement("button", { onClick: () => setLeaveOpen(false), className: "rounded-xl border border-white/15 px-4 font-bold text-slate-300 transition-all duration-200 hover:bg-white/5 active:scale-95" }, "\u0627\u0646\u0635\u0631\u0627\u0641")))),
        donateOpen && React.createElement("div", { className: "fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm", onClick: () => setDonateOpen(false) },
            React.createElement("div", { className: "w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl animate-[alz2-pop_.3s_cubic-bezier(.2,.8,.2,1)_both]", onClick: e => e.stopPropagation() },
                React.createElement("h3", { className: "mb-3 text-xl font-black" }, "\u0648\u0627\u0631\u06CC\u0632 \u0628\u0647 \u062E\u0632\u0627\u0646\u0647"),
                React.createElement("p", { className: "mb-3 text-sm text-slate-400" },
                    "\u0645\u0648\u062C\u0648\u062F\u06CC \u0634\u0645\u0627: ",
                    currentUser.coins?.toLocaleString('fa-IR'),
                    " \u06A9\u06CC\u0648\u062C\u06CC"),
                React.createElement("div", { className: "mb-3 flex gap-2" }, [100, 500, 1000].map(v => React.createElement("button", { key: v, type: "button", onClick: () => setDonation(String(v)), className: `flex-1 rounded-lg border px-2 py-1.5 text-sm font-bold transition-all duration-200 active:scale-95 ${Number(donation) === v ? 'border-amber-400/60 bg-amber-500/20 text-amber-200' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}` }, v))),
                React.createElement("input", { type: "number", min: "1", value: donation, onChange: e => setDonation(e.target.value), placeholder: "\u0645\u0628\u0644\u063A \u06A9\u06CC\u0648\u062C\u06CC", className: `${inputCls} mb-4` }),
                React.createElement("div", { className: "flex gap-2" },
                    React.createElement("button", { onClick: donate, className: `${btnEmerald} flex-1 rounded-xl p-3` }, "\u0648\u0627\u0631\u06CC\u0632"),
                    React.createElement("button", { onClick: () => setDonateOpen(false), className: "rounded-xl border border-white/15 px-4 font-bold text-slate-300 transition-all duration-200 hover:bg-white/5 active:scale-95" }, "\u0627\u0646\u0635\u0631\u0627\u0641")))));
};

/* ===== pages/StorePage.jsx ===== */
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
const ChessStylePreview = ({ styleId }) => (React.createElement("div", { className: "grid grid-cols-6 rounded-2xl overflow-hidden border border-white/10 bg-slate-950/80 shadow-inner p-1" }, ['w', 'b'].map((color, row) => ['k', 'q', 'r', 'b', 'n', 'p'].map((type, i) => (React.createElement("div", { key: color + type, className: `aspect-square flex items-center justify-center text-lg sm:text-xl rounded-lg transition-transform hover:scale-125 ${(row + i) % 2 === 0 ? 'bg-slate-700/60' : 'bg-slate-800/80'}` }, renderChessPiece(color + type, styleId)))))));
// پیش‌نمایش مهره‌های منچ با قابلیت هاور و جهش
const LudoStylePreview = ({ styleId }) => (React.createElement("div", { className: "flex items-center justify-around rounded-2xl bg-gradient-to-br from-slate-950/90 via-slate-900/90 to-slate-950/90 border border-white/10 py-5 px-3 shadow-inner" }, LUDO_PREVIEW_COLORS.map((hex, i) => (React.createElement("div", { key: hex, className: "w-10 h-10 sm:w-11 sm:h-11 store-float transform hover:scale-125 transition-transform cursor-pointer", style: { animationDelay: `${i * 160}ms` } }, renderLudoToken(hex, styleId, false))))));
// پیش‌نمایش تاس تعاملی با تست پرتاب
const DiceStylePreview = ({ styleId }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [val1, setVal1] = useState(5);
    const [val2, setVal2] = useState(6);
    const [rot1, setRot1] = useState(-10);
    const [rot2, setRot2] = useState(15);
    const handleSpin = (e) => {
        e?.stopPropagation();
        if (isSpinning)
            return;
        setIsSpinning(true);
        try {
            playSound('dice', true);
        }
        catch (e) { }
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
                try {
                    playSound('tick', true);
                }
                catch (e) { }
            }
        }, 60);
    };
    return (React.createElement("div", { onClick: handleSpin, className: "group relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-slate-950/90 via-slate-900/90 to-slate-950/90 border border-white/10 py-5 px-3 gap-5 cursor-pointer overflow-hidden transition-all hover:border-amber-400/50 hover:shadow-[0_0_25px_rgba(251,191,36,0.2)]" },
        React.createElement("div", { className: "absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-300" }),
        React.createElement("span", { className: "absolute top-1.5 right-2 text-[9px] font-bold text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-400/20" }, "\u0644\u0645\u0633 \u0628\u0631\u0627\u06CC \u0686\u0631\u062E\u0634 \uD83C\uDFB2"),
        React.createElement("div", { className: "w-12 h-12 store-float z-10", style: { animationDelay: '0ms' } },
            React.createElement("div", { className: "w-full h-full", style: {
                    transform: `rotate(${rot1}deg) scale(${isSpinning ? 1.2 : 1})`,
                    transition: isSpinning ? 'transform 0.75s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'transform 0.3s ease-out',
                    filter: isSpinning ? 'drop-shadow(0 12px 10px rgba(0,0,0,0.6))' : 'drop-shadow(0 4px 5px rgba(0,0,0,0.4))'
                } }, renderCustomDice(val1, styleId))),
        React.createElement("div", { className: "w-13 h-13 store-float z-10", style: { animationDelay: '300ms' } },
            React.createElement("div", { className: "w-full h-full", style: {
                    transform: `rotate(${rot2}deg) scale(${isSpinning ? 1.25 : 1})`,
                    transition: isSpinning ? 'transform 0.75s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'transform 0.3s ease-out',
                    filter: isSpinning ? 'drop-shadow(0 14px 12px rgba(0,0,0,0.7))' : 'drop-shadow(0 5px 6px rgba(0,0,0,0.4))'
                } }, renderCustomDice(val2, styleId)))));
};
// پیش‌نمایش زنده قاب روی آواتار با نام کاربری خود بازیکن
const FramePreview = ({ styleId, username = 'نام کاربری' }) => (React.createElement("div", { className: "flex flex-col items-center justify-center py-4 rounded-2xl bg-slate-950/70 border border-white/10" },
    React.createElement("div", { className: "w-20 h-20 relative flex items-center justify-center" },
        React.createElement(PlayerAvatar, { user: { equipped: { frames: styleId }, avatar: '' }, className: "w-full h-full rounded-2xl" })),
    React.createElement("span", { className: "text-[11px] font-bold text-slate-400 mt-2" }, username)));
// پیش‌نمایش لقب با آیکون و درخشش
const TitlePreview = ({ styleId, username = 'نام کاربری' }) => (React.createElement("div", { className: "flex flex-col items-center justify-center py-5 rounded-2xl bg-slate-950/70 border border-white/10" },
    React.createElement("span", { className: "text-white font-black text-base mb-1" }, username),
    React.createElement("div", { className: "transform scale-110 origin-center mt-1" }, renderPlayerTitle(styleId))));
// پیش‌نمایش آواتارهای پریمیوم
const AvatarPreview = ({ item, size = 'w-24 h-24 sm:w-28 sm:h-28' }) => {
    const rarity = STORE_RARITY[item.rarity];
    return (React.createElement("div", { className: `store-shine relative mx-auto ${size} rounded-3xl overflow-hidden border-2 ${rarity.ring} shadow-xl ${rarity.glow} store-float` },
        React.createElement("img", { src: item.src, alt: item.name, className: "w-full h-full object-cover" })));
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
    }
    catch (e) {
        storePct = 0;
    }
    const getFinalPrice = (price) => {
        const p = Number(price) || 0;
        if (p <= 0 || storePct <= 0)
            return p;
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
            try {
                playSound('button', user.settings?.sound);
            }
            catch (e) { }
            showToast({ id: 'store-use', type: 'success', title: 'فعال شد ✨', text: `«${item.name}» تجهیز و برگزیده شد.`, duration: 2500 });
        }
    };
    const handleBuy = () => {
        if (!confirm)
            return;
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
        if (kind === 'chess')
            return React.createElement(ChessStylePreview, { styleId: item.id });
        if (kind === 'ludo')
            return React.createElement(LudoStylePreview, { styleId: item.id });
        if (kind === 'dice')
            return React.createElement(DiceStylePreview, { styleId: item.id });
        if (kind === 'frames')
            return React.createElement(FramePreview, { styleId: item.id, username: user.username });
        if (kind === 'titles')
            return React.createElement(TitlePreview, { styleId: item.id, username: user.username });
        return React.createElement(AvatarPreview, { item: item });
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
            if (rarityFilter !== 'all' && item.rarity !== rarityFilter)
                return false;
            const { owned } = statusOf(tab, item);
            if (statusFilter === 'owned' && !owned)
                return false;
            if (statusFilter === 'unowned' && owned)
                return false;
            if (searchQuery.trim() && !item.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
                return false;
            return true;
        });
    }, [rawItems, rarityFilter, statusFilter, searchQuery, user]);
    // آیتم فعال در ویترین بالا
    const activeShowcase = spotlightItem || filteredItems[0] || rawItems[0];
    const cfmFinalPrice = confirm ? getFinalPrice(confirm.item.price) : 0;
    const cfmAfter = confirm ? (user.coins || 0) - cfmFinalPrice : 0;
    return (React.createElement("div", { className: "w-full max-w-6xl mx-auto flex flex-col gap-6 sm:gap-8 pb-12 animate-in fade-in select-none text-slate-100", dir: "rtl" },
        React.createElement("style", null, `
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
            `),
        React.createElement("div", { className: "relative overflow-hidden rounded-[2.5rem] p-6 sm:p-8 border border-white/10 bg-slate-900/80 backdrop-blur-2xl shadow-2xl shadow-purple-950/40" },
            React.createElement("div", { className: "absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-br from-purple-600/25 to-pink-600/10 rounded-full blur-[90px] store-hero-glow pointer-events-none" }),
            React.createElement("div", { className: "absolute -bottom-20 -left-20 w-72 h-72 bg-gradient-to-tr from-amber-500/20 to-indigo-600/15 rounded-full blur-[90px] store-hero-glow pointer-events-none", style: { animationDelay: '2s' } }),
            React.createElement("div", { className: "relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6" },
                React.createElement("div", { className: "flex items-center gap-4 sm:gap-5" },
                    React.createElement("div", { className: "p-4 sm:p-5 rounded-3xl bg-gradient-to-tr from-indigo-500/30 via-purple-500/20 to-pink-500/30 border border-indigo-400/30 shadow-xl shadow-indigo-500/20 store-float" },
                        React.createElement("span", { className: "text-3xl sm:text-4xl" }, "\uD83D\uDECD\uFE0F")),
                    React.createElement("div", null,
                        React.createElement("div", { className: "flex items-center gap-2 mb-1.5 flex-wrap" },
                            React.createElement("span", { className: "px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[11px] font-black tracking-wider" }, "\u2605 \u0628\u0627\u0632\u0627\u0631\u0686\u0647 \u0633\u0644\u0637\u0646\u062A\u06CC"),
                            storePct > 0 && (React.createElement("span", { className: "px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-black animate-pulse flex items-center gap-1" },
                                React.createElement("span", null, "\uD83D\uDEE1\uFE0F \u062A\u062E\u0641\u06CC\u0641 \u0622\u0644\u06CC\u0627\u0646\u0632:"),
                                React.createElement("b", null,
                                    storePct,
                                    "\u066A")))),
                        React.createElement("h1", { className: "text-2xl sm:text-4xl font-black bg-gradient-to-l from-white via-indigo-100 to-amber-200 bg-clip-text text-transparent" }, "\u0641\u0631\u0648\u0634\u06AF\u0627\u0647 \u0627\u0642\u0644\u0627\u0645 \u0648 \u0627\u0633\u062A\u0627\u06CC\u0644\u200C\u0647\u0627"),
                        React.createElement("p", { className: "text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed" }, "\u0627\u0633\u062A\u0627\u06CC\u0644 \u0645\u0647\u0631\u0647\u200C\u0647\u0627\u06CC \u0634\u0637\u0631\u0646\u062C \u0648 \u0645\u0646\u0686\u060C \u062A\u0627\u0633\u200C\u0647\u0627\u06CC \u0633\u0647\u200C\u0628\u0639\u062F\u06CC\u060C \u0622\u0648\u0627\u062A\u0627\u0631\u0647\u0627 \u0648 \u0627\u0644\u0642\u0627\u0628 \u0648\u06CC\u0698\u0647 \u0631\u0627 \u0628\u0627 \u0633\u06A9\u0647\u200C\u0647\u0627\u06CC \u06A9\u06CC\u0648\u062C\u06CC \u062E\u0631\u06CC\u062F\u0627\u0631\u06CC \u0648 \u0641\u0639\u0627\u0644 \u06A9\u0646\u06CC\u062F."))),
                React.createElement("div", { className: "flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end" },
                    React.createElement("div", { className: "flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-orange-500/20 border-2 border-amber-400/50 text-amber-300 font-black text-xl shadow-xl shadow-amber-500/15" },
                        React.createElement(IconCoin, { className: "w-7 h-7 text-amber-400 animate-spin-slow" }),
                        React.createElement("div", { className: "flex flex-col text-right" },
                            React.createElement("span", { className: "text-[10px] text-amber-400/80 font-bold -mb-1" }, "\u0645\u0648\u062C\u0648\u062F\u06CC \u06A9\u06CC\u0648\u062C\u06CC \u0634\u0645\u0627"),
                            React.createElement("span", { className: "font-mono text-2xl font-black" }, (user.coins || 0).toLocaleString('fa-IR'))))))),
        React.createElement("div", { className: "space-y-3" },
            React.createElement("div", { className: "flex items-center justify-between px-2" },
                React.createElement("span", { className: "text-xs font-black text-slate-400 flex items-center gap-1.5" },
                    React.createElement("span", null, "\uD83D\uDCC2"),
                    React.createElement("span", null, "\u062F\u0633\u062A\u0647\u200C\u0628\u0646\u062F\u06CC\u200C\u0647\u0627\u06CC \u0641\u0631\u0648\u0634\u06AF\u0627\u0647")),
                React.createElement("span", { className: "text-xs font-bold text-amber-300/90 bg-slate-900/80 px-3 py-1 rounded-xl border border-white/10" },
                    "\u0645\u0627\u0644\u06A9\u06CC\u062A \u0627\u06CC\u0646 \u0628\u062E\u0634: ",
                    React.createElement("b", null, ownedCountInTab),
                    " \u0627\u0632 ",
                    React.createElement("b", null, rawItems.length))),
            React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5" }, STORE_TABS.map(t => {
                const isSelected = tab === t.id;
                const itemsOfTab = t.id === 'avatars' ? STORE_AVATARS : STORE_STYLES[t.id];
                const ownedOfTab = itemsOfTab.filter(item => statusOf(t.id, item).owned).length;
                return (React.createElement("button", { key: t.id, onClick: () => {
                        setTab(t.id);
                        setSpotlightItem(null);
                        try {
                            playSound('button', user.settings?.sound);
                        }
                        catch (e) { }
                    }, className: `relative p-3.5 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-all duration-300 active:scale-95 ${isSelected
                        ? 'bg-gradient-to-b from-indigo-600/35 to-purple-700/25 border-indigo-400 text-white shadow-lg shadow-indigo-600/30 -translate-y-1'
                        : 'bg-slate-900/60 border-white/[0.08] text-slate-400 hover:text-white hover:border-white/20 hover:bg-slate-800/60'}` },
                    React.createElement("span", { className: "text-2xl leading-none" }, t.icon),
                    React.createElement("span", { className: "text-xs font-black truncate max-w-full" }, t.label),
                    React.createElement("span", { className: `text-[10px] font-bold px-2 py-0.5 rounded-full border ${isSelected
                            ? 'bg-indigo-400/20 text-indigo-200 border-indigo-400/40'
                            : 'bg-slate-800 text-slate-500 border-slate-700'}` },
                        ownedOfTab,
                        " / ",
                        itemsOfTab.length)));
            }))),
        activeShowcase && (React.createElement("div", { className: "relative rounded-[2.2rem] p-5 sm:p-7 border border-white/10 bg-slate-900/70 backdrop-blur-xl shadow-xl overflow-hidden" },
            React.createElement("div", { className: "absolute top-0 right-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" }),
            React.createElement("div", { className: "relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6" },
                React.createElement("div", { className: "w-full lg:w-1/2 flex flex-col items-center justify-center p-3" },
                    React.createElement("span", { className: "text-[11px] font-black text-indigo-300 mb-3 flex items-center gap-1.5" },
                        React.createElement("span", { className: "w-2 h-2 rounded-full bg-indigo-400 animate-ping" }),
                        React.createElement("span", null, "\u0648\u06CC\u062A\u0631\u06CC\u0646 \u062A\u0633\u062A \u0648 \u0628\u0631\u0631\u0633\u06CC \u0632\u0646\u062F\u0647:")),
                    React.createElement("div", { className: "w-full max-w-md" }, renderPreview(tab, activeShowcase))),
                React.createElement("div", { className: "w-full lg:w-1/2 flex flex-col gap-3.5 border-t lg:border-t-0 lg:border-r border-white/10 pt-4 lg:pt-0 lg:pr-6" },
                    React.createElement("div", { className: "flex items-center justify-between" },
                        React.createElement("span", { className: `px-3 py-1 rounded-full text-xs font-black border ${STORE_RARITY[activeShowcase.rarity].badge}` }, STORE_RARITY[activeShowcase.rarity].label),
                        React.createElement("span", { className: "text-xs text-slate-400" },
                            "\u06A9\u062F \u0622\u06CC\u062A\u0645: #",
                            activeShowcase.id)),
                    React.createElement("div", null,
                        React.createElement("h3", { className: "text-2xl font-black text-white" }, activeShowcase.name),
                        activeShowcase.desc && (React.createElement("p", { className: "text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed" }, activeShowcase.desc))),
                    (() => {
                        const { owned, equipped } = statusOf(tab, activeShowcase);
                        const finalPrice = getFinalPrice(activeShowcase.price);
                        return (React.createElement("div", { className: "pt-2 flex flex-wrap items-center justify-between gap-3" },
                            React.createElement("div", { className: "flex items-center gap-2" }, owned ? (React.createElement("span", { className: "text-xs font-black text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 rounded-xl" }, "\u2713 \u062F\u0631 \u0645\u0627\u0644\u06A9\u06CC\u062A \u0634\u0645\u0627")) : (React.createElement("div", { className: "flex items-center gap-2 bg-amber-500/10 border border-amber-400/30 px-4 py-1.5 rounded-xl font-black text-amber-300 text-base" },
                                React.createElement("span", null,
                                    "\u0642\u06CC\u0645\u062A: ",
                                    finalPrice.toLocaleString('fa-IR')),
                                storePct > 0 && finalPrice !== activeShowcase.price && (React.createElement("span", { className: "text-xs text-slate-500 line-through" }, activeShowcase.price.toLocaleString('fa-IR'))),
                                React.createElement(IconCoin, { className: "w-4 h-4 text-amber-400" }),
                                React.createElement("span", { className: "text-[10px] text-amber-400/80" }, "\u06A9\u06CC\u0648\u062C\u06CC")))),
                            React.createElement("div", { className: "flex-1 sm:flex-initial" }, equipped ? (React.createElement("div", { className: "px-6 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-black text-sm text-center shadow-lg shadow-emerald-500/10" }, "\u2713 \u0641\u0639\u0627\u0644 \u062F\u0631 \u0628\u0627\u0632\u06CC")) : owned ? (React.createElement("button", { onClick: () => handleUse(tab, activeShowcase), className: "w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-sm shadow-lg active:scale-95 transition-all" }, "\u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0648 \u0641\u0639\u0627\u0644\u200C\u0633\u0627\u0632\u06CC")) : (React.createElement("button", { onClick: () => setConfirm({ kind: tab, item: activeShowcase }), className: "w-full sm:w-auto px-7 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2" },
                                React.createElement("span", null, "\u062E\u0631\u06CC\u062F \u0627\u06CC\u0646 \u0622\u06CC\u062A\u0645"),
                                React.createElement(IconCoin, { className: "w-4 h-4 text-slate-950" }))))));
                    })())))),
        React.createElement("div", { className: "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-950/70 border border-white/10 shadow-inner" },
            React.createElement("div", { className: "flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar" }, [
                { id: 'all', label: 'همه سطوح' },
                { id: 'common', label: 'پایه' },
                { id: 'rare', label: 'نادر' },
                { id: 'epic', label: 'حماسی' },
                { id: 'legendary', label: 'افسانه‌ای' }
            ].map(f => (React.createElement("button", { key: f.id, onClick: () => setRarityFilter(f.id), className: `px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${rarityFilter === f.id
                    ? 'bg-white/15 text-white font-black shadow-sm ring-1 ring-white/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'}` }, f.label)))),
            React.createElement("div", { className: "flex items-center gap-2" },
                React.createElement("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), className: "bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-300 outline-none" },
                    React.createElement("option", { value: "all" }, "\u0647\u0645\u0647 \u0622\u06CC\u062A\u0645\u200C\u0647\u0627"),
                    React.createElement("option", { value: "owned" }, "\u0641\u0642\u0637 \u062E\u0631\u06CC\u062F\u0627\u0631\u06CC\u200C\u0634\u062F\u0647\u200C\u0647\u0627"),
                    React.createElement("option", { value: "unowned" }, "\u0642\u0627\u0628\u0644 \u062E\u0631\u06CC\u062F")),
                React.createElement("div", { className: "relative min-w-[140px] sm:min-w-[180px]" },
                    React.createElement("input", { type: "text", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), placeholder: "\u062C\u0633\u062A\u062C\u0648\u06CC \u0645\u062F\u0644...", className: "w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-400/60" }),
                    searchQuery && (React.createElement("button", { onClick: () => setSearchQuery(''), className: "absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs" }, "\u2715"))))),
        filteredItems.length === 0 ? (React.createElement("div", { className: "rounded-3xl border border-dashed border-white/15 p-12 text-center space-y-3 bg-slate-950/40" },
            React.createElement("span", { className: "text-4xl block" }, "\uD83D\uDD0D"),
            React.createElement("h3", { className: "text-base font-black text-slate-300" }, "\u0647\u06CC\u0686 \u0622\u06CC\u062A\u0645\u06CC \u0628\u0627 \u0627\u06CC\u0646 \u0641\u06CC\u0644\u062A\u0631\u0647\u0627 \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F"),
            React.createElement("p", { className: "text-xs text-slate-500" }, "\u0641\u06CC\u0644\u062A\u0631\u0647\u0627\u06CC \u0627\u0646\u062A\u062E\u0627\u0628\u200C\u0634\u062F\u0647 \u06CC\u0627 \u0639\u0628\u0627\u0631\u062A \u062C\u0633\u062A\u062C\u0648 \u0631\u0627 \u062A\u063A\u06CC\u06CC\u0631 \u062F\u0647\u06CC\u062F."))) : (React.createElement("div", { key: tab, className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6" }, filteredItems.map((item, index) => {
            const { owned, equipped } = statusOf(tab, item);
            const rarity = STORE_RARITY[item.rarity];
            const finalPrice = getFinalPrice(item.price);
            const isLegendary = item.rarity === 'legendary';
            const isEpic = item.rarity === 'epic';
            return (React.createElement("div", { key: item.id, style: { animationDelay: `${index * 55}ms` }, onClick: () => setSpotlightItem(item), className: `store-card-in store-shine group relative rounded-[2rem] p-5 sm:p-6 border-2 flex flex-col justify-between transition-all duration-300 cursor-pointer hover:-translate-y-2 ${isLegendary
                    ? 'border-amber-400/60 bg-gradient-to-b from-slate-900 via-amber-950/20 to-slate-900 shadow-xl shadow-amber-500/20 store-aura-legendary'
                    : isEpic
                        ? 'border-fuchsia-500/50 bg-gradient-to-b from-slate-900 via-purple-950/20 to-slate-900 shadow-xl shadow-fuchsia-500/20'
                        : 'border-white/10 bg-slate-900/75 hover:border-indigo-400/40 shadow-lg'} ${boughtId === item.id ? 'store-bought' : ''} ${shakeId === item.id ? 'store-shake' : ''}` },
                boughtId === item.id && React.createElement("span", { className: "store-burst absolute inset-0 rounded-[2rem] pointer-events-none" }),
                React.createElement("div", null,
                    React.createElement("div", { className: "flex items-center justify-between mb-3" },
                        React.createElement("span", { className: `px-2.5 py-0.5 rounded-full border text-[10px] font-black ${rarity.badge}` }, rarity.label),
                        React.createElement("span", { className: "text-[10px] text-slate-500 font-bold group-hover:text-indigo-300 transition-colors" }, "\uD83D\uDD0D \u0628\u0631\u0631\u0633\u06CC \u062F\u0631 \u0648\u06CC\u062A\u0631\u06CC\u0646")),
                    React.createElement("div", { className: "py-2 transition-transform duration-300 group-hover:scale-105" }, renderPreview(tab, item)),
                    React.createElement("div", { className: "text-center mt-3" },
                        React.createElement("h3", { className: "font-black text-white text-base sm:text-lg group-hover:text-amber-200 transition-colors" }, item.name),
                        item.desc && (React.createElement("p", { className: "text-xs text-slate-400 mt-1 leading-5 min-h-[38px]" }, item.desc)))),
                React.createElement("div", { className: "mt-5 pt-3 border-t border-white/[0.08]", onClick: (e) => e.stopPropagation() }, equipped ? (React.createElement("div", { className: "w-full py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-xs text-center shadow-md shadow-emerald-500/10" }, "\u2713 \u0641\u0639\u0627\u0644 \u0631\u0648\u06CC \u062D\u0633\u0627\u0628 \u0634\u0645\u0627")) : owned ? (React.createElement("button", { onClick: () => handleUse(tab, item), className: "w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs shadow-lg active:scale-95 transition-all" }, "\u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0648 \u0641\u0639\u0627\u0644\u200C\u0633\u0627\u0632\u06CC")) : (React.createElement("button", { onClick: () => setConfirm({ kind: tab, item }), className: "w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5" },
                    React.createElement("span", null, "\u062E\u0631\u06CC\u062F"),
                    React.createElement("span", { className: "flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded-lg text-slate-950" },
                        React.createElement("span", null, finalPrice.toLocaleString('fa-IR')),
                        storePct > 0 && finalPrice !== item.price && (React.createElement("span", { className: "text-[9px] opacity-60 line-through" }, item.price.toLocaleString('fa-IR'))),
                        React.createElement(IconCoin, { className: "w-3.5 h-3.5" })))))));
        }))),
        confirm && (React.createElement("div", { className: "fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in", onClick: () => setConfirm(null) },
            React.createElement("div", { role: "dialog", "aria-modal": "true", onClick: (e) => e.stopPropagation(), className: "glass-panel w-full max-w-sm rounded-3xl p-6 border-2 border-amber-400/40 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95" },
                React.createElement("h3", { className: "text-center font-black text-lg text-white" }, "\u062A\u0623\u06CC\u06CC\u062F \u062E\u0631\u06CC\u062F \u0627\u0632 \u0641\u0631\u0648\u0634\u06AF\u0627\u0647"),
                React.createElement("div", { className: "py-2" }, renderPreview(confirm.kind, confirm.item)),
                React.createElement("div", { className: "text-center" },
                    React.createElement("div", { className: "font-black text-white text-lg" }, confirm.item.name),
                    React.createElement("div", { className: `text-xs font-bold mt-0.5 ${STORE_RARITY[confirm.item.rarity].text}` },
                        "\u0631\u062F\u0647 ",
                        STORE_RARITY[confirm.item.rarity].label)),
                React.createElement("div", { className: "bg-slate-950/80 rounded-2xl p-3.5 text-xs space-y-2 border border-white/10" },
                    React.createElement("div", { className: "flex justify-between text-slate-300" },
                        React.createElement("span", null, "\u0645\u0648\u062C\u0648\u062F\u06CC \u06A9\u06CC\u0648\u062C\u06CC \u0634\u0645\u0627:"),
                        React.createElement("b", null,
                            (user.coins || 0).toLocaleString('fa-IR'),
                            " \u06A9\u06CC\u0648\u062C\u06CC")),
                    React.createElement("div", { className: "flex justify-between text-amber-300 font-bold" },
                        React.createElement("span", null, "\u0645\u0628\u0644\u063A \u067E\u0631\u062F\u0627\u062E\u062A\u06CC:"),
                        React.createElement("b", { className: "flex items-center gap-1.5" },
                            React.createElement("span", null,
                                cfmFinalPrice.toLocaleString('fa-IR'),
                                " \u06A9\u06CC\u0648\u062C\u06CC"),
                            storePct > 0 && cfmFinalPrice !== confirm.item.price && (React.createElement("span", { className: "text-[10px] text-slate-500 line-through" }, confirm.item.price.toLocaleString('fa-IR'))))),
                    React.createElement("div", { className: `flex justify-between border-t border-slate-700/60 pt-2 ${cfmAfter < 0 ? 'text-rose-300' : 'text-emerald-300'} font-black` },
                        React.createElement("span", null, cfmAfter < 0 ? 'کسری موجودی:' : 'موجودی پس از خرید:'),
                        React.createElement("b", null,
                            Math.abs(cfmAfter).toLocaleString('fa-IR'),
                            " \u06A9\u06CC\u0648\u062C\u06CC"))),
                React.createElement("div", { className: "flex gap-2.5 pt-1" },
                    React.createElement("button", { onClick: () => setConfirm(null), className: "flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors" }, "\u0627\u0646\u0635\u0631\u0627\u0641"),
                    React.createElement("button", { disabled: cfmAfter < 0, onClick: handleBuy, className: "flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs disabled:opacity-40 disabled:cursor-not-allowed shadow-lg active:scale-95 transition-all" }, "\u062E\u0631\u06CC\u062F \u0648 \u0641\u0639\u0627\u0644\u200C\u0633\u0627\u0632\u06CC")))))));
};

/* ===== pages/CoinShopPage.jsx ===== */
// ---------- خزانه‌ی کیوجی ----------
const COIN_PACKAGES = [
    { id: 'c100', coins: 100, bonus: 0, price: 49000, icon: '🪙', color: 'from-slate-400 to-slate-600', glow: 'shadow-slate-500/30', tag: '' },
    { id: 'c300', coins: 300, bonus: 20, price: 129000, icon: '💰', color: 'from-amber-500 to-orange-500', glow: 'shadow-orange-500/40', tag: '' },
    { id: 'c700', coins: 700, bonus: 80, price: 269000, icon: '💎', color: 'from-sky-400 to-indigo-500', glow: 'shadow-indigo-500/40', tag: 'محبوب‌ترین' },
    { id: 'c1500', coins: 1500, bonus: 250, price: 529000, icon: '👑', color: 'from-yellow-400 to-amber-600', glow: 'shadow-yellow-500/40', tag: '' },
    { id: 'c3500', coins: 3500, bonus: 800, price: 1190000, icon: '🏆', color: 'from-fuchsia-500 to-purple-600', glow: 'shadow-fuchsia-500/40', tag: 'بهترین ارزش' },
    { id: 'c8000', coins: 8000, bonus: 2400, price: 2490000, icon: '🚀', color: 'from-rose-500 to-red-600', glow: 'shadow-rose-500/40', tag: 'ویژه' }
];
const CoinShopPage = ({ currentUser, onBack }) => {
    const [selectedId, setSelectedId] = useState('c700');
    const [showSoon, setShowSoon] = useState(false);
    const [displayedTotal, setDisplayedTotal] = useState(0);
    const selected = COIN_PACKAGES.find(p => p.id === selectedId);
    const fa = (n) => n.toLocaleString('fa-IR');
    const total = selected.coins + selected.bonus;
    const maxRatio = Math.max(...COIN_PACKAGES.map(p => p.coins / p.price));
    const style = React.createElement("style", null, `
        @keyframes cq-rise { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cq-fadeSlide { from { opacity: 0; transform: translateY(20px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes cq-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
        @keyframes cq-floatSlow { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(16px,-18px,0) scale(1.08); } }
        @keyframes cq-shine { from { transform: translateX(-130%) rotate(18deg); } to { transform: translateX(230%) rotate(18deg); } }
        @keyframes cq-coinSpin { 0%,100% { transform: rotateY(0deg) scale(1); } 50% { transform: rotateY(180deg) scale(1.06); } }
        @keyframes cq-pop { 0% { opacity: 0; transform: scale(.8); } 75% { opacity: 1; transform: scale(1.12); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes cq-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(251,191,36,.28); } 50% { box-shadow: 0 0 0 9px rgba(251,191,36,0); } }
        @keyframes cq-glowPulse { 0%,100% { filter: drop-shadow(0 0 9px rgba(251,191,36,.18)); opacity: .72; } 50% { filter: drop-shadow(0 0 20px rgba(251,191,36,.38)); opacity: 1; } }
        @keyframes cq-shimmer { to { background-position: 220% center; } }
        @keyframes cq-sparkle { 0%,100% { opacity: .25; transform: scale(.65) rotate(0deg); } 50% { opacity: 1; transform: scale(1.2) rotate(35deg); } }
        @keyframes cq-checkDraw { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }
        @keyframes cq-slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cq-ripple { from { transform: scale(.2); opacity: .45; } to { transform: scale(1.8); opacity: 0; } }
        @keyframes cq-gradientShift { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .cq-glass { background:linear-gradient(145deg,rgba(30,41,59,.76),rgba(15,23,42,.66)); border:1px solid rgba(255,255,255,.1); box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 18px 55px rgba(2,6,23,.24); backdrop-filter:blur(18px); }
        .cq-tilt-wrap { perspective:1000px; }
        .cq-card3d { transform-style:preserve-3d; will-change:transform; transition:transform .15s ease-out; }
        .cq-shine-line { position:absolute; width:34%; height:180%; top:-40%; left:-35%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent); transform:rotate(18deg); animation:cq-shine 5.5s ease-in-out infinite; pointer-events:none; }
        .cq-grad-text { color:transparent; background-image:linear-gradient(100deg,#fbbf24,#fef3c7,#f59e0b,#fff7cc); background-size:220% auto; background-clip:text; -webkit-background-clip:text; animation:cq-shimmer 5s linear infinite; }
        .cq-cta { position:relative; isolation:isolate; overflow:hidden; background-size:200% 200%; animation:cq-gradientShift 5s ease infinite; }
        .cq-cta::after { content:''; position:absolute; inset:-40% auto -40% -45%; width:35%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.32),transparent); transform:skewX(-20deg); transition:left .65s ease; pointer-events:none; z-index:1; }
        .cq-cta:hover::after { left:120%; }
        .cq-ripple::before { content:''; position:absolute; inset:0; border-radius:inherit; border:2px solid rgba(255,255,255,.5); animation:cq-ripple 1.8s ease-out infinite; pointer-events:none; }
        .cq-scroll { scrollbar-width:thin; scrollbar-color:rgba(251,191,36,.45) rgba(15,23,42,.2); }
        .cq-scroll::-webkit-scrollbar { width:6px; } .cq-scroll::-webkit-scrollbar-thumb { background:rgba(251,191,36,.45); border-radius:9px; }
        @media (prefers-reduced-motion: reduce) { *,*::before,*::after { animation-duration:.01ms !important; animation-iteration-count:1 !important; scroll-behavior:auto !important; transition-duration:.01ms !important; } }
    `);
    useEffect(() => {
        const start = Date.now();
        const from = displayedTotal;
        const duration = 500;
        const timer = setInterval(() => {
            const progress = Math.min(1, (Date.now() - start) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayedTotal(Math.round(from + (total - from) * eased));
            if (progress >= 1)
                clearInterval(timer);
        }, 16);
        return () => clearInterval(timer);
    }, [total]);
    const openSoon = () => {
        setShowSoon(true);
        if (typeof showToast === 'function')
            showToast('درگاه پرداخت در نسخه آزمایشی فعال نیست', 'info');
    };
    const tiltCard = (e) => {
        const box = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - box.left) / box.width - .5;
        const y = (e.clientY - box.top) / box.height - .5;
        e.currentTarget.style.transition = 'transform .12s ease-out';
        e.currentTarget.style.transform = `translateZ(0) rotateX(${(-y * 14).toFixed(2)}deg) rotateY(${(x * 14).toFixed(2)}deg) scale(1.025)`;
    };
    const resetTilt = (e) => {
        e.currentTarget.style.transition = 'transform .35s ease-out';
        e.currentTarget.style.transform = 'translateZ(0) rotateX(0deg) rotateY(0deg) scale(1)';
    };
    return (React.createElement("main", { dir: "rtl", className: "w-full max-w-6xl mx-auto flex flex-col gap-5 sm:gap-7 pb-8 px-1 sm:px-0 overflow-hidden" },
        style,
        React.createElement("section", { className: "relative isolate overflow-hidden rounded-3xl border border-amber-300/20 bg-gradient-to-br from-amber-600 via-yellow-600 to-orange-700 p-5 sm:p-8 shadow-[0_24px_70px_rgba(180,83,9,.24)]", style: { animation: 'cq-rise .65s ease both' } },
            React.createElement("div", { className: "absolute -top-20 -right-8 w-64 h-64 rounded-full bg-yellow-200/20 blur-3xl pointer-events-none", style: { animation: 'cq-floatSlow 9s ease-in-out infinite' } }),
            React.createElement("div", { className: "absolute -bottom-24 left-1/4 w-72 h-72 rounded-full bg-orange-950/25 blur-3xl pointer-events-none", style: { animation: 'cq-floatSlow 11s ease-in-out infinite reverse' } }),
            React.createElement("div", { className: "absolute top-8 left-8 w-40 h-40 rounded-full bg-amber-200/15 blur-3xl pointer-events-none", style: { animation: 'cq-floatSlow 8s ease-in-out infinite 1s' } }),
            React.createElement("div", { className: "cq-shine-line opacity-70" }),
            React.createElement("span", { className: "absolute top-[18%] left-[14%] text-yellow-100 text-xl pointer-events-none", style: { animation: 'cq-sparkle 2.2s infinite' } }, "\u2726"),
            React.createElement("span", { className: "absolute top-[68%] left-[30%] text-amber-100 text-xs pointer-events-none", style: { animation: 'cq-sparkle 2.8s .4s infinite' } }, "\u2727"),
            React.createElement("span", { className: "absolute top-[22%] right-[34%] text-yellow-50 text-sm pointer-events-none", style: { animation: 'cq-sparkle 2.4s .8s infinite' } }, "\u2726"),
            React.createElement("span", { className: "absolute bottom-[18%] right-[14%] text-amber-100 text-lg pointer-events-none", style: { animation: 'cq-sparkle 3s .3s infinite' } }, "\u2727"),
            React.createElement("span", { className: "absolute top-[48%] right-[48%] text-yellow-50 text-xs pointer-events-none", style: { animation: 'cq-sparkle 2.6s 1s infinite' } }, "\u2726"),
            React.createElement("span", { className: "absolute top-[12%] right-[72%] text-amber-100 text-sm pointer-events-none", style: { animation: 'cq-sparkle 2.1s .6s infinite' } }, "\u2727"),
            React.createElement("span", { className: "absolute bottom-[12%] left-[9%] text-yellow-50 text-xs pointer-events-none", style: { animation: 'cq-sparkle 2.7s 1.1s infinite' } }, "\u2726"),
            React.createElement("span", { className: "absolute bottom-[22%] right-[68%] text-amber-100 text-base pointer-events-none", style: { animation: 'cq-sparkle 2.5s .5s infinite' } }, "\u2727"),
            React.createElement("button", { onClick: onBack, "aria-label": "\u0628\u0627\u0632\u06AF\u0634\u062A", className: "absolute z-20 top-4 right-4 sm:top-6 sm:right-6 w-11 h-11 rounded-full flex items-center justify-center bg-black/15 hover:bg-black/25 border border-white/20 text-white transition-all hover:scale-110 active:scale-95" },
                React.createElement(IconArrowLeft, { className: "w-5 h-5" })),
            React.createElement("div", { className: "relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 sm:pt-2" },
                React.createElement("div", { className: "flex flex-col sm:flex-row items-center text-center sm:text-right gap-4 sm:gap-5" },
                    React.createElement("div", { className: "cq-tilt-wrap shrink-0" },
                        React.createElement("div", { className: "w-24 h-24 sm:w-28 sm:h-28 rounded-full p-[5px] bg-[conic-gradient(from_30deg,#fff2aa,#f59e0b,#92400e,#fde68a,#fff2aa)] shadow-[0_15px_35px_rgba(69,26,3,.36)]", style: { animation: 'cq-coinSpin 8s ease-in-out infinite' } },
                            React.createElement("div", { className: "w-full h-full rounded-full bg-[radial-gradient(circle_at_32%_25%,#fff7c2,#fbbf24_42%,#b45309_100%)] border border-yellow-100/70 flex items-center justify-center shadow-[inset_0_3px_12px_rgba(255,255,255,.55),inset_0_-8px_15px_rgba(120,53,15,.35)]" },
                                React.createElement(IconCoin, { className: "w-12 h-12 sm:w-14 sm:h-14 text-amber-950 drop-shadow-[0_3px_1px_rgba(255,255,255,.32)]" })))),
                    React.createElement("div", null,
                        React.createElement("div", { className: "text-[11px] font-black tracking-[.22em] uppercase text-amber-100/75 mb-1" }, "GAMEQJ \u2022 COIN VAULT"),
                        React.createElement("h1", { className: "text-3xl sm:text-5xl font-black cq-grad-text leading-tight" }, "\u062E\u0632\u0627\u0646\u0647\u200C\u06CC \u06A9\u06CC\u0648\u062C\u06CC"),
                        React.createElement("p", { className: "mt-2 text-xs sm:text-sm text-amber-50/85 leading-6" }, "\u06CC\u06A9 \u0642\u062F\u0645 \u062A\u0627 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0628\u06CC\u0634\u062A\u0631\u061B \u0628\u0633\u062A\u0647\u200C\u06CC \u062F\u0644\u062E\u0648\u0627\u0647\u062A \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646."))),
                React.createElement("div", { className: "flex items-center gap-3 w-full sm:w-auto justify-center" },
                    React.createElement("div", { key: currentUser.coins, className: "relative flex items-center gap-2.5 px-4 sm:px-5 py-3 rounded-2xl bg-white/15 border border-white/25 text-white shadow-xl backdrop-blur-md", style: { animation: 'cq-pop .55s cubic-bezier(.34,1.56,.64,1) both, cq-pulse 2.8s 1s infinite' } },
                        React.createElement(IconCoin, { className: "w-6 h-6 text-yellow-100" }),
                        React.createElement("span", { className: "text-lg sm:text-xl font-black" }, fa(currentUser.coins ?? 0)),
                        React.createElement("span", { className: "text-[10px] sm:text-xs text-amber-50/80 font-bold" }, "\u0645\u0648\u062C\u0648\u062F\u06CC"))))),
        React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-2.5", "aria-label": "\u0646\u0631\u062E \u0648 \u0645\u0632\u0627\u06CC\u0627" },
            React.createElement("div", { className: "cq-glass rounded-2xl px-3 py-3 flex items-center justify-center gap-2 text-[11px] sm:text-xs text-amber-100 font-bold", style: { animation: 'cq-fadeSlide .5s .08s both' } },
                React.createElement(IconCoin, { className: "w-4 h-4 text-amber-300" }),
                " \u0647\u0631 \u06F1\u06F0\u06F0 \u06A9\u06CC\u0648\u062C\u06CC \u2248 \u06F4\u06F9\u066C\u06F0\u06F0\u06F0 \u062A\u0648\u0645\u0627\u0646"),
            React.createElement("div", { className: "cq-glass rounded-2xl px-3 py-3 flex items-center justify-center gap-2 text-[11px] sm:text-xs text-slate-200 font-bold", style: { animation: 'cq-fadeSlide .5s .16s both' } },
                React.createElement("span", { className: "text-emerald-300" }, "\u2726"),
                " \u0628\u0633\u062A\u0647\u200C\u0647\u0627\u06CC \u0628\u0632\u0631\u06AF\u200C\u062A\u0631\u060C \u0647\u062F\u06CC\u0647\u200C\u06CC \u0628\u06CC\u0634\u062A\u0631"),
            React.createElement("div", { className: "cq-glass rounded-2xl px-3 py-3 flex items-center justify-center gap-2 text-[11px] sm:text-xs text-slate-200 font-bold", style: { animation: 'cq-fadeSlide .5s .24s both' } },
                React.createElement("span", { className: "text-sky-300" }, "\u25C8"),
                " \u0627\u0646\u062A\u062E\u0627\u0628 \u0627\u0645\u0646\u061B \u067E\u0631\u062F\u0627\u062E\u062A \u0641\u0639\u0644\u0627\u064B \u063A\u06CC\u0631\u0641\u0639\u0627\u0644")),
        React.createElement("section", { "aria-label": "\u0628\u0633\u062A\u0647\u200C\u0647\u0627\u06CC \u06A9\u06CC\u0648\u062C\u06CC", className: "grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5" }, COIN_PACKAGES.map((pkg, i) => {
            const active = pkg.id === selectedId;
            const ratio = Math.max(8, Math.round((pkg.coins / pkg.price / maxRatio) * 100));
            return (React.createElement("div", { key: pkg.id, className: "cq-tilt-wrap", style: { animation: `cq-fadeSlide .55s ${i * 80}ms both` } },
                React.createElement("button", { type: "button", "aria-pressed": active, onClick: () => setSelectedId(pkg.id), onMouseMove: tiltCard, onMouseLeave: resetTilt, className: `cq-card3d group relative w-full min-h-[245px] sm:min-h-[285px] text-center rounded-3xl p-4 sm:p-6 overflow-hidden ${active ? 'border-2 border-amber-300/90 shadow-[0_0_34px_rgba(251,191,36,.24)] scale-[1.02]' : 'cq-glass border border-white/10 hover:border-amber-300/40'}` },
                    React.createElement("div", { className: `absolute inset-0 bg-gradient-to-br ${pkg.color} pointer-events-none ${active ? 'opacity-[.17]' : 'opacity-[.07]'}` }),
                    active && React.createElement("div", { className: "absolute inset-0 rounded-3xl pointer-events-none", style: { animation: 'cq-glowPulse 2.8s ease-in-out infinite' } }),
                    pkg.tag && React.createElement("span", { className: `absolute -left-8 top-4 z-10 w-32 -rotate-45 py-1 bg-gradient-to-r ${pkg.color} text-white text-[9px] sm:text-[10px] font-black shadow-lg` }, pkg.tag),
                    active && React.createElement("span", { className: "absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-amber-300 text-amber-950 flex items-center justify-center shadow-lg", style: { animation: 'cq-pop .4s cubic-bezier(.34,1.56,.64,1) both' } },
                        React.createElement("svg", { viewBox: "0 0 24 24", className: "w-4 h-4", fill: "none", stroke: "currentColor", strokeWidth: "3" },
                            React.createElement("path", { d: "m5 12 4 4L19 6", strokeDasharray: "24", strokeDashoffset: "0", style: { animation: 'cq-checkDraw .45s ease both' } }))),
                    React.createElement("div", { className: "relative z-10" },
                        React.createElement("div", { className: `mx-auto mt-2 sm:mt-1 w-[68px] h-[68px] sm:w-[82px] sm:h-[82px] rounded-full p-[4px] bg-[conic-gradient(from_35deg,#fff2b2,#f59e0b,#92400e,#fde68a,#fff2b2)] shadow-xl ${pkg.glow} ${active ? '' : 'group-hover:animate-[cq-coinSpin_1.2s_ease-in-out]'}`, style: active ? { animation: 'cq-coinSpin 7s ease-in-out infinite' } : undefined },
                            React.createElement("div", { className: "w-full h-full rounded-full bg-[radial-gradient(circle_at_30%_25%,#fff8ce,#fbbf24_45%,#a16207_100%)] border border-yellow-100/60 flex items-center justify-center text-3xl sm:text-4xl shadow-[inset_0_3px_8px_rgba(255,255,255,.6),inset_0_-7px_12px_rgba(120,53,15,.35)]" }, pkg.icon)),
                        React.createElement("div", { className: "mt-3 text-2xl sm:text-3xl font-black cq-grad-text" }, fa(pkg.coins)),
                        React.createElement("div", { className: "text-[10px] sm:text-xs text-amber-200/90 font-bold" }, "\u06A9\u06CC\u0648\u062C\u06CC \u0633\u06A9\u0647"),
                        React.createElement("div", { className: "h-7 mt-2 flex items-center justify-center" }, pkg.bonus > 0 && React.createElement("span", { className: "text-[9px] sm:text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-300/20", style: { animation: 'cq-pop .5s .15s both' } },
                            "+",
                            fa(pkg.bonus),
                            " \u0647\u062F\u06CC\u0647")),
                        React.createElement("div", { className: "mt-1 text-sm sm:text-base font-black text-white" },
                            fa(pkg.price),
                            " ",
                            React.createElement("span", { className: "text-[9px] sm:text-[10px] text-slate-400" }, "\u062A\u0648\u0645\u0627\u0646")),
                        React.createElement("div", { className: "mt-3 h-1.5 rounded-full bg-slate-950/50 overflow-hidden" },
                            React.createElement("div", { className: `h-full rounded-full bg-gradient-to-r ${pkg.color}`, style: { width: `${ratio}%`, transition: 'width .9s cubic-bezier(.2,.8,.2,1)', animation: 'cq-rise .8s ease both' } }))))));
        })),
        React.createElement("section", { className: "cq-glass relative overflow-hidden rounded-3xl p-4 sm:p-6 border border-amber-200/15 shadow-2xl sm:sticky sm:bottom-3 z-20" },
            React.createElement("div", { className: "absolute -top-16 left-1/3 w-48 h-32 bg-amber-400/10 blur-3xl rounded-full pointer-events-none" }),
            React.createElement("div", { className: "relative flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4" },
                React.createElement("div", { className: "flex items-center gap-3 sm:gap-4" },
                    React.createElement("div", { className: `shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${selected.color} flex items-center justify-center text-3xl shadow-lg ${selected.glow}`, style: { animation: 'cq-pop .4s cubic-bezier(.34,1.56,.64,1) both' } }, selected.icon),
                    React.createElement("div", { className: "min-w-0" },
                        React.createElement("div", { className: "text-[11px] text-slate-400 font-bold" }, "\u062E\u0644\u0627\u0635\u0647\u200C\u06CC \u0633\u0641\u0627\u0631\u0634"),
                        React.createElement("div", { className: "text-sm sm:text-base font-black text-white mt-1" },
                            fa(selected.coins),
                            " \u06A9\u06CC\u0648\u062C\u06CC ",
                            React.createElement("span", { className: "text-emerald-300" }, selected.bonus > 0 ? `+ ${fa(selected.bonus)} هدیه` : '')),
                        React.createElement("div", { className: "text-[10px] text-slate-400 mt-1" },
                            "\u0645\u062C\u0645\u0648\u0639 \u062F\u0631\u06CC\u0627\u0641\u062A\u06CC: ",
                            React.createElement("b", { className: "text-amber-200" },
                                fa(displayedTotal),
                                " \u06A9\u06CC\u0648\u062C\u06CC")))),
                React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5" },
                    React.createElement("div", { className: "text-xl sm:text-2xl font-black text-white sm:text-left" },
                        fa(selected.price),
                        " ",
                        React.createElement("span", { className: "text-[10px] text-slate-400" }, "\u062A\u0648\u0645\u0627\u0646")),
                    React.createElement("button", { onClick: openSoon, className: `cq-cta cq-ripple w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r ${selected.color} text-white font-black text-sm sm:text-base shadow-xl ${selected.glow} hover:-translate-y-1 hover:shadow-2xl active:scale-95 transition-all` },
                        React.createElement("span", { className: "relative z-10" },
                            "\u062E\u0631\u06CC\u062F \u0648 \u0627\u062A\u0635\u0627\u0644 \u0628\u0647 \u062F\u0631\u06AF\u0627\u0647 ",
                            React.createElement("span", { className: "mr-1" }, "\u2190")))))),
        React.createElement("p", { className: "flex items-center justify-center gap-2 text-center text-[10px] sm:text-xs text-slate-500 leading-6 px-2" },
            React.createElement(IconLock, { className: "w-4 h-4 text-emerald-500/70" }),
            " \u067E\u0631\u062F\u0627\u062E\u062A \u0627\u0645\u0646 \u0627\u0632 \u0637\u0631\u06CC\u0642 \u062F\u0631\u06AF\u0627\u0647 \u0634\u062A\u0627\u0628 (\u0628\u0647\u200C\u0632\u0648\u062F\u06CC)"),
        showSoon && (React.createElement("div", { className: "fixed inset-0 z-[120] bg-slate-950/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-5", onClick: () => setShowSoon(false) },
            React.createElement("section", { role: "dialog", "aria-modal": "true", "aria-labelledby": "cq-modal-title", onClick: e => e.stopPropagation(), className: "cq-glass cq-scroll relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 border border-amber-300/25 shadow-[0_25px_90px_rgba(0,0,0,.6)] text-center", style: { animation: 'cq-slideUp .45s cubic-bezier(.2,.8,.2,1) both' } },
                React.createElement("div", { className: "w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-5 sm:hidden" }),
                React.createElement("div", { className: "relative overflow-hidden mx-auto w-24 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 border border-white/25 shadow-xl flex items-center justify-center", style: { animation: 'cq-float 3.2s ease-in-out infinite' } },
                    React.createElement("div", { className: "cq-shine-line opacity-90", style: { animationDuration: '2.4s' } }),
                    React.createElement("span", { className: "relative z-10 text-3xl" }, "\uD83D\uDCB3")),
                React.createElement("h2", { id: "cq-modal-title", className: "mt-5 text-xl sm:text-2xl font-black cq-grad-text" }, "\u062F\u0631\u06AF\u0627\u0647 \u067E\u0631\u062F\u0627\u062E\u062A \u0628\u0647\u200C\u0632\u0648\u062F\u06CC"),
                React.createElement("p", { className: "mt-3 text-sm text-slate-300 leading-7" }, "\u0627\u062A\u0635\u0627\u0644 \u0628\u0647 \u0634\u0628\u06A9\u0647\u200C\u06CC \u0634\u062A\u0627\u0628 \u062F\u0631 \u062D\u0627\u0644 \u0622\u0645\u0627\u062F\u0647\u200C\u0633\u0627\u0632\u06CC \u0627\u0633\u062A. \u0627\u06CC\u0646 \u0646\u0633\u062E\u0647\u200C\u06CC \u0622\u0632\u0645\u0627\u06CC\u0634\u06CC \u0627\u0633\u062A \u0648 \u0647\u06CC\u0686 \u0645\u0628\u0644\u063A\u06CC \u0627\u0632 \u062D\u0633\u0627\u0628 \u0634\u0645\u0627 \u06A9\u0633\u0631 \u0646\u0645\u06CC\u200C\u0634\u0648\u062F."),
                React.createElement("div", { className: "mt-5 flex items-center justify-between gap-3 rounded-2xl bg-white/[.04] border border-white/10 px-4 py-3 text-xs sm:text-sm" },
                    React.createElement("span", { className: "text-slate-300" },
                        "\u0633\u0641\u0627\u0631\u0634 \u0634\u0645\u0627: ",
                        React.createElement("b", { className: "text-white" },
                            fa(selected.coins),
                            " \u06A9\u06CC\u0648\u062C\u06CC ",
                            selected.bonus > 0 ? `+ ${fa(selected.bonus)} هدیه` : '')),
                    React.createElement("b", { className: "shrink-0 text-amber-200" },
                        fa(selected.price),
                        " \u062A\u0648\u0645\u0627\u0646")),
                React.createElement("button", { onClick: () => setShowSoon(false), className: "cq-cta mt-5 w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-amber-950 font-black text-sm shadow-lg hover:-translate-y-0.5 transition-all" },
                    React.createElement("span", { className: "relative z-10" }, "\u0645\u062A\u0648\u062C\u0647 \u0634\u062F\u0645")),
                React.createElement("button", { onClick: () => setShowSoon(false), className: "mt-2 w-full py-2.5 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 font-bold text-xs transition-colors" }, "\u0628\u0633\u062A\u0646"))))));
};

/* ===== games/LudoGame.jsx ===== */
// ---------- بازی منچ ۴ نفره کلاسیک با طراحی بهینه‌شده برای موبایل و کشوی گزارش هوشمند ----------
const LUDO_TRACK = [
    [4, 0], [4, 1], [4, 2], [4, 3], [4, 4],
    [3, 4], [2, 4], [1, 4], [0, 4],
    [0, 5],
    [0, 6], [1, 6], [2, 6], [3, 6], [4, 6],
    [4, 7], [4, 8], [4, 9], [4, 10],
    [5, 10],
    [6, 10], [6, 9], [6, 8], [6, 7], [6, 6],
    [7, 6], [8, 6], [9, 6], [10, 6],
    [10, 5],
    [10, 4], [9, 4], [8, 4], [7, 4], [6, 4],
    [6, 3], [6, 2], [6, 1], [6, 0],
    [5, 0]
];
const LUDO_HOME_LANES = {
    0: [[5, 1], [5, 2], [5, 3], [5, 4], [5, 5]],
    1: [[1, 5], [2, 5], [3, 5], [4, 5], [5, 5]],
    2: [[5, 9], [5, 8], [5, 7], [5, 6], [5, 5]],
    3: [[9, 5], [8, 5], [7, 5], [6, 5], [5, 5]],
};
const LUDO_YARD_SPOTS = {
    0: [[1, 1], [1, 2], [2, 1], [2, 2]],
    1: [[1, 8], [1, 9], [2, 8], [2, 9]],
    2: [[8, 8], [8, 9], [9, 8], [9, 9]],
    3: [[8, 1], [8, 2], [9, 1], [9, 2]],
};
// هندسه‌ی صفحه (۱۱×۱۱)
const LUDO_CELL = 100 / 11;
const ludoBox = (r, c, w = 1, h = 1) => ({ top: `${r * LUDO_CELL}%`, left: `${c * LUDO_CELL}%`, width: `${w * LUDO_CELL}%`, height: `${h * LUDO_CELL}%` });
const LUDO_YARD_ORIGIN = { 0: [0, 0], 1: [0, 7], 2: [7, 7], 3: [7, 0] };
const LUDO_FINISH_SLOT = (pId, tokenId) => {
    const [r0, c0] = LUDO_YARD_ORIGIN[pId];
    return [pId <= 1 ? r0 + 3 : r0, c0 + tokenId];
};
const LudoGame = ({ currentUser, gameMode, onExit, onGameFinished, matchId, matchParticipants, onOpenProfile, setIsInGame, onUserUpdated, onNavigateToGames, onRequestRematch }) => {
    const PLAYERS = useMemo(() => {
        if (gameMode === 'online' && matchParticipants && matchParticipants.length > 0) {
            return [
                { id: 0, name: matchParticipants[0] || 'قرمز (بات)', colorName: 'قرمز', hex: '#ef4444', bg: 'bg-red-500', isHuman: matchParticipants[0] === currentUser.username, isBot: !matchParticipants[0], startTrackIdx: 0 },
                { id: 1, name: matchParticipants[1] || 'سبز (بات)', colorName: 'سبز', hex: '#10b981', bg: 'bg-emerald-500', isHuman: matchParticipants[1] === currentUser.username, isBot: !matchParticipants[1], startTrackIdx: 10 },
                { id: 2, name: matchParticipants[2] || 'زرد (بات)', colorName: 'زرد', hex: '#f59e0b', bg: 'bg-amber-500', isHuman: matchParticipants[2] === currentUser.username, isBot: !matchParticipants[2], startTrackIdx: 20 },
                { id: 3, name: matchParticipants[3] || 'آبی (بات)', colorName: 'آبی', hex: '#3b82f6', bg: 'bg-blue-500', isHuman: matchParticipants[3] === currentUser.username, isBot: !matchParticipants[3], startTrackIdx: 30 },
            ];
        }
        else {
            return [
                { id: 0, name: currentUser.username, colorName: 'قرمز', hex: '#ef4444', bg: 'bg-red-500', isHuman: true, isBot: false, startTrackIdx: 0 },
                { id: 1, name: 'سبز (بات)', colorName: 'سبز', hex: '#10b981', bg: 'bg-emerald-500', isHuman: false, isBot: true, startTrackIdx: 10 },
                { id: 2, name: 'زرد (بات)', colorName: 'زرد', hex: '#f59e0b', bg: 'bg-amber-500', isHuman: false, isBot: true, startTrackIdx: 20 },
                { id: 3, name: 'آبی (بات)', colorName: 'آبی', hex: '#3b82f6', bg: 'bg-blue-500', isHuman: false, isBot: true, startTrackIdx: 30 },
            ];
        }
    }, [currentUser.username, gameMode, matchParticipants]);
    const tokenStyles = useEquippedStyles(PLAYERS.map(p => (p.isBot ? null : p.name)), currentUser);
    const tokenStyleOf = (player) => (player.isBot ? 'classic' : ((tokenStyles[player.name] || {}).ludo || 'classic'));
    const diceStyleOf = (player) => (player.isBot ? 'classic' : ((tokenStyles[player.name] || {}).dice || 'classic'));
    const myPlayerId = PLAYERS.find(p => p.name === currentUser.username)?.id ?? 0;
    const peerName = matchParticipants ? (myPlayerId === 0 ? matchParticipants[1] : matchParticipants[0]) : 'حریف هوش مصنوعی';
    const [currentMatchId, setCurrentMatchId] = useState(matchId);
    const [pieces, setPieces] = useState(() => {
        const init = {};
        for (let p = 0; p < 4; p++) {
            init[p] = [
                { id: 0, status: 'yard', stepCount: 0 },
                { id: 1, status: 'yard', stepCount: 0 },
                { id: 2, status: 'yard', stepCount: 0 },
                { id: 3, status: 'yard', stepCount: 0 }
            ];
        }
        return init;
    });
    const [showIntro, setShowIntro] = useState(true);
    const [currentTurn, setCurrentTurn] = useState(0);
    const [turnSerial, setTurnSerial] = useState(0);
    const [turnSeconds, setTurnSeconds] = useState(40);
    const [warnings, setWarnings] = useState({});
    const deadlineRef = useRef(0);
    const turnGeneration = useRef(0);
    const moveCommitted = useRef(false);
    const timeoutHandled = useRef(false);
    const [diceValue, setDiceValue] = useState(null);
    const [hasRolled, setHasRolled] = useState(false);
    const [isRolling, setIsRolling] = useState(false);
    const [diceHome, setDiceHome] = useState(true);
    const [diceTransform, setDiceTransform] = useState('');
    const [isAnimatingMove, setIsAnimatingMove] = useState(false);
    const [movablePieceIds, setMovablePieceIds] = useState([]);
    const [winner, setWinner] = useState(null);
    const [abandonedPlayers, setAbandonedPlayers] = useState([]);
    const [gameLog, setGameLog] = useState(['مسابقه منچ آغاز شد! روی تاس وسط صفحه بزنید.']);
    // کشوی گزارش زنده بازی (مشابه گفتگو)
    const [isLogOpen, setIsLogOpen] = useState(false);
    const [hasNewLog, setHasNewLog] = useState(false);
    const [actionHistory, setActionHistory] = useState([]);
    // وضعیت بازی مجدد
    const [hasFreeRematch, setHasFreeRematch] = useState(false);
    const [freeRematchUsed, setFreeRematchUsed] = useState(false);
    const [rematchState, setRematchState] = useState('idle');
    const rematchActionsRef = useRef({});
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [rematchTimeLeft, setRematchTimeLeft] = useState(0);
    const [pendingNextMatchId, setPendingNextMatchId] = useState(null);
    // اعلان درخواست بازی مجدد
    useEffect(() => {
        if (gameMode !== 'online')
            return;
        if (rematchState === 'received') {
            showToast({
                id: 'rematch', type: 'request', title: 'درخواست بازی مجدد',
                text: `«${peerName}» می‌خواهد دوباره منچ بازی کند.`,
                duration: 20000, showTimer: true,
                actions: [
                    { label: 'قبول', variant: 'success', onClick: () => rematchActionsRef.current.accept() },
                    { label: 'رد کردن', variant: 'danger', onClick: () => rematchActionsRef.current.decline() }
                ]
            });
        }
        else if (rematchState === 'requested') {
            showToast({ id: 'rematch', type: 'waiting', title: 'درخواست بازی مجدد ارسال شد', text: `در انتظار پاسخ «${peerName}»...`, duration: 20000, showTimer: true });
        }
        else {
            hideToast('rematch');
        }
    }, [rematchState]);
    useEffect(() => () => hideToast('rematch'), []);
    const piecesRef = useRef(pieces);
    const currentTurnRef = useRef(currentTurn);
    const resultRecordedRef = useRef(false);
    const rematchTimerRef = useRef(null);
    const processedMsgIds = useRef(new Set());
    const stateRef = useRef();
    useEffect(() => { piecesRef.current = pieces; currentTurnRef.current = currentTurn; }, [pieces, currentTurn]);
    useEffect(() => { if (setIsInGame)
        setIsInGame(!winner); }, [winner, setIsInGame]);
    const activePlayer = PLAYERS[currentTurn];
    const isMyTurn = currentTurn === myPlayerId;
    const logMsg = useCallback((text) => {
        setGameLog(prev => [text, ...prev.slice(0, 35)]);
        setHasNewLog(true);
    }, []);
    const handleExitClick = () => {
        if (winner)
            onExit();
        else
            setShowExitConfirm(true);
    };
    const confirmExit = () => {
        setShowExitConfirm(false);
        if (gameMode === 'online') {
            sendMessage(currentUser.username, '__ABANDON__' + currentUser.username, null, currentMatchId);
            window.dispatchEvent(new Event('storage'));
        }
        onExit();
    };
    useEffect(() => {
        const msgs = getMessages().filter(m => m.matchId === matchId);
        msgs.forEach(m => processedMsgIds.current.add(m.id));
    }, [matchId]);
    const getPieceBoardCoords = useCallback((pId, token) => {
        if (token.status === 'yard') {
            return LUDO_YARD_SPOTS[pId][token.id];
        }
        if (token.status === 'finished' || token.stepCount >= 44) {
            return LUDO_FINISH_SLOT(pId, token.id);
        }
        if (token.stepCount < 40) {
            const trackIdx = (PLAYERS[pId].startTrackIdx + token.stepCount) % 40;
            return LUDO_TRACK[trackIdx];
        }
        const homeIdx = Math.min(token.stepCount - 40, 4);
        return LUDO_HOME_LANES[pId][homeIdx] || [5, 5];
    }, [PLAYERS]);
    const getValidMoves = useCallback((pId, roll, currentPieces) => {
        const player = PLAYERS[pId];
        const pTokens = currentPieces[pId];
        const valid = [];
        pTokens.forEach(token => {
            if (token.status === 'finished' || token.stepCount >= 44)
                return;
            if (token.status === 'yard') {
                if (roll === 6) {
                    const friendlyOnStart = pTokens.some(t => t.id !== token.id && t.status === 'active' && t.stepCount === 0);
                    if (!friendlyOnStart)
                        valid.push(token.id);
                }
            }
            else if (token.status === 'active') {
                const nextStep = token.stepCount + roll;
                if (nextStep <= 44) {
                    if (nextStep < 40) {
                        const targetTrackIdx = (player.startTrackIdx + nextStep) % 40;
                        const friendlyOccupied = pTokens.some(t => t.id !== token.id && t.status === 'active' && t.stepCount === nextStep);
                        let enemyOnSafe = false;
                        for (let otherPid = 0; otherPid < 4; otherPid++) {
                            if (otherPid === pId)
                                continue;
                            if (currentPieces[otherPid].some(e => {
                                if (e.status === 'active' && e.stepCount === 0) {
                                    const enemyTrackIdx = PLAYERS[otherPid].startTrackIdx;
                                    return enemyTrackIdx === targetTrackIdx;
                                }
                                return false;
                            })) {
                                enemyOnSafe = true;
                                break;
                            }
                        }
                        if (!friendlyOccupied && !enemyOnSafe)
                            valid.push(token.id);
                    }
                    else {
                        const friendlyOccupied = pTokens.some(t => t.id !== token.id && t.status === 'active' && t.stepCount === nextStep && nextStep !== 44);
                        if (!friendlyOccupied)
                            valid.push(token.id);
                    }
                }
            }
        });
        return valid;
    }, [PLAYERS]);
    const nextTurn = useCallback((repeatSame = false) => {
        turnGeneration.current += 1;
        moveCommitted.current = false;
        deadlineRef.current = 0;
        setTurnSerial(serial => serial + 1);
        setTurnSeconds(40);
        setHasRolled(false);
        setMovablePieceIds([]);
        setIsAnimatingMove(false);
        if (repeatSame) {
            logMsg(`🎲 با آوردن تاس ۶، ${PLAYERS[currentTurnRef.current].colorName} دوباره تاس می‌اندازد!`);
        }
        else {
            setCurrentTurn(prev => (prev + 1) % 4);
        }
    }, [logMsg, PLAYERS]);
    useEffect(() => {
        if (showIntro || winner)
            return;
        const key = 'gameqj:ludo-clock:' + currentMatchId + ':' + turnSerial;
        deadlineRef.current = (gameMode === 'online' ? gameClockStart(key) : Date.now()) + 40000;
        timeoutHandled.current = false;
        const tick = () => {
            const seconds = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
            setTurnSeconds(seconds);
            if (seconds || moveCommitted.current || timeoutHandled.current)
                return;
            const pendingMove = gameMode === 'online' && getMessages().some(message => {
                if (message.matchId !== currentMatchId || !message.text.startsWith('__ACTION__'))
                    return false;
                try {
                    const action = JSON.parse(message.text.slice(10));
                    return action.type === 'MOVE' && action.turnSerial === turnSerial && Date.parse(message.createdAt) <= deadlineRef.current;
                }
                catch {
                    return false;
                }
            });
            if (pendingMove)
                return;
            timeoutHandled.current = true;
            const count = (warnings[currentTurn] || 0) + 1;
            setWarnings(previous => ({ ...previous, [currentTurn]: count }));
            logMsg(count === 3 ? PLAYERS[currentTurn].name + ' با سومین اخطار حذف شد.' : PLAYERS[currentTurn].name + ' اخطار ' + count + ' از ۳: پایان زمان نوبت');
            setIsRolling(false);
            setDiceHome(true);
            if (count >= 3) {
                setAbandonedPlayers(previous => [...new Set([...previous, currentTurn])]);
                setPieces(previous => ({ ...previous, [currentTurn]: previous[currentTurn].map(token => ({ ...token, status: 'yard', stepCount: 0 })) }));
            }
            nextTurnRef.current(false);
        };
        tick();
        const timer = setInterval(tick, 200);
        return () => clearInterval(timer);
    }, [showIntro, currentMatchId, turnSerial, winner]);
    useEffect(() => () => { turnGeneration.current += 1; }, []);
    useEffect(() => { if (winner)
        turnGeneration.current += 1; }, [winner]);
    const nextTurnRef = useRef(nextTurn);
    useEffect(() => { nextTurnRef.current = nextTurn; }, [nextTurn]);
    const checkCapturesAndFinish = useCallback((newPieces, movingToken, rollValue) => {
        const pId = currentTurnRef.current;
        const player = PLAYERS[pId];
        if (movingToken.status === 'active' && movingToken.stepCount < 40) {
            const myTrackIdx = (player.startTrackIdx + movingToken.stepCount) % 40;
            for (let otherPid = 0; otherPid < 4; otherPid++) {
                if (otherPid === pId)
                    continue;
                newPieces[otherPid].forEach(enemyToken => {
                    if (enemyToken.status === 'active' && enemyToken.stepCount < 40) {
                        const enemyTrackIdx = (PLAYERS[otherPid].startTrackIdx + enemyToken.stepCount) % 40;
                        if (enemyTrackIdx === myTrackIdx) {
                            const isEnemySafe = (enemyToken.stepCount === 0);
                            if (!isEnemySafe) {
                                enemyToken.status = 'yard';
                                enemyToken.stepCount = 0;
                                logMsg(`💥 ${player.colorName} مهره ${PLAYERS[otherPid].colorName} را زد و برگرداند!`);
                                playSound('capture', currentUser.settings?.sound);
                            }
                        }
                    }
                });
            }
        }
        const finishedCount = newPieces[pId].filter(t => t.stepCount >= 44 || t.status === 'finished').length;
        if (finishedCount === 4) {
            setWinner(player.name);
            playSound('win', currentUser.settings?.sound);
            logMsg(`🏆 تبریک! ${player.name} برنده مسابقه منچ شد!`);
            setIsAnimatingMove(false);
            return;
        }
        if (rollValue === 6) {
            nextTurnRef.current(true);
        }
        else {
            nextTurnRef.current(false);
        }
    }, [PLAYERS, currentUser.settings?.sound, logMsg]);
    const checkCapturesAndFinishRef = useRef(checkCapturesAndFinish);
    useEffect(() => { checkCapturesAndFinishRef.current = checkCapturesAndFinish; }, [checkCapturesAndFinish]);
    const finishRoll = useCallback((rollValue, isSync = false) => {
        setDiceValue(rollValue);
        setIsRolling(false);
        setHasRolled(true);
        const valid = getValidMoves(currentTurnRef.current, rollValue, piecesRef.current);
        setMovablePieceIds(valid);
        logMsg(`${PLAYERS[currentTurnRef.current].colorName} تاس ریخت: [${rollValue}]`);
        if (gameMode === 'online' && !isSync) {
            sendMessage(currentUser.username, `__ACTION__${JSON.stringify({ type: 'ROLL', rollValue })}`, null, currentMatchId);
            window.dispatchEvent(new Event('storage'));
        }
        if (valid.length === 0) {
            logMsg(`حرکتی برای مهره‌های ${PLAYERS[currentTurnRef.current].colorName} ممکن نیست.`);
            const generation = turnGeneration.current;
            moveCommitted.current = true;
            setTimeout(() => { if (generation === turnGeneration.current)
                nextTurnRef.current(false); }, 1200);
        }
    }, [gameMode, currentMatchId, currentUser.username, logMsg, getValidMoves, PLAYERS]);
    const finishRollRef = useRef(finishRoll);
    useEffect(() => { finishRollRef.current = finishRoll; }, [finishRoll]);
    const diceSpinRef = useRef(0);
    const executeRollAnimation = useCallback((finalRollValue) => {
        const generation = turnGeneration.current;
        setIsRolling(true);
        setDiceHome(false);
        playSound('dice', currentUser.settings?.sound);
        let step = 0;
        const totalSteps = 18;
        const MAX_REACH = 420;
        const rollInterval = setInterval(() => {
            if (generation !== turnGeneration.current) {
                clearInterval(rollInterval);
                return;
            }
            step++;
            const t = step / totalSteps;
            const reach = MAX_REACH * Math.pow(1 - t, 0.6);
            const ang = Math.random() * Math.PI * 2;
            const rad = reach * (0.55 + Math.random() * 0.45);
            const rx = Math.cos(ang) * rad;
            const ry = Math.sin(ang) * rad;
            diceSpinRef.current += 160 + Math.random() * 200;
            const lift = 1.12 + 0.28 * Math.sin(Math.PI * t);
            setDiceTransform(`translate(${rx}%, ${ry}%) rotate(${diceSpinRef.current}deg) scale(${lift})`);
            setDiceValue(Math.floor(Math.random() * 6) + 1);
            if (step >= totalSteps) {
                clearInterval(rollInterval);
                diceSpinRef.current = Math.ceil(diceSpinRef.current / 360) * 360;
                setDiceTransform(`translate(0%, 0%) rotate(${diceSpinRef.current}deg) scale(1)`);
                setDiceValue(finalRollValue);
                setDiceHome(true);
                setTimeout(() => { if (generation === turnGeneration.current)
                    finishRollRef.current(finalRollValue, true); }, 460);
            }
        }, 85);
    }, [currentUser.settings?.sound]);
    const startPieceMove = useCallback((pieceId, rollValue = diceValue, isSync = false) => {
        if (!isSync && (showIntro || !deadlineRef.current || Date.now() >= deadlineRef.current || moveCommitted.current))
            return;
        moveCommitted.current = true;
        const generation = turnGeneration.current;
        setIsAnimatingMove(true);
        setMovablePieceIds([]);
        if (gameMode === 'online' && !isSync) {
            sendMessage(currentUser.username, `__ACTION__${JSON.stringify({ type: 'MOVE', pieceId, rollValue, turnSerial })}`, null, currentMatchId);
            window.dispatchEvent(new Event('storage'));
        }
        const clone = JSON.parse(JSON.stringify(piecesRef.current));
        const moving = clone[currentTurnRef.current].find(t => t.id === pieceId);
        if (moving.status === 'yard') {
            const nextPieces = JSON.parse(JSON.stringify(piecesRef.current));
            const curToken = nextPieces[currentTurnRef.current].find(t => t.id === pieceId);
            curToken.status = 'active';
            curToken.stepCount = 0;
            playSound('move', currentUser.settings?.sound);
            setPieces(nextPieces);
            checkCapturesAndFinishRef.current(nextPieces, curToken, rollValue);
            return;
        }
        let currentStep = moving.stepCount;
        const targetStep = moving.stepCount + rollValue;
        const interval = setInterval(() => {
            if (generation !== turnGeneration.current) {
                clearInterval(interval);
                return;
            }
            currentStep += 1;
            setPieces(prev => {
                const stepClone = JSON.parse(JSON.stringify(prev));
                const stepMoving = stepClone[currentTurnRef.current].find(t => t.id === pieceId);
                stepMoving.stepCount = Math.min(currentStep, 44);
                if (currentStep >= 44)
                    stepMoving.status = 'finished';
                return stepClone;
            });
            playSound('move', currentUser.settings?.sound);
            if (currentStep >= targetStep) {
                clearInterval(interval);
                setTimeout(() => {
                    if (generation !== turnGeneration.current)
                        return;
                    setPieces(latest => {
                        const finishClone = JSON.parse(JSON.stringify(latest));
                        const finishMoving = finishClone[currentTurnRef.current].find(t => t.id === pieceId);
                        checkCapturesAndFinishRef.current(finishClone, finishMoving, rollValue);
                        return finishClone;
                    });
                }, 90);
            }
        }, 230);
    }, [diceValue, gameMode, currentUser, currentMatchId, turnSerial, showIntro]);
    const startPieceMoveRef = useRef(startPieceMove);
    useEffect(() => { startPieceMoveRef.current = startPieceMove; }, [startPieceMove]);
    useEffect(() => {
        stateRef.current = {
            currentMatchId, gameMode, winner, turnSerial, actionHistory, isRolling, isAnimatingMove, currentUser, abandonedPlayers,
            executeRollAnimation: (v) => executeRollAnimation(v),
            startPieceMove: (p, r, s) => startPieceMoveRef.current(p, r, s)
        };
    });
    useEffect(() => {
        if (gameMode !== 'online' || !currentMatchId)
            return;
        const handleStorage = (event) => {
            if (event.key && event.key !== MESSAGES_KEY)
                return;
            const state = stateRef.current;
            const msgs = getMessages().filter(m => m.matchId === state.currentMatchId);
            const abandonMsgs = msgs.filter(m => m.text.startsWith('__ABANDON__'));
            if (abandonMsgs.length > 0 && !state.winner) {
                const leavers = abandonMsgs.map(m => m.text.replace('__ABANDON__', ''));
                const newAbandonedIds = [];
                leavers.forEach(leaver => {
                    const p = PLAYERS.find(pl => pl.name === leaver);
                    if (p && !state.abandonedPlayers.includes(p.id)) {
                        newAbandonedIds.push(p.id);
                    }
                });
                if (newAbandonedIds.length > 0) {
                    setAbandonedPlayers(prev => [...new Set([...prev, ...newAbandonedIds])]);
                    setPieces(prev => {
                        const next = JSON.parse(JSON.stringify(prev));
                        newAbandonedIds.forEach(id => {
                            next[id].forEach(token => {
                                token.status = 'yard';
                                token.stepCount = 0;
                            });
                        });
                        return next;
                    });
                    logMsg(`بازیکن ${leavers.join(' و ')} بازی را ترک کرد.`);
                }
            }
            if (!state.winner && !state.isAnimatingMove) {
                const newMsgs = msgs.filter(m => m.text.startsWith('__ACTION__') && !processedMsgIds.current.has(m.id));
                if (newMsgs.length > 0) {
                    newMsgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                    const nextMsg = newMsgs[0];
                    if (nextMsg.senderUsername !== state.currentUser.username) {
                        try {
                            const action = JSON.parse(nextMsg.text.replace('__ACTION__', ''));
                            if (action.turnSerial !== undefined && action.turnSerial !== state.turnSerial) {
                                if (action.turnSerial < state.turnSerial)
                                    processedMsgIds.current.add(nextMsg.id);
                                return;
                            }
                            if (action.type === 'ROLL_SYNC') {
                                state.executeRollAnimation(action.rollValue);
                            }
                            else if (action.type === 'MOVE') {
                                state.startPieceMove(action.pieceId, action.rollValue, true);
                            }
                        }
                        catch (e) { }
                    }
                    processedMsgIds.current.add(nextMsg.id);
                }
            }
            if (state.winner) {
                const recentRematchMsgs = msgs.filter(m => (m.text.startsWith('__REMATCH')) && new Date(m.createdAt).getTime() > Date.now() - 25000);
                const latestRematchMsg = recentRematchMsgs[recentRematchMsgs.length - 1];
                if (latestRematchMsg && latestRematchMsg.senderUsername !== state.currentUser.username) {
                    if (latestRematchMsg.text.startsWith('__REMATCH_REQUEST__') && rematchState === 'idle') {
                        setPendingNextMatchId(latestRematchMsg.text.replace('__REMATCH_REQUEST__', ''));
                        setRematchState('received');
                        setRematchTimeLeft(20);
                    }
                    else if (latestRematchMsg.text.startsWith('__REMATCH_ACCEPTED__') && rematchState === 'requested') {
                        startNewGame(state.currentMatchId + '-R');
                        showToast({ id: 'rematch-result', type: 'success', title: 'درخواست پذیرفته شد', text: `بازی شروع شد!`, duration: 3500 });
                        if (onNavigateToGames)
                            onNavigateToGames();
                    }
                    else if (latestRematchMsg.text === '__REMATCH_DECLINED__' && rematchState === 'requested') {
                        showToast({ id: 'rematch-result', type: 'error', title: 'درخواست رد شد', text: `درخواست بازی مجدد رد شد.`, duration: 5000 });
                        setRematchState('idle');
                        onExit();
                    }
                }
            }
        };
        handleStorage({ key: MESSAGES_KEY });
        window.addEventListener('storage', handleStorage);
        const timer = setInterval(() => handleStorage({ key: MESSAGES_KEY }), 800);
        return () => { window.removeEventListener('storage', handleStorage); clearInterval(timer); };
    }, [currentMatchId, gameMode, winner, isRolling, isAnimatingMove, rematchState, currentUser.username, abandonedPlayers, PLAYERS, executeRollAnimation, logMsg, onNavigateToGames, onExit]);
    useEffect(() => {
        if (rematchState === 'received' || rematchState === 'requested') {
            if (rematchTimeLeft > 0) {
                rematchTimerRef.current = setTimeout(() => setRematchTimeLeft(rematchTimeLeft - 1), 1000);
            }
            else if (rematchTimeLeft === 0) {
                if (rematchState === 'received')
                    declineRematch();
                if (rematchState === 'requested') {
                    showToast({ id: 'rematch-result', type: 'info', title: 'زمان به پایان رسید', text: 'حریف پاسخ نداد.', duration: 5000 });
                    setRematchState('idle');
                    onExit();
                }
            }
        }
        return () => clearTimeout(rematchTimerRef.current);
    }, [rematchState, rematchTimeLeft]);
    useEffect(() => {
        if (abandonedPlayers.length && !winner) {
            const realPlayers = PLAYERS.filter(p => !abandonedPlayers.includes(p.id));
            if (realPlayers.length === 1) {
                setWinner(realPlayers[0].name);
            }
            else if (realPlayers.length === 0) {
                onExit();
            }
            else if (abandonedPlayers.includes(currentTurn)) {
                const timer = setTimeout(() => nextTurnRef.current(false), 500);
                return () => clearTimeout(timer);
            }
        }
    }, [currentTurn, abandonedPlayers, winner, PLAYERS, onExit]);
    const rollDice = () => {
        const realPlayers = PLAYERS.filter(p => !p.isBot && !abandonedPlayers.includes(p.id));
        const amIResponsibleForBots = gameMode === 'online' ? (realPlayers.length > 0 && realPlayers[0].name === currentUser.username) : true;
        const player = PLAYERS[currentTurn];
        const isBotTurn = player && (player.isBot || (gameMode === 'online' && abandonedPlayers.includes(currentTurn)));
        if (showIntro || !deadlineRef.current || Date.now() >= deadlineRef.current)
            return;
        if ((!isMyTurn && !(isBotTurn && amIResponsibleForBots)) || hasRolled || isRolling || isAnimatingMove || winner || abandonedPlayers.includes(currentTurn))
            return;
        const finalRoll = Math.floor(Math.random() * 6) + 1;
        if (gameMode === 'online') {
            sendMessage(currentUser.username, `__ACTION__${JSON.stringify({ type: 'ROLL_SYNC', rollValue: finalRoll, turnSerial })}`, null, currentMatchId);
            window.dispatchEvent(new Event('storage'));
        }
        executeRollAnimation(finalRoll);
    };
    // هوش مصنوعی نوبت ربات
    useEffect(() => {
        if (showIntro || winner || isAnimatingMove || abandonedPlayers.includes(currentTurn))
            return;
        const player = PLAYERS[currentTurn];
        if (!player)
            return;
        const isBotTurn = player.isBot || (gameMode === 'online' && abandonedPlayers.includes(currentTurn));
        const realPlayers = PLAYERS.filter(p => !p.isBot && !abandonedPlayers.includes(p.id));
        const amIResponsibleForBots = gameMode === 'online' ? (realPlayers.length > 0 && realPlayers[0].name === currentUser.username) : true;
        if (isBotTurn && amIResponsibleForBots) {
            if (!hasRolled && !isRolling) {
                const timer = setTimeout(() => rollDice(), 800);
                return () => clearTimeout(timer);
            }
            else if (hasRolled && movablePieceIds.length > 0) {
                const timer = setTimeout(() => {
                    const roll = diceValue;
                    let bestPieceId = movablePieceIds[0];
                    for (let pid of movablePieceIds) {
                        const token = pieces[currentTurn].find(t => t.id === pid);
                        if (token.status === 'active' && token.stepCount + roll < 40) {
                            const targetIdx = (player.startTrackIdx + token.stepCount + roll) % 40;
                            for (let otherPid = 0; otherPid < 4; otherPid++) {
                                if (otherPid === currentTurn)
                                    continue;
                                if (pieces[otherPid].some(e => e.status === 'active' && (PLAYERS[otherPid].startTrackIdx + e.stepCount) % 40 === targetIdx)) {
                                    bestPieceId = pid;
                                    break;
                                }
                            }
                        }
                    }
                    if (roll === 6 && pieces[currentTurn].some(t => t.status === 'yard' && movablePieceIds.includes(t.id))) {
                        const yardToken = pieces[currentTurn].find(t => t.status === 'yard' && movablePieceIds.includes(t.id));
                        if (yardToken)
                            bestPieceId = yardToken.id;
                    }
                    startPieceMoveRef.current(bestPieceId, roll, false);
                }, 700);
                return () => clearTimeout(timer);
            }
        }
        else if (isMyTurn && hasRolled && movablePieceIds.length === 1 && !isAnimatingMove) {
            const timer = setTimeout(() => {
                startPieceMoveRef.current(movablePieceIds[0], diceValue, false);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [showIntro, currentTurn, hasRolled, isRolling, isAnimatingMove, movablePieceIds, diceValue, winner, pieces, abandonedPlayers, gameMode, currentUser.username, isMyTurn]);
    const startNewGame = (newMatchId = null) => {
        if (gameMode === 'online') {
            if (hasFreeRematch) {
                setHasFreeRematch(false);
                setFreeRematchUsed(true);
            }
            else {
                const freshUser = findUser(currentUser.username);
                if (!freshUser || freshUser.coins < ONLINE_ENTRY_FEE)
                    return;
                deductCoins(currentUser.username, ONLINE_ENTRY_FEE);
                if (onUserUpdated)
                    onUserUpdated(findUser(currentUser.username));
            }
        }
        turnGeneration.current += 1;
        deadlineRef.current = 0;
        moveCommitted.current = false;
        setTurnSerial(0);
        setWarnings({});
        setTurnSeconds(40);
        setShowIntro(true);
        if (newMatchId)
            setCurrentMatchId(newMatchId);
        const freshPieces = {};
        for (let p = 0; p < 4; p++) {
            freshPieces[p] = [
                { id: 0, status: 'yard', stepCount: 0 }, { id: 1, status: 'yard', stepCount: 0 },
                { id: 2, status: 'yard', stepCount: 0 }, { id: 3, status: 'yard', stepCount: 0 }
            ];
        }
        setPieces(freshPieces);
        setCurrentTurn(0);
        setDiceValue(null);
        setHasRolled(false);
        setIsRolling(false);
        setIsAnimatingMove(false);
        setMovablePieceIds([]);
        setWinner(null);
        setAbandonedPlayers([]);
        setGameLog(['مسابقه مجدد آغاز شد! نوبت قرمز است.']);
        setIsLogOpen(false);
        setHasNewLog(false);
        setShowIntro(true);
        setActionHistory([]);
        setRematchState('idle');
        resultRecordedRef.current = false;
        processedMsgIds.current.clear();
    };
    const requestRematch = () => {
        if (gameMode === 'bot') {
            startNewGame(`bot-${Date.now()}`);
        }
        else {
            const freshUser = findUser(currentUser.username);
            if (!hasFreeRematch && freshUser.coins < ONLINE_ENTRY_FEE) {
                showToast({ id: 'rematch-err', type: 'error', title: 'موجودی ناکافی', text: `بازی مجدد نیازمند ${ONLINE_ENTRY_FEE} کیوجی است.`, duration: 5000 });
                return;
            }
            const nextMatchId = `rematch-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            setPendingNextMatchId(nextMatchId);
            sendMessage(currentUser.username, `__REMATCH_REQUEST__${nextMatchId}`, null, currentMatchId);
            window.dispatchEvent(new Event('storage'));
            setRematchState('requested');
            setRematchTimeLeft(20);
        }
    };
    const acceptRematch = () => {
        const freshUser = findUser(currentUser.username);
        if (!hasFreeRematch && freshUser.coins < ONLINE_ENTRY_FEE)
            return;
        sendMessage(currentUser.username, `__REMATCH_ACCEPTED__${pendingNextMatchId}`, null, currentMatchId);
        window.dispatchEvent(new Event('storage'));
        startNewGame(pendingNextMatchId);
        if (onNavigateToGames)
            onNavigateToGames();
    };
    const declineRematch = () => {
        sendMessage(currentUser.username, '__REMATCH_DECLINED__', null, currentMatchId);
        window.dispatchEvent(new Event('storage'));
        setRematchState('idle');
        onExit();
    };
    rematchActionsRef.current = { accept: acceptRematch, decline: declineRematch };
    useEffect(() => {
        if (!winner || resultRecordedRef.current)
            return;
        resultRecordedRef.current = true;
        const won = winner === currentUser.username;
        if (gameMode === 'online') {
            if (won)
                playSound('coin', currentUser.settings?.sound);
            if (won && !freeRematchUsed)
                setHasFreeRematch(true);
        }
        onGameFinished(won, 'ludo', gameMode === 'online');
    }, [winner, currentUser.username, onGameFinished, gameMode, freeRematchUsed, currentUser.settings?.sound]);
    const ownerCards = useMemo(() => PLAYERS.map(p => buildVsPlayer(p.isBot ? null : p.name, currentUser, { id: p.id, fallbackName: p.name })), [PLAYERS, currentUser.username, currentUser.avatar]);
    const vsPlayers = [0, 1, 3, 2].map(id => {
        const p = PLAYERS[id];
        const card = ownerCards.find(o => o.id === id);
        return {
            ...card, key: `vs-${id}`, id, hex: p.hex, isBot: p.isBot, isMe: p.name === currentUser.username,
            name: p.isBot ? `ربات ${p.colorName}` : p.name, tag: `مهره‌ی ${p.colorName}`,
            preview: [0, 1, 2, 3].map(t => React.createElement("span", { key: t, className: "block w-6 h-6 sm:w-9 sm:h-9" }, renderLudoToken(p.hex, tokenStyleOf(p), false)))
        };
    });
    const canRoll = isMyTurn && !hasRolled && !isRolling && !isAnimatingMove && !winner && !abandonedPlayers.includes(currentTurn);
    const turnHint = isRolling
        ? 'در حال چرخش تاس... 🎲'
        : isAnimatingMove
            ? 'حرکت مهره روی تخته...'
            : !isMyTurn
                ? `نوبت ${activePlayer.name} است...`
                : !hasRolled
                    ? '👈 برای پرتاب، روی تاس وسط بزنید'
                    : movablePieceIds.length > 0
                        ? 'یکی از مهره‌های درخشان را انتخاب کنید'
                        : 'تاس ریخته شد';
    const squareOccupancy = useMemo(() => {
        const occ = {};
        PLAYERS.forEach(p => {
            pieces[p.id].forEach(t => {
                if ((t.status === 'active' || t.status === 'home') && t.stepCount < 44) {
                    const [r, c] = getPieceBoardCoords(p.id, t);
                    const key = `${r}-${c}`;
                    if (!occ[key])
                        occ[key] = [];
                    occ[key].push({ pId: p.id, tId: t.id });
                }
            });
        });
        return occ;
    }, [pieces, PLAYERS, getPieceBoardCoords]);
    return (React.createElement("div", { className: "w-full max-w-4xl mx-auto flex flex-col items-center gap-3 sm:gap-4 animate-in fade-in relative px-1 sm:px-2" },
        showIntro && React.createElement(VsIntro, { title: "\u0645\u0646\u0686 \u06F4 \u0646\u0641\u0631\u0647", subtitle: gameMode === 'online' ? 'مسابقه‌ی آنلاین' : 'مسابقه‌ی تمرینی', players: vsPlayers, onDone: () => setShowIntro(false) }),
        React.createElement("div", { className: "w-full glass-panel px-3 py-2.5 sm:px-4 sm:py-3 rounded-2xl flex items-center justify-between gap-2 sm:gap-4 border border-slate-700/60 shadow-lg" },
            React.createElement("button", { onClick: handleExitClick, className: "px-3 py-1.5 bg-slate-800 hover:bg-rose-600 hover:border-rose-500 text-white rounded-xl text-xs sm:text-sm font-bold border border-slate-700 flex items-center gap-1.5 transition-all shadow-md active:scale-95 shrink-0" },
                React.createElement(IconArrowLeft, { className: "w-3.5 h-3.5 sm:w-4 sm:h-4" }),
                React.createElement("span", null, winner ? 'فهرست' : 'خروج')),
            React.createElement("div", { className: "text-center min-w-0" },
                React.createElement("h3", { className: "text-xs sm:text-base font-black text-white truncate" }, "\u0645\u0646\u0686 \u06F4 \u0646\u0641\u0631\u0647"),
                gameMode === 'online' && (React.createElement("span", { className: "text-[10px] sm:text-xs font-bold text-amber-300 block" }, "\u062C\u0627\u06CC\u0632\u0647: \u06F1\u06F0\u06F0 \u06A9\u06CC\u0648\u062C\u06CC"))),
            React.createElement("div", { className: "flex items-center gap-1.5 sm:gap-2 bg-slate-900/80 px-2 sm:px-3 py-1.5 rounded-xl border border-slate-700 shrink-0" },
                React.createElement("span", { className: "w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full animate-pulse", style: { backgroundColor: activePlayer.hex } }),
                React.createElement("span", { className: "font-bold text-[11px] sm:text-xs text-white max-w-[85px] sm:max-w-[120px] truncate" }, activePlayer.name),
                findUser(activePlayer?.name)?.equipped?.titles && findUser(activePlayer?.name)?.equipped?.titles !== 'classic' && typeof renderPlayerTitle === 'function' && (React.createElement("div", { className: "-mt-0.5 origin-right transform scale-90" }, renderPlayerTitle(findUser(activePlayer.name).equipped.titles))),
                React.createElement("span", { className: `font-mono font-black text-[10px] sm:text-xs pl-1 border-r border-slate-700 ${turnSeconds <= 10 ? 'text-rose-400 animate-ping' : 'text-emerald-400'}` },
                    turnSeconds,
                    "s"))),
        React.createElement("div", { className: "w-full max-w-[min(96vw,560px)] sm:max-w-[520px] md:max-w-[560px] flex flex-col items-center gap-2.5 mx-auto" },
            React.createElement("div", { className: "relative w-full aspect-square rounded-2xl sm:rounded-3xl p-1.5 sm:p-3 select-none overflow-hidden transition-shadow duration-500", dir: "ltr", style: {
                    background: 'linear-gradient(145deg,#4e3620,#23160c 55%,#3a2717)',
                    boxShadow: `0 20px 45px rgba(0,0,0,.7), 0 0 35px ${activePlayer.hex}33, inset 0 0 0 2px rgba(251,191,36,.3), inset 0 2px 6px rgba(255,255,255,.14)`
                } },
                React.createElement("div", { className: "w-full h-full relative z-0 rounded-xl overflow-hidden", style: { background: 'radial-gradient(circle at 50% 45%, #26354d 0%, #141c2b 72%, #0d1320 100%)', boxShadow: 'inset 0 0 24px rgba(0,0,0,.75), 0 0 0 1px rgba(255,255,255,.07)' } },
                    PLAYERS.map(p => {
                        const [r0, c0] = LUDO_YARD_ORIGIN[p.id];
                        const active = currentTurn === p.id && !winner;
                        return (React.createElement("div", { key: `yard-${p.id}`, className: "absolute", style: ludoBox(r0, c0, 4, 4) },
                            React.createElement("div", { className: `absolute inset-[3%] rounded-2xl ${active ? 'gq-yard-active' : ''}`, style: { '--glow': p.hex, background: `linear-gradient(145deg, ${p.hex}66, ${p.hex}1f)`, border: `1.5px solid ${p.hex}99`, boxShadow: 'inset 0 2px 8px rgba(255,255,255,.14), inset 0 -6px 12px rgba(0,0,0,.35)' } })));
                    }),
                    PLAYERS.map(p => {
                        const [r0, c0] = LUDO_YARD_ORIGIN[p.id];
                        const owner = ownerCards.find(o => o.id === p.id);
                        const active = currentTurn === p.id && !winner;
                        return (React.createElement("div", { key: `plate-${p.id}`, className: "absolute flex items-center justify-center pointer-events-none", style: ludoBox(p.id <= 1 ? r0 : r0 + 3, c0, 4, 1) },
                            React.createElement("div", { "data-gq-player": p.name, className: `flex items-center gap-1 max-w-[94%] rounded-full pl-2 pr-0.5 py-0.5 ${active ? 'gq-plate-active' : ''}`, style: { '--glow': p.hex, background: 'rgba(8,12,22,.75)', border: `1.5px solid ${p.hex}${active ? '' : '88'}` } },
                                React.createElement("span", { className: "relative w-4 h-4 sm:w-6 sm:h-6 rounded-full shrink-0 flex items-center justify-center text-[8px] sm:text-xs bg-slate-700", style: { border: `1.5px solid ${p.hex}` } },
                                    React.createElement("div", { className: "absolute inset-0 rounded-[inherit] overflow-hidden flex items-center justify-center" }, owner && owner.avatar ? React.createElement("img", { src: owner.avatar, alt: "", draggable: false, className: "w-full h-full object-cover" }) : (p.isBot ? '🤖' : '👤')),
                                    owner?.account?.equipped?.frames && renderAvatarFrame(owner.account.equipped.frames)),
                                React.createElement("div", { className: "flex flex-col min-w-0" },
                                    React.createElement("span", { className: "text-[8px] sm:text-[11px] font-black text-white truncate leading-none" },
                                        p.isBot ? p.colorName : p.name,
                                        p.name === currentUser.username ? ' (شما)' : ''),
                                    findUser(p.name)?.equipped?.titles && findUser(p.name)?.equipped?.titles !== 'classic' && typeof renderPlayerTitle === 'function' && (React.createElement("div", { className: "-mt-0.5 origin-right transform scale-90" }, renderPlayerTitle(findUser(p.name).equipped.titles)))))));
                    }),
                    LUDO_TRACK.map(([r, c], i) => {
                        const startOwner = PLAYERS.find(p => p.startTrackIdx === i);
                        const bg = startOwner
                            ? `linear-gradient(145deg, ${startOwner.hex}, color-mix(in srgb, ${startOwner.hex} 62%, #000))`
                            : 'linear-gradient(145deg,#a2adc4,#828eaa)';
                        return (React.createElement("div", { key: `track-${i}`, className: "absolute", style: ludoBox(r, c) },
                            React.createElement("div", { className: "absolute inset-[6%] rounded-md sm:rounded-lg flex items-center justify-center", style: { background: bg, boxShadow: '0 1px 2px rgba(0,0,0,.55), inset 0 -2px 0 rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.28)' } }, startOwner && React.createElement("span", { className: "text-white text-[9px] sm:text-xs font-black", style: { textShadow: '0 1px 2px rgba(0,0,0,.7)' } }, "\u2605"))));
                    }),
                    PLAYERS.map(p => LUDO_HOME_LANES[p.id].slice(0, 4).map(([r, c], i) => (React.createElement("div", { key: `lane-${p.id}-${i}`, className: "absolute", style: ludoBox(r, c) },
                        React.createElement("div", { className: "absolute inset-[6%] rounded-md sm:rounded-lg flex items-center justify-center", style: { background: `linear-gradient(145deg, ${p.hex}, color-mix(in srgb, ${p.hex} 62%, #000))`, boxShadow: '0 1px 2px rgba(0,0,0,.55), inset 0 -2px 0 rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.4)' } },
                            React.createElement("span", { className: "block w-[26%] h-[26%] rounded-full bg-white/70" })))))),
                    React.createElement("div", { className: "absolute flex items-center justify-center", style: { ...ludoBox(4.75, 4.75, 1.5, 1.5), zIndex: isRolling ? 80 : 30 } },
                        React.createElement("button", { type: "button", "aria-label": "\u067E\u0631\u062A\u0627\u0628 \u062A\u0627\u0633", disabled: !canRoll, onClick: rollDice, className: `relative w-full h-full flex items-center justify-center ${canRoll ? 'cursor-pointer active:scale-95' : 'cursor-default'}` },
                            React.createElement("div", { className: `block w-[76%] h-[76%] relative ${canRoll ? 'gq-dice-ready' : ''}`, style: {
                                    transform: diceTransform || 'none',
                                    transition: diceHome ? 'transform .45s cubic-bezier(.34,1.56,.64,1)' : 'transform .085s ease-in-out',
                                    filter: isRolling ? 'drop-shadow(0 16px 12px rgba(0,0,0,.5))' : 'drop-shadow(0 6px 6px rgba(0,0,0,.4))'
                                } }, renderCustomDice(diceValue, diceStyleOf(activePlayer))))),
                    PLAYERS.map(player => pieces[player.id].map(token => {
                        const isFinished = token.status === 'finished' || token.stepCount >= 44;
                        const [pr, pc] = getPieceBoardCoords(player.id, token);
                        const isMovable = isMyTurn && currentTurn === player.id && movablePieceIds.includes(token.id) && !isAnimatingMove;
                        let tx = 0, ty = 0;
                        let scale = token.status === 'yard' ? 0.92 : 1;
                        if (isFinished) {
                            scale = 0.64;
                        }
                        else if (token.status === 'active' || token.status === 'home') {
                            const occupants = squareOccupancy[`${pr}-${pc}`] || [];
                            if (occupants.length > 1) {
                                const idx = Math.max(0, occupants.findIndex(o => o.pId === player.id && o.tId === token.id));
                                const MULTI_OFFSETS = [{ x: -24, y: -24 }, { x: 24, y: -24 }, { x: -24, y: 24 }, { x: 24, y: 24 }];
                                tx = (MULTI_OFFSETS[idx] || { x: 0 }).x;
                                ty = (MULTI_OFFSETS[idx] || { y: 0 }).y;
                                scale = 0.62;
                            }
                        }
                        const longTravel = token.status === 'yard' || isFinished || (token.status === 'active' && token.stepCount === 0);
                        const travel = longTravel ? '0.55s cubic-bezier(.45,.05,.2,1)' : '0.2s linear';
                        return (React.createElement("button", { key: `${player.id}-${token.id}`, disabled: !isMovable, onClick: (e) => {
                                e.stopPropagation();
                                startPieceMoveRef.current(token.id);
                            }, style: {
                                ...ludoBox(pr, pc),
                                transform: `translate(${tx}%, ${ty}%) scale(${scale})`,
                                transition: `top ${travel}, left ${travel}, transform .25s ease`,
                                zIndex: 40 + (token.status === 'active' ? 1 : 0) + (isMovable ? 2 : 0)
                            }, className: `absolute flex items-center justify-center p-0 ${isMovable ? 'cursor-pointer' : 'pointer-events-none'}` },
                            React.createElement("div", { key: `${token.status}-${token.stepCount}`, className: "gq-land relative w-[80%] h-[80%] flex items-center justify-center" },
                                renderLudoToken(player.hex, tokenStyleOf(player), isMovable),
                                isFinished && (React.createElement("span", { className: "absolute inset-0 flex items-center justify-center text-white text-[9px] sm:text-xs font-black pointer-events-none", style: { textShadow: '0 1px 3px rgba(0,0,0,.9)' } }, "\u2713")))));
                    })),
                    winner && (React.createElement("div", { dir: "rtl", className: "absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 sm:p-6 text-center animate-in zoom-in" },
                        React.createElement(IconTrophy, { className: "w-16 h-16 sm:w-20 sm:h-20 text-yellow-400 mb-3 animate-bounce-slight" }),
                        React.createElement("h3", { className: "text-2xl sm:text-3xl font-black text-white mb-2" },
                            winner,
                            " \u0628\u0631\u0646\u062F\u0647 \u0634\u062F!"),
                        winner === currentUser.username && gameMode === 'online' && (React.createElement("div", { className: "flex items-center gap-2 p-2.5 bg-amber-500/20 border border-amber-400/50 rounded-2xl text-amber-300 font-black text-xs sm:text-sm mb-3 animate-pulse" },
                            React.createElement(IconCoin, { className: "w-5 h-5" }),
                            React.createElement("span", null, "+ \u06F1\u06F0\u06F0 \u06A9\u06CC\u0648\u062C\u06CC \u067E\u0627\u062F\u0627\u0634 \u0642\u0647\u0631\u0645\u0627\u0646\u06CC \u0628\u0647 \u062D\u0633\u0627\u0628\u062A\u0627\u0646 \u0627\u0641\u0632\u0648\u062F\u0647 \u0634\u062F!"))),
                        React.createElement("div", { className: "mt-3 flex flex-col gap-2 w-full max-w-[240px]" },
                            gameMode === 'bot' ? (React.createElement("button", { onClick: () => startNewGame(`bot-${Date.now()}`), className: "w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-transform text-xs sm:text-sm" }, "\u0628\u0627\u0632\u06CC \u062F\u0648\u0628\u0627\u0631\u0647")) : (React.createElement("button", { onClick: requestRematch, disabled: rematchState !== 'idle', className: "w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 active:scale-95 transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5" },
                                React.createElement(IconGamepad, { className: "w-4 h-4" }),
                                hasFreeRematch ? 'بازی مجدد (رایگان)' : 'بازی مجدد (۲۵ کیوجی)')),
                            React.createElement("button", { onClick: onExit, className: "w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-all" }, "\u0628\u0627\u0632\u06AF\u0634\u062A \u0628\u0647 \u0641\u0647\u0631\u0633\u062A")))))),
            React.createElement("div", { className: "w-full glass-panel px-3.5 py-2 rounded-2xl text-center text-xs sm:text-sm font-bold text-white border border-slate-700/60 shadow-md" },
                turnHint,
                diceValue === 6 && !isRolling && (React.createElement("span", { className: "block text-emerald-400 text-[10px] sm:text-xs mt-0.5 animate-pulse" }, "\u2605 \u062A\u0627\u0633 \u06F6! \u0627\u0645\u06A9\u0627\u0646 \u062E\u0631\u0648\u062C \u0645\u0647\u0631\u0647 \u0648 \u067E\u0631\u062A\u0627\u0628 \u0645\u062C\u062F\u062F \u2605"))),
            React.createElement("div", { className: "w-full flex items-center justify-center gap-3 mt-0.5" },
                React.createElement("button", { onClick: () => { setIsLogOpen(true); setHasNewLog(false); }, className: "game-action flex-1 py-2.5 px-4 bg-slate-900/85 hover:bg-slate-800 text-slate-200 hover:text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-700/80 shadow-lg relative transition-all active:scale-95" },
                    React.createElement("span", null, "\uD83D\uDCDC"),
                    React.createElement("span", null, "\u06AF\u0632\u0627\u0631\u0634 \u0632\u0646\u062F\u0647 \u0628\u0627\u0632\u06CC"),
                    hasNewLog && (React.createElement("span", { className: "absolute top-2 left-2 flex h-2.5 w-2.5" },
                        React.createElement("span", { className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80" }),
                        React.createElement("span", { className: "relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" })))))),
        isLogOpen && (React.createElement("div", { className: "fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200", onClick: () => setIsLogOpen(false) },
            React.createElement("div", { className: "w-full max-w-md glass-panel bg-slate-900/95 border border-amber-500/40 rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col", onClick: e => e.stopPropagation(), dir: "rtl" },
                React.createElement("div", { className: "flex items-center justify-between border-b border-slate-700/60 pb-3" },
                    React.createElement("div", { className: "flex items-center gap-2" },
                        React.createElement("span", { className: "text-xl" }, "\uD83D\uDCDC"),
                        React.createElement("h4", { className: "font-black text-white text-sm sm:text-base" }, "\u06AF\u0632\u0627\u0631\u0634 \u0632\u0646\u062F\u0647 \u0645\u0633\u0627\u0628\u0642\u0647"),
                        React.createElement("span", { className: "text-[10px] font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30" },
                            gameLog.length,
                            " \u0631\u0648\u06CC\u062F\u0627\u062F")),
                    React.createElement("button", { onClick: () => setIsLogOpen(false), className: "w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-colors" }, "\u2715")),
                React.createElement("div", { className: "flex-1 overflow-y-auto space-y-2 custom-scrollbar p-1 text-xs" }, gameLog.map((log, index) => {
                    const isWin = log.includes('برنده') || log.includes('🏆');
                    const isCapture = log.includes('زد و برگرداند') || log.includes('💥');
                    const isSix = log.includes('تاس ۶');
                    const isWarning = log.includes('اخطار') || log.includes('حذف');
                    return (React.createElement("div", { key: index, className: `p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${isWin ? 'bg-amber-500/20 border-amber-400/60 text-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.2)]' :
                            isCapture ? 'bg-rose-500/15 border-rose-500/40 text-rose-200' :
                                isSix ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200' :
                                    isWarning ? 'bg-red-500/20 border-red-500/40 text-red-300' :
                                        'bg-slate-900/80 border-slate-800 text-slate-300'}` },
                        React.createElement("span", { className: "text-sm shrink-0 mt-0.5" }, isWin ? '🏆' : isCapture ? '💥' : isSix ? '⭐' : isWarning ? '⚠️' : '🎲'),
                        React.createElement("span", { className: "leading-relaxed flex-1 font-medium" }, log)));
                })),
                React.createElement("button", { onClick: () => setIsLogOpen(false), className: "w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-700" }, "\u0628\u0633\u062A\u0646 \u06AF\u0632\u0627\u0631\u0634")))),
        React.createElement(InGameChatDrawer, { currentUser: currentUser, matchId: currentMatchId, peerName: peerName, onOpenProfile: onOpenProfile }),
        React.createElement(ReactionTray, { matchId: currentMatchId, currentUser: currentUser, onUserUpdated: onUserUpdated, hidden: showIntro, targets: PLAYERS.filter(p => p.name !== currentUser.username && !abandonedPlayers.includes(p.id)).map(p => ({ name: p.name, label: p.isBot ? `${p.colorName} (ربات)` : p.name, isBot: p.isBot, hex: p.hex })) }),
        showExitConfirm && (React.createElement("div", { dir: "rtl", className: "fixed inset-0 z-[130] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4" },
            React.createElement("div", { className: "w-full max-w-sm glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl text-center animate-in zoom-in border border-rose-500/30" },
                React.createElement(IconLogout, { className: "w-12 h-12 text-rose-500 mx-auto mb-3" }),
                React.createElement("h3", { className: "text-lg sm:text-xl font-black text-white mb-2" }, "\u062E\u0631\u0648\u062C \u0627\u0632 \u0628\u0627\u0632\u06CC\u061F"),
                React.createElement("p", { className: "text-slate-300 text-xs sm:text-sm leading-5 mb-5" }, "\u062F\u0631 \u0635\u0648\u0631\u062A \u062E\u0631\u0648\u062C\u060C \u0646\u0648\u0628\u062A \u0648 \u0645\u0647\u0631\u0647\u200C\u0647\u0627\u06CC \u0634\u0645\u0627 \u0627\u0632 \u0628\u0627\u0632\u06CC \u062D\u0630\u0641 \u062E\u0648\u0627\u0647\u0646\u062F \u0634\u062F."),
                React.createElement("div", { className: "flex gap-2 sm:gap-3" },
                    React.createElement("button", { onClick: () => setShowExitConfirm(false), className: "flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs sm:text-sm font-bold" }, "\u0627\u0646\u0635\u0631\u0627\u0641"),
                    React.createElement("button", { onClick: confirmExit, className: "flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-rose-600/20" }, "\u0628\u0644\u0647\u060C \u062E\u0631\u0648\u062C")))))));
};

/* ===== games/ChessGame.jsx ===== */
// ---------- بازی شطرنج استاندارد بین‌المللی با انیمیشن فوق‌العاده روان و اعلام برندگی باشکوه ----------
const initialChessBoard = [
    ['br', 'bn', 'bb', 'bq', 'bk', 'bb', 'bn', 'br'],
    ['bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp'],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ['wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp'],
    ['wr', 'wn', 'wb', 'wq', 'wk', 'wb', 'wn', 'wr'],
];
const CHESS_SYMBOLS = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const CHESS_PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const CHESS_INITIAL_COUNTS = { p: 8, r: 2, n: 2, b: 2, q: 1 };
const CHESS_PIECE_NAMES = { p: 'پیاده', n: 'اسب', b: 'فیل', r: 'رخ', q: 'وزیر', k: 'شاه' };
const VICTORY_CONFETTI = [
    { top: '8%', left: '12%', color: '#fbbf24', delay: '0s', size: 'w-2 h-2 rounded-sm' },
    { top: '14%', left: '26%', color: '#f43f5e', delay: '0.15s', size: 'w-2.5 h-1.5 rounded-full' },
    { top: '6%', left: '48%', color: '#818cf8', delay: '0.3s', size: 'w-2 h-2 rounded-full' },
    { top: '10%', left: '72%', color: '#34d399', delay: '0.08s', size: 'w-2 h-3 rounded-sm' },
    { top: '12%', left: '86%', color: '#38bdf8', delay: '0.22s', size: 'w-1.5 h-2.5 rounded-sm' },
    { top: '22%', left: '8%', color: '#a855f7', delay: '0.35s', size: 'w-2 h-2 rounded-full' },
    { top: '25%', left: '20%', color: '#fbbf24', delay: '0.42s', size: 'w-3 h-1.5 rounded-sm' },
    { top: '20%', left: '80%', color: '#f43f5e', delay: '0.18s', size: 'w-2 h-2 rounded-full' },
    { top: '32%', left: '14%', color: '#38bdf8', delay: '0.5s', size: 'w-2 h-2 rounded-sm' },
    { top: '35%', left: '84%', color: '#fbbf24', delay: '0.38s', size: 'w-2 h-2 rounded-full' },
    { top: '44%', left: '22%', color: '#f43f5e', delay: '0.25s', size: 'w-1.5 h-3 rounded-sm' },
    { top: '46%', left: '74%', color: '#818cf8', delay: '0.45s', size: 'w-2.5 h-2.5 rounded-full' },
];
const getChessPieceSymbol = (pieceStr) => {
    if (!pieceStr)
        return null;
    const color = pieceStr[0];
    const type = pieceStr[1];
    return (React.createElement("span", { className: `piece-anim drop-shadow-md cursor-pointer block select-none ${color === 'w' ? 'text-white' : 'text-slate-900'}` }, CHESS_SYMBOLS[type]));
};
const getCapturedPieces = (board) => {
    const currentCounts = {
        w: { p: 0, r: 0, n: 0, b: 0, q: 0 },
        b: { p: 0, r: 0, n: 0, b: 0, q: 0 }
    };
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece) {
                const color = piece[0];
                const type = piece[1];
                if (type !== 'k') {
                    currentCounts[color][type] = (currentCounts[color][type] || 0) + 1;
                }
            }
        }
    }
    const computeLost = (color) => {
        const cur = currentCounts[color];
        let extraPromotions = 0;
        const lost = [];
        ['q', 'r', 'b', 'n'].forEach(type => {
            const initial = CHESS_INITIAL_COUNTS[type];
            if (cur[type] > initial) {
                extraPromotions += (cur[type] - initial);
            }
            else if (cur[type] < initial) {
                for (let i = 0; i < initial - cur[type]; i++) {
                    lost.push(type);
                }
            }
        });
        const lostPawns = Math.max(0, CHESS_INITIAL_COUNTS.p - cur.p - extraPromotions);
        for (let i = 0; i < lostPawns; i++) {
            lost.push('p');
        }
        lost.sort((a, b) => CHESS_PIECE_VALUES[b] - CHESS_PIECE_VALUES[a]);
        return lost;
    };
    const lostWhite = computeLost('w');
    const lostBlack = computeLost('b');
    const whitePoints = lostBlack.reduce((sum, t) => sum + CHESS_PIECE_VALUES[t], 0);
    const blackPoints = lostWhite.reduce((sum, t) => sum + CHESS_PIECE_VALUES[t], 0);
    return {
        capturedByWhite: lostBlack.map(t => 'b' + t),
        capturedByBlack: lostWhite.map(t => 'w' + t),
        whiteAdvantage: whitePoints > blackPoints ? whitePoints - blackPoints : 0,
        blackAdvantage: blackPoints > whitePoints ? blackPoints - whitePoints : 0
    };
};
const groupCapturedPieces = (pieceList) => {
    const counts = {};
    pieceList.forEach(p => {
        const type = p[1];
        counts[type] = (counts[type] || 0) + 1;
    });
    const order = ['q', 'r', 'b', 'n', 'p'];
    return order.filter(t => counts[t]).map(t => ({
        type: t,
        count: counts[t],
        pieceStr: (pieceList[0] ? pieceList[0][0] : 'b') + t
    }));
};
const findKing = (board, color) => {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === `${color}k`)
                return [r, c];
        }
    }
    return null;
};
const isSquareAttacked = (r, c, attackerColor, board) => {
    const pawnDir = attackerColor === 'w' ? -1 : 1;
    const pawnFromR = r - pawnDir;
    if (pawnFromR >= 0 && pawnFromR < 8) {
        if (c - 1 >= 0 && board[pawnFromR][c - 1] === `${attackerColor}p`)
            return true;
        if (c + 1 < 8 && board[pawnFromR][c + 1] === `${attackerColor}p`)
            return true;
    }
    const knightOffsets = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
    for (const [dr, dc] of knightOffsets) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === `${attackerColor}n`)
            return true;
    }
    const straightDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of straightDirs) {
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const p = board[nr][nc];
            if (p) {
                if (p === `${attackerColor}r` || p === `${attackerColor}q`)
                    return true;
                break;
            }
            nr += dr;
            nc += dc;
        }
    }
    const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of diagDirs) {
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const p = board[nr][nc];
            if (p) {
                if (p === `${attackerColor}b` || p === `${attackerColor}q`)
                    return true;
                break;
            }
            nr += dr;
            nc += dc;
        }
    }
    const kingDirs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of kingDirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === `${attackerColor}k`)
            return true;
    }
    return false;
};
const isKingInCheck = (board, color) => {
    const kingPos = findKing(board, color);
    if (!kingPos)
        return false;
    const opponent = color === 'w' ? 'b' : 'w';
    return isSquareAttacked(kingPos[0], kingPos[1], opponent, board);
};
const getPseudoLegalMoves = (r, c, board, enPassantTarget, castlingRights) => {
    const piece = board[r][c];
    if (!piece)
        return [];
    const color = piece[0];
    const type = piece[1];
    const moves = [];
    const addMove = (nr, nc, isSpecial = {}) => {
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const target = board[nr][nc];
            if (!target) {
                moves.push({ r: nr, c: nc, capture: false, ...isSpecial });
                return true;
            }
            else if (target[0] !== color) {
                moves.push({ r: nr, c: nc, capture: true, ...isSpecial });
                return false;
            }
        }
        return false;
    };
    if (type === 'p') {
        const dir = color === 'w' ? -1 : 1;
        const startRow = color === 'w' ? 6 : 1;
        const promoRow = color === 'w' ? 0 : 7;
        if (r + dir >= 0 && r + dir < 8 && !board[r + dir][c]) {
            const isPromo = r + dir === promoRow;
            moves.push({ r: r + dir, c, capture: false, promotion: isPromo });
            if (r === startRow && !board[r + 2 * dir][c]) {
                moves.push({ r: r + 2 * dir, c, capture: false, doubleStep: true });
            }
        }
        [-1, 1].forEach(dc => {
            const nc = c + dc;
            if (nc >= 0 && nc < 8 && r + dir >= 0 && r + dir < 8) {
                const target = board[r + dir][nc];
                if (target && target[0] !== color) {
                    moves.push({ r: r + dir, c: nc, capture: true, promotion: r + dir === promoRow });
                }
                if (enPassantTarget && enPassantTarget.r === r + dir && enPassantTarget.c === nc) {
                    moves.push({ r: r + dir, c: nc, capture: true, enPassant: true });
                }
            }
        });
    }
    else if (type === 'n') {
        const offsets = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
        offsets.forEach(([dr, dc]) => addMove(r + dr, c + dc));
    }
    else if (type === 'b' || type === 'r' || type === 'q') {
        const dirs = type === 'b'
            ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
            : type === 'r'
                ? [[-1, 0], [1, 0], [0, -1], [0, 1]]
                : [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
        dirs.forEach(([dr, dc]) => {
            let nr = r + dr;
            let nc = c + dc;
            while (addMove(nr, nc)) {
                nr += dr;
                nc += dc;
            }
        });
    }
    else if (type === 'k') {
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
        dirs.forEach(([dr, dc]) => addMove(r + dr, c + dc));
        const opponent = color === 'w' ? 'b' : 'w';
        const baseRow = color === 'w' ? 7 : 0;
        if (r === baseRow && c === 4 && !isKingInCheck(board, color)) {
            if (castlingRights[color].k && !board[baseRow][5] && !board[baseRow][6] && board[baseRow][7] === `${color}r`) {
                if (!isSquareAttacked(baseRow, 5, opponent, board) && !isSquareAttacked(baseRow, 6, opponent, board)) {
                    moves.push({ r: baseRow, c: 6, capture: false, castle: 'k' });
                }
            }
            if (castlingRights[color].q && !board[baseRow][3] && !board[baseRow][2] && !board[baseRow][1] && board[baseRow][0] === `${color}r`) {
                if (!isSquareAttacked(baseRow, 3, opponent, board) && !isSquareAttacked(baseRow, 2, opponent, board)) {
                    moves.push({ r: baseRow, c: 2, capture: false, castle: 'q' });
                }
            }
        }
    }
    return moves;
};
const applyMoveOnBoard = (board, fromR, fromC, move) => {
    const newBoard = board.map(row => [...row]);
    const piece = newBoard[fromR][fromC];
    newBoard[fromR][fromC] = null;
    if (move.enPassant) {
        const pawnDir = piece[0] === 'w' ? 1 : -1;
        newBoard[move.r + pawnDir][move.c] = null;
    }
    else if (move.castle === 'k') {
        newBoard[fromR][5] = newBoard[fromR][7];
        newBoard[fromR][7] = null;
    }
    else if (move.castle === 'q') {
        newBoard[fromR][3] = newBoard[fromR][0];
        newBoard[fromR][0] = null;
    }
    newBoard[move.r][move.c] = move.promotion ? `${piece[0]}q` : piece;
    return newBoard;
};
const getLegalMoves = (r, c, board, enPassantTarget, castlingRights) => {
    const piece = board[r][c];
    if (!piece)
        return [];
    const color = piece[0];
    const pseudo = getPseudoLegalMoves(r, c, board, enPassantTarget, castlingRights);
    return pseudo.filter(m => {
        const nextBoard = applyMoveOnBoard(board, r, c, m);
        return !isKingInCheck(nextBoard, color);
    });
};
const hasAnyLegalMoves = (board, color, enPassantTarget, castlingRights) => {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] && board[r][c][0] === color) {
                const legals = getLegalMoves(r, c, board, enPassantTarget, castlingRights);
                if (legals.length > 0)
                    return true;
            }
        }
    }
    return false;
};
const ChessGame = ({ currentUser, matchType, onExit, onGameFinished, matchId, matchParticipants, onOpenProfile, setIsInGame, onUserUpdated, onNavigateToGames }) => {
    const isBlackPlayer = matchType === 'online' && matchParticipants && matchParticipants[0] !== currentUser.username;
    const myColor = isBlackPlayer ? 'b' : 'w';
    const peerName = matchParticipants ? (isBlackPlayer ? matchParticipants[0] : matchParticipants[1]) : 'حریف هوش مصنوعی';
    const whiteName = matchType === 'online' && matchParticipants ? matchParticipants[0] : currentUser.username;
    const blackName = matchType === 'online' && matchParticipants ? matchParticipants[1] : null;
    const pieceStyles = useEquippedStyles([whiteName, blackName], currentUser);
    const pieceStyleOf = (color) => {
        const owner = color === 'w' ? whiteName : blackName;
        return (owner && pieceStyles[owner] && pieceStyles[owner].chess) || 'classic';
    };
    const [showIntro, setShowIntro] = useState(true);
    const [board, setBoard] = useState(initialChessBoard);
    const [turn, setTurn] = useState('w');
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [possibleMoves, setPossibleMoves] = useState([]);
    const [moveHistory, setMoveHistory] = useState([]);
    const [lastMove, setLastMove] = useState(null);
    const [winner, setWinner] = useState(null);
    const [isStalemate, setIsStalemate] = useState(false);
    const [castlingRights, setCastlingRights] = useState({ w: { k: true, q: true }, b: { k: true, q: true } });
    const [enPassantTarget, setEnPassantTarget] = useState(null);
    const [pendingPromotion, setPendingPromotion] = useState(null);
    const capturedData = useMemo(() => getCapturedPieces(board), [board]);
    const isMyVictory = useMemo(() => {
        if (!winner)
            return false;
        return (typeof winner === 'string' && winner.includes('شما')) ||
            (winner === 'سفید' && myColor === 'w') ||
            (winner === 'سیاه' && myColor === 'b');
    }, [winner, myColor]);
    const isDraw = useMemo(() => !!isStalemate && !winner, [isStalemate, winner]);
    const sides = ['w', 'b'].map(color => {
        const name = color === 'w' ? whiteName : blackName;
        const isBotSide = !name;
        return buildVsPlayer(name, currentUser, {
            key: `vs-${color}`, color, fallbackName: 'حریف هوش مصنوعی', isBot: isBotSide,
            hex: color === 'w' ? '#e2e8f0' : '#6366f1', tag: color === 'w' ? 'مهره‌های سفید' : 'مهره‌های سیاه',
            preview: ['k', 'q', 'r', 'n'].map(t => (React.createElement("span", { key: t, className: `flex items-center justify-center w-7 h-7 sm:w-10 sm:h-10 rounded-md text-xl sm:text-3xl ${color === 'w' ? 'bg-slate-600' : 'bg-slate-300'}` }, renderChessPiece(color + t, pieceStyleOf(color)))))
        });
    });
    const playerBar = (side, isTurn) => {
        const capturedList = side.color === 'w' ? capturedData.capturedByWhite : capturedData.capturedByBlack;
        const advantage = side.color === 'w' ? capturedData.whiteAdvantage : capturedData.blackAdvantage;
        const grouped = groupCapturedPieces(capturedList);
        return (React.createElement("div", { className: `w-full max-w-[500px] flex flex-col gap-2 p-2.5 sm:px-3.5 sm:py-2.5 rounded-2xl border transition-all duration-300 ${isTurn ? 'bg-indigo-500/15 border-indigo-400/70 gq-plate-active' : 'bg-slate-900/70 border-slate-700/60'}`, style: { '--glow': '#6366f1' } },
            React.createElement("div", { className: "flex items-center gap-2.5 sm:gap-3" },
                React.createElement("span", { "data-gq-player": side.name, className: "relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl shrink-0 flex items-center justify-center text-xl border-2", style: { borderColor: side.color === 'w' ? '#e2e8f0' : '#6366f1' } },
                    React.createElement("div", { className: "absolute inset-0 rounded-[inherit] overflow-hidden bg-slate-700 flex items-center justify-center" }, side.avatar ? React.createElement("img", { src: side.avatar, alt: "", draggable: false, className: "w-full h-full object-cover" }) : (side.isBot ? '🤖' : '👤')),
                    side.account?.equipped?.frames && renderAvatarFrame(side.account.equipped.frames)),
                React.createElement("div", { className: "min-w-0 flex-1" },
                    React.createElement("div", { className: "flex items-center gap-1.5" },
                        React.createElement("span", { className: "font-black text-white text-xs sm:text-sm truncate" },
                            side.name,
                            side.isMe ? ' (شما)' : ''),
                        isTurn && React.createElement("span", { className: "text-[9px] sm:text-[10px] font-black text-indigo-300 bg-indigo-500/25 border border-indigo-400/40 px-1.5 py-0.5 rounded-full animate-pulse shrink-0" }, "\u0646\u0648\u0628\u062A")),
                    side.account?.equipped?.titles && side.account.equipped.titles !== 'classic' ? (React.createElement("div", { className: "-mt-0.5 origin-right transform scale-90 text-right" }, renderPlayerTitle(side.account.equipped.titles))) : (React.createElement("div", { className: "text-[10px] sm:text-xs text-slate-400 mt-0.5" }, side.tag))),
                React.createElement("span", { className: `w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-xl sm:text-2xl shrink-0 ${side.color === 'w' ? 'bg-slate-600' : 'bg-slate-300'}` }, renderChessPiece(side.color + 'k', pieceStyleOf(side.color))),
                React.createElement("span", { dir: "ltr", className: "gq-clock " + (clockValues[side.color] < 60000 ? "gq-clock-low" : ""), "aria-label": "\u0632\u0645\u0627\u0646 \u0628\u0627\u0642\u06CC\u200C\u0645\u0627\u0646\u062F\u0647" }, formatGameTime(clockValues[side.color]))),
            React.createElement("div", { className: "flex items-center justify-between gap-2 pt-1.5 border-t border-slate-800/80 px-0.5" },
                React.createElement("div", { className: "flex items-center gap-1.5 flex-wrap min-w-0" },
                    React.createElement("span", { className: "text-[10px] text-slate-400 font-bold shrink-0" }, "\u063A\u0646\u06CC\u0645\u062A\u200C\u0647\u0627:"),
                    grouped.length > 0 ? (grouped.map(item => (React.createElement("div", { key: item.type, className: `flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-xs font-bold shadow-sm border transition-transform hover:scale-110 ${item.pieceStr[0] === 'b' ? 'bg-slate-200 text-slate-900 border-slate-300' : 'bg-slate-800 text-white border-slate-700'}`, title: `${CHESS_PIECE_NAMES[item.type]} (گرفته‌شده)` },
                        React.createElement("span", { className: "text-sm sm:text-base leading-none flex items-center justify-center" }, CHESS_SYMBOLS[item.type]),
                        item.count > 1 && (React.createElement("span", { className: `text-[10px] font-black leading-none ${item.pieceStr[0] === 'b' ? 'text-slate-800' : 'text-indigo-300'}` },
                            "\u00D7",
                            item.count)))))) : (React.createElement("span", { className: "text-[10px] text-slate-500 font-medium" }, "\u2014"))),
                advantage > 0 && (React.createElement("span", { className: "font-mono font-black text-[10px] sm:text-xs text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-lg shadow-sm shrink-0 animate-in fade-in" },
                    "+",
                    advantage)))));
    };
    const topSide = sides.find(s => s.color !== myColor);
    const bottomSide = sides.find(s => s.color === myColor);
    const boardRef = useRef(board);
    const botTimerRef = useRef(null);
    useEffect(() => { boardRef.current = board; }, [board]);
    useEffect(() => () => { if (botTimerRef.current)
        clearTimeout(botTimerRef.current); }, []);
    const [hasFreeRematch, setHasFreeRematch] = useState(false);
    const [freeRematchUsed, setFreeRematchUsed] = useState(false);
    const [rematchState, setRematchState] = useState('idle');
    const rematchActionsRef = useRef({});
    const rematchNotice = (msg) => {
        if (msg)
            showToast({ id: 'rematch-notice', type: 'error', title: 'بازی مجدد ممکن نیست', text: msg, duration: 5000 });
    };
    useEffect(() => {
        if (matchType !== 'online')
            return;
        if (rematchState === 'received') {
            showToast({
                id: 'rematch', type: 'request', title: 'درخواست بازی مجدد',
                text: `«${peerName}» می‌خواهد دوباره شطرنج بازی کند.`,
                duration: 20000, showTimer: true,
                actions: [
                    { label: 'قبول', variant: 'success', onClick: () => rematchActionsRef.current.accept() },
                    { label: 'رد کردن', variant: 'danger', onClick: () => rematchActionsRef.current.decline() }
                ]
            });
        }
        else if (rematchState === 'requested') {
            showToast({ id: 'rematch', type: 'waiting', title: 'درخواست بازی مجدد ارسال شد', text: `در انتظار پاسخ «${peerName}»...`, duration: 20000, showTimer: true });
        }
        else {
            hideToast('rematch');
        }
    }, [rematchState, matchType, peerName]);
    useEffect(() => () => hideToast('rematch'), []);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [currentMatchId, setCurrentMatchId] = useState(matchId);
    const [pendingNextMatchId, setPendingNextMatchId] = useState(null);
    const [rematchTimeLeft, setRematchTimeLeft] = useState(0);
    const resultRecordedRef = useRef(false);
    const processedMoveIdsRef = useRef(new Set());
    const [clockValues, setClockValues] = useState({ w: 720000, b: 720000 });
    const [timeoutReason, setTimeoutReason] = useState('');
    const clockStartRef = useRef(null);
    const localMoveTimes = useRef([]);
    const readClock = () => {
        if (!clockStartRef.current)
            return { w: 720000, b: 720000, active: 'w' };
        const moves = matchType === 'online'
            ? getMessages().filter(message => message.matchId === currentMatchId && message.text.startsWith('__MOVE__')).map(message => Date.parse(message.createdAt))
            : localMoveTimes.current;
        return chessClockRemaining(clockStartRef.current, moves, Date.now());
    };
    const finishOnTime = (values) => {
        if (values[values.active] > 0)
            return false;
        const winningColor = values.active === 'w' ? 'b' : 'w';
        const material = boardRef.current.flat().filter(piece => piece && piece[0] === winningColor && piece[1] !== 'k');
        const opposingMaterial = boardRef.current.flat().filter(piece => piece && piece[0] === values.active && piece[1] !== 'k');
        const bareKing = material.length === 0 || (opposingMaterial.length === 0 && material.length === 1 && ['b', 'n'].includes(material[0][1]));
        setTimeoutReason('زمان ' + (values.active === 'w' ? 'سفید' : 'سیاه') + ' تمام شد' + (bareKing ? '؛ مساوی' : ''));
        if (bareKing)
            setIsStalemate(true);
        else
            setWinner(winningColor === 'w' ? 'سفید' : 'سیاه');
        setPendingPromotion(null);
        if (botTimerRef.current)
            clearTimeout(botTimerRef.current);
        return true;
    };
    useEffect(() => {
        if (showIntro || winner || isStalemate)
            return;
        if (!clockStartRef.current)
            clockStartRef.current = matchType === 'online'
                ? gameClockStart('gameqj:chess-clock:' + currentMatchId) : Date.now();
        const tick = () => {
            const values = readClock();
            setClockValues(previous => {
                const sameDisplayedTime = Math.ceil(previous.w / 1000) === Math.ceil(values.w / 1000) &&
                    Math.ceil(previous.b / 1000) === Math.ceil(values.b / 1000) &&
                    (previous.w < 60000) === (values.w < 60000) &&
                    (previous.b < 60000) === (values.b < 60000);
                return sameDisplayedTime && previous.active === values.active ? previous : values;
            });
            finishOnTime(values);
        };
        tick();
        const timer = setInterval(tick, 200);
        return () => clearInterval(timer);
    }, [showIntro, currentMatchId, winner, isStalemate, moveHistory.length]);
    const isInCheck = useMemo(() => isKingInCheck(board, turn), [board, turn]);
    useEffect(() => {
        if (setIsInGame)
            setIsInGame(!(winner || isStalemate));
    }, [winner, isStalemate, setIsInGame]);
    // همگام‌سازی و شنود پیام‌های ریمچ
    useEffect(() => {
        if (matchType !== 'online' || !currentMatchId)
            return;
        const checkMessages = (event) => {
            if (event?.key && event.key !== MESSAGES_KEY)
                return;
            const msgs = getMessages().filter(m => m.matchId === currentMatchId);
            const abandonMsgs = msgs.filter(m => m.text.startsWith('__ABANDON__'));
            if (abandonMsgs.length > 0 && !winner) {
                const leavers = abandonMsgs.map(m => m.text.replace('__ABANDON__', ''));
                if (leavers.some(l => l !== currentUser.username)) {
                    setWinner('شما (به دلیل خروج حریف)');
                }
            }
            if (!winner && !isStalemate) {
                const nextMoveMsg = msgs.find(m => m.text.startsWith('__MOVE__') &&
                    m.senderUsername !== currentUser.username &&
                    !processedMoveIdsRef.current.has(m.id));
                if (nextMoveMsg) {
                    processedMoveIdsRef.current.add(nextMoveMsg.id);
                    try {
                        const data = JSON.parse(nextMoveMsg.text.replace('__MOVE__', ''));
                        executeMove(data.fromR, data.fromC, data.move, data.promoType, true);
                    }
                    catch (e) { }
                }
            }
            if (winner || isStalemate) {
                const recentRematchMsgs = msgs.filter(m => m.text.startsWith('__REMATCH') &&
                    new Date(m.createdAt).getTime() > Date.now() - 25000);
                const latestRematchMsg = recentRematchMsgs[recentRematchMsgs.length - 1];
                if (latestRematchMsg && latestRematchMsg.senderUsername !== currentUser.username) {
                    if (latestRematchMsg.text.startsWith('__REMATCH_REQUEST__') && rematchState === 'idle') {
                        const nextId = latestRematchMsg.text.replace('__REMATCH_REQUEST__', '');
                        setPendingNextMatchId(nextId);
                        setRematchState('received');
                        setRematchTimeLeft(20);
                    }
                    else if (latestRematchMsg.text.startsWith('__REMATCH_ACCEPTED__') && rematchState === 'requested') {
                        const acceptedId = latestRematchMsg.text.replace('__REMATCH_ACCEPTED__', '');
                        if (acceptedId === pendingNextMatchId) {
                            startNewGame(acceptedId);
                            showToast({ id: 'rematch-result', type: 'success', title: 'درخواست پذیرفته شد', text: `«${peerName}» بازی مجدد را قبول کرد؛ بازی شروع شد!`, duration: 3500 });
                            if (onNavigateToGames)
                                onNavigateToGames();
                        }
                    }
                    else if (latestRematchMsg.text === '__REMATCH_DECLINED__' && rematchState === 'requested') {
                        showToast({ id: 'rematch-result', type: 'error', title: 'درخواست رد شد', text: `«${peerName}» درخواست بازی مجدد را رد کرد.`, duration: 5000 });
                        setRematchState('idle');
                        onExit();
                    }
                }
            }
        };
        checkMessages();
        window.addEventListener('storage', checkMessages);
        const poll = setInterval(checkMessages, 600);
        return () => {
            window.removeEventListener('storage', checkMessages);
            clearInterval(poll);
        };
    }, [currentMatchId, matchType, winner, isStalemate, moveHistory.length, rematchState, currentUser.username, pendingNextMatchId]);
    // ذخیره سابقه مسابقه در حافظه محلی برای شنود در تمامی تب‌ها حتی پس از خروج
    useEffect(() => {
        if (!winner && !isStalemate)
            return;
        if (matchType !== 'online')
            return;
        const won = (typeof winner === 'string' && winner.includes('شما')) ||
            (winner === 'سفید' && myColor === 'w') ||
            (winner === 'سیاه' && myColor === 'b');
        try {
            localStorage.setItem(`gameqj_last_chess_match_${currentUser.username}`, JSON.stringify({
                matchId: currentMatchId,
                gameType: 'chess',
                matchParticipants: matchParticipants || [whiteName, blackName],
                peerName: peerName,
                hasFreeRematch: won && !freeRematchUsed,
                timestamp: Date.now()
            }));
        }
        catch (e) { }
    }, [winner, isStalemate, matchType, currentMatchId, currentUser.username, myColor, whiteName, blackName, peerName, freeRematchUsed, matchParticipants]);
    useEffect(() => {
        let timerId;
        if ((rematchState === 'received' || rematchState === 'requested') && rematchTimeLeft > 0) {
            timerId = setTimeout(() => {
                setRematchTimeLeft(prev => prev - 1);
            }, 1000);
        }
        else if (rematchTimeLeft === 0 && (rematchState === 'received' || rematchState === 'requested')) {
            if (rematchState === 'received') {
                declineRematch();
            }
            else if (rematchState === 'requested') {
                showToast({ id: 'rematch-result', type: 'info', title: 'زمان به پایان رسید', text: 'حریف پاسخی نداد؛ به فهرست بازی‌ها بازگشتید.', duration: 5000 });
                setRematchState('idle');
                onExit();
            }
        }
        return () => clearTimeout(timerId);
    }, [rematchTimeLeft, rematchState]);
    const handleExitClick = () => {
        if (winner || isStalemate)
            onExit();
        else
            setShowExitConfirm(true);
    };
    const confirmExit = () => {
        setShowExitConfirm(false);
        if (matchType === 'online') {
            sendMessage(currentUser.username, '__ABANDON__' + currentUser.username, peerName, currentMatchId);
        }
        onExit();
    };
    const executeMove = (fromR, fromC, move, promoType = 'q', isSync = false) => {
        if (winner || isStalemate || (!isSync && finishOnTime(readClock())))
            return;
        const baseBoard = boardRef.current;
        const movingPiece = baseBoard[fromR][fromC];
        const color = movingPiece[0];
        const newBoard = baseBoard.map(row => [...row]);
        newBoard[fromR][fromC] = null;
        if (move.enPassant) {
            const pawnDir = color === 'w' ? 1 : -1;
            newBoard[move.r + pawnDir][move.c] = null;
        }
        else if (move.castle === 'k') {
            newBoard[fromR][5] = newBoard[fromR][7];
            newBoard[fromR][7] = null;
        }
        else if (move.castle === 'q') {
            newBoard[fromR][3] = newBoard[fromR][0];
            newBoard[fromR][0] = null;
        }
        newBoard[move.r][move.c] = move.promotion ? `${color}${promoType}` : movingPiece;
        const nextCastling = JSON.parse(JSON.stringify(castlingRights));
        if (movingPiece === `${color}k`) {
            nextCastling[color].k = false;
            nextCastling[color].q = false;
        }
        if (fromR === 7 && fromC === 7)
            nextCastling.w.k = false;
        if (fromR === 7 && fromC === 0)
            nextCastling.w.q = false;
        if (fromR === 0 && fromC === 7)
            nextCastling.b.k = false;
        if (fromR === 0 && fromC === 0)
            nextCastling.b.q = false;
        setCastlingRights(nextCastling);
        if (move.doubleStep) {
            const stepDir = color === 'w' ? 1 : -1;
            setEnPassantTarget({ r: move.r + stepDir, c: move.c });
        }
        else {
            setEnPassantTarget(null);
        }
        const cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        let notation = '';
        if (move.castle === 'k')
            notation = 'O-O';
        else if (move.castle === 'q')
            notation = 'O-O-O';
        else {
            const pName = movingPiece[1].toUpperCase() !== 'P' ? movingPiece[1].toUpperCase() : '';
            notation = `${pName}${move.capture ? (pName ? 'x' : `${cols[fromC]}x`) : ''}${cols[move.c]}${8 - move.r}${move.promotion ? `=${promoType.toUpperCase()}` : ''}`;
        }
        const nextTurn = color === 'w' ? 'b' : 'w';
        const opponentCheck = isKingInCheck(newBoard, nextTurn);
        if (opponentCheck)
            notation += '+';
        setLastMove({
            from: [fromR, fromC],
            to: [move.r, move.c],
            capture: !!(move.capture || baseBoard[move.r][move.c] || move.enPassant),
            castle: move.castle,
            timestamp: Date.now()
        });
        if (matchType === 'online' && !isSync) {
            sendMessage(currentUser.username, `__MOVE__${JSON.stringify({ fromR, fromC, move, promoType })}`, peerName, currentMatchId);
            window.dispatchEvent(new Event('storage'));
        }
        if (matchType !== 'online')
            localMoveTimes.current.push(Date.now());
        setMoveHistory(prev => [...prev, { color, text: notation }]);
        playSound(move.capture ? 'capture' : 'move', currentUser.settings?.sound);
        setBoard(newBoard);
        setSelectedSquare(null);
        setPossibleMoves([]);
        setTurn(nextTurn);
        const opponentHasMoves = hasAnyLegalMoves(newBoard, nextTurn, move.doubleStep ? { r: move.r + (color === 'w' ? 1 : -1), c: move.c } : null, nextCastling);
        if (!opponentHasMoves) {
            if (opponentCheck) {
                setWinner(color === 'w' ? 'سفید' : 'سیاه');
                playSound('win', currentUser.settings?.sound);
            }
            else {
                setIsStalemate(true);
            }
        }
        else if (matchType === 'bot' && nextTurn === 'b') {
            if (botTimerRef.current)
                clearTimeout(botTimerRef.current);
            botTimerRef.current = setTimeout(() => simulateBotMove(newBoard, move.doubleStep ? { r: move.r + (color === 'w' ? 1 : -1), c: move.c } : null, nextCastling), 600);
        }
    };
    const handleSquareClick = (r, c) => {
        if (showIntro || winner || isStalemate || pendingPromotion)
            return;
        if (matchType === 'bot' && turn === 'b')
            return;
        if (matchType === 'online' && turn !== myColor)
            return;
        const piece = board[r][c];
        if (selectedSquare) {
            const [sr, sc] = selectedSquare;
            const move = possibleMoves.find(m => m.r === r && m.c === c);
            if (move) {
                if (move.promotion) {
                    setPendingPromotion({ fromR: sr, fromC: sc, move });
                    return;
                }
                executeMove(sr, sc, move);
            }
            else {
                if (piece && piece[0] === turn) {
                    setSelectedSquare([r, c]);
                    setPossibleMoves(getLegalMoves(r, c, board, enPassantTarget, castlingRights));
                }
                else {
                    setSelectedSquare(null);
                    setPossibleMoves([]);
                }
            }
        }
        else {
            if (piece && piece[0] === turn) {
                setSelectedSquare([r, c]);
                setPossibleMoves(getLegalMoves(r, c, board, enPassantTarget, castlingRights));
            }
        }
    };
    const simulateBotMove = (currentBoard, currentEp, currentCastling) => {
        const allMoves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (currentBoard[r][c] && currentBoard[r][c][0] === 'b') {
                    const legals = getLegalMoves(r, c, currentBoard, currentEp, currentCastling);
                    legals.forEach(m => allMoves.push({ from: [r, c], move: m }));
                }
            }
        }
        if (allMoves.length === 0)
            return;
        allMoves.sort((a, b) => {
            const aScore = (a.move.capture ? 5 : 0) + (a.move.promotion ? 8 : 0);
            const bScore = (b.move.capture ? 5 : 0) + (b.move.promotion ? 8 : 0);
            return bScore - aScore;
        });
        const chosen = allMoves[0];
        executeMove(chosen.from[0], chosen.from[1], chosen.move, 'q');
    };
    const startNewGame = (newMatchId = null) => {
        if (matchType === 'online') {
            if (hasFreeRematch) {
                setHasFreeRematch(false);
                setFreeRematchUsed(true);
            }
            else {
                const freshUser = findUser(currentUser.username);
                if (!freshUser || freshUser.coins < ONLINE_ENTRY_FEE) {
                    rematchNotice(`موجودی کیوجی کافی نیست! ورود نیازمند ${ONLINE_ENTRY_FEE} کیوجی است.`);
                    setRematchState('idle');
                    return;
                }
                deductCoins(currentUser.username, ONLINE_ENTRY_FEE);
                if (onUserUpdated)
                    onUserUpdated(findUser(currentUser.username));
            }
        }
        if (newMatchId)
            setCurrentMatchId(newMatchId);
        try {
            localStorage.setItem(`gameqj_last_chess_match_${currentUser.username}`, JSON.stringify({
                matchId: newMatchId || currentMatchId,
                gameType: 'chess',
                matchParticipants: matchParticipants || [whiteName, blackName],
                peerName: peerName,
                hasFreeRematch: false,
                timestamp: Date.now()
            }));
        }
        catch (e) { }
        if (botTimerRef.current) {
            clearTimeout(botTimerRef.current);
            botTimerRef.current = null;
        }
        clockStartRef.current = null;
        localMoveTimes.current = [];
        setClockValues({ w: 720000, b: 720000 });
        setTimeoutReason('');
        setShowIntro(true);
        setBoard(initialChessBoard);
        setLastMove(null);
        setTurn('w');
        setSelectedSquare(null);
        setPossibleMoves([]);
        setMoveHistory([]);
        setWinner(null);
        setIsStalemate(false);
        setCastlingRights({ w: { k: true, q: true }, b: { k: true, q: true } });
        setEnPassantTarget(null);
        setPendingPromotion(null);
        setRematchState('idle');
        rematchNotice('');
        resultRecordedRef.current = false;
        processedMoveIdsRef.current.clear();
    };
    const requestRematch = () => {
        if (matchType === 'bot') {
            startNewGame(`bot-${Date.now()}`);
        }
        else {
            rematchNotice('');
            const freshUser = findUser(currentUser.username);
            if (!hasFreeRematch && freshUser.coins < ONLINE_ENTRY_FEE) {
                rematchNotice(`موجودی کافی نیست! بازی مجدد نیازمند ${ONLINE_ENTRY_FEE} کیوجی است.`);
                return;
            }
            const nextMatchId = `rematch-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            setPendingNextMatchId(nextMatchId);
            sendMessage(currentUser.username, `__REMATCH_REQUEST__${nextMatchId}`, peerName, currentMatchId);
            window.dispatchEvent(new Event('storage'));
            patchUser(peerName, u => {
                const notifs = u.notifications || [];
                notifs.unshift({
                    id: Date.now() + Math.random(),
                    text: `«${currentUser.username}» درخواست بازی مجدد (شطرنج) ارسال کرد!`,
                    type: 'info',
                    time: new Date().toISOString()
                });
                return { ...u, notifications: notifs };
            });
            setRematchState('requested');
            setRematchTimeLeft(20);
        }
    };
    const acceptRematch = () => {
        const freshUser = findUser(currentUser.username);
        if (!hasFreeRematch && freshUser.coins < ONLINE_ENTRY_FEE) {
            rematchNotice(`موجودی کافی نیست! قبول درخواست نیازمند ${ONLINE_ENTRY_FEE} کیوجی است.`);
            return;
        }
        sendMessage(currentUser.username, `__REMATCH_ACCEPTED__${pendingNextMatchId}`, peerName, currentMatchId);
        window.dispatchEvent(new Event('storage'));
        startNewGame(pendingNextMatchId);
        if (onNavigateToGames)
            onNavigateToGames();
    };
    const declineRematch = () => {
        sendMessage(currentUser.username, '__REMATCH_DECLINED__', peerName, currentMatchId);
        window.dispatchEvent(new Event('storage'));
        setRematchState('idle');
        onExit();
    };
    rematchActionsRef.current = { accept: acceptRematch, decline: declineRematch };
    useEffect(() => {
        if (!winner || resultRecordedRef.current)
            return;
        resultRecordedRef.current = true;
        const won = (typeof winner === 'string' && winner.includes('شما')) ||
            (winner === 'سفید' && myColor === 'w') ||
            (winner === 'سیاه' && myColor === 'b');
        if (matchType === 'online') {
            if (won) {
                playSound('coin', currentUser.settings?.sound);
                if (!freeRematchUsed)
                    setHasFreeRematch(true);
            }
            else {
                setHasFreeRematch(false);
            }
        }
        onGameFinished(won, 'chess', matchType === 'online');
    }, [winner, onGameFinished, matchType, freeRematchUsed, currentUser.settings?.sound, myColor]);
    return (React.createElement("div", { className: "w-full max-w-5xl mx-auto flex flex-col items-center gap-4 sm:gap-6 animate-in fade-in relative px-2 sm:px-0" },
        React.createElement("style", null, `
                @keyframes chess-glide {
                    0% {
                        transform: translate3d(var(--slide-x), var(--slide-y), 0) scale(1.12);
                        z-index: 40;
                    }
                    100% {
                        transform: translate3d(0, 0, 0) scale(1);
                        z-index: 10;
                    }
                }
                @keyframes victory-shimmer {
                    0% { transform: rotate(0deg) scale(1); }
                    50% { transform: rotate(180deg) scale(1.1); }
                    100% { transform: rotate(360deg) scale(1); }
                }
                @keyframes victory-bounce {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-8px) scale(1.05); }
                }
                @keyframes confetti-fall {
                    0% { transform: translateY(-20px) rotate(0deg) scale(0); opacity: 0; }
                    20% { opacity: 1; transform: translateY(15px) rotate(90deg) scale(1); }
                    100% { transform: translateY(220px) rotate(360deg) scale(0.6); opacity: 0; }
                }
                .chess-hardware-piece {
                    will-change: transform;
                    backface-visibility: hidden;
                    transform-style: preserve-3d;
                }
            `),
        timeoutReason && React.createElement("p", { role: "status", className: "text-amber-300 font-bold" }, timeoutReason),
        showIntro && React.createElement(VsIntro, { title: "\u0634\u0637\u0631\u0646\u062C", subtitle: matchType === 'online' ? 'مسابقه‌ی آنلاین' : 'مسابقه‌ی تمرینی', players: [sides[0], sides[1]], onDone: () => setShowIntro(false) }),
        React.createElement("div", { className: "w-full glass-panel p-3 sm:p-4 rounded-2xl sm:rounded-3xl flex flex-wrap items-center justify-between gap-3 text-center sm:text-right" },
            React.createElement("button", { onClick: handleExitClick, className: "px-3 sm:px-4 py-2 bg-slate-800 hover:bg-rose-600 hover:border-rose-500 text-white rounded-xl text-[10px] sm:text-sm font-bold border border-slate-700 flex items-center justify-center gap-1.5 transition-all shadow-md w-full sm:w-auto" },
                React.createElement(IconArrowLeft, { className: "w-4 h-4" }),
                " ",
                winner || isStalemate ? 'بازگشت به فهرست' : 'خروج از بازی'),
            React.createElement("div", { className: "w-full sm:flex-1 text-center" },
                React.createElement("h3", { className: "text-base sm:text-lg font-black text-white" },
                    "\u0634\u0637\u0631\u0646\u062C \u0627\u0633\u062A\u0627\u0646\u062F\u0627\u0631\u062F FIDE (",
                    matchType === 'bot' ? 'تک‌نفره' : 'آنلاین',
                    ")"),
                matchType === 'online' && (React.createElement("span", { className: "text-[10px] sm:text-[11px] font-bold text-amber-300 block sm:inline mt-1 sm:mt-0 sm:mr-2" }, "\u062C\u0627\u06CC\u0632\u0647 \u0628\u0631\u062F: \u06F5\u06F0 \u06A9\u06CC\u0648\u062C\u06CC \u0633\u06A9\u0647"))),
            React.createElement("div", { className: "hidden sm:block w-20" })),
        React.createElement("div", { className: "w-full flex flex-col lg:flex-row gap-6 sm:gap-8 items-center lg:items-start justify-center" },
            React.createElement("div", { className: "w-full flex flex-col items-center gap-2 sm:gap-3 lg:w-auto" },
                playerBar(topSide, !winner && !isStalemate && turn === topSide.color),
                React.createElement("div", { className: `chess-board w-full max-w-[100vw] sm:max-w-[500px] aspect-square rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border-[4px] sm:border-[10px] border-slate-800 grid grid-cols-8 grid-rows-8 relative ${isBlackPlayer ? 'rotate-180' : ''}`, dir: "ltr" },
                    board.map((row, r) => row.map((piece, c) => {
                        const isLight = (r + c) % 2 === 0;
                        const isSelected = selectedSquare && selectedSquare[0] === r && selectedSquare[1] === c;
                        const moveData = possibleMoves.find(m => m.r === r && m.c === c);
                        const isKing = piece === `${turn}k`;
                        const isCheckSquare = isKing && isInCheck;
                        const isLastFrom = lastMove && lastMove.from[0] === r && lastMove.from[1] === c;
                        const isLastTo = lastMove && lastMove.to[0] === r && lastMove.to[1] === c;
                        const isLastCastlingRook = lastMove && lastMove.castle && ((lastMove.castle === 'k' && r === lastMove.from[0] && c === 5) ||
                            (lastMove.castle === 'q' && r === lastMove.from[0] && c === 3));
                        let slideStyle = undefined;
                        if (piece && lastMove) {
                            if (isLastTo) {
                                const dx = (lastMove.from[1] - c) * 100;
                                const dy = (lastMove.from[0] - r) * 100;
                                slideStyle = {
                                    '--slide-x': `${dx}%`,
                                    '--slide-y': `${dy}%`,
                                    animation: 'chess-glide 0.24s cubic-bezier(0.2, 0.9, 0.3, 1) forwards'
                                };
                            }
                            else if (isLastCastlingRook) {
                                const rookFromC = lastMove.castle === 'k' ? 7 : 0;
                                const dx = (rookFromC - c) * 100;
                                slideStyle = {
                                    '--slide-x': `${dx}%`,
                                    '--slide-y': '0%',
                                    animation: 'chess-glide 0.24s cubic-bezier(0.2, 0.9, 0.3, 1) forwards'
                                };
                            }
                        }
                        const cellPieceKey = (isLastTo || isLastCastlingRook)
                            ? `piece-${r}-${c}-${lastMove.timestamp}`
                            : `piece-${r}-${c}`;
                        return (React.createElement("div", { key: `sq-${r}-${c}`, onClick: () => handleSquareClick(r, c), className: `chess-square ${isLight ? 'chess-square-light' : 'chess-square-dark'} relative flex items-center justify-center text-3xl sm:text-4xl md:text-5xl cursor-pointer select-none transition-colors duration-200 ${isLight ? 'bg-slate-300' : 'bg-slate-600'} ${isSelected ? 'chess-square-selected !bg-indigo-400/85 ring-2 ring-indigo-300 ring-inset z-20' : ''} ${(isLastFrom || isLastTo) && !isSelected && !isCheckSquare ? `chess-square-last ${isLight ? '!bg-amber-200/90' : '!bg-amber-600/80'}` : ''} ${moveData && !moveData.capture ? 'hover:bg-indigo-300/50' : ''} ${moveData && moveData.capture ? 'hover:bg-rose-400/40' : ''} ${isCheckSquare ? 'chess-square-check !bg-rose-600/85 shadow-[inset_0_0_20px_rgba(225,29,72,0.9)] animate-pulse z-20' : ''}` },
                            moveData && !moveData.capture && (React.createElement("div", { className: "chess-move-dot absolute w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-indigo-950/40 shadow-inner z-10 pointer-events-none" })),
                            moveData && moveData.capture && (React.createElement("div", { className: "absolute inset-1.5 sm:inset-2 rounded-full border-[3px] border-rose-500/80 bg-rose-500/20 z-10 pointer-events-none animate-pulse" })),
                            piece && (React.createElement("div", { key: cellPieceKey, style: slideStyle, className: "chess-hardware-piece relative z-10 w-full h-full flex items-center justify-center" },
                                React.createElement("div", { className: `w-full h-full flex items-center justify-center ${isBlackPlayer ? 'rotate-180' : ''}` }, renderChessPiece(piece, pieceStyleOf(piece[0])))))));
                    })),
                    pendingPromotion && (React.createElement("div", { dir: "rtl", className: `absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center ${isBlackPlayer ? 'rotate-180' : ''}` },
                        React.createElement("h4", { className: "text-white font-black text-xs sm:text-sm mb-3" }, "\u0645\u0647\u0631\u0647 \u0627\u0631\u062A\u0642\u0627 \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F:"),
                        React.createElement("div", { className: "flex gap-2 sm:gap-3" }, [
                            { type: 'q', sym: '♛', label: 'وزیر' },
                            { type: 'r', sym: '♜', label: 'رخ' },
                            { type: 'b', sym: '♝', label: 'فیل' },
                            { type: 'n', sym: '♞', label: 'اسب' },
                        ].map(item => (React.createElement("button", { key: item.type, onClick: () => {
                                executeMove(pendingPromotion.fromR, pendingPromotion.fromC, pendingPromotion.move, item.type);
                                setPendingPromotion(null);
                            }, className: "p-2 sm:p-3 bg-slate-800 hover:bg-indigo-600 border border-slate-600 rounded-xl sm:rounded-2xl flex flex-col items-center gap-1 transition-all" },
                            React.createElement("span", { className: "text-2xl sm:text-4xl text-amber-300" }, item.sym),
                            React.createElement("span", { className: "text-[10px] sm:text-xs text-white font-bold" }, item.label)))))))),
                playerBar(bottomSide, !winner && !isStalemate && turn === bottomSide.color)),
            React.createElement("div", { className: "w-full lg:w-72 flex flex-col gap-3 sm:gap-4" },
                React.createElement("div", { className: "glass-panel p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-700/60 flex flex-row lg:flex-col justify-between items-center lg:items-start" },
                    React.createElement("span", { className: "text-[10px] sm:text-xs text-slate-400" }, "\u0648\u0636\u0639\u06CC\u062A \u0646\u0648\u0628\u062A:"),
                    React.createElement("div", { className: "text-sm sm:text-base font-black text-white mt-0 lg:mt-1 flex items-center justify-between w-auto lg:w-full gap-3" },
                        React.createElement("div", { className: "flex items-center gap-2" },
                            React.createElement("span", { className: `w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${turn === 'w' ? 'bg-white' : 'bg-slate-900 border border-white'}` }),
                            turn === 'w' ? 'سفید' + (myColor === 'w' ? ' (شما)' : '') : 'سیاه' + (myColor === 'b' ? ' (شما)' : '')),
                        isInCheck && (React.createElement("span", { className: "text-[10px] sm:text-xs font-black px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-lg" }, "\u06A9\u06CC\u0634!")))),
                React.createElement(InGameChatDrawer, { currentUser: currentUser, matchId: currentMatchId, peerName: peerName, onOpenProfile: onOpenProfile }),
                React.createElement(ReactionTray, { matchId: currentMatchId, currentUser: currentUser, onUserUpdated: onUserUpdated, hidden: showIntro, targets: sides.filter(s => !s.isMe).map(s => ({ name: s.name, label: s.name, isBot: s.isBot })) }),
                React.createElement("details", { className: "glass-panel p-4 rounded-2xl border border-slate-700/60" },
                    React.createElement("summary", { className: "text-[10px] sm:text-xs font-bold text-slate-400 mb-2 sm:mb-3 border-b border-slate-700 pb-1.5 sm:pb-2" }, "\u062A\u0627\u0631\u06CC\u062E\u0686\u0647 \u062D\u0631\u06A9\u0627\u062A"),
                    React.createElement("div", { className: "overflow-y-auto max-h-32 sm:max-h-48 space-y-1 custom-scrollbar text-[10px] sm:text-xs font-mono", dir: "ltr" }, moveHistory.map((m, i) => (React.createElement("div", { key: i, className: "p-1 sm:p-1.5 bg-slate-900/60 rounded text-slate-300" },
                        i + 1,
                        ". ",
                        m.color === 'w' ? 'White' : 'Black',
                        ": ",
                        m.text))))))),
        (winner || isStalemate) && (React.createElement("div", { dir: "rtl", className: "fixed inset-0 z-[95] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto" },
            React.createElement("div", { className: "relative w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 text-center border-2 border-amber-400/50 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-400 bg-slate-900/95" },
                React.createElement("div", { className: "absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" }),
                React.createElement("div", { className: "absolute -bottom-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" }),
                isMyVictory && VICTORY_CONFETTI.map((c, idx) => (React.createElement("span", { key: idx, className: `absolute pointer-events-none ${c.size}`, style: {
                        top: c.top,
                        left: c.left,
                        backgroundColor: c.color,
                        animation: `confetti-fall 2.8s ease-in-out ${c.delay} infinite`
                    } }))),
                React.createElement("div", { className: "relative z-10 flex flex-col items-center" },
                    React.createElement("div", { className: "relative mb-3 sm:mb-4" },
                        React.createElement("div", { className: "w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-amber-500/25 via-yellow-500/15 to-indigo-600/30 border-2 border-amber-400/60 shadow-xl shadow-amber-500/25 flex items-center justify-center", style: { animation: 'victory-bounce 2.2s ease-in-out infinite' } },
                            React.createElement("span", { className: "text-5xl sm:text-6xl drop-shadow-[0_10px_16px_rgba(0,0,0,0.5)]" }, isMyVictory ? '🏆' : isDraw ? '🤝' : '⚔️')),
                        isMyVictory && (React.createElement("span", { className: "absolute -top-3 -right-2 text-2xl drop-shadow-md animate-bounce" }, "\uD83D\uDC51"))),
                    React.createElement("div", { className: "mb-2" },
                        React.createElement("span", { className: `px-3 py-1 rounded-full text-[11px] font-black tracking-wider border shadow-sm ${isMyVictory ? 'bg-amber-400/20 text-amber-300 border-amber-400/40' : isDraw ? 'bg-sky-400/20 text-sky-300 border-sky-400/40' : 'bg-rose-400/20 text-rose-300 border-rose-400/40'}` }, isMyVictory ? '★ پیروزی باشکوه ★' : isDraw ? '⚖ نتیجه برابر' : 'نبرد شجاعانه')),
                    React.createElement("h2", { className: "text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-yellow-400 mb-1.5" }, isMyVictory ? 'تبریک! شما برنده شدید!' : isDraw ? 'تساوی بازی (پات)!' : `کیش و مات! ${winner} پیروز شد!`),
                    React.createElement("p", { className: "text-slate-400 text-xs sm:text-sm max-w-xs mx-auto leading-relaxed mb-4" }, isMyVictory ? 'با یک استراتژی هوشمندانه و تسلط کامل، شاه حریف کیش و مات شد.' : isDraw ? 'هیچ حرکتی بدون کیش مقدور نیست؛ مسابقه با تساوی به پایان رسید.' : 'حریف با برنامه‌ریزی بهتر توانست صفحه را تصاحب کند. در دست بعد جبران کنید!'),
                    isMyVictory && matchType === 'online' && (React.createElement("div", { className: "w-full p-3 sm:p-3.5 mb-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-600/20 border-2 border-amber-400/60 shadow-lg shadow-amber-500/15 flex items-center justify-between gap-3 animate-pulse" },
                        React.createElement("div", { className: "flex items-center gap-2.5" },
                            React.createElement("div", { className: "p-2 rounded-xl bg-amber-400 text-slate-950 font-black text-base shadow-sm" }, "\uD83E\uDE99"),
                            React.createElement("div", { className: "text-right" },
                                React.createElement("div", { className: "text-xs sm:text-sm font-black text-amber-200" }, "\u067E\u0627\u062F\u0627\u0634 \u0642\u0647\u0631\u0645\u0627\u0646\u06CC \u0645\u0633\u0627\u0628\u0642\u0647"),
                                React.createElement("div", { className: "text-[10px] text-amber-300/80" }, "\u0648\u0627\u0631\u06CC\u0632 \u0645\u0633\u062A\u0642\u06CC\u0645 \u0628\u0647 \u062D\u0633\u0627\u0628 \u06A9\u06CC\u0648\u062C\u06CC \u0634\u0645\u0627"))),
                        React.createElement("span", { className: "font-mono font-black text-lg sm:text-xl text-amber-300" }, "+\u06F5\u06F0"))),
                    React.createElement("div", { className: "grid grid-cols-2 gap-2.5 w-full mb-5 text-xs" },
                        React.createElement("div", { className: "p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/70" },
                            React.createElement("div", { className: "text-slate-400 text-[10px] font-bold" }, "\u062A\u0639\u062F\u0627\u062F \u062D\u0631\u06A9\u0627\u062A"),
                            React.createElement("div", { className: "text-white font-black text-sm mt-0.5" },
                                moveHistory.length,
                                " \u062D\u0631\u06A9\u062A")),
                        React.createElement("div", { className: "p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/70" },
                            React.createElement("div", { className: "text-slate-400 text-[10px] font-bold" }, "\u0645\u0647\u0631\u0647\u200C\u0647\u0627\u06CC \u0634\u06A9\u0627\u0631\u0634\u062F\u0647"),
                            React.createElement("div", { className: "text-white font-black text-sm mt-0.5" },
                                (myColor === 'w' ? capturedData.capturedByWhite : capturedData.capturedByBlack).length,
                                " \u0645\u0647\u0631\u0647"))),
                    React.createElement("div", { className: "space-y-2.5 w-full" },
                        matchType === 'bot' ? (React.createElement("button", { onClick: requestRematch, className: "game-action w-full py-3.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-600/30 active:scale-95 transition-all flex items-center justify-center gap-2" },
                            React.createElement(IconGamepad, { className: "w-4 h-4" }),
                            React.createElement("span", null, "\u0628\u0627\u0632\u06CC \u062F\u0648\u0628\u0627\u0631\u0647 (\u062F\u0633\u062A \u062C\u062F\u06CC\u062F)"))) : (React.createElement(React.Fragment, null,
                            rematchState === 'idle' && (React.createElement("button", { onClick: requestRematch, className: "game-action w-full py-3.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-600/30 active:scale-95 transition-all flex items-center justify-center gap-2" },
                                React.createElement(IconGamepad, { className: "w-4 h-4" }),
                                React.createElement("span", null, hasFreeRematch ? 'درخواست بازی مجدد (رایگان 🎁)' : 'درخواست بازی مجدد (۲۵ کیوجی)'))),
                            rematchState === 'requested' && (React.createElement("div", { className: "p-3 bg-slate-800/90 border border-slate-700 rounded-xl text-amber-300 font-bold text-xs flex items-center justify-center gap-2 animate-pulse" },
                                React.createElement("span", null, "\u23F3"),
                                React.createElement("span", null,
                                    "\u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631 \u067E\u0627\u0633\u062E \u062D\u0631\u06CC\u0641 (",
                                    rematchTimeLeft,
                                    " \u062B\u0627\u0646\u06CC\u0647)..."))),
                            rematchState === 'received' && (React.createElement("div", { className: "p-3 bg-indigo-950/70 border border-indigo-500/50 rounded-xl text-indigo-200 font-bold text-xs" }, "\u062D\u0631\u06CC\u0641 \u0645\u0627\u06CC\u0644 \u0628\u0647 \u0628\u0627\u0632\u06CC \u0645\u062C\u062F\u062F \u0627\u0633\u062A! \u0627\u0632 \u0627\u0639\u0644\u0627\u0646 \u0628\u0627\u0644\u0627\u06CC \u0635\u0641\u062D\u0647 \u067E\u0627\u0633\u062E \u062F\u0647\u06CC\u062F.")))),
                        React.createElement("button", { onClick: onExit, className: "w-full py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors border border-slate-700" }, "\u0628\u0627\u0632\u06AF\u0634\u062A \u0628\u0647 \u0641\u0647\u0631\u0633\u062A \u0628\u0627\u0632\u06CC\u200C\u0647\u0627")))))),
        showExitConfirm && (React.createElement("div", { dir: "rtl", className: "fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4" },
            React.createElement("div", { className: "w-full max-w-sm glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl text-center animate-in zoom-in border border-rose-500/30" },
                React.createElement(IconLogout, { className: "w-12 h-12 sm:w-16 sm:h-16 text-rose-500 mx-auto mb-3 sm:mb-4" }),
                React.createElement("h3", { className: "text-lg sm:text-xl font-black text-white mb-2" }, "\u062E\u0631\u0648\u062C \u0627\u0632 \u0628\u0627\u0632\u06CC\u061F"),
                React.createElement("p", { className: "text-slate-300 text-xs sm:text-sm leading-5 sm:leading-6 mb-5 sm:mb-6" }, "\u0622\u06CC\u0627 \u0645\u0637\u0645\u0626\u0646 \u0647\u0633\u062A\u06CC\u062F\u061F \u062F\u0631 \u0635\u0648\u0631\u062A \u062E\u0631\u0648\u062C \u0627\u0632 \u0645\u0633\u0627\u0628\u0642\u0647\u060C \u0628\u0627\u0632\u0646\u062F\u0647 \u0627\u0639\u0644\u0627\u0645 \u062E\u0648\u0627\u0647\u06CC\u062F \u0634\u062F."),
                React.createElement("div", { className: "flex gap-2 sm:gap-3" },
                    React.createElement("button", { onClick: () => setShowExitConfirm(false), className: "flex-1 py-2.5 sm:py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all" }, "\u0627\u0646\u0635\u0631\u0627\u0641"),
                    React.createElement("button", { onClick: confirmExit, className: "flex-1 py-2.5 sm:py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-rose-600/20 transition-all" }, "\u0628\u0644\u0647\u060C \u062E\u0631\u0648\u062C")))))));
};

/* ===== games/TicTacToeGame.jsx ===== */
// ---------- بازی دوز دو نفره (Tic-Tac-Toe) با افکت‌های نئونی، هوش مصنوعی و همگام‌سازی بی‌نقص آنلاین ----------
const WINNING_COMBOS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];
const checkTicTacToeWinner = (board) => {
    for (let [a, b, c] of WINNING_COMBOS) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { winner: board[a], line: [a, b, c] };
        }
    }
    if (board.every(cell => cell !== null)) {
        return { winner: 'draw', line: null };
    }
    return null;
};
// هوش مصنوعی بهینه با الگوریتم Minimax
const getBestBotMove = (currentBoard) => {
    const emptyIndices = currentBoard.map((val, idx) => val === null ? idx : null).filter(val => val !== null);
    if (emptyIndices.length === 9)
        return 4;
    const minimax = (board, depth, isMaximizing) => {
        const result = checkTicTacToeWinner(board);
        if (result) {
            if (result.winner === 'O')
                return 10 - depth;
            if (result.winner === 'X')
                return depth - 10;
            if (result.winner === 'draw')
                return 0;
        }
        if (isMaximizing) {
            let maxEval = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (board[i] === null) {
                    board[i] = 'O';
                    let evaluation = minimax(board, depth + 1, false);
                    board[i] = null;
                    maxEval = Math.max(maxEval, evaluation);
                }
            }
            return maxEval;
        }
        else {
            let minEval = Infinity;
            for (let i = 0; i < 9; i++) {
                if (board[i] === null) {
                    board[i] = 'X';
                    let evaluation = minimax(board, depth + 1, true);
                    board[i] = null;
                    minEval = Math.min(minEval, evaluation);
                }
            }
            return minEval;
        }
    };
    let bestScore = -Infinity;
    let bestMove = emptyIndices[0];
    for (let idx of emptyIndices) {
        currentBoard[idx] = 'O';
        let score = minimax(currentBoard, 0, false);
        currentBoard[idx] = null;
        if (score > bestScore) {
            bestScore = score;
            bestMove = idx;
        }
    }
    return bestMove;
};
const TicTacToeGame = ({ currentUser, matchType, onExit, onGameFinished, matchId, matchParticipants, onOpenProfile, setIsInGame, onUserUpdated, onNavigateToGames }) => {
    const myPlayerIndex = matchParticipants
        ? matchParticipants.findIndex(p => p.toLowerCase() === currentUser.username.toLowerCase())
        : 0;
    const isSecondPlayer = matchType === 'online' && myPlayerIndex === 1;
    const myMark = isSecondPlayer ? 'O' : 'X';
    const peerName = matchParticipants
        ? (myPlayerIndex === 0 ? matchParticipants[1] : matchParticipants[0])
        : 'حریف هوش مصنوعی';
    const playerXName = matchParticipants ? matchParticipants[0] : currentUser.username;
    const playerOName = matchParticipants ? (matchParticipants[1] || 'هوش مصنوعی') : 'هوش مصنوعی';
    const [showIntro, setShowIntro] = useState(true);
    const [board, setBoard] = useState(Array(9).fill(null));
    const [turn, setTurn] = useState('X');
    const [winnerInfo, setWinnerInfo] = useState(null);
    const [turnTimeLeft, setTurnTimeLeft] = useState(25);
    const [scores, setScores] = useState({ X: 0, O: 0, draw: 0 });
    const [hoverIndex, setHoverIndex] = useState(null);
    const [rematchState, setRematchState] = useState('idle');
    const [hasFreeRematch, setHasFreeRematch] = useState(false);
    const [freeRematchUsed, setFreeRematchUsed] = useState(false);
    const [pendingNextMatchId, setPendingNextMatchId] = useState(null);
    const [rematchTimeLeft, setRematchTimeLeft] = useState(0);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [currentMatchId, setCurrentMatchId] = useState(matchId);
    // استفاده از Ref برای جلوگیری کامل از باگ‌های Stale Closure
    const boardRef = useRef(board);
    boardRef.current = board;
    const turnRef = useRef(turn);
    turnRef.current = turn;
    const winnerInfoRef = useRef(winnerInfo);
    winnerInfoRef.current = winnerInfo;
    const processedMsgIds = useRef(new Set());
    const stateRef = useRef({});
    const resultRecordedRef = useRef(false);
    const botTimerRef = useRef(null);
    useEffect(() => {
        if (setIsInGame)
            setIsInGame(!winnerInfo && !showIntro);
    }, [winnerInfo, showIntro, setIsInGame]);
    // ذخیره پیام‌های قبلی در هنگام لود بازی
    useEffect(() => {
        if (currentMatchId) {
            const msgs = getMessages().filter(m => m.matchId === currentMatchId);
            msgs.forEach(m => processedMsgIds.current.add(m.id));
        }
    }, [currentMatchId]);
    // اعمال حرکت محلی بازیکن
    const handleCellClick = (index) => {
        if (winnerInfoRef.current || boardRef.current[index] !== null)
            return;
        if (matchType === 'bot' && turnRef.current === 'O')
            return;
        if (matchType === 'online' && turnRef.current !== myMark)
            return;
        if (showIntro)
            setShowIntro(false);
        const currentMark = turnRef.current;
        const nextBoard = [...boardRef.current];
        nextBoard[index] = currentMark;
        boardRef.current = nextBoard;
        setBoard(nextBoard);
        playSound('move', currentUser.settings?.sound);
        // ارسال سیگنال حرکت به حریف در بازی آنلاین
        if (matchType === 'online') {
            const actionData = { type: 'MOVE', index, mark: currentMark };
            const msg = sendMessage(currentUser.username, `__ACTION__${JSON.stringify(actionData)}`, null, currentMatchId);
            if (msg)
                processedMsgIds.current.add(msg.id);
            window.dispatchEvent(new Event('storage'));
        }
        const winResult = checkTicTacToeWinner(nextBoard);
        if (winResult) {
            setWinnerInfo(winResult);
            winnerInfoRef.current = winResult;
            if (winResult.winner === 'draw') {
                setScores(s => ({ ...s, draw: s.draw + 1 }));
            }
            else {
                setScores(s => ({ ...s, [winResult.winner]: s[winResult.winner] + 1 }));
                playSound('win', currentUser.settings?.sound);
            }
            return;
        }
        const nextTurn = currentMark === 'X' ? 'O' : 'X';
        setTurn(nextTurn);
        turnRef.current = nextTurn;
        // حرکت بات در بازی آفلاین
        if (matchType === 'bot' && nextTurn === 'O') {
            if (botTimerRef.current)
                clearTimeout(botTimerRef.current);
            botTimerRef.current = setTimeout(() => {
                if (winnerInfoRef.current)
                    return;
                const botMove = getBestBotMove([...boardRef.current]);
                if (botMove !== undefined && botMove !== null && boardRef.current[botMove] === null) {
                    const botBoard = [...boardRef.current];
                    botBoard[botMove] = 'O';
                    boardRef.current = botBoard;
                    setBoard(botBoard);
                    playSound('move', currentUser.settings?.sound);
                    const botWin = checkTicTacToeWinner(botBoard);
                    if (botWin) {
                        setWinnerInfo(botWin);
                        winnerInfoRef.current = botWin;
                        if (botWin.winner === 'draw')
                            setScores(s => ({ ...s, draw: s.draw + 1 }));
                        else
                            setScores(s => ({ ...s, O: s.O + 1 }));
                    }
                    else {
                        setTurn('X');
                        turnRef.current = 'X';
                    }
                }
            }, 550);
        }
    };
    // اعمال حرکت دریافتی از حریف در شبکه
    const applyRemoteMove = (index, mark) => {
        setShowIntro(false);
        if (boardRef.current[index] !== null)
            return;
        const nextBoard = [...boardRef.current];
        nextBoard[index] = mark;
        boardRef.current = nextBoard;
        setBoard(nextBoard);
        playSound('move', currentUser.settings?.sound);
        const winResult = checkTicTacToeWinner(nextBoard);
        if (winResult) {
            setWinnerInfo(winResult);
            winnerInfoRef.current = winResult;
            if (winResult.winner === 'draw') {
                setScores(s => ({ ...s, draw: s.draw + 1 }));
            }
            else {
                setScores(s => ({ ...s, [winResult.winner]: s[winResult.winner] + 1 }));
                playSound('win', currentUser.settings?.sound);
            }
            return;
        }
        const nextTurn = mark === 'X' ? 'O' : 'X';
        setTurn(nextTurn);
        turnRef.current = nextTurn;
    };
    // تایمر ۲۵ ثانیه‌ای هر نوبت
    useEffect(() => {
        if (showIntro || winnerInfo)
            return;
        setTurnTimeLeft(25);
        const timer = setInterval(() => {
            setTurnTimeLeft(prev => {
                if (prev <= 1) {
                    // در صورت پایان زمان نوبت بازیکن، یک خانه به صورت خودکار انتخاب می‌شود
                    if ((matchType === 'online' && turnRef.current === myMark) || (matchType === 'bot' && turnRef.current === 'X')) {
                        const emptyCells = boardRef.current.map((v, i) => v === null ? i : null).filter(v => v !== null);
                        if (emptyCells.length > 0) {
                            handleCellClick(emptyCells[Math.floor(Math.random() * emptyCells.length)]);
                        }
                    }
                    return 25;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [turn, showIntro, winnerInfo, matchType, myMark]);
    // ثبت نتیجه بازی در پروفایل
    useEffect(() => {
        if (!winnerInfo || resultRecordedRef.current)
            return;
        resultRecordedRef.current = true;
        const won = (winnerInfo.winner === myMark);
        if (matchType === 'online') {
            if (won) {
                playSound('coin', currentUser.settings?.sound);
                if (!freeRematchUsed)
                    setHasFreeRematch(true);
            }
            else {
                setHasFreeRematch(false);
            }
        }
        onGameFinished(won, 'tictactoe', matchType === 'online');
    }, [winnerInfo, myMark, matchType, freeRematchUsed, onGameFinished]);
    const startNewGame = (newMatchId = null) => {
        if (matchType === 'online') {
            if (hasFreeRematch) {
                setHasFreeRematch(false);
                setFreeRematchUsed(true);
            }
            else {
                const freshUser = findUser(currentUser.username);
                if (!freshUser || freshUser.coins < ONLINE_ENTRY_FEE)
                    return;
                deductCoins(currentUser.username, ONLINE_ENTRY_FEE);
                if (onUserUpdated)
                    onUserUpdated(findUser(currentUser.username));
            }
        }
        if (newMatchId)
            setCurrentMatchId(newMatchId);
        if (botTimerRef.current)
            clearTimeout(botTimerRef.current);
        setBoard(Array(9).fill(null));
        boardRef.current = Array(9).fill(null);
        setTurn('X');
        turnRef.current = 'X';
        setWinnerInfo(null);
        winnerInfoRef.current = null;
        setRematchState('idle');
        setTurnTimeLeft(25);
        resultRecordedRef.current = false;
        setShowIntro(false);
        processedMsgIds.current.clear();
    };
    const requestRematch = () => {
        if (matchType === 'bot') {
            startNewGame();
        }
        else {
            const freshUser = findUser(currentUser.username);
            if (!hasFreeRematch && freshUser.coins < ONLINE_ENTRY_FEE) {
                showToast({ id: 'rematch-err', type: 'error', title: 'موجودی ناکافی', text: `بازی مجدد نیازمند ${ONLINE_ENTRY_FEE} کیوجی است.`, duration: 4000 });
                return;
            }
            const nextMatchId = `tictactoe-rematch-${Date.now()}`;
            setPendingNextMatchId(nextMatchId);
            sendMessage(currentUser.username, `__REMATCH_REQUEST__${nextMatchId}`, null, currentMatchId);
            window.dispatchEvent(new Event('storage'));
            setRematchState('requested');
            setRematchTimeLeft(20);
        }
    };
    const acceptRematch = () => {
        const freshUser = findUser(currentUser.username);
        if (!hasFreeRematch && freshUser.coins < ONLINE_ENTRY_FEE)
            return;
        sendMessage(currentUser.username, `__REMATCH_ACCEPTED__${pendingNextMatchId}`, null, currentMatchId);
        window.dispatchEvent(new Event('storage'));
        startNewGame(pendingNextMatchId);
    };
    const declineRematch = () => {
        sendMessage(currentUser.username, '__REMATCH_DECLINED__', null, currentMatchId);
        window.dispatchEvent(new Event('storage'));
        setRematchState('idle');
        onExit();
    };
    const confirmExit = () => {
        setShowExitConfirm(false);
        if (matchType === 'online') {
            sendMessage(currentUser.username, '__ABANDON__' + currentUser.username, null, currentMatchId);
            window.dispatchEvent(new Event('storage'));
        }
        onExit();
    };
    // نگه‌داشتن رفرنس به آخرین وضعیت متغیرها
    useEffect(() => {
        stateRef.current = {
            currentMatchId,
            matchType,
            myMark,
            currentUser,
            rematchState,
            pendingNextMatchId,
            applyRemoteMove: (idx, mark) => applyRemoteMove(idx, mark),
            startNewGame: (id) => startNewGame(id),
            declineRematch: () => declineRematch()
        };
    });
    // سیستم هماهنگ‌سازی بلادرنگ شبکه و حافظه مشترک
    useEffect(() => {
        if (matchType !== 'online' || !currentMatchId)
            return;
        const handleStorage = (event) => {
            if (event.key && event.key !== MESSAGES_KEY)
                return;
            const state = stateRef.current;
            if (!state)
                return;
            const msgs = getMessages().filter(m => m.matchId === state.currentMatchId);
            // بررسی خروج حریف
            const abandonMsgs = msgs.filter(m => m.text.startsWith('__ABANDON__'));
            if (abandonMsgs.length > 0 && !winnerInfoRef.current) {
                const leavers = abandonMsgs.map(m => m.text.replace('__ABANDON__', ''));
                if (leavers.some(l => l.toLowerCase() !== state.currentUser.username.toLowerCase())) {
                    const winRes = { winner: state.myMark, line: null, reason: 'خروج حریف' };
                    setWinnerInfo(winRes);
                    winnerInfoRef.current = winRes;
                }
            }
            // دریافت حرکات بازی
            if (!winnerInfoRef.current) {
                const newActionMsgs = msgs.filter(m => m.text.startsWith('__ACTION__') && !processedMsgIds.current.has(m.id));
                if (newActionMsgs.length > 0) {
                    newActionMsgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                    newActionMsgs.forEach(msg => {
                        processedMsgIds.current.add(msg.id);
                        if (msg.senderUsername.toLowerCase() !== state.currentUser.username.toLowerCase()) {
                            try {
                                const data = JSON.parse(msg.text.replace('__ACTION__', ''));
                                if (data.type === 'MOVE') {
                                    state.applyRemoteMove(data.index, data.mark);
                                }
                            }
                            catch (e) { }
                        }
                    });
                }
            }
            // درخواست بازی مجدد
            if (winnerInfoRef.current) {
                const recentRematch = msgs.filter(m => m.text.startsWith('__REMATCH') && new Date(m.createdAt).getTime() > Date.now() - 25000);
                const latest = recentRematch[recentRematch.length - 1];
                if (latest && latest.senderUsername.toLowerCase() !== state.currentUser.username.toLowerCase()) {
                    if (latest.text.startsWith('__REMATCH_REQUEST__') && state.rematchState === 'idle') {
                        const nextId = latest.text.replace('__REMATCH_REQUEST__', '');
                        setPendingNextMatchId(nextId);
                        setRematchState('received');
                        setRematchTimeLeft(20);
                    }
                    else if (latest.text.startsWith('__REMATCH_ACCEPTED__') && state.rematchState === 'requested') {
                        const nextId = latest.text.replace('__REMATCH_ACCEPTED__', '');
                        state.startNewGame(nextId);
                        showToast({ id: 'rematch-res', type: 'success', title: 'درخواست قبول شد', text: 'دست جدید آغاز شد!', duration: 3500 });
                        if (onNavigateToGames)
                            onNavigateToGames();
                    }
                    else if (latest.text === '__REMATCH_DECLINED__' && state.rematchState === 'requested') {
                        showToast({ id: 'rematch-res', type: 'error', title: 'درخواست رد شد', text: 'حریف بازی مجدد را نپذیرفت.', duration: 5000 });
                        setRematchState('idle');
                        onExit();
                    }
                }
            }
        };
        handleStorage({ key: MESSAGES_KEY });
        window.addEventListener('storage', handleStorage);
        const interval = setInterval(() => handleStorage({ key: MESSAGES_KEY }), 600);
        return () => {
            window.removeEventListener('storage', handleStorage);
            clearInterval(interval);
        };
    }, [currentMatchId, matchType]);
    // نوتیفیکیشن درخواست بازی مجدد
    useEffect(() => {
        if (matchType !== 'online')
            return;
        if (rematchState === 'received') {
            showToast({
                id: 'rematch-tt', type: 'request', title: 'درخواست بازی مجدد دوز',
                text: `«${peerName}» می‌خواهد دوباره با شما بازی کند.`,
                duration: 20000, showTimer: true,
                actions: [
                    { label: 'قبول', variant: 'success', onClick: acceptRematch },
                    { label: 'رد کردن', variant: 'danger', onClick: declineRematch }
                ]
            });
        }
        else if (rematchState === 'requested') {
            showToast({ id: 'rematch-tt', type: 'waiting', title: 'در انتظار پاسخ حریف', text: `درخواست بازی مجدد ارسال شد...`, duration: 20000, showTimer: true });
        }
        else {
            hideToast('rematch-tt');
        }
    }, [rematchState]);
    const vsPlayers = [
        { id: 1, name: playerXName, avatar: findUser(playerXName)?.avatar, hex: '#06b6d4', tag: 'علامت (X)', wins: findUser(playerXName)?.stats?.wins },
        { id: 2, name: playerOName || 'هوش مصنوعی', avatar: findUser(playerOName)?.avatar, hex: '#f43f5e', tag: 'علامت (O)', isBot: !playerOName || playerOName.includes('هوش مصنوعی') }
    ];
    return (React.createElement("div", { className: "w-full max-w-4xl mx-auto flex flex-col items-center gap-5 sm:gap-7 animate-in fade-in relative px-2 sm:px-0" },
        showIntro && (React.createElement(VsIntro, { title: "\u062F\u0648\u0632 \u06A9\u0644\u0627\u0633\u06CC\u06A9 \u0646\u0626\u0648\u0646\u06CC", subtitle: matchType === 'online' ? 'مسابقه زنده آنلاین' : 'تمرین با هوش مصنوعی', players: vsPlayers, onDone: () => setShowIntro(false) })),
        React.createElement("div", { className: "w-full glass-panel p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl flex flex-wrap items-center justify-between gap-4 border border-indigo-500/20 shadow-xl" },
            React.createElement("button", { onClick: () => winnerInfo ? onExit() : setShowExitConfirm(true), className: "px-4 py-2 bg-slate-800 hover:bg-rose-600 hover:border-rose-500 text-white rounded-xl text-xs sm:text-sm font-bold border border-slate-700 flex items-center gap-1.5 transition-all shadow-md active:scale-95" },
                React.createElement(IconArrowLeft, { className: "w-4 h-4" }),
                React.createElement("span", null, winnerInfo ? 'بازگشت به فهرست' : 'خروج از مسابقه')),
            React.createElement("div", { className: "text-center" },
                React.createElement("h3", { className: "text-base sm:text-lg font-black text-white" },
                    "\u062F\u0648\u0632 \u06F3\u00D7\u06F3 (",
                    matchType === 'online' ? 'آنلاین' : 'تک‌نفره با ربات',
                    ")"),
                matchType === 'online' && React.createElement("span", { className: "text-[11px] font-bold text-amber-300" }, "\u062C\u0627\u06CC\u0632\u0647 \u0628\u0631\u062F: \u06F4\u06F0 \u06A9\u06CC\u0648\u062C\u06CC \u0633\u06A9\u0647")),
            React.createElement("div", { className: "flex items-center gap-3" },
                React.createElement("div", { className: "px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 flex items-center gap-2 text-xs" },
                    React.createElement("span", { className: "text-slate-400" }, "\u0632\u0645\u0627\u0646 \u0646\u0648\u0628\u062A:"),
                    React.createElement("span", { className: `font-mono font-black ${turnTimeLeft <= 7 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}` },
                        turnTimeLeft,
                        "s")))),
        React.createElement("div", { className: "w-full max-w-md grid grid-cols-2 gap-3.5" },
            React.createElement("div", { "data-gq-player": playerXName, className: `p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between ${turn === 'X' && !winnerInfo ? 'bg-cyan-500/15 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.35)] scale-[1.02]' : 'bg-slate-900/60 border-slate-800 opacity-80'}` },
                React.createElement("div", { className: "flex items-center gap-2.5 min-w-0" },
                    React.createElement("div", { className: "w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-400/60 flex items-center justify-center font-black text-cyan-400 text-xl shadow-inner shrink-0" }, "X"),
                    React.createElement("div", { className: "min-w-0 text-right" },
                        React.createElement("div", { className: "text-xs font-black text-white truncate" },
                            playerXName,
                            myMark === 'X' ? ' (شما)' : ''),
                        findUser(playerXName)?.equipped?.titles && findUser(playerXName)?.equipped?.titles !== 'classic' && typeof renderPlayerTitle === 'function' && (React.createElement("div", { className: "-mt-0.5 origin-right transform scale-90 text-right" }, renderPlayerTitle(findUser(playerXName).equipped.titles))),
                        React.createElement("div", { className: "text-[10px] text-cyan-300 font-bold" },
                            scores.X,
                            " \u0628\u0631\u062F"))),
                turn === 'X' && !winnerInfo && React.createElement("span", { className: "w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0" })),
            React.createElement("div", { "data-gq-player": playerOName, className: `p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between ${turn === 'O' && !winnerInfo ? 'bg-rose-500/15 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.35)] scale-[1.02]' : 'bg-slate-900/60 border-slate-800 opacity-80'}` },
                React.createElement("div", { className: "flex items-center gap-2.5 min-w-0" },
                    React.createElement("div", { className: "w-9 h-9 rounded-xl bg-rose-950/80 border border-rose-400/60 flex items-center justify-center font-black text-rose-400 text-xl shadow-inner shrink-0" }, "O"),
                    React.createElement("div", { className: "min-w-0 text-right" },
                        React.createElement("div", { className: "text-xs font-black text-white truncate" },
                            playerOName,
                            myMark === 'O' ? ' (شما)' : ''),
                        findUser(playerOName)?.equipped?.titles && findUser(playerOName)?.equipped?.titles !== 'classic' && typeof renderPlayerTitle === 'function' && (React.createElement("div", { className: "-mt-0.5 origin-right transform scale-90 text-right" }, renderPlayerTitle(findUser(playerOName).equipped.titles))),
                        React.createElement("div", { className: "text-[10px] text-rose-300 font-bold" },
                            scores.O,
                            " \u0628\u0631\u062F"))),
                turn === 'O' && !winnerInfo && React.createElement("span", { className: "w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping shrink-0" }))),
        React.createElement("div", { className: "relative w-full max-w-[340px] sm:max-w-[420px] aspect-square p-3.5 sm:p-4 rounded-3xl bg-slate-900/90 border-2 border-slate-700/80 shadow-[0_0_60px_rgba(0,0,0,0.65)] flex items-center justify-center" },
            React.createElement("div", { className: "w-full h-full grid grid-cols-3 grid-rows-3 gap-2.5 sm:gap-3.5" }, board.map((cell, idx) => {
                const isWinningCell = winnerInfo?.line && winnerInfo.line.includes(idx);
                return (React.createElement("button", { key: idx, disabled: cell !== null || (matchType === 'online' && turn !== myMark) || !!winnerInfo, onClick: () => handleCellClick(idx), onMouseEnter: () => setHoverIndex(idx), onMouseLeave: () => setHoverIndex(null), className: `relative rounded-2xl flex items-center justify-center transition-all duration-200 select-none overflow-hidden ${isWinningCell
                        ? 'bg-gradient-to-br from-amber-500/30 to-amber-600/30 border-2 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.6)] scale-[1.04] z-10'
                        : 'bg-slate-800/80 border border-slate-700 hover:border-indigo-400/60 hover:bg-slate-750'} ${cell === null && !winnerInfo && ((matchType === 'online' && turn === myMark) || matchType === 'bot') ? 'cursor-pointer hover:shadow-lg' : 'cursor-default'}` },
                    cell === 'X' && (React.createElement("div", { className: "w-3/5 h-3/5 relative flex items-center justify-center animate-in zoom-in-50 duration-300" },
                        React.createElement("svg", { viewBox: "0 0 24 24", className: "w-full h-full stroke-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]", strokeWidth: "3.2", strokeLinecap: "round" },
                            React.createElement("line", { x1: "4", y1: "4", x2: "20", y2: "20" }),
                            React.createElement("line", { x1: "20", y1: "4", x2: "4", y2: "20" })))),
                    cell === 'O' && (React.createElement("div", { className: "w-3/5 h-3/5 relative flex items-center justify-center animate-in zoom-in-50 duration-300" },
                        React.createElement("svg", { viewBox: "0 0 24 24", className: "w-full h-full stroke-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]", fill: "none", strokeWidth: "3.2" },
                            React.createElement("circle", { cx: "12", cy: "12", r: "8" })))),
                    cell === null && hoverIndex === idx && !winnerInfo && ((matchType === 'online' && turn === myMark) || (matchType === 'bot' && turn === 'X')) && (React.createElement("div", { className: "opacity-20 text-3xl font-black text-white" }, turn))));
            })),
            winnerInfo && (React.createElement("div", { className: "absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-md rounded-3xl p-6 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300 border border-indigo-400/40 shadow-2xl" },
                winnerInfo.winner === 'draw' ? (React.createElement(React.Fragment, null,
                    React.createElement("div", { className: "text-5xl mb-2" }, "\uD83E\uDD1D"),
                    React.createElement("h3", { className: "text-2xl sm:text-3xl font-black text-white mb-1" }, "\u0628\u0627\u0632\u06CC \u0645\u0633\u0627\u0648\u06CC \u0634\u062F!"),
                    React.createElement("p", { className: "text-xs text-slate-300 mb-5" }, "\u0647\u0631 \u062F\u0648 \u0628\u0627\u0632\u06CC\u06A9\u0646 \u0628\u0627 \u0645\u0647\u0627\u0631\u062A \u0628\u0627\u0644\u0627 \u0628\u0627\u0632\u06CC \u06A9\u0631\u062F\u0646\u062F."))) : (React.createElement(React.Fragment, null,
                    React.createElement(IconTrophy, { className: "w-16 h-16 text-amber-400 mb-2 animate-bounce-slight" }),
                    React.createElement("h3", { className: "text-2xl sm:text-3xl font-black text-white mb-1" }, winnerInfo.winner === myMark ? '🎉 شما برنده شدید!' : `بازیکن (${winnerInfo.winner}) پیروز شد!`),
                    winnerInfo.winner === myMark && matchType === 'online' && (React.createElement("div", { className: "flex items-center gap-2 p-2.5 bg-amber-500/20 border border-amber-400/50 rounded-2xl text-amber-300 font-black text-sm mb-4 animate-pulse" },
                        React.createElement(IconCoin, { className: "w-5 h-5" }),
                        React.createElement("span", null, "+ \u06F4\u06F0 \u06A9\u06CC\u0648\u062C\u06CC \u067E\u0627\u062F\u0627\u0634 \u0628\u0647 \u062D\u0633\u0627\u0628\u062A\u0627\u0646 \u0627\u0641\u0632\u0648\u062F\u0647 \u0634\u062F!"))))),
                React.createElement("div", { className: "flex flex-col gap-2.5 w-full max-w-xs mt-2" },
                    matchType === 'bot' ? (React.createElement("button", { onClick: () => startNewGame(), className: "w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-600/30 active:scale-95 transition-all" }, "\u062F\u0633\u062A \u0628\u0639\u062F\u06CC (\u0628\u0627\u0632\u06CC \u0645\u062C\u062F\u062F)")) : (React.createElement("button", { onClick: requestRematch, disabled: rematchState !== 'idle', className: "w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-600/30 active:scale-95 transition-all flex items-center justify-center gap-2" },
                        React.createElement(IconGamepad, { className: "w-4 h-4" }),
                        React.createElement("span", null, hasFreeRematch ? 'درخواست بازی دوباره (رایگان)' : 'درخواست بازی دوباره (۲۵ کیوجی)'))),
                    React.createElement("button", { onClick: onExit, className: "w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors" }, "\u0628\u0627\u0632\u06AF\u0634\u062A \u0628\u0647 \u0641\u0647\u0631\u0633\u062A \u0628\u0627\u0632\u06CC\u200C\u0647\u0627"))))),
        React.createElement(InGameChatDrawer, { currentUser: currentUser, matchId: currentMatchId, peerName: peerName, onOpenProfile: onOpenProfile }),
        React.createElement(ReactionTray, { matchId: currentMatchId, currentUser: currentUser, onUserUpdated: onUserUpdated, hidden: showIntro, targets: [{ name: myMark === 'X' ? playerOName : playerXName, label: myMark === 'X' ? playerOName : playerXName, isBot: (myMark === 'X' ? playerOName : playerXName).includes('هوش مصنوعی') }] }),
        showExitConfirm && (React.createElement("div", { dir: "rtl", className: "fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" },
            React.createElement("div", { className: "w-full max-w-sm glass-panel rounded-3xl p-6 shadow-2xl text-center border border-rose-500/30" },
                React.createElement(IconLogout, { className: "w-12 h-12 text-rose-500 mx-auto mb-3" }),
                React.createElement("h4", { className: "text-lg font-black text-white mb-2" }, "\u062E\u0631\u0648\u062C \u0627\u0632 \u0645\u0633\u0627\u0628\u0642\u0647 \u062F\u0648\u0632\u061F"),
                React.createElement("p", { className: "text-slate-300 text-xs mb-5 leading-5" }, "\u062F\u0631 \u0635\u0648\u0631\u062A \u062E\u0631\u0648\u062C \u062F\u0631 \u062D\u06CC\u0646 \u0628\u0627\u0632\u06CC \u0622\u0646\u0644\u0627\u06CC\u0646\u060C \u062D\u0631\u06CC\u0641 \u0634\u0645\u0627 \u0628\u0631\u0646\u062F\u0647 \u0627\u0639\u0644\u0627\u0645 \u062E\u0648\u0627\u0647\u062F \u0634\u062F."),
                React.createElement("div", { className: "flex gap-2.5" },
                    React.createElement("button", { onClick: () => setShowExitConfirm(false), className: "flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold" }, "\u0627\u0646\u0635\u0631\u0627\u0641"),
                    React.createElement("button", { onClick: confirmExit, className: "flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30" }, "\u062A\u0627\u06CC\u06CC\u062F \u062E\u0631\u0648\u062C")))))));
};

/* ===== games/BackgammonGame.jsx ===== */
// ============================================================================
// BackgammonGame.jsx — بازی تخته نرد با قوانین رسمی، هوش مصنوعی، چندنفره و VsIntro
// دارای انیمیشن پرتاب تاس سه‌بعدی و روان، پرتاب واکنش‌ها (تخم‌مرغ و گوجه)،
// و هندل دقیق خروج و تسلیم آنلاین (اهدای فوری برد به حریف)
// ============================================================================
const BACKGAMMON_REWARD_BASE = 60;
// ایجاد چیدمان اولیه استاندارد تخته نرد (۱۵ مهره برای هر بازیکن)
const createInitialBackgammonBoard = () => {
    // ۲۴ خانه (مثلث)
    const points = Array.from({ length: 24 }, () => ({ color: null, count: 0 }));
    // مهره‌های سفید (White): مسیر حرکت از خانه ۲۳ به سمت خانه ۰
    points[23] = { color: 'white', count: 2 };
    points[12] = { color: 'white', count: 5 };
    points[7] = { color: 'white', count: 3 };
    points[5] = { color: 'white', count: 5 };
    // مهره‌های سیاه (Black): مسیر حرکت از خانه ۰ به سمت خانه ۲۳
    points[0] = { color: 'black', count: 2 };
    points[11] = { color: 'black', count: 5 };
    points[16] = { color: 'black', count: 3 };
    points[18] = { color: 'black', count: 5 };
    return points;
};
// بررسی اینکه آیا تمام مهره‌های بازیکن در خانه خودی (Home Board) هستند یا خیر
const canPlayerBearOff = (board, bar, color) => {
    if (bar[color] > 0)
        return false;
    if (color === 'white') {
        // خانه خودی سفید: خانه‌های ۰ تا ۵
        for (let i = 6; i < 24; i++) {
            if (board[i].color === 'white' && board[i].count > 0)
                return false;
        }
        return true;
    }
    else {
        // خانه خودی سیاه: خانه‌های ۱۸ تا ۲۳
        for (let i = 0; i < 18; i++) {
            if (board[i].color === 'black' && board[i].count > 0)
                return false;
        }
        return true;
    }
};
// یافتن تمام مقصدهای مجاز برای یک مهره از مبدأ مشخص با تاس‌های موجود
const getLegalMovesForChecker = (board, bar, bornOff, color, from, availableDice) => {
    const oppColor = color === 'white' ? 'black' : 'white';
    const moves = [];
    const uniqueDice = Array.from(new Set(availableDice));
    const canBearOff = canPlayerBearOff(board, bar, color);
    // ۱. اگر بازیکنی مهره روی پیشخوان (Bar) دارد، فقط و فقط باید از پیشخوان وارد شود
    if (bar[color] > 0) {
        if (from !== 'bar')
            return [];
        for (let die of uniqueDice) {
            const targetPoint = color === 'white' ? 24 - die : die - 1;
            const target = board[targetPoint];
            if (!target.color || target.color === color || target.count <= 1) {
                moves.push({ from: 'bar', to: targetPoint, die, isHit: target.color === oppColor && target.count === 1 });
            }
        }
        return moves;
    }
    if (from === 'bar')
        return [];
    const currentPt = board[from];
    if (currentPt.color !== color || currentPt.count <= 0)
        return [];
    // ۲. بررسی حرکت عادی و برداشتن مهره برای خانه‌های معمولی
    for (let die of uniqueDice) {
        const targetIdx = color === 'white' ? from - die : from + die;
        // الف) حرکت عادی درون تخته
        if (targetIdx >= 0 && targetIdx <= 23) {
            const target = board[targetIdx];
            if (!target.color || target.color === color || target.count <= 1) {
                moves.push({
                    from,
                    to: targetIdx,
                    die,
                    isHit: target.color === oppColor && target.count === 1
                });
            }
        }
        // ب) برداشتن مهره از صفحه (Bear Off)
        else if (canBearOff) {
            if (color === 'white' && targetIdx < 0) {
                if (from - die === -1) {
                    moves.push({ from, to: 'off', die, isBearOff: true });
                }
                else if (from - die < -1) {
                    let hasHigher = false;
                    for (let i = from + 1; i <= 5; i++) {
                        if (board[i].color === 'white' && board[i].count > 0) {
                            hasHigher = true;
                            break;
                        }
                    }
                    if (!hasHigher) {
                        moves.push({ from, to: 'off', die, isBearOff: true });
                    }
                }
            }
            else if (color === 'black' && targetIdx >= 24) {
                if (from + die === 24) {
                    moves.push({ from, to: 'off', die, isBearOff: true });
                }
                else if (from + die > 24) {
                    let hasHigher = false;
                    for (let i = 18; i < from; i++) {
                        if (board[i].color === 'black' && board[i].count > 0) {
                            hasHigher = true;
                            break;
                        }
                    }
                    if (!hasHigher) {
                        moves.push({ from, to: 'off', die, isBearOff: true });
                    }
                }
            }
        }
    }
    return moves;
};
const simulateBackgammonMove = (board, bar, bornOff, color, move) => {
    const nextBoard = board.slice();
    const nextBar = { ...bar };
    const nextBornOff = { ...bornOff };
    const opponent = color === 'white' ? 'black' : 'white';
    if (move.from === 'bar') {
        nextBar[color] -= 1;
    }
    else {
        nextBoard[move.from] = { ...nextBoard[move.from] };
        nextBoard[move.from].count -= 1;
        if (!nextBoard[move.from].count)
            nextBoard[move.from] = { color: null, count: 0 };
    }
    if (move.to === 'off') {
        nextBornOff[color] += 1;
    }
    else {
        const target = nextBoard[move.to];
        if (target.color === opponent && target.count === 1) {
            nextBar[opponent] += 1;
            nextBoard[move.to] = { color, count: 1 };
        }
        else if (target.color === color) {
            nextBoard[move.to] = { ...target, count: target.count + 1 };
        }
        else {
            nextBoard[move.to] = { color, count: 1 };
        }
    }
    return { board: nextBoard, bar: nextBar, bornOff: nextBornOff };
};
const backgammonLegalMovesCache = new Map();
const getAllLegalMoves = (board, bar, bornOff, color, availableDice) => {
    const dice = availableDice || [];
    const cacheKey = JSON.stringify([
        board.map(point => `${point.color === 'white' ? 'w' : point.color === 'black' ? 'b' : '-'}${point.count}`).join(''),
        bar.white, bar.black,
        bornOff.white, bornOff.black,
        color, dice
    ]);
    if (backgammonLegalMovesCache.has(cacheKey)) {
        return backgammonLegalMovesCache.get(cacheKey);
    }
    const memo = new Map();
    const solveMaxMoves = (position, remainingDice) => {
        if (!remainingDice.length)
            return 0;
        const key = JSON.stringify([
            position.board.map(point => `${point.color === 'white' ? 'w' : point.color === 'black' ? 'b' : '-'}${point.count}`).join(''),
            position.bar.white, position.bar.black,
            position.bornOff.white, position.bornOff.black,
            color, [...remainingDice].sort((left, right) => left - right)
        ]);
        if (memo.has(key))
            return memo.get(key);
        let bestCount = 0;
        const sources = position.bar[color] > 0
            ? ['bar']
            : position.board.map((point, index) => point.color === color && point.count > 0 ? index : null).filter(index => index !== null);
        for (const die of new Set(remainingDice)) {
            const nextDice = [...remainingDice];
            nextDice.splice(nextDice.indexOf(die), 1);
            for (const from of sources) {
                const moves = getLegalMovesForChecker(position.board, position.bar, position.bornOff, color, from, [die]);
                for (const move of moves) {
                    if (!nextDice.length) {
                        memo.set(key, 1);
                        return 1;
                    }
                    const nextPosition = simulateBackgammonMove(position.board, position.bar, position.bornOff, color, move);
                    bestCount = Math.max(bestCount, 1 + solveMaxMoves(nextPosition, nextDice));
                    if (bestCount === remainingDice.length) {
                        memo.set(key, bestCount);
                        return bestCount;
                    }
                }
            }
        }
        memo.set(key, bestCount);
        return bestCount;
    };
    const sources = bar[color] > 0
        ? ['bar']
        : board.map((point, index) => point.color === color && point.count > 0 ? index : null).filter(index => index !== null);
    let bestCount = 0;
    let legalMoves = [];
    for (const die of new Set(dice)) {
        const remainingDice = [...dice];
        remainingDice.splice(remainingDice.indexOf(die), 1);
        for (const from of sources) {
            const moves = getLegalMovesForChecker(board, bar, bornOff, color, from, [die]);
            for (const move of moves) {
                const nextPosition = simulateBackgammonMove(board, bar, bornOff, color, move);
                const moveCount = 1 + solveMaxMoves(nextPosition, remainingDice);
                if (moveCount > bestCount) {
                    bestCount = moveCount;
                    legalMoves = [move];
                }
                else if (moveCount === bestCount) {
                    legalMoves.push(move);
                }
            }
        }
    }
    if (bestCount === 1 && dice.length === 2 && dice[0] !== dice[1]) {
        const highDieMoves = legalMoves.filter(move => move.die === Math.max(...dice));
        if (highDieMoves.length)
            legalMoves = highDieMoves;
    }
    if (backgammonLegalMovesCache.size >= 96) {
        backgammonLegalMovesCache.delete(backgammonLegalMovesCache.keys().next().value);
    }
    backgammonLegalMovesCache.set(cacheKey, legalMoves);
    return legalMoves;
};
// ارزیابی هوش مصنوعی برای انتخاب بهترین حرکت ربات
const evaluateBackgammonBotMove = (move, board, color) => {
    let score = 0;
    if (move.to === 'off')
        score += 120;
    if (move.isHit)
        score += 80;
    if (typeof move.to === 'number') {
        const dest = board[move.to];
        if (dest.color === color && dest.count === 1)
            score += 45;
    }
    if (typeof move.from === 'number' && board[move.from].count === 1)
        score += 25;
    if (typeof move.to === 'number')
        score += 5;
    return score;
};
const BackgammonPoint = React.memo(({ index, isTop, count, color, isTarget, isSelected, onPointClick }) => {
    const pt = { count, color };
    const isEven = index % 2 === 0;
    const triBg = isEven
        ? 'from-amber-900/60 via-amber-950/70 to-slate-950/80 border-amber-700/30'
        : 'from-amber-600/40 via-yellow-700/40 to-slate-900/80 border-amber-400/20';
    return (React.createElement("div", { key: index, "data-bg-location": `point-${index}`, role: "button", tabIndex: 0, "aria-label": `خانه ${index + 1}، ${pt.count} مهره${isTarget ? '، مقصد مجاز' : ''}`, onClick: () => onPointClick(index), onKeyDown: event => { if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onPointClick(index);
        } }, className: `gq-bg-point ${isTop ? 'gq-bg-point--top' : 'gq-bg-point--bottom'} ${isTarget ? 'gq-bg-point--target' : ''} ${isSelected ? 'gq-bg-point--selected' : ''} relative flex-1 flex flex-col items-center justify-between cursor-pointer transition-all duration-200 select-none ${isTop ? 'flex-col' : 'flex-col-reverse'} ${isTarget ? 'bg-emerald-500/20 ring-2 ring-emerald-400/80' : ''} ${isSelected ? 'ring-2 ring-amber-400 bg-amber-500/25' : ''}` },
        React.createElement("div", { className: `absolute inset-x-0 ${isTop ? 'top-0' : 'bottom-0'} h-full bg-gradient-to-b ${triBg} border-x pointer-events-none opacity-85`, style: {
                clipPath: isTop
                    ? 'polygon(0% 0%, 100% 0%, 50% 100%)'
                    : 'polygon(50% 0%, 100% 100%, 0% 100%)'
            } }),
        React.createElement("span", { className: `gq-bg-point-number relative z-10 text-[9px] font-black font-mono px-1 rounded ${isTop ? 'mt-1' : 'mb-1'} ${isTarget ? 'text-emerald-300 font-black' : 'text-slate-400/80'}` }, index + 1),
        React.createElement("div", { className: `gq-bg-stack relative z-20 flex flex-col items-center gap-0.5 w-full py-1 ${isTop ? 'justify-start' : 'justify-end'}` }, Array.from({ length: Math.min(pt.count, 5) }).map((_, cIdx) => (React.createElement("div", { key: cIdx, "data-bg-checker": pt.color, "data-bg-aggregate": cIdx === 4 && pt.count > 5 ? 'true' : undefined, className: `gq-bg-checker gq-bg-checker--${pt.color} w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center font-black text-xs shadow-lg transform transition-transform hover:scale-110 ${pt.color === 'white'
                ? 'bg-gradient-to-br from-amber-100 via-amber-200 to-yellow-500 border-white text-slate-900 shadow-amber-950/40'
                : 'bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 border-indigo-400/80 text-white shadow-black/80'}` }, cIdx === 4 && pt.count > 5 ? (React.createElement("span", { className: "text-[11px] font-black" }, pt.count)) : (React.createElement("span", { className: "opacity-40 text-[10px]" }, "\u25CF")))))),
        isTarget && (React.createElement("div", { className: "gq-bg-target-marker relative z-30 mb-2 flex items-center justify-center", "aria-hidden": "true" },
            React.createElement("span", { className: "w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping absolute" }),
            React.createElement("span", { className: "w-2.5 h-2.5 rounded-full bg-emerald-300 relative border border-white" })))));
});
const BackgammonTurnClock = ({ turn, playerWhiteName, playerBlackName, paused, resetKey, onTimeout }) => {
    const [turnTimeLeft, setTurnTimeLeft] = useState(40);
    const timeoutRef = useRef(onTimeout);
    timeoutRef.current = onTimeout;
    useEffect(() => {
        setTurnTimeLeft(40);
        if (paused)
            return;
        let deadline = Date.now() + 40000;
        const interval = setInterval(() => {
            const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
            if (seconds === 0) {
                deadline = Date.now() + 40000;
                setTurnTimeLeft(40);
                timeoutRef.current();
            }
            else {
                setTurnTimeLeft(seconds);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [turn, paused, resetKey]);
    return (React.createElement("div", { className: `gq-bg-turn-label ${turnTimeLeft <= 10 ? 'gq-bg-turn-label--urgent' : ''} flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900/90 border border-slate-700/80` },
        React.createElement("span", { className: "w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" }),
        React.createElement("span", { className: "text-xs font-bold text-slate-300" }, "\u0646\u0648\u0628\u062A:"),
        React.createElement("b", { className: `text-xs font-black ${turn === 'white' ? 'text-amber-300' : 'text-indigo-300'}` }, turn === 'white' ? playerWhiteName : playerBlackName),
        React.createElement("span", { className: "font-mono text-xs font-black text-amber-400 mr-2 border-r border-slate-700 pr-2" },
            "\u23F1 ",
            turnTimeLeft,
            "s")));
};
const BackgammonDicePair = ({ isRolling, dice, renderCustomDice }) => {
    const [rollValues, setRollValues] = useState([3, 5]);
    useEffect(() => {
        if (!isRolling)
            return;
        let ticks = 0;
        const interval = setInterval(() => {
            setRollValues([
                Math.floor(Math.random() * 6) + 1,
                Math.floor(Math.random() * 6) + 1
            ]);
            ticks++;
            if (ticks >= 9)
                clearInterval(interval);
        }, 65);
        return () => clearInterval(interval);
    }, [isRolling]);
    const displayDice = isRolling ? rollValues : (dice || [3, 4]);
    return (React.createElement("div", { className: "flex items-center gap-1 sm:gap-4" }, [0, 1].map(index => (React.createElement("div", { key: index, className: `gq-bg-die w-7 h-7 sm:w-12 sm:h-12 shrink-0 transition-transform ${isRolling ? `bg-dice-tumbling-${index + 1}` : 'hover:scale-110'}` }, typeof renderCustomDice === 'function' ? (renderCustomDice(displayDice[index], 'wood')) : (React.createElement("div", { className: "w-full h-full rounded-2xl bg-amber-200 border-2 border-amber-700 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg" }, displayDice[index])))))));
};
// ============================================================================
// کامپوننت اصلی تخته نرد
// ============================================================================
const BackgammonGame = ({ currentUser, matchType = 'online', onExit, onGameFinished, matchId, matchParticipants, onOpenProfile, setIsInGame, onUserUpdated, onNavigateToGames }) => {
    // تعیین نقش بازیکن من در مسابقه آنلاین
    const myPlayerIndex = matchParticipants
        ? matchParticipants.findIndex(p => p.toLowerCase() === currentUser.username.toLowerCase())
        : 0;
    // بازیکن ۱ سفید و بازیکن ۲ سیاه است
    const myColor = (matchType === 'online' && myPlayerIndex === 1) ? 'black' : 'white';
    const peerName = matchParticipants
        ? (myPlayerIndex === 0 ? matchParticipants[1] : matchParticipants[0])
        : 'حریف هوش مصنوعی';
    const playerWhiteName = matchParticipants ? matchParticipants[0] : currentUser.username;
    const playerBlackName = matchParticipants ? (matchParticipants[1] || 'هوش مصنوعی') : 'هوش مصنوعی';
    // وضعیت‌های اصلی بازی
    const [showIntro, setShowIntro] = useState(true);
    const [board, setBoard] = useState(createInitialBackgammonBoard);
    const [bar, setBar] = useState({ white: 0, black: 0 });
    const [bornOff, setBornOff] = useState({ white: 0, black: 0 });
    const [turn, setTurn] = useState('white');
    const [isOpeningRoll, setIsOpeningRoll] = useState(true);
    const [dice, setDice] = useState(null);
    const [movesLeft, setMovesLeft] = useState([]);
    const [isRolling, setIsRolling] = useState(false);
    const [selectedFrom, setSelectedFrom] = useState(null); // 'bar' یا شماره خانه ۰ تا ۲۳
    const [winnerResult, setWinnerResult] = useState(null);
    const [turnClockReset, setTurnClockReset] = useState(0);
    const [timeoutWarnings, setTimeoutWarnings] = useState({ white: 0, black: 0 });
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [currentMatchId, setCurrentMatchId] = useState(matchId);
    const [cubeValue, setCubeValue] = useState(1);
    const [cubeOwner, setCubeOwner] = useState(null);
    const [pendingDouble, setPendingDouble] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [moveNotice, setMoveNotice] = useState(null);
    // رفرنس‌ها
    const boardRef = useRef(board);
    boardRef.current = board;
    const barRef = useRef(bar);
    barRef.current = bar;
    const bornOffRef = useRef(bornOff);
    bornOffRef.current = bornOff;
    const turnRef = useRef(turn);
    turnRef.current = turn;
    const movesLeftRef = useRef(movesLeft);
    movesLeftRef.current = movesLeft;
    const winnerRef = useRef(winnerResult);
    winnerRef.current = winnerResult;
    const isRollingRef = useRef(isRolling);
    isRollingRef.current = isRolling;
    const timeoutWarningsRef = useRef(timeoutWarnings);
    timeoutWarningsRef.current = timeoutWarnings;
    const processedMsgIds = useRef(new Set());
    const isBotMovingRef = useRef(false);
    const boardElementRef = useRef(null);
    const motionLayerRef = useRef(null);
    const motionCleanupRef = useRef(new Set());
    const motionFramesRef = useRef(new Set());
    const noticeTimerRef = useRef(null);
    useEffect(() => {
        const clearMotion = () => {
            motionFramesRef.current.forEach(cancelAnimationFrame);
            motionFramesRef.current.clear();
            motionCleanupRef.current.forEach(cleanup => cleanup());
            motionCleanupRef.current.clear();
        };
        const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
        motionPreference.addEventListener?.('change', clearMotion);
        window.addEventListener('resize', clearMotion);
        return () => {
            window.removeEventListener('resize', clearMotion);
            motionPreference.removeEventListener?.('change', clearMotion);
            clearMotion();
            clearTimeout(noticeTimerRef.current);
        };
    }, []);
    useEffect(() => {
        if (!isExpanded)
            return;
        const previousOverflow = document.body.style.overflow;
        const handleEscape = event => {
            if (event.key === 'Escape')
                setIsExpanded(false);
        };
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isExpanded]);
    const animateCheckerMove = (move, color, isHit) => {
        const boardElement = boardElementRef.current;
        const layer = motionLayerRef.current;
        if (!boardElement || !layer || document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
            return;
        const location = (position, owner) => boardElement.querySelector(`[data-bg-location="${typeof position === 'number' ? `point-${position}` : `${position}-${owner}`}"]`);
        const checker = element => element?.querySelector('[data-bg-checker]:last-child') || element;
        const source = checker(location(move.from, color));
        if (!source)
            return;
        const sourceRect = source.getBoundingClientRect();
        const capturedRect = isHit ? checker(location(move.to, color))?.getBoundingClientRect() : null;
        const opponent = color === 'white' ? 'black' : 'white';
        const frame = requestAnimationFrame(() => {
            motionFramesRef.current.delete(frame);
            if (!layer.isConnected || typeof layer.animate !== 'function')
                return;
            const destination = checker(location(move.to, color));
            const hitTarget = isHit ? location('bar', opponent) : null;
            const hitChecker = hitTarget ? checker(hitTarget) : null;
            if (!destination)
                return;
            const layerRect = layer.getBoundingClientRect();
            const destinationRect = destination.getBoundingClientRect();
            const hitRect = hitChecker?.getBoundingClientRect();
            const fly = (originRect, target, targetRect, owner, delay, isBearOff) => {
                const size = Math.min(36, Math.max(20, sourceRect.width));
                const deltaX = targetRect.left + targetRect.width / 2 - originRect.left - originRect.width / 2;
                const deltaY = targetRect.top + targetRect.height / 2 - originRect.top - originRect.height / 2;
                const lift = Math.min(48, Math.max(20, Math.hypot(deltaX, deltaY) * 0.15));
                const piece = document.createElement('div');
                piece.className = `gq-bg-flying-checker gq-bg-checker--${owner}`;
                piece.style.cssText = `width:${size}px;height:${size}px;left:${originRect.left + originRect.width / 2 - layerRect.left - size / 2}px;top:${originRect.top + originRect.height / 2 - layerRect.top - size / 2}px;`;
                piece.setAttribute('aria-hidden', 'true');
                layer.appendChild(piece);
                const hidesChecker = target?.hasAttribute('data-bg-checker') && !target.hasAttribute('data-bg-aggregate');
                const token = { visibility: target.bgMotionToken ? target.bgMotionToken.visibility : target.style.visibility };
                if (hidesChecker) {
                    target.bgMotionToken = token;
                    target.style.visibility = 'hidden';
                }
                const animation = piece.animate([
                    { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1, offset: 0 },
                    { transform: `translate3d(${deltaX * 0.48}px, ${deltaY * 0.48 - lift}px, 0) scale(1.14) rotate(${owner === 'white' ? 12 : -12}deg)`, opacity: 1, offset: 0.48 },
                    { transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${isBearOff ? 0.75 : 0.94})`, opacity: isBearOff ? 0.3 : 1, offset: 0.88 },
                    { transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${isBearOff ? 0.5 : 1})`, opacity: isBearOff ? 0 : 1, offset: 1 }
                ], { duration: isBearOff ? 520 : 440, delay, easing: 'cubic-bezier(.22,.65,.3,1)', fill: 'both' });
                const cleanup = () => {
                    if (target.bgMotionToken === token) {
                        target.style.visibility = token.visibility;
                        delete target.bgMotionToken;
                    }
                    animation.cancel();
                    piece.remove();
                    motionCleanupRef.current.delete(cleanup);
                };
                motionCleanupRef.current.add(cleanup);
                animation.onfinish = cleanup;
                const impact = document.createElement('div');
                impact.className = `gq-bg-impact ${isHit ? 'gq-bg-impact--hit' : isBearOff ? 'gq-bg-impact--off' : ''}`;
                impact.style.cssText = `left:${targetRect.left + targetRect.width / 2 - layerRect.left}px;top:${targetRect.top + targetRect.height / 2 - layerRect.top}px;animation-delay:${delay + 360}ms;`;
                if (isHit || isBearOff) {
                    for (let particleIndex = 0; particleIndex < 6; particleIndex++) {
                        const particle = document.createElement('span');
                        const angle = particleIndex * Math.PI / 3;
                        particle.style.cssText = `--spark-x:${Math.cos(angle) * 32}px;--spark-y:${Math.sin(angle) * 32}px;animation-delay:${delay + 360}ms;`;
                        impact.appendChild(particle);
                    }
                }
                layer.appendChild(impact);
                const clearImpact = () => { impact.remove(); motionCleanupRef.current.delete(clearImpact); };
                motionCleanupRef.current.add(clearImpact);
                impact.addEventListener('animationend', event => { if (event.target === impact)
                    clearImpact(); });
            };
            fly(sourceRect, destination, destinationRect, color, 0, move.to === 'off');
            if (capturedRect && hitRect && hitChecker)
                fly(capturedRect, hitChecker, hitRect, opponent, 260, false);
            if (motionCleanupRef.current.size > 24)
                [...motionCleanupRef.current].slice(0, 4).forEach(cleanup => cleanup());
        });
        motionFramesRef.current.add(frame);
    };
    // هماهنگی با وضعیت درون بازی
    useEffect(() => {
        if (setIsInGame)
            setIsInGame(!winnerResult && !showIntro);
    }, [winnerResult, showIntro, setIsInGame]);
    // ذخیره پیام‌های قبلی مسابقه آنلاین
    useEffect(() => {
        if (currentMatchId) {
            const msgs = getMessages().filter(m => m.matchId === currentMatchId);
            msgs.forEach(m => processedMsgIds.current.add(m.id));
        }
    }, [currentMatchId]);
    // اطلاع‌رسانی خروج در صورت بستن ناگهانی پنجره یا برگه مرورگر
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (matchType === 'online' && currentMatchId && !winnerRef.current) {
                sendMessage(currentUser.username, '__ABANDON__' + currentUser.username, peerName, currentMatchId);
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [matchType, currentMatchId, currentUser.username, peerName]);
    // ارسال پیام عملیات آنلاین
    const sendOnlineAction = (actionData) => {
        if (matchType !== 'online' || !currentMatchId)
            return;
        const msg = sendMessage(currentUser.username, `__ACTION__${JSON.stringify(actionData)}`, peerName, currentMatchId);
        if (msg)
            processedMsgIds.current.add(msg.id);
        window.dispatchEvent(new Event('storage'));
    };
    // خروج قطعی از بازی با اطلاع‌رسانی ترک مسابقه
    const confirmExit = () => {
        setShowExitConfirm(false);
        if (matchType === 'online' && currentMatchId) {
            sendMessage(currentUser.username, '__ABANDON__' + currentUser.username, peerName, currentMatchId);
            window.dispatchEvent(new Event('storage'));
        }
        onExit();
    };
    // پایان نوبت و واگذاری به بازیکن بعدی
    const handlePassTurn = () => {
        setSelectedFrom(null);
        setDice(null);
        setMovesLeft([]);
        const nextTurn = turnRef.current === 'white' ? 'black' : 'white';
        turnRef.current = nextTurn;
        setTurn(nextTurn);
        setTurnClockReset(reset => reset + 1);
        if (matchType === 'online') {
            sendOnlineAction({ type: 'END_TURN', nextTurn });
        }
    };
    const handleTurnTimeout = (timedOutColor, fromRemote) => {
        const nextWarnings = { ...timeoutWarningsRef.current, [timedOutColor]: timeoutWarningsRef.current[timedOutColor] + 1 };
        timeoutWarningsRef.current = nextWarnings;
        setTimeoutWarnings(nextWarnings);
        showToast({
            id: `bg-timeout-${timedOutColor}-${nextWarnings[timedOutColor]}`,
            type: 'warning',
            title: 'زمان نوبت تمام شد',
            text: nextWarnings[timedOutColor] >= 3 ? 'با سومین اخطار، بازیکن از بازی حذف می‌شود.' : `اخطار ${nextWarnings[timedOutColor]} از ۳؛ نوبت به حریف می‌رسد.`,
            duration: 3200
        });
        if (!fromRemote && matchType === 'online') {
            sendOnlineAction({ type: 'TIMEOUT', player: timedOutColor });
        }
        if (nextWarnings[timedOutColor] >= 3) {
            const winnerColor = timedOutColor === 'white' ? 'black' : 'white';
            handleVictory(winnerColor, barRef.current, boardRef.current, bornOffRef.current, 'اخطار سوم زمان');
            return true;
        }
        if (!fromRemote)
            handlePassTurn();
        return false;
    };
    // اعمال یک حرکت مشخص روی تخته
    const applyMove = (move, playerColor) => {
        const allowedMoves = getAllLegalMoves(boardRef.current, barRef.current, bornOffRef.current, playerColor, movesLeftRef.current);
        if (!allowedMoves.some(candidate => candidate.from === move.from && candidate.to === move.to && candidate.die === move.die))
            return false;
        const nextBoard = boardRef.current.map(p => ({ ...p }));
        const nextBar = { ...barRef.current };
        const nextBornOff = { ...bornOffRef.current };
        const oppColor = playerColor === 'white' ? 'black' : 'white';
        const isHit = typeof move.to === 'number' && nextBoard[move.to].color === oppColor && nextBoard[move.to].count === 1;
        animateCheckerMove(move, playerColor, isHit);
        setMoveNotice({ color: playerColor, text: isHit ? 'مهرهٔ حریف زده شد!' : move.to === 'off' ? 'یک مهره به خانه رسید!' : `${move.die} خانه حرکت`, id: Date.now() });
        clearTimeout(noticeTimerRef.current);
        noticeTimerRef.current = setTimeout(() => setMoveNotice(null), 1500);
        // ۱. کاهش مهره از مبدأ
        if (move.from === 'bar') {
            nextBar[playerColor] = Math.max(0, nextBar[playerColor] - 1);
        }
        else if (typeof move.from === 'number') {
            nextBoard[move.from].count -= 1;
            if (nextBoard[move.from].count <= 0) {
                nextBoard[move.from].color = null;
                nextBoard[move.from].count = 0;
            }
        }
        // ۲. انتقال به مقصد
        if (move.to === 'off') {
            nextBornOff[playerColor] += 1;
            try {
                playSound('coin', currentUser.settings?.sound);
            }
            catch (e) { }
        }
        else if (typeof move.to === 'number') {
            const dest = nextBoard[move.to];
            if (dest.color === oppColor && dest.count === 1) {
                nextBar[oppColor] += 1;
                dest.color = playerColor;
                dest.count = 1;
                try {
                    playSound('capture', currentUser.settings?.sound);
                }
                catch (e) { }
            }
            else {
                dest.color = playerColor;
                dest.count += 1;
                try {
                    playSound('move', currentUser.settings?.sound);
                }
                catch (e) { }
            }
        }
        // ۳. حذف تاس استفاده شده
        const nextMovesLeft = [...movesLeftRef.current];
        const usedIdx = nextMovesLeft.indexOf(move.die);
        if (usedIdx >= 0)
            nextMovesLeft.splice(usedIdx, 1);
        boardRef.current = nextBoard;
        barRef.current = nextBar;
        bornOffRef.current = nextBornOff;
        movesLeftRef.current = nextMovesLeft;
        setBoard(nextBoard);
        setBar(nextBar);
        setBornOff(nextBornOff);
        setMovesLeft(nextMovesLeft);
        setSelectedFrom(null);
        // ۴. بررسی پیروزی
        if (nextBornOff[playerColor] === 15) {
            handleVictory(playerColor, nextBar, nextBoard, nextBornOff);
            return true;
        }
        // ۵. اگر تاس‌ها تمام شد یا حرکت دیگری ممکن نیست، نوبت عوض شود
        if (nextMovesLeft.length === 0) {
            handlePassTurn();
        }
        else {
            const remainingLegal = getAllLegalMoves(nextBoard, nextBar, nextBornOff, playerColor, nextMovesLeft);
            if (remainingLegal.length === 0) {
                showToast({
                    id: 'bg-no-moves',
                    type: 'info',
                    title: 'حرکت مجازی وجود ندارد',
                    text: 'نوبت شما سپری شد.',
                    duration: 2500
                });
                setTimeout(handlePassTurn, 650);
            }
        }
        return true;
    };
    // پرتاب تاس روان و زنده با انیمیشن چرخش سه‌بعدی
    const rollDice = () => {
        if (isRolling || movesLeft.length > 0 || !!winnerResult || pendingDouble)
            return;
        if (matchType === 'bot' && turn !== 'white')
            return;
        if (matchType === 'online' && turn !== myColor)
            return;
        setIsRolling(true);
        isRollingRef.current = true;
        try {
            playSound('dice', currentUser.settings?.sound);
        }
        catch (e) { }
        let ticks = 0;
        const tickInterval = setInterval(() => {
            ticks++;
            if (ticks >= 9) {
                clearInterval(tickInterval);
                const d1 = Math.floor(Math.random() * 6) + 1;
                const d2 = Math.floor(Math.random() * 6) + 1;
                const rolled = [d1, d2];
                if (isOpeningRoll && d1 === d2) {
                    setDice(null);
                    setMovesLeft([]);
                    movesLeftRef.current = [];
                    setIsRolling(false);
                    isRollingRef.current = false;
                    showToast({ id: 'bg-opening-tie', type: 'info', title: 'رول آغازین مساوی شد', text: 'هر دو تاس دوباره انداخته می‌شوند.', duration: 2200 });
                    if (matchType === 'online')
                        sendOnlineAction({ type: 'ROLL', opening: true, openingTie: true, dice: rolled });
                    return;
                }
                const firstTurn = isOpeningRoll ? (d1 > d2 ? 'white' : 'black') : turnRef.current;
                if (isOpeningRoll) {
                    turnRef.current = firstTurn;
                    setTurn(firstTurn);
                    setIsOpeningRoll(false);
                }
                const diceMoves = (d1 === d2) ? [d1, d1, d1, d1] : [d1, d2];
                setDice(rolled);
                setMovesLeft(diceMoves);
                movesLeftRef.current = diceMoves;
                setIsRolling(false);
                isRollingRef.current = false;
                try {
                    playSound('tick', currentUser.settings?.sound);
                }
                catch (e) { }
                if (matchType === 'online') {
                    sendOnlineAction({ type: 'ROLL', dice: rolled, moves: diceMoves, opening: isOpeningRoll, firstTurn });
                }
                // اگر با این تاس‌ها هیچ حرکتی ممکن نبود، تعویض نوبت
                const legal = getAllLegalMoves(boardRef.current, barRef.current, bornOffRef.current, turnRef.current, diceMoves);
                if (legal.length === 0) {
                    showToast({
                        id: 'bg-no-initial-moves',
                        type: 'info',
                        title: 'تاس بدون حرکت',
                        text: 'با این تاس‌ها هیچ حرکتی ممکن نیست؛ نوبت تعویض می‌شود.',
                        duration: 3000
                    });
                    setTimeout(handlePassTurn, 1000);
                }
            }
        }, 65);
    };
    // ثبت پیروزی و محاسبه ضریب پاداش (برد ساده، مارس، مارس سیاه یا خروج حریف)
    const handleVictory = (winnerColor, finalBar, finalBoard, finalBornOff, reason = null) => {
        if (winnerRef.current)
            return;
        const loserColor = winnerColor === 'white' ? 'black' : 'white';
        let winType = 'simple';
        let multiplier = 1;
        if (reason === 'خروج حریف') {
            winType = 'simple';
            multiplier = 1;
        }
        else if (finalBornOff[loserColor] === 0) {
            const hasOnBar = finalBar[loserColor] > 0;
            let hasInWinnerHome = false;
            if (winnerColor === 'white') {
                for (let i = 0; i <= 5; i++) {
                    if (finalBoard[i].color === 'black' && finalBoard[i].count > 0) {
                        hasInWinnerHome = true;
                        break;
                    }
                }
            }
            else {
                for (let i = 18; i <= 23; i++) {
                    if (finalBoard[i].color === 'white' && finalBoard[i].count > 0) {
                        hasInWinnerHome = true;
                        break;
                    }
                }
            }
            if (hasOnBar || hasInWinnerHome) {
                winType = 'backgammon'; // مارس سیاه (۳ برابر)
                multiplier = 3;
            }
            else {
                winType = 'gammon'; // مارس (۲ برابر)
                multiplier = 2;
            }
        }
        if (reason === 'رد پیشنهاد دوبرابر' || reason === 'اخطار سوم زمان') {
            winType = 'simple';
            multiplier = 1;
        }
        const totalReward = BACKGAMMON_REWARD_BASE * multiplier * cubeValue;
        const res = { winner: winnerColor, type: winType, reward: totalReward, reason };
        setWinnerResult(res);
        winnerRef.current = res;
        const isMeWinner = (matchType === 'bot' && winnerColor === 'white') ||
            (matchType === 'online' && winnerColor === myColor);
        try {
            if (isMeWinner) {
                playSound(winType === 'simple' ? 'win' : 'jackpot', currentUser.settings?.sound);
            }
        }
        catch (e) { }
        if (onGameFinished) {
            onGameFinished(isMeWinner, 'backgammon', matchType === 'online');
        }
    };
    // کنترل هوش مصنوعی در بازی با ربات
    useEffect(() => {
        if (matchType !== 'bot' || turn !== 'black' || !!winnerResult || showIntro)
            return;
        if (isBotMovingRef.current)
            return;
        // گام ۱: پرتاب تاس ربات با شبیه‌سازی انیمیشن
        if (movesLeft.length === 0 && !isRolling) {
            isBotMovingRef.current = true;
            const timer = setTimeout(() => {
                setIsRolling(true);
                try {
                    playSound('dice', currentUser.settings?.sound);
                }
                catch (e) { }
                let ticks = 0;
                const botTick = setInterval(() => {
                    ticks++;
                    if (ticks >= 8) {
                        clearInterval(botTick);
                        const d1 = Math.floor(Math.random() * 6) + 1;
                        const d2 = Math.floor(Math.random() * 6) + 1;
                        const rolled = [d1, d2];
                        const diceMoves = (d1 === d2) ? [d1, d1, d1, d1] : [d1, d2];
                        setDice(rolled);
                        setMovesLeft(diceMoves);
                        movesLeftRef.current = diceMoves;
                        setIsRolling(false);
                        isBotMovingRef.current = false;
                    }
                }, 60);
            }, 600);
            return () => clearTimeout(timer);
        }
        // گام ۲: انجام حرکات متوالی ربات با مکث طبیعی
        if (movesLeft.length > 0 && !isRolling) {
            isBotMovingRef.current = true;
            const botTimer = setTimeout(() => {
                const legal = getAllLegalMoves(boardRef.current, barRef.current, bornOffRef.current, 'black', movesLeftRef.current);
                if (legal.length === 0) {
                    isBotMovingRef.current = false;
                    handlePassTurn();
                    return true;
                }
                let bestMove = legal[0];
                let bestScore = -Infinity;
                for (let m of legal) {
                    const s = evaluateBackgammonBotMove(m, boardRef.current, 'black');
                    if (s > bestScore) {
                        bestScore = s;
                        bestMove = m;
                    }
                }
                applyMove(bestMove, 'black');
                isBotMovingRef.current = false;
            }, 600);
            return () => clearTimeout(botTimer);
        }
    }, [turn, movesLeft.length, isRolling, matchType, winnerResult, showIntro]);
    // شنود پیام‌های بازی آنلاین و خروج حریف
    useEffect(() => {
        if (matchType !== 'online' || !currentMatchId || !!winnerResult)
            return;
        let lastMessageSnapshot;
        const handleSync = () => {
            const snapshot = localStorage.getItem(MESSAGES_KEY);
            if (snapshot === lastMessageSnapshot)
                return;
            const msgs = getMessages().filter(m => m.matchId === currentMatchId);
            // ۱. بررسی فوری خروج یا تسلیم حریف (__ABANDON__)
            const abandonMsgs = msgs.filter(m => m.text.startsWith('__ABANDON__'));
            if (abandonMsgs.length > 0 && !winnerRef.current) {
                const leavers = abandonMsgs.map(m => m.text.replace('__ABANDON__', ''));
                if (leavers.some(l => l.toLowerCase() !== currentUser.username.toLowerCase())) {
                    handleVictory(myColor, barRef.current, boardRef.current, bornOffRef.current, 'خروج حریف');
                    return;
                }
            }
            // ۲. دریافت پیام‌های اکشن جدید از حریف
            const opponentMsgs = msgs.filter(m => m.senderUsername?.toLowerCase() !== currentUser.username.toLowerCase() &&
                !processedMsgIds.current.has(m.id)).sort((left, right) => new Date(left.createdAt || 0) - new Date(right.createdAt || 0));
            for (let msg of opponentMsgs) {
                if (!msg.text.startsWith('__ACTION__'))
                    continue;
                try {
                    const action = JSON.parse(msg.text.replace('__ACTION__', ''));
                    if (action.type === 'ROLL') {
                        processedMsgIds.current.add(msg.id);
                        turnRef.current = action.opening && !action.openingTie ? action.firstTurn : turnRef.current;
                        if (action.opening && !action.openingTie) {
                            setTurn(action.firstTurn);
                            setIsOpeningRoll(false);
                        }
                        if (action.openingTie) {
                            setDice(null);
                            setMovesLeft([]);
                            movesLeftRef.current = [];
                            setIsRolling(false);
                            isRollingRef.current = false;
                            continue;
                        }
                        const receivedMoves = action.moves || (action.dice?.[0] === action.dice?.[1]
                            ? [action.dice[0], action.dice[0], action.dice[0], action.dice[0]]
                            : action.dice || []);
                        setDice(action.dice);
                        setMovesLeft(receivedMoves);
                        movesLeftRef.current = receivedMoves;
                        setTurnClockReset(reset => reset + 1);
                        setIsRolling(true);
                        isRollingRef.current = true;
                        try {
                            playSound('dice', currentUser.settings?.sound);
                        }
                        catch (e) { }
                        setTimeout(() => {
                            setIsRolling(false);
                            isRollingRef.current = false;
                            try {
                                playSound('tick', currentUser.settings?.sound);
                            }
                            catch (e) { }
                        }, 500);
                    }
                    else if (action.type === 'MOVE') {
                        if (isRollingRef.current)
                            break;
                        processedMsgIds.current.add(msg.id);
                        applyMove(action.move, turnRef.current);
                    }
                    else if (action.type === 'END_TURN') {
                        processedMsgIds.current.add(msg.id);
                        setDice(null);
                        setMovesLeft([]);
                        movesLeftRef.current = [];
                        turnRef.current = action.nextTurn;
                        setTurn(action.nextTurn);
                        setSelectedFrom(null);
                        setTurnClockReset(reset => reset + 1);
                    }
                    else if (action.type === 'DOUBLE_OFFER') {
                        processedMsgIds.current.add(msg.id);
                        setPendingDouble({ from: action.from, value: action.value });
                    }
                    else if (action.type === 'DOUBLE_ACCEPT') {
                        processedMsgIds.current.add(msg.id);
                        setCubeValue(action.value);
                        setCubeOwner(action.owner);
                        setPendingDouble(null);
                    }
                    else if (action.type === 'DOUBLE_DROP') {
                        processedMsgIds.current.add(msg.id);
                        setPendingDouble(null);
                        handleVictory(action.winner, barRef.current, boardRef.current, bornOffRef.current, 'رد پیشنهاد دوبرابر');
                    }
                    else if (action.type === 'TIMEOUT') {
                        processedMsgIds.current.add(msg.id);
                        if (handleTurnTimeout(action.player, true))
                            break;
                    }
                }
                catch (e) { }
            }
            if (!isRollingRef.current)
                lastMessageSnapshot = snapshot;
        };
        const syncInterval = setInterval(handleSync, 500);
        window.addEventListener('storage', handleSync);
        return () => {
            clearInterval(syncInterval);
            window.removeEventListener('storage', handleSync);
        };
    }, [matchType, currentMatchId, winnerResult, currentUser.username, myColor]);
    // انتخاب مهره توسط بازیکن و اعمال حرکت
    const handlePointClick = (pointIdx) => {
        if (showIntro || !!winnerResult || isRolling)
            return;
        if (matchType === 'bot' && turn !== 'white')
            return;
        if (matchType === 'online' && turn !== myColor)
            return;
        if (movesLeft.length === 0) {
            showToast({ id: 'bg-roll-first', type: 'info', text: 'ابتدا تاس را بیندازید.', duration: 2000 });
            return;
        }
        const playableMoves = getAllLegalMoves(board, bar, bornOff, myColor, movesLeft);
        if (bar[myColor] > 0 && selectedFrom !== 'bar') {
            setSelectedFrom('bar');
            return;
        }
        if (selectedFrom !== null) {
            const candidateMoves = playableMoves.filter(move => move.from === selectedFrom);
            const chosen = candidateMoves.find(m => m.to === pointIdx);
            if (chosen) {
                applyMove(chosen, myColor);
                if (matchType === 'online') {
                    sendOnlineAction({ type: 'MOVE', move: chosen });
                }
                return;
            }
        }
        const targetPt = board[pointIdx];
        if (targetPt.color === myColor && targetPt.count > 0) {
            const legalMoves = playableMoves.filter(move => move.from === pointIdx);
            if (legalMoves.length > 0) {
                setSelectedFrom(pointIdx);
                try {
                    playSound('tick', currentUser.settings?.sound);
                }
                catch (e) { }
            }
            else {
                showToast({ id: 'bg-no-checker-moves', type: 'info', text: 'این مهره با تاس‌های فعلی حرکتی ندارد.', duration: 2000 });
            }
        }
        else {
            setSelectedFrom(null);
        }
    };
    // کلیک روی پیشخوان (Bar)
    const handleBarClick = (barColor) => {
        if (showIntro || !!winnerResult || isRolling || (matchType === 'bot' && turn !== 'white') || (matchType === 'online' && turn !== myColor))
            return;
        if (barColor !== myColor || bar[myColor] <= 0)
            return;
        if (!getAllLegalMoves(board, bar, bornOff, myColor, movesLeft).some(move => move.from === 'bar'))
            return;
        setSelectedFrom('bar');
        try {
            playSound('tick', currentUser.settings?.sound);
        }
        catch (e) { }
    };
    // کلیک روی سینی برداشت مهره (Bear Off Tray)
    const handleBearOffClick = () => {
        if (showIntro || !!winnerResult || isRolling || pendingDouble || selectedFrom === null)
            return;
        if ((matchType === 'bot' && turn !== 'white') || (matchType === 'online' && turn !== myColor))
            return;
        const candidateMoves = getAllLegalMoves(board, bar, bornOff, myColor, movesLeft).filter(move => move.from === selectedFrom);
        const bearOffMove = candidateMoves.find(m => m.to === 'off');
        if (bearOffMove) {
            applyMove(bearOffMove, myColor);
            if (matchType === 'online') {
                sendOnlineAction({ type: 'MOVE', move: bearOffMove });
            }
        }
    };
    const offerDouble = () => {
        if (showIntro || winnerResult || pendingDouble || isOpeningRoll || dice || movesLeft.length || turn !== myColor)
            return;
        if (cubeOwner && cubeOwner !== myColor)
            return;
        const offer = { from: myColor, value: cubeValue };
        setPendingDouble(offer);
        if (matchType === 'online')
            sendOnlineAction({ type: 'DOUBLE_OFFER', from: myColor, value: cubeValue });
    };
    const acceptDouble = () => {
        if (!pendingDouble || pendingDouble.from === myColor)
            return;
        const nextValue = cubeValue * 2;
        setCubeValue(nextValue);
        setCubeOwner(myColor);
        setPendingDouble(null);
        if (matchType === 'online')
            sendOnlineAction({ type: 'DOUBLE_ACCEPT', value: nextValue, owner: myColor });
    };
    const declineDouble = () => {
        if (!pendingDouble || pendingDouble.from === myColor)
            return;
        const winnerColor = pendingDouble.from;
        setPendingDouble(null);
        if (matchType === 'online')
            sendOnlineAction({ type: 'DOUBLE_DROP', winner: winnerColor });
        handleVictory(winnerColor, barRef.current, boardRef.current, bornOffRef.current, 'رد پیشنهاد دوبرابر');
    };
    useEffect(() => {
        if (matchType !== 'bot' || !pendingDouble || pendingDouble.from !== 'white')
            return;
        const timer = setTimeout(acceptDouble, 500);
        return () => clearTimeout(timer);
    }, [pendingDouble, matchType]);
    // مقصدهای مجاز برای مبدأ فعلی جهت هایلایت بصری
    const activeTargets = useMemo(() => {
        if (selectedFrom === null || movesLeft.length === 0)
            return [];
        return getAllLegalMoves(board, bar, bornOff, myColor, movesLeft).filter(move => move.from === selectedFrom);
    }, [selectedFrom, board, bar, bornOff, myColor, movesLeft]);
    // بازیکنان برای VsIntro
    const playerWhiteAccount = useMemo(() => findUser(playerWhiteName), [playerWhiteName, currentUser]);
    const playerBlackAccount = useMemo(() => findUser(playerBlackName), [playerBlackName, currentUser]);
    const vsPlayers = useMemo(() => [
        {
            key: 'white',
            name: playerWhiteName,
            tag: 'مهره سفید',
            hex: '#f59e0b',
            avatar: playerWhiteAccount?.avatar || '',
            account: playerWhiteAccount,
            wins: playerWhiteAccount?.stats?.wins || 0,
            isMe: currentUser.username.toLowerCase() === playerWhiteName.toLowerCase(),
            isBot: false,
            preview: React.createElement("div", { className: "flex gap-1.5" },
                React.createElement("span", { className: "w-5 h-5 rounded-full bg-amber-100 border-2 border-amber-400 shadow-md" }),
                React.createElement("span", { className: "w-5 h-5 rounded-full bg-amber-100 border-2 border-amber-400 shadow-md" }))
        },
        {
            key: 'black',
            name: playerBlackName,
            tag: 'مهره سیاه',
            hex: '#6366f1',
            avatar: playerBlackAccount?.avatar || '',
            account: playerBlackAccount,
            wins: playerBlackAccount?.stats?.wins || 0,
            isMe: currentUser.username.toLowerCase() === playerBlackName.toLowerCase(),
            isBot: matchType === 'bot',
            preview: React.createElement("div", { className: "flex gap-1.5" },
                React.createElement("span", { className: "w-5 h-5 rounded-full bg-slate-900 border-2 border-indigo-400 shadow-md" }),
                React.createElement("span", { className: "w-5 h-5 rounded-full bg-slate-900 border-2 border-indigo-400 shadow-md" }))
        }
    ], [playerWhiteName, playerBlackName, playerWhiteAccount, playerBlackAccount, currentUser.username, matchType]);
    // رندر یک مثلث خانه تخته
    const pointClickRef = useRef(handlePointClick);
    pointClickRef.current = handlePointClick;
    const onPointClick = useCallback(index => pointClickRef.current(index), []);
    const renderPointTriangle = (index, isTop) => (React.createElement(BackgammonPoint, { key: index, index: index, isTop: isTop, count: board[index].count, color: board[index].color, isTarget: activeTargets.some(move => move.to === index), isSelected: selectedFrom === index, onPointClick: onPointClick }));
    return (React.createElement("div", { className: `gq-backgammon-game ${isExpanded ? 'gq-bg-expanded' : ''} w-full max-w-6xl mx-auto flex flex-col gap-4 p-2 sm:p-4 text-slate-100 select-none animate-in fade-in`, dir: "rtl" },
        React.createElement("style", null, `
                @keyframes bgDiceTumble1 {
                    0% { transform: scale(1) rotate(0deg) translate(0, 0); }
                    25% { transform: scale(1.25) rotate(180deg) translate(-10px, -8px); filter: drop-shadow(0 14px 12px rgba(0,0,0,0.6)); }
                    50% { transform: scale(1.3) rotate(360deg) translate(8px, -12px); filter: drop-shadow(0 18px 18px rgba(0,0,0,0.7)); }
                    75% { transform: scale(1.15) rotate(540deg) translate(-6px, -4px); filter: drop-shadow(0 10px 8px rgba(0,0,0,0.5)); }
                    100% { transform: scale(1) rotate(720deg) translate(0, 0); filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4)); }
                }
                @keyframes bgDiceTumble2 {
                    0% { transform: scale(1) rotate(0deg) translate(0, 0); }
                    25% { transform: scale(1.2) rotate(-160deg) translate(10px, -10px); filter: drop-shadow(0 14px 12px rgba(0,0,0,0.6)); }
                    50% { transform: scale(1.28) rotate(-340deg) translate(-8px, -10px); filter: drop-shadow(0 18px 18px rgba(0,0,0,0.7)); }
                    75% { transform: scale(1.12) rotate(-520deg) translate(6px, -5px); filter: drop-shadow(0 10px 8px rgba(0,0,0,0.5)); }
                    100% { transform: scale(1) rotate(-720deg) translate(0, 0); filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4)); }
                }
                .bg-dice-tumbling-1 {
                    animation: bgDiceTumble1 0.65s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
                }
                .bg-dice-tumbling-2 {
                    animation: bgDiceTumble2 0.65s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
                }
            `),
        showIntro && (React.createElement(VsIntro, { title: "\u062A\u062E\u062A\u0647 \u0646\u0631\u062F \u06A9\u0644\u0627\u0633\u06CC\u06A9", subtitle: "\u0631\u0642\u0627\u0628\u062A \u0647\u0648\u0634\u060C \u0627\u062D\u062A\u0645\u0627\u0644\u0627\u062A \u0648 \u0634\u0627\u0646\u0633 \u0637\u0644\u0627\u06CC\u06CC", players: vsPlayers, onDone: () => setShowIntro(false) })),
        React.createElement("div", { className: "gq-bg-toolbar" },
            React.createElement("div", null,
                React.createElement("span", { className: "gq-bg-toolbar-title" }, "\u062A\u062E\u062A\u0647\u200C\u0646\u0631\u062F"),
                React.createElement("span", { className: "gq-bg-toolbar-hint" }, isOpeningRoll ? 'تاس آغازین، تعیین اولین بازیکن' : 'مهره‌ات را انتخاب کن و به مقصد روشن ببر')),
            React.createElement("button", { type: "button", onClick: () => setIsExpanded(expanded => !expanded), "aria-pressed": isExpanded, className: "gq-bg-expand-button" },
                React.createElement("span", { "aria-hidden": "true" }, isExpanded ? '↙' : '⛶'),
                " ",
                isExpanded ? 'بستن نمای بزرگ' : 'نمای بزرگ')),
        React.createElement("div", { className: "gq-backgammon-header glass-panel p-3 sm:p-4 rounded-3xl flex flex-wrap items-center justify-between gap-3 sm:gap-4 border border-amber-500/30 bg-slate-950/80 shadow-2xl" },
            React.createElement("div", { className: "gq-bg-player-row flex items-center gap-2 sm:gap-6" },
                React.createElement("div", { className: `gq-bg-player-card ${turn === 'white' ? 'gq-bg-player-card--active' : ''} flex items-center gap-3 p-2 rounded-2xl transition-all ${turn === 'white' ? 'bg-amber-500/20 ring-2 ring-amber-400 shadow-lg shadow-amber-500/20' : 'opacity-70'}` },
                    React.createElement("div", { "data-gq-player": playerWhiteName, className: "relative w-11 h-11 rounded-xl bg-amber-100 border-2 border-white flex items-center justify-center font-black text-slate-900 text-lg shadow-md shrink-0" },
                        React.createElement(PlayerAvatar, { user: playerWhiteAccount, className: "w-full h-full rounded-[inherit]" })),
                    React.createElement("div", null,
                        React.createElement("div", { className: "text-xs font-black text-amber-200" },
                            playerWhiteName,
                            " (\u0633\u0641\u06CC\u062F)"),
                        React.createElement("div", { className: "text-[11px] text-slate-400 font-bold" },
                            "\u062E\u0648\u0631\u062F\u0647 \u0634\u062F\u0647: ",
                            bornOff.white,
                            " / \u06F1\u06F5"),
                        timeoutWarnings.white > 0 && React.createElement("div", { className: "text-[10px] font-black text-rose-300" },
                            "\u0627\u062E\u0637\u0627\u0631 \u0632\u0645\u0627\u0646: ",
                            timeoutWarnings.white,
                            "/\u06F3"))),
                React.createElement("div", { className: "text-slate-600 font-black text-lg" }, "VS"),
                React.createElement("div", { className: `gq-bg-player-card ${turn === 'black' ? 'gq-bg-player-card--active' : ''} flex items-center gap-3 p-2 rounded-2xl transition-all ${turn === 'black' ? 'bg-indigo-500/20 ring-2 ring-indigo-400 shadow-lg shadow-indigo-500/20' : 'opacity-70'}` },
                    React.createElement("div", { "data-gq-player": playerBlackName, className: "relative w-11 h-11 rounded-xl bg-slate-900 border-2 border-indigo-400 flex items-center justify-center font-black text-white text-lg shadow-md shrink-0" }, matchType === 'bot' ? (React.createElement("span", { className: "text-2xl" }, "\uD83E\uDD16")) : (React.createElement(PlayerAvatar, { user: playerBlackAccount, className: "w-full h-full rounded-[inherit]" }))),
                    React.createElement("div", null,
                        React.createElement("div", { className: "text-xs font-black text-indigo-200" },
                            playerBlackName,
                            " (\u0633\u06CC\u0627\u0647)"),
                        React.createElement("div", { className: "text-[11px] text-slate-400 font-bold" },
                            "\u062E\u0648\u0631\u062F\u0647 \u0634\u062F\u0647: ",
                            bornOff.black,
                            " / \u06F1\u06F5"),
                        timeoutWarnings.black > 0 && React.createElement("div", { className: "text-[10px] font-black text-rose-300" },
                            "\u0627\u062E\u0637\u0627\u0631 \u0632\u0645\u0627\u0646: ",
                            timeoutWarnings.black,
                            "/\u06F3")))),
            React.createElement("div", { className: "gq-bg-header-actions flex items-center gap-4" },
                React.createElement(BackgammonTurnClock, { turn: turn, playerWhiteName: playerWhiteName, playerBlackName: playerBlackName, paused: !!winnerResult || showIntro, resetKey: turnClockReset, onTimeout: () => {
                        if ((matchType === 'bot' && turnRef.current === 'white') ||
                            (matchType === 'online' && turnRef.current === myColor)) {
                            handleTurnTimeout(turnRef.current, false);
                        }
                    } }),
                ((matchType === 'online' && turn === myColor) || matchType === 'bot') && !pendingDouble && !isOpeningRoll && !dice && !movesLeft.length && (!cubeOwner || cubeOwner === myColor) && (React.createElement("button", { onClick: offerDouble, className: "px-3 py-2 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 border border-violet-400/40 text-xs font-black transition-all" },
                    "\u062F\u0648\u0628\u0631\u0627\u0628\u0631 \u00D7",
                    cubeValue * 2)),
                React.createElement("button", { onClick: () => setShowExitConfirm(true), className: "px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all" }, "\u062E\u0631\u0648\u062C \u0627\u0632 \u0628\u0627\u0632\u06CC"))),
        pendingDouble && (React.createElement("div", { className: "flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-violet-400/40 bg-violet-950/70 p-3 text-violet-100 shadow-lg animate-in fade-in" },
            React.createElement("span", { className: "text-sm font-black" }, pendingDouble.from === myColor ? 'در انتظار پاسخ حریف به دوبرابر' : 'حریف پیشنهاد دوبرابر داده است'),
            pendingDouble.from !== myColor && React.createElement(React.Fragment, null,
                React.createElement("button", { onClick: acceptDouble, className: "rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-emerald-400" },
                    "\u0642\u0628\u0648\u0644 \u00D7",
                    cubeValue * 2),
                React.createElement("button", { onClick: declineDouble, className: "rounded-xl bg-rose-500 px-4 py-2 text-xs font-black text-white transition hover:bg-rose-400" }, "\u0631\u062F \u0648 \u0648\u0627\u06AF\u0630\u0627\u0631\u06CC \u0628\u0627\u0632\u06CC")))),
        React.createElement("div", { ref: boardElementRef, className: "gq-backgammon-board relative min-w-0 rounded-2xl sm:rounded-[2.5rem] p-1.5 sm:p-6 border-2 sm:border-4 border-amber-800/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] bg-gradient-to-br from-amber-950 via-slate-950 to-amber-950 overflow-hidden" },
            React.createElement("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-900/30 via-slate-950/80 to-slate-950 pointer-events-none" }),
            React.createElement("div", { className: "absolute inset-2 border-2 border-amber-600/30 rounded-[2.2rem] pointer-events-none" }),
            React.createElement("div", { className: "gq-bg-board-layout relative z-10 flex min-w-0 gap-1 sm:gap-3" },
                React.createElement("div", { "data-bg-location": "off-white", onClick: () => { if (myColor === 'white')
                        handleBearOffClick(); }, className: `gq-bg-tray gq-bg-tray--white w-8 sm:w-16 rounded-xl sm:rounded-2xl border-2 flex flex-col items-center justify-between p-1 sm:p-2 transition-all cursor-pointer ${myColor === 'white' && activeTargets.some(m => m.to === 'off')
                        ? 'border-emerald-400 bg-emerald-500/20 animate-pulse ring-2 ring-emerald-300'
                        : 'border-amber-700/40 bg-slate-900/80'}`, title: "\u0633\u06CC\u0646\u06CC \u062C\u0645\u0639\u200C\u0622\u0648\u0631\u06CC \u0645\u0647\u0631\u0647\u200C\u0647\u0627" },
                    React.createElement("div", { className: "gq-bg-tray-label hidden sm:block text-[10px] font-black text-amber-300 text-center" }, "\u062E\u0627\u0646\u0647\u0654 \u0633\u0641\u06CC\u062F"),
                    React.createElement("div", { className: "gq-bg-off-stack flex flex-col gap-1 items-center" }, Array.from({ length: Math.min(bornOff.white, 8) }).map((_, i) => (React.createElement("div", { key: i, "data-bg-checker": "white", "data-bg-aggregate": bornOff.white > 8 ? 'true' : undefined, className: "gq-bg-off-checker w-8 h-2 rounded bg-amber-100 border border-amber-300 shadow-sm" })))),
                    React.createElement("div", { className: "text-xs font-black text-amber-200" },
                        bornOff.white,
                        " / \u06F1\u06F5")),
                React.createElement("div", { className: "gq-bg-main flex min-w-0 flex-1 flex-col gap-1 sm:gap-4" },
                    React.createElement("div", { className: "gq-bg-row flex min-w-0 gap-1 sm:gap-2" },
                        React.createElement("div", { className: "flex min-w-0 flex-1 rounded-xl sm:rounded-2xl overflow-hidden border border-amber-700/40 bg-slate-950/60 p-0.5 sm:p-1" }, [12, 13, 14, 15, 16, 17].map(idx => renderPointTriangle(idx, true))),
                        React.createElement("div", { "data-bg-location": "bar-black", onClick: () => handleBarClick('black'), className: `gq-bg-bar ${selectedFrom === 'bar' && myColor === 'black' ? 'gq-bg-bar--selected' : ''} w-7 sm:w-16 rounded-xl sm:rounded-2xl border-2 flex flex-col items-center justify-center p-0.5 sm:p-1 transition-all ${bar.black > 0 ? 'bg-indigo-950/80 border-indigo-500/60' : 'bg-amber-950/60 border-amber-800/40'}`, title: "\u067E\u06CC\u0634\u062E\u0648\u0627\u0646 \u0645\u0647\u0631\u0647\u200C\u0647\u0627\u06CC \u0633\u06CC\u0627\u0647" },
                            React.createElement("span", { className: "text-[9px] font-bold text-slate-400 mb-1" }, "\u0628\u0627\u0631 \u0633\u06CC\u0627\u0647"),
                            bar.black > 0 ? (React.createElement("div", { "data-bg-checker": "black", "data-bg-aggregate": "true", className: "gq-bg-bar-checker gq-bg-checker--black w-7 h-7 rounded-full bg-slate-900 border-2 border-indigo-400 flex items-center justify-center font-black text-xs text-white shadow-lg" }, bar.black)) : (React.createElement("span", { className: "text-slate-600 text-xs" }, "-"))),
                        React.createElement("div", { className: "flex min-w-0 flex-1 rounded-xl sm:rounded-2xl overflow-hidden border border-amber-700/40 bg-slate-950/60 p-0.5 sm:p-1" }, [18, 19, 20, 21, 22, 23].map(idx => renderPointTriangle(idx, true)))),
                    React.createElement("div", { className: "gq-bg-dice-row min-h-12 sm:h-20 rounded-xl sm:rounded-2xl border border-amber-700/30 bg-amber-950/30 flex items-center justify-between gap-1 px-2 sm:px-6 shadow-inner" },
                        React.createElement("div", { className: "flex items-center gap-2 text-xs font-black text-amber-300" },
                            React.createElement("span", null, "\uD83C\uDFB2"),
                            React.createElement("span", null, "\u0646\u0627\u062D\u06CC\u0647 \u062A\u0627\u0633\u200C\u0647\u0627\u06CC \u062A\u062E\u062A\u0647 \u0646\u0631\u062F")),
                        React.createElement("div", { className: "gq-bg-dice-controls flex items-center gap-1 sm:gap-5" },
                            (dice || isRolling) && (React.createElement(BackgammonDicePair, { isRolling: isRolling, dice: dice, renderCustomDice: renderCustomDice })),
                            movesLeft.length > 0 && !isRolling && (React.createElement("div", { className: "gq-bg-moves-left flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-amber-400/40 text-xs font-bold text-amber-300 shadow-md" },
                                React.createElement("span", null, "\u0628\u0627\u0642\u06CC\u200C\u0645\u0627\u0646\u062F\u0647"),
                                movesLeft.map((value, dieIndex) => React.createElement("b", { key: `${value}-${dieIndex}`, className: "gq-bg-die-chip" }, value)))),
                            ((matchType === 'bot' && turn === 'white') ||
                                (matchType === 'online' && turn === myColor)) && movesLeft.length === 0 && (React.createElement("button", { onClick: rollDice, disabled: isRolling, className: "gq-bg-roll-button px-2 sm:px-6 py-2 sm:py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-[10px] sm:text-sm shadow-xl active:scale-95 transition-all" }, isRolling ? 'در حال چرخش تاس‌ها…' : '🎲 پرتاب تاس!')))),
                    React.createElement("div", { className: "gq-bg-row flex min-w-0 gap-1 sm:gap-2" },
                        React.createElement("div", { className: "flex min-w-0 flex-1 rounded-xl sm:rounded-2xl overflow-hidden border border-amber-700/40 bg-slate-950/60 p-0.5 sm:p-1" }, [11, 10, 9, 8, 7, 6].map(idx => renderPointTriangle(idx, false))),
                        React.createElement("div", { "data-bg-location": "bar-white", onClick: () => handleBarClick('white'), className: `gq-bg-bar ${selectedFrom === 'bar' && myColor === 'white' ? 'gq-bg-bar--selected' : ''} w-7 sm:w-16 rounded-xl sm:rounded-2xl border-2 flex flex-col items-center justify-center p-0.5 sm:p-1 transition-all ${bar.white > 0 ? 'bg-amber-950/80 border-amber-400/80 cursor-pointer ring-2 ring-amber-400' : 'bg-amber-950/60 border-amber-800/40'}`, title: "\u067E\u06CC\u0634\u062E\u0648\u0627\u0646 \u0645\u0647\u0631\u0647\u200C\u0647\u0627\u06CC \u0633\u0641\u06CC\u062F" },
                            React.createElement("span", { className: "text-[9px] font-bold text-slate-400 mb-1" }, "\u0628\u0627\u0631 \u0633\u0641\u06CC\u062F"),
                            bar.white > 0 ? (React.createElement("div", { "data-bg-checker": "white", "data-bg-aggregate": "true", className: "gq-bg-bar-checker gq-bg-checker--white w-7 h-7 rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center font-black text-xs text-slate-950 shadow-lg" }, bar.white)) : (React.createElement("span", { className: "text-slate-600 text-xs" }, "-"))),
                        React.createElement("div", { className: "flex min-w-0 flex-1 rounded-xl sm:rounded-2xl overflow-hidden border border-amber-700/40 bg-slate-950/60 p-0.5 sm:p-1" }, [5, 4, 3, 2, 1, 0].map(idx => renderPointTriangle(idx, false))))),
                React.createElement("div", { "data-bg-location": "off-black", onClick: () => { if (myColor === 'black')
                        handleBearOffClick(); }, className: `gq-bg-tray gq-bg-tray--black w-8 sm:w-16 rounded-xl sm:rounded-2xl border-2 bg-slate-900/80 flex flex-col items-center justify-between p-1 sm:p-2 ${myColor === 'black' && activeTargets.some(move => move.to === 'off') ? 'border-emerald-400 ring-2 ring-emerald-300 cursor-pointer' : 'border-indigo-700/40'}`, title: "\u0633\u06CC\u0646\u06CC \u062C\u0645\u0639\u200C\u0622\u0648\u0631\u06CC \u0645\u0647\u0631\u0647\u200C\u0647\u0627\u06CC \u0633\u06CC\u0627\u0647" },
                    React.createElement("div", { className: "gq-bg-tray-label hidden sm:block text-[10px] font-black text-indigo-300 text-center" }, "\u062E\u0627\u0646\u0647\u0654 \u0633\u06CC\u0627\u0647"),
                    React.createElement("div", { className: "gq-bg-off-stack flex flex-col gap-1 items-center" }, Array.from({ length: Math.min(bornOff.black, 8) }).map((_, i) => (React.createElement("div", { key: i, "data-bg-checker": "black", "data-bg-aggregate": bornOff.black > 8 ? 'true' : undefined, className: "gq-bg-off-checker w-8 h-2 rounded bg-slate-900 border border-indigo-400 shadow-sm" })))),
                    React.createElement("div", { className: "text-xs font-black text-indigo-200" },
                        bornOff.black,
                        " / \u06F1\u06F5"))),
            React.createElement("div", { ref: motionLayerRef, className: "gq-bg-motion-layer", "aria-hidden": "true" })),
        React.createElement("div", { className: "gq-bg-move-status", role: "status", "aria-live": "polite" },
            React.createElement("span", { key: turn, className: "gq-bg-turn-announcement" }, turn === myColor ? 'نوبت توست' : `نوبت ${turn === 'white' ? playerWhiteName : playerBlackName}`),
            moveNotice && React.createElement("span", { key: moveNotice.id, className: `gq-bg-move-notice gq-bg-move-notice--${moveNotice.color}` }, moveNotice.text)),
        React.createElement(ReactionTray, { matchId: currentMatchId || `bg-${currentUser.username}`, currentUser: currentUser, onUserUpdated: onUserUpdated, hidden: showIntro, targets: [{
                    name: peerName,
                    label: peerName,
                    isBot: matchType === 'bot',
                    hex: myColor === 'white' ? '#6366f1' : '#f59e0b'
                }] }),
        matchType === 'online' && (React.createElement("div", { className: "flex items-center justify-end pt-1" },
            React.createElement(InGameChatDrawer, { currentUser: currentUser, recipientUsername: peerName, matchId: currentMatchId }))),
        winnerResult && (React.createElement("div", { className: "fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in" },
            React.createElement("div", { className: "relative w-full max-w-md rounded-3xl border-2 border-amber-400/80 bg-gradient-to-b from-slate-900 via-amber-950/40 to-slate-900 p-6 sm:p-8 text-center shadow-2xl shadow-amber-500/30 space-y-5 animate-in zoom-in-95" },
                React.createElement("div", { className: "w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center text-4xl shadow-xl shadow-amber-500/40 animate-bounce" }, "\uD83C\uDFC6"),
                React.createElement("div", null,
                    React.createElement("span", { className: "px-3 py-1 rounded-full text-xs font-black bg-amber-400/20 text-amber-300 border border-amber-400/40" }, winnerResult.reason === 'خروج حریف' ? '🏃‍♂️ خروج حریف از بازی' :
                        winnerResult.reason === 'اخطار سوم زمان' ? '⏱️ حذف به‌دلیل سه اخطار زمان' :
                            winnerResult.type === 'backgammon' ? '🔥 مارس سیاه (۳ برابر)' :
                                winnerResult.type === 'gammon' ? '⚡ مارس (۲ برابر)' : '✨ پیروزی مسابقه'),
                    React.createElement("h2", { className: "text-2xl sm:text-3xl font-black text-white mt-3" },
                        winnerResult.winner === 'white' ? playerWhiteName : playerBlackName,
                        " \u067E\u06CC\u0631\u0648\u0632 \u0634\u062F!"),
                    React.createElement("p", { className: "text-xs sm:text-sm text-slate-300 mt-2" }, winnerResult.reason === 'خروج حریف'
                        ? 'حریف از مسابقه خارج شد. پیروزی و پاداش به شما تعلق گرفت!'
                        : winnerResult.reason === 'اخطار سوم زمان'
                            ? 'حریف سه بار در زمان نوبتش حرکتی انجام نداد و از بازی حذف شد.'
                            : winnerResult.type === 'backgammon'
                                ? 'پیروزی استثنایی با مارس سیاه! حریف مهره‌ای خارج نکرد و در پیشخوان باقی ماند.'
                                : winnerResult.type === 'gammon'
                                    ? 'پیروزی قاطع با مارس! حریف موفق به خارج کردن حتی یک مهره هم نشد.'
                                    : 'پایان مسابقه با جمع‌آوری تمام ۱۵ مهره.')),
                matchType === 'online' && (React.createElement("div", { className: "p-4 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-200 flex items-center justify-center gap-2 text-lg font-black" },
                    React.createElement("span", null, "\u067E\u0627\u062F\u0627\u0634 \u062F\u0631\u06CC\u0627\u0641\u062A\u06CC:"),
                    React.createElement("span", null, winnerResult.reward),
                    React.createElement(IconCoin, { className: "w-5 h-5 text-amber-400" }),
                    React.createElement("span", { className: "text-xs text-amber-400" }, "\u06A9\u06CC\u0648\u062C\u06CC"))),
                React.createElement("div", { className: "pt-2 flex gap-3" },
                    React.createElement("button", { onClick: onExit, className: "flex-1 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-sm shadow-lg active:scale-95 transition-all" }, "\u062E\u0631\u0648\u062C \u0628\u0647 \u0647\u0627\u0628 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627"))))),
        showExitConfirm && (React.createElement("div", { className: "fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" },
            React.createElement("div", { className: "w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900 p-6 text-center space-y-4" },
                React.createElement("h3", { className: "text-lg font-black text-white" }, "\u0622\u06CC\u0627 \u0627\u0632 \u0628\u0627\u0632\u06CC \u062E\u0627\u0631\u062C \u0645\u06CC\u200C\u0634\u0648\u06CC\u062F\u061F"),
                React.createElement("p", { className: "text-xs text-slate-400 leading-6" }, "\u062F\u0631 \u0635\u0648\u0631\u062A \u062E\u0631\u0648\u062C \u062F\u0631 \u062D\u0627\u0644\u062A \u0622\u0646\u0644\u0627\u06CC\u0646\u060C \u0645\u0633\u0627\u0628\u0642\u0647 \u0648\u0627\u06AF\u0630\u0627\u0631 \u0634\u062F\u0647 \u0648 \u0633\u06A9\u0647 \u0648\u0631\u0648\u062F\u06CC \u0628\u0627\u0632\u06AF\u0631\u062F\u0627\u0646\u062F\u0647 \u0646\u062E\u0648\u0627\u0647\u062F \u0634\u062F."),
                React.createElement("div", { className: "flex gap-3 pt-2" },
                    React.createElement("button", { onClick: confirmExit, className: "flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-all" }, "\u062E\u0631\u0648\u062C \u0642\u0637\u0639\u06CC"),
                    React.createElement("button", { onClick: () => setShowExitConfirm(false), className: "flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all" }, "\u0627\u062F\u0627\u0645\u0647 \u0628\u0627\u0632\u06CC")))))));
};

/* ===== games/GameLobby.jsx ===== */
const GameLobby = ({ lobbyId, currentUser, onClose, onStart, onOpenProfile }) => {
    const [lobby, setLobby] = useState(() => getLobbies().find(item => item.id === lobbyId));
    const [selectedFriends, setSelectedFriends] = useState([]);
    useEffect(() => {
        const refreshLobby = () => setLobby(getLobbies().find(item => item.id === lobbyId));
        const timer = setInterval(refreshLobby, 1000);
        return () => clearInterval(timer);
    }, [lobbyId]);
    useEffect(() => {
        if (lobby?.status === 'started')
            onStart(lobby);
    }, [lobby?.status, lobbyId]);
    if (!lobby) {
        return (React.createElement("div", { className: "w-full max-w-md mx-auto glass-panel p-8 rounded-3xl text-center space-y-4" },
            React.createElement("div", { className: "text-4xl" }, "\u26A0\uFE0F"),
            React.createElement("p", { className: "text-slate-300 text-sm font-bold" }, "\u0627\u06CC\u0646 \u0644\u0627\u0628\u06CC \u062F\u06CC\u06AF\u0631 \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A \u06CC\u0627 \u0644\u063A\u0648 \u0634\u062F\u0647 \u0627\u0633\u062A."),
            React.createElement("button", { onClick: onClose, className: "px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold" }, "\u0628\u0627\u0632\u06AF\u0634\u062A")));
    }
    const isHost = lobby.host === currentUser.username;
    const availableFriends = (currentUser.friends || []).filter(name => !lobby.invitees.includes(name) && !lobby.participants.includes(name));
    const inviteMore = () => {
        if (!selectedFriends.length)
            return;
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
    return (React.createElement("div", { className: "w-full max-w-3xl mx-auto glass-panel lobby-glow rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 sm:space-y-8 text-center border border-indigo-500/30 animate-in fade-in" },
        React.createElement("div", { className: "w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl bg-gradient-to-br from-indigo-500/30 to-purple-500/20 border-2 border-indigo-400/40 flex items-center justify-center animate-pulse-slow shadow-lg shadow-indigo-500/20" },
            React.createElement(IconUsers, { className: "w-10 h-10 sm:w-12 sm:h-12 text-indigo-300" })),
        React.createElement("div", null,
            React.createElement("h2", { className: "text-2xl sm:text-3xl font-black text-white" }, "\u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631 \u067E\u06CC\u0648\u0633\u062A\u0646 \u0628\u0627\u0632\u06CC\u06A9\u0646\u0627\u0646"),
            React.createElement("p", { className: "text-sm sm:text-base text-slate-400 mt-2" },
                "\u0628\u0627\u0632\u06CC \u0627\u0646\u062A\u062E\u0627\u0628\u200C\u0634\u062F\u0647: ",
                gameTitle)),
        React.createElement("div", { className: "p-4 sm:p-5 bg-slate-900/60 rounded-2xl sm:rounded-3xl text-right space-y-2 border border-slate-700/60 shadow-inner max-w-lg mx-auto" },
            lobby.participants.map(name => {
                const u = findUser(name);
                return (React.createElement("button", { key: name, onClick: () => onOpenProfile(name), className: "invite-row text-sm sm:text-base font-bold text-white py-2.5 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-3 w-full hover:bg-emerald-500/25 transition-colors" },
                    React.createElement(PlayerAvatar, { user: u, className: "w-8 h-8 sm:w-9 sm:h-9 rounded-xl shadow-sm" }),
                    React.createElement("div", { className: "flex flex-col items-start" },
                        React.createElement("span", null,
                            "\u2713 ",
                            name,
                            name === lobby.host ? ' (میزبان)' : ''),
                        u?.equipped?.titles && u.equipped.titles !== 'classic' && (React.createElement("div", { className: "origin-right transform scale-90 -mt-0.5" }, renderPlayerTitle(u.equipped.titles))))));
            }),
            lobby.invitees.filter(name => !lobby.participants.includes(name)).map(name => (React.createElement("div", { key: name, className: "invite-row text-xs sm:text-sm font-medium text-slate-400 py-2.5 px-4 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center gap-2 w-full" },
                React.createElement("span", { className: "w-2 h-2 rounded-full bg-amber-500/60 animate-pulse" }),
                React.createElement("span", null,
                    name,
                    " (\u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631 \u067E\u0627\u0633\u062E...)"))))),
        isHost && (React.createElement("div", { className: "space-y-4 sm:space-y-5 text-right mt-8 border-t border-slate-700/60 pt-6" },
            React.createElement("p", { className: "text-sm sm:text-base font-black text-white text-center" }, "\u062F\u0639\u0648\u062A \u0627\u0632 \u062F\u0648\u0633\u062A\u0627\u0646 \u062F\u06CC\u06AF\u0631 (\u0627\u0646\u062A\u062E\u0627\u0628 \u0628\u0627 \u06A9\u0644\u06CC\u06A9 \u0631\u0648\u06CC \u06A9\u0627\u0631\u062A)"),
            availableFriends.length ? (React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 max-h-[300px] overflow-y-auto p-2 custom-scrollbar" }, availableFriends.map(name => {
                const isSel = selectedFriends.includes(name);
                const friendData = findUser(name);
                return (React.createElement("div", { key: name, onClick: () => setSelectedFriends(current => isSel ? current.filter(item => item !== name) : [...current, name]), className: `relative cursor-pointer rounded-[1.5rem] p-4 flex flex-col items-center gap-2 border-2 transition-all duration-300 hover:-translate-y-1 ${isSel ? 'border-indigo-500 bg-indigo-500/20 shadow-[0_10px_20px_-5px_rgba(99,102,241,0.4)]' : 'border-slate-700/50 bg-slate-800/60 hover:bg-slate-700/80 hover:border-slate-600'}` },
                    React.createElement(PlayerAvatar, { user: friendData, className: "w-12 h-12 rounded-[inherit] shadow-inner" }),
                    React.createElement("div", { className: "flex flex-col items-center" },
                        React.createElement("span", { className: "text-xs sm:text-sm font-bold text-white max-w-full truncate" }, name),
                        friendData?.equipped?.titles && friendData.equipped.titles !== 'classic' && (React.createElement("div", { className: "origin-top transform scale-[0.8] mt-0.5" }, renderPlayerTitle(friendData.equipped.titles)))),
                    React.createElement("div", { className: `absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm shadow-md transition-transform ${isSel ? 'bg-indigo-500 scale-100' : 'bg-slate-700 scale-0'}` }, "\u2713")));
            }))) : React.createElement("p", { className: "text-xs sm:text-sm text-slate-500 bg-slate-800/50 p-4 rounded-xl text-center border border-slate-700/50" }, "\u062F\u0648\u0633\u062A \u062F\u06CC\u06AF\u0631\u06CC \u0628\u0631\u0627\u06CC \u062F\u0639\u0648\u062A \u06CC\u0627\u0641\u062A \u0646\u0634\u062F."),
            React.createElement("button", { disabled: !selectedFriends.length, onClick: inviteMore, className: "game-action w-full py-3.5 sm:py-4 bg-gradient-to-l from-indigo-600 to-purple-600 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white rounded-xl sm:rounded-2xl text-sm sm:text-base font-black shadow-lg shadow-indigo-700/25 mt-4 hover:scale-[1.01] transition-transform disabled:hover:scale-100 disabled:border disabled:border-slate-700" }, "\u0627\u0631\u0633\u0627\u0644 \u062F\u0639\u0648\u062A\u200C\u0646\u0627\u0645\u0647 \u0628\u0631\u0627\u06CC \u062F\u0648\u0633\u062A"))),
        React.createElement("div", { className: "flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 border-t border-slate-700/60 mt-4" },
            isHost && (React.createElement("button", { disabled: lobby.participants.length < 2, onClick: () => { const updated = { ...lobby, status: 'started' }; saveLobbies(getLobbies().map(item => item.id === lobby.id ? updated : item)); onStart(updated); }, className: "game-action flex-1 py-3.5 sm:py-4 bg-gradient-to-l from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 rounded-2xl font-black shadow-lg shadow-emerald-500/25 text-sm sm:text-base disabled:hover:scale-100 transition-all active:scale-95" }, "\u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC")),
            React.createElement("button", { onClick: () => { if (isHost)
                    cancelLobby(lobby.id, currentUser.username); onClose(); }, className: "danger-action flex-1 py-3.5 sm:py-4 bg-slate-800 hover:bg-rose-600 border border-slate-700 hover:border-rose-500 text-slate-300 hover:text-white rounded-2xl font-bold text-sm sm:text-base transition-all active:scale-95" }, isHost ? 'لغو درخواست و خروج' : 'خروج از لابی'))));
};

/* ===== components/MatchmakingScreen.jsx ===== */
// ---------- صفحه‌ی «در حال جستجوی حریف» ----------
const MatchmakingScreen = ({ game, currentUser, found, onCancel }) => {
    const rule = MATCH_RULES[game] || { min: 2, max: 2, label: 'بازی' };
    const [now, setNow] = useState(Date.now());
    const startedRef = useRef(Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 500);
        return () => clearInterval(timer);
    }, []);
    const waiting = getWaitingPlayers(game);
    const names = found ? found.participants : waiting.map(entry => entry.username);
    const slots = Array.from({ length: rule.max }, (_, i) => names[i] || null);
    const elapsed = Math.floor((now - startedRef.current) / 1000);
    const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
    const isLudo = game === 'ludo';
    const isTicTacToe = game === 'tictactoe';
    const secondJoinedAt = waiting[1] ? waiting[1].joinedAt : null;
    const startIn = isLudo && !found && secondJoinedAt && waiting.length < rule.max ? Math.max(0, Math.ceil((rule.waitMs - (now - secondJoinedAt)) / 1000)) : null;
    const me = findUser(currentUser.username) || currentUser;
    return (React.createElement("div", { className: "w-full max-w-2xl mx-auto py-4 sm:py-8 animate-in fade-in" },
        React.createElement("div", { className: `mm-card relative overflow-hidden glass-panel rounded-3xl p-6 sm:p-10 text-center border ${found ? 'border-emerald-400/60' : 'border-indigo-400/30'} shadow-2xl` },
            React.createElement("div", { className: "mm-glow absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" }),
            React.createElement("div", { className: "relative mx-auto w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center mb-5" },
                !found && (React.createElement(Fragment, null,
                    React.createElement("span", { className: "mm-ring" }),
                    React.createElement("span", { className: "mm-ring", style: { animationDelay: '0.8s' } }),
                    React.createElement("span", { className: "mm-ring", style: { animationDelay: '1.6s' } }),
                    React.createElement("span", { className: "mm-sweep" }))),
                React.createElement("div", { className: `relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-3xl border-4 ${found ? 'border-emerald-400 shadow-emerald-500/50' : 'border-indigo-400 shadow-indigo-500/50'} shadow-2xl bg-slate-800 ${found ? 'mm-found' : ''}` },
                    React.createElement(PlayerAvatar, { user: me, className: "w-full h-full rounded-[inherit]" }))),
            React.createElement("h2", { className: "text-xl sm:text-3xl font-black text-white" }, found ? '🎉 حریف پیدا شد!' : (React.createElement("span", null,
                "\u062F\u0631 \u062D\u0627\u0644 \u062C\u0633\u062A\u062C\u0648\u06CC \u062D\u0631\u06CC\u0641 \u0622\u0646\u0644\u0627\u06CC\u0646",
                React.createElement("span", { className: "mm-dots" })))),
            React.createElement("p", { className: "text-xs sm:text-sm text-slate-400 mt-2 leading-6" }, found ? 'مسابقه تا لحظاتی دیگر آغاز می‌شود…'
                : isLudo ? `منچ آنلاین؛ با ۴ بازیکن فوری شروع می‌شود، وگرنه حداقل ۲ نفر و جاهای خالی با ربات پر می‌شود.`
                    : isTicTacToe ? 'دوز آنلاین؛ به‌محض پیدا شدن حریف، مسابقه شروع می‌شود.'
                        : 'شطرنج آنلاین؛ به‌محض پیدا شدن یک بازیکنِ آماده، مسابقه شروع می‌شود.'),
            React.createElement("div", { className: `mt-6 grid gap-3 ${rule.max === 4 ? 'grid-cols-4' : 'grid-cols-2 max-w-xs mx-auto'}` }, slots.map((name, i) => {
                const acc = name ? findUser(name) : null;
                return (React.createElement("div", { key: i, className: "flex flex-col items-center gap-1.5" },
                    React.createElement("div", { className: `w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${name ? 'border-emerald-400 bg-slate-800 mm-slot-in' : 'border-slate-700 border-dashed bg-slate-900/60 mm-slot-wait'}` }, acc ? React.createElement(PlayerAvatar, { user: acc, className: "w-full h-full rounded-[inherit]" }) : React.createElement("span", { className: "text-slate-600 text-xl font-black" }, "\u061F")),
                    React.createElement("div", { className: "flex flex-col items-center" },
                        React.createElement("span", { className: `text-[10px] sm:text-xs font-bold truncate max-w-full ${name ? 'text-white' : 'text-slate-600'}` }, name ? (name === currentUser.username ? `${name} (شما)` : name) : 'در انتظار…'),
                        acc?.equipped?.titles && acc.equipped.titles !== 'classic' && (React.createElement("div", { className: "-mt-1 origin-top transform scale-[0.8]" }, renderPlayerTitle(acc.equipped.titles))))));
            })),
            React.createElement("div", { className: "mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] sm:text-xs" },
                React.createElement("span", { className: "px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 tabular-nums" },
                    "\u23F1 ",
                    mmss),
                React.createElement("span", { className: "px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300" },
                    "\uD83D\uDC65 ",
                    Math.min(names.length, rule.max).toLocaleString('fa-IR'),
                    " \u0627\u0632 ",
                    rule.max.toLocaleString('fa-IR'),
                    " \u0628\u0627\u0632\u06CC\u06A9\u0646"),
                startIn !== null && React.createElement("span", { className: "px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold" },
                    "\u0634\u0631\u0648\u0639 \u0628\u0627 \u0647\u0645\u06CC\u0646 \u0628\u0627\u0632\u06CC\u06A9\u0646\u0627\u0646 \u062A\u0627 ",
                    startIn.toLocaleString('fa-IR'),
                    " \u062B\u0627\u0646\u06CC\u0647")),
            React.createElement("p", { className: "mt-5 text-[10px] sm:text-xs text-slate-500" }, "\u0648\u0631\u0648\u062F\u06CC \u06F2\u06F5 \u06A9\u06CC\u0648\u062C\u06CC \u067E\u0631\u062F\u0627\u062E\u062A \u0634\u062F\u0647 \u0627\u0633\u062A\u061B \u0628\u0627 \u0644\u063A\u0648 \u062C\u0633\u062A\u062C\u0648 \u0628\u0647\u200C\u0637\u0648\u0631 \u06A9\u0627\u0645\u0644 \u0628\u0631\u0645\u06CC\u200C\u06AF\u0631\u062F\u062F."),
            !found && (React.createElement("button", { onClick: onCancel, className: "mt-5 w-full sm:w-auto px-8 py-3 rounded-2xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-black text-sm active:scale-95 transition-all" }, "\u0644\u063A\u0648 \u062C\u0633\u062A\u062C\u0648")))));
};

/* ===== pages/GamesHub.jsx ===== */
// ============================================================================
// GamesHub.jsx — هاب بازی‌های GameQJ
// طراحی مجدد بصری و تعاملی: مدرن، گرافیکی، روان و زنده با انیمیشن‌های اختصاصی
// ============================================================================
const GamesHub = ({ currentUser, onUserUpdated, lobbyId, onCloseLobby, onOpenProfile, setIsInGame, onNavigateToGames, onOpenWheel }) => {
    // حالت بازی: 'online' (رقابت آنلاین) یا 'bot' (تمرین با هوش مصنوعی)
    const [matchType, setMatchType] = useState('online');
    const [selectedGame, setSelectedGame] = useState(null);
    const [matchLobby, setMatchLobby] = useState(null);
    const [sessionMatchId, setSessionMatchId] = useState(null);
    const [entryFeeError, setEntryFeeError] = useState('');
    const [infoModalGame, setInfoModalGame] = useState(null);
    // صف جستجوی آنلاین
    const [searchingGame, setSearchingGame] = useState(null);
    const [foundLobby, setFoundLobby] = useState(null);
    const searchStartedRef = useRef(0);
    const handledRematchIdsRef = useRef(new Set());
    const paidEntryFeeRef = useRef(ONLINE_ENTRY_FEE);
    // محاسبه‌ی تخفیف آلیانز برای ورودی مسابقات آنلاین
    const allianceDiscounts = useMemo(() => {
        try {
            if (typeof getUserDiscounts === 'function' && currentUser?.username) {
                return getUserDiscounts(currentUser.username) || { gameDiscountPercent: 0 };
            }
        }
        catch (e) { }
        return { gameDiscountPercent: 0 };
    }, [currentUser?.username]);
    const gameDiscountPct = Number(allianceDiscounts?.gameDiscountPercent) || 0;
    const baseEntryFee = ONLINE_ENTRY_FEE || 25;
    const actualEntryFee = gameDiscountPct > 0
        ? Math.max(1, Math.round(baseEntryFee * (1 - gameDiscountPct / 100)))
        : baseEntryFee;
    // وضعیت حضور در بازی (جهت مخفی‌سازی هدر در لابی یا مسابقه)
    useEffect(() => {
        if (setIsInGame) {
            setIsInGame(!!selectedGame || !!lobbyId || !!searchingGame);
        }
    }, [selectedGame, lobbyId, searchingGame, setIsInGame]);
    // لغو جستجوی آنلاین و استرداد دقیق سکه‌های کسر شده
    const cancelSearch = useCallback(() => {
        if (!searchingGame)
            return;
        leaveMatchQueue(currentUser.username);
        const refundAmount = paidEntryFeeRef.current || actualEntryFee;
        patchUser(currentUser.username, u => ({ ...u, coins: (u.coins || 0) + refundAmount }));
        const fresh = findUser(currentUser.username);
        if (fresh && onUserUpdated)
            onUserUpdated(fresh);
        setSearchingGame(null);
        setFoundLobby(null);
    }, [searchingGame, currentUser.username, actualEntryFee, onUserUpdated]);
    // چرخه‌ی مچ‌میکینگ آنلاین
    useEffect(() => {
        if (!searchingGame)
            return;
        const checkMatch = () => {
            pruneQueue();
            heartbeatMatchQueue(currentUser.username);
            let lobby = findMatchedLobby(currentUser.username, searchStartedRef.current);
            if (!lobby) {
                lobby = tryCreateMatch(currentUser.username, searchingGame);
            }
            if (lobby) {
                setFoundLobby(lobby);
                setTimeout(() => {
                    leaveMatchQueue(currentUser.username);
                    setMatchLobby(lobby);
                    setSessionMatchId(lobby.id);
                    setSelectedGame(lobby.gameType);
                    setSearchingGame(null);
                    setFoundLobby(null);
                }, 1400);
            }
        };
        checkMatch();
        const interval = setInterval(checkMatch, 800);
        const handleBeforeUnload = () => {
            leaveMatchQueue(currentUser.username);
            const refundAmount = paidEntryFeeRef.current || actualEntryFee;
            patchUser(currentUser.username, u => ({ ...u, coins: (u.coins || 0) + refundAmount }));
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            clearInterval(interval);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [searchingGame, currentUser.username, actualEntryFee]);
    // شنود سراسری درخواست بازی مجدد (شطرنج) زمانی که بازیکن خارج از مسابقه است
    useEffect(() => {
        if (selectedGame)
            return;
        const checkGlobalRematch = () => {
            let lastMatch = null;
            try {
                const stored = localStorage.getItem(`gameqj_last_chess_match_${currentUser.username}`);
                if (stored)
                    lastMatch = JSON.parse(stored);
            }
            catch (e) { }
            if (!lastMatch || !lastMatch.matchId)
                return;
            if (Date.now() - (lastMatch.timestamp || 0) > 180000)
                return;
            const msgs = getMessages();
            const recentReq = msgs.find(m => m.text.startsWith('__REMATCH_REQUEST__') &&
                m.senderUsername?.toLowerCase() !== currentUser.username.toLowerCase() &&
                (m.matchId === lastMatch.matchId || m.recipientUsername?.toLowerCase() === currentUser.username.toLowerCase()) &&
                Date.now() - new Date(m.createdAt).getTime() < 22000);
            if (recentReq && !handledRematchIdsRef.current.has(recentReq.id)) {
                handledRematchIdsRef.current.add(recentReq.id);
                const nextMatchId = recentReq.text.replace('__REMATCH_REQUEST__', '');
                const opponent = recentReq.senderUsername;
                showToast({
                    id: 'rematch-global',
                    type: 'request',
                    title: 'درخواست بازی مجدد شطرنج',
                    text: `«${opponent}» می‌خواهد دوباره با شما شطرنج بازی کند!`,
                    duration: 20000,
                    showTimer: true,
                    actions: [
                        {
                            label: 'قبول بازی مجدد',
                            variant: 'success',
                            onClick: () => {
                                const fresh = findUser(currentUser.username);
                                const isFree = !!lastMatch.hasFreeRematch;
                                const requiredFee = isFree ? 0 : actualEntryFee;
                                if (!isFree && (!fresh || fresh.coins < requiredFee)) {
                                    showToast({
                                        id: 'rematch-err',
                                        type: 'error',
                                        title: 'موجودی ناکافی',
                                        text: `برای قبول بازی مجدد به ${requiredFee} کیوجی نیاز دارید.`,
                                        duration: 4000
                                    });
                                    return;
                                }
                                if (!isFree && requiredFee > 0) {
                                    deductCoins(currentUser.username, requiredFee);
                                    const u = findUser(currentUser.username);
                                    if (u && onUserUpdated)
                                        onUserUpdated(u);
                                }
                                sendMessage(currentUser.username, `__REMATCH_ACCEPTED__${nextMatchId}`, opponent, recentReq.matchId);
                                window.dispatchEvent(new Event('storage'));
                                hideToast('rematch-global');
                                try {
                                    localStorage.setItem(`gameqj_last_chess_match_${currentUser.username}`, JSON.stringify({
                                        ...lastMatch,
                                        matchId: nextMatchId,
                                        hasFreeRematch: false,
                                        timestamp: Date.now()
                                    }));
                                }
                                catch (e) { }
                                if (onNavigateToGames)
                                    onNavigateToGames();
                                setMatchLobby({
                                    id: nextMatchId,
                                    participants: lastMatch.matchParticipants || [opponent, currentUser.username],
                                    gameType: 'chess'
                                });
                                setSessionMatchId(nextMatchId);
                                setMatchType('online');
                                setSelectedGame('chess');
                                showToast({
                                    id: 'rematch-started',
                                    type: 'success',
                                    title: 'شروع مسابقه',
                                    text: `بازی مجدد با «${opponent}» آغاز شد!`,
                                    duration: 3500
                                });
                            }
                        },
                        {
                            label: 'رد کردن',
                            variant: 'danger',
                            onClick: () => {
                                sendMessage(currentUser.username, '__REMATCH_DECLINED__', opponent, recentReq.matchId);
                                window.dispatchEvent(new Event('storage'));
                                hideToast('rematch-global');
                            }
                        }
                    ]
                });
            }
        };
        checkGlobalRematch();
        const interval = setInterval(checkGlobalRematch, 700);
        window.addEventListener('storage', checkGlobalRematch);
        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', checkGlobalRematch);
        };
    }, [selectedGame, currentUser.username, onNavigateToGames, onUserUpdated, actualEntryFee]);
    // شروع بازی
    const handleStartGame = (gameKey) => {
        setEntryFeeError('');
        try {
            playSound('button', currentUser.settings?.sound);
        }
        catch (e) { }
        const playBlock = getUserPlayBlock(currentUser);
        if (playBlock) {
            const untilText = playBlock.type === 'suspend' && playBlock.until ? ` (تا ${new Date(playBlock.until).toLocaleString('fa-IR')})` : '';
            setEntryFeeError(playBlock.message + untilText);
            return;
        }
        if (matchType === 'online') {
            if ((currentUser.coins || 0) < actualEntryFee) {
                setEntryFeeError(`موجودی کیوجی شما کافی نیست! برای ورود به مسابقه آنلاین به ${actualEntryFee} کیوجی نیاز دارید (موجودی فعلی: ${currentUser.coins || 0}).`);
                return;
            }
            paidEntryFeeRef.current = actualEntryFee;
            deductCoins(currentUser.username, actualEntryFee);
            const fresh = findUser(currentUser.username);
            if (fresh && onUserUpdated)
                onUserUpdated(fresh);
            searchStartedRef.current = Date.now();
            joinMatchQueue(currentUser.username, gameKey);
            setSearchingGame(gameKey);
            setFoundLobby(null);
        }
        else {
            setMatchLobby(null);
            setSessionMatchId(`bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
            setSelectedGame(gameKey);
        }
    };
    // ۱. لابی دوستان
    if (lobbyId) {
        return (React.createElement(GameLobby, { lobbyId: lobbyId, currentUser: currentUser, onClose: onCloseLobby, onOpenProfile: onOpenProfile, onStart: (lobby) => {
                setMatchLobby(lobby);
                setMatchType('online');
                setSelectedGame(lobby.gameType);
                setSessionMatchId(lobby.id || `game-${Date.now()}`);
                onCloseLobby();
            } }));
    }
    // ۲. صفحه جستجوی آنلاین
    if (searchingGame) {
        return (React.createElement(MatchmakingScreen, { game: searchingGame, currentUser: currentUser, found: foundLobby, onCancel: cancelSearch }));
    }
    // ۳. شطرنج
    if (selectedGame === 'chess') {
        return (React.createElement(ChessGame, { currentUser: currentUser, matchType: matchType, matchId: matchLobby?.id || sessionMatchId, matchParticipants: matchLobby?.participants, onOpenProfile: onOpenProfile, setIsInGame: setIsInGame, onUserUpdated: onUserUpdated, onNavigateToGames: onNavigateToGames, onExit: () => { setSelectedGame(null); setMatchLobby(null); setSessionMatchId(null); }, onGameFinished: (won, gameType, isOnline) => {
                const updatedUser = recordGameResult(currentUser.username, won, gameType, isOnline);
                if (updatedUser && onUserUpdated)
                    onUserUpdated(updatedUser);
            } }));
    }
    // ۴. منچ
    if (selectedGame === 'ludo') {
        return (React.createElement(LudoGame, { currentUser: currentUser, gameMode: matchType, matchId: matchLobby?.id || sessionMatchId, matchParticipants: matchLobby?.participants, onOpenProfile: onOpenProfile, setIsInGame: setIsInGame, onUserUpdated: onUserUpdated, onNavigateToGames: onNavigateToGames, onExit: () => { setSelectedGame(null); setMatchLobby(null); setSessionMatchId(null); }, onGameFinished: (won, gameType, isOnline) => {
                const updatedUser = recordGameResult(currentUser.username, won, gameType, isOnline);
                if (updatedUser && onUserUpdated)
                    onUserUpdated(updatedUser);
            } }));
    }
    // ۵. دوز
    if (selectedGame === 'tictactoe') {
        return (React.createElement(TicTacToeGame, { currentUser: currentUser, matchType: matchType, matchId: matchLobby?.id || sessionMatchId, matchParticipants: matchLobby?.participants, onOpenProfile: onOpenProfile, setIsInGame: setIsInGame, onUserUpdated: onUserUpdated, onNavigateToGames: onNavigateToGames, onExit: () => { setSelectedGame(null); setMatchLobby(null); setSessionMatchId(null); }, onGameFinished: (won, gameType, isOnline) => {
                const updatedUser = recordGameResult(currentUser.username, won, gameType, isOnline);
                if (updatedUser && onUserUpdated)
                    onUserUpdated(updatedUser);
            } }));
    }
    // ۶. تخته نرد
    if (selectedGame === 'backgammon') {
        return (React.createElement(BackgammonGame, { currentUser: currentUser, matchType: matchType, matchId: matchLobby?.id || sessionMatchId, matchParticipants: matchLobby?.participants, onOpenProfile: onOpenProfile, setIsInGame: setIsInGame, onUserUpdated: onUserUpdated, onNavigateToGames: onNavigateToGames, onExit: () => { setSelectedGame(null); setMatchLobby(null); setSessionMatchId(null); }, onGameFinished: (won, gameType, isOnline) => {
                const updatedUser = recordGameResult(currentUser.username, won, gameType, isOnline);
                if (updatedUser && onUserUpdated)
                    onUserUpdated(updatedUser);
            } }));
    }
    // آمار سریع بازیکن
    const userStats = currentUser.stats || {};
    const totalWins = (userStats.chessWins || 0) + (userStats.ludoWins || 0) + (userStats.tictactoeWins || 0) + (userStats.backgammonWins || 0);
    const totalGames = (userStats.chessGames || 0) + (userStats.ludoGames || 0) + (userStats.tictactoeGames || 0) + (userStats.backgammonGames || 0);
    const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
    // تعریف داده‌های ۳ بازی اصلی با هویت بصری کامل
    const gamesData = [
        {
            key: 'tictactoe',
            title: 'دوز نئونی ۳×۳',
            tagline: 'سرعتی، غافلگیرکننده و تاکتیکی',
            icon: '⭕❌',
            players: '۲ نفره',
            duration: '~۱ دقیقه',
            reward: matchType === 'online' ? 40 : null,
            badge: '⚡ برق‌آسا',
            accent: 'cyan',
            theme: {
                gradient: 'from-cyan-500 via-sky-600 to-blue-700',
                border: 'border-cyan-500/40 hover:border-cyan-400',
                shadow: 'hover:shadow-[0_20px_50px_-12px_rgba(6,182,212,0.45)]',
                glowBg: 'bg-cyan-500/15',
                badgeBg: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/30',
                btnGrad: 'from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500',
                btnShadow: 'shadow-cyan-500/30',
                iconBg: 'from-cyan-500/20 to-blue-600/20 border-cyan-400/30 text-cyan-300'
            },
            desc: 'نبرد سرعتی و استراتژیک دوز روی صفحه ۳×۳. با پیش‌بینی حرکت رقیب، ۳ علامت را در یک خط افقی، عمودی یا مورب بچینید!',
            rules: [
                'هر بازیکن به نوبت یکی از ۹ خانه خالی را علامت‌گذاری می‌کند.',
                'نخستین بازیکنی که ۳ علامت متوالی بچیند برنده مسابقه خواهد بود.',
                'در صورت پر شدن تمام خانه‌ها بدون برنده، مسابقه مساوی تمام می‌شود.'
            ],
            renderPreview: () => (React.createElement("div", { className: "relative w-full h-32 flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950/80 to-cyan-950/40 border border-cyan-500/20 p-2" },
                React.createElement("div", { className: "grid grid-cols-3 grid-rows-3 gap-1.5 w-24 h-24 p-1 rounded-xl bg-slate-900/80 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.25)]" },
                    React.createElement("div", { className: "flex items-center justify-center font-black text-xs text-cyan-400 drop-shadow-[0_0_8px_#22d3ee]" }, "\u2715"),
                    React.createElement("div", { className: "flex items-center justify-center font-black text-xs text-rose-400 drop-shadow-[0_0_8px_#fb7185]" }, "\u25CB"),
                    React.createElement("div", { className: "flex items-center justify-center font-black text-xs text-cyan-400 drop-shadow-[0_0_8px_#22d3ee]" }, "\u2715"),
                    React.createElement("div", { className: "flex items-center justify-center font-black text-xs text-rose-400 drop-shadow-[0_0_8px_#fb7185]" }, "\u25CB"),
                    React.createElement("div", { className: "flex items-center justify-center font-black text-xs text-cyan-300 bg-cyan-500/20 rounded-md animate-pulse" }, "\u2715"),
                    React.createElement("div", { className: "flex items-center justify-center font-black text-xs text-slate-700" }, "\u00B7"),
                    React.createElement("div", { className: "flex items-center justify-center font-black text-xs text-cyan-400 drop-shadow-[0_0_8px_#22d3ee]" }, "\u2715"),
                    React.createElement("div", { className: "flex items-center justify-center font-black text-xs text-rose-400 drop-shadow-[0_0_8px_#fb7185]" }, "\u25CB"),
                    React.createElement("div", { className: "flex items-center justify-center font-black text-xs text-slate-700" }, "\u00B7")),
                React.createElement("span", { className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent blur-[1px] animate-pulse" })))
        },
        {
            key: 'ludo',
            title: 'منچ رویال ۴ نفره',
            tagline: 'پرشورترین آوردگاه شانس و هوش',
            icon: '🎲',
            players: '۴ نفره',
            duration: '~۵ تا ۸ دقیقه',
            reward: matchType === 'online' ? 100 : null,
            badge: '🔥 پرطرفدارترین',
            accent: 'amber',
            theme: {
                gradient: 'from-amber-500 via-orange-600 to-rose-600',
                border: 'border-amber-500/40 hover:border-amber-400',
                shadow: 'hover:shadow-[0_20px_50px_-12px_rgba(245,158,11,0.45)]',
                glowBg: 'bg-amber-500/15',
                badgeBg: 'bg-amber-500/20 text-amber-200 border-amber-400/30',
                btnGrad: 'from-amber-500 via-orange-500 to-rose-600 hover:from-amber-400 hover:to-rose-500',
                btnShadow: 'shadow-amber-500/30',
                iconBg: 'from-amber-500/20 to-orange-600/20 border-amber-400/30 text-amber-300'
            },
            desc: 'رقابت داغ ۴ نفره! مهره‌های حریف را بزنید، با تاس ۶ از آشیانه بیرون بیایید و زودتر از دیگران ۴ مهره‌تان را به ستون فتح برسانید.',
            rules: [
                'برای خارج کردن مهره از آشیانه باید حتماً تاس ۶ بیاورید.',
                'با فرود آمدن روی مهره حریف در خانه‌های عادی، آن مهره به خانه بازمی‌گردد.',
                'هر بازیکن که بتواند زودتر تمام ۴ مهره خود را به مرکز صفحه برساند برنده است.'
            ],
            renderPreview: () => (React.createElement("div", { className: "relative w-full h-32 flex items-center justify-around overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950/80 to-amber-950/40 border border-amber-500/20 p-2" },
                React.createElement("div", { className: "relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-600 text-slate-950 font-black shadow-[0_10px_25px_rgba(245,158,11,0.5)] transform -rotate-6 hover:rotate-6 transition-transform" },
                    React.createElement("span", { className: "text-3xl leading-none" }, "\u2685"),
                    React.createElement("span", { className: "absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-ping" })),
                React.createElement("div", { className: "flex items-center gap-2" },
                    React.createElement("span", { className: "w-6 h-6 rounded-full bg-red-500 border-2 border-white shadow-[0_0_12px_#ef4444] animate-bounce", style: { animationDelay: '0ms' } }),
                    React.createElement("span", { className: "w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow-[0_0_12px_#10b981] animate-bounce", style: { animationDelay: '150ms' } }),
                    React.createElement("span", { className: "w-6 h-6 rounded-full bg-amber-400 border-2 border-white shadow-[0_0_12px_#f59e0b] animate-bounce", style: { animationDelay: '300ms' } }),
                    React.createElement("span", { className: "w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow-[0_0_12px_#3b82f6] animate-bounce", style: { animationDelay: '450ms' } }))))
        },
        {
            key: 'chess',
            title: 'شطرنج کلاسیک رسمی',
            tagline: 'آوردگاه نوابغ و شاهان تاکتیک',
            icon: '♞',
            players: '۲ نفره',
            duration: '~۱۰ دقیقه',
            reward: matchType === 'online' ? 50 : null,
            badge: '👑 اوج استراتژی',
            accent: 'purple',
            theme: {
                gradient: 'from-indigo-500 via-purple-600 to-pink-600',
                border: 'border-indigo-500/40 hover:border-indigo-400',
                shadow: 'hover:shadow-[0_20px_50px_-12px_rgba(99,102,241,0.45)]',
                glowBg: 'bg-indigo-500/15',
                badgeBg: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30',
                btnGrad: 'from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500',
                btnShadow: 'shadow-indigo-500/30',
                iconBg: 'from-indigo-500/20 to-purple-600/20 border-indigo-400/30 text-indigo-300'
            },
            desc: 'نبرد فکری ۶۴ خانه‌ای با ساعت شطرنج رسمی و قوانین بین‌المللی فیده. کیش و مات کنید و نام خود را به عنوان استاد بزرگ ثبت نمایید!',
            rules: [
                'قوانین استاندارد شطرنج بین‌المللی شامل قلعه رفتن، ارتقای پیاده و آن‌پاسان.',
                'ساعت رسمی مسابقه: کنترل زمان مساوی برای هر دو بازیکن.',
                'پیروزی با کیش و مات، اتمام زمان حریف یا تسلیم شدن رقیب ثبت می‌گردد.'
            ],
            renderPreview: () => (React.createElement("div", { className: "relative w-full h-32 flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950/80 to-purple-950/40 border border-indigo-500/20 p-2" },
                React.createElement("div", { className: "flex items-center gap-4" },
                    React.createElement("div", { className: "w-16 h-16 grid grid-cols-2 grid-rows-2 rounded-xl overflow-hidden border border-indigo-400/40 shadow-[0_0_20px_rgba(99,102,241,0.3)] transform rotate-12" },
                        React.createElement("div", { className: "bg-slate-300 flex items-center justify-center text-xl text-slate-900 font-bold" }, "\u265E"),
                        React.createElement("div", { className: "bg-slate-700 flex items-center justify-center text-xl text-amber-300 font-bold" }, "\u265A"),
                        React.createElement("div", { className: "bg-slate-700 flex items-center justify-center text-xl text-slate-300 font-bold" }, "\u265B"),
                        React.createElement("div", { className: "bg-slate-300 flex items-center justify-center text-xl text-slate-900 font-bold" }, "\u265C")),
                    React.createElement("div", { className: "flex flex-col items-start gap-1" },
                        React.createElement("span", { className: "text-xs font-black text-purple-200 flex items-center gap-1" },
                            React.createElement("span", { className: "w-2 h-2 rounded-full bg-purple-400 animate-pulse" }),
                            "\u0633\u0627\u0639\u062A \u06F1\u06F2 \u062F\u0642\u06CC\u0642\u0647\u200C\u0627\u06CC"),
                        React.createElement("span", { className: "text-[10px] text-slate-400" }, "\u0642\u0648\u0627\u0646\u06CC\u0646 \u0631\u0633\u0645\u06CC \u0628\u06CC\u0646\u200C\u0627\u0644\u0645\u0644\u0644\u06CC"),
                        React.createElement("span", { className: "text-lg" }, "\uD83D\uDC51 \u265F \u265E")))))
        },
        {
            key: 'backgammon',
            title: 'تخته نرد اصیل',
            tagline: 'نبرد شانس، مهارت و استراتژی',
            icon: '🎲',
            players: '۲ نفره',
            duration: '~۵ تا ۷ دقیقه',
            reward: matchType === 'online' ? '۶۰ تا ۱۸۰' : null,
            badge: '👑 بازی اصیل ایرانی',
            accent: 'amber',
            theme: {
                gradient: 'from-amber-600 via-yellow-600 to-amber-900',
                border: 'border-amber-500/40 hover:border-amber-300',
                shadow: 'hover:shadow-[0_20px_50px_-12px_rgba(245,158,11,0.5)]',
                glowBg: 'bg-amber-500/20',
                badgeBg: 'bg-amber-500/20 text-amber-200 border-amber-400/30',
                btnGrad: 'from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400',
                btnShadow: 'shadow-amber-500/30',
                iconBg: 'from-amber-500/20 to-yellow-600/20 border-amber-400/30 text-amber-300'
            },
            desc: 'بازی محبوب و پرطرفدار تخته نرد با ۲۴ خانه، قوانین فدراسیونی، پیشخوان بار، سینی برداشت و ضرایب پاداش مارس و مارس سیاه!',
            rules: [
                'حرکت بر اساس تاس‌های ریخته‌شده، جفت تاس ۴ حرکت اعطا می‌کند.',
                'زدن مهره تک حریف و فرستادن آن به پیشخوان وسط.',
                'برداشتن مهره‌ها در پایان بازی پس از جمع‌آوری تمام مهره‌ها در خانه خودی.',
                'پاداش مضاعف در صورت مارس (۲ برابر) و مارس سیاه (۳ برابر).'
            ],
            renderPreview: () => (React.createElement("div", { className: "relative w-full h-32 flex items-center justify-around overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950/90 to-amber-950/60 border border-amber-500/30 p-2" },
                React.createElement("div", { className: "w-20 h-20 rounded-xl bg-amber-950/80 border border-amber-600/40 p-1 flex flex-col justify-between shadow-lg" },
                    React.createElement("div", { className: "flex justify-between" },
                        React.createElement("span", { className: "w-2 h-6 bg-gradient-to-b from-amber-600 to-transparent rounded-t-sm" }),
                        React.createElement("span", { className: "w-2 h-6 bg-gradient-to-b from-amber-800 to-transparent rounded-t-sm" }),
                        React.createElement("span", { className: "w-2 h-6 bg-gradient-to-b from-amber-600 to-transparent rounded-t-sm" })),
                    React.createElement("div", { className: "flex justify-center items-center gap-1" },
                        React.createElement("span", { className: "w-4 h-4 rounded-full bg-amber-100 border border-amber-400 shadow-sm" }),
                        React.createElement("span", { className: "w-4 h-4 rounded-full bg-slate-900 border border-indigo-400 shadow-sm" })),
                    React.createElement("div", { className: "flex justify-between" },
                        React.createElement("span", { className: "w-2 h-6 bg-gradient-to-t from-amber-800 to-transparent rounded-b-sm" }),
                        React.createElement("span", { className: "w-2 h-6 bg-gradient-to-t from-amber-600 to-transparent rounded-b-sm" }),
                        React.createElement("span", { className: "w-2 h-6 bg-gradient-to-t from-amber-800 to-transparent rounded-b-sm" }))),
                React.createElement("div", { className: "flex flex-col items-center gap-1.5" },
                    React.createElement("div", { className: "w-10 h-10 rounded-xl bg-gradient-to-br from-amber-200 to-yellow-600 text-slate-950 font-black flex items-center justify-center text-xl shadow-md transform rotate-12 hover:rotate-0 transition-transform" }, "\u2684"),
                    React.createElement("span", { className: "text-[10px] font-black text-amber-300" }, "\u0642\u0648\u0627\u0646\u06CC\u0646 \u0631\u0633\u0645\u06CC \u0641\u06CC\u062F\u0647"))))
        }
    ];
    return (React.createElement("div", { className: "w-full max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500 text-slate-100 select-none pb-12", dir: "rtl" },
        React.createElement("style", null, `
                @keyframes hubFloat { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-7px); } }
                @keyframes hubPulseGlow { 0%, 100% { opacity: 0.35; transform: scale(1); } 50% { opacity: 0.75; transform: scale(1.08); } }
                @keyframes hubSheen { 0% { transform: translateX(180%) skewX(-20deg); } 100% { transform: translateX(-180%) skewX(-20deg); } }
                @keyframes hubBadgeGlow { 0%, 100% { box-shadow: 0 0 0 rgba(251,191,36,0); } 50% { box-shadow: 0 0 14px rgba(251,191,36,0.5); } }
                .hub-float { animation: hubFloat 4s ease-in-out infinite; }
                .hub-sheen { position: relative; overflow: hidden; }
                .hub-sheen::after {
                    content: '';
                    position: absolute;
                    top: 0; left: 0;
                    width: 45%; height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent);
                    transform: translateX(180%) skewX(-20deg);
                    pointer-events: none;
                }
                .hub-sheen:hover::after {
                    animation: hubSheen 0.85s ease-out;
                }
                .hub-card-hover {
                    transition: all 0.38s cubic-bezier(0.2, 0.8, 0.2, 1);
                }
                .hub-card-hover:hover {
                    transform: translateY(-8px) scale(1.015);
                }
            `),
        React.createElement("div", { className: "pointer-events-none fixed inset-0 overflow-hidden -z-10" },
            React.createElement("div", { className: "absolute top-1/4 right-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] animate-[hubPulseGlow_6s_ease-in-out_infinite]" }),
            React.createElement("div", { className: "absolute top-1/2 left-10 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] animate-[hubPulseGlow_7s_ease-in-out_1s_infinite]" }),
            React.createElement("div", { className: "absolute bottom-10 right-1/3 w-96 h-96 bg-amber-600/10 rounded-full blur-[120px] animate-[hubPulseGlow_8s_ease-in-out_2s_infinite]" })),
        React.createElement(DailyWheelCard, { currentUser: currentUser, onOpen: onOpenWheel || (() => { }) }),
        React.createElement("div", { className: "relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-900/75 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl shadow-indigo-950/30" },
            React.createElement("div", { className: "absolute -left-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-600/10 blur-3xl pointer-events-none" }),
            React.createElement("div", { className: "absolute -right-16 -bottom-16 h-56 w-56 rounded-full bg-gradient-to-br from-cyan-500/15 to-blue-600/10 blur-3xl pointer-events-none" }),
            React.createElement("div", { className: "relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6" },
                React.createElement("div", { className: "flex items-center gap-4" },
                    React.createElement("div", { className: "relative hub-float" },
                        React.createElement(PlayerAvatar, { user: currentUser, className: "w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ring-4 ring-indigo-500/30 shadow-xl" }),
                        React.createElement("span", { className: "absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-slate-900", title: "\u0622\u0646\u0644\u0627\u06CC\u0646" })),
                    React.createElement("div", null,
                        React.createElement("div", { className: "flex flex-wrap items-center gap-2 mb-1" },
                            React.createElement("span", { className: "text-xs font-bold text-indigo-300" }, "\u062E\u0648\u0634 \u0622\u0645\u062F\u06CC\u062F\u060C \u0642\u0647\u0631\u0645\u0627\u0646!"),
                            currentUser.equipped?.titles && currentUser.equipped.titles !== 'classic' && (React.createElement("div", { className: "transform scale-90 origin-right" }, renderPlayerTitle(currentUser.equipped.titles)))),
                        React.createElement("h1", { className: "text-2xl sm:text-3xl font-black bg-gradient-to-l from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent" }, currentUser.username),
                        React.createElement("div", { className: "flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400" },
                            React.createElement("span", { className: "flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 font-bold text-amber-300" },
                                React.createElement(IconCoin, { className: "w-4 h-4 text-amber-400" }),
                                React.createElement("span", null, (currentUser.coins || 0).toLocaleString('fa-IR')),
                                React.createElement("span", { className: "text-[10px] text-amber-400/80" }, "\u06A9\u06CC\u0648\u062C\u06CC")),
                            React.createElement("span", { className: "flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 font-bold text-slate-300" },
                                React.createElement(IconTrophy, { className: "w-3.5 h-3.5 text-amber-400" }),
                                React.createElement("span", null,
                                    totalWins,
                                    " \u0628\u0631\u062F"),
                                React.createElement("span", { className: "text-[10px] text-slate-500" },
                                    "(",
                                    winRate,
                                    "\u066A \u067E\u06CC\u0631\u0648\u0632\u06CC)")),
                            gameDiscountPct > 0 && (React.createElement("span", { className: "flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/40 font-bold text-emerald-300 shadow-sm animate-pulse" },
                                React.createElement("span", null, "\uD83D\uDEE1\uFE0F \u062A\u062E\u0641\u06CC\u0641 \u0622\u0644\u06CC\u0627\u0646\u0632:"),
                                React.createElement("b", { className: "text-emerald-200" },
                                    gameDiscountPct,
                                    "\u066A")))))),
                React.createElement("div", { className: "flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-950/80 p-2 rounded-2xl border border-white/10 shadow-inner" },
                    React.createElement("button", { type: "button", onClick: () => {
                            setMatchType('online');
                            setEntryFeeError('');
                            try {
                                playSound('button', currentUser.settings?.sound);
                            }
                            catch (e) { }
                        }, className: `flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-black text-xs sm:text-sm transition-all duration-300 active:scale-95 ${matchType === 'online'
                            ? 'bg-gradient-to-l from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400/30'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}` },
                        React.createElement("span", { className: "relative flex h-2.5 w-2.5" },
                            React.createElement("span", { className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" }),
                            React.createElement("span", { className: "relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" })),
                        React.createElement(IconGlobe, { className: "w-4 h-4" }),
                        React.createElement("span", null, "\u0631\u0642\u0627\u0628\u062A \u0622\u0646\u0644\u0627\u06CC\u0646 (PvP)"),
                        React.createElement("span", { className: "px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30" },
                            actualEntryFee,
                            " \u06A9\u06CC\u0648\u062C\u06CC")),
                    React.createElement("button", { type: "button", onClick: () => {
                            setMatchType('bot');
                            setEntryFeeError('');
                            try {
                                playSound('button', currentUser.settings?.sound);
                            }
                            catch (e) { }
                        }, className: `flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-black text-xs sm:text-sm transition-all duration-300 active:scale-95 ${matchType === 'bot'
                            ? 'bg-gradient-to-l from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400/30'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}` },
                        React.createElement(IconBot, { className: "w-4 h-4" }),
                        React.createElement("span", null, "\u062A\u0645\u0631\u06CC\u0646 \u0628\u0627 \u0631\u0628\u0627\u062A (\u0622\u0641\u0644\u0627\u06CC\u0646)"),
                        React.createElement("span", { className: "px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30" }, "\u0631\u0627\u06CC\u06AF\u0627\u0646")))),
            React.createElement("div", { className: "mt-6 pt-5 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs" },
                React.createElement("div", { className: "flex items-center gap-2" },
                    React.createElement("span", { className: `h-2.5 w-2.5 rounded-full ${matchType === 'online' ? 'bg-indigo-400 shadow-[0_0_8px_#818cf8]' : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'}` }),
                    React.createElement("span", { className: "font-bold text-slate-300" }, matchType === 'online'
                        ? 'حالت فعال: رقابت زنده با بازیکنان واقعی سراسر کشور به همراه رتبه‌بندی و پاداش کیوجی'
                        : 'حالت فعال: تمرین و آماده‌سازی بدون هزینه در برابر هوش مصنوعی هوشمند')),
                matchType === 'online' && gameDiscountPct > 0 && (React.createElement("div", { className: "text-emerald-300 font-bold bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20" },
                    "\u2713 ",
                    gameDiscountPct,
                    "\u066A \u062A\u062E\u0641\u06CC\u0641 \u0622\u0644\u06CC\u0627\u0646\u0632 \u0641\u0639\u0627\u0644 \u0627\u0633\u062A (\u0648\u0631\u0648\u062F\u06CC: ",
                    actualEntryFee,
                    " \u0628\u0647 \u062C\u0627\u06CC ",
                    baseEntryFee,
                    " \u06A9\u06CC\u0648\u062C\u06CC)")))),
        entryFeeError && (React.createElement("div", { className: "p-4 sm:p-5 rounded-2xl bg-rose-950/80 border-2 border-rose-500/60 text-rose-200 text-xs sm:text-sm font-bold flex items-center justify-between gap-3 shadow-xl shadow-rose-950/40 animate-bounce-slight" },
            React.createElement("div", { className: "flex items-center gap-3" },
                React.createElement("span", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-300 text-lg" }, "\u26A0\uFE0F"),
                React.createElement("span", null, entryFeeError)),
            React.createElement("button", { onClick: () => setEntryFeeError(''), className: "px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-bold transition-colors" }, "\u0645\u062A\u0648\u062C\u0647 \u0634\u062F\u0645"))),
        React.createElement("div", { className: "flex items-center justify-between px-2 pt-2" },
            React.createElement("div", null,
                React.createElement("h2", { className: "text-xl sm:text-2xl font-black text-white flex items-center gap-2" },
                    React.createElement("span", null, "\uD83C\uDFAE"),
                    React.createElement("span", null, "\u0628\u0627\u0632\u06CC \u0645\u0648\u0631\u062F \u0639\u0644\u0627\u0642\u0647\u200C\u0627\u062A \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646")),
                React.createElement("p", { className: "text-xs sm:text-sm text-slate-400 mt-1" }, "\u0631\u0648\u06CC \u0647\u0631 \u0628\u0627\u0632\u06CC \u06A9\u0644\u06CC\u06A9 \u06A9\u0646\u06CC\u062F \u062A\u0627 \u0641\u0648\u0631\u0627\u064B \u0648\u0627\u0631\u062F \u0632\u0645\u06CC\u0646 \u0645\u0633\u0627\u0628\u0642\u0647 \u0634\u0648\u06CC\u062F")),
            React.createElement("span", { className: "hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs text-slate-300" },
                React.createElement("span", null, "\u26A1 \u06F4 \u0628\u0627\u0632\u06CC \u062F\u0631 \u062F\u0633\u062A\u0631\u0633"))),
        React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6" }, gamesData.map((game, idx) => {
            const isAffordable = matchType === 'bot' || (currentUser.coins || 0) >= actualEntryFee;
            return (React.createElement("div", { key: game.key, style: { animationDelay: `${idx * 120}ms` }, className: `group relative rounded-[2.2rem] border-2 ${game.theme.border} bg-slate-900/80 p-5 sm:p-6 backdrop-blur-xl shadow-xl ${game.theme.shadow} hub-card-hover flex flex-col justify-between overflow-hidden` },
                React.createElement("div", { className: `absolute -right-12 -top-12 h-44 w-44 rounded-full ${game.theme.glowBg} blur-3xl group-hover:scale-125 transition-transform duration-700 pointer-events-none` }),
                React.createElement("div", { className: "relative z-10" },
                    React.createElement("div", { className: "flex items-center justify-between mb-4" },
                        React.createElement("span", { className: `px-3 py-1 rounded-full text-[11px] font-black border ${game.theme.badgeBg}` }, game.badge),
                        React.createElement("button", { type: "button", onClick: (e) => {
                                e.stopPropagation();
                                setInfoModalGame(game);
                            }, className: "flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[11px] font-bold text-slate-300 transition-colors", title: "\u0645\u0634\u0627\u0647\u062F\u0647 \u0642\u0648\u0627\u0646\u06CC\u0646 \u0648 \u062C\u0632\u0626\u06CC\u0627\u062A" },
                            React.createElement("span", null, "\u0631\u0627\u0647\u0646\u0645\u0627"),
                            React.createElement("span", null, "\u2139\uFE0F"))),
                    React.createElement("div", { className: "mb-5 transition-transform duration-500 group-hover:scale-[1.03]" }, game.renderPreview()),
                    React.createElement("div", { className: "space-y-2 mb-4" },
                        React.createElement("div", { className: "flex items-center justify-between" },
                            React.createElement("h3", { className: "text-xl sm:text-2xl font-black text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-l group-hover:from-white group-hover:to-slate-200 transition-colors" }, game.title),
                            React.createElement("span", { className: "text-xl" }, game.icon)),
                        React.createElement("p", { className: "text-xs font-semibold text-slate-400" }, game.tagline)),
                    React.createElement("div", { className: "grid grid-cols-2 gap-2 mb-4 text-center" },
                        React.createElement("div", { className: "p-2 rounded-xl bg-slate-950/60 border border-white/[0.06]" },
                            React.createElement("div", { className: "text-[10px] text-slate-500 font-bold" }, "\u0638\u0631\u0641\u06CC\u062A"),
                            React.createElement("div", { className: "text-xs font-black text-slate-200 mt-0.5" }, game.players)),
                        React.createElement("div", { className: "p-2 rounded-xl bg-slate-950/60 border border-white/[0.06]" },
                            React.createElement("div", { className: "text-[10px] text-slate-500 font-bold" }, "\u0645\u062F\u062A \u0632\u0645\u0627\u0646"),
                            React.createElement("div", { className: "text-xs font-black text-slate-200 mt-0.5" }, game.duration))),
                    React.createElement("div", { className: `p-3 rounded-2xl mb-6 border ${matchType === 'online'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'} flex items-center justify-between` },
                        React.createElement("span", { className: "text-xs font-bold" }, matchType === 'online' ? 'جایزه پیروزی:' : 'وضعیت بازی:'),
                        React.createElement("div", { className: "flex items-center gap-1.5 font-black text-sm" }, matchType === 'online' ? (React.createElement(React.Fragment, null,
                            React.createElement("span", null, game.reward),
                            React.createElement(IconCoin, { className: "w-4 h-4 text-amber-400" }),
                            React.createElement("span", { className: "text-[10px] text-amber-400/80" }, "\u06A9\u06CC\u0648\u062C\u06CC"))) : (React.createElement("span", { className: "text-emerald-300" }, "\u062A\u0645\u0631\u06CC\u0646\u06CC \u0648 \u0631\u0627\u06CC\u06AF\u0627\u0646"))))),
                React.createElement("div", { className: "relative z-10 pt-2" },
                    React.createElement("button", { type: "button", onClick: () => handleStartGame(game.key), className: `w-full py-4 rounded-2xl font-black text-sm text-white shadow-lg ${game.theme.btnGrad} ${game.theme.btnShadow} hub-sheen transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 group-hover:shadow-2xl` }, matchType === 'online' ? (React.createElement(React.Fragment, null,
                        React.createElement(IconGlobe, { className: "w-4 h-4" }),
                        React.createElement("span", null, "\u0634\u0631\u0648\u0639 \u0631\u0642\u0627\u0628\u062A \u0622\u0646\u0644\u0627\u06CC\u0646"),
                        React.createElement("span", { className: "px-2 py-0.5 rounded-lg bg-black/25 text-amber-300 text-xs font-black flex items-center gap-1" },
                            actualEntryFee,
                            " ",
                            React.createElement(IconCoin, { className: "w-3.5 h-3.5" })))) : (React.createElement(React.Fragment, null,
                        React.createElement(IconBot, { className: "w-4 h-4" }),
                        React.createElement("span", null, "\u0634\u0631\u0648\u0639 \u062A\u0645\u0631\u06CC\u0646 \u0628\u0627 \u0631\u0628\u0627\u062A"),
                        React.createElement("span", { className: "px-2 py-0.5 rounded-lg bg-black/20 text-emerald-200 text-xs font-black" }, "\u0631\u0627\u06CC\u06AF\u0627\u0646")))))));
        })),
        infoModalGame && (React.createElement("div", { className: "fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200", onClick: () => setInfoModalGame(null) },
            React.createElement("div", { role: "dialog", "aria-modal": "true", onClick: (e) => e.stopPropagation(), className: "relative w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200" },
                React.createElement("div", { className: "flex items-center justify-between border-b border-white/10 pb-4" },
                    React.createElement("div", { className: "flex items-center gap-3" },
                        React.createElement("span", { className: "text-3xl" }, infoModalGame.icon),
                        React.createElement("div", null,
                            React.createElement("h3", { className: "text-xl font-black text-white" }, infoModalGame.title),
                            React.createElement("p", { className: "text-xs text-slate-400" }, infoModalGame.tagline))),
                    React.createElement("button", { onClick: () => setInfoModalGame(null), className: "w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-black flex items-center justify-center transition-colors" }, "\u2715")),
                React.createElement("div", { className: "space-y-4 text-xs sm:text-sm leading-relaxed text-slate-300" },
                    React.createElement("div", null,
                        React.createElement("h4", { className: "font-black text-indigo-300 mb-1" }, "\u062F\u0631\u0628\u0627\u0631\u0647 \u0627\u06CC\u0646 \u0628\u0627\u0632\u06CC:"),
                        React.createElement("p", { className: "text-slate-400" }, infoModalGame.desc)),
                    React.createElement("div", null,
                        React.createElement("h4", { className: "font-black text-emerald-300 mb-2" }, "\u0642\u0648\u0627\u0646\u06CC\u0646 \u0648 \u0634\u06CC\u0648\u0647 \u0628\u0627\u0632\u06CC:"),
                        React.createElement("ul", { className: "space-y-1.5 pr-4 list-disc list-outside text-slate-400" }, infoModalGame.rules.map((rule, rIdx) => (React.createElement("li", { key: rIdx }, rule))))),
                    React.createElement("div", { className: "p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200" },
                        React.createElement("b", { className: "block mb-1 font-black" }, "\u067E\u0627\u062F\u0627\u0634 \u0645\u0633\u0627\u0628\u0642\u0647 \u0622\u0646\u0644\u0627\u06CC\u0646:"),
                        React.createElement("span", null,
                            "\u0628\u0627 \u0634\u06A9\u0633\u062A \u062D\u0631\u06CC\u0641 \u062F\u0631 \u062D\u0627\u0644\u062A \u0622\u0646\u0644\u0627\u06CC\u0646\u060C \u0628\u0644\u0627\u0641\u0627\u0635\u0644\u0647 \u0645\u0628\u0644\u063A ",
                            React.createElement("b", null,
                                infoModalGame.reward,
                                " \u06A9\u06CC\u0648\u062C\u06CC"),
                            " \u0628\u0647 \u062D\u0633\u0627\u0628 \u0634\u0645\u0627 \u0648\u0627\u0631\u06CC\u0632 \u062E\u0648\u0627\u0647\u062F \u0634\u062F."))),
                React.createElement("div", { className: "pt-2 flex gap-3" },
                    React.createElement("button", { onClick: () => {
                            const gKey = infoModalGame.key;
                            setInfoModalGame(null);
                            handleStartGame(gKey);
                        }, className: `flex-1 py-3.5 rounded-xl text-white font-black text-sm bg-gradient-to-r ${infoModalGame.theme.btnGrad} shadow-lg active:scale-95 transition-all` }, "\u0648\u0631\u0648\u062F \u0628\u0647 \u0627\u06CC\u0646 \u0628\u0627\u0632\u06CC"),
                    React.createElement("button", { onClick: () => setInfoModalGame(null), className: "px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-colors" }, "\u0628\u0633\u062A\u0646")))))));
};

/* ===== core/avatars.js ===== */
// ---------- آواتارهای آماده (۱۰ عدد: ۶ عدد رایگان + ۴ عدد ویژه با ۱۵۰ کیوجی) ----------
const svgAvatarUri = (svg) => 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
const ALL_AVATARS = [
    // ۶ آواتار اولیه (رایگان)
    { id: 'free_1', isPremium: false, name: 'سرباز کیهانی', src: svgAvatarUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="a1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#a1)"/><path d="M32 12 L48 40 H16 Z" fill="#e2e8f0"/><circle cx="32" cy="12" r="4" fill="#fbbf24"/><path d="M20 40 h24 v6 a12 6 0 0 1-24 0 Z" fill="#1e293b"/></svg>`) },
    { id: 'free_2', isPremium: false, name: 'زمرد سبز', src: svgAvatarUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="a2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#059669"/><stop offset="1" stop-color="#10b981"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#a2)"/><path d="M14 30 q10-18 26-12 q14 5 10 18 q-4 12-20 10 q14-2 14-12 q0-8-10-8 q-14 0-20 4" fill="#064e3b"/><circle cx="44" cy="24" r="3" fill="#fbbf24"/></svg>`) },
    { id: 'free_3', isPremium: false, name: 'شوالیه لاجوردی', src: svgAvatarUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="a3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0ea5e9"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#a3)"/><path d="M32 10 L52 18 v14 c0 12-9 19-20 22 C21 51 12 44 12 32 V18 Z" fill="#e2e8f0"/><path d="M32 16 L46 21 v11 c0 9-6 14-14 17 V16 Z" fill="#0f172a"/><path d="M32 24 l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1 Z" fill="#fbbf24"/></svg>`) },
    { id: 'free_4', isPremium: false, name: 'تاج خورشید', src: svgAvatarUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="a4" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d97706"/><stop offset="1" stop-color="#f59e0b"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#a4)"/><path d="M14 42 L14 26 L20 32 L26 20 L32 30 L38 20 L44 32 L50 26 L50 42 Z" fill="#fff7ed"/><rect x="12" y="42" width="40" height="6" rx="3" fill="#78350f"/><circle cx="26" cy="26" r="3" fill="#ef4444"/><circle cx="38" cy="26" r="3" fill="#ef4444"/></svg>`) },
    { id: 'free_5', isPremium: false, name: 'سایه‌بان فولادی', src: svgAvatarUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="a5" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#475569"/><stop offset="1" stop-color="#94a3b8"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#a5)"/><path d="M18 34 v-8 a14 14 0 0 1 28 0 v8 l4 10 H14 Z" fill="#e2e8f0"/><rect x="26" y="28" width="12" height="14" rx="2" fill="#0f172a"/><path d="M18 30 h8 M38 30 h8" stroke="#64748b" stroke-width="2"/><path d="M30 44 h4 v6 h-4 Z" fill="#334155"/></svg>`) },
    { id: 'free_6', isPremium: false, name: 'کاخ نئونی', src: svgAvatarUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="a6" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#db2777"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#a6)"/><rect x="14" y="30" width="36" height="22" fill="#1e1b4b"/><rect x="20" y="18" width="8" height="14" fill="#312e81"/><rect x="36" y="18" width="8" height="14" fill="#312e81"/><path d="M14 30 L32 12 L50 30 Z" fill="#4c1d95"/><rect x="28" y="40" width="8" height="12" fill="#0f172a"/><circle cx="24" cy="36" r="2" fill="#fbbf24"/><circle cx="40" cy="36" r="2" fill="#fbbf24"/></svg>`) },

    // ۴ آواتار ویژه (پریمیوم - نیازمند ۱۵۰ کیوجی)
    { id: 'prem_1', isPremium: true, name: 'اژدهای یاقوتی', src: svgAvatarUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="p1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#be123c"/><stop offset="1" stop-color="#f43f5e"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#p1)"/><circle cx="32" cy="32" r="20" fill="#4c0519"/><path d="M22 26 L32 14 L42 26 L32 38 Z" fill="#fbbf24"/><circle cx="32" cy="26" r="5" fill="#f43f5e"/><path d="M26 40 Q32 48 38 40" stroke="#fbcfe8" stroke-width="3" fill="none"/></svg>`) },
    { id: 'prem_2', isPremium: true, name: 'شاهین طلایی سلطنتی', src: svgAvatarUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="p2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f59e0b"/><stop offset="1" stop-color="#fbbf24"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#p2)"/><path d="M32 8 L44 24 H20 Z" fill="#78350f"/><path d="M12 28 Q32 20 52 28 Q32 56 12 28 Z" fill="#fffbeb"/><circle cx="28" cy="32" r="3" fill="#b45309"/><circle cx="36" cy="32" r="3" fill="#b45309"/><polygon points="32,36 29,42 35,42" fill="#d97706"/></svg>`) },
    { id: 'prem_3', isPremium: true, name: 'شعله ققنوس آتشین', src: svgAvatarUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="p3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ea580c"/><stop offset="1" stop-color="#ef4444"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#p3)"/><path d="M32 10 Q46 24 38 38 Q48 30 50 48 Q32 58 14 48 Q16 30 26 38 Q18 24 32 10 Z" fill="#fef08a"/><circle cx="32" cy="36" r="6" fill="#dc2626"/></svg>`) },
    { id: 'prem_4', isPremium: true, name: 'الماس کهکشانی سایبر', src: svgAvatarUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="p4" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0284c7"/><stop offset="1" stop-color="#06b6d4"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#p4)"/><polygon points="32,8 52,24 44,54 20,54 12,24" fill="#082f49"/><polygon points="32,16 44,28 38,48 26,48 20,28" fill="#e0f2fe"/><circle cx="32" cy="34" r="5" fill="#38bdf8"/></svg>`) }
];

const getAvatarSrc = (user) => user?.avatar || '';

/* ===== core/store.js ===== */
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

/* ===== ui/pieces.jsx ===== */
// ---------- رندر مهره‌ها با استایل‌های فروشگاه (رنگ‌ها ثابت؛ فقط شکل و مدل عوض می‌شود) ----------
const CHESS_GLYPHS = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
// مدرن هندسی (viewBox ۴۵×۴۵)
const MODERN_PIECES = {
    p: '<circle cx="22.5" cy="13" r="6"/><path d="M17 37l3-17h5l3 17z"/><path d="M12 41v-4h21v4z"/>',
    r: '<path d="M12 41v-4h21v4zM15 37V19h15v18zM12 19V8h5v4h3V8h5v4h3V8h5v11z"/>',
    n: '<path d="M13 41v-4c0-10 3-17 9-22l-2-7 7 4c7 3 8 14 8 25v4z"/><circle cx="24" cy="15.5" r="1.7" style="fill:var(--ink);stroke:none"/>',
    b: '<circle cx="22.5" cy="8" r="2.8"/><path d="M22.5 11c6 5 9 10 9 15 0 4-4 6-9 6s-9-2-9-6c0-5 3-10 9-15z"/><path d="M12 41l3-9h15l3 9z"/><path d="M19.5 21l6 6" style="stroke:var(--ink);stroke-width:1.6"/>',
    q: '<path d="M10 39L7 16l8 11 3-16 4.5 15 4.5-15 3 16 8-11-3 23z"/><circle cx="7" cy="14" r="2.4"/><circle cx="18" cy="9" r="2.4"/><circle cx="27" cy="9" r="2.4"/><circle cx="38" cy="14" r="2.4"/><path d="M10 41v-3h25v3z"/>',
    k: '<path d="M20.5 3h4v4H29v4h-4.5v5h-4v-5H16V7h4.5z"/><path d="M12 41l2-24c5-4 12-4 17 0l2 24z"/><path d="M11 41v-2h23v2z"/>'
};
// مینی‌مال / ذِن (بر اساس حرکت مهره‌ها)
const MINIMAL_PIECES = {
    p: '<circle cx="22.5" cy="22.5" r="5" fill="var(--ink)"/>',
    r: '<path d="M14 22.5 h17 M22.5 14 v17" stroke="var(--ink)" stroke-width="4.5" stroke-linecap="round"/>',
    b: '<path d="M16 16 l13 13 M16 29 l13 -13" stroke="var(--ink)" stroke-width="4.5" stroke-linecap="round"/>',
    n: '<path d="M17 28 v-10 h9" fill="none" stroke="var(--ink)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>',
    q: '<path d="M15 22.5 h15 M22.5 15 v15 M17 17 l11 11 M17 28 l11 -11" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/>',
    k: '<circle cx="22.5" cy="22.5" r="7" fill="none" stroke="var(--ink)" stroke-width="3"/><path d="M22.5 11v5 M19.5 13.5h6" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round"/>'
};
// مدار کیهانی (Cosmic Orbital)
const COSMIC_PIECES = {
    p: '<circle cx="22.5" cy="22" r="5" fill="var(--ink)"/><path d="M16 29 A 11 11 0 0 0 29 29 A 9 9 0 0 1 16 29 Z" fill="var(--ink)"/>',
    r: '<circle cx="22.5" cy="25" r="6" fill="var(--ink)"/><ellipse cx="22.5" cy="25" rx="14" ry="2.5" fill="none" stroke="var(--ink)" stroke-width="2"/><ellipse cx="22.5" cy="25" rx="2.5" ry="14" fill="none" stroke="var(--ink)" stroke-width="2"/>',
    n: '<path d="M14 32 A 15 15 0 0 1 32 14 A 18 18 0 0 0 22 30 Z" fill="var(--ink)"/><circle cx="28" cy="28" r="3.5" fill="var(--ink)"/>',
    b: '<circle cx="22.5" cy="25" r="4.5" fill="var(--ink)"/><ellipse cx="22.5" cy="25" rx="14" ry="2.5" fill="none" stroke="var(--ink)" stroke-width="2" transform="rotate(45 22.5 25)"/><ellipse cx="22.5" cy="25" rx="14" ry="2.5" fill="none" stroke="var(--ink)" stroke-width="2" transform="rotate(-45 22.5 25)"/>',
    q: '<circle cx="22.5" cy="26" r="6.5" fill="var(--ink)"/><circle cx="22.5" cy="26" r="13" fill="none" stroke="var(--ink)" stroke-width="2"/><circle cx="22.5" cy="8" r="3" fill="var(--ink)"/><circle cx="10" cy="14" r="2.5" fill="var(--ink)"/><circle cx="35" cy="14" r="2.5" fill="var(--ink)"/>',
    k: '<circle cx="22.5" cy="26" r="5.5" fill="var(--ink)"/><circle cx="22.5" cy="26" r="14" fill="none" stroke="var(--ink)" stroke-width="2.5" stroke-dasharray="5 4"/><path d="M22.5 6v7 M22.5 39v7 M4 26h7 M34 26h7" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round"/>'
};
// پیکسلی ۸ بیتی (شبکه‌ی ۸×۸)
const PIXEL_PIECES = {
    p: ['........', '...XX...', '..XXXX..', '...XX...', '..XXXX..', '...XX...', '..XXXX..', '.XXXXXX.'],
    r: ['.X.XX.X.', '.XXXXXX.', '..XXXX..', '..XXXX..', '..XXXX..', '..XXXX..', '.XXXXXX.', '.XXXXXX.'],
    n: ['..XXX...', '.XXXXX..', 'XXXXXXX.', 'XX.XXXX.', 'X..XXXX.', '...XXXX.', '..XXXXX.', '.XXXXXXX'],
    b: ['...XX...', '..XXXX..', '.XXXXXX.', '.XXX.XX.', '..XXXX..', '...XX...', '..XXXX..', '.XXXXXX.'],
    q: ['X..XX..X', 'XX.XX.XX', '.XXXXXX.', '.XXXXXX.', '..XXXX..', '..XXXX..', '.XXXXXX.', '.XXXXXX.'],
    k: ['...XX...', '.XXXXXX.', '...XX...', '..XXXX..', '.XXXXXX.', '.XXXXXX.', '..XXXX..', '.XXXXXX.']
};
const pixelSvg = (rows) => rows.map((row, y) => [...row].map((ch, x) => (ch === 'X' ? `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>` : '')).join('')).join('');
const renderChessPiece = (pieceStr, styleId) => {
    if (!pieceStr)
        return null;
    if (!styleId || styleId === 'classic')
        return getChessPieceSymbol(pieceStr);
    const isWhite = pieceStr[0] === 'w';
    const type = pieceStr[1];
    let fill = isWhite ? '#ffffff' : '#0f172a';
    let ink = isWhite ? '#0f172a' : '#e2e8f0';
    let viewBox = '0 0 45 45', inner = '', outline = 0.9;
    let customStyle = { '--ink': ink, filter: `drop-shadow(0 1px 1.5px rgba(0,0,0,.55))` };
    let shapeRendering = 'geometricPrecision';
    if (styleId === 'modern') {
        inner = MODERN_PIECES[type];
    }
    else if (styleId === 'pixel') {
        viewBox = '0 0 8 8';
        inner = pixelSvg(PIXEL_PIECES[type]);
        outline = 0;
        shapeRendering = 'crispEdges';
        if (!isWhite)
            customStyle.filter += ' drop-shadow(0 0 .6px #cbd5e1)';
    }
    else if (styleId === 'minimal') {
        inner = MINIMAL_PIECES[type];
        fill = isWhite ? '#f8fafc' : '#1e293b';
        outline = 0;
        customStyle['--ink'] = isWhite ? '#0f172a' : '#f8fafc';
        customStyle.filter = `drop-shadow(0 2px 3px rgba(0,0,0,.4))`;
        inner = `<circle cx="22.5" cy="22.5" r="20" fill="${fill}" stroke="${customStyle['--ink']}" stroke-width="1.5" opacity="0.95"/>` + inner;
        fill = 'none'; // handeled by circle
    }
    else if (styleId === 'cosmic') {
        inner = COSMIC_PIECES[type];
        fill = 'none';
        outline = 0;
        customStyle['--ink'] = isWhite ? '#ffffff' : '#0f172a';
        customStyle.filter = isWhite ? `drop-shadow(0 2px 4px rgba(0,0,0,.6))` : `drop-shadow(0 1px 2px rgba(255,255,255,.4)) drop-shadow(0 2px 5px rgba(0,0,0,.8))`;
    }
    else if (styleId === 'runic') {
        // Strictly Black & White colors as requested!
        const stoneFill = isWhite ? '#ffffff' : '#0f172a';
        const stoneStroke = isWhite ? '#0f172a' : '#ffffff';
        const runeGlowColor = isWhite ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)';
        const shadowColor = isWhite ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.9)';
        const obelisk = `<path d="M15 6 L30 6 L36 15 L36 38 L27 44 L18 44 L9 38 L9 15 Z" fill="${stoneFill}" stroke="${stoneStroke}" stroke-width="1" filter="drop-shadow(0 4px 4px ${shadowColor})"/>
                         <path d="M9 15 L36 15 M15 6 L9 15 M30 6 L36 15" stroke="${stoneStroke}" stroke-width="1" opacity="0.6"/>`;
        const glyph = `<text x="22.5" y="32" text-anchor="middle" font-size="22" font-family="sans-serif" fill="${stoneStroke}" style="filter: drop-shadow(0 0 5px ${runeGlowColor})">${CHESS_GLYPHS[type]}&#xFE0E;</text>`;
        inner = obelisk + glyph;
        fill = 'none';
        outline = 0;
        customStyle.filter = 'none';
    }
    else if (styleId === 'medal') {
        inner = `<circle cx="22.5" cy="22.5" r="19.5"/><circle cx="22.5" cy="22.5" r="15.5" fill="none" style="stroke:var(--ink);stroke-width:1.2;stroke-opacity:.55"/><text x="22.5" y="31.5" text-anchor="middle" font-size="23" style="fill:var(--ink);stroke:none">${CHESS_GLYPHS[type]}&#xFE0E;</text>`;
    }
    else {
        return getChessPieceSymbol(pieceStr);
    }
    return (React.createElement("svg", { viewBox: viewBox, className: "piece-anim block select-none cursor-pointer w-[84%] h-[84%]", fill: fill, stroke: outline ? ink : 'none', strokeWidth: outline, strokeLinejoin: "round", shapeRendering: shapeRendering, style: customStyle, dangerouslySetInnerHTML: { __html: inner } }));
};
// مهره‌های منچ (viewBox ۲۴×۲۴) — رنگ همان رنگ بازیکن است
const LUDO_TOKEN_SHAPES = {
    pawn: '<circle cx="12" cy="7" r="4.6"/><path d="M12 11.5c-3.4 2.2-4.4 6-5 9.5h10c-.6-3.5-1.6-7.3-5-9.5z"/><rect x="5" y="19.5" width="14" height="3.4" rx="1.6"/>',
    gem: '<path d="M12 1.8l8.2 6.4L12 22.2 3.8 8.2z"/><path d="M3.8 8.2h16.4M12 1.8L9 8.2l3 14M12 1.8l3 6.4-3 14" fill="none" style="stroke:#fff;stroke-opacity:.55;stroke-width:.9"/>',
    star: '<path d="M12 2l3.1 6.9 7.4.8-5.5 5 1.6 7.4L12 18.3 5.4 22.1 7 14.7l-5.5-5 7.4-.8z"/>',
    crown: '<path d="M3 19.5L2 7.5l5.5 4.5L12 4l4.5 8L22 7.5l-1 12z"/><rect x="3" y="20" width="18" height="2.6" rx="1"/>',
    ufo: '<path d="M12 4 c-3.5 0-5.5 3-5.5 6 H 3 c-1.5 0-2 1-2 2 s 1 2 11 2 s 11-1 11-2 s -0.5-2 -2-2 h -3.5 c 0-3-2-6-5.5-6 z"/><path d="M7.5 10 a 4.5 4.5 0 0 1 9 0" fill="none" stroke="#fff" stroke-width="1.5"/><circle cx="6" cy="13" r="1.2" fill="#fff"/><circle cx="12" cy="13.5" r="1.2" fill="#fff"/><circle cx="18" cy="13" r="1.2" fill="#fff"/>',
    ghost: '<path d="M12 2 C 6 2 4 6 4 12 V 22 L 6.5 19.5 L 9 22 L 12 19.5 L 15 22 L 17.5 19.5 L 20 22 V 12 C 20 6 18 2 12 2 Z"/><ellipse cx="9" cy="11" rx="2" ry="3" fill="#fff"/><ellipse cx="15" cy="11" rx="2" ry="3" fill="#fff"/>',
    cat: '<path d="M4 22 C 4 14 4 10 4 10 L 4 3 L 9.5 7.5 C 11 7 13 7 14.5 7.5 L 20 3 L 20 10 C 20 14 20 22 20 22 Z"/><circle cx="8.5" cy="13" r="2.5" fill="#fff"/><circle cx="15.5" cy="13" r="2.5" fill="#fff"/><path d="M11 16 L12 17 L13 16" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>',
    shuriken: '<path d="M12 2 L 14.5 9.5 L 22 12 L 14.5 14.5 L 12 22 L 9.5 14.5 L 2 12 L 9.5 9.5 Z"/><circle cx="12" cy="12" r="2.5" fill="none" stroke="#fff" stroke-width="1.5"/>'
};
const renderLudoToken = (hex, styleId, isMovable) => {
    if (!styleId || styleId === 'classic' || !LUDO_TOKEN_SHAPES[styleId]) {
        // مهره‌ی پیش‌فرض: دیسک سه‌بعدی براق با حلقه‌ی داخلی و سایه‌ی کف
        return (React.createElement("div", { style: {
                background: `radial-gradient(circle at 34% 28%, rgba(255,255,255,.95) 0, rgba(255,255,255,.4) 13%, transparent 15%), radial-gradient(circle at 50% 42%, ${hex} 0, ${hex} 46%, color-mix(in srgb, ${hex} 58%, #000) 100%)`,
                boxShadow: '0 3px 5px rgba(0,0,0,.55), inset 0 -3px 5px rgba(0,0,0,.35), inset 0 2px 3px rgba(255,255,255,.4)'
            }, className: `relative w-full h-full rounded-full ${isMovable ? 'gq-movable' : ''}` },
            React.createElement("span", { className: "absolute inset-[24%] rounded-full", style: { border: '1.5px solid rgba(255,255,255,.55)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.25)' } })));
    }
    return (React.createElement("svg", { viewBox: "0 0 24 24", className: `w-full h-full overflow-visible ${isMovable ? 'gq-movable' : ''}`, fill: hex, stroke: "#fff", strokeWidth: "1.4", strokeLinejoin: "round", style: { filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.5))' }, dangerouslySetInnerHTML: { __html: LUDO_TOKEN_SHAPES[styleId] } }));
};
// ---------- رندر تاس با استایل‌های مختلف فروشگاه ----------
const renderCustomDice = (val, styleId = 'classic') => {
    const isPlaceholder = !val;
    const actualVal = val || 6; // For placeholder/preview show 6
    const d = [];
    if (actualVal === 1 || actualVal === 3 || actualVal === 5)
        d.push('50%, 50%');
    if (actualVal !== 1) {
        d.push('20%, 20%');
        d.push('80%, 80%');
    }
    if (actualVal >= 4) {
        d.push('20%, 80%');
        d.push('80%, 20%');
    }
    if (actualVal === 6) {
        d.push('20%, 50%');
        d.push('80%, 50%');
    }
    let bgStyle, dotStyle, borderClass = '', innerShadow = '';
    if (styleId === 'neon') {
        bgStyle = { backgroundColor: '#0f172a', border: '1.5px solid #ec4899', boxShadow: '0 0 15px rgba(236,72,153,0.4), inset 0 0 10px rgba(236,72,153,0.2)' };
        dotStyle = { backgroundColor: '#22d3ee', boxShadow: '0 0 8px #22d3ee, 0 0 12px #22d3ee' };
    }
    else if (styleId === 'wood') {
        bgStyle = { background: 'linear-gradient(135deg, #78350f, #451a03)', border: '1px solid #290f01', boxShadow: '0 4px 6px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.1)' };
        dotStyle = { backgroundColor: '#1c0a00', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.15)' };
    }
    else if (styleId === 'crystal') {
        bgStyle = { background: 'linear-gradient(135deg, rgba(224,242,254,0.7), rgba(125,211,252,0.4))', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 10px rgba(0,0,0,0.3), inset 0 4px 8px rgba(255,255,255,0.8)' };
        dotStyle = { backgroundColor: '#ffffff', boxShadow: '0 0 8px #ffffff' };
    }
    else if (styleId === 'gold') {
        bgStyle = { background: 'radial-gradient(circle at 30% 30%, #fef08a, #d97706, #78350f)', border: '1px solid #fef08a', boxShadow: '0 5px 15px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.5)' };
        dotStyle = { backgroundColor: '#450a0a', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6), 0 1px 1px rgba(255,255,255,0.4)' };
    }
    else {
        // Classic
        bgStyle = { backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1', boxShadow: '0 4px 8px rgba(0,0,0,0.2)' };
        dotStyle = { backgroundColor: '#0f172a' };
    }
    return (React.createElement("div", { className: "relative w-full h-full rounded-[25%] transition-all overflow-hidden", style: bgStyle },
        isPlaceholder && styleId === 'classic' && (React.createElement("span", { className: "absolute inset-0 flex items-center justify-center text-xs sm:text-base opacity-70" }, "\uD83C\uDFB2")),
        (!isPlaceholder || styleId !== 'classic') && d.map((pos, i) => (React.createElement("span", { key: i, className: "absolute rounded-full", style: {
                width: '18%', height: '18%',
                left: pos.split(',')[0], top: pos.split(',')[1],
                transform: 'translate(-50%, -50%)',
                ...dotStyle
            } })))));
};

/* ===== components/AvatarCarousel.jsx ===== */
// ---------- انتخاب آواتار به‌صورت اسلایدر (کشیدن چپ/راست، فلش‌ها، کیبورد و نقطه‌ها) ----------
const AVATAR_ITEM_W = 132;
const AVATAR_GAP = 14;
const AvatarPicker = ({ items, user, unlocked, onSelect }) => {
    const trackRef = useRef(null);
    const dragRef = useRef({ active: false, startX: 0, startLeft: 0, moved: false });
    const [active, setActive] = useState(0);
    const currentSrc = getAvatarSrc(user);
    const itemEls = () => Array.from(trackRef.current ? trackRef.current.children : []);
    const centerOf = (el) => el.offsetLeft + el.offsetWidth / 2;
    // اثر «تمرکز»: آواتار وسط بزرگ‌تر و روشن‌تر، بقیه کوچک‌تر و کم‌رنگ‌تر
    const applyFocus = useCallback(() => {
        const track = trackRef.current;
        if (!track)
            return;
        const mid = track.scrollLeft + track.clientWidth / 2;
        let best = 0, bestDist = Infinity;
        itemEls().forEach((el, i) => {
            const dist = Math.abs(centerOf(el) - mid);
            const t = Math.min(1, dist / 190);
            const inner = el.firstChild;
            inner.style.transform = `scale(${1 - 0.24 * t}) translateY(${t * 6}px)`;
            inner.style.opacity = String(1 - 0.5 * t);
            if (dist < bestDist) {
                bestDist = dist;
                best = i;
            }
        });
        setActive(prev => (prev === best ? prev : best));
    }, []);
    const scrollToIndex = useCallback((index, smooth = true) => {
        const track = trackRef.current;
        const el = itemEls()[Math.max(0, Math.min(items.length - 1, index))];
        if (!track || !el)
            return;
        track.style.scrollBehavior = smooth ? 'smooth' : 'auto';
        track.scrollTo({ left: centerOf(el) - track.clientWidth / 2 });
    }, [items.length]);
    // اولین نمایش: مستقیم روی آواتار فعلی کاربر؛ با هر تغییر اندازه (انیمیشن ورود، چرخش گوشی، ...) دوباره وسط‌چین می‌شود
    const activeRef = useRef(0);
    useEffect(() => { activeRef.current = active; }, [active]);
    useEffect(() => {
        const track = trackRef.current;
        const start = Math.max(0, items.findIndex(a => a.src === currentSrc));
        activeRef.current = start;
        const recenter = () => { scrollToIndex(activeRef.current, false); applyFocus(); };
        recenter();
        const t1 = setTimeout(recenter, 120);
        const t2 = setTimeout(recenter, 450);
        let observer = null;
        if (typeof ResizeObserver !== 'undefined') {
            let first = true;
            observer = new ResizeObserver(() => { if (first) {
                first = false;
                return;
            } recenter(); });
            observer.observe(track);
        }
        return () => { clearTimeout(t1); clearTimeout(t2); if (observer)
            observer.disconnect(); };
    }, []);
    useEffect(() => {
        const track = trackRef.current;
        let raf = 0;
        const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(applyFocus); };
        track.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => { track.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
    }, [applyFocus]);
    // کشیدن با ماوس (روی لمسی و تاچ‌پد خودِ مرورگر اسکرول نرم دارد)
    const onPointerDown = (e) => {
        if (e.pointerType !== 'mouse')
            return;
        const track = trackRef.current;
        dragRef.current = { active: true, startX: e.clientX, startLeft: track.scrollLeft, moved: false };
        track.style.scrollBehavior = 'auto';
        track.style.scrollSnapType = 'none';
        track.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e) => {
        const d = dragRef.current;
        if (!d.active)
            return;
        const dx = e.clientX - d.startX;
        if (Math.abs(dx) > 5)
            d.moved = true;
        trackRef.current.scrollLeft = d.startLeft - dx;
    };
    const endDrag = (e) => {
        const d = dragRef.current;
        if (!d.active)
            return;
        d.active = false;
        const track = trackRef.current;
        try {
            track.releasePointerCapture(e.pointerId);
        }
        catch (err) { }
        track.style.scrollSnapType = '';
        if (d.moved) {
            const mid = track.scrollLeft + track.clientWidth / 2;
            let best = 0, bestDist = Infinity;
            itemEls().forEach((el, i) => { const dist = Math.abs(centerOf(el) - mid); if (dist < bestDist) {
                bestDist = dist;
                best = i;
            } });
            scrollToIndex(best);
            setTimeout(() => { dragRef.current.moved = false; }, 0);
        }
    };
    const onKeyDown = (e) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            scrollToIndex(active - 1);
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            scrollToIndex(active + 1);
        }
    };
    const current = items[active] || items[0];
    const isOwned = (a) => !a.isPremium || unlocked.includes(a.id);
    const isCurrent = (a) => currentSrc === a.src;
    const cost = (a) => a.price || PREMIUM_AVATAR_COST;
    return (React.createElement("div", { className: "space-y-3", dir: "ltr" },
        React.createElement("div", { className: "relative" },
            React.createElement("button", { type: "button", "aria-label": "\u0642\u0628\u0644\u06CC", onClick: () => scrollToIndex(active - 1), disabled: active === 0, className: "hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-slate-900/90 border border-slate-600 text-white text-xl hover:bg-indigo-600 hover:border-indigo-400 active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none" }, "\u2039"),
            React.createElement("button", { type: "button", "aria-label": "\u0628\u0639\u062F\u06CC", onClick: () => scrollToIndex(active + 1), disabled: active === items.length - 1, className: "hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-slate-900/90 border border-slate-600 text-white text-xl hover:bg-indigo-600 hover:border-indigo-400 active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none" }, "\u203A"),
            React.createElement("div", { className: "pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-16 z-10 bg-gradient-to-r from-slate-900/90 to-transparent" }),
            React.createElement("div", { className: "pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-16 z-10 bg-gradient-to-l from-slate-900/90 to-transparent" }),
            React.createElement("div", { ref: trackRef, tabIndex: 0, onKeyDown: onKeyDown, onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag, onClickCapture: (e) => { if (dragRef.current.moved) {
                    e.stopPropagation();
                    e.preventDefault();
                } }, className: "relative flex overflow-x-auto snap-x snap-mandatory no-scrollbar py-5 cursor-grab active:cursor-grabbing select-none focus:outline-none", style: { gap: AVATAR_GAP, paddingInline: `calc(50% - ${AVATAR_ITEM_W / 2}px)`, touchAction: 'pan-x pan-y', overscrollBehaviorX: 'contain' } }, items.map((a, i) => {
                const selected = isCurrent(a);
                return (React.createElement("div", { key: a.id, className: "snap-center shrink-0", style: { width: AVATAR_ITEM_W } },
                    React.createElement("button", { type: "button", onClick: () => scrollToIndex(i), title: a.name, style: { transition: 'transform .35s cubic-bezier(.22,1,.36,1), opacity .35s ease', willChange: 'transform, opacity' }, className: `avatar-slide relative block w-full rounded-3xl overflow-hidden border-2 p-1.5 bg-slate-900/70 ${selected ? 'border-amber-400 shadow-lg shadow-amber-500/30' : i === active ? 'border-indigo-400 shadow-lg shadow-indigo-500/30' : 'border-slate-700/70'}` },
                        React.createElement("div", { className: "relative aspect-square rounded-2xl overflow-hidden pointer-events-none" },
                            React.createElement("img", { src: a.src, alt: a.name, draggable: false, className: `w-full h-full object-cover ${isOwned(a) ? '' : 'saturate-50 brightness-75'}` }),
                            !isOwned(a) && React.createElement("span", { className: "absolute inset-0 flex items-center justify-center text-3xl bg-slate-950/35" }, "\uD83D\uDD12")),
                        selected && React.createElement("span", { className: "absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center shadow-md" }, "\u2713"))));
            }))),
        React.createElement("div", { dir: "rtl", className: "flex flex-col sm:flex-row items-center justify-between gap-3 px-1" },
            React.createElement("div", { key: current.id, className: "avatar-caption text-center sm:text-right" },
                React.createElement("div", { className: "font-black text-white text-sm sm:text-base" }, current.name),
                React.createElement("div", { className: "text-[10px] sm:text-xs text-slate-400 mt-0.5" }, isCurrent(current) ? 'آواتار فعلی شما' : isOwned(current) ? 'در مجموعه‌ی شماست' : `آواتار ویژه — ${cost(current).toLocaleString('fa-IR')} کیوجی`)),
            isCurrent(current) ? (React.createElement("div", { className: "w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-black text-xs sm:text-sm text-center" }, "\u2713 \u0641\u0639\u0627\u0644")) : (React.createElement("button", { type: "button", onClick: () => onSelect(current), className: "game-action w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-xs sm:text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5" }, isOwned(current) ? 'انتخاب این آواتار' : (React.createElement(Fragment, null,
                "\u062E\u0631\u06CC\u062F \u0648 \u0627\u0646\u062A\u062E\u0627\u0628 ",
                React.createElement("span", { className: "flex items-center gap-0.5 bg-black/20 px-1.5 py-0.5 rounded-md" },
                    cost(current).toLocaleString('fa-IR'),
                    " ",
                    React.createElement(IconCoin, { className: "w-3.5 h-3.5" }))))))),
        React.createElement("div", { dir: "rtl", className: "flex items-center justify-center gap-3" },
            React.createElement("span", { className: "text-[10px] sm:text-xs font-bold text-slate-400 tabular-nums" },
                (active + 1).toLocaleString('fa-IR'),
                " \u0627\u0632 ",
                items.length.toLocaleString('fa-IR')),
            React.createElement("div", { dir: "ltr", className: "flex items-center gap-1 max-w-[60%] overflow-hidden" }, items.map((a, i) => (React.createElement("button", { key: a.id, type: "button", "aria-label": a.name, onClick: () => scrollToIndex(i), className: `h-1.5 rounded-full transition-all duration-300 ${i === active ? 'w-5 bg-indigo-400' : 'w-1.5 bg-slate-600 hover:bg-slate-400'}` })))))));
};

/* ===== pages/ProfilePage.jsx ===== */
const ProfilePage = ({ user, onBack, onLogout, onUserUpdated, onAccountDeleted }) => {
    const [sound, setSound] = useState(user.settings?.sound ?? true);
    const [showLastSeen, setShowLastSeen] = useState(user.settings?.showLastSeen ?? true);
    const [lightMode, setLightMode] = useState(user.settings?.lightMode ?? (typeof getInitialThemeIsLight === 'function' ? getInitialThemeIsLight() : false));
    const [nextUsername, setNextUsername] = useState(user.username);
    const [feedback, setFeedback] = useState(null);
    const [deleteStep, setDeleteStep] = useState(null);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [avatarError, setAvatarError] = useState('');
    const [galleryPreview, setGalleryPreview] = useState(null);
    const fileInputRef = useRef(null);
    const unlockedAvatars = user.unlockedAvatars || [];
    const handleSelectAvatar = (avItem) => {
        setAvatarError('');
        if (avItem.isPremium && !unlockedAvatars.includes(avItem.id)) {
            if (user.coins < PREMIUM_AVATAR_COST) {
                setAvatarError(`برای خرید این آواتار ویژه به ${PREMIUM_AVATAR_COST} کیوجی نیاز دارید (موجودی شما: ${user.coins} کیوجی).`);
                return;
            }
            const confirmed = window.confirm(`آیا مایلید این آواتار ویژه را با ${PREMIUM_AVATAR_COST} کیوجی خریداری و فعال کنید؟`);
            if (!confirmed)
                return;
            const updatedUser = patchUser(user.username, account => ({
                ...account,
                coins: account.coins - PREMIUM_AVATAR_COST,
                unlockedAvatars: [...(account.unlockedAvatars || []), avItem.id],
                avatar: avItem.src
            }));
            if (updatedUser) {
                playSound('coin', user.settings?.sound);
                onUserUpdated(updatedUser);
                setFeedback({ type: 'success', text: 'آواتار ویژه با موفقیت خریداری و تنظیم شد! 🎉' });
            }
            return;
        }
        const updatedUser = patchUser(user.username, account => ({
            ...account,
            avatar: avItem.src
        }));
        if (updatedUser) {
            setGalleryPreview(null);
            onUserUpdated(updatedUser);
        }
    };
    const openGalleryPicker = () => {
        setAvatarError('');
        if (user.coins < GALLERY_AVATAR_COST) {
            setAvatarError(`برای آپلود عکس از گالری به ${GALLERY_AVATAR_COST} کیوجی نیاز است (موجودی: ${user.coins} کیوجی).`);
            return;
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };
    const handleGalleryFile = (event) => {
        const file = event.target.files && event.target.files[0];
        event.target.value = '';
        setAvatarError('');
        if (!file)
            return;
        if (!file.type || !file.type.startsWith('image/')) {
            setAvatarError('فقط فایل تصویری مجاز است.');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 128;
                canvas.height = 128;
                ctx.drawImage(img, 0, 0, 128, 128);
                const compressed = canvas.toDataURL('image/jpeg', 0.8);
                setGalleryPreview(compressed);
            };
            img.src = reader.result;
        };
        reader.onerror = () => setAvatarError('خطا در خواندن فایل.');
        reader.readAsDataURL(file);
    };
    const applyGalleryAvatar = () => {
        if (!galleryPreview)
            return;
        if (user.coins < GALLERY_AVATAR_COST) {
            setAvatarError(`موجودی کیوجی شما کافی نیست (${GALLERY_AVATAR_COST} کیوجی نیاز است).`);
            return;
        }
        const updatedUser = patchUser(user.username, account => ({
            ...account,
            coins: account.coins - GALLERY_AVATAR_COST,
            avatar: galleryPreview
        }));
        if (updatedUser) {
            playSound('coin', user.settings?.sound);
            setGalleryPreview(null);
            onUserUpdated(updatedUser);
            setFeedback({ type: 'success', text: `تصویر گالری تنظیم شد و ${GALLERY_AVATAR_COST} کیوجی کسر گردید.` });
        }
    };
    useEffect(() => {
        setSound(user.settings?.sound ?? true);
        setShowLastSeen(user.settings?.showLastSeen ?? true);
        setLightMode(user.settings?.lightMode ?? (typeof getInitialThemeIsLight === 'function' ? getInitialThemeIsLight() : false));
        setNextUsername(user.username);
    }, [user]);
    const updateSettings = (changes) => {
        const updatedUser = patchUser(user.username, account => ({
            ...account,
            settings: { ...(account.settings || {}), ...changes }
        }));
        if (updatedUser)
            onUserUpdated(updatedUser);
    };
    const handleLightModeToggle = () => {
        const next = !lightMode;
        setLightMode(next);
        if (typeof applyThemeToDOM === 'function') {
            applyThemeToDOM(next);
        }
        updateSettings({ lightMode: next });
    };
    const handleSoundToggle = () => {
        const next = !sound;
        setSound(next);
        updateSettings({ sound: next });
    };
    const handleLastSeenToggle = () => {
        const next = !showLastSeen;
        setShowLastSeen(next);
        updateSettings({ showLastSeen: next });
    };
    const handleRename = (event) => {
        event.preventDefault();
        const cleanedName = nextUsername.trim();
        setFeedback(null);
        if (!cleanedName)
            return setFeedback({ type: 'error', text: 'نام کاربری را وارد کنید.' });
        if (cleanedName.length < 3)
            return setFeedback({ type: 'error', text: 'نام کاربری حداقل ۳ کاراکتر باشد.' });
        if (cleanedName.toLowerCase() === user.username.toLowerCase()) {
            return setFeedback({ type: 'info', text: 'نام کاربری تغییری نکرده است.' });
        }
        if (!isUsernameAvailable(cleanedName, user.username)) {
            return setFeedback({ type: 'error', text: 'این نام کاربری استفاده شده است.' });
        }
        const updatedUser = renameUser(user.username, cleanedName);
        if (!updatedUser)
            return setFeedback({ type: 'error', text: 'تغییر نام کاربری انجام نشد.' });
        onUserUpdated(updatedUser);
        setFeedback({ type: 'success', text: 'نام کاربری با موفقیت تغییر کرد.' });
    };
    const handleDeleteAccount = (event) => {
        event.preventDefault();
        setDeleteError('');
        if (!deleteUser(user.username, deletePassword)) {
            setDeleteError('رمز عبور نادرست است. حساب حذف نشد.');
            return;
        }
        onAccountDeleted();
    };
    const statCards = [
        { label: 'موجودی کیوجی', value: `${user.coins ?? 0} 🪙`, color: 'text-amber-400 font-black' },
        { label: 'تعداد برد', value: user.stats?.wins ?? 0, color: 'text-emerald-300' },
        { label: 'تعداد بازی', value: user.stats?.games ?? 0, color: 'text-indigo-300' }
    ];
    return (React.createElement("div", { className: "w-full max-w-3xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in px-2 sm:px-0" },
        React.createElement("div", { className: "glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-xl flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 text-center sm:text-right" },
            React.createElement("div", { className: "flex flex-col sm:flex-row items-center gap-4" },
                React.createElement(PlayerAvatar, { user: user, className: "w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shrink-0" }),
                React.createElement("div", null,
                    React.createElement("h2", { className: "text-xl sm:text-2xl font-black text-white" }, user.username),
                    user.equipped?.titles && user.equipped.titles !== 'classic' && (React.createElement("div", { className: "mt-1 transform scale-110 origin-right text-right" }, renderPlayerTitle(user.equipped.titles))),
                    React.createElement("div", { className: "flex flex-col sm:flex-row items-center gap-2 mt-1.5" },
                        React.createElement("span", { className: "flex items-center justify-center gap-1 text-[10px] sm:text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/30" },
                            React.createElement(IconCoin, { className: "w-3.5 h-3.5" }),
                            React.createElement("span", null,
                                user.coins,
                                " \u06A9\u06CC\u0648\u062C\u06CC")),
                        React.createElement("span", { className: "text-[10px] sm:text-xs text-slate-400" },
                            "\u0622\u062E\u0631\u06CC\u0646 \u0628\u0627\u0632\u062F\u06CC\u062F: ",
                            formatLastSeen(user.lastSeen))))),
            React.createElement("button", { onClick: onBack, className: "w-full sm:w-auto px-6 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs sm:text-sm font-bold border border-slate-700" }, "\u0628\u0627\u0632\u06AF\u0634\u062A")),
        React.createElement("div", { className: "glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 text-center sm:text-right" },
            React.createElement("div", { className: "flex flex-col sm:flex-row items-center justify-between gap-4" },
                React.createElement("div", null,
                    React.createElement("h3", { className: "font-black text-base sm:text-lg text-white" }, "\u0627\u0646\u062A\u062E\u0627\u0628 \u0648 \u062A\u063A\u06CC\u06CC\u0631 \u0622\u0648\u0627\u062A\u0627\u0631"),
                    React.createElement("p", { className: "text-[10px] sm:text-xs text-slate-400 mt-1" },
                        "\u06F6 \u0622\u0648\u0627\u062A\u0627\u0631 \u0631\u0627\u06CC\u06AF\u0627\u0646\u060C \u06F4 \u0622\u0648\u0627\u062A\u0627\u0631 \u0648\u06CC\u0698\u0647 (\u06F1\u06F5\u06F0 \u06A9\u06CC\u0648\u062C\u06CC) \u06CC\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u0627\u0632 \u06AF\u0627\u0644\u0631\u06CC (",
                        GALLERY_AVATAR_COST,
                        " \u06A9\u06CC\u0648\u062C\u06CC).")),
                React.createElement("button", { onClick: openGalleryPicker, className: "game-action w-full sm:w-auto px-4 py-2.5 bg-gradient-to-l from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 rounded-xl text-[10px] sm:text-xs font-black border border-amber-400/60 flex items-center justify-center gap-1.5 shrink-0 shadow-lg shadow-amber-600/20" },
                    React.createElement(IconCoin, { className: "w-4 h-4 text-slate-950" }),
                    React.createElement("span", null,
                        "\u0627\u0646\u062A\u062E\u0627\u0628 \u0627\u0632 \u06AF\u0627\u0644\u0631\u06CC (",
                        GALLERY_AVATAR_COST,
                        " \u06A9\u06CC\u0648\u062C\u06CC)"))),
            React.createElement("input", { ref: fileInputRef, type: "file", accept: "image/*", className: "hidden", onChange: handleGalleryFile }),
            galleryPreview && (React.createElement("div", { className: "flex flex-col sm:flex-row items-center gap-3 sm:gap-4 p-3.5 sm:p-4 bg-amber-950/20 rounded-xl sm:rounded-2xl border border-amber-500/40 animate-in fade-in" },
                React.createElement("div", { className: "w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl overflow-hidden border border-amber-500/40 shrink-0" },
                    React.createElement("img", { src: galleryPreview, alt: "\u067E\u06CC\u0634\u200C\u200C\u0646\u0645\u0627\u06CC\u0634 \u06AF\u0627\u0644\u0631\u06CC", className: "w-full h-full object-cover" })),
                React.createElement("div", { className: "flex-1 text-[10px] sm:text-xs text-amber-200 font-bold text-center sm:text-right" },
                    "\u067E\u06CC\u0634\u200C\u0646\u0645\u0627\u06CC\u0634 \u062A\u0635\u0648\u06CC\u0631 \u0627\u0646\u062A\u062E\u0627\u0628\u06CC \u0634\u0645\u0627 \u2014 \u0628\u0627 \u062A\u0627\u06CC\u06CC\u062F\u060C ",
                    GALLERY_AVATAR_COST,
                    " \u06A9\u06CC\u0648\u062C\u06CC \u0627\u0632 \u062D\u0633\u0627\u0628\u062A\u0627\u0646 \u06A9\u0633\u0631 \u0634\u062F\u0647 \u0648 \u0622\u0648\u0627\u062A\u0627\u0631 \u0627\u0639\u0645\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u062F."),
                React.createElement("div", { className: "flex gap-2 w-full sm:w-auto" },
                    React.createElement("button", { onClick: applyGalleryAvatar, className: "game-action flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 rounded-xl text-[10px] sm:text-xs font-black shadow-md" },
                        "\u067E\u0631\u062F\u0627\u062E\u062A ",
                        GALLERY_AVATAR_COST,
                        " \u06A9\u06CC\u0648\u062C\u06CC"),
                    React.createElement("button", { onClick: () => setGalleryPreview(null), className: "flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] sm:text-xs font-bold border border-slate-700" }, "\u0627\u0646\u0635\u0631\u0627\u0641")))),
            avatarError && React.createElement("p", { className: "text-[10px] sm:text-xs font-bold text-rose-300" }, avatarError),
            React.createElement(AvatarPicker, { items: [...ALL_AVATARS, ...(typeof STORE_AVATARS !== 'undefined' ? STORE_AVATARS : []).filter(a => unlockedAvatars.includes(a.id))], user: user, unlocked: unlockedAvatars, onSelect: handleSelectAvatar })),
        React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4" }, statCards.map(stat => (React.createElement("div", { key: stat.label, className: "glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-center shadow-xl" },
            React.createElement("div", { className: `text-xl sm:text-2xl font-black ${stat.color}` }, stat.value),
            React.createElement("div", { className: "text-[10px] sm:text-xs text-slate-400 mt-1 sm:mt-2 font-bold" }, stat.label))))),
        React.createElement("div", { className: "glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xl space-y-4" },
            React.createElement("div", { className: "text-center sm:text-right" },
                React.createElement("h3", { className: "font-black text-base sm:text-lg text-white" }, "\u0648\u06CC\u0631\u0627\u06CC\u0634 \u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC"),
                React.createElement("p", { className: "text-[10px] sm:text-xs text-slate-400 mt-1" }, "\u0627\u06CC\u0646 \u0646\u0627\u0645 \u062F\u0631 \u0641\u0647\u0631\u0633\u062A \u062F\u0648\u0633\u062A\u0627\u0646 \u0648 \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0645\u06CC\u200C\u0634\u0648\u062F.")),
            React.createElement("form", { onSubmit: handleRename, className: "flex flex-col sm:flex-row gap-2 sm:gap-3" },
                React.createElement("input", { type: "text", value: nextUsername, onChange: (event) => setNextUsername(event.target.value), className: "flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-900/80 border border-slate-700/80 rounded-xl sm:rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs sm:text-sm text-center sm:text-right" }),
                React.createElement("button", { type: "submit", className: "w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold" }, "\u0630\u062E\u06CC\u0631\u0647 \u0646\u0627\u0645")),
            feedback && (React.createElement("p", { className: `text-[10px] sm:text-xs font-bold text-center sm:text-right ${feedback.type === 'success' ? 'text-emerald-300' : 'text-rose-300'}` }, feedback.text))),
        React.createElement("div", { className: "glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xl space-y-3 sm:space-y-4" },
            React.createElement("h3", { className: "font-black text-base sm:text-lg text-white text-center sm:text-right" }, "\u062A\u0646\u0638\u06CC\u0645\u0627\u062A"),
            React.createElement("div", { className: "flex items-center justify-between gap-4 p-3 sm:p-4 bg-slate-900/60 rounded-xl sm:rounded-2xl border border-slate-700/60" },
                React.createElement("div", { className: "flex items-center gap-3" },
                    React.createElement("div", { className: `p-2 rounded-xl border transition-colors ${lightMode ? 'bg-amber-400/20 text-amber-500 border-amber-400/50' : 'bg-slate-800 text-slate-300 border-slate-700'}` }, lightMode ? (React.createElement("svg", { className: "w-5 h-5", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                        React.createElement("circle", { cx: "12", cy: "12", r: "5" }),
                        React.createElement("line", { x1: "12", y1: "1", x2: "12", y2: "3" }),
                        React.createElement("line", { x1: "12", y1: "21", x2: "12", y2: "23" }),
                        React.createElement("line", { x1: "4.22", y1: "4.22", x2: "5.64", y2: "5.64" }),
                        React.createElement("line", { x1: "18.36", y1: "18.36", x2: "19.78", y2: "19.78" }),
                        React.createElement("line", { x1: "1", y1: "12", x2: "3", y2: "12" }),
                        React.createElement("line", { x1: "21", y1: "12", x2: "23", y2: "12" }),
                        React.createElement("line", { x1: "4.22", y1: "19.78", x2: "5.64", y2: "18.36" }),
                        React.createElement("line", { x1: "18.36", y1: "5.64", x2: "19.78", y2: "4.22" }))) : (React.createElement("svg", { className: "w-5 h-5", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                        React.createElement("path", { d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" })))),
                    React.createElement("div", null,
                        React.createElement("div", { className: "font-bold text-white text-xs sm:text-sm" }, "\u062D\u0627\u0644\u062A \u0631\u0648\u0634\u0646 (\u0644\u0627\u06CC\u062A\u200C\u0645\u0648\u062F)"),
                        React.createElement("div", { className: "text-[10px] sm:text-xs text-slate-400 mt-0.5" }, "\u062A\u0645 \u0631\u0648\u0634\u0646 \u06F9\u06F0\u066A \u0633\u0641\u06CC\u062F \u0648 \u06F1\u06F0\u066A \u062A\u06CC\u0631\u0647 \u0628\u0631\u0627\u06CC \u062A\u0645\u0627\u0645 \u0628\u062E\u0634\u200C\u0647\u0627\u06CC \u0628\u0631\u0646\u0627\u0645\u0647"))),
                React.createElement("button", { onClick: handleLightModeToggle, "aria-label": "\u062A\u063A\u06CC\u06CC\u0631 \u0648\u0636\u0639\u06CC\u062A \u062D\u0627\u0644\u062A \u0631\u0648\u0634\u0646", className: `w-11 sm:w-12 h-6 rounded-full transition-colors relative shrink-0 ${lightMode ? 'bg-amber-500 shadow-md shadow-amber-500/30' : 'bg-slate-700'}` },
                    React.createElement("span", { className: `w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${lightMode ? 'left-6 sm:left-7' : 'left-1'}` }))),
            React.createElement("div", { className: "flex items-center justify-between gap-4 p-3 sm:p-4 bg-slate-900/60 rounded-xl sm:rounded-2xl border border-slate-700/60" },
                React.createElement("div", null,
                    React.createElement("div", { className: "font-bold text-white text-xs sm:text-sm" }, "\u0627\u0641\u06A9\u062A\u200C\u0647\u0627\u06CC \u0635\u0648\u062A\u06CC"),
                    React.createElement("div", { className: "text-[10px] sm:text-xs text-slate-400 mt-0.5" }, "\u067E\u062E\u0634 \u0635\u062F\u0627\u06CC \u062D\u0631\u06A9\u062A \u0645\u0647\u0631\u0647\u200C\u0647\u0627\u060C \u062A\u0627\u0633\u060C \u0633\u06A9\u0647\u200C\u0647\u0627")),
                React.createElement("button", { onClick: handleSoundToggle, "aria-label": "\u062A\u063A\u06CC\u06CC\u0631 \u0648\u0636\u0639\u06CC\u062A \u0635\u062F\u0627", className: `w-10 sm:w-12 h-5 sm:h-6 rounded-full transition-colors relative shrink-0 ${sound ? 'bg-indigo-600' : 'bg-slate-700'}` },
                    React.createElement("span", { className: `w-3.5 sm:w-4 h-3.5 sm:h-4 rounded-full bg-white absolute top-[3px] sm:top-1 transition-transform ${sound ? 'left-6 sm:left-7' : 'left-1'}` }))),
            React.createElement("div", { className: "flex items-center justify-between gap-4 p-3 sm:p-4 bg-slate-900/60 rounded-xl sm:rounded-2xl border border-slate-700/60" },
                React.createElement("div", null,
                    React.createElement("div", { className: "font-bold text-white text-xs sm:text-sm" }, "\u0646\u0645\u0627\u06CC\u0634 \u0622\u062E\u0631\u06CC\u0646 \u0628\u0627\u0632\u062F\u06CC\u062F"),
                    React.createElement("div", { className: "text-[10px] sm:text-xs text-slate-400 mt-0.5" }, "\u067E\u0646\u0647\u0627\u0646 \u06A9\u0631\u062F\u0646 \u0622\u0646\u0644\u0627\u06CC\u0646 \u0628\u0648\u062F\u0646 \u0634\u0645\u0627")),
                React.createElement("button", { onClick: handleLastSeenToggle, "aria-label": "\u062A\u063A\u06CC\u06CC\u0631 \u0648\u0636\u0639\u06CC\u062A \u0646\u0645\u0627\u06CC\u0634 \u0622\u062E\u0631\u06CC\u0646 \u0628\u0627\u0632\u062F\u06CC\u062F", className: `w-10 sm:w-12 h-5 sm:h-6 rounded-full transition-colors relative shrink-0 ${showLastSeen ? 'bg-indigo-600' : 'bg-slate-700'}` },
                    React.createElement("span", { className: `w-3.5 sm:w-4 h-3.5 sm:h-4 rounded-full bg-white absolute top-[3px] sm:top-1 transition-transform ${showLastSeen ? 'left-6 sm:left-7' : 'left-1'}` })))),
        React.createElement("div", { className: "glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xl space-y-3" },
            React.createElement("button", { onClick: onLogout, className: "w-full py-2.5 sm:py-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2" },
                React.createElement(IconLogout, { className: "w-4 h-4" }),
                " \u062E\u0631\u0648\u062C \u0627\u0632 \u062D\u0633\u0627\u0628 \u06A9\u0627\u0631\u0628\u0631\u06CC"),
            React.createElement("button", { onClick: () => { setDeleteStep('warning'); setDeletePassword(''); setDeleteError(''); }, className: "w-full py-2.5 sm:py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm" }, "\u062D\u0630\u0641 \u062D\u0633\u0627\u0628 \u06A9\u0627\u0631\u0628\u0631\u06CC")),
        deleteStep && (React.createElement("div", { className: "fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" },
            React.createElement("div", { className: "w-full max-w-sm glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5" }, deleteStep === 'warning' ? (React.createElement(React.Fragment, null,
                React.createElement("div", { className: "text-center" },
                    React.createElement("h3", { className: "text-lg sm:text-xl font-black text-rose-300" }, "\u062D\u0630\u0641 \u062F\u0627\u0626\u0645\u06CC \u062D\u0633\u0627\u0628"),
                    React.createElement("p", { className: "text-xs sm:text-sm text-slate-300 mt-2 leading-5 sm:leading-6" }, "\u0622\u06CC\u0627 \u0645\u0637\u0645\u0626\u0646 \u0647\u0633\u062A\u06CC\u062F\u061F \u062A\u0645\u0627\u0645 \u06A9\u06CC\u0648\u062C\u06CC\u200C\u0647\u0627\u060C \u0622\u0648\u0627\u062A\u0627\u0631\u0647\u0627 \u0648 \u0631\u0641\u0642\u0627\u06CC \u0634\u0645\u0627 \u067E\u0627\u06A9 \u062E\u0648\u0627\u0647\u0646\u062F \u0634\u062F.")),
                React.createElement("div", { className: "flex gap-2 sm:gap-3" },
                    React.createElement("button", { onClick: () => setDeleteStep(null), className: "flex-1 py-2.5 sm:py-3 bg-slate-800 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold" }, "\u0627\u0646\u0635\u0631\u0627\u0641"),
                    React.createElement("button", { onClick: () => setDeleteStep('password'), className: "flex-1 py-2.5 sm:py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold" }, "\u0627\u062F\u0627\u0645\u0647")))) : (React.createElement("form", { onSubmit: handleDeleteAccount, className: "space-y-3 sm:space-y-4" },
                React.createElement("div", { className: "text-center" },
                    React.createElement("h3", { className: "text-lg sm:text-xl font-black text-rose-300" }, "\u062A\u0623\u06CC\u06CC\u062F \u0628\u0627 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631"),
                    React.createElement("p", { className: "text-[10px] sm:text-xs text-slate-300 mt-2" },
                        "\u0628\u0631\u0627\u06CC \u062D\u0630\u0641 \u062D\u0633\u0627\u0628\u060C \u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u00AB",
                        user.username,
                        "\u00BB \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F.")),
                React.createElement("input", { type: "password", autoFocus: true, value: deletePassword, onChange: (event) => setDeletePassword(event.target.value), className: "w-full px-4 py-2.5 sm:py-3 bg-slate-900/80 border border-slate-700/80 rounded-xl sm:rounded-2xl text-white focus:outline-none focus:border-rose-500 text-sm text-center", placeholder: "\u0631\u0645\u0632 \u0639\u0628\u0648\u0631" }),
                deleteError && React.createElement("p", { className: "text-[10px] sm:text-xs font-bold text-rose-300 text-center" }, deleteError),
                React.createElement("div", { className: "flex gap-2 sm:gap-3" },
                    React.createElement("button", { type: "button", onClick: () => setDeleteStep(null), className: "flex-1 py-2.5 sm:py-3 bg-slate-800 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold" }, "\u0627\u0646\u0635\u0631\u0627\u0641"),
                    React.createElement("button", { type: "submit", className: "flex-1 py-2.5 sm:py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold" }, "\u062D\u0630\u0641 \u062F\u0627\u0626\u0645\u06CC")))))))));
};

/* ===== pages/AdminPage.jsx ===== */
// ============================================================
//  AdminPage.jsx — پنل مدیریت GameQJ (بن، تعلیق، سکه، ریست گردونه)
//  وابستگی‌های سراسری: React, ReactDOM, adminGetUserList, adminSetBan,
//  adminSuspendGames, adminAdjustCoins, adminResetWheel, isAdminUser,
//  findUser, showToast
// ============================================================
const AdminPage = ({ currentUser, onUserUpdated, onBack }) => {
    const [users, setUsers] = useState(adminGetUserList());
    const [search, setSearch] = useState('');
    const [confirm, setConfirm] = useState(null);
    const [coinInputs, setCoinInputs] = useState({});
    const [suspendHours, setSuspendHours] = useState({});
    const refresh = () => setUsers(adminGetUserList());
    const run = (res, okText, targetUsername) => {
        try {
            if (res && res.ok) {
                showToast({ type: 'success', title: 'مدیریت', text: okText });
                if (targetUsername === currentUser.username && typeof onUserUpdated === 'function') {
                    onUserUpdated(findUser(currentUser.username));
                }
                refresh();
            }
            else {
                showToast({ type: 'error', title: 'خطا', text: (res && res.error) || 'خطای نامشخص' });
            }
        }
        finally {
            setConfirm(null);
        }
    };
    const isTargetAdmin = (u) => isAdminUser(u);
    const filtered = users.filter((u) => (u.username || '').toLowerCase().includes((search || '').trim().toLowerCase()));
    const totalUsers = users.length;
    const bannedCount = users.filter((u) => u.banned).length;
    const suspendedCount = users.filter((u) => u.gameSuspendedUntil > Date.now()).length;
    const canUsePortal = typeof ReactDOM !== 'undefined' && ReactDOM && typeof ReactDOM.createPortal === 'function' && typeof document !== 'undefined';
    const roleBadge = (u) => isAdminUser(u) ? (React.createElement("span", { className: "px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-orange-600 text-white border border-amber-400/40" }, "\u0645\u062F\u06CC\u0631")) : (React.createElement("span", { className: "px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700/70 text-slate-300 border border-slate-600/50" }, "\u06A9\u0627\u0631\u0628\u0631"));
    const statusPills = (u) => (React.createElement("div", { className: "flex flex-wrap items-center gap-1.5" },
        u.banned && (React.createElement("span", { className: "px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-300 border border-red-500/40" }, "\u0645\u0633\u062F\u0648\u062F")),
        u.gameSuspendedUntil > Date.now() && (React.createElement("span", { className: "px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40" },
            "\u062A\u0639\u0644\u06CC\u0642 \u062A\u0627 ",
            new Date(u.gameSuspendedUntil).toLocaleString('fa-IR')))));
    const modal = confirm ? (React.createElement("div", { dir: "rtl", className: "fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4", onClick: () => setConfirm(null) },
        React.createElement("div", { className: "glass-panel bg-slate-900/90 border border-slate-700/60 rounded-2xl p-6 max-w-sm w-full shadow-2xl", onClick: (e) => e.stopPropagation() },
            React.createElement("h3", { className: "text-lg font-black text-white mb-2" }, confirm.title),
            React.createElement("p", { className: "text-sm text-slate-300 mb-6 leading-relaxed" }, confirm.message),
            React.createElement("div", { className: "flex gap-3" },
                React.createElement("button", { onClick: confirm.onConfirm, className: "flex-1 py-2 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 transition-all active:scale-95" }, "\u062A\u0623\u06CC\u06CC\u062F"),
                React.createElement("button", { onClick: () => setConfirm(null), className: "flex-1 py-2 rounded-xl font-bold text-sm bg-slate-700/70 text-slate-200 hover:bg-slate-600/70 transition-all active:scale-95" }, "\u0627\u0646\u0635\u0631\u0627\u0641"))))) : null;
    if (!isAdminUser(currentUser)) {
        return (React.createElement("div", { dir: "rtl", className: "w-full flex-1 flex items-center justify-center p-4" },
            React.createElement("div", { className: "glass-panel bg-slate-900/70 border border-slate-700/60 rounded-2xl p-8 max-w-sm w-full text-center" },
                React.createElement("div", { className: "text-4xl mb-3" }, "\u26D4"),
                React.createElement("h2", { className: "text-xl font-black text-white mb-2" }, "\u062F\u0633\u062A\u0631\u0633\u06CC \u063A\u06CC\u0631\u0645\u062C\u0627\u0632"),
                React.createElement("p", { className: "text-sm text-slate-400 mb-6" }, "\u0634\u0645\u0627 \u0627\u062C\u0627\u0632\u0647\u200C\u06CC \u0648\u0631\u0648\u062F \u0628\u0647 \u067E\u0646\u0644 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0631\u0627 \u0646\u062F\u0627\u0631\u06CC\u062F."),
                React.createElement("button", { onClick: onBack, className: "w-full py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 transition-all active:scale-95" }, "\u0628\u0627\u0632\u06AF\u0634\u062A"))));
    }
    return (React.createElement("div", { dir: "rtl", className: "w-full flex-1 flex flex-col gap-5 py-4" },
        React.createElement("div", { className: "flex items-center justify-between gap-3" },
            React.createElement("h1", { className: "text-xl sm:text-2xl font-black text-white flex items-center gap-2" },
                React.createElement("span", { className: "w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-lg" }, "\uD83D\uDEE1\uFE0F"),
                "\u067E\u0646\u0644 \u0645\u062F\u06CC\u0631\u06CC\u062A GameQJ"),
            React.createElement("button", { onClick: onBack, className: "px-4 py-2 rounded-xl text-sm font-bold bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:bg-slate-700/80 transition-all active:scale-95" }, "\u0628\u0627\u0632\u06AF\u0634\u062A")),
        React.createElement("div", { className: "grid grid-cols-3 gap-3" },
            React.createElement("div", { className: "glass-panel bg-slate-900/60 border border-slate-700/60 rounded-2xl p-4 text-center" },
                React.createElement("div", { className: "text-2xl font-black text-indigo-300" }, totalUsers),
                React.createElement("div", { className: "text-[11px] text-slate-400 font-bold mt-1" }, "\u06A9\u0627\u0631\u0628\u0631\u0627\u0646 \u06A9\u0644")),
            React.createElement("div", { className: "glass-panel bg-slate-900/60 border border-slate-700/60 rounded-2xl p-4 text-center" },
                React.createElement("div", { className: "text-2xl font-black text-red-300" }, bannedCount),
                React.createElement("div", { className: "text-[11px] text-slate-400 font-bold mt-1" }, "\u0645\u0633\u062F\u0648\u062F\u0634\u062F\u0647")),
            React.createElement("div", { className: "glass-panel bg-slate-900/60 border border-slate-700/60 rounded-2xl p-4 text-center" },
                React.createElement("div", { className: "text-2xl font-black text-amber-300" }, suspendedCount),
                React.createElement("div", { className: "text-[11px] text-slate-400 font-bold mt-1" }, "\u062A\u0639\u0644\u06CC\u0642 \u0628\u0627\u0632\u06CC"))),
        React.createElement("input", { type: "text", value: search, onChange: (e) => setSearch(e.target.value), placeholder: "\u062C\u0633\u062A\u062C\u0648\u06CC \u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC...", className: "w-full px-4 py-2.5 rounded-xl bg-slate-900/70 border border-slate-700/60 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400/60 transition-all" }),
        React.createElement("div", { className: "flex flex-col gap-3" },
            filtered.length === 0 && (React.createElement("div", { className: "glass-panel bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 text-center text-slate-400 text-sm" }, "\u06A9\u0627\u0631\u0628\u0631\u06CC \u06CC\u0627\u0641\u062A \u0646\u0634\u062F.")),
            filtered.map((u) => (React.createElement("div", { key: u.username, className: "glass-panel bg-slate-900/60 border border-slate-700/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4" },
                React.createElement("div", { className: "flex items-center gap-3 flex-1 min-w-0" },
                    u.avatar ? (React.createElement("img", { className: "w-10 h-10 rounded-xl object-cover border border-slate-700/60", src: u.avatar, alt: u.username })) : (React.createElement("div", { className: "w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center font-black text-white" }, (u.username || '?').charAt(0).toUpperCase())),
                    React.createElement("div", { className: "min-w-0" },
                        React.createElement("div", { className: "flex items-center gap-2 flex-wrap" },
                            React.createElement("span", { className: "font-black text-white text-sm truncate" }, u.username),
                            roleBadge(u)),
                        React.createElement("div", { className: "flex items-center gap-2 mt-1 flex-wrap" }, statusPills(u)),
                        React.createElement("div", { className: "flex items-center gap-3 mt-1 text-[11px] text-slate-400" },
                            React.createElement("span", { className: "text-amber-300 font-bold" },
                                "\uD83D\uDCB0 ",
                                u.coins),
                            React.createElement("span", null,
                                "\u0628\u0627\u0632\u06CC: ",
                                u.stats.games),
                            React.createElement("span", null,
                                "\u0628\u0631\u062F: ",
                                u.stats.wins)))),
                !isTargetAdmin(u) && (React.createElement("div", { className: "flex flex-wrap items-center gap-2" },
                    React.createElement("button", { onClick: () => setConfirm({
                            title: u.banned ? 'رفع بن' : 'بن کردن',
                            message: u.banned
                                ? `مطمئنید بن «${u.username}» برداشته شود؟`
                                : `مطمئنید «${u.username}» مسدود شود؟`,
                            onConfirm: () => run(adminSetBan(currentUser.username, u.username, !u.banned), u.banned ? 'بن کاربر برداشته شد.' : 'کاربر مسدود شد.', u.username),
                        }), className: `px-3 py-1.5 rounded-lg text-[11px] font-black transition-all active:scale-95 ${u.banned
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25'
                            : 'bg-red-500/15 text-red-300 border border-red-500/40 hover:bg-red-500/25'}` }, u.banned ? 'رفع بن' : 'بن'),
                    React.createElement("div", { className: "flex items-center gap-1" },
                        React.createElement("input", { type: "number", min: "0", value: suspendHours[u.username] ?? '', onChange: (e) => setSuspendHours((p) => ({ ...p, [u.username]: e.target.value })), placeholder: "\u0633\u0627\u0639\u062A", className: "w-16 px-2 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/60 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/60" }),
                        React.createElement("button", { onClick: () => {
                                const h = Number(suspendHours[u.username]);
                                setConfirm({
                                    title: 'تعلیق بازی',
                                    message: `تعلیق بازی «${u.username}» به مدت ${Number.isFinite(h) ? h : '?'} ساعت اعمال شود؟`,
                                    onConfirm: () => run(adminSuspendGames(currentUser.username, u.username, h), 'تعلیق بازی اعمال شد.', u.username),
                                });
                            }, className: "px-3 py-1.5 rounded-lg text-[11px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25 transition-all active:scale-95" }, "\u0627\u0639\u0645\u0627\u0644"),
                        u.gameSuspendedUntil > Date.now() && (React.createElement("button", { onClick: () => run(adminSuspendGames(currentUser.username, u.username, 0), 'تعلیق برداشته شد.', u.username), className: "px-3 py-1.5 rounded-lg text-[11px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25 transition-all active:scale-95" }, "\u0631\u0641\u0639 \u062A\u0639\u0644\u06CC\u0642"))),
                    React.createElement("div", { className: "flex items-center gap-1" },
                        React.createElement("input", { type: "number", value: coinInputs[u.username] ?? '', onChange: (e) => setCoinInputs((p) => ({ ...p, [u.username]: e.target.value })), placeholder: "\u00B1\u0633\u06A9\u0647", className: "w-20 px-2 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/60 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/60" }),
                        React.createElement("button", { onClick: () => {
                                const d = Number(coinInputs[u.username]);
                                setConfirm({
                                    title: 'تغییر موجودی',
                                    message: `${Number.isFinite(d) ? (d > 0 ? `+${d}` : `${d}`) : '?'} کیوجی به «${u.username}» اعمال شود؟`,
                                    onConfirm: () => run(adminAdjustCoins(currentUser.username, u.username, d), 'موجودی به‌روزرسانی شد.', u.username),
                                });
                            }, className: "px-3 py-1.5 rounded-lg text-[11px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25 transition-all active:scale-95" }, "\u0627\u0639\u0645\u0627\u0644")),
                    React.createElement("button", { onClick: () => run(adminResetWheel(currentUser.username, u.username), 'گردونه‌ی روزانه‌ی کاربر ریست شد.', u.username), className: "px-3 py-1.5 rounded-lg text-[11px] font-black bg-slate-700/60 text-slate-200 border border-slate-600/50 hover:bg-slate-600/60 transition-all active:scale-95" }, "\u0631\u06CC\u0633\u062A \u06AF\u0631\u062F\u0648\u0646\u0647"))))))),
        confirm && (canUsePortal ? ReactDOM.createPortal(modal, document.body) : modal)));
};

/* ===== components/ToastCenter.jsx ===== */
const TOAST_THEME = {
    request: { icon: '🎮', ring: 'border-indigo-500/60', glow: 'shadow-indigo-500/20', bar: 'bg-indigo-400' },
    waiting: { icon: '⏳', ring: 'border-indigo-500/40', glow: 'shadow-indigo-500/10', bar: 'bg-indigo-400' },
    success: { icon: '✅', ring: 'border-emerald-500/60', glow: 'shadow-emerald-500/20', bar: 'bg-emerald-400' },
    error: { icon: '⛔', ring: 'border-rose-500/60', glow: 'shadow-rose-500/20', bar: 'bg-rose-400' },
    invite: { icon: '🎲', ring: 'border-fuchsia-500/60', glow: 'shadow-fuchsia-500/25', bar: 'bg-fuchsia-400' },
    info: { icon: '🔔', ring: 'border-sky-500/50', glow: 'shadow-sky-500/10', bar: 'bg-sky-400' }
};
const TOAST_BTN = {
    success: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white',
    danger: 'bg-slate-800 hover:bg-rose-600 text-white border border-slate-700 hover:border-rose-500',
    neutral: 'bg-slate-700 hover:bg-slate-600 text-white'
};
const ToastCard = ({ toast, onClose }) => {
    const [now, setNow] = useState(Date.now());
    const theme = TOAST_THEME[toast.type] || TOAST_THEME.info;
    const total = Math.max(1, toast.expiresAt - toast.createdAt);
    const remaining = Math.max(0, toast.expiresAt - now);
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 200);
        return () => clearInterval(timer);
    }, []);
    useEffect(() => {
        if (remaining <= 0 && !toast.leaving)
            onClose(toast.id, true);
    }, [remaining, toast.leaving]);
    return (React.createElement("div", { role: "status", dir: "rtl", className: `pointer-events-auto w-full max-w-md glass-panel bg-slate-900/95 backdrop-blur-xl border ${theme.ring} shadow-2xl ${theme.glow} rounded-2xl overflow-hidden ${toast.leaving ? 'gq-toast-out' : 'gq-toast-in'}` },
        React.createElement("div", { className: "p-4 flex items-start gap-3" },
            React.createElement("div", { className: "w-11 h-11 shrink-0 rounded-full bg-slate-800/80 flex items-center justify-center text-xl" }, theme.icon),
            React.createElement("div", { className: "flex-1 min-w-0" },
                React.createElement("h4", { className: "font-black text-white text-sm sm:text-base leading-6" }, toast.title),
                toast.text && React.createElement("p", { className: "text-xs sm:text-sm text-slate-300 mt-0.5 leading-6" }, toast.text),
                toast.showTimer && (React.createElement("span", { className: "inline-block mt-1.5 text-[11px] font-bold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-md" },
                    Math.ceil(remaining / 1000).toLocaleString('fa-IR'),
                    " \u062B\u0627\u0646\u06CC\u0647"))),
            !(toast.actions && toast.actions.length) && (React.createElement("button", { onClick: () => onClose(toast.id), "aria-label": "\u0628\u0633\u062A\u0646", className: "text-slate-500 hover:text-white text-lg leading-none px-1" }, "\u00D7"))),
        toast.actions && toast.actions.length > 0 && (React.createElement("div", { className: "px-4 pb-4 flex gap-2" }, toast.actions.map((action, i) => (React.createElement("button", { key: i, onClick: () => { onClose(toast.id); if (action.onClick)
                action.onClick(); }, className: `flex-1 px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all active:scale-95 ${TOAST_BTN[action.variant] || TOAST_BTN.neutral}` }, action.label))))),
        toast.duration > 0 && (React.createElement("div", { className: "h-1 bg-slate-800" },
            React.createElement("div", { className: `h-full ${theme.bar} transition-[width] duration-200 ease-linear`, style: { width: `${(remaining / total) * 100}%` } })))));
};
const ToastCenter = () => {
    const [toasts, setToasts] = useState([]);
    const toastsRef = useRef([]);
    useEffect(() => { toastsRef.current = toasts; }, [toasts]);
    const closeToast = useCallback((id, expired = false) => {
        setToasts(prev => prev.map(t => (t.id === id ? { ...t, leaving: true } : t)));
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id || !t.leaving)), 280);
        if (expired) {
            const t = toastsRef.current.find(x => x.id === id);
            if (t && t.onExpire)
                t.onExpire();
        }
    }, []);
    useEffect(() => {
        const handler = (event) => {
            const { action, toast, id } = event.detail || {};
            if (action === 'hide') {
                closeToast(id);
                return;
            }
            if (action !== 'show' || !toast || !toast.id)
                return;
            const createdAt = Date.now();
            const duration = toast.duration ?? 5000;
            setToasts(prev => {
                const old = prev.find(t => t.id === toast.id && !t.leaving);
                const entry = { ...toast, duration, createdAt, expiresAt: createdAt + duration, leaving: false, key: old && old.type === toast.type ? old.key : `${toast.id}-${createdAt}` };
                return old ? prev.map(t => (t.id === toast.id ? entry : t)) : [...prev.filter(t => t.id !== toast.id), entry];
            });
        };
        window.addEventListener(TOAST_EVENT, handler);
        return () => window.removeEventListener(TOAST_EVENT, handler);
    }, [closeToast]);
    return (React.createElement("div", { className: "fixed top-0 inset-x-0 z-[10000] flex flex-col items-center gap-3 px-3 pt-3 sm:pt-5 pointer-events-none" }, toasts.map(t => React.createElement(ToastCard, { key: t.key, toast: t, onClose: closeToast }))));
};

/* ===== components/VsIntro.jsx ===== */
// ---------- انیمیشن شروع بازی (حالت VS): نمایش حریف‌ها، پروفایل و مهره‌های هرکس ----------
// players: [{ key, name, tag, hex, avatar, wins, isMe, isBot, preview }]   preview = نودِ مهره‌ها با استایل خود بازیکن
const VsIntro = ({ title, subtitle, players, onDone }) => {
    const [leaving, setLeaving] = useState(false);
    const doneRef = useRef(onDone);
    doneRef.current = onDone;
    const leavingRef = useRef(false);
    const finish = useCallback(() => {
        if (leavingRef.current)
            return;
        leavingRef.current = true;
        setLeaving(true);
        setTimeout(() => doneRef.current && doneRef.current(), 480);
    }, []);
    useEffect(() => {
        const timer = setTimeout(finish, 3600);
        return () => clearTimeout(timer);
    }, [finish]);
    const four = players.length > 2;
    const mobile = typeof window !== 'undefined' && window.innerWidth < 640;
    // مسیر ورود هر کارت (دو نفره: از دو طرف | چهار نفره: از چهار گوشه)
    const fromVec = (i) => {
        if (!four)
            return mobile ? ['0', i === 0 ? '-80vh' : '80vh'] : [i === 0 ? '-90vw' : '90vw', '0'];
        return [(i % 2 === 0 ? '-80vw' : '80vw'), (i < 2 ? '-50vh' : '50vh')];
    };
    return (React.createElement("div", { dir: "ltr", onClick: finish, className: `gq-vs-root fixed inset-0 z-[9000] overflow-hidden flex flex-col items-center justify-center px-3 cursor-pointer ${leaving ? 'gq-vs-out' : ''}` },
        React.createElement("div", { className: "gq-vs-bg absolute inset-0" }),
        React.createElement("div", { className: "gq-vs-streaks absolute inset-0" }),
        React.createElement("div", { className: "gq-vs-flash absolute inset-0" }),
        React.createElement("div", { dir: "rtl", className: "relative z-10 text-center mb-3 sm:mb-6 gq-vs-title" },
            React.createElement("div", { className: "gq-vs-subtitle text-xs sm:text-sm font-bold tracking-widest text-indigo-300" }, subtitle),
            React.createElement("h2", { className: "gq-vs-heading text-2xl sm:text-4xl font-black text-white mt-1", style: { textShadow: '0 0 24px rgba(129,140,248,.8)' } }, title)),
        React.createElement("div", { className: `relative z-10 w-full ${four ? 'max-w-3xl grid grid-cols-2 gap-3 sm:gap-6' : 'max-w-4xl flex flex-col sm:flex-row items-stretch justify-center gap-3 sm:gap-10'}` },
            players.map((p, i) => {
                const [fx, fy] = fromVec(i);
                return (React.createElement("div", { key: p.key, dir: "rtl", className: "gq-vs-card relative rounded-3xl p-3 sm:p-5 flex flex-col items-center text-center overflow-hidden sm:flex-1", style: {
                        '--fx': fx, '--fy': fy, animationDelay: `${i * 0.12}s`,
                        '--player-accent': p.hex,
                        background: `linear-gradient(160deg, ${p.hex}40, rgba(15,23,42,.92) 62%)`,
                        border: `1.5px solid ${p.hex}`,
                        boxShadow: `0 0 34px ${p.hex}55, inset 0 1px 0 rgba(255,255,255,.18)`
                    } },
                    React.createElement("span", { className: "gq-vs-sheen absolute inset-0 pointer-events-none" }),
                    React.createElement("div", { className: `gq-vs-avatar relative ${four ? 'w-16 h-16 sm:w-24 sm:h-24' : 'w-24 h-24 sm:w-36 sm:h-36'} rounded-3xl shrink-0`, style: { border: `3px solid ${p.hex}`, boxShadow: `0 0 22px ${p.hex}99`, animationDelay: `${0.5 + i * 0.12}s` } },
                        React.createElement("div", { className: "gq-vs-avatar-placeholder absolute inset-0 rounded-[inherit] overflow-hidden flex items-center justify-center bg-slate-800" }, p.avatar
                            ? React.createElement("img", { src: p.avatar, alt: p.name, draggable: false, className: "w-full h-full object-cover" })
                            : React.createElement("span", { className: four ? 'text-3xl sm:text-5xl' : 'text-5xl sm:text-7xl' }, p.isBot ? '🤖' : '👤')),
                        p.account?.equipped?.frames && renderAvatarFrame(p.account.equipped.frames)),
                    React.createElement("div", { className: "flex flex-col items-center mt-2 sm:mt-3" },
                        React.createElement("div", { className: `gq-vs-name font-black text-white max-w-full truncate ${four ? 'text-sm sm:text-xl' : 'text-lg sm:text-2xl'}` }, p.name),
                        p.account?.equipped?.titles && p.account.equipped.titles !== 'classic' && (React.createElement("div", { className: "transform scale-110 origin-top mt-1" }, renderPlayerTitle(p.account.equipped.titles)))),
                    React.createElement("div", { className: "flex items-center justify-center gap-1.5 mt-2 flex-wrap" },
                        React.createElement("span", { className: "text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full text-white", style: { background: `${p.hex}cc` } }, p.tag),
                        p.isMe && React.createElement("span", { className: "text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-400/40" }, "\u0634\u0645\u0627"),
                        p.isBot && React.createElement("span", { className: "gq-vs-bot text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full bg-slate-700 text-slate-300" }, "\u0631\u0628\u0627\u062A")),
                    typeof p.wins === 'number' && (React.createElement("div", { className: "text-[10px] sm:text-xs text-amber-300 font-bold mt-1.5" },
                        "\uD83C\uDFC6 ",
                        p.wins.toLocaleString('fa-IR'),
                        " \u0628\u0631\u062F")),
                    React.createElement("div", { className: "flex items-center justify-center gap-1 sm:gap-2 mt-2 sm:mt-3 h-8 sm:h-11" }, p.preview)));
            }),
            React.createElement("div", { className: "gq-vs-badge absolute z-20 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" },
                React.createElement("span", { className: "gq-vs-ring" }),
                React.createElement("span", { className: "gq-vs-ring", style: { animationDelay: '.45s' } }),
                React.createElement("span", { className: "gq-vs-text" }, "VS"))),
        React.createElement("div", { className: "gq-vs-progress-track relative z-10 w-48 sm:w-64 h-1.5 rounded-full bg-white/10 overflow-hidden mt-5 sm:mt-8" },
            React.createElement("div", { className: "gq-vs-progress h-full rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-amber-300" })),
        React.createElement("div", { dir: "rtl", className: "gq-vs-skip relative z-10 text-[10px] sm:text-xs text-slate-400 mt-2" }, "\u0628\u0631\u0627\u06CC \u0631\u062F \u0634\u062F\u0646 \u0644\u0645\u0633 \u06A9\u0646\u06CC\u062F")));
};
// داده‌ی نمایشی یک بازیکن (آواتار و آمار از حساب خودش خوانده می‌شود)
const buildVsPlayer = (name, currentUser, extra) => {
    const acc = name && name.toLowerCase() === currentUser.username.toLowerCase() ? currentUser : (name ? findUser(name) : null);
    return {
        name: name || extra.fallbackName,
        avatar: acc ? getAvatarSrc(acc) : '',
        wins: acc && acc.stats ? acc.stats.wins : undefined,
        isMe: !!acc && acc.username.toLowerCase() === currentUser.username.toLowerCase(),
        account: acc,
        ...extra
    };
};

/* ===== App.jsx ===== */
const DailyWheelButton = ({ currentUser, isInGame, onOpen }) => {
    const [, setWheelTick] = useState(0);
    useEffect(() => {
        if (isInGame)
            return;
        const timer = setInterval(() => setWheelTick(tick => tick + 1), 1000);
        return () => clearInterval(timer);
    }, [isInGame, currentUser.username]);
    const ready = typeof canSpinWheel === "function" ? canSpinWheel(currentUser.username) : false;
    const remaining = typeof getWheelCooldownLeft === "function" ? getWheelCooldownLeft(currentUser.username) : 0;
    const formatted = typeof formatWheelCooldown === "function" ? formatWheelCooldown(remaining) : "";
    return (React.createElement("button", { onClick: () => { if (!isInGame)
            onOpen(); }, className: "relative flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-black border transition-all shadow-md active:scale-95 " + (ready ? "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 border-amber-300 shadow-amber-500/30 animate-pulse" : "bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-700/80"), title: ready ? "گردونه روزانه آماده است — بچرخان!" : "تا چرخش بعدی: " + formatted },
        React.createElement("span", { className: "text-[14px] sm:text-base leading-none" }, "\uD83C\uDFA1"),
        React.createElement("span", { className: "hidden sm:inline" }, ready ? "گردونه" : formatted),
        React.createElement("span", { className: "sm:hidden font-mono text-[10px]" }, ready ? "!" : formatted.slice(0, 5)),
        ready && React.createElement("span", { className: "absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900" },
            React.createElement("span", { className: "absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" }))));
};
const App = () => {
    const [currentUser, setCurrentUser] = useState(null);
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const [currentTab, setCurrentTab] = useState('games');
    const [activeLobbyId, setActiveLobbyId] = useState(null);
    const [viewedProfile, setViewedProfile] = useState(null);
    const [isInGame, setIsInGame] = useState(false);
    const [showDailyWheel, setShowDailyWheel] = useState(false);
    const openLobby = (lobbyId) => {
        setActiveLobbyId(lobbyId);
        setCurrentTab('games');
    };
    const isLightMode = currentUser?.settings?.lightMode ?? (typeof getInitialThemeIsLight === 'function' ? getInitialThemeIsLight() : false);
    useEffect(() => {
        if (typeof applyThemeToDOM === 'function') {
            applyThemeToDOM(isLightMode);
        }
    }, [isLightMode]);
    const handleToggleTheme = () => {
        const next = !isLightMode;
        if (typeof applyThemeToDOM === 'function') {
            applyThemeToDOM(next);
        }
        if (currentUser) {
            const updated = patchUser(currentUser.username, account => ({
                ...account,
                settings: { ...(account.settings || {}), lightMode: next }
            }));
            if (updated)
                setCurrentUser(updated);
        }
    };
    useEffect(() => {
        const session = getSession();
        if (session && session.username) {
            const u = findUser(session.username);
            if (u) {
                const fresh = patchUser(u.username, x => ({ ...x, lastSeen: new Date().toISOString() }));
                setCurrentUser(fresh);
            }
            else {
                clearSession();
            }
        }
        setIsAuthChecking(false);
    }, []);
    useEffect(() => {
        if (!currentUser)
            return;
        const syncUser = event => {
            if (event.key !== AUTH_USERS_KEY)
                return;
            const updated = findUser(currentUser.username);
            if (updated)
                setCurrentUser(updated);
        };
        window.addEventListener('storage', syncUser);
        return () => window.removeEventListener('storage', syncUser);
    }, [currentUser?.username]);
    // ---- دعوت‌های بازی: نوتیف سریع بالای صفحه + نقطه‌ی قرمز روی «دوستان» ----
    const toastedInvitesRef = useRef(null);
    const invitations = currentUser ? (currentUser.gameInvitations || []) : [];
    useEffect(() => {
        if (!currentUser) {
            toastedInvitesRef.current = null;
            return;
        }
        if (toastedInvitesRef.current === null) {
            // اولین بار بعد از ورود: دعوت‌های قبلی نوتیف دوباره نمی‌گیرند
            toastedInvitesRef.current = new Set(invitations.map(i => i.lobbyId));
            return;
        }
        invitations.forEach(invite => {
            if (toastedInvitesRef.current.has(invite.lobbyId))
                return;
            toastedInvitesRef.current.add(invite.lobbyId);
            showToast({
                id: `invite-${invite.lobbyId}`, type: 'invite',
                title: `«${invite.from}» شما را به بازی دعوت کرد!`,
                text: invite.gameType === 'ludo' ? 'منچ ۴ نفره — از بخش دوستان به لابی بپیوندید.' : invite.gameType === 'backgammon' ? 'تخته نرد — از بخش دوستان به لابی بپیوندید.' : invite.gameType === 'tictactoe' ? 'دوز — از بخش دوستان به لابی بپیوندید.' : 'شطرنج — از بخش دوستان به لابی بپیوندید.',
                duration: 3500
            });
        });
    }, [currentUser, invitations.length]);
    // با ورود به بخش دوستان، دعوت‌های جدید «دیده‌شده» می‌شوند و نقطه‌ی قرمز می‌رود
    useEffect(() => {
        if (!currentUser || currentTab !== 'friends')
            return;
        if (!invitations.some(i => i.seen === false))
            return;
        const updated = patchUser(currentUser.username, u => ({
            ...u, gameInvitations: u.gameInvitations.map(i => (i.seen === false ? { ...i, seen: true } : i))
        }));
        if (updated)
            setCurrentUser(updated);
    }, [currentTab, currentUser, invitations.length]);
    useEffect(() => {
        ensureAdminSeed();
        ensureAdminFlags();
        const sync = () => {
            setCurrentUser((prev) => {
                if (!prev)
                    return prev;
                const fresh = findUser(prev.username);
                if (!fresh)
                    return prev;
                if (fresh.banned === true && prev.banned !== true) {
                    showToast({ type: 'error', title: 'مسدود شد', text: 'حساب شما توسط مدیریت مسدود شد.' });
                }
                return fresh;
            });
        };
        window.addEventListener('gq:users-changed', sync);
        window.addEventListener('storage', sync);
        const iv = setInterval(sync, 15000);
        sync();
        return () => {
            window.removeEventListener('gq:users-changed', sync);
            window.removeEventListener('storage', sync);
            clearInterval(iv);
        };
    }, []);
    const hasUnseenInvite = currentTab !== 'friends' && invitations.some(i => i.seen === false);
    const handleLogin = (user) => {
        const u = patchUser(user.username, x => ({ ...x, lastSeen: new Date().toISOString() }));
        setCurrentUser(u || normalizeUser(user));
    };
    const handleLogout = () => {
        if (currentUser) {
            patchUser(currentUser.username, user => ({ ...user, lastSeen: new Date().toISOString() }));
        }
        clearSession();
        setCurrentUser(null);
        setCurrentTab('games');
        setActiveLobbyId(null);
        setViewedProfile(null);
    };
    const handleAccountDeleted = () => {
        clearSession();
        setCurrentUser(null);
        setCurrentTab('games');
        setActiveLobbyId(null);
        setViewedProfile(null);
    };
    if (isAuthChecking) {
        return (React.createElement("div", { className: "min-h-screen flex items-center justify-center" },
            React.createElement("div", { className: "text-indigo-400 text-lg font-bold animate-pulse" }, "\u062F\u0631 \u062D\u0627\u0644 \u0622\u0645\u0627\u062F\u0647\u200C\u0633\u0627\u0632\u06CC GameQJ...")));
    }
    if (!currentUser) {
        return React.createElement(AuthModal, { onLoginSuccess: handleLogin });
    }
    return (React.createElement("div", { className: "flex flex-col min-h-screen pb-6 sm:pb-0" },
        React.createElement(ToastCenter, null),
        React.createElement(ReactionLayer, null),
        React.createElement("header", { className: "p-3 sm:p-5 flex flex-wrap justify-between items-center border-b border-slate-700/50 glass-panel sticky top-0 z-50 transition-all gap-y-3" },
            React.createElement("div", { className: "flex items-center gap-2 sm:gap-3 cursor-pointer order-1", onClick: () => { if (!isInGame)
                    setCurrentTab('games'); } },
                React.createElement("div", { className: "bg-indigo-500/20 p-1.5 sm:p-2 rounded-xl border border-indigo-500/40" },
                    React.createElement(IconGamepad, { className: "text-indigo-400 w-5 h-5 sm:w-7 sm:h-7" })),
                React.createElement("span", { className: "text-xl sm:text-2xl font-black bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent" }, "GameQJ")),
            !isInGame && (React.createElement("nav", { className: "w-full sm:w-auto order-3 sm:order-2 flex items-center justify-center bg-slate-900/80 p-1.5 rounded-xl sm:rounded-2xl border border-slate-700/60 gap-1 mt-1 sm:mt-0" },
                React.createElement("button", { onClick: () => setCurrentTab('games'), className: `flex-1 sm:flex-none flex justify-center items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all ${currentTab === 'games'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'}` },
                    React.createElement(IconGamepad, { className: "w-4 h-4" }),
                    React.createElement("span", null, "\u0628\u0627\u0632\u06CC")),
                React.createElement("button", { onClick: () => setCurrentTab('atom'), className: `flex-1 sm:flex-none flex justify-center items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all ${currentTab === 'atom'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'}` },
                    React.createElement("svg", { className: "w-4 h-4", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true" },
                        React.createElement("ellipse", { cx: "12", cy: "12", rx: "9", ry: "3.8", stroke: "currentColor", strokeWidth: "1.7", transform: "rotate(45 12 12)" }),
                        React.createElement("ellipse", { cx: "12", cy: "12", rx: "9", ry: "3.8", stroke: "currentColor", strokeWidth: "1.7", transform: "rotate(-45 12 12)" }),
                        React.createElement("circle", { cx: "12", cy: "12", r: "1.5", fill: "currentColor" })),
                    React.createElement("span", null, "\u0627\u062A\u0645")),
                React.createElement("button", { onClick: () => setCurrentTab('friends'), className: `flex-1 sm:flex-none flex justify-center items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all relative ${currentTab === 'friends'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'}` },
                    React.createElement(IconUsers, { className: "w-4 h-4" }),
                    React.createElement("span", null, "\u062F\u0648\u0633\u062A\u0627\u0646"),
                    hasUnseenInvite && (React.createElement("span", { className: "absolute top-1 right-1 flex h-2.5 w-2.5", title: "\u062F\u0639\u0648\u062A \u0628\u0627\u0632\u06CC \u062C\u062F\u06CC\u062F" },
                        React.createElement("span", { className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-80" }),
                        React.createElement("span", { className: "relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" }))),
                    !hasUnseenInvite && (currentUser.friendRequests || []).length > 0 && (React.createElement("span", { className: "absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-pink-500 animate-pulse" }))),
                React.createElement("button", { onClick: () => setCurrentTab('store'), className: `flex-1 sm:flex-none flex justify-center items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all ${currentTab === 'store'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'}` },
                    React.createElement(IconShoppingBag, { className: "w-4 h-4" }),
                    React.createElement("span", null, "\u0641\u0631\u0648\u0634\u06AF\u0627\u0647")),
                React.createElement("button", { onClick: () => setCurrentTab('alliances'), className: `flex-1 sm:flex-none flex justify-center items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all ${currentTab === 'alliances'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'}` },
                    React.createElement("svg", { className: "w-4 h-4", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true" },
                        React.createElement("path", { d: "M12 3 3 7v6c0 5 4 7.5 9 8 5-0.5 9-3 9-8V7l-9-4Z", stroke: "currentColor", strokeWidth: "1.7", strokeLinejoin: "round" }),
                        React.createElement("path", { d: "M12 8v8M9 11h6", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round" })),
                    React.createElement("span", null, "\u0622\u0644\u06CC\u0627\u0646\u0632")),
                isAdminUser(currentUser) && (React.createElement("button", { onClick: () => setCurrentTab('admin'), className: `flex-1 sm:flex-none flex justify-center items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all ${currentTab === 'admin'
                        ? 'bg-gradient-to-r from-amber-500 to-red-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'}` },
                    React.createElement("svg", { className: "w-4 h-4", viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true" },
                        React.createElement("path", { d: "M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z", stroke: "currentColor", strokeWidth: "1.7", strokeLinejoin: "round" })),
                    React.createElement("span", null, "\u0645\u062F\u06CC\u0631\u06CC\u062A"))))),
            React.createElement("div", { className: "flex items-center gap-2 sm:gap-2.5 order-2 sm:order-3" },
                React.createElement(DailyWheelButton, { currentUser: currentUser, isInGame: isInGame, onOpen: () => setShowDailyWheel(true) }),
                React.createElement("button", { onClick: handleToggleTheme, className: `p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border transition-all shadow-md active:scale-95 flex items-center justify-center ${isLightMode
                        ? 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-700 shadow-amber-500/15'
                        : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300'}`, title: isLightMode ? 'تغییر به تم تاریک' : 'تغییر به حالت روشن (۹۰٪ سفید و ۱۰٪ تیره)', "aria-label": "\u062A\u063A\u06CC\u06CC\u0631 \u062A\u0645" }, isLightMode ? (React.createElement("svg", { className: "w-4 h-4 sm:w-5 sm:h-5 text-amber-600", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                    React.createElement("circle", { cx: "12", cy: "12", r: "5" }),
                    React.createElement("line", { x1: "12", y1: "1", x2: "12", y2: "3" }),
                    React.createElement("line", { x1: "12", y1: "21", x2: "12", y2: "23" }),
                    React.createElement("line", { x1: "4.22", y1: "4.22", x2: "5.64", y2: "5.64" }),
                    React.createElement("line", { x1: "18.36", y1: "18.36", x2: "19.78", y2: "19.78" }),
                    React.createElement("line", { x1: "1", y1: "12", x2: "3", y2: "12" }),
                    React.createElement("line", { x1: "21", y1: "12", x2: "23", y2: "12" }),
                    React.createElement("line", { x1: "4.22", y1: "19.78", x2: "5.64", y2: "18.36" }),
                    React.createElement("line", { x1: "18.36", y1: "5.64", x2: "19.78", y2: "4.22" }))) : (React.createElement("svg", { className: "w-4 h-4 sm:w-5 sm:h-5 text-slate-300", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                    React.createElement("path", { d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" })))),
                React.createElement("div", { onClick: () => { if (!isInGame)
                        setCurrentTab('coins'); }, className: `flex items-center gap-1 sm:gap-1.5 bg-amber-500/15 border border-amber-500/35 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl transition-all shadow-md shadow-amber-500/10 ${!isInGame ? 'hover:bg-amber-500/25 cursor-pointer active:scale-95' : 'cursor-default opacity-80'}`, title: "\u0645\u0648\u062C\u0648\u062F\u06CC \u06A9\u06CC\u0648\u062C\u06CC \u0634\u0645\u0627" },
                    React.createElement(IconCoin, { className: "w-4 h-4 sm:w-5 sm:h-5" }),
                    React.createElement("span", { className: "font-black text-amber-300 text-xs sm:text-sm" }, currentUser.coins ?? 0),
                    React.createElement("span", { className: "text-[10px] text-amber-400 font-bold hidden sm:inline" }, "\u06A9\u06CC\u0648\u062C\u06CC")),
                React.createElement("button", { onClick: () => { if (!isInGame)
                        setCurrentTab('profile'); }, className: `flex items-center gap-2 sm:gap-3 px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl text-xs sm:text-sm font-bold border transition-all ${currentTab === 'profile'
                        ? 'bg-slate-800/80 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                        : 'bg-slate-900/60 border-slate-700/80 text-indigo-300'} ${!isInGame ? 'hover:bg-slate-800' : 'cursor-default opacity-80'}` },
                    React.createElement(PlayerAvatar, { user: currentUser, className: "w-7 h-7 sm:w-9 sm:h-9 rounded-xl" }),
                    React.createElement("div", { className: "hidden sm:flex flex-col items-start justify-center" },
                        React.createElement("span", { className: "max-w-[100px] truncate leading-tight" }, currentUser.username),
                        currentUser.equipped?.titles && currentUser.equipped.titles !== 'classic' && (React.createElement("div", { className: "-mt-1 origin-right transform scale-90" }, renderPlayerTitle(currentUser.equipped.titles))))))),
        React.createElement("main", { className: "flex-1 w-full max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 flex flex-col justify-center relative" },
            React.createElement("div", { className: currentTab === 'games' ? 'w-full flex-1 flex flex-col' : 'hidden' },
                React.createElement(GamesHub, { currentUser: currentUser, onUserUpdated: (updated) => setCurrentUser(updated), lobbyId: activeLobbyId, onCloseLobby: () => setActiveLobbyId(null), onOpenProfile: setViewedProfile, setIsInGame: setIsInGame, onNavigateToGames: () => setCurrentTab('games'), onOpenWheel: () => setShowDailyWheel(true) })),
            currentTab === 'atom' && (React.createElement("section", { dir: "rtl", className: "w-full max-w-5xl mx-auto py-8 sm:py-14" },
                React.createElement("div", { className: "relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-slate-950/80 p-6 sm:p-12 shadow-[0_0_70px_rgba(6,182,212,0.10)]" },
                    React.createElement("div", { className: "absolute -top-28 -left-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl animate-pulse" }),
                    React.createElement("div", { className: "absolute -bottom-32 -right-16 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl animate-pulse" }),
                    React.createElement("span", { className: "absolute top-12 left-[18%] h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)] animate-ping" }),
                    React.createElement("span", { className: "absolute top-[32%] right-[12%] h-2 w-2 rounded-full bg-blue-300 shadow-[0_0_14px_rgba(147,197,253,0.9)] animate-pulse" }),
                    React.createElement("span", { className: "absolute bottom-[20%] left-[12%] h-1.5 w-1.5 rounded-full bg-indigo-300 shadow-[0_0_12px_rgba(165,180,252,0.9)] animate-ping" }),
                    React.createElement("div", { className: "relative z-10 flex flex-col items-center text-center" },
                        React.createElement("div", { className: "relative mb-7 flex h-28 w-28 items-center justify-center rounded-[2rem] border border-cyan-300/25 bg-slate-900/80 text-cyan-300 shadow-[0_0_35px_rgba(34,211,238,0.18)]" },
                            React.createElement("svg", { className: "h-16 w-16 animate-[spin_18s_linear_infinite]", viewBox: "0 0 64 64", fill: "none", "aria-hidden": "true" },
                                React.createElement("ellipse", { cx: "32", cy: "32", rx: "26", ry: "11", stroke: "currentColor", strokeWidth: "1.8" }),
                                React.createElement("ellipse", { cx: "32", cy: "32", rx: "26", ry: "11", stroke: "currentColor", strokeWidth: "1.8", transform: "rotate(60 32 32)" }),
                                React.createElement("ellipse", { cx: "32", cy: "32", rx: "26", ry: "11", stroke: "currentColor", strokeWidth: "1.8", transform: "rotate(120 32 32)" }),
                                React.createElement("circle", { cx: "32", cy: "32", r: "4", fill: "currentColor" }),
                                React.createElement("circle", { cx: "32", cy: "6", r: "2.5", fill: "#93c5fd" })),
                            React.createElement("span", { className: "absolute inset-0 rounded-[2rem] ring-1 ring-cyan-300/10" })),
                        React.createElement("span", { className: "mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-1.5 text-xs font-bold tracking-wide text-cyan-200" },
                            React.createElement("span", { className: "h-2 w-2 rounded-full bg-cyan-300 animate-pulse" }),
                            "\u062F\u0631 \u062D\u0627\u0644 \u0637\u0631\u0627\u062D\u06CC \u0648 \u062A\u0648\u0633\u0639\u0647"),
                        React.createElement("h1", { className: "text-3xl sm:text-5xl font-black tracking-tight text-white" },
                            "\u067E\u0631\u0648\u0698\u0647 \u0627\u062A\u0645 ",
                            React.createElement("span", { className: "bg-gradient-to-l from-cyan-300 to-blue-400 bg-clip-text text-transparent" }, "(Atom)")),
                        React.createElement("p", { className: "mt-3 text-lg sm:text-xl font-bold text-blue-200" }, "\u0628\u0627\u0632\u06CC \u0627\u0635\u0644\u06CC GameQJ"),
                        React.createElement("div", { className: "mt-7 h-px w-24 bg-gradient-to-l from-transparent via-cyan-400/70 to-transparent" }),
                        React.createElement("p", { className: "mt-7 text-base sm:text-lg font-bold text-slate-100" }, "\u0627\u06CC\u0646 \u0628\u062E\u0634 \u062F\u0631 \u062D\u0627\u0644 \u0637\u0631\u0627\u062D\u06CC \u0648 \u062A\u0648\u0633\u0639\u0647 \u0627\u0633\u062A..."),
                        React.createElement("p", { className: "mt-3 max-w-2xl text-sm sm:text-base leading-8 text-slate-300" }, "\u0628\u0627\u0632\u06CC \u0627\u0635\u0644\u06CC \u0648 \u0628\u0632\u0631\u06AF GameQJ \u0628\u0647\u200C\u0632\u0648\u062F\u06CC \u062F\u0631 \u0627\u06CC\u0646 \u0628\u062E\u0634 \u0631\u0648\u0646\u0645\u0627\u06CC\u06CC \u062E\u0648\u0627\u0647\u062F \u0634\u062F."),
                        React.createElement("p", { className: "mt-2 text-sm sm:text-base font-semibold text-cyan-200" }, "\u0645\u0646\u062A\u0638\u0631 \u06CC\u06A9 \u062A\u062C\u0631\u0628\u0647\u0654 \u0647\u06CC\u062C\u0627\u0646\u200C\u0627\u0646\u06AF\u06CC\u0632 \u0648 \u0645\u062A\u0641\u0627\u0648\u062A \u0628\u0627\u0634\u06CC\u062F!"),
                        React.createElement("div", { className: "mt-8 flex items-center gap-2 text-xs font-medium text-slate-500" },
                            React.createElement("span", { className: "h-1 w-8 rounded-full bg-cyan-400/70" }),
                            React.createElement("span", null, "\u062C\u0647\u0627\u0646\u06CC \u062A\u0627\u0632\u0647 \u062F\u0631 \u0631\u0627\u0647 \u0627\u0633\u062A"),
                            React.createElement("span", { className: "h-1 w-8 rounded-full bg-blue-500/70" })))))),
            currentTab === 'friends' && (React.createElement(FriendsPage, { currentUser: currentUser, onUserUpdated: (updated) => setCurrentUser(updated), onOpenLobby: openLobby, onOpenProfile: setViewedProfile })),
            currentTab === 'alliances' && (React.createElement(AlliancePage, { currentUser: currentUser, onUserUpdated: (updated) => setCurrentUser(updated), onOpenProfile: setViewedProfile })),
            currentTab === 'coins' && React.createElement(CoinShopPage, { currentUser: currentUser, onBack: () => setCurrentTab('games') }),
            currentTab === 'store' && React.createElement(StorePage, { currentUser: currentUser, onUserUpdated: (updated) => setCurrentUser(updated) }),
            currentTab === 'profile' && (React.createElement(ProfilePage, { user: currentUser, onBack: () => setCurrentTab('games'), onLogout: handleLogout, onUserUpdated: (updated) => setCurrentUser(updated), onAccountDeleted: handleAccountDeleted })),
            currentTab === 'admin' && isAdminUser(currentUser) && (React.createElement(AdminPage, { currentUser: currentUser, onUserUpdated: (u) => setCurrentUser(u), onBack: () => setCurrentTab('games') }))),
        viewedProfile && React.createElement(PlayerProfileModal, { username: viewedProfile, onClose: () => setViewedProfile(null) }),
        showDailyWheel && (React.createElement(DailyWheelModal, { currentUser: currentUser, onUserUpdated: (u) => setCurrentUser(u), onClose: () => { setShowDailyWheel(false); const fresh = findUser(currentUser.username); if (fresh)
                setCurrentUser(fresh); } }))));
};

/* ===== main.jsx ===== */
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App, null));
