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
