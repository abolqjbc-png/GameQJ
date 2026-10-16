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
    if (!pieceStr) return null;
    if (!styleId || styleId === 'classic') return getChessPieceSymbol(pieceStr);
    const isWhite = pieceStr[0] === 'w';
    const type = pieceStr[1];

    let fill = isWhite ? '#ffffff' : '#0f172a';
    let ink = isWhite ? '#0f172a' : '#e2e8f0';
    let viewBox = '0 0 45 45', inner = '', outline = 0.9;
    let customStyle = { '--ink': ink, filter: `drop-shadow(0 1px 1.5px rgba(0,0,0,.55))` };
    let shapeRendering = 'geometricPrecision';

    if (styleId === 'modern') {
        inner = MODERN_PIECES[type];
    } else if (styleId === 'pixel') {
        viewBox = '0 0 8 8';
        inner = pixelSvg(PIXEL_PIECES[type]);
        outline = 0;
        shapeRendering = 'crispEdges';
        if (!isWhite) customStyle.filter += ' drop-shadow(0 0 .6px #cbd5e1)';
    } else if (styleId === 'minimal') {
        inner = MINIMAL_PIECES[type];
        fill = isWhite ? '#f8fafc' : '#1e293b';
        outline = 0;
        customStyle['--ink'] = isWhite ? '#0f172a' : '#f8fafc';
        customStyle.filter = `drop-shadow(0 2px 3px rgba(0,0,0,.4))`;
        inner = `<circle cx="22.5" cy="22.5" r="20" fill="${fill}" stroke="${customStyle['--ink']}" stroke-width="1.5" opacity="0.95"/>` + inner;
        fill = 'none'; // handeled by circle
    } else if (styleId === 'cosmic') {
        inner = COSMIC_PIECES[type];
        fill = 'none';
        outline = 0;
        customStyle['--ink'] = isWhite ? '#ffffff' : '#0f172a';
        customStyle.filter = isWhite ? `drop-shadow(0 2px 4px rgba(0,0,0,.6))` : `drop-shadow(0 1px 2px rgba(255,255,255,.4)) drop-shadow(0 2px 5px rgba(0,0,0,.8))`;
    } else if (styleId === 'runic') {
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
    } else if (styleId === 'medal') {
        inner = `<circle cx="22.5" cy="22.5" r="19.5"/><circle cx="22.5" cy="22.5" r="15.5" fill="none" style="stroke:var(--ink);stroke-width:1.2;stroke-opacity:.55"/><text x="22.5" y="31.5" text-anchor="middle" font-size="23" style="fill:var(--ink);stroke:none">${CHESS_GLYPHS[type]}&#xFE0E;</text>`;
    } else {
        return getChessPieceSymbol(pieceStr);
    }

    return (
        <svg
            viewBox={viewBox}
            className="piece-anim block select-none cursor-pointer w-[84%] h-[84%]"
            fill={fill}
            stroke={outline ? ink : 'none'}
            strokeWidth={outline}
            strokeLinejoin="round"
            shapeRendering={shapeRendering}
            style={customStyle}
            dangerouslySetInnerHTML={{ __html: inner }}
        />
    );
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
        return (
            <div
                style={{
                    background: `radial-gradient(circle at 34% 28%, rgba(255,255,255,.95) 0, rgba(255,255,255,.4) 13%, transparent 15%), radial-gradient(circle at 50% 42%, ${hex} 0, ${hex} 46%, color-mix(in srgb, ${hex} 58%, #000) 100%)`,
                    boxShadow: '0 3px 5px rgba(0,0,0,.55), inset 0 -3px 5px rgba(0,0,0,.35), inset 0 2px 3px rgba(255,255,255,.4)'
                }}
                className={`relative w-full h-full rounded-full ${isMovable ? 'gq-movable' : ''}`}
            >
                <span className="absolute inset-[24%] rounded-full" style={{ border: '1.5px solid rgba(255,255,255,.55)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.25)' }}></span>
            </div>
        );
    }
    return (
        <svg
            viewBox="0 0 24 24"
            className={`w-full h-full overflow-visible ${isMovable ? 'gq-movable' : ''}`}
            fill={hex}
            stroke="#fff"
            strokeWidth="1.4"
            strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.5))' }}
            dangerouslySetInnerHTML={{ __html: LUDO_TOKEN_SHAPES[styleId] }}
        />
    );
};

// ---------- رندر تاس با استایل‌های مختلف فروشگاه ----------
const renderCustomDice = (val, styleId = 'classic') => {
    const isPlaceholder = !val;
    const actualVal = val || 6; // For placeholder/preview show 6
    const d = [];
    if (actualVal === 1 || actualVal === 3 || actualVal === 5) d.push('50%, 50%');
    if (actualVal !== 1) { d.push('20%, 20%'); d.push('80%, 80%'); }
    if (actualVal >= 4) { d.push('20%, 80%'); d.push('80%, 20%'); }
    if (actualVal === 6) { d.push('20%, 50%'); d.push('80%, 50%'); }

    let bgStyle, dotStyle, borderClass = '', innerShadow = '';

    if (styleId === 'neon') {
        bgStyle = { backgroundColor: '#0f172a', border: '1.5px solid #ec4899', boxShadow: '0 0 15px rgba(236,72,153,0.4), inset 0 0 10px rgba(236,72,153,0.2)' };
        dotStyle = { backgroundColor: '#22d3ee', boxShadow: '0 0 8px #22d3ee, 0 0 12px #22d3ee' };
    } else if (styleId === 'wood') {
        bgStyle = { background: 'linear-gradient(135deg, #78350f, #451a03)', border: '1px solid #290f01', boxShadow: '0 4px 6px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.1)' };
        dotStyle = { backgroundColor: '#1c0a00', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.15)' };
    } else if (styleId === 'crystal') {
        bgStyle = { background: 'linear-gradient(135deg, rgba(224,242,254,0.7), rgba(125,211,252,0.4))', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 10px rgba(0,0,0,0.3), inset 0 4px 8px rgba(255,255,255,0.8)' };
        dotStyle = { backgroundColor: '#ffffff', boxShadow: '0 0 8px #ffffff' };
    } else if (styleId === 'gold') {
        bgStyle = { background: 'radial-gradient(circle at 30% 30%, #fef08a, #d97706, #78350f)', border: '1px solid #fef08a', boxShadow: '0 5px 15px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.5)' };
        dotStyle = { backgroundColor: '#450a0a', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6), 0 1px 1px rgba(255,255,255,0.4)' };
    } else {
        // Classic
        bgStyle = { backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1', boxShadow: '0 4px 8px rgba(0,0,0,0.2)' };
        dotStyle = { backgroundColor: '#0f172a' };
    }

    return (
        <div className="relative w-full h-full rounded-[25%] transition-all overflow-hidden" style={bgStyle}>
            {isPlaceholder && styleId === 'classic' && (
                <span className="absolute inset-0 flex items-center justify-center text-xs sm:text-base opacity-70">🎲</span>
            )}
            {(!isPlaceholder || styleId !== 'classic') && d.map((pos, i) => (
                <span
                    key={i}
                    className="absolute rounded-full"
                    style={{
                        width: '18%', height: '18%',
                        left: pos.split(',')[0], top: pos.split(',')[1],
                        transform: 'translate(-50%, -50%)',
                        ...dotStyle
                    }}
                />
            ))}
        </div>
    );
};
