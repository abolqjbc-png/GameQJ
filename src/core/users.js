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
