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
