const AuthModal = ({ onLoginSuccess }) => {
    const [mode, setMode] = useState('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const resetForm = (newMode) => {
        setMode(newMode);
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setError('');
        setSuccessMsg('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        const cleanUsername = username.trim();
        if (!cleanUsername) return setError('لطفاً نام کاربری را وارد کنید.');
        if (cleanUsername.length < 3) return setError('نام کاربری باید حداقل ۳ کاراکتر باشد.');
        if (!password || password.length < 4) return setError('رمز عبور باید حداقل ۴ نویسه باشد.');

        const users = getUsers();

        if (mode === 'register') {
            if (password !== confirmPassword) return setError('رمز عبور و تکرار آن یکسان نیستند.');
            if (users.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
                return setError('این نام کاربری قبلاً ثبت شده است. نام دیگری برگزینید.');
            }

            const newUser = {
                username: cleanUsername,
                passwordHash: hashPassword(password),
                coins: INITIAL_QJ_COINS,
                unlockedAvatars: [],
                createdAt: new Date().toISOString()
            };

            saveUsers([...users, normalizeUser(newUser)]);
            saveSession(newUser, rememberMe);
            setSuccessMsg(`ثبت‌‌نام با موفقیت انجام شد! ${INITIAL_QJ_COINS} کیوجی هدیه شروع دریافت کردید.`);
            setTimeout(() => onLoginSuccess(newUser), 400);
        } else {
            const user = users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
            if (!user) return setError('کاربری با این نام کاربری یافت نشد.');
            if (user.passwordHash !== hashPassword(password)) return setError('رمز عبور وارد شده اشتباه است.');

            saveSession(user, rememberMe);
            setSuccessMsg('خوش آمدید! ورود موفقیت‌آمیز بود.');
            setTimeout(() => onLoginSuccess(user), 350);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[85vh] p-4 sm:p-6">
            <div className="w-full max-w-md">
                <div className="text-center mb-6 sm:mb-8">
                    <div className="inline-flex p-3 sm:p-4 rounded-3xl bg-indigo-500/20 border border-indigo-500/40 mb-3 shadow-xl">
                        <IconGamepad className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-400" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
                        GameQJ
                    </h1>
                    <p className="text-slate-400 mt-2 text-xs sm:text-sm">پلتفرم جامع بازی‌های رومیزی و آنلاین</p>
                </div>

                <div className="glass-panel p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl relative overflow-hidden">
                    <div className="flex bg-slate-900/80 p-1 rounded-xl sm:rounded-2xl mb-5 sm:mb-6 border border-slate-700/60">
                        <button
                            type="button"
                            onClick={() => resetForm('login')}
                            className={`flex-1 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all ${
                                mode === 'login' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            ورود به حساب
                        </button>
                        <button
                            type="button"
                            onClick={() => resetForm('register')}
                            className={`flex-1 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all ${
                                mode === 'register' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            ثبت‌نام جدید
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs sm:text-sm font-medium flex items-center gap-2">
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}
                    {successMsg && (
                        <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-medium flex items-center gap-2">
                            <span>✓</span>
                            <span>{successMsg}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[10px] sm:text-xs font-semibold text-slate-300 mb-1.5 mr-1">نام کاربری</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                    <IconUserCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="نام کاربری (حداقل ۳ حرف)"
                                    className="w-full pr-9 sm:pr-10 pl-4 py-2.5 sm:py-3 bg-slate-900/80 border border-slate-700/80 rounded-xl sm:rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs sm:text-sm"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] sm:text-xs font-semibold text-slate-300 mb-1.5 mr-1">رمز عبور</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                    <IconLock className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="رمز عبور"
                                    className="w-full pr-9 sm:pr-10 pl-4 py-2.5 sm:py-3 bg-slate-900/80 border border-slate-700/80 rounded-xl sm:rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs sm:text-sm"
                                    required
                                />
                            </div>
                        </div>

                        {mode === 'register' && (
                            <div>
                                <label className="block text-[10px] sm:text-xs font-semibold text-slate-300 mb-1.5 mr-1">تکرار رمز عبور</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                        <IconLock className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </div>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="تکرار رمز عبور"
                                        className="w-full pr-9 sm:pr-10 pl-4 py-2.5 sm:py-3 bg-slate-900/80 border border-slate-700/80 rounded-xl sm:rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs sm:text-sm"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <label className="flex items-center gap-2 cursor-pointer pt-1">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 accent-indigo-500 cursor-pointer"
                            />
                            <span className="text-[10px] sm:text-xs text-slate-300 font-medium">مرا به خاطر بسپار</span>
                        </label>

                        <button
                            type="submit"
                            className="w-full py-3 sm:py-3.5 mt-2 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold rounded-xl sm:rounded-2xl shadow-lg shadow-indigo-600/30 active:scale-[0.98] transition-all text-sm"
                        >
                            {mode === 'login' ? 'ورود به بازی' : 'ایجاد حساب کاربری'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};