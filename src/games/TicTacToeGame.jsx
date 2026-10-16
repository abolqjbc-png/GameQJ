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
    if (emptyIndices.length === 9) return 4;

    const minimax = (board, depth, isMaximizing) => {
        const result = checkTicTacToeWinner(board);
        if (result) {
            if (result.winner === 'O') return 10 - depth;
            if (result.winner === 'X') return depth - 10;
            if (result.winner === 'draw') return 0;
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
        } else {
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
        if (setIsInGame) setIsInGame(!winnerInfo && !showIntro);
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
        if (winnerInfoRef.current || boardRef.current[index] !== null) return;
        if (matchType === 'bot' && turnRef.current === 'O') return;
        if (matchType === 'online' && turnRef.current !== myMark) return;

        if (showIntro) setShowIntro(false);

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
            if (msg) processedMsgIds.current.add(msg.id);
            window.dispatchEvent(new Event('storage'));
        }

        const winResult = checkTicTacToeWinner(nextBoard);
        if (winResult) {
            setWinnerInfo(winResult);
            winnerInfoRef.current = winResult;
            if (winResult.winner === 'draw') {
                setScores(s => ({ ...s, draw: s.draw + 1 }));
            } else {
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
            if (botTimerRef.current) clearTimeout(botTimerRef.current);
            botTimerRef.current = setTimeout(() => {
                if (winnerInfoRef.current) return;
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
                        if (botWin.winner === 'draw') setScores(s => ({ ...s, draw: s.draw + 1 }));
                        else setScores(s => ({ ...s, O: s.O + 1 }));
                    } else {
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
        if (boardRef.current[index] !== null) return;

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
            } else {
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
        if (showIntro || winnerInfo) return;
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
        if (!winnerInfo || resultRecordedRef.current) return;
        resultRecordedRef.current = true;
        const won = (winnerInfo.winner === myMark);

        if (matchType === 'online') {
            if (won) {
                playSound('coin', currentUser.settings?.sound);
                if (!freeRematchUsed) setHasFreeRematch(true);
            } else {
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
            } else {
                const freshUser = findUser(currentUser.username);
                if (!freshUser || freshUser.coins < ONLINE_ENTRY_FEE) return;
                deductCoins(currentUser.username, ONLINE_ENTRY_FEE);
                if (onUserUpdated) onUserUpdated(findUser(currentUser.username));
            }
        }

        if (newMatchId) setCurrentMatchId(newMatchId);
        if (botTimerRef.current) clearTimeout(botTimerRef.current);
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
        } else {
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
        if (!hasFreeRematch && freshUser.coins < ONLINE_ENTRY_FEE) return;
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
        if (matchType !== 'online' || !currentMatchId) return;

        const handleStorage = (event) => {
            if (event.key && event.key !== MESSAGES_KEY) return;
            const state = stateRef.current;
            if (!state) return;

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
                            } catch (e) {}
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
                    } else if (latest.text.startsWith('__REMATCH_ACCEPTED__') && state.rematchState === 'requested') {
                        const nextId = latest.text.replace('__REMATCH_ACCEPTED__', '');
                        state.startNewGame(nextId);
                        showToast({ id: 'rematch-res', type: 'success', title: 'درخواست قبول شد', text: 'دست جدید آغاز شد!', duration: 3500 });
                        if (onNavigateToGames) onNavigateToGames();
                    } else if (latest.text === '__REMATCH_DECLINED__' && state.rematchState === 'requested') {
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
        if (matchType !== 'online') return;
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
        } else if (rematchState === 'requested') {
            showToast({ id: 'rematch-tt', type: 'waiting', title: 'در انتظار پاسخ حریف', text: `درخواست بازی مجدد ارسال شد...`, duration: 20000, showTimer: true });
        } else {
            hideToast('rematch-tt');
        }
    }, [rematchState]);

    const vsPlayers = [
        { id: 1, name: playerXName, avatar: findUser(playerXName)?.avatar, hex: '#06b6d4', tag: 'علامت (X)', wins: findUser(playerXName)?.stats?.wins },
        { id: 2, name: playerOName || 'هوش مصنوعی', avatar: findUser(playerOName)?.avatar, hex: '#f43f5e', tag: 'علامت (O)', isBot: !playerOName || playerOName.includes('هوش مصنوعی') }
    ];

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-5 sm:gap-7 animate-in fade-in relative px-2 sm:px-0">
            {showIntro && (
                <VsIntro
                    title="دوز کلاسیک نئونی"
                    subtitle={matchType === 'online' ? 'مسابقه زنده آنلاین' : 'تمرین با هوش مصنوعی'}
                    players={vsPlayers}
                    onDone={() => setShowIntro(false)}
                />
            )}

            {/* نوار کنترل بالای صفحه */}
            <div className="w-full glass-panel p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl flex flex-wrap items-center justify-between gap-4 border border-indigo-500/20 shadow-xl">
                <button
                    onClick={() => winnerInfo ? onExit() : setShowExitConfirm(true)}
                    className="px-4 py-2 bg-slate-800 hover:bg-rose-600 hover:border-rose-500 text-white rounded-xl text-xs sm:text-sm font-bold border border-slate-700 flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                >
                    <IconArrowLeft className="w-4 h-4" />
                    <span>{winnerInfo ? 'بازگشت به فهرست' : 'خروج از مسابقه'}</span>
                </button>

                <div className="text-center">
                    <h3 className="text-base sm:text-lg font-black text-white">دوز ۳×۳ ({matchType === 'online' ? 'آنلاین' : 'تک‌نفره با ربات'})</h3>
                    {matchType === 'online' && <span className="text-[11px] font-bold text-amber-300">جایزه برد: ۴۰ کیوجی سکه</span>}
                </div>

                <div className="flex items-center gap-3">
                    <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 flex items-center gap-2 text-xs">
                        <span className="text-slate-400">زمان نوبت:</span>
                        <span className={`font-mono font-black ${turnTimeLeft <= 7 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>{turnTimeLeft}s</span>
                    </div>
                </div>
            </div>

            {/* پلاک‌های نوبت و نام بازیکنان */}
            <div className="w-full max-w-md grid grid-cols-2 gap-3.5">
                <div data-gq-player={playerXName} className={`p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between ${turn === 'X' && !winnerInfo ? 'bg-cyan-500/15 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.35)] scale-[1.02]' : 'bg-slate-900/60 border-slate-800 opacity-80'}`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-400/60 flex items-center justify-center font-black text-cyan-400 text-xl shadow-inner shrink-0">X</div>
                        <div className="min-w-0 text-right">
                            <div className="text-xs font-black text-white truncate">{playerXName}{myMark === 'X' ? ' (شما)' : ''}</div>
                            {findUser(playerXName)?.equipped?.titles && findUser(playerXName)?.equipped?.titles !== 'classic' && typeof renderPlayerTitle === 'function' && (<div className="-mt-0.5 origin-right transform scale-90 text-right">{renderPlayerTitle(findUser(playerXName).equipped.titles)}</div>)}
                            <div className="text-[10px] text-cyan-300 font-bold">{scores.X} برد</div>
                        </div>
                    </div>
                    {turn === 'X' && !winnerInfo && <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0"></span>}
                </div>

                <div data-gq-player={playerOName} className={`p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between ${turn === 'O' && !winnerInfo ? 'bg-rose-500/15 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.35)] scale-[1.02]' : 'bg-slate-900/60 border-slate-800 opacity-80'}`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-rose-950/80 border border-rose-400/60 flex items-center justify-center font-black text-rose-400 text-xl shadow-inner shrink-0">O</div>
                        <div className="min-w-0 text-right">
                            <div className="text-xs font-black text-white truncate">{playerOName}{myMark === 'O' ? ' (شما)' : ''}</div>
                            {findUser(playerOName)?.equipped?.titles && findUser(playerOName)?.equipped?.titles !== 'classic' && typeof renderPlayerTitle === 'function' && (<div className="-mt-0.5 origin-right transform scale-90 text-right">{renderPlayerTitle(findUser(playerOName).equipped.titles)}</div>)}
                            <div className="text-[10px] text-rose-300 font-bold">{scores.O} برد</div>
                        </div>
                    </div>
                    {turn === 'O' && !winnerInfo && <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping shrink-0"></span>}
                </div>
            </div>

            {/* صفحه شبکه بازی دوز ۳×۳ */}
            <div className="relative w-full max-w-[340px] sm:max-w-[420px] aspect-square p-3.5 sm:p-4 rounded-3xl bg-slate-900/90 border-2 border-slate-700/80 shadow-[0_0_60px_rgba(0,0,0,0.65)] flex items-center justify-center">
                <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-2.5 sm:gap-3.5">
                    {board.map((cell, idx) => {
                        const isWinningCell = winnerInfo?.line && winnerInfo.line.includes(idx);
                        return (
                            <button
                                key={idx}
                                disabled={cell !== null || (matchType === 'online' && turn !== myMark) || !!winnerInfo}
                                onClick={() => handleCellClick(idx)}
                                onMouseEnter={() => setHoverIndex(idx)}
                                onMouseLeave={() => setHoverIndex(null)}
                                className={`relative rounded-2xl flex items-center justify-center transition-all duration-200 select-none overflow-hidden ${
                                    isWinningCell
                                        ? 'bg-gradient-to-br from-amber-500/30 to-amber-600/30 border-2 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.6)] scale-[1.04] z-10'
                                        : 'bg-slate-800/80 border border-slate-700 hover:border-indigo-400/60 hover:bg-slate-750'
                                } ${cell === null && !winnerInfo && ((matchType === 'online' && turn === myMark) || matchType === 'bot') ? 'cursor-pointer hover:shadow-lg' : 'cursor-default'}`}
                            >
                                {/* نمایش علامت ضربدر X */}
                                {cell === 'X' && (
                                    <div className="w-3/5 h-3/5 relative flex items-center justify-center animate-in zoom-in-50 duration-300">
                                        <svg viewBox="0 0 24 24" className="w-full h-full stroke-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]" strokeWidth="3.2" strokeLinecap="round">
                                            <line x1="4" y1="4" x2="20" y2="20" />
                                            <line x1="20" y1="4" x2="4" y2="20" />
                                        </svg>
                                    </div>
                                )}

                                {/* نمایش علامت دایره O */}
                                {cell === 'O' && (
                                    <div className="w-3/5 h-3/5 relative flex items-center justify-center animate-in zoom-in-50 duration-300">
                                        <svg viewBox="0 0 24 24" className="w-full h-full stroke-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]" fill="none" strokeWidth="3.2">
                                            <circle cx="12" cy="12" r="8" />
                                        </svg>
                                    </div>
                                )}

                                {/* پیش‌نمایش هاور */}
                                {cell === null && hoverIndex === idx && !winnerInfo && ((matchType === 'online' && turn === myMark) || (matchType === 'bot' && turn === 'X')) && (
                                    <div className="opacity-20 text-3xl font-black text-white">
                                        {turn}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* اعلام برنده یا تساوی */}
                {winnerInfo && (
                    <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-md rounded-3xl p-6 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300 border border-indigo-400/40 shadow-2xl">
                        {winnerInfo.winner === 'draw' ? (
                            <>
                                <div className="text-5xl mb-2">🤝</div>
                                <h3 className="text-2xl sm:text-3xl font-black text-white mb-1">بازی مساوی شد!</h3>
                                <p className="text-xs text-slate-300 mb-5">هر دو بازیکن با مهارت بالا بازی کردند.</p>
                            </>
                        ) : (
                            <>
                                <IconTrophy className="w-16 h-16 text-amber-400 mb-2 animate-bounce-slight" />
                                <h3 className="text-2xl sm:text-3xl font-black text-white mb-1">
                                    {winnerInfo.winner === myMark ? '🎉 شما برنده شدید!' : `بازیکن (${winnerInfo.winner}) پیروز شد!`}
                                </h3>
                                {winnerInfo.winner === myMark && matchType === 'online' && (
                                    <div className="flex items-center gap-2 p-2.5 bg-amber-500/20 border border-amber-400/50 rounded-2xl text-amber-300 font-black text-sm mb-4 animate-pulse">
                                        <IconCoin className="w-5 h-5" />
                                        <span>+ ۴۰ کیوجی پاداش به حسابتان افزوده شد!</span>
                                    </div>
                                )}
                            </>
                        )}

                        <div className="flex flex-col gap-2.5 w-full max-w-xs mt-2">
                            {matchType === 'bot' ? (
                                <button
                                    onClick={() => startNewGame()}
                                    className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-600/30 active:scale-95 transition-all"
                                >
                                    دست بعدی (بازی مجدد)
                                </button>
                            ) : (
                                <button
                                    onClick={requestRematch}
                                    disabled={rematchState !== 'idle'}
                                    className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <IconGamepad className="w-4 h-4" />
                                    <span>{hasFreeRematch ? 'درخواست بازی دوباره (رایگان)' : 'درخواست بازی دوباره (۲۵ کیوجی)'}</span>
                                </button>
                            )}
                            <button
                                onClick={onExit}
                                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors"
                            >
                                بازگشت به فهرست بازی‌ها
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* کشوی گفتگوی متنی درون بازی */}
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
                targets={[{ name: myMark === 'X' ? playerOName : playerXName, label: myMark === 'X' ? playerOName : playerXName, isBot: (myMark === 'X' ? playerOName : playerXName).includes('هوش مصنوعی') }]}
            />

            {/* پنجره تأیید خروج */}
            {showExitConfirm && (
                <div dir="rtl" className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-sm glass-panel rounded-3xl p-6 shadow-2xl text-center border border-rose-500/30">
                        <IconLogout className="w-12 h-12 text-rose-500 mx-auto mb-3" />
                        <h4 className="text-lg font-black text-white mb-2">خروج از مسابقه دوز؟</h4>
                        <p className="text-slate-300 text-xs mb-5 leading-5">در صورت خروج در حین بازی آنلاین، حریف شما برنده اعلام خواهد شد.</p>
                        <div className="flex gap-2.5">
                            <button onClick={() => setShowExitConfirm(false)} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold">انصراف</button>
                            <button onClick={confirmExit} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30">تایید خروج</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};