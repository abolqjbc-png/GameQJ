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
