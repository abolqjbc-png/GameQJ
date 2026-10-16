// ============================================================
//  AdminPage.jsx — پنل مدیریت GameQJ (بن، تعلیق، سکه، ریست گردونه)
//  وابستگی‌های سراسری: React, ReactDOM, adminGetUserList, adminSetBan,
//  adminSuspendGames, adminAdjustCoins, adminResetWheel, isAdminUser,
//  findUser, showToast
// ============================================================

const AdminPage = ({ currentUser, onUserUpdated, onBack }) => {
    const [users, setUsers] = useState(adminGetUserList());
    const [search, setSearch] = useState('');
    const [confirm, setConfirm] = useState(null);
    const [coinInputs, setCoinInputs] = useState({});
    const [suspendHours, setSuspendHours] = useState({});

    const refresh = () => setUsers(adminGetUserList());

    const run = (res, okText, targetUsername) => {
        try {
            if (res && res.ok) {
                showToast({ type: 'success', title: 'مدیریت', text: okText });
                if (targetUsername === currentUser.username && typeof onUserUpdated === 'function') {
                    onUserUpdated(findUser(currentUser.username));
                }
                refresh();
            } else {
                showToast({ type: 'error', title: 'خطا', text: (res && res.error) || 'خطای نامشخص' });
            }
        } finally {
            setConfirm(null);
        }
    };

    const isTargetAdmin = (u) => isAdminUser(u);

    const filtered = users.filter((u) =>
        (u.username || '').toLowerCase().includes((search || '').trim().toLowerCase())
    );

    const totalUsers = users.length;
    const bannedCount = users.filter((u) => u.banned).length;
    const suspendedCount = users.filter((u) => u.gameSuspendedUntil > Date.now()).length;

    const canUsePortal = typeof ReactDOM !== 'undefined' && ReactDOM && typeof ReactDOM.createPortal === 'function' && typeof document !== 'undefined';

    const roleBadge = (u) => isAdminUser(u) ? (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-orange-600 text-white border border-amber-400/40">مدیر</span>
    ) : (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700/70 text-slate-300 border border-slate-600/50">کاربر</span>
    );

    const statusPills = (u) => (
        <div className="flex flex-wrap items-center gap-1.5">
            {u.banned && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-300 border border-red-500/40">مسدود</span>
            )}
            {u.gameSuspendedUntil > Date.now() && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40">
                    تعلیق تا {new Date(u.gameSuspendedUntil).toLocaleString('fa-IR')}
                </span>
            )}
        </div>
    );

    const modal = confirm ? (
        <div dir="rtl" className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConfirm(null)}>
            <div className="glass-panel bg-slate-900/90 border border-slate-700/60 rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-black text-white mb-2">{confirm.title}</h3>
                <p className="text-sm text-slate-300 mb-6 leading-relaxed">{confirm.message}</p>
                <div className="flex gap-3">
                    <button
                        onClick={confirm.onConfirm}
                        className="flex-1 py-2 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 transition-all active:scale-95"
                    >تأیید</button>
                    <button
                        onClick={() => setConfirm(null)}
                        className="flex-1 py-2 rounded-xl font-bold text-sm bg-slate-700/70 text-slate-200 hover:bg-slate-600/70 transition-all active:scale-95"
                    >انصراف</button>
                </div>
            </div>
        </div>
    ) : null;

    if (!isAdminUser(currentUser)) {
        return (
            <div dir="rtl" className="w-full flex-1 flex items-center justify-center p-4">
                <div className="glass-panel bg-slate-900/70 border border-slate-700/60 rounded-2xl p-8 max-w-sm w-full text-center">
                    <div className="text-4xl mb-3">⛔</div>
                    <h2 className="text-xl font-black text-white mb-2">دسترسی غیرمجاز</h2>
                    <p className="text-sm text-slate-400 mb-6">شما اجازه‌ی ورود به پنل مدیریت را ندارید.</p>
                    <button
                        onClick={onBack}
                        className="w-full py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 transition-all active:scale-95"
                    >بازگشت</button>
                </div>
            </div>
        );
    }

    return (
        <div dir="rtl" className="w-full flex-1 flex flex-col gap-5 py-4">
            {/* هدر */}
            <div className="flex items-center justify-between gap-3">
                <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                    <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-lg">🛡️</span>
                    پنل مدیریت GameQJ
                </h1>
                <button
                    onClick={onBack}
                    className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:bg-slate-700/80 transition-all active:scale-95"
                >بازگشت</button>
            </div>

            {/* آمار */}
            <div className="grid grid-cols-3 gap-3">
                <div className="glass-panel bg-slate-900/60 border border-slate-700/60 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-black text-indigo-300">{totalUsers}</div>
                    <div className="text-[11px] text-slate-400 font-bold mt-1">کاربران کل</div>
                </div>
                <div className="glass-panel bg-slate-900/60 border border-slate-700/60 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-black text-red-300">{bannedCount}</div>
                    <div className="text-[11px] text-slate-400 font-bold mt-1">مسدودشده</div>
                </div>
                <div className="glass-panel bg-slate-900/60 border border-slate-700/60 rounded-2xl p-4 text-center">
                    <div className="text-2xl font-black text-amber-300">{suspendedCount}</div>
                    <div className="text-[11px] text-slate-400 font-bold mt-1">تعلیق بازی</div>
                </div>
            </div>

            {/* جستجو */}
            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجوی نام کاربری..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/70 border border-slate-700/60 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400/60 transition-all"
            />

            {/* لیست کاربران */}
            <div className="flex flex-col gap-3">
                {filtered.length === 0 && (
                    <div className="glass-panel bg-slate-900/60 border border-slate-700/60 rounded-2xl p-6 text-center text-slate-400 text-sm">کاربری یافت نشد.</div>
                )}
                {filtered.map((u) => (
                    <div key={u.username} className="glass-panel bg-slate-900/60 border border-slate-700/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                        {/* هویت */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            {u.avatar ? (
                                <img className="w-10 h-10 rounded-xl object-cover border border-slate-700/60" src={u.avatar} alt={u.username} />
                            ) : (
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center font-black text-white">
                                    {(u.username || '?').charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-black text-white text-sm truncate">{u.username}</span>
                                    {roleBadge(u)}
                                </div>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    {statusPills(u)}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                                    <span className="text-amber-300 font-bold">💰 {u.coins}</span>
                                    <span>بازی: {u.stats.games}</span>
                                    <span>برد: {u.stats.wins}</span>
                                </div>
                            </div>
                        </div>

                        {/* اکشن‌ها */}
                        {!isTargetAdmin(u) && (
                            <div className="flex flex-wrap items-center gap-2">
                                {/* بن */}
                                <button
                                    onClick={() => setConfirm({
                                        title: u.banned ? 'رفع بن' : 'بن کردن',
                                        message: u.banned
                                            ? `مطمئنید بن «${u.username}» برداشته شود؟`
                                            : `مطمئنید «${u.username}» مسدود شود؟`,
                                        onConfirm: () => run(
                                            adminSetBan(currentUser.username, u.username, !u.banned),
                                            u.banned ? 'بن کاربر برداشته شد.' : 'کاربر مسدود شد.',
                                            u.username
                                        ),
                                    })}
                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all active:scale-95 ${u.banned
                                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25'
                                        : 'bg-red-500/15 text-red-300 border border-red-500/40 hover:bg-red-500/25'}`}
                                >{u.banned ? 'رفع بن' : 'بن'}</button>

                                {/* تعلیق */}
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number"
                                        min="0"
                                        value={suspendHours[u.username] ?? ''}
                                        onChange={(e) => setSuspendHours((p) => ({ ...p, [u.username]: e.target.value }))}
                                        placeholder="ساعت"
                                        className="w-16 px-2 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/60 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/60"
                                    />
                                    <button
                                        onClick={() => {
                                            const h = Number(suspendHours[u.username]);
                                            setConfirm({
                                                title: 'تعلیق بازی',
                                                message: `تعلیق بازی «${u.username}» به مدت ${Number.isFinite(h) ? h : '?'} ساعت اعمال شود؟`,
                                                onConfirm: () => run(
                                                    adminSuspendGames(currentUser.username, u.username, h),
                                                    'تعلیق بازی اعمال شد.',
                                                    u.username
                                                ),
                                            });
                                        }}
                                        className="px-3 py-1.5 rounded-lg text-[11px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25 transition-all active:scale-95"
                                    >اعمال</button>
                                    {u.gameSuspendedUntil > Date.now() && (
                                        <button
                                            onClick={() => run(
                                                adminSuspendGames(currentUser.username, u.username, 0),
                                                'تعلیق برداشته شد.',
                                                u.username
                                            )}
                                            className="px-3 py-1.5 rounded-lg text-[11px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25 transition-all active:scale-95"
                                        >رفع تعلیق</button>
                                    )}
                                </div>

                                {/* سکه */}
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number"
                                        value={coinInputs[u.username] ?? ''}
                                        onChange={(e) => setCoinInputs((p) => ({ ...p, [u.username]: e.target.value }))}
                                        placeholder="±سکه"
                                        className="w-20 px-2 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/60 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/60"
                                    />
                                    <button
                                        onClick={() => {
                                            const d = Number(coinInputs[u.username]);
                                            setConfirm({
                                                title: 'تغییر موجودی',
                                                message: `${Number.isFinite(d) ? (d > 0 ? `+${d}` : `${d}`) : '?'} کیوجی به «${u.username}» اعمال شود؟`,
                                                onConfirm: () => run(
                                                    adminAdjustCoins(currentUser.username, u.username, d),
                                                    'موجودی به‌روزرسانی شد.',
                                                    u.username
                                                ),
                                            });
                                        }}
                                        className="px-3 py-1.5 rounded-lg text-[11px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25 transition-all active:scale-95"
                                    >اعمال</button>
                                </div>

                                {/* ریست گردونه */}
                                <button
                                    onClick={() => run(
                                        adminResetWheel(currentUser.username, u.username),
                                        'گردونه‌ی روزانه‌ی کاربر ریست شد.',
                                        u.username
                                    )}
                                    className="px-3 py-1.5 rounded-lg text-[11px] font-black bg-slate-700/60 text-slate-200 border border-slate-600/50 hover:bg-slate-600/60 transition-all active:scale-95"
                                >ریست گردونه</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {confirm && (canUsePortal ? ReactDOM.createPortal(modal, document.body) : modal)}
        </div>
    );
};
