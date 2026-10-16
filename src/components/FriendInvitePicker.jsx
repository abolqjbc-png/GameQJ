const FriendInvitePicker = ({ names, selected, onChange }) => {
    const [query, setQuery] = useState('');
    const visibleNames = names.filter(name => name.toLowerCase().includes(query.trim().toLowerCase()));
    return <section className="gq-invite-picker" dir="rtl">
        <div className="flex items-center justify-between gap-3 mb-3"><strong className="text-white">هم‌تیمی‌ها را انتخاب کن</strong><span className="text-xs text-indigo-300">{selected.length} نفر انتخاب شده</span></div>
        <input className="gq-friend-search" aria-label="جستجوی دوستان" placeholder="جستجوی نام دوست…" value={query} onChange={event => setQuery(event.target.value)} />
        <div className="gq-friend-grid custom-scrollbar">
            {visibleNames.map(name => {
                const u = findUser(name);
                return (
                <label key={name} className={"gq-friend-card " + (selected.includes(name) ? "is-selected" : "")}>
                    <input type="checkbox" checked={selected.includes(name)} onChange={() => onChange(selected.includes(name) ? selected.filter(item => item !== name) : [...selected, name])} />
                    <PlayerAvatar user={u} className="w-11 h-11 rounded-xl shrink-0" />
                    <span className="min-w-0 flex-1 flex flex-col justify-center">
                        <strong className="block truncate text-sm">{name}</strong>
                        {u?.equipped?.titles && u.equipped.titles !== 'classic' && (
                            <div className="origin-right transform scale-75 -mt-1 text-right">
                                {renderPlayerTitle(u.equipped.titles)}
                            </div>
                        )}
                        <small className="text-slate-400 mt-0.5">{selected.includes(name) ? 'آمادهٔ دعوت ✓' : 'برای دعوت انتخاب کن'}</small>
                    </span>
                </label>
                );
            })}
            {!visibleNames.length && <p className="p-4 text-sm text-slate-400">دوستی برای نمایش پیدا نشد.</p>}
        </div>
    </section>;
};
