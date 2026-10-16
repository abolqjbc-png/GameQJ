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
    if (!pieceStr) return null;
    const color = pieceStr[0];
    const type = pieceStr[1];
    return (
        <span className={`piece-anim drop-shadow-md cursor-pointer block select-none ${color === 'w' ? 'text-white' : 'text-slate-900'}`}>
            {CHESS_SYMBOLS[type]}
        </span>
    );
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
            } else if (cur[type] < initial) {
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
            if (board[r][c] === `${color}k`) return [r, c];
        }
    }
    return null;
};

const isSquareAttacked = (r, c, attackerColor, board) => {
    const pawnDir = attackerColor === 'w' ? -1 : 1;
    const pawnFromR = r - pawnDir;
    if (pawnFromR >= 0 && pawnFromR < 8) {
        if (c - 1 >= 0 && board[pawnFromR][c - 1] === `${attackerColor}p`) return true;
        if (c + 1 < 8 && board[pawnFromR][c + 1] === `${attackerColor}p`) return true;
    }

    const knightOffsets = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
    for (const [dr, dc] of knightOffsets) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === `${attackerColor}n`) return true;
    }

    const straightDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of straightDirs) {
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const p = board[nr][nc];
            if (p) {
                if (p === `${attackerColor}r` || p === `${attackerColor}q`) return true;
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
                if (p === `${attackerColor}b` || p === `${attackerColor}q`) return true;
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
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === `${attackerColor}k`) return true;
    }

    return false;
};

const isKingInCheck = (board, color) => {
    const kingPos = findKing(board, color);
    if (!kingPos) return false;
    const opponent = color === 'w' ? 'b' : 'w';
    return isSquareAttacked(kingPos[0], kingPos[1], opponent, board);
};

