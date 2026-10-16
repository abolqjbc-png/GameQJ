const canViewLastSeen = (viewer, subject) =>
    (viewer?.settings?.showLastSeen ?? true) && (subject?.settings?.showLastSeen ?? true);

const formatLastSeen = (iso, isVisible = true) => {
    if (!isVisible) return 'نمایش داده نمی‌شود';
    const d = new Date(iso);
    if (isNaN(d)) return 'نامشخص';
    if (Date.now() - d.getTime() < 90000) return 'هم‌اکنون آنلاین';
    return d.toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' });
};
