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