const getPseudoLegalMoves = (r, c, board, enPassantTarget, castlingRights) => {
    const piece = board[r][c];
    if (!piece) return [];
    const color = piece[0];
    const type = piece[1];
    const moves = [];

    const addMove = (nr, nc, isSpecial = {}) => {
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const target = board[nr][nc];
            if (!target) {
                moves.push({ r: nr, c: nc, capture: false, ...isSpecial });
                return true;
            } else if (target[0] !== color) {
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
    } else if (type === 'n') {
        const offsets = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
        offsets.forEach(([dr, dc]) => addMove(r + dr, c + dc));
    } else if (type === 'b' || type === 'r' || type === 'q') {
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
    } else if (type === 'k') {
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
    } else if (move.castle === 'k') {
        newBoard[fromR][5] = newBoard[fromR][7];
        newBoard[fromR][7] = null;
    } else if (move.castle === 'q') {
        newBoard[fromR][3] = newBoard[fromR][0];
        newBoard[fromR][0] = null;
    }

    newBoard[move.r][move.c] = move.promotion ? `${piece[0]}q` : piece;
    return newBoard;
};

const getLegalMoves = (r, c, board, enPassantTarget, castlingRights) => {
    const piece = board[r][c];
    if (!piece) return [];
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
                if (legals.length > 0) return true;
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
        if (!winner) return false;
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
            preview: ['k', 'q', 'r', 'n'].map(t => (
                <span key={t} className={`flex items-center justify-center w-7 h-7 sm:w-10 sm:h-10 rounded-md text-xl sm:text-3xl ${color === 'w' ? 'bg-slate-600' : 'bg-slate-300'}`}>
                    {renderChessPiece(color + t, pieceStyleOf(color))}
                </span>
            ))
        });
    });

    const playerBar = (side, isTurn) => {
        const capturedList = side.color === 'w' ? capturedData.capturedByWhite : capturedData.capturedByBlack;
        const advantage = side.color === 'w' ? capturedData.whiteAdvantage : capturedData.blackAdvantage;
        const grouped = groupCapturedPieces(capturedList);

        return (
            <div className={`w-full max-w-[500px] flex flex-col gap-2 p-2.5 sm:px-3.5 sm:py-2.5 rounded-2xl border transition-all duration-300 ${
                isTurn ? 'bg-indigo-500/15 border-indigo-400/70 gq-plate-active' : 'bg-slate-900/70 border-slate-700/60'
            }`} style={{ '--glow': '#6366f1' }}>
                <div className="flex items-center gap-2.5 sm:gap-3">
                    <span data-gq-player={side.name} className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl shrink-0 flex items-center justify-center text-xl border-2" style={{ borderColor: side.color === 'w' ? '#e2e8f0' : '#6366f1' }}>
                        <div className="absolute inset-0 rounded-[inherit] overflow-hidden bg-slate-700 flex items-center justify-center">
                            {side.avatar ? <img src={side.avatar} alt="" draggable={false} className="w-full h-full object-cover" /> : (side.isBot ? '🤖' : '👤')}
                        </div>
                        {side.account?.equipped?.frames && renderAvatarFrame(side.account.equipped.frames)}
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                            <span className="font-black text-white text-xs sm:text-sm truncate">{side.name}{side.isMe ? ' (شما)' : ''}</span>
                            {isTurn && <span className="text-[9px] sm:text-[10px] font-black text-indigo-300 bg-indigo-500/25 border border-indigo-400/40 px-1.5 py-0.5 rounded-full animate-pulse shrink-0">نوبت</span>}
                        </div>
                        {side.account?.equipped?.titles && side.account.equipped.titles !== 'classic' ? (
                            <div className="-mt-0.5 origin-right transform scale-90 text-right">
                                {renderPlayerTitle(side.account.equipped.titles)}
                            </div>
                        ) : (
                            <div className="text-[10px] sm:text-xs text-slate-400 mt-0.5">{side.tag}</div>
                        )}
                    </div>
                    <span className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-xl sm:text-2xl shrink-0 ${side.color === 'w' ? 'bg-slate-600' : 'bg-slate-300'}`}>
                        {renderChessPiece(side.color + 'k', pieceStyleOf(side.color))}
                    </span>
                    <span dir="ltr" className={"gq-clock " + (clockValues[side.color] < 60000 ? "gq-clock-low" : "")} aria-label="زمان باقی‌مانده">
                        {formatGameTime(clockValues[side.color])}
                    </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-800/80 px-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <span className="text-[10px] text-slate-400 font-bold shrink-0">غنیمت‌ها:</span>
                        {grouped.length > 0 ? (
                            grouped.map(item => (
                                <div
                                    key={item.type}
                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-xs font-bold shadow-sm border transition-transform hover:scale-110 ${
                                        item.pieceStr[0] === 'b' ? 'bg-slate-200 text-slate-900 border-slate-300' : 'bg-slate-800 text-white border-slate-700'
                                    }`}
                                    title={`${CHESS_PIECE_NAMES[item.type]} (گرفته‌شده)`}
                                >
                                    <span className="text-sm sm:text-base leading-none flex items-center justify-center">
                                        {CHESS_SYMBOLS[item.type]}
                                    </span>
                                    {item.count > 1 && (
                                        <span className={`text-[10px] font-black leading-none ${item.pieceStr[0] === 'b' ? 'text-slate-800' : 'text-indigo-300'}`}>
                                            ×{item.count}
                                        </span>
                                    )}
                                </div>
                            ))
                        ) : (
                            <span className="text-[10px] text-slate-500 font-medium">—</span>
                        )}
                    </div>
                    {advantage > 0 && (
                        <span className="font-mono font-black text-[10px] sm:text-xs text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-lg shadow-sm shrink-0 animate-in fade-in">
                            +{advantage}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    const topSide = sides.find(s => s.color !== myColor);
    const bottomSide = sides.find(s => s.color === myColor);

    const boardRef = useRef(board);
    const botTimerRef = useRef(null);
    useEffect(() => { boardRef.current = board; }, [board]);
    useEffect(() => () => { if (botTimerRef.current) clearTimeout(botTimerRef.current); }, []);

    const [hasFreeRematch, setHasFreeRematch] = useState(false);
    const [freeRematchUsed, setFreeRematchUsed] = useState(false);
    const [rematchState, setRematchState] = useState('idle');
    const rematchActionsRef = useRef({});
    const rematchNotice = (msg) => {
        if (msg) showToast({ id: 'rematch-notice', type: 'error', title: 'بازی مجدد ممکن نیست', text: msg, duration: 5000 });
    };

    useEffect(() => {
        if (matchType !== 'online') return;
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
        } else if (rematchState === 'requested') {
            showToast({ id: 'rematch', type: 'waiting', title: 'درخواست بازی مجدد ارسال شد', text: `در انتظار پاسخ «${peerName}»...`, duration: 20000, showTimer: true });
        } else {
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
        if (!clockStartRef.current) return { w: 720000, b: 720000, active: 'w' };
        const moves = matchType === 'online'
            ? getMessages().filter(message => message.matchId === currentMatchId && message.text.startsWith('__MOVE__')).map(message => Date.parse(message.createdAt))
            : localMoveTimes.current;
        return chessClockRemaining(clockStartRef.current, moves, Date.now());
    };

    const finishOnTime = (values) => {
        if (values[values.active] > 0) return false;
        const winningColor = values.active === 'w' ? 'b' : 'w';
        const material = boardRef.current.flat().filter(piece => piece && piece[0] === winningColor && piece[1] !== 'k');
        const opposingMaterial = boardRef.current.flat().filter(piece => piece && piece[0] === values.active && piece[1] !== 'k');
        const bareKing = material.length === 0 || (opposingMaterial.length === 0 && material.length === 1 && ['b', 'n'].includes(material[0][1]));
        setTimeoutReason('زمان ' + (values.active === 'w' ? 'سفید' : 'سیاه') + ' تمام شد' + (bareKing ? '؛ مساوی' : ''));
        if (bareKing) setIsStalemate(true);
        else setWinner(winningColor === 'w' ? 'سفید' : 'سیاه');
        setPendingPromotion(null);
        if (botTimerRef.current) clearTimeout(botTimerRef.current);
        return true;
    };

    useEffect(() => {
        if (showIntro || winner || isStalemate) return;
        if (!clockStartRef.current) clockStartRef.current = matchType === 'online'
            ? gameClockStart('gameqj:chess-clock:' + currentMatchId) : Date.now();
        const tick = () => {
            const values = readClock();
            setClockValues(previous => {
                const sameDisplayedTime =
                    Math.ceil(previous.w / 1000) === Math.ceil(values.w / 1000) &&
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
        if (setIsInGame) setIsInGame(!(winner || isStalemate));
    }, [winner, isStalemate, setIsInGame]);

    // همگام‌سازی و شنود پیام‌های ریمچ
    useEffect(() => {
        if (matchType !== 'online' || !currentMatchId) return;

        const checkMessages = (event) => {
            if (event?.key && event.key !== MESSAGES_KEY) return;
            const msgs = getMessages().filter(m => m.matchId === currentMatchId);

            const abandonMsgs = msgs.filter(m => m.text.startsWith('__ABANDON__'));
            if (abandonMsgs.length > 0 && !winner) {
                const leavers = abandonMsgs.map(m => m.text.replace('__ABANDON__', ''));
                if (leavers.some(l => l !== currentUser.username)) {
                    setWinner('شما (به دلیل خروج حریف)');
                }
            }

            if (!winner && !isStalemate) {
                const nextMoveMsg = msgs.find(m =>
                    m.text.startsWith('__MOVE__') &&
                    m.senderUsername !== currentUser.username &&
                    !processedMoveIdsRef.current.has(m.id)
                );
                if (nextMoveMsg) {
                    processedMoveIdsRef.current.add(nextMoveMsg.id);
                    try {
                        const data = JSON.parse(nextMoveMsg.text.replace('__MOVE__', ''));
                        executeMove(data.fromR, data.fromC, data.move, data.promoType, true);
                    } catch(e) {}
                }
            }

            if (winner || isStalemate) {
                const recentRematchMsgs = msgs.filter(m => 
                    m.text.startsWith('__REMATCH') &&
                    new Date(m.createdAt).getTime() > Date.now() - 25000 
                );

                const latestRematchMsg = recentRematchMsgs[recentRematchMsgs.length - 1];

                if (latestRematchMsg && latestRematchMsg.senderUsername !== currentUser.username) {
                    if (latestRematchMsg.text.startsWith('__REMATCH_REQUEST__') && rematchState === 'idle') {
                        const nextId = latestRematchMsg.text.replace('__REMATCH_REQUEST__', '');
                        setPendingNextMatchId(nextId);
                        setRematchState('received');
                        setRematchTimeLeft(20);
                    } else if (latestRematchMsg.text.startsWith('__REMATCH_ACCEPTED__') && rematchState === 'requested') {
                        const acceptedId = latestRematchMsg.text.replace('__REMATCH_ACCEPTED__', '');
                        if (acceptedId === pendingNextMatchId) {
                            startNewGame(acceptedId);
                            showToast({ id: 'rematch-result', type: 'success', title: 'درخواست پذیرفته شد', text: `«${peerName}» بازی مجدد را قبول کرد؛ بازی شروع شد!`, duration: 3500 });
                            if (onNavigateToGames) onNavigateToGames();
                        }
                    } else if (latestRematchMsg.text === '__REMATCH_DECLINED__' && rematchState === 'requested') {
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
        if (!winner && !isStalemate) return;
        if (matchType !== 'online') return;

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
        } catch(e) {}
    }, [winner, isStalemate, matchType, currentMatchId, currentUser.username, myColor, whiteName, blackName, peerName, freeRematchUsed, matchParticipants]);

    useEffect(() => {
        let timerId;
        if ((rematchState === 'received' || rematchState === 'requested') && rematchTimeLeft > 0) {
            timerId = setTimeout(() => {
                setRematchTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (rematchTimeLeft === 0 && (rematchState === 'received' || rematchState === 'requested')) {
            if (rematchState === 'received') {
                declineRematch();
            } else if (rematchState === 'requested') {
                showToast({ id: 'rematch-result', type: 'info', title: 'زمان به پایان رسید', text: 'حریف پاسخی نداد؛ به فهرست بازی‌ها بازگشتید.', duration: 5000 });
                setRematchState('idle');
                onExit();
            }
        }
        return () => clearTimeout(timerId);
    }, [rematchTimeLeft, rematchState]);

    const handleExitClick = () => {
        if (winner || isStalemate) onExit();
        else setShowExitConfirm(true);
    };

    const confirmExit = () => {
        setShowExitConfirm(false);
        if (matchType === 'online') {
            sendMessage(currentUser.username, '__ABANDON__' + currentUser.username, peerName, currentMatchId);
        }
        onExit();
    };

    const executeMove = (fromR, fromC, move, promoType = 'q', isSync = false) => {
        if (winner || isStalemate || (!isSync && finishOnTime(readClock()))) return;
        const baseBoard = boardRef.current;
        const movingPiece = baseBoard[fromR][fromC];
        const color = movingPiece[0];
        const newBoard = baseBoard.map(row => [...row]);

        newBoard[fromR][fromC] = null;

        if (move.enPassant) {
            const pawnDir = color === 'w' ? 1 : -1;
            newBoard[move.r + pawnDir][move.c] = null;
        } else if (move.castle === 'k') {
            newBoard[fromR][5] = newBoard[fromR][7];
            newBoard[fromR][7] = null;
        } else if (move.castle === 'q') {
            newBoard[fromR][3] = newBoard[fromR][0];
            newBoard[fromR][0] = null;
        }

        newBoard[move.r][move.c] = move.promotion ? `${color}${promoType}` : movingPiece;

        const nextCastling = JSON.parse(JSON.stringify(castlingRights));
        if (movingPiece === `${color}k`) {
            nextCastling[color].k = false;
            nextCastling[color].q = false;
        }
        if (fromR === 7 && fromC === 7) nextCastling.w.k = false;
        if (fromR === 7 && fromC === 0) nextCastling.w.q = false;
        if (fromR === 0 && fromC === 7) nextCastling.b.k = false;
        if (fromR === 0 && fromC === 0) nextCastling.b.q = false;
        setCastlingRights(nextCastling);

        if (move.doubleStep) {
            const stepDir = color === 'w' ? 1 : -1;
            setEnPassantTarget({ r: move.r + stepDir, c: move.c });
        } else {
            setEnPassantTarget(null);
        }

        const cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        let notation = '';
        if (move.castle === 'k') notation = 'O-O';
        else if (move.castle === 'q') notation = 'O-O-O';
        else {
            const pName = movingPiece[1].toUpperCase() !== 'P' ? movingPiece[1].toUpperCase() : '';
            notation = `${pName}${move.capture ? (pName ? 'x' : `${cols[fromC]}x`) : ''}${cols[move.c]}${8 - move.r}${move.promotion ? `=${promoType.toUpperCase()}` : ''}`;
        }

        const nextTurn = color === 'w' ? 'b' : 'w';
        const opponentCheck = isKingInCheck(newBoard, nextTurn);
        if (opponentCheck) notation += '+';

        setLastMove({
            from: [fromR, fromC],
            to: [move.r, move.c],
            capture: !!(move.capture || baseBoard[move.r][move.c] || move.enPassant),
            castle: move.castle,
            timestamp: Date.now()
        });

        if (matchType === 'online' && !isSync) {
            sendMessage(currentUser.username, `__MOVE__${JSON.stringify({fromR, fromC, move, promoType})}`, peerName, currentMatchId);
            window.dispatchEvent(new Event('storage'));
        }

        if (matchType !== 'online') localMoveTimes.current.push(Date.now());
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
            } else {
                setIsStalemate(true);
            }
        } else if (matchType === 'bot' && nextTurn === 'b') {
            if (botTimerRef.current) clearTimeout(botTimerRef.current);
            botTimerRef.current = setTimeout(() => simulateBotMove(newBoard, move.doubleStep ? { r: move.r + (color === 'w' ? 1 : -1), c: move.c } : null, nextCastling), 600);
        }
    };

    const handleSquareClick = (r, c) => {
        if (showIntro || winner || isStalemate || pendingPromotion) return;
        if (matchType === 'bot' && turn === 'b') return;
        if (matchType === 'online' && turn !== myColor) return;

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
            } else {
                if (piece && piece[0] === turn) {
                    setSelectedSquare([r, c]);
                    setPossibleMoves(getLegalMoves(r, c, board, enPassantTarget, castlingRights));
                } else {
                    setSelectedSquare(null);
                    setPossibleMoves([]);
                }
            }
        } else {
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

        if (allMoves.length === 0) return;

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
            } else {
                const freshUser = findUser(currentUser.username);
                if (!freshUser || freshUser.coins < ONLINE_ENTRY_FEE) {
                    rematchNotice(`موجودی کیوجی کافی نیست! ورود نیازمند ${ONLINE_ENTRY_FEE} کیوجی است.`);
                    setRematchState('idle');
                    return;
                }
                deductCoins(currentUser.username, ONLINE_ENTRY_FEE);
                if (onUserUpdated) onUserUpdated(findUser(currentUser.username));
            }
        }

        if (newMatchId) setCurrentMatchId(newMatchId);

        try {
            localStorage.setItem(`gameqj_last_chess_match_${currentUser.username}`, JSON.stringify({
                matchId: newMatchId || currentMatchId,
                gameType: 'chess',
                matchParticipants: matchParticipants || [whiteName, blackName],
                peerName: peerName,
                hasFreeRematch: false,
                timestamp: Date.now()
            }));
        } catch(e) {}

        if (botTimerRef.current) { clearTimeout(botTimerRef.current); botTimerRef.current = null; }
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
        } else {
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
        if (onNavigateToGames) onNavigateToGames();
    };

    const declineRematch = () => {
        sendMessage(currentUser.username, '__REMATCH_DECLINED__', peerName, currentMatchId);
        window.dispatchEvent(new Event('storage'));
        setRematchState('idle');
        onExit();
    };
    rematchActionsRef.current = { accept: acceptRematch, decline: declineRematch };

    useEffect(() => {
        if (!winner || resultRecordedRef.current) return;
        resultRecordedRef.current = true;
        const won = (typeof winner === 'string' && winner.includes('شما')) ||
            (winner === 'سفید' && myColor === 'w') ||
            (winner === 'سیاه' && myColor === 'b');

        if (matchType === 'online') {
            if (won) {
                playSound('coin', currentUser.settings?.sound);
                if (!freeRematchUsed) setHasFreeRematch(true);
            } else {
                setHasFreeRematch(false);
            }
        }

        onGameFinished(won, 'chess', matchType === 'online');
    }, [winner, onGameFinished, matchType, freeRematchUsed, currentUser.settings?.sound, myColor]);

    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-4 sm:gap-6 animate-in fade-in relative px-2 sm:px-0">
            {/* انیمیشن روان بدون لگ، کاملاً GPU-Accelerated */}
            <style>{`
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
            `}</style>

            {timeoutReason && <p role="status" className="text-amber-300 font-bold">{timeoutReason}</p>}
            {showIntro && <VsIntro title="شطرنج" subtitle={matchType === 'online' ? 'مسابقه‌ی آنلاین' : 'مسابقه‌ی تمرینی'} players={[sides[0], sides[1]]} onDone={() => setShowIntro(false)} />}
            
            <div className="w-full glass-panel p-3 sm:p-4 rounded-2xl sm:rounded-3xl flex flex-wrap items-center justify-between gap-3 text-center sm:text-right">
                <button
                    onClick={handleExitClick}
                    className="px-3 sm:px-4 py-2 bg-slate-800 hover:bg-rose-600 hover:border-rose-500 text-white rounded-xl text-[10px] sm:text-sm font-bold border border-slate-700 flex items-center justify-center gap-1.5 transition-all shadow-md w-full sm:w-auto"
                >
                    <IconArrowLeft className="w-4 h-4" /> {winner || isStalemate ? 'بازگشت به فهرست' : 'خروج از بازی'}
                </button>
                <div className="w-full sm:flex-1 text-center">
                    <h3 className="text-base sm:text-lg font-black text-white">شطرنج استاندارد FIDE ({matchType === 'bot' ? 'تک‌نفره' : 'آنلاین'})</h3>
                    {matchType === 'online' && (
                        <span className="text-[10px] sm:text-[11px] font-bold text-amber-300 block sm:inline mt-1 sm:mt-0 sm:mr-2">جایزه برد: ۵۰ کیوجی سکه</span>
                    )}
                </div>
                <div className="hidden sm:block w-20"></div>
            </div>

            <div className="w-full flex flex-col lg:flex-row gap-6 sm:gap-8 items-center lg:items-start justify-center">
                <div className="w-full flex flex-col items-center gap-2 sm:gap-3 lg:w-auto">
                    {playerBar(topSide, !winner && !isStalemate && turn === topSide.color)}

                    {/* صفحه شطرنج */}
                    <div className={`chess-board w-full max-w-[100vw] sm:max-w-[500px] aspect-square rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border-[4px] sm:border-[10px] border-slate-800 grid grid-cols-8 grid-rows-8 relative ${isBlackPlayer ? 'rotate-180' : ''}`} dir="ltr">
                        {board.map((row, r) =>
                            row.map((piece, c) => {
                                const isLight = (r + c) % 2 === 0;
                                const isSelected = selectedSquare && selectedSquare[0] === r && selectedSquare[1] === c;
                                const moveData = possibleMoves.find(m => m.r === r && m.c === c);
                                const isKing = piece === `${turn}k`;
                                const isCheckSquare = isKing && isInCheck;

                                const isLastFrom = lastMove && lastMove.from[0] === r && lastMove.from[1] === c;
                                const isLastTo = lastMove && lastMove.to[0] === r && lastMove.to[1] === c;
                                const isLastCastlingRook = lastMove && lastMove.castle && (
                                    (lastMove.castle === 'k' && r === lastMove.from[0] && c === 5) ||
                                    (lastMove.castle === 'q' && r === lastMove.from[0] && c === 3)
                                );

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
                                    } else if (isLastCastlingRook) {
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

                                return (
                                    <div
                                        key={`sq-${r}-${c}`}
                                        onClick={() => handleSquareClick(r, c)}
                                        className={`chess-square ${isLight ? 'chess-square-light' : 'chess-square-dark'} relative flex items-center justify-center text-3xl sm:text-4xl md:text-5xl cursor-pointer select-none transition-colors duration-200 ${
                                            isLight ? 'bg-slate-300' : 'bg-slate-600'
                                        } ${
                                            isSelected ? 'chess-square-selected !bg-indigo-400/85 ring-2 ring-indigo-300 ring-inset z-20' : ''
                                        } ${
                                            (isLastFrom || isLastTo) && !isSelected && !isCheckSquare ? `chess-square-last ${isLight ? '!bg-amber-200/90' : '!bg-amber-600/80'}` : ''
                                        } ${
                                            moveData && !moveData.capture ? 'hover:bg-indigo-300/50' : ''
                                        } ${
                                            moveData && moveData.capture ? 'hover:bg-rose-400/40' : ''
                                        } ${
                                            isCheckSquare ? 'chess-square-check !bg-rose-600/85 shadow-[inset_0_0_20px_rgba(225,29,72,0.9)] animate-pulse z-20' : ''
                                        }`}
                                    >
                                        {moveData && !moveData.capture && (
                                            <div className="chess-move-dot absolute w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-indigo-950/40 shadow-inner z-10 pointer-events-none"></div>
                                        )}

                                        {moveData && moveData.capture && (
                                            <div className="absolute inset-1.5 sm:inset-2 rounded-full border-[3px] border-rose-500/80 bg-rose-500/20 z-10 pointer-events-none animate-pulse"></div>
                                        )}

                                        {piece && (
                                            <div
                                                key={cellPieceKey}
                                                style={slideStyle}
                                                className="chess-hardware-piece relative z-10 w-full h-full flex items-center justify-center"
                                            >
                                                <div className={`w-full h-full flex items-center justify-center ${isBlackPlayer ? 'rotate-180' : ''}`}>
                                                    {renderChessPiece(piece, pieceStyleOf(piece[0]))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}

                        {pendingPromotion && (
                            <div dir="rtl" className={`absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center ${isBlackPlayer ? 'rotate-180' : ''}`}>
                                <h4 className="text-white font-black text-xs sm:text-sm mb-3">مهره ارتقا را انتخاب کنید:</h4>
                                <div className="flex gap-2 sm:gap-3">
                                    {[
                                        { type: 'q', sym: '♛', label: 'وزیر' },
                                        { type: 'r', sym: '♜', label: 'رخ' },
                                        { type: 'b', sym: '♝', label: 'فیل' },
                                        { type: 'n', sym: '♞', label: 'اسب' },
                                    ].map(item => (
                                        <button
                                            key={item.type}
                                            onClick={() => {
                                                executeMove(pendingPromotion.fromR, pendingPromotion.fromC, pendingPromotion.move, item.type);
                                                setPendingPromotion(null);
                                            }}
                                            className="p-2 sm:p-3 bg-slate-800 hover:bg-indigo-600 border border-slate-600 rounded-xl sm:rounded-2xl flex flex-col items-center gap-1 transition-all"
                                        >
                                            <span className="text-2xl sm:text-4xl text-amber-300">{item.sym}</span>
                                            <span className="text-[10px] sm:text-xs text-white font-bold">{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {playerBar(bottomSide, !winner && !isStalemate && turn === bottomSide.color)}
                </div>

                <div className="w-full lg:w-72 flex flex-col gap-3 sm:gap-4">
                    <div className="glass-panel p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-700/60 flex flex-row lg:flex-col justify-between items-center lg:items-start">
                        <span className="text-[10px] sm:text-xs text-slate-400">وضعیت نوبت:</span>
                        <div className="text-sm sm:text-base font-black text-white mt-0 lg:mt-1 flex items-center justify-between w-auto lg:w-full gap-3">
                            <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${turn === 'w' ? 'bg-white' : 'bg-slate-900 border border-white'}`}></span>
                                {turn === 'w' ? 'سفید' + (myColor === 'w' ? ' (شما)' : '') : 'سیاه' + (myColor === 'b' ? ' (شما)' : '')}
                            </div>
                            {isInCheck && (
                                <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-lg">
                                    کیش!
                                </span>
                            )}
                        </div>
                    </div>

                    <InGameChatDrawer
                        currentUser={currentUser}
                        matchId={currentMatchId}
                        peerName={peerName}
                        onOpenProfile={onOpenProfile}
                    />
                    <ReactionTray
                        matchId={currentMatchId}
                        currentUser={currentUser}
                        onUserUpdated={onUserUpdated}
                        hidden={showIntro}
                        targets={sides.filter(s => !s.isMe).map(s => ({ name: s.name, label: s.name, isBot: s.isBot }))}
                    />

                    <details className="glass-panel p-4 rounded-2xl border border-slate-700/60">
                        <summary className="text-[10px] sm:text-xs font-bold text-slate-400 mb-2 sm:mb-3 border-b border-slate-700 pb-1.5 sm:pb-2">تاریخچه حرکات</summary>
                        <div className="overflow-y-auto max-h-32 sm:max-h-48 space-y-1 custom-scrollbar text-[10px] sm:text-xs font-mono" dir="ltr">
                            {moveHistory.map((m, i) => (
                                <div key={i} className="p-1 sm:p-1.5 bg-slate-900/60 rounded text-slate-300">
                                    {i + 1}. {m.color === 'w' ? 'White' : 'Black'}: {m.text}
                                </div>
                            ))}
                        </div>
                    </details>
                </div>
            </div>

            {/* صفحه جذاب و پرنشاط پایان مسابقه */}
            {(winner || isStalemate) && (
                <div dir="rtl" className="fixed inset-0 z-[95] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto">
                    <div className="relative w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 text-center border-2 border-amber-400/50 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-400 bg-slate-900/95">
                        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

                        {isMyVictory && VICTORY_CONFETTI.map((c, idx) => (
                            <span
                                key={idx}
                                className={`absolute pointer-events-none ${c.size}`}
                                style={{
                                    top: c.top,
                                    left: c.left,
                                    backgroundColor: c.color,
                                    animation: `confetti-fall 2.8s ease-in-out ${c.delay} infinite`
                                }}
                            ></span>
                        ))}

                        <div className="relative z-10 flex flex-col items-center">
                            <div className="relative mb-3 sm:mb-4">
                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-amber-500/25 via-yellow-500/15 to-indigo-600/30 border-2 border-amber-400/60 shadow-xl shadow-amber-500/25 flex items-center justify-center" style={{ animation: 'victory-bounce 2.2s ease-in-out infinite' }}>
                                    <span className="text-5xl sm:text-6xl drop-shadow-[0_10px_16px_rgba(0,0,0,0.5)]">
                                        {isMyVictory ? '🏆' : isDraw ? '🤝' : '⚔️'}
                                    </span>
                                </div>
                                {isMyVictory && (
                                    <span className="absolute -top-3 -right-2 text-2xl drop-shadow-md animate-bounce">
                                        👑
                                    </span>
                                )}
                            </div>

                            <div className="mb-2">
                                <span className={`px-3 py-1 rounded-full text-[11px] font-black tracking-wider border shadow-sm ${
                                    isMyVictory ? 'bg-amber-400/20 text-amber-300 border-amber-400/40' : isDraw ? 'bg-sky-400/20 text-sky-300 border-sky-400/40' : 'bg-rose-400/20 text-rose-300 border-rose-400/40'
                                }`}>
                                    {isMyVictory ? '★ پیروزی باشکوه ★' : isDraw ? '⚖ نتیجه برابر' : 'نبرد شجاعانه'}
                                </span>
                            </div>

                            <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-yellow-400 mb-1.5">
                                {isMyVictory ? 'تبریک! شما برنده شدید!' : isDraw ? 'تساوی بازی (پات)!' : `کیش و مات! ${winner} پیروز شد!`}
                            </h2>

                            <p className="text-slate-400 text-xs sm:text-sm max-w-xs mx-auto leading-relaxed mb-4">
                                {isMyVictory ? 'با یک استراتژی هوشمندانه و تسلط کامل، شاه حریف کیش و مات شد.' : isDraw ? 'هیچ حرکتی بدون کیش مقدور نیست؛ مسابقه با تساوی به پایان رسید.' : 'حریف با برنامه‌ریزی بهتر توانست صفحه را تصاحب کند. در دست بعد جبران کنید!'}
                            </p>

                            {isMyVictory && matchType === 'online' && (
                                <div className="w-full p-3 sm:p-3.5 mb-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-600/20 border-2 border-amber-400/60 shadow-lg shadow-amber-500/15 flex items-center justify-between gap-3 animate-pulse">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-xl bg-amber-400 text-slate-950 font-black text-base shadow-sm">🪙</div>
                                        <div className="text-right">
                                            <div className="text-xs sm:text-sm font-black text-amber-200">پاداش قهرمانی مسابقه</div>
                                            <div className="text-[10px] text-amber-300/80">واریز مستقیم به حساب کیوجی شما</div>
                                        </div>
                                    </div>
                                    <span className="font-mono font-black text-lg sm:text-xl text-amber-300">+۵۰</span>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2.5 w-full mb-5 text-xs">
                                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/70">
                                    <div className="text-slate-400 text-[10px] font-bold">تعداد حرکات</div>
                                    <div className="text-white font-black text-sm mt-0.5">{moveHistory.length} حرکت</div>
                                </div>
                                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/70">
                                    <div className="text-slate-400 text-[10px] font-bold">مهره‌های شکارشده</div>
                                    <div className="text-white font-black text-sm mt-0.5">
                                        {(myColor === 'w' ? capturedData.capturedByWhite : capturedData.capturedByBlack).length} مهره
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2.5 w-full">
                                {matchType === 'bot' ? (
                                    <button
                                        onClick={requestRematch}
                                        className="game-action w-full py-3.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <IconGamepad className="w-4 h-4" />
                                        <span>بازی دوباره (دست جدید)</span>
                                    </button>
                                ) : (
                                    <>
                                        {rematchState === 'idle' && (
                                            <button
                                                onClick={requestRematch}
                                                className="game-action w-full py-3.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                                            >
                                                <IconGamepad className="w-4 h-4" />
                                                <span>{hasFreeRematch ? 'درخواست بازی مجدد (رایگان 🎁)' : 'درخواست بازی مجدد (۲۵ کیوجی)'}</span>
                                            </button>
                                        )}

                                        {rematchState === 'requested' && (
                                            <div className="p-3 bg-slate-800/90 border border-slate-700 rounded-xl text-amber-300 font-bold text-xs flex items-center justify-center gap-2 animate-pulse">
                                                <span>⏳</span>
                                                <span>در انتظار پاسخ حریف ({rematchTimeLeft} ثانیه)...</span>
                                            </div>
                                        )}

                                        {rematchState === 'received' && (
                                            <div className="p-3 bg-indigo-950/70 border border-indigo-500/50 rounded-xl text-indigo-200 font-bold text-xs">
                                                حریف مایل به بازی مجدد است! از اعلان بالای صفحه پاسخ دهید.
                                            </div>
                                        )}
                                    </>
                                )}

                                <button
                                    onClick={onExit}
                                    className="w-full py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors border border-slate-700"
                                >
                                    بازگشت به فهرست بازی‌ها
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal تایید خروج */}
            {showExitConfirm && (
                <div dir="rtl" className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                    <div className="w-full max-w-sm glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl text-center animate-in zoom-in border border-rose-500/30">
                        <IconLogout className="w-12 h-12 sm:w-16 sm:h-16 text-rose-500 mx-auto mb-3 sm:mb-4" />
                        <h3 className="text-lg sm:text-xl font-black text-white mb-2">خروج از بازی؟</h3>
                        <p className="text-slate-300 text-xs sm:text-sm leading-5 sm:leading-6 mb-5 sm:mb-6">آیا مطمئن هستید؟ در صورت خروج از مسابقه، بازنده اعلام خواهید شد.</p>
                        <div className="flex gap-2 sm:gap-3">
                            <button onClick={() => setShowExitConfirm(false)} className="flex-1 py-2.5 sm:py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all">انصراف</button>
                            <button onClick={confirmExit} className="flex-1 py-2.5 sm:py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-rose-600/20 transition-all">بله، خروج</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
