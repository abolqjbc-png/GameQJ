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
        } else {
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
        if (gameMode !== 'online') return;
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
        } else if (rematchState === 'requested') {
            showToast({ id: 'rematch', type: 'waiting', title: 'درخواست بازی مجدد ارسال شد', text: `در انتظار پاسخ «${peerName}»...`, duration: 20000, showTimer: true });
        } else {
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
    useEffect(() => { if (setIsInGame) setIsInGame(!winner); }, [winner, setIsInGame]);

    const activePlayer = PLAYERS[currentTurn];
    const isMyTurn = currentTurn === myPlayerId;
    
    const logMsg = useCallback((text) => {
        setGameLog(prev => [text, ...prev.slice(0, 35)]);
        setHasNewLog(true);
    }, []);

    const handleExitClick = () => {
        if (winner) onExit();
        else setShowExitConfirm(true);
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
            if (token.status === 'finished' || token.stepCount >= 44) return;

            if (token.status === 'yard') {
                if (roll === 6) {
                    const friendlyOnStart = pTokens.some(t => t.id !== token.id && t.status === 'active' && t.stepCount === 0);
                    if (!friendlyOnStart) valid.push(token.id);
                }
            } else if (token.status === 'active') {
                const nextStep = token.stepCount + roll;
                if (nextStep <= 44) { 
                    if (nextStep < 40) {
                        const targetTrackIdx = (player.startTrackIdx + nextStep) % 40;
                        const friendlyOccupied = pTokens.some(t => t.id !== token.id && t.status === 'active' && t.stepCount === nextStep);
                        
                        let enemyOnSafe = false;
                        for (let otherPid = 0; otherPid < 4; otherPid++) {
                            if (otherPid === pId) continue;
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

                        if (!friendlyOccupied && !enemyOnSafe) valid.push(token.id);
                    } else {
                        const friendlyOccupied = pTokens.some(t => t.id !== token.id && t.status === 'active' && t.stepCount === nextStep && nextStep !== 44);
                        if (!friendlyOccupied) valid.push(token.id);
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
        } else {
            setCurrentTurn(prev => (prev + 1) % 4);
        }
    }, [logMsg, PLAYERS]);
    
    useEffect(() => {
        if (showIntro || winner) return;
        const key = 'gameqj:ludo-clock:' + currentMatchId + ':' + turnSerial;
        deadlineRef.current = (gameMode === 'online' ? gameClockStart(key) : Date.now()) + 40000;
        timeoutHandled.current = false;
        const tick = () => {
            const seconds = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
            setTurnSeconds(seconds);
            if (seconds || moveCommitted.current || timeoutHandled.current) return;
            const pendingMove = gameMode === 'online' && getMessages().some(message => {
                if (message.matchId !== currentMatchId || !message.text.startsWith('__ACTION__')) return false;
                try { const action = JSON.parse(message.text.slice(10)); return action.type === 'MOVE' && action.turnSerial === turnSerial && Date.parse(message.createdAt) <= deadlineRef.current; } catch { return false; }
            });
            if (pendingMove) return;
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
    useEffect(() => { if (winner) turnGeneration.current += 1; }, [winner]);
    const nextTurnRef = useRef(nextTurn);
    useEffect(() => { nextTurnRef.current = nextTurn; }, [nextTurn]);

    const checkCapturesAndFinish = useCallback((newPieces, movingToken, rollValue) => {
        const pId = currentTurnRef.current;
        const player = PLAYERS[pId];

        if (movingToken.status === 'active' && movingToken.stepCount < 40) {
            const myTrackIdx = (player.startTrackIdx + movingToken.stepCount) % 40;

            for (let otherPid = 0; otherPid < 4; otherPid++) {
                if (otherPid === pId) continue;
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
        } else {
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
            sendMessage(currentUser.username, `__ACTION__${JSON.stringify({type: 'ROLL', rollValue})}`, null, currentMatchId);
            window.dispatchEvent(new Event('storage'));
        }

        if (valid.length === 0) {
            logMsg(`حرکتی برای مهره‌های ${PLAYERS[currentTurnRef.current].colorName} ممکن نیست.`);
            const generation = turnGeneration.current;
            moveCommitted.current = true;
            setTimeout(() => { if (generation === turnGeneration.current) nextTurnRef.current(false); }, 1200);
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
            if (generation !== turnGeneration.current) { clearInterval(rollInterval); return; }
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
                setTimeout(() => { if (generation === turnGeneration.current) finishRollRef.current(finalRollValue, true); }, 460);
            }
        }, 85);
    }, [currentUser.settings?.sound]);

    const startPieceMove = useCallback((pieceId, rollValue = diceValue, isSync = false) => {
        if (!isSync && (showIntro || !deadlineRef.current || Date.now() >= deadlineRef.current || moveCommitted.current)) return;
        moveCommitted.current = true;
        const generation = turnGeneration.current;
        setIsAnimatingMove(true);
        setMovablePieceIds([]);

        if (gameMode === 'online' && !isSync) {
            sendMessage(currentUser.username, `__ACTION__${JSON.stringify({type: 'MOVE', pieceId, rollValue, turnSerial})}`, null, currentMatchId);
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
            if (generation !== turnGeneration.current) { clearInterval(interval); return; }
            currentStep += 1;
            setPieces(prev => {
                const stepClone = JSON.parse(JSON.stringify(prev));
                const stepMoving = stepClone[currentTurnRef.current].find(t => t.id === pieceId);
                stepMoving.stepCount = Math.min(currentStep, 44);
                if (currentStep >= 44) stepMoving.status = 'finished';
                return stepClone;
            });
            playSound('move', currentUser.settings?.sound);

            if (currentStep >= targetStep) {
                clearInterval(interval);
                setTimeout(() => {
                    if (generation !== turnGeneration.current) return;
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
        if (gameMode !== 'online' || !currentMatchId) return;

        const handleStorage = (event) => {
            if (event.key && event.key !== MESSAGES_KEY) return;
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
                                if (action.turnSerial < state.turnSerial) processedMsgIds.current.add(nextMsg.id);
                                return;
                            }
                            if (action.type === 'ROLL_SYNC') {
                                state.executeRollAnimation(action.rollValue);
                            } else if (action.type === 'MOVE') {
                                state.startPieceMove(action.pieceId, action.rollValue, true);
                            }
                        } catch(e) {}
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
                    } else if (latestRematchMsg.text.startsWith('__REMATCH_ACCEPTED__') && rematchState === 'requested') {
                        startNewGame(state.currentMatchId + '-R');
                        showToast({ id: 'rematch-result', type: 'success', title: 'درخواست پذیرفته شد', text: `بازی شروع شد!`, duration: 3500 });
                        if (onNavigateToGames) onNavigateToGames();
                    } else if (latestRematchMsg.text === '__REMATCH_DECLINED__' && rematchState === 'requested') {
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
            } else if (rematchTimeLeft === 0) {
                if (rematchState === 'received') declineRematch();
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
            } else if (realPlayers.length === 0) {
                onExit();
            } else if (abandonedPlayers.includes(currentTurn)) {
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

        if (showIntro || !deadlineRef.current || Date.now() >= deadlineRef.current) return;
        if ((!isMyTurn && !(isBotTurn && amIResponsibleForBots)) || hasRolled || isRolling || isAnimatingMove || winner || abandonedPlayers.includes(currentTurn)) return;

        const finalRoll = Math.floor(Math.random() * 6) + 1;
        
        if (gameMode === 'online') {
            sendMessage(currentUser.username, `__ACTION__${JSON.stringify({type: 'ROLL_SYNC', rollValue: finalRoll, turnSerial})}`, null, currentMatchId);
            window.dispatchEvent(new Event('storage'));
        }
        
        executeRollAnimation(finalRoll);
    };

    // هوش مصنوعی نوبت ربات
    useEffect(() => {
        if (showIntro || winner || isAnimatingMove || abandonedPlayers.includes(currentTurn)) return;
        
        const player = PLAYERS[currentTurn];
        if (!player) return;

        const isBotTurn = player.isBot || (gameMode === 'online' && abandonedPlayers.includes(currentTurn));
        const realPlayers = PLAYERS.filter(p => !p.isBot && !abandonedPlayers.includes(p.id));
        const amIResponsibleForBots = gameMode === 'online' ? (realPlayers.length > 0 && realPlayers[0].name === currentUser.username) : true;

        if (isBotTurn && amIResponsibleForBots) {
            if (!hasRolled && !isRolling) {
                const timer = setTimeout(() => rollDice(), 800);
                return () => clearTimeout(timer);
            } else if (hasRolled && movablePieceIds.length > 0) {
                const timer = setTimeout(() => {
                    const roll = diceValue;
                    let bestPieceId = movablePieceIds[0];

                    for (let pid of movablePieceIds) {
                        const token = pieces[currentTurn].find(t => t.id === pid);
                        if (token.status === 'active' && token.stepCount + roll < 40) {
                            const targetIdx = (player.startTrackIdx + token.stepCount + roll) % 40;
                            for (let otherPid = 0; otherPid < 4; otherPid++) {
                                if (otherPid === currentTurn) continue;
                                if (pieces[otherPid].some(e => e.status === 'active' && (PLAYERS[otherPid].startTrackIdx + e.stepCount) % 40 === targetIdx)) {
                                    bestPieceId = pid;
                                    break;
                                }
                            }
                        }
                    }
                    if (roll === 6 && pieces[currentTurn].some(t => t.status === 'yard' && movablePieceIds.includes(t.id))) {
                        const yardToken = pieces[currentTurn].find(t => t.status === 'yard' && movablePieceIds.includes(t.id));
                        if (yardToken) bestPieceId = yardToken.id;
                    }
                    startPieceMoveRef.current(bestPieceId, roll, false);
                }, 700);
                return () => clearTimeout(timer);
            }
        } else if (isMyTurn && hasRolled && movablePieceIds.length === 1 && !isAnimatingMove) {
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
            } else {
                const freshUser = findUser(currentUser.username);
                if (!freshUser || freshUser.coins < ONLINE_ENTRY_FEE) return;
                deductCoins(currentUser.username, ONLINE_ENTRY_FEE);
                if (onUserUpdated) onUserUpdated(findUser(currentUser.username));
            }
        }

        turnGeneration.current += 1;
        deadlineRef.current = 0;
        moveCommitted.current = false;
        setTurnSerial(0);
        setWarnings({});
        setTurnSeconds(40);
        setShowIntro(true);
        if (newMatchId) setCurrentMatchId(newMatchId);

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
        } else {
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
        if (!hasFreeRematch && freshUser.coins < ONLINE_ENTRY_FEE) return;
        sendMessage(currentUser.username, `__REMATCH_ACCEPTED__${pendingNextMatchId}`, null, currentMatchId);
        window.dispatchEvent(new Event('storage'));
        startNewGame(pendingNextMatchId);
        if (onNavigateToGames) onNavigateToGames();
    };

    const declineRematch = () => {
        sendMessage(currentUser.username, '__REMATCH_DECLINED__', null, currentMatchId);
        window.dispatchEvent(new Event('storage'));
        setRematchState('idle');
        onExit();
    };
    rematchActionsRef.current = { accept: acceptRematch, decline: declineRematch };

    useEffect(() => {
        if (!winner || resultRecordedRef.current) return;
        resultRecordedRef.current = true;
        const won = winner === currentUser.username;

        if (gameMode === 'online') {
            if (won) playSound('coin', currentUser.settings?.sound);
            if (won && !freeRematchUsed) setHasFreeRematch(true);
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
            preview: [0, 1, 2, 3].map(t => <span key={t} className="block w-6 h-6 sm:w-9 sm:h-9">{renderLudoToken(p.hex, tokenStyleOf(p), false)}</span>)
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
                    if (!occ[key]) occ[key] = [];
                    occ[key].push({ pId: p.id, tId: t.id });
                }
            });
        });
        return occ;
    }, [pieces, PLAYERS, getPieceBoardCoords]);

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-3 sm:gap-4 animate-in fade-in relative px-1 sm:px-2">
            {showIntro && <VsIntro title="منچ ۴ نفره" subtitle={gameMode === 'online' ? 'مسابقه‌ی آنلاین' : 'مسابقه‌ی تمرینی'} players={vsPlayers} onDone={() => setShowIntro(false)} />}
            
            {/* هدر یکپارچه و بهینه برای موبایل و دسکتاپ */}
            <div className="w-full glass-panel px-3 py-2.5 sm:px-4 sm:py-3 rounded-2xl flex items-center justify-between gap-2 sm:gap-4 border border-slate-700/60 shadow-lg">
                <button
                    onClick={handleExitClick}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-rose-600 hover:border-rose-500 text-white rounded-xl text-xs sm:text-sm font-bold border border-slate-700 flex items-center gap-1.5 transition-all shadow-md active:scale-95 shrink-0"
                >
                    <IconArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 
                    <span>{winner ? 'فهرست' : 'خروج'}</span>
                </button>

                <div className="text-center min-w-0">
                    <h3 className="text-xs sm:text-base font-black text-white truncate">منچ ۴ نفره</h3>
                    {gameMode === 'online' && (
                        <span className="text-[10px] sm:text-xs font-bold text-amber-300 block">جایزه: ۱۰۰ کیوجی</span>
                    )}
                </div>

                {/* وضعیت نوبت و تایمر معکوس */}
                <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-900/80 px-2 sm:px-3 py-1.5 rounded-xl border border-slate-700 shrink-0">
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full animate-pulse" style={{ backgroundColor: activePlayer.hex }}></span>
                    <span className="font-bold text-[11px] sm:text-xs text-white max-w-[85px] sm:max-w-[120px] truncate">{activePlayer.name}</span>
                    {findUser(activePlayer?.name)?.equipped?.titles && findUser(activePlayer?.name)?.equipped?.titles !== 'classic' && typeof renderPlayerTitle === 'function' && (<div className="-mt-0.5 origin-right transform scale-90">{renderPlayerTitle(findUser(activePlayer.name).equipped.titles)}</div>)}
                    <span className={`font-mono font-black text-[10px] sm:text-xs pl-1 border-r border-slate-700 ${turnSeconds <= 10 ? 'text-rose-400 animate-ping' : 'text-emerald-400'}`}>
                        {turnSeconds}s
                    </span>
                </div>
            </div>

            {/* بدنه و کادر تخته بازی منچ - ابعاد حداکثری و بزرگ برای موبایل */}
            <div className="w-full max-w-[min(96vw,560px)] sm:max-w-[520px] md:max-w-[560px] flex flex-col items-center gap-2.5 mx-auto">
                <div
                    className="relative w-full aspect-square rounded-2xl sm:rounded-3xl p-1.5 sm:p-3 select-none overflow-hidden transition-shadow duration-500"
                    dir="ltr"
                    style={{ 
                        background: 'linear-gradient(145deg,#4e3620,#23160c 55%,#3a2717)', 
                        boxShadow: `0 20px 45px rgba(0,0,0,.7), 0 0 35px ${activePlayer.hex}33, inset 0 0 0 2px rgba(251,191,36,.3), inset 0 2px 6px rgba(255,255,255,.14)` 
                    }}
                >
                    <div
                        className="w-full h-full relative z-0 rounded-xl overflow-hidden"
                        style={{ background: 'radial-gradient(circle at 50% 45%, #26354d 0%, #141c2b 72%, #0d1320 100%)', boxShadow: 'inset 0 0 24px rgba(0,0,0,.75), 0 0 0 1px rgba(255,255,255,.07)' }}
                    >
                        {/* آشیانه‌ها */}
                        {PLAYERS.map(p => {
                            const [r0, c0] = LUDO_YARD_ORIGIN[p.id];
                            const active = currentTurn === p.id && !winner;
                            return (
                                <div key={`yard-${p.id}`} className="absolute" style={ludoBox(r0, c0, 4, 4)}>
                                    <div
                                        className={`absolute inset-[3%] rounded-2xl ${active ? 'gq-yard-active' : ''}`}
                                        style={{ '--glow': p.hex, background: `linear-gradient(145deg, ${p.hex}66, ${p.hex}1f)`, border: `1.5px solid ${p.hex}99`, boxShadow: 'inset 0 2px 8px rgba(255,255,255,.14), inset 0 -6px 12px rgba(0,0,0,.35)' }}
                                    ></div>
                                </div>
                            );
                        })}

                        {/* پلاک نام صاحبان آشیانه */}
                        {PLAYERS.map(p => {
                            const [r0, c0] = LUDO_YARD_ORIGIN[p.id];
                            const owner = ownerCards.find(o => o.id === p.id);
                            const active = currentTurn === p.id && !winner;
                            return (
                                <div key={`plate-${p.id}`} className="absolute flex items-center justify-center pointer-events-none" style={ludoBox(p.id <= 1 ? r0 : r0 + 3, c0, 4, 1)}>
                                    <div data-gq-player={p.name} className={`flex items-center gap-1 max-w-[94%] rounded-full pl-2 pr-0.5 py-0.5 ${active ? 'gq-plate-active' : ''}`} style={{ '--glow': p.hex, background: 'rgba(8,12,22,.75)', border: `1.5px solid ${p.hex}${active ? '' : '88'}` }}>
                                        <span className="relative w-4 h-4 sm:w-6 sm:h-6 rounded-full shrink-0 flex items-center justify-center text-[8px] sm:text-xs bg-slate-700" style={{ border: `1.5px solid ${p.hex}` }}>
                                            <div className="absolute inset-0 rounded-[inherit] overflow-hidden flex items-center justify-center">
                                                {owner && owner.avatar ? <img src={owner.avatar} alt="" draggable={false} className="w-full h-full object-cover" /> : (p.isBot ? '🤖' : '👤')}
                                            </div>
                                            {owner?.account?.equipped?.frames && renderAvatarFrame(owner.account.equipped.frames)}
                                        </span>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[8px] sm:text-[11px] font-black text-white truncate leading-none">{p.isBot ? p.colorName : p.name}{p.name === currentUser.username ? ' (شما)' : ''}</span>
                                            {findUser(p.name)?.equipped?.titles && findUser(p.name)?.equipped?.titles !== 'classic' && typeof renderPlayerTitle === 'function' && (<div className="-mt-0.5 origin-right transform scale-90">{renderPlayerTitle(findUser(p.name).equipped.titles)}</div>)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* خانه‌های مسیر اصلی */}
                        {LUDO_TRACK.map(([r, c], i) => {
                            const startOwner = PLAYERS.find(p => p.startTrackIdx === i);
                            const bg = startOwner
                                ? `linear-gradient(145deg, ${startOwner.hex}, color-mix(in srgb, ${startOwner.hex} 62%, #000))`
                                : 'linear-gradient(145deg,#a2adc4,#828eaa)';
                            return (
                                <div key={`track-${i}`} className="absolute" style={ludoBox(r, c)}>
                                    <div className="absolute inset-[6%] rounded-md sm:rounded-lg flex items-center justify-center" style={{ background: bg, boxShadow: '0 1px 2px rgba(0,0,0,.55), inset 0 -2px 0 rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.28)' }}>
                                        {startOwner && <span className="text-white text-[9px] sm:text-xs font-black" style={{ textShadow: '0 1px 2px rgba(0,0,0,.7)' }}>★</span>}
                                    </div>
                                </div>
                            );
                        })}

                        {/* مسیرهای رنگی ورود به خانه امن */}
                        {PLAYERS.map(p => LUDO_HOME_LANES[p.id].slice(0, 4).map(([r, c], i) => (
                            <div key={`lane-${p.id}-${i}`} className="absolute" style={ludoBox(r, c)}>
                                <div className="absolute inset-[6%] rounded-md sm:rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(145deg, ${p.hex}, color-mix(in srgb, ${p.hex} 62%, #000))`, boxShadow: '0 1px 2px rgba(0,0,0,.55), inset 0 -2px 0 rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.4)' }}>
                                    <span className="block w-[26%] h-[26%] rounded-full bg-white/70"></span>
                                </div>
                            </div>
                        )))}

                        {/* تاس در مرکز صفحه - با اندازه بزرگتر و لمس راحت‌تر */}
                        <div className="absolute flex items-center justify-center" style={{ ...ludoBox(4.75, 4.75, 1.5, 1.5), zIndex: isRolling ? 80 : 30 }}>
                            <button
                                type="button"
                                aria-label="پرتاب تاس"
                                disabled={!canRoll}
                                onClick={rollDice}
                                className={`relative w-full h-full flex items-center justify-center ${canRoll ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
                            >
                                <div
                                    className={`block w-[76%] h-[76%] relative ${canRoll ? 'gq-dice-ready' : ''}`}
                                    style={{
                                        transform: diceTransform || 'none',
                                        transition: diceHome ? 'transform .45s cubic-bezier(.34,1.56,.64,1)' : 'transform .085s ease-in-out',
                                        filter: isRolling ? 'drop-shadow(0 16px 12px rgba(0,0,0,.5))' : 'drop-shadow(0 6px 6px rgba(0,0,0,.4))'
                                    }}
                                >
                                    {renderCustomDice(diceValue, diceStyleOf(activePlayer))}
                                </div>
                            </button>
                        </div>

                        {/* مهره‌های بازی */}
                        {PLAYERS.map(player =>
                            pieces[player.id].map(token => {
                                const isFinished = token.status === 'finished' || token.stepCount >= 44;
                                const [pr, pc] = getPieceBoardCoords(player.id, token);
                                const isMovable = isMyTurn && currentTurn === player.id && movablePieceIds.includes(token.id) && !isAnimatingMove;

                                let tx = 0, ty = 0;
                                let scale = token.status === 'yard' ? 0.92 : 1;

                                if (isFinished) {
                                    scale = 0.64;
                                } else if (token.status === 'active' || token.status === 'home') {
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

                                return (
                                    <button
                                        key={`${player.id}-${token.id}`}
                                        disabled={!isMovable}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            startPieceMoveRef.current(token.id);
                                        }}
                                        style={{
                                            ...ludoBox(pr, pc),
                                            transform: `translate(${tx}%, ${ty}%) scale(${scale})`,
                                            transition: `top ${travel}, left ${travel}, transform .25s ease`,
                                            zIndex: 40 + (token.status === 'active' ? 1 : 0) + (isMovable ? 2 : 0)
                                        }}
                                        className={`absolute flex items-center justify-center p-0 ${isMovable ? 'cursor-pointer' : 'pointer-events-none'}`}
                                    >
                                        <div key={`${token.status}-${token.stepCount}`} className="gq-land relative w-[80%] h-[80%] flex items-center justify-center">
                                            {renderLudoToken(player.hex, tokenStyleOf(player), isMovable)}
                                            {isFinished && (
                                                <span className="absolute inset-0 flex items-center justify-center text-white text-[9px] sm:text-xs font-black pointer-events-none" style={{ textShadow: '0 1px 3px rgba(0,0,0,.9)' }}>✓</span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}

                        {/* مودال اعلام پایان و برنده بازی */}
                        {winner && (
                            <div dir="rtl" className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 sm:p-6 text-center animate-in zoom-in">
                                <IconTrophy className="w-16 h-16 sm:w-20 sm:h-20 text-yellow-400 mb-3 animate-bounce-slight" />
                                <h3 className="text-2xl sm:text-3xl font-black text-white mb-2">{winner} برنده شد!</h3>
                                {winner === currentUser.username && gameMode === 'online' && (
                                    <div className="flex items-center gap-2 p-2.5 bg-amber-500/20 border border-amber-400/50 rounded-2xl text-amber-300 font-black text-xs sm:text-sm mb-3 animate-pulse">
                                        <IconCoin className="w-5 h-5" />
                                        <span>+ ۱۰۰ کیوجی پاداش قهرمانی به حسابتان افزوده شد!</span>
                                    </div>
                                )}

                                <div className="mt-3 flex flex-col gap-2 w-full max-w-[240px]">
                                    {gameMode === 'bot' ? (
                                        <button
                                            onClick={() => startNewGame(`bot-${Date.now()}`)}
                                            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-transform text-xs sm:text-sm"
                                        >
                                            بازی دوباره
                                        </button>
                                    ) : (
                                        <button
                                            onClick={requestRematch}
                                            disabled={rematchState !== 'idle'}
                                            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 active:scale-95 transition-all text-xs sm:text-sm flex items-center justify-center gap-1.5"
                                        >
                                            <IconGamepad className="w-4 h-4" />
                                            {hasFreeRematch ? 'بازی مجدد (رایگان)' : 'بازی مجدد (۲۵ کیوجی)'}
                                        </button>
                                    )}
                                    <button
                                        onClick={onExit}
                                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-all"
                                    >
                                        بازگشت به فهرست
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* پیام راهنمای وضعیت نوبت */}
                <div className="w-full glass-panel px-3.5 py-2 rounded-2xl text-center text-xs sm:text-sm font-bold text-white border border-slate-700/60 shadow-md">
                    {turnHint}
                    {diceValue === 6 && !isRolling && (
                        <span className="block text-emerald-400 text-[10px] sm:text-xs mt-0.5 animate-pulse">★ تاس ۶! امکان خروج مهره و پرتاب مجدد ★</span>
                    )}
                </div>

                {/* نوار دکمه‌های کنترل هوشمند: دکمه کشوی گزارش زنده بازی */}
                <div className="w-full flex items-center justify-center gap-3 mt-0.5">
                    <button
                        onClick={() => { setIsLogOpen(true); setHasNewLog(false); }}
                        className="game-action flex-1 py-2.5 px-4 bg-slate-900/85 hover:bg-slate-800 text-slate-200 hover:text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-700/80 shadow-lg relative transition-all active:scale-95"
                    >
                        <span>📜</span>
                        <span>گزارش زنده بازی</span>
                        {hasNewLog && (
                            <span className="absolute top-2 left-2 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* کشوی هوشمند گزارش زنده بازی (مثل چت: تا رویش نزنیم باز نمی‌شود) */}
            {isLogOpen && (
                <div 
                    className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setIsLogOpen(false)}
                >
                    <div 
                        className="w-full max-w-md glass-panel bg-slate-900/95 border border-amber-500/40 rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                        dir="rtl"
                    >
                        <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">📜</span>
                                <h4 className="font-black text-white text-sm sm:text-base">گزارش زنده مسابقه</h4>
                                <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                                    {gameLog.length} رویداد
                                </span>
                            </div>
                            <button
                                onClick={() => setIsLogOpen(false)}
                                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar p-1 text-xs">
                            {gameLog.map((log, index) => {
                                const isWin = log.includes('برنده') || log.includes('🏆');
                                const isCapture = log.includes('زد و برگرداند') || log.includes('💥');
                                const isSix = log.includes('تاس ۶');
                                const isWarning = log.includes('اخطار') || log.includes('حذف');
                                return (
                                    <div
                                        key={index}
                                        className={`p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                                            isWin ? 'bg-amber-500/20 border-amber-400/60 text-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.2)]' :
                                            isCapture ? 'bg-rose-500/15 border-rose-500/40 text-rose-200' :
                                            isSix ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200' :
                                            isWarning ? 'bg-red-500/20 border-red-500/40 text-red-300' :
                                            'bg-slate-900/80 border-slate-800 text-slate-300'
                                        }`}
                                    >
                                        <span className="text-sm shrink-0 mt-0.5">
                                            {isWin ? '🏆' : isCapture ? '💥' : isSix ? '⭐' : isWarning ? '⚠️' : '🎲'}
                                        </span>
                                        <span className="leading-relaxed flex-1 font-medium">{log}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setIsLogOpen(false)}
                            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-700"
                        >
                            بستن گزارش
                        </button>
                    </div>
                </div>
            )}

            {/* ابزار گفتگوی درون بازی */}
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
                targets={PLAYERS.filter(p => p.name !== currentUser.username && !abandonedPlayers.includes(p.id)).map(p => ({ name: p.name, label: p.isBot ? `${p.colorName} (ربات)` : p.name, isBot: p.isBot, hex: p.hex }))}
            />

            {/* پنجره تأیید خروج از بازی */}
            {showExitConfirm && (
                <div dir="rtl" className="fixed inset-0 z-[130] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                    <div className="w-full max-w-sm glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl text-center animate-in zoom-in border border-rose-500/30">
                        <IconLogout className="w-12 h-12 text-rose-500 mx-auto mb-3" />
                        <h3 className="text-lg sm:text-xl font-black text-white mb-2">خروج از بازی؟</h3>
                        <p className="text-slate-300 text-xs sm:text-sm leading-5 mb-5">در صورت خروج، نوبت و مهره‌های شما از بازی حذف خواهند شد.</p>
                        <div className="flex gap-2 sm:gap-3">
                            <button onClick={() => setShowExitConfirm(false)} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs sm:text-sm font-bold">انصراف</button>
                            <button onClick={confirmExit} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-rose-600/20">بله، خروج</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};