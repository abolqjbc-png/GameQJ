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
    points[7]  = { color: 'white', count: 3 };
    points[5]  = { color: 'white', count: 5 };

    // مهره‌های سیاه (Black): مسیر حرکت از خانه ۰ به سمت خانه ۲۳
    points[0]  = { color: 'black', count: 2 };
    points[11] = { color: 'black', count: 5 };
    points[16] = { color: 'black', count: 3 };
    points[18] = { color: 'black', count: 5 };

    return points;
};

// بررسی اینکه آیا تمام مهره‌های بازیکن در خانه خودی (Home Board) هستند یا خیر
const canPlayerBearOff = (board, bar, color) => {
    if (bar[color] > 0) return false;

    if (color === 'white') {
        // خانه خودی سفید: خانه‌های ۰ تا ۵
        for (let i = 6; i < 24; i++) {
            if (board[i].color === 'white' && board[i].count > 0) return false;
        }
        return true;
    } else {
        // خانه خودی سیاه: خانه‌های ۱۸ تا ۲۳
        for (let i = 0; i < 18; i++) {
            if (board[i].color === 'black' && board[i].count > 0) return false;
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
        if (from !== 'bar') return [];

        for (let die of uniqueDice) {
            const targetPoint = color === 'white' ? 24 - die : die - 1;
            const target = board[targetPoint];
            if (!target.color || target.color === color || target.count <= 1) {
                moves.push({ from: 'bar', to: targetPoint, die, isHit: target.color === oppColor && target.count === 1 });
            }
        }
        return moves;
    }

    if (from === 'bar') return [];

    const currentPt = board[from];
    if (currentPt.color !== color || currentPt.count <= 0) return [];

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
                } else if (from - die < -1) {
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
            } else if (color === 'black' && targetIdx >= 24) {
                if (from + die === 24) {
                    moves.push({ from, to: 'off', die, isBearOff: true });
                } else if (from + die > 24) {
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
    } else {
        nextBoard[move.from] = { ...nextBoard[move.from] };
        nextBoard[move.from].count -= 1;
        if (!nextBoard[move.from].count) nextBoard[move.from] = { color: null, count: 0 };
    }

    if (move.to === 'off') {
        nextBornOff[color] += 1;
    } else {
        const target = nextBoard[move.to];
        if (target.color === opponent && target.count === 1) {
            nextBar[opponent] += 1;
            nextBoard[move.to] = { color, count: 1 };
        } else if (target.color === color) {
            nextBoard[move.to] = { ...target, count: target.count + 1 };
        } else {
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
        if (!remainingDice.length) return 0;
        const key = JSON.stringify([
            position.board.map(point => `${point.color === 'white' ? 'w' : point.color === 'black' ? 'b' : '-'}${point.count}`).join(''),
            position.bar.white, position.bar.black,
            position.bornOff.white, position.bornOff.black,
            color, [...remainingDice].sort((left, right) => left - right)
        ]);
        if (memo.has(key)) return memo.get(key);

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
                } else if (moveCount === bestCount) {
                    legalMoves.push(move);
                }
            }
        }
    }

    if (bestCount === 1 && dice.length === 2 && dice[0] !== dice[1]) {
        const highDieMoves = legalMoves.filter(move => move.die === Math.max(...dice));
        if (highDieMoves.length) legalMoves = highDieMoves;
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
    if (move.to === 'off') score += 120;
    if (move.isHit) score += 80;
    if (typeof move.to === 'number') {
        const dest = board[move.to];
        if (dest.color === color && dest.count === 1) score += 45;
    }
    if (typeof move.from === 'number' && board[move.from].count === 1) score += 25;
    if (typeof move.to === 'number') score += 5;
    return score;
};

const BackgammonPoint = React.memo(({ index, isTop, count, color, isTarget, isSelected, onPointClick }) => {
    const pt = { count, color };
        const isEven = index % 2 === 0;

        const triBg = isEven
            ? 'from-amber-900/60 via-amber-950/70 to-slate-950/80 border-amber-700/30'
            : 'from-amber-600/40 via-yellow-700/40 to-slate-900/80 border-amber-400/20';

        return (
            <div
                key={index}
                data-bg-location={`point-${index}`}
                role="button"
                tabIndex={0}
                aria-label={`خانه ${index + 1}، ${pt.count} مهره${isTarget ? '، مقصد مجاز' : ''}`}
                onClick={() => onPointClick(index)}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onPointClick(index); } }}
                className={`gq-bg-point ${isTop ? 'gq-bg-point--top' : 'gq-bg-point--bottom'} ${isTarget ? 'gq-bg-point--target' : ''} ${isSelected ? 'gq-bg-point--selected' : ''} relative flex-1 flex flex-col items-center justify-between cursor-pointer transition-all duration-200 select-none ${
                    isTop ? 'flex-col' : 'flex-col-reverse'
                } ${isTarget ? 'bg-emerald-500/20 ring-2 ring-emerald-400/80' : ''} ${
                    isSelected ? 'ring-2 ring-amber-400 bg-amber-500/25' : ''
                }`}
            >
                <div
                    className={`absolute inset-x-0 ${isTop ? 'top-0' : 'bottom-0'} h-full bg-gradient-to-b ${triBg} border-x pointer-events-none opacity-85`}
                    style={{
                        clipPath: isTop
                            ? 'polygon(0% 0%, 100% 0%, 50% 100%)'
                            : 'polygon(50% 0%, 100% 100%, 0% 100%)'
                    }}
                />

                <span className={`gq-bg-point-number relative z-10 text-[9px] font-black font-mono px-1 rounded ${
                    isTop ? 'mt-1' : 'mb-1'
                } ${isTarget ? 'text-emerald-300 font-black' : 'text-slate-400/80'}`}>
                    {index + 1}
                </span>

                <div className={`gq-bg-stack relative z-20 flex flex-col items-center gap-0.5 w-full py-1 ${
                    isTop ? 'justify-start' : 'justify-end'
                }`}>
                    {Array.from({ length: Math.min(pt.count, 5) }).map((_, cIdx) => (
                        <div
                            key={cIdx}
                            data-bg-checker={pt.color}
                            data-bg-aggregate={cIdx === 4 && pt.count > 5 ? 'true' : undefined}
                            className={`gq-bg-checker gq-bg-checker--${pt.color} w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center font-black text-xs shadow-lg transform transition-transform hover:scale-110 ${
                                pt.color === 'white'
                                    ? 'bg-gradient-to-br from-amber-100 via-amber-200 to-yellow-500 border-white text-slate-900 shadow-amber-950/40'
                                    : 'bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 border-indigo-400/80 text-white shadow-black/80'
                            }`}
                        >
                            {cIdx === 4 && pt.count > 5 ? (
                                <span className="text-[11px] font-black">{pt.count}</span>
                            ) : (
                                <span className="opacity-40 text-[10px]">●</span>
                            )}
                        </div>
                    ))}
                </div>

                {isTarget && (
                    <div className="gq-bg-target-marker relative z-30 mb-2 flex items-center justify-center" aria-hidden="true">
                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping absolute" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 relative border border-white" />
                    </div>
                )}
            </div>
        );
});

const BackgammonTurnClock = ({ turn, playerWhiteName, playerBlackName, paused, resetKey, onTimeout }) => {
    const [turnTimeLeft, setTurnTimeLeft] = useState(40);
    const timeoutRef = useRef(onTimeout);
    timeoutRef.current = onTimeout;

    useEffect(() => {
        setTurnTimeLeft(40);
        if (paused) return;
        let deadline = Date.now() + 40000;
        const interval = setInterval(() => {
            const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
            if (seconds === 0) {
                deadline = Date.now() + 40000;
                setTurnTimeLeft(40);
                timeoutRef.current();
            } else {
                setTurnTimeLeft(seconds);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [turn, paused, resetKey]);

    return (
        <div className={`gq-bg-turn-label ${turnTimeLeft <= 10 ? 'gq-bg-turn-label--urgent' : ''} flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900/90 border border-slate-700/80`}>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-300">نوبت:</span>
            <b className={`text-xs font-black ${turn === 'white' ? 'text-amber-300' : 'text-indigo-300'}`}>
                {turn === 'white' ? playerWhiteName : playerBlackName}
            </b>
            <span className="font-mono text-xs font-black text-amber-400 mr-2 border-r border-slate-700 pr-2">
                ⏱ {turnTimeLeft}s
            </span>
        </div>
    );
};

const BackgammonDicePair = ({ isRolling, dice, renderCustomDice }) => {
    const [rollValues, setRollValues] = useState([3, 5]);

    useEffect(() => {
        if (!isRolling) return;
        let ticks = 0;
        const interval = setInterval(() => {
            setRollValues([
                Math.floor(Math.random() * 6) + 1,
                Math.floor(Math.random() * 6) + 1
            ]);
            ticks++;
            if (ticks >= 9) clearInterval(interval);
        }, 65);
        return () => clearInterval(interval);
    }, [isRolling]);

    const displayDice = isRolling ? rollValues : (dice || [3, 4]);

    return (
        <div className="flex items-center gap-1 sm:gap-4">
            {[0, 1].map(index => (
                <div
                    key={index}
                    className={`gq-bg-die w-7 h-7 sm:w-12 sm:h-12 shrink-0 transition-transform ${
                        isRolling ? `bg-dice-tumbling-${index + 1}` : 'hover:scale-110'
                    }`}
                >
                    {typeof renderCustomDice === 'function' ? (
                        renderCustomDice(displayDice[index], 'wood')
                    ) : (
                        <div className="w-full h-full rounded-2xl bg-amber-200 border-2 border-amber-700 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg">
                            {displayDice[index]}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

// ============================================================================
// کامپوننت اصلی تخته نرد
// ============================================================================
const BackgammonGame = ({
    currentUser,
    matchType = 'online',
    onExit,
    onGameFinished,
    matchId,
    matchParticipants,
    onOpenProfile,
    setIsInGame,
    onUserUpdated,
    onNavigateToGames
}) => {
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
        if (!isExpanded) return;
        const previousOverflow = document.body.style.overflow;
        const handleEscape = event => {
            if (event.key === 'Escape') setIsExpanded(false);
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
        if (!boardElement || !layer || document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const location = (position, owner) => boardElement.querySelector(`[data-bg-location="${typeof position === 'number' ? `point-${position}` : `${position}-${owner}`}"]`);
        const checker = element => element?.querySelector('[data-bg-checker]:last-child') || element;
        const source = checker(location(move.from, color));
        if (!source) return;
        const sourceRect = source.getBoundingClientRect();
        const capturedRect = isHit ? checker(location(move.to, color))?.getBoundingClientRect() : null;
        const opponent = color === 'white' ? 'black' : 'white';
        const frame = requestAnimationFrame(() => {
            motionFramesRef.current.delete(frame);
            if (!layer.isConnected || typeof layer.animate !== 'function') return;
            const destination = checker(location(move.to, color));
            const hitTarget = isHit ? location('bar', opponent) : null;
            const hitChecker = hitTarget ? checker(hitTarget) : null;
            if (!destination) return;
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
                impact.addEventListener('animationend', event => { if (event.target === impact) clearImpact(); });
            };

            fly(sourceRect, destination, destinationRect, color, 0, move.to === 'off');
            if (capturedRect && hitRect && hitChecker) fly(capturedRect, hitChecker, hitRect, opponent, 260, false);
            if (motionCleanupRef.current.size > 24) [...motionCleanupRef.current].slice(0, 4).forEach(cleanup => cleanup());
        });
        motionFramesRef.current.add(frame);
    };

    // هماهنگی با وضعیت درون بازی
    useEffect(() => {
        if (setIsInGame) setIsInGame(!winnerResult && !showIntro);
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
        if (matchType !== 'online' || !currentMatchId) return;
        const msg = sendMessage(currentUser.username, `__ACTION__${JSON.stringify(actionData)}`, peerName, currentMatchId);
        if (msg) processedMsgIds.current.add(msg.id);
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
        if (!fromRemote) handlePassTurn();
        return false;
    };

    // اعمال یک حرکت مشخص روی تخته
    const applyMove = (move, playerColor) => {
        const allowedMoves = getAllLegalMoves(boardRef.current, barRef.current, bornOffRef.current, playerColor, movesLeftRef.current);
        if (!allowedMoves.some(candidate => candidate.from === move.from && candidate.to === move.to && candidate.die === move.die)) return false;

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
        } else if (typeof move.from === 'number') {
            nextBoard[move.from].count -= 1;
            if (nextBoard[move.from].count <= 0) {
                nextBoard[move.from].color = null;
                nextBoard[move.from].count = 0;
            }
        }

        // ۲. انتقال به مقصد
        if (move.to === 'off') {
            nextBornOff[playerColor] += 1;
            try { playSound('coin', currentUser.settings?.sound); } catch (e) {}
        } else if (typeof move.to === 'number') {
            const dest = nextBoard[move.to];
            if (dest.color === oppColor && dest.count === 1) {
                nextBar[oppColor] += 1;
                dest.color = playerColor;
                dest.count = 1;
                try { playSound('capture', currentUser.settings?.sound); } catch (e) {}
            } else {
                dest.color = playerColor;
                dest.count += 1;
                try { playSound('move', currentUser.settings?.sound); } catch (e) {}
            }
        }

        // ۳. حذف تاس استفاده شده
        const nextMovesLeft = [...movesLeftRef.current];
        const usedIdx = nextMovesLeft.indexOf(move.die);
        if (usedIdx >= 0) nextMovesLeft.splice(usedIdx, 1);

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
        } else {
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
        if (isRolling || movesLeft.length > 0 || !!winnerResult || pendingDouble) return;
        if (matchType === 'bot' && turn !== 'white') return;
        if (matchType === 'online' && turn !== myColor) return;

        setIsRolling(true);
        isRollingRef.current = true;
        try { playSound('dice', currentUser.settings?.sound); } catch (e) {}

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
                    if (matchType === 'online') sendOnlineAction({ type: 'ROLL', opening: true, openingTie: true, dice: rolled });
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
                try { playSound('tick', currentUser.settings?.sound); } catch (e) {}

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
        if (winnerRef.current) return;
        const loserColor = winnerColor === 'white' ? 'black' : 'white';
        let winType = 'simple';
        let multiplier = 1;

        if (reason === 'خروج حریف') {
            winType = 'simple';
            multiplier = 1;
        } else if (finalBornOff[loserColor] === 0) {
            const hasOnBar = finalBar[loserColor] > 0;
            let hasInWinnerHome = false;

            if (winnerColor === 'white') {
                for (let i = 0; i <= 5; i++) {
                    if (finalBoard[i].color === 'black' && finalBoard[i].count > 0) {
                        hasInWinnerHome = true;
                        break;
                    }
                }
            } else {
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
            } else {
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
        } catch (e) {}

        if (onGameFinished) {
            onGameFinished(isMeWinner, 'backgammon', matchType === 'online');
        }
    };

    // کنترل هوش مصنوعی در بازی با ربات
    useEffect(() => {
        if (matchType !== 'bot' || turn !== 'black' || !!winnerResult || showIntro) return;
        if (isBotMovingRef.current) return;

        // گام ۱: پرتاب تاس ربات با شبیه‌سازی انیمیشن
        if (movesLeft.length === 0 && !isRolling) {
            isBotMovingRef.current = true;
            const timer = setTimeout(() => {
                setIsRolling(true);
                try { playSound('dice', currentUser.settings?.sound); } catch (e) {}

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
        if (matchType !== 'online' || !currentMatchId || !!winnerResult) return;

        let lastMessageSnapshot;
        const handleSync = () => {
            const snapshot = localStorage.getItem(MESSAGES_KEY);
            if (snapshot === lastMessageSnapshot) return;
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
            const opponentMsgs = msgs.filter(m =>
                m.senderUsername?.toLowerCase() !== currentUser.username.toLowerCase() &&
                !processedMsgIds.current.has(m.id)
            ).sort((left, right) => new Date(left.createdAt || 0) - new Date(right.createdAt || 0));

            for (let msg of opponentMsgs) {
                if (!msg.text.startsWith('__ACTION__')) continue;

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
                        try { playSound('dice', currentUser.settings?.sound); } catch (e) {}
                        setTimeout(() => {
                            setIsRolling(false);
                            isRollingRef.current = false;
                            try { playSound('tick', currentUser.settings?.sound); } catch (e) {}
                        }, 500);
                    } else if (action.type === 'MOVE') {
                        if (isRollingRef.current) break;
                        processedMsgIds.current.add(msg.id);
                        applyMove(action.move, turnRef.current);
                    } else if (action.type === 'END_TURN') {
                        processedMsgIds.current.add(msg.id);
                        setDice(null);
                        setMovesLeft([]);
                        movesLeftRef.current = [];
                        turnRef.current = action.nextTurn;
                        setTurn(action.nextTurn);
                        setSelectedFrom(null);
                        setTurnClockReset(reset => reset + 1);
                    } else if (action.type === 'DOUBLE_OFFER') {
                        processedMsgIds.current.add(msg.id);
                        setPendingDouble({ from: action.from, value: action.value });
                    } else if (action.type === 'DOUBLE_ACCEPT') {
                        processedMsgIds.current.add(msg.id);
                        setCubeValue(action.value);
                        setCubeOwner(action.owner);
                        setPendingDouble(null);
                    } else if (action.type === 'DOUBLE_DROP') {
                        processedMsgIds.current.add(msg.id);
                        setPendingDouble(null);
                        handleVictory(action.winner, barRef.current, boardRef.current, bornOffRef.current, 'رد پیشنهاد دوبرابر');
                    } else if (action.type === 'TIMEOUT') {
                        processedMsgIds.current.add(msg.id);
                        if (handleTurnTimeout(action.player, true)) break;
                    }
                } catch (e) {}
            }
            if (!isRollingRef.current) lastMessageSnapshot = snapshot;
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
        if (showIntro || !!winnerResult || isRolling) return;
        if (matchType === 'bot' && turn !== 'white') return;
        if (matchType === 'online' && turn !== myColor) return;
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
                try { playSound('tick', currentUser.settings?.sound); } catch (e) {}
            } else {
                showToast({ id: 'bg-no-checker-moves', type: 'info', text: 'این مهره با تاس‌های فعلی حرکتی ندارد.', duration: 2000 });
            }
        } else {
            setSelectedFrom(null);
        }
    };

    // کلیک روی پیشخوان (Bar)
    const handleBarClick = (barColor) => {
        if (showIntro || !!winnerResult || isRolling || (matchType === 'bot' && turn !== 'white') || (matchType === 'online' && turn !== myColor)) return;
        if (barColor !== myColor || bar[myColor] <= 0) return;
        if (!getAllLegalMoves(board, bar, bornOff, myColor, movesLeft).some(move => move.from === 'bar')) return;
        setSelectedFrom('bar');
        try { playSound('tick', currentUser.settings?.sound); } catch (e) {}
    };

    // کلیک روی سینی برداشت مهره (Bear Off Tray)
    const handleBearOffClick = () => {
        if (showIntro || !!winnerResult || isRolling || pendingDouble || selectedFrom === null) return;
        if ((matchType === 'bot' && turn !== 'white') || (matchType === 'online' && turn !== myColor)) return;
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
        if (showIntro || winnerResult || pendingDouble || isOpeningRoll || dice || movesLeft.length || turn !== myColor) return;
        if (cubeOwner && cubeOwner !== myColor) return;
        const offer = { from: myColor, value: cubeValue };
        setPendingDouble(offer);
        if (matchType === 'online') sendOnlineAction({ type: 'DOUBLE_OFFER', from: myColor, value: cubeValue });
    };

    const acceptDouble = () => {
        if (!pendingDouble || pendingDouble.from === myColor) return;
        const nextValue = cubeValue * 2;
        setCubeValue(nextValue);
        setCubeOwner(myColor);
        setPendingDouble(null);
        if (matchType === 'online') sendOnlineAction({ type: 'DOUBLE_ACCEPT', value: nextValue, owner: myColor });
    };

    const declineDouble = () => {
        if (!pendingDouble || pendingDouble.from === myColor) return;
        const winnerColor = pendingDouble.from;
        setPendingDouble(null);
        if (matchType === 'online') sendOnlineAction({ type: 'DOUBLE_DROP', winner: winnerColor });
        handleVictory(winnerColor, barRef.current, boardRef.current, bornOffRef.current, 'رد پیشنهاد دوبرابر');
    };

    useEffect(() => {
        if (matchType !== 'bot' || !pendingDouble || pendingDouble.from !== 'white') return;
        const timer = setTimeout(acceptDouble, 500);
        return () => clearTimeout(timer);
    }, [pendingDouble, matchType]);

    // مقصدهای مجاز برای مبدأ فعلی جهت هایلایت بصری
    const activeTargets = useMemo(() => {
        if (selectedFrom === null || movesLeft.length === 0) return [];
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
            preview: <div className="flex gap-1.5"><span className="w-5 h-5 rounded-full bg-amber-100 border-2 border-amber-400 shadow-md" /><span className="w-5 h-5 rounded-full bg-amber-100 border-2 border-amber-400 shadow-md" /></div>
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
            preview: <div className="flex gap-1.5"><span className="w-5 h-5 rounded-full bg-slate-900 border-2 border-indigo-400 shadow-md" /><span className="w-5 h-5 rounded-full bg-slate-900 border-2 border-indigo-400 shadow-md" /></div>
        }
    ], [playerWhiteName, playerBlackName, playerWhiteAccount, playerBlackAccount, currentUser.username, matchType]);

    // رندر یک مثلث خانه تخته
    const pointClickRef = useRef(handlePointClick);
    pointClickRef.current = handlePointClick;
    const onPointClick = useCallback(index => pointClickRef.current(index), []);

    const renderPointTriangle = (index, isTop) => (
        <BackgammonPoint
            key={index}
            index={index}
            isTop={isTop}
            count={board[index].count}
            color={board[index].color}
            isTarget={activeTargets.some(move => move.to === index)}
            isSelected={selectedFrom === index}
            onPointClick={onPointClick}
        />
    );
    return (
        <div className={`gq-backgammon-game ${isExpanded ? 'gq-bg-expanded' : ''} w-full max-w-6xl mx-auto flex flex-col gap-4 p-2 sm:p-4 text-slate-100 select-none animate-in fade-in`} dir="rtl">
            <style>{`
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
            `}</style>

            {/* انیمیشن شروع مسابقه (VS Intro) */}
            {showIntro && (
                <VsIntro
                    title="تخته نرد کلاسیک"
                    subtitle="رقابت هوش، احتمالات و شانس طلایی"
                    players={vsPlayers}
                    onDone={() => setShowIntro(false)}
                />
            )}

            <div className="gq-bg-toolbar">
                <div><span className="gq-bg-toolbar-title">تخته‌نرد</span><span className="gq-bg-toolbar-hint">{isOpeningRoll ? 'تاس آغازین، تعیین اولین بازیکن' : 'مهره‌ات را انتخاب کن و به مقصد روشن ببر'}</span></div>
                <button type="button" onClick={() => setIsExpanded(expanded => !expanded)} aria-pressed={isExpanded} className="gq-bg-expand-button">
                    <span aria-hidden="true">{isExpanded ? '↙' : '⛶'}</span> {isExpanded ? 'بستن نمای بزرگ' : 'نمای بزرگ'}
                </button>
            </div>

            {/* نوار بالایی: وضعیت نوبت، ساعت، امتیاز و آواتارهای هدف واکنش */}
            <div className="gq-backgammon-header glass-panel p-3 sm:p-4 rounded-3xl flex flex-wrap items-center justify-between gap-3 sm:gap-4 border border-amber-500/30 bg-slate-950/80 shadow-2xl">
                {/* اطلاعات دو بازیکن (با شناسه data-gq-player برای برخورد دقیق تخم‌مرغ و گوجه) */}
                <div className="gq-bg-player-row flex items-center gap-2 sm:gap-6">
                    <div className={`gq-bg-player-card ${turn === 'white' ? 'gq-bg-player-card--active' : ''} flex items-center gap-3 p-2 rounded-2xl transition-all ${
                        turn === 'white' ? 'bg-amber-500/20 ring-2 ring-amber-400 shadow-lg shadow-amber-500/20' : 'opacity-70'
                    }`}>
                        <div
                            data-gq-player={playerWhiteName}
                            className="relative w-11 h-11 rounded-xl bg-amber-100 border-2 border-white flex items-center justify-center font-black text-slate-900 text-lg shadow-md shrink-0"
                        >
                            <PlayerAvatar user={playerWhiteAccount} className="w-full h-full rounded-[inherit]" />
                        </div>
                        <div>
                            <div className="text-xs font-black text-amber-200">{playerWhiteName} (سفید)</div>
                            <div className="text-[11px] text-slate-400 font-bold">خورده شده: {bornOff.white} / ۱۵</div>
                            {timeoutWarnings.white > 0 && <div className="text-[10px] font-black text-rose-300">اخطار زمان: {timeoutWarnings.white}/۳</div>}
                        </div>
                    </div>

                    <div className="text-slate-600 font-black text-lg">VS</div>

                    <div className={`gq-bg-player-card ${turn === 'black' ? 'gq-bg-player-card--active' : ''} flex items-center gap-3 p-2 rounded-2xl transition-all ${
                        turn === 'black' ? 'bg-indigo-500/20 ring-2 ring-indigo-400 shadow-lg shadow-indigo-500/20' : 'opacity-70'
                    }`}>
                        <div
                            data-gq-player={playerBlackName}
                            className="relative w-11 h-11 rounded-xl bg-slate-900 border-2 border-indigo-400 flex items-center justify-center font-black text-white text-lg shadow-md shrink-0"
                        >
                            {matchType === 'bot' ? (
                                <span className="text-2xl">🤖</span>
                            ) : (
                                <PlayerAvatar user={playerBlackAccount} className="w-full h-full rounded-[inherit]" />
                            )}
                        </div>
                        <div>
                            <div className="text-xs font-black text-indigo-200">{playerBlackName} (سیاه)</div>
                            <div className="text-[11px] text-slate-400 font-bold">خورده شده: {bornOff.black} / ۱۵</div>
                            {timeoutWarnings.black > 0 && <div className="text-[10px] font-black text-rose-300">اخطار زمان: {timeoutWarnings.black}/۳</div>}
                        </div>
                    </div>
                </div>

                {/* تایمر نوبت و دکمه خروج */}
                <div className="gq-bg-header-actions flex items-center gap-4">
                    <BackgammonTurnClock
                        turn={turn}
                        playerWhiteName={playerWhiteName}
                        playerBlackName={playerBlackName}
                        paused={!!winnerResult || showIntro}
                        resetKey={turnClockReset}
                        onTimeout={() => {
                            if ((matchType === 'bot' && turnRef.current === 'white') ||
                                (matchType === 'online' && turnRef.current === myColor)) {
                                handleTurnTimeout(turnRef.current, false);
                            }
                        }}
                    />

                    {((matchType === 'online' && turn === myColor) || matchType === 'bot') && !pendingDouble && !isOpeningRoll && !dice && !movesLeft.length && (!cubeOwner || cubeOwner === myColor) && (
                        <button onClick={offerDouble} className="px-3 py-2 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 border border-violet-400/40 text-xs font-black transition-all">
                            دوبرابر ×{cubeValue * 2}
                        </button>
                    )}

                    <button
                        onClick={() => setShowExitConfirm(true)}
                        className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all"
                    >
                        خروج از بازی
                    </button>
                </div>
            </div>

            {pendingDouble && (
                <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-violet-400/40 bg-violet-950/70 p-3 text-violet-100 shadow-lg animate-in fade-in">
                    <span className="text-sm font-black">{pendingDouble.from === myColor ? 'در انتظار پاسخ حریف به دوبرابر' : 'حریف پیشنهاد دوبرابر داده است'}</span>
                    {pendingDouble.from !== myColor && <>
                        <button onClick={acceptDouble} className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-slate-950 transition hover:bg-emerald-400">قبول ×{cubeValue * 2}</button>
                        <button onClick={declineDouble} className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-black text-white transition hover:bg-rose-400">رد و واگذاری بازی</button>
                    </>}
                </div>
            )}

            {/* صفحه چوبی شگفت‌انگیز تخته نرد */}
            <div ref={boardElementRef} className="gq-backgammon-board relative min-w-0 rounded-2xl sm:rounded-[2.5rem] p-1.5 sm:p-6 border-2 sm:border-4 border-amber-800/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] bg-gradient-to-br from-amber-950 via-slate-950 to-amber-950 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-900/30 via-slate-950/80 to-slate-950 pointer-events-none" />
                <div className="absolute inset-2 border-2 border-amber-600/30 rounded-[2.2rem] pointer-events-none" />

                <div className="gq-bg-board-layout relative z-10 flex min-w-0 gap-1 sm:gap-3">
                    {/* سینی برداشت مهره سفید */}
                    <div
                        data-bg-location="off-white"
                        onClick={() => { if (myColor === 'white') handleBearOffClick(); }}
                        className={`gq-bg-tray gq-bg-tray--white w-8 sm:w-16 rounded-xl sm:rounded-2xl border-2 flex flex-col items-center justify-between p-1 sm:p-2 transition-all cursor-pointer ${
                            myColor === 'white' && activeTargets.some(m => m.to === 'off')
                                ? 'border-emerald-400 bg-emerald-500/20 animate-pulse ring-2 ring-emerald-300'
                                : 'border-amber-700/40 bg-slate-900/80'
                        }`}
                        title="سینی جمع‌آوری مهره‌ها"
                    >
                        <div className="gq-bg-tray-label hidden sm:block text-[10px] font-black text-amber-300 text-center">خانهٔ سفید</div>
                        <div className="gq-bg-off-stack flex flex-col gap-1 items-center">
                            {Array.from({ length: Math.min(bornOff.white, 8) }).map((_, i) => (
                                <div key={i} data-bg-checker="white" data-bg-aggregate={bornOff.white > 8 ? 'true' : undefined} className="gq-bg-off-checker w-8 h-2 rounded bg-amber-100 border border-amber-300 shadow-sm" />
                            ))}
                        </div>
                        <div className="text-xs font-black text-amber-200">{bornOff.white} / ۱۵</div>
                    </div>

                    {/* صفحه اصلی ۲۴ خانه‌ای */}
                            <div className="gq-bg-main flex min-w-0 flex-1 flex-col gap-1 sm:gap-4">
                        {/* ردیف بالا: خانه‌های ۱۲ تا ۲۳ */}
                        <div className="gq-bg-row flex min-w-0 gap-1 sm:gap-2">
                            <div className="flex min-w-0 flex-1 rounded-xl sm:rounded-2xl overflow-hidden border border-amber-700/40 bg-slate-950/60 p-0.5 sm:p-1">
                                {[12, 13, 14, 15, 16, 17].map(idx => renderPointTriangle(idx, true))}
                            </div>

                            <div
                                data-bg-location="bar-black"
                                onClick={() => handleBarClick('black')}
                                className={`gq-bg-bar ${selectedFrom === 'bar' && myColor === 'black' ? 'gq-bg-bar--selected' : ''} w-7 sm:w-16 rounded-xl sm:rounded-2xl border-2 flex flex-col items-center justify-center p-0.5 sm:p-1 transition-all ${
                                    bar.black > 0 ? 'bg-indigo-950/80 border-indigo-500/60' : 'bg-amber-950/60 border-amber-800/40'
                                }`}
                                title="پیشخوان مهره‌های سیاه"
                            >
                                <span className="text-[9px] font-bold text-slate-400 mb-1">بار سیاه</span>
                                {bar.black > 0 ? (
                                    <div data-bg-checker="black" data-bg-aggregate="true" className="gq-bg-bar-checker gq-bg-checker--black w-7 h-7 rounded-full bg-slate-900 border-2 border-indigo-400 flex items-center justify-center font-black text-xs text-white shadow-lg">
                                        {bar.black}
                                    </div>
                                ) : (
                                    <span className="text-slate-600 text-xs">-</span>
                                )}
                            </div>

                            <div className="flex min-w-0 flex-1 rounded-xl sm:rounded-2xl overflow-hidden border border-amber-700/40 bg-slate-950/60 p-0.5 sm:p-1">
                                {[18, 19, 20, 21, 22, 23].map(idx => renderPointTriangle(idx, true))}
                            </div>
                        </div>

                        {/* خط تقسیم میانی: ناحیه تاس‌ها و دکمه پرتاب */}
                        <div className="gq-bg-dice-row min-h-12 sm:h-20 rounded-xl sm:rounded-2xl border border-amber-700/30 bg-amber-950/30 flex items-center justify-between gap-1 px-2 sm:px-6 shadow-inner">
                            <div className="flex items-center gap-2 text-xs font-black text-amber-300">
                                <span>🎲</span>
                                <span>ناحیه تاس‌های تخته نرد</span>
                            </div>

                            {/* نمایش تاس‌ها با انیمیشن روان چرخش */}
                            <div className="gq-bg-dice-controls flex items-center gap-1 sm:gap-5">
                                {(dice || isRolling) && (
                                    <BackgammonDicePair isRolling={isRolling} dice={dice} renderCustomDice={renderCustomDice} />
                                )}

                                {/* حرکات موجود */}
                                {movesLeft.length > 0 && !isRolling && (
                                    <div className="gq-bg-moves-left flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-amber-400/40 text-xs font-bold text-amber-300 shadow-md">
                                        <span>باقی‌مانده</span>
                                        {movesLeft.map((value, dieIndex) => <b key={`${value}-${dieIndex}`} className="gq-bg-die-chip">{value}</b>)}
                                    </div>
                                )}

                                {/* دکمه پرتاب تاس */}
                                {((matchType === 'bot' && turn === 'white') ||
                                  (matchType === 'online' && turn === myColor)) && movesLeft.length === 0 && (
                                    <button
                                        onClick={rollDice}
                                        disabled={isRolling}
                                        className="gq-bg-roll-button px-2 sm:px-6 py-2 sm:py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-[10px] sm:text-sm shadow-xl active:scale-95 transition-all"
                                    >
                                        {isRolling ? 'در حال چرخش تاس‌ها…' : '🎲 پرتاب تاس!'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ردیف پایین: خانه‌های ۱۱ تا ۰ */}
                        <div className="gq-bg-row flex min-w-0 gap-1 sm:gap-2">
                            <div className="flex min-w-0 flex-1 rounded-xl sm:rounded-2xl overflow-hidden border border-amber-700/40 bg-slate-950/60 p-0.5 sm:p-1">
                                {[11, 10, 9, 8, 7, 6].map(idx => renderPointTriangle(idx, false))}
                            </div>

                            <div
                                data-bg-location="bar-white"
                                onClick={() => handleBarClick('white')}
                                className={`gq-bg-bar ${selectedFrom === 'bar' && myColor === 'white' ? 'gq-bg-bar--selected' : ''} w-7 sm:w-16 rounded-xl sm:rounded-2xl border-2 flex flex-col items-center justify-center p-0.5 sm:p-1 transition-all ${
                                    bar.white > 0 ? 'bg-amber-950/80 border-amber-400/80 cursor-pointer ring-2 ring-amber-400' : 'bg-amber-950/60 border-amber-800/40'
                                }`}
                                title="پیشخوان مهره‌های سفید"
                            >
                                <span className="text-[9px] font-bold text-slate-400 mb-1">بار سفید</span>
                                {bar.white > 0 ? (
                                    <div data-bg-checker="white" data-bg-aggregate="true" className="gq-bg-bar-checker gq-bg-checker--white w-7 h-7 rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center font-black text-xs text-slate-950 shadow-lg">
                                        {bar.white}
                                    </div>
                                ) : (
                                    <span className="text-slate-600 text-xs">-</span>
                                )}
                            </div>

                            <div className="flex min-w-0 flex-1 rounded-xl sm:rounded-2xl overflow-hidden border border-amber-700/40 bg-slate-950/60 p-0.5 sm:p-1">
                                {[5, 4, 3, 2, 1, 0].map(idx => renderPointTriangle(idx, false))}
                            </div>
                        </div>
                    </div>

                    {/* سینی برداشت مهره سیاه */}
                    <div
                        data-bg-location="off-black"
                        onClick={() => { if (myColor === 'black') handleBearOffClick(); }}
                        className={`gq-bg-tray gq-bg-tray--black w-8 sm:w-16 rounded-xl sm:rounded-2xl border-2 bg-slate-900/80 flex flex-col items-center justify-between p-1 sm:p-2 ${myColor === 'black' && activeTargets.some(move => move.to === 'off') ? 'border-emerald-400 ring-2 ring-emerald-300 cursor-pointer' : 'border-indigo-700/40'}`}
                        title="سینی جمع‌آوری مهره‌های سیاه"
                    >
                        <div className="gq-bg-tray-label hidden sm:block text-[10px] font-black text-indigo-300 text-center">خانهٔ سیاه</div>
                        <div className="gq-bg-off-stack flex flex-col gap-1 items-center">
                            {Array.from({ length: Math.min(bornOff.black, 8) }).map((_, i) => (
                                <div key={i} data-bg-checker="black" data-bg-aggregate={bornOff.black > 8 ? 'true' : undefined} className="gq-bg-off-checker w-8 h-2 rounded bg-slate-900 border border-indigo-400 shadow-sm" />
                            ))}
                        </div>
                        <div className="text-xs font-black text-indigo-200">{bornOff.black} / ۱۵</div>
                    </div>
                </div>
                <div ref={motionLayerRef} className="gq-bg-motion-layer" aria-hidden="true" />
            </div>

            <div className="gq-bg-move-status" role="status" aria-live="polite">
                <span key={turn} className="gq-bg-turn-announcement">{turn === myColor ? 'نوبت توست' : `نوبت ${turn === 'white' ? playerWhiteName : playerBlackName}`}</span>
                {moveNotice && <span key={moveNotice.id} className={`gq-bg-move-notice gq-bg-move-notice--${moveNotice.color}`}>{moveNotice.text}</span>}
            </div>

            {/* سینی پرتاب واکنش‌ها (تخم‌مرغ، گوجه و...) و چت مسابقه */}
            <ReactionTray
                matchId={currentMatchId || `bg-${currentUser.username}`}
                currentUser={currentUser}
                onUserUpdated={onUserUpdated}
                hidden={showIntro}
                targets={[{
                    name: peerName,
                    label: peerName,
                    isBot: matchType === 'bot',
                    hex: myColor === 'white' ? '#6366f1' : '#f59e0b'
                }]}
            />

            {matchType === 'online' && (
                <div className="flex items-center justify-end pt-1">
                    <InGameChatDrawer
                        currentUser={currentUser}
                        recipientUsername={peerName}
                        matchId={currentMatchId}
                    />
                </div>
            )}

            {/* پنجره اعلام پیروزی / مارس / مارس سیاه یا خروج حریف */}
            {winnerResult && (
                <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
                    <div className="relative w-full max-w-md rounded-3xl border-2 border-amber-400/80 bg-gradient-to-b from-slate-900 via-amber-950/40 to-slate-900 p-6 sm:p-8 text-center shadow-2xl shadow-amber-500/30 space-y-5 animate-in zoom-in-95">
                        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center text-4xl shadow-xl shadow-amber-500/40 animate-bounce">
                            🏆
                        </div>

                        <div>
                            <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-400/20 text-amber-300 border border-amber-400/40">
                                {winnerResult.reason === 'خروج حریف' ? '🏃‍♂️ خروج حریف از بازی' :
                                 winnerResult.reason === 'اخطار سوم زمان' ? '⏱️ حذف به‌دلیل سه اخطار زمان' :
                                 winnerResult.type === 'backgammon' ? '🔥 مارس سیاه (۳ برابر)' :
                                 winnerResult.type === 'gammon' ? '⚡ مارس (۲ برابر)' : '✨ پیروزی مسابقه'}
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-black text-white mt-3">
                                {winnerResult.winner === 'white' ? playerWhiteName : playerBlackName} پیروز شد!
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-300 mt-2">
                                {winnerResult.reason === 'خروج حریف'
                                    ? 'حریف از مسابقه خارج شد. پیروزی و پاداش به شما تعلق گرفت!'
                                    : winnerResult.reason === 'اخطار سوم زمان'
                                    ? 'حریف سه بار در زمان نوبتش حرکتی انجام نداد و از بازی حذف شد.'
                                    : winnerResult.type === 'backgammon'
                                    ? 'پیروزی استثنایی با مارس سیاه! حریف مهره‌ای خارج نکرد و در پیشخوان باقی ماند.'
                                    : winnerResult.type === 'gammon'
                                    ? 'پیروزی قاطع با مارس! حریف موفق به خارج کردن حتی یک مهره هم نشد.'
                                    : 'پایان مسابقه با جمع‌آوری تمام ۱۵ مهره.'}
                            </p>
                        </div>

                        {matchType === 'online' && (
                            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-200 flex items-center justify-center gap-2 text-lg font-black">
                                <span>پاداش دریافتی:</span>
                                <span>{winnerResult.reward}</span>
                                <IconCoin className="w-5 h-5 text-amber-400" />
                                <span className="text-xs text-amber-400">کیوجی</span>
                            </div>
                        )}

                        <div className="pt-2 flex gap-3">
                            <button
                                onClick={onExit}
                                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-sm shadow-lg active:scale-95 transition-all"
                            >
                                خروج به هاب بازی‌ها
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* پنجره تایید خروج از بازی */}
            {showExitConfirm && (
                <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900 p-6 text-center space-y-4">
                        <h3 className="text-lg font-black text-white">آیا از بازی خارج می‌شوید؟</h3>
                        <p className="text-xs text-slate-400 leading-6">
                            در صورت خروج در حالت آنلاین، مسابقه واگذار شده و سکه ورودی بازگردانده نخواهد شد.
                        </p>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={confirmExit}
                                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-all"
                            >
                                خروج قطعی
                            </button>
                            <button
                                onClick={() => setShowExitConfirm(false)}
                                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
                            >
                                ادامه بازی
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
