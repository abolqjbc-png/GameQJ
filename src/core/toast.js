// ---------- نوتیف‌های سراسری (بالای صفحه، روی همه‌ی تب‌ها) ----------
// از هر جای برنامه صدا بزنید:  showToast({ id, type, title, text, duration, showTimer, actions })
//   type     : 'request' | 'waiting' | 'success' | 'error' | 'info'
//   duration : مدت نمایش به میلی‌ثانیه (پیش‌فرض ۵۰۰۰)
//   actions  : [{ label, variant: 'success'|'danger'|'neutral', onClick }]
const TOAST_EVENT = 'gq:toast';
const showToast = (toast) => window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { action: 'show', toast } }));
const hideToast = (id) => window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { action: 'hide', id } }));
