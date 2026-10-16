const ProfilePage = ({ user, onBack, onLogout, onUserUpdated, onAccountDeleted }) => {
    const [sound, setSound] = useState(user.settings?.sound ?? true);
    const [showLastSeen, setShowLastSeen] = useState(user.settings?.showLastSeen ?? true);
    const [lightMode, setLightMode] = useState(user.settings?.lightMode ?? (typeof getInitialThemeIsLight === 'function' ? getInitialThemeIsLight() : false));
    const [nextUsername, setNextUsername] = useState(user.username);
    const [feedback, setFeedback] = useState(null);
    const [deleteStep, setDeleteStep] = useState(null);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [avatarError, setAvatarError] = useState('');
    const [galleryPreview, setGalleryPreview] = useState(null);
    const fileInputRef = useRef(null);

    const unlockedAvatars = user.unlockedAvatars || [];

    const handleSelectAvatar = (avItem) => {
        setAvatarError('');
        if (avItem.isPremium && !unlockedAvatars.includes(avItem.id)) {
            if (user.coins < PREMIUM_AVATAR_COST) {
                setAvatarError(`برای خرید این آواتار ویژه به ${PREMIUM_AVATAR_COST} کیوجی نیاز دارید (موجودی شما: ${user.coins} کیوجی).`);
                return;
            }
            const confirmed = window.confirm(`آیا مایلید این آواتار ویژه را با ${PREMIUM_AVATAR_COST} کیوجی خریداری و فعال کنید؟`);
            if (!confirmed) return;

            const updatedUser = patchUser(user.username, account => ({
                ...account,
                coins: account.coins - PREMIUM_AVATAR_COST,
                unlockedAvatars: [...(account.unlockedAvatars || []), avItem.id],
                avatar: avItem.src
            }));
            if (updatedUser) {
                playSound('coin', user.settings?.sound);
                onUserUpdated(updatedUser);
                setFeedback({ type: 'success', text: 'آواتار ویژه با موفقیت خریداری و تنظیم شد! 🎉' });
            }
            return;
        }

        const updatedUser = patchUser(user.username, account => ({
            ...account,
            avatar: avItem.src
        }));
        if (updatedUser) {
            setGalleryPreview(null);
            onUserUpdated(updatedUser);
        }
    };

    const openGalleryPicker = () => {
        setAvatarError('');
        if (user.coins < GALLERY_AVATAR_COST) {
            setAvatarError(`برای آپلود عکس از گالری به ${GALLERY_AVATAR_COST} کیوجی نیاز است (موجودی: ${user.coins} کیوجی).`);
            return;
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleGalleryFile = (event) => {
        const file = event.target.files && event.target.files[0];
        event.target.value = '';
        setAvatarError('');
        if (!file) return;
        if (!file.type || !file.type.startsWith('image/')) {
            setAvatarError('فقط فایل تصویری مجاز است.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 128;
                canvas.height = 128;
                ctx.drawImage(img, 0, 0, 128, 128);
                const compressed = canvas.toDataURL('image/jpeg', 0.8);
                setGalleryPreview(compressed);
            };
            img.src = reader.result;
        };
        reader.onerror = () => setAvatarError('خطا در خواندن فایل.');
        reader.readAsDataURL(file);
    };

    const applyGalleryAvatar = () => {
        if (!galleryPreview) return;
        if (user.coins < GALLERY_AVATAR_COST) {
            setAvatarError(`موجودی کیوجی شما کافی نیست (${GALLERY_AVATAR_COST} کیوجی نیاز است).`);
            return;
        }

        const updatedUser = patchUser(user.username, account => ({
            ...account,
            coins: account.coins - GALLERY_AVATAR_COST,
            avatar: galleryPreview
        }));

        if (updatedUser) {
            playSound('coin', user.settings?.sound);
            setGalleryPreview(null);
            onUserUpdated(updatedUser);
            setFeedback({ type: 'success', text: `تصویر گالری تنظیم شد و ${GALLERY_AVATAR_COST} کیوجی کسر گردید.` });
        }
    };

    useEffect(() => {
        setSound(user.settings?.sound ?? true);
        setShowLastSeen(user.settings?.showLastSeen ?? true);
        setLightMode(user.settings?.lightMode ?? (typeof getInitialThemeIsLight === 'function' ? getInitialThemeIsLight() : false));
        setNextUsername(user.username);
    }, [user]);

    const updateSettings = (changes) => {
        const updatedUser = patchUser(user.username, account => ({
            ...account,
            settings: { ...(account.settings || {}), ...changes }
        }));
        if (updatedUser) onUserUpdated(updatedUser);
    };

    const handleLightModeToggle = () => {
        const next = !lightMode;
        setLightMode(next);
        if (typeof applyThemeToDOM === 'function') {
            applyThemeToDOM(next);
        }
        updateSettings({ lightMode: next });
    };

    const handleSoundToggle = () => {
        const next = !sound;
        setSound(next);
        updateSettings({ sound: next });
    };

    const handleLastSeenToggle = () => {
        const next = !showLastSeen;
        setShowLastSeen(next);
        updateSettings({ showLastSeen: next });
    };

    const handleRename = (event) => {
        event.preventDefault();
        const cleanedName = nextUsername.trim();
        setFeedback(null);

        if (!cleanedName) return setFeedback({ type: 'error', text: 'نام کاربری را وارد کنید.' });
        if (cleanedName.length < 3) return setFeedback({ type: 'error', text: 'نام کاربری حداقل ۳ کاراکتر باشد.' });
        if (cleanedName.toLowerCase() === user.username.toLowerCase()) {
            return setFeedback({ type: 'info', text: 'نام کاربری تغییری نکرده است.' });
        }
        if (!isUsernameAvailable(cleanedName, user.username)) {
            return setFeedback({ type: 'error', text: 'این نام کاربری استفاده شده است.' });
        }

        const updatedUser = renameUser(user.username, cleanedName);
        if (!updatedUser) return setFeedback({ type: 'error', text: 'تغییر نام کاربری انجام نشد.' });
        onUserUpdated(updatedUser);
        setFeedback({ type: 'success', text: 'نام کاربری با موفقیت تغییر کرد.' });
    };

    const handleDeleteAccount = (event) => {
        event.preventDefault();
        setDeleteError('');
        if (!deleteUser(user.username, deletePassword)) {
            setDeleteError('رمز عبور نادرست است. حساب حذف نشد.');
            return;
        }
        onAccountDeleted();
    };

    const statCards = [
        { label: 'موجودی کیوجی', value: `${user.coins ?? 0} 🪙`, color: 'text-amber-400 font-black' },
        { label: 'تعداد برد', value: user.stats?.wins ?? 0, color: 'text-emerald-300' },
        { label: 'تعداد بازی', value: user.stats?.games ?? 0, color: 'text-indigo-300' }
    ];

    return (
        <div className="w-full max-w-3xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in px-2 sm:px-0">
            <div className="glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-xl flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 text-center sm:text-right">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <PlayerAvatar user={user} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shrink-0" />
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-white">{user.username}</h2>
                        {user.equipped?.titles && user.equipped.titles !== 'classic' && (
                            <div className="mt-1 transform scale-110 origin-right text-right">
                                {renderPlayerTitle(user.equipped.titles)}
                            </div>
                        )}
                        <div className="flex flex-col sm:flex-row items-center gap-2 mt-1.5">
                            <span className="flex items-center justify-center gap-1 text-[10px] sm:text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/30">
                                <IconCoin className="w-3.5 h-3.5" />
                                <span>{user.coins} کیوجی</span>
                            </span>
                            <span className="text-[10px] sm:text-xs text-slate-400">آخرین بازدید: {formatLastSeen(user.lastSeen)}</span>
                        </div>
                    </div>
                </div>
                <button onClick={onBack} className="w-full sm:w-auto px-6 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs sm:text-sm font-bold border border-slate-700">
                    بازگشت
                </button>
            </div>

            <div className="glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 text-center sm:text-right">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <h3 className="font-black text-base sm:text-lg text-white">انتخاب و تغییر آواتار</h3>
                        <p className="text-[10px] sm:text-xs text-slate-400 mt-1">
                            ۶ آواتار رایگان، ۴ آواتار ویژه (۱۵۰ کیوجی) یا انتخاب از گالری ({GALLERY_AVATAR_COST} کیوجی).
                        </p>
                    </div>
                    <button onClick={openGalleryPicker} className="game-action w-full sm:w-auto px-4 py-2.5 bg-gradient-to-l from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 rounded-xl text-[10px] sm:text-xs font-black border border-amber-400/60 flex items-center justify-center gap-1.5 shrink-0 shadow-lg shadow-amber-600/20">
                        <IconCoin className="w-4 h-4 text-slate-950" />
                        <span>انتخاب از گالری ({GALLERY_AVATAR_COST} کیوجی)</span>
                    </button>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleGalleryFile}
                />

                {/* پیش‌نمایش تصویر انتخابی از گالری در جایگاه جدید (بالاتر از گرید آواتارها) */}
                {galleryPreview && (
                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 p-3.5 sm:p-4 bg-amber-950/20 rounded-xl sm:rounded-2xl border border-amber-500/40 animate-in fade-in">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl overflow-hidden border border-amber-500/40 shrink-0">
                            <img src={galleryPreview} alt="پیش‌‌نمایش گالری" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 text-[10px] sm:text-xs text-amber-200 font-bold text-center sm:text-right">
                            پیش‌نمایش تصویر انتخابی شما — با تایید، {GALLERY_AVATAR_COST} کیوجی از حسابتان کسر شده و آواتار اعمال می‌شود.
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button onClick={applyGalleryAvatar} className="game-action flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 rounded-xl text-[10px] sm:text-xs font-black shadow-md">پرداخت {GALLERY_AVATAR_COST} کیوجی</button>
                            <button onClick={() => setGalleryPreview(null)} className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] sm:text-xs font-bold border border-slate-700">انصراف</button>
                        </div>
                    </div>
                )}
                {avatarError && <p className="text-[10px] sm:text-xs font-bold text-rose-300">{avatarError}</p>}

                {/* اسلایدر آواتارها: کشیدن چپ/راست */}
                <AvatarPicker
                    items={[...ALL_AVATARS, ...(typeof STORE_AVATARS !== 'undefined' ? STORE_AVATARS : []).filter(a => unlockedAvatars.includes(a.id))]}
                    user={user}
                    unlocked={unlockedAvatars}
                    onSelect={handleSelectAvatar}
                />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {statCards.map(stat => (
                    <div key={stat.label} className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-center shadow-xl">
                        <div className={`text-xl sm:text-2xl font-black ${stat.color}`}>{stat.value}</div>
                        <div className="text-[10px] sm:text-xs text-slate-400 mt-1 sm:mt-2 font-bold">{stat.label}</div>
                    </div>
                ))}
            </div>

            <div className="glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="text-center sm:text-right">
                    <h3 className="font-black text-base sm:text-lg text-white">ویرایش نام کاربری</h3>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-1">این نام در فهرست دوستان و مسابقات به‌روزرسانی می‌شود.</p>
                </div>
                <form onSubmit={handleRename} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <input
                        type="text"
                        value={nextUsername}
                        onChange={(event) => setNextUsername(event.target.value)}
                        className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-900/80 border border-slate-700/80 rounded-xl sm:rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs sm:text-sm text-center sm:text-right"
                    />
                    <button type="submit" className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold">
                        ذخیره نام
                    </button>
                </form>
                {feedback && (
                    <p className={`text-[10px] sm:text-xs font-bold text-center sm:text-right ${feedback.type === 'success' ? 'text-emerald-300' : 'text-rose-300'}`}>{feedback.text}</p>
                )}
            </div>

            <div className="glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xl space-y-3 sm:space-y-4">
                <h3 className="font-black text-base sm:text-lg text-white text-center sm:text-right">تنظیمات</h3>

                {/* حالت روشن (لایت‌مود) */}
                <div className="flex items-center justify-between gap-4 p-3 sm:p-4 bg-slate-900/60 rounded-xl sm:rounded-2xl border border-slate-700/60">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl border transition-colors ${lightMode ? 'bg-amber-400/20 text-amber-500 border-amber-400/50' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                            {lightMode ? (
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="5" />
                                    <line x1="12" y1="1" x2="12" y2="3" />
                                    <line x1="12" y1="21" x2="12" y2="23" />
                                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                    <line x1="1" y1="12" x2="3" y2="12" />
                                    <line x1="21" y1="12" x2="23" y2="12" />
                                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                                </svg>
                            )}
                        </div>
                        <div>
                            <div className="font-bold text-white text-xs sm:text-sm">حالت روشن (لایت‌مود)</div>
                            <div className="text-[10px] sm:text-xs text-slate-400 mt-0.5">تم روشن ۹۰٪ سفید و ۱۰٪ تیره برای تمام بخش‌های برنامه</div>
                        </div>
                    </div>
                    <button onClick={handleLightModeToggle} aria-label="تغییر وضعیت حالت روشن" className={`w-11 sm:w-12 h-6 rounded-full transition-colors relative shrink-0 ${lightMode ? 'bg-amber-500 shadow-md shadow-amber-500/30' : 'bg-slate-700'}`}>
                        <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${lightMode ? 'left-6 sm:left-7' : 'left-1'}`}></span>
                    </button>
                </div>

                <div className="flex items-center justify-between gap-4 p-3 sm:p-4 bg-slate-900/60 rounded-xl sm:rounded-2xl border border-slate-700/60">
                    <div>
                        <div className="font-bold text-white text-xs sm:text-sm">افکت‌های صوتی</div>
                        <div className="text-[10px] sm:text-xs text-slate-400 mt-0.5">پخش صدای حرکت مهره‌ها، تاس، سکه‌ها</div>
                    </div>
                    <button onClick={handleSoundToggle} aria-label="تغییر وضعیت صدا" className={`w-10 sm:w-12 h-5 sm:h-6 rounded-full transition-colors relative shrink-0 ${sound ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                        <span className={`w-3.5 sm:w-4 h-3.5 sm:h-4 rounded-full bg-white absolute top-[3px] sm:top-1 transition-transform ${sound ? 'left-6 sm:left-7' : 'left-1'}`}></span>
                    </button>
                </div>
                <div className="flex items-center justify-between gap-4 p-3 sm:p-4 bg-slate-900/60 rounded-xl sm:rounded-2xl border border-slate-700/60">
                    <div>
                        <div className="font-bold text-white text-xs sm:text-sm">نمایش آخرین بازدید</div>
                        <div className="text-[10px] sm:text-xs text-slate-400 mt-0.5">پنهان کردن آنلاین بودن شما</div>
                    </div>
                    <button onClick={handleLastSeenToggle} aria-label="تغییر وضعیت نمایش آخرین بازدید" className={`w-10 sm:w-12 h-5 sm:h-6 rounded-full transition-colors relative shrink-0 ${showLastSeen ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                        <span className={`w-3.5 sm:w-4 h-3.5 sm:h-4 rounded-full bg-white absolute top-[3px] sm:top-1 transition-transform ${showLastSeen ? 'left-6 sm:left-7' : 'left-1'}`}></span>
                    </button>
                </div>
            </div>

            <div className="glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xl space-y-3">
                <button onClick={onLogout} className="w-full py-2.5 sm:py-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2">
                    <IconLogout className="w-4 h-4" /> خروج از حساب کاربری
                </button>
                <button onClick={() => { setDeleteStep('warning'); setDeletePassword(''); setDeleteError(''); }} className="w-full py-2.5 sm:py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm">
                    حذف حساب کاربری
                </button>
            </div>

            {deleteStep && (
                <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-sm glass-panel rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5">
                        {deleteStep === 'warning' ? (
                            <>
                                <div className="text-center">
                                    <h3 className="text-lg sm:text-xl font-black text-rose-300">حذف دائمی حساب</h3>
                                    <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-5 sm:leading-6">آیا مطمئن هستید؟ تمام کیوجی‌ها، آواتارها و رفقای شما پاک خواهند شد.</p>
                                </div>
                                <div className="flex gap-2 sm:gap-3">
                                    <button onClick={() => setDeleteStep(null)} className="flex-1 py-2.5 sm:py-3 bg-slate-800 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold">انصراف</button>
                                    <button onClick={() => setDeleteStep('password')} className="flex-1 py-2.5 sm:py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold">ادامه</button>
                                </div>
                            </>
                        ) : (
                            <form onSubmit={handleDeleteAccount} className="space-y-3 sm:space-y-4">
                                <div className="text-center">
                                    <h3 className="text-lg sm:text-xl font-black text-rose-300">تأیید با رمز عبور</h3>
                                    <p className="text-[10px] sm:text-xs text-slate-300 mt-2">برای حذف حساب، رمز عبور «{user.username}» را وارد کنید.</p>
                                </div>
                                <input type="password" autoFocus value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} className="w-full px-4 py-2.5 sm:py-3 bg-slate-900/80 border border-slate-700/80 rounded-xl sm:rounded-2xl text-white focus:outline-none focus:border-rose-500 text-sm text-center" placeholder="رمز عبور" />
                                {deleteError && <p className="text-[10px] sm:text-xs font-bold text-rose-300 text-center">{deleteError}</p>}
                                <div className="flex gap-2 sm:gap-3">
                                    <button type="button" onClick={() => setDeleteStep(null)} className="flex-1 py-2.5 sm:py-3 bg-slate-800 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold">انصراف</button>
                                    <button type="submit" className="flex-1 py-2.5 sm:py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold">حذف دائمی</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};