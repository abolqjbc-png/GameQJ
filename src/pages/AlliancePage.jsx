const AlliancePage = ({ currentUser, onUserUpdated, onOpenProfile }) => {
  const [alliance,setAlliance]=useState(()=>getUserAlliance(currentUser.username));
  const [tab,setTab]=useState('members');
  const [query,setQuery]=useState('');
  const [name,setName]=useState('');
  const [toast,setToast]=useState(null);
  const [message,setMessage]=useState('');
  const [donation,setDonation]=useState('');
  const [donateOpen,setDonateOpen]=useState(false);
  const [leaveOpen,setLeaveOpen]=useState(false);
  const [entryFee,setEntryFee]=useState(()=>getUserAlliance(currentUser.username)?.entryFee||0);
  const chatRef=useRef(null);

  // Global helper available to this page: getUserDiscounts.
  const refresh=()=>setAlliance(getUserAlliance(currentUser.username));
  useEffect(()=>{refresh();},[currentUser.username]);
  useEffect(()=>{const id=setInterval(refresh,1500);return()=>clearInterval(id);},[currentUser.username]);
  useEffect(()=>{setEntryFee(alliance?.entryFee||0);},[alliance?.id]);
  useEffect(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;},[alliance?.messages?.length,tab]);

  const feedback=(type,text)=>{setToast({type,text});setTimeout(()=>setToast(null),3500);};

  const leader=alliance?.creator;
  const isLeader=!!alliance&&leader?.toLowerCase()===currentUser.username.toLowerCase();
  const isAdmin=!!alliance&&isAllianceAdmin(currentUser.username,alliance);
  const memberNames=a=>(a?.members||[]).map(m=>typeof m==='string'?m:m.username);

  const create=()=>{const r=createAlliance(currentUser.username,name);if(!r.ok)return feedback('error',r.msg);setName('');onUserUpdated?.(r.user);refresh();feedback('success','آلیانز با موفقیت ساخته شد.');};
  const join=a=>{const r=joinAlliance(currentUser.username,a.id);if(!r.ok)return feedback('error',r.msg);onUserUpdated?.(r.user);refresh();feedback('success',r.pending?'درخواست عضویت ثبت شد و هزینه ورود پرداخت گردید؛ منتظر تأیید مدیران باشید.':`به آلیانز «${a.name}» پیوستید.`);};
  const submitMessage=e=>{e.preventDefault();if(sendAllianceMessage(currentUser.username,message)){setMessage('');refresh();}};
  const donate=()=>{const n=parseInt(donation,10);if(!donateAlliance(currentUser.username,n))return feedback('error','مبلغ یا موجودی کیوجی نامعتبر است.');onUserUpdated?.(findUser(currentUser.username));setDonateOpen(false);setDonation('');refresh();feedback('success','مبلغ به خزانه واریز شد.');};
  const upgrade=k=>{const r=upgradeAlliance(currentUser.username,k);if(!r.ok)return feedback('error',r.msg);refresh();feedback('success','ارتقا با موفقیت انجام شد.');};
  const saveFee=()=>{const n=Math.max(0,Math.min(100000,Number(entryFee)||0));if(!updateAllianceSettings(currentUser.username,n))feedback('error','مبلغ ورود نامعتبر است.');else{setEntryFee(n);refresh();feedback('success','شرایط ورود ذخیره شد.');}};
  const confirmLeave=()=>{const creator=isAllianceCreator(currentUser.username,alliance),ok=leaveAlliance(currentUser.username);setLeaveOpen(false);if(!ok)return feedback('error','خروج از آلیانز انجام نشد.');refresh();setTab('members');feedback('success',creator?'آلیانز منحل شد.':'از آلیانز خارج شدید.');};
  const toggleAdmin=username=>{const r=setAllianceAdmin(currentUser.username,username,!alliance.admins?.some(x=>x.toLowerCase()===username.toLowerCase()));if(!r.ok)return feedback('error',r.msg);refresh();feedback('success',r.msg||'وضعیت ادمین به‌روزرسانی شد.');};
  const respond=(req,accept)=>{const r=respondJoinRequest(currentUser.username,alliance.id,req.username,accept);if(!r.ok)feedback('error',r.msg);else feedback('success',accept?'درخواست عضویت پذیرفته شد.':'درخواست رد شد و مبلغ بازگردانده شد.');refresh();};

  const tabs=[['members','اعضای آلیانز','♟'],['chat','تالار چت گروهی','◉'],['services','خدمات و ارتقا','✦'],['settings','تنظیمات','⚙'],...(isAdmin?[['requests','درخواست‌ها','✉']]:[])];

  const card='rounded-2xl bg-white/[.04] border border-white/[.06] backdrop-blur-xl p-5 shadow-2xl shadow-black/40 transition-all duration-300 hover:border-indigo-400/30 hover:-translate-y-1';
  const btnBase='font-bold transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:pointer-events-none';
  const btnPrimary=`bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/40 ${btnBase}`;
  const btnEmerald=`bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-600/25 hover:shadow-emerald-500/40 ${btnBase}`;
  const btnRose=`bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-600/25 hover:shadow-rose-500/40 ${btnBase}`;
  const inputCls='w-full rounded-xl border border-white/10 bg-white/[.05] px-4 py-3 text-slate-100 placeholder-slate-500 outline-none transition-all duration-300 focus:border-indigo-400/50 focus:bg-white/[.08] focus:shadow-lg focus:shadow-indigo-500/10';

  const AvatarLetter=({u,size='w-10 h-10'})=>{
    const letter=(u?.username||'?').trim().charAt(0).toUpperCase();
    const hue=[...(u?.username||'x')].reduce((s,c)=>s+c.charCodeAt(0),0)%360;
    return <span className={`${size} shrink-0 rounded-full grid place-items-center font-black text-white shadow-lg ring-2 ring-white/10`}
      style={{background:`linear-gradient(135deg,hsl(${hue} 70% 45%),hsl(${(hue+60)%360} 70% 35%))`}}>{letter}</span>;
  };

  const style=<style>{`
    @keyframes alz2-rise{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
    @keyframes alz2-fadeSlide{from{opacity:0;transform:translateY(14px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes alz2-float{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-26px) scale(1.08)}}
    @keyframes alz2-shine{from{transform:translateX(-120%)}to{transform:translateX(220%)}}
    @keyframes alz2-toastIn{from{opacity:0;transform:translateY(-20px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes alz2-pop{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}
    @keyframes alz2-pulse{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,.45)}50%{box-shadow:0 0 0 12px rgba(99,102,241,0)}}
    @keyframes alz2-crown{0%,100%{transform:translateY(0) rotate(-6deg)}50%{transform:translateY(-3px) rotate(6deg)}}
    .alz2-scroll::-webkit-scrollbar{width:6px}
    .alz2-scroll::-webkit-scrollbar-thumb{background:rgba(99,102,241,.4);border-radius:99px}
  `}</style>;

  /* ---------- no alliance ---------- */
  if(!alliance) return <main className="mx-auto w-full max-w-6xl p-3 sm:p-6 text-slate-100" dir="rtl">
    {style}
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-l from-indigo-700 via-violet-700 to-fuchsia-700 p-8 sm:p-10 text-center shadow-2xl shadow-indigo-900/50 animate-[alz2-rise_.5s_cubic-bezier(.2,.8,.2,1)_both]">
      <div className="pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-fuchsia-400/30 blur-3xl animate-[alz2-float_7s_ease-in-out_infinite]"></div>
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-indigo-300/25 blur-3xl animate-[alz2-float_9s_ease-in-out_infinite_1s]"></div>
      <h1 className="relative text-3xl sm:text-4xl font-black text-white drop-shadow-lg animate-[alz2-fadeSlide_.5s_ease_both]">🛡️ آلیانزها</h1>
      <p className="relative mt-2 text-indigo-100/90 animate-[alz2-fadeSlide_.5s_ease_both]">به یک آلیانز بپیوندید یا آلیانز خودتان را بسازید و با تیم قوی‌تر شوید.</p>
    </section>

    <div className="mt-5 grid gap-5 lg:grid-cols-3">
      <section className={`${card} lg:col-span-2 animate-[alz2-fadeSlide_.45s_ease_both]`} style={{animationDelay:'80ms'}}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-black">🔍 جستجو و مرور آلیانزها</h2>
          <span className="text-sm text-slate-400">عضویت در آلیانز رایگان است*</span>
        </div>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="جستجوی نام آلیانز..." className={`${inputCls} mb-4`}/>
        <div className="space-y-3">
          {getAlliances().filter(a=>a.name.toLowerCase().includes(query.trim().toLowerCase())).map((a,i)=>{
            const pending=(a.joinRequests||[]).some(r=>r.username.toLowerCase()===currentUser.username.toLowerCase());
            const full=a.members.length>=a.capacity;
            const pct=Math.min(100,Math.round(a.members.length*100/a.capacity));
            return <div key={a.id} className="group flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[.06] bg-white/[.03] p-4 transition-all duration-300 hover:border-indigo-400/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-900/30 animate-[alz2-fadeSlide_.4s_ease_both]" style={{animationDelay:`${i*50}ms`}}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black group-hover:text-indigo-300 transition-colors duration-300">{a.name}</span>
                  <span className={`rounded-full px-2 py-.5 text-[11px] font-bold ${a.privacy==='private'?'border border-rose-400/40 bg-rose-500/10 text-rose-300':'border border-emerald-400/40 bg-emerald-500/10 text-emerald-300'}`}>{a.privacy==='private'?'پرایوت':'پابلیک'}</span>
                  <span className={`rounded-full px-2 py-.5 text-[11px] font-bold border ${a.entryFee?'border-amber-400/40 bg-amber-500/10 text-amber-300':'border-white/10 bg-white/5 text-slate-300'}`}>{a.entryFee?`${a.entryFee} کیوجی`:'رایگان'}</span>
                </div>
                <div className="mt-1 text-sm text-slate-400">رهبر: {a.creator} · اعضا: {a.members.length}/{a.capacity}</div>
                <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all duration-500" style={{width:`${pct}%`}}></div></div>
              </div>
              <button onClick={()=>join(a)} disabled={pending||full} className={`${pending?'border border-white/10 bg-white/5 text-slate-400':btnPrimary} rounded-xl px-5 py-2.5 ${btnBase}`}>{pending?'در انتظار تأیید':full?'تکمیل ظرفیت':'عضویت'}</button>
            </div>;
          })}
          {!getAlliances().some(a=>a.name.toLowerCase().includes(query.trim().toLowerCase()))&&<p className="py-6 text-center text-slate-400">آلیانزی پیدا نشد.</p>}
        </div>
      </section>

      <section className={`${card} animate-[alz2-fadeSlide_.45s_ease_both]`} style={{animationDelay:'160ms'}}>
        <h2 className="mb-2 text-xl font-black">✨ ساخت آلیانز</h2>
        <p className="mb-4 text-sm text-slate-400">هزینه ساخت: <b className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-.5 text-amber-300"><IconCoin className="h-4 w-4"/>۵۰۰</b></p>
        <input value={name} onChange={e=>setName(e.target.value)} maxLength={32} placeholder="نام آلیانز" className={`${inputCls} mb-3`}/>
        <button onClick={create} className={`${btnPrimary} w-full rounded-xl p-3 text-lg`}>ساخت آلیانز</button>
        <p className="mt-3 text-xs leading-6 text-slate-500">هر کاربر فقط می‌تواند عضو یک آلیانز باشد. نام‌های تکراری پذیرفته نمی‌شوند.</p>
      </section>
    </div>

    {toast&&<div className={`fixed top-4 right-1/2 translate-x-1/2 z-[110] rounded-xl border px-5 py-3 font-bold shadow-2xl animate-[alz2-toastIn_.35s_cubic-bezier(.2,.8,.2,1)_both] ${toast.type==='error'?'border-rose-400/40 bg-rose-500/15 text-rose-200 backdrop-blur-xl':'border-emerald-400/40 bg-emerald-500/15 text-emerald-200 backdrop-blur-xl'}`}>{toast.text}</div>}
  </main>;

  const pct=Math.min(100,Math.round((alliance.members?.length||0)*100/(alliance.capacity||1)));

  return <main className="mx-auto w-full max-w-6xl p-3 sm:p-6 text-slate-100" dir="rtl">
    {style}

    {toast&&<div className={`fixed top-4 right-1/2 translate-x-1/2 z-[110] rounded-xl border px-5 py-3 font-bold shadow-2xl animate-[alz2-toastIn_.35s_cubic-bezier(.2,.8,.2,1)_both] ${toast.type==='error'?'border-rose-400/40 bg-rose-500/15 text-rose-200 backdrop-blur-xl':'border-emerald-400/40 bg-emerald-500/15 text-emerald-200 backdrop-blur-xl'}`}>{toast.text}</div>}

    {/* hero header */}
    <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-l from-indigo-700 via-violet-700 to-fuchsia-700 p-6 sm:p-8 shadow-2xl shadow-indigo-900/40 animate-[alz2-rise_.5s_cubic-bezier(.2,.8,.2,1)_both]">
      <div className="pointer-events-none absolute -top-14 -right-8 h-52 w-52 rounded-full bg-fuchsia-400/30 blur-3xl animate-[alz2-float_7s_ease-in-out_infinite]"></div>
      <div className="pointer-events-none absolute -bottom-16 -left-8 h-56 w-56 rounded-full bg-indigo-300/25 blur-3xl animate-[alz2-float_9s_ease-in-out_infinite_1.2s]"></div>
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1/2 overflow-hidden"><div className="h-px w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[alz2-shine_4s_linear_infinite]"></div></div>
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white drop-shadow">🛡️ {alliance.name}</h1>
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${alliance.privacy==='private'?'border-rose-200/50 bg-rose-500/20 text-rose-100':'border-emerald-200/50 bg-emerald-500/20 text-emerald-50'}`}>{alliance.privacy==='private'?'پرایوت':'پابلیک'}</span>
          </div>
          <p className="mt-1 text-sm text-indigo-100/90">رهبر: {leader} · اعضا: {alliance.members.length}/{alliance.capacity}</p>
          <div className="mt-3 h-2 w-56 overflow-hidden rounded-full bg-black/25">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300 transition-all duration-700 animate-[alz2-pulse_2.6s_ease-in-out_infinite]" style={{width:`${pct}%`}}></div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-amber-300/40 bg-black/25 px-5 py-3 text-center backdrop-blur-md">
            <div className="text-xs text-amber-200">خزانه کیوجی</div>
            <b className="inline-flex items-center gap-1 text-xl text-amber-300"><IconCoin className="h-5 w-5"/>{(alliance.treasury||0).toLocaleString('fa-IR')}</b>
          </div>
          <button onClick={()=>setDonateOpen(true)} className={`rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-3 font-black text-slate-950 shadow-lg shadow-amber-500/30 hover:shadow-amber-400/50 ${btnBase}`}>واریز به خزانه</button>
        </div>
      </div>
    </header>

    {/* segmented tabs */}
    <nav className="relative mt-5 rounded-2xl border border-white/[.06] bg-white/[.03] p-1.5 backdrop-blur-xl animate-[alz2-fadeSlide_.4s_ease_both]">
      <div className="relative flex">
        <div className="absolute inset-y-0 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg shadow-indigo-600/30 transition-all duration-300"
          style={{width:`calc(${100/tabs.length}% - 6px)`,right:'3px',right:`calc(3px + ${tabs.findIndex(t=>t[0]===tab)*100/tabs.length}%)`,width:`calc(${100/tabs.length}% - 6px)`}}></div>
        {tabs.map(([id,label,icon])=><button key={id} onClick={()=>setTab(id)} className={`relative z-10 flex-1 rounded-xl px-2 py-2.5 text-xs sm:text-sm font-bold transition-all duration-300 ${tab===id?'text-white':'text-slate-400 hover:text-slate-200'}`}>{icon} {label}</button>)}
      </div>
    </nav>

    <div key={tab} className="mt-5 animate-[alz2-fadeSlide_.4s_ease_both]">

      {tab==='members'&&<section className={`${card} space-y-3`}>
        <h2 className="mb-4 text-xl font-black">👥 اعضای آلیانز</h2>
        {memberNames(alliance).map((username,i)=>{
          const u=findUser(username)||{username};
          const admin=alliance.admins?.some(x=>x.toLowerCase()===username.toLowerCase());
          const creator=username.toLowerCase()===leader.toLowerCase();
          return <div key={username} className="group flex items-center justify-between rounded-2xl border border-white/[.06] bg-white/[.03] p-3 transition-all duration-300 hover:border-indigo-400/30 hover:-translate-y-1 animate-[alz2-fadeSlide_.4s_ease_both]" style={{animationDelay:`${i*50}ms`}}>
            <button onClick={()=>onOpenProfile?.(username)} className="flex min-w-0 items-center gap-3">
              <span className="relative">
                <AvatarLetter u={u}/>
                {creator&&<span className="absolute -top-3 -left-2 text-amber-400 text-lg animate-[alz2-crown_1.6s_ease-in-out_infinite] drop-shadow">♛</span>}
              </span>
              <span className="text-right min-w-0">
                <b className="flex items-center gap-1">{username}{admin&&!creator&&<span className="text-amber-300">★</span>}</b>
                <span className="block text-xs text-slate-400">{creator?'سازنده آلیانز':admin?'ادمین آلیانز':'عضو'}{u.equipped?.title?` · ${u.equipped.title}`:''}</span>
              </span>
            </button>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {isLeader&&!creator&&<button onClick={()=>toggleAdmin(username)} className={`${btnPrimary} rounded-lg px-3 py-2 text-sm`}>{admin?'حذف ادمین':'ادمین'}</button>}
              {username.toLowerCase()===currentUser.username.toLowerCase()&&<button onClick={()=>setLeaveOpen(true)} className={`${btnRose} rounded-lg px-3 py-2 text-sm`}>خروج از آلیانز</button>}
            </div>
          </div>;
        })}
      </section>}

      {tab==='chat'&&<section className={`${card} flex min-h-[440px] flex-col`}>
        <div ref={chatRef} className="alz2-scroll mb-4 flex-1 space-y-3 overflow-y-auto p-1">
          {(alliance.messages||[]).map((m,i)=>{
            const own=m.sender?.toLowerCase()===currentUser.username.toLowerCase();
            return <div key={m.id} className={`flex items-end gap-3 animate-[alz2-fadeSlide_.35s_ease_both] ${own?'flex-row-reverse':''}`} style={{animationDelay:`${Math.min(i,20)*40}ms`}}>
              <AvatarLetter u={findUser(m.sender)||{username:m.sender}} size="w-8 h-8"/>
              <div className={`max-w-[75%] min-w-0 rounded-2xl px-4 py-2.5 shadow-lg ${own?'bg-gradient-to-l from-indigo-600 to-violet-600 text-white rounded-br-sm':'border border-white/[.06] bg-slate-800/80 text-slate-100 rounded-bl-sm'}`}>
                <div className={`flex gap-3 text-xs ${own?'text-indigo-200':'text-slate-400'}`}>
                  <button onClick={()=>onOpenProfile?.(m.sender)} className={`font-bold ${own?'text-amber-200 hover:underline':'text-indigo-300 hover:underline'}`}>{m.sender}</button>
                  <time>{new Date(m.createdAt).toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'})}</time>
                </div>
                <p className="break-words pt-1 leading-6">{m.text}</p>
              </div>
            </div>;
          })}
          {!alliance.messages?.length&&<p className="py-10 text-center text-slate-500">اولین پیام آلیانز را بنویسید.</p>}
        </div>
        <form onSubmit={submitMessage} className="flex gap-2">
          <input value={message} onChange={e=>setMessage(e.target.value)} maxLength={2000} placeholder="پیام خود را بنویسید..." className={inputCls}/>
          <button className={`${btnPrimary} rounded-xl px-6`}>ارسال</button>
        </form>
      </section>}

      {tab==='services'&&<section className="grid gap-4 md:grid-cols-3">
        {[['store','تخفیف فروشگاه',alliance.storeLevel||0],['game','تخفیف ورودی بازی‌ها',alliance.gameLevel||0]].map(([kind,label,level],i)=>
          <div key={kind} className={`${card} animate-[alz2-fadeSlide_.4s_ease_both]`} style={{animationDelay:`${i*60}ms`}}>
            <h3 className="text-lg font-black">{label}</h3>
            <div className="my-3 flex items-center gap-1.5">
              {[0,1,2,3,4,5].map(p=><span key={p} className={`h-2 flex-1 rounded-full transition-all duration-500 ${p<level?'bg-gradient-to-r from-emerald-400 to-green-500':'bg-white/10'}`}></span>)}
            </div>
            <p className="my-3">سطح {level} · تخفیف <b className="text-emerald-300">{Math.min(30,level*5)}٪</b></p>
            <p className="mb-4 text-sm text-slate-400">هزینه ارتقا: {300+level*200} کیوجی از خزانه</p>
            <button disabled={!isLeader||alliance.treasury<300+level*200||level>=6} onClick={()=>upgrade(kind)} className={`${btnPrimary} w-full rounded-xl p-2.5`}>ارتقای خدمت</button>
          </div>)}
        <div className={`${card} animate-[alz2-fadeSlide_.4s_ease_both]`} style={{animationDelay:'120ms'}}>
          <h3 className="text-lg font-black">ارتقای ظرفیت آلیانز</h3>
          <div className="my-3 flex items-center gap-1.5">
            {[0,1,2,3,4,5].map(p=><span key={p} className={`h-2 flex-1 rounded-full transition-all duration-500 ${alliance.capacity>=(p+1)*5?'bg-gradient-to-r from-indigo-400 to-fuchsia-500':'bg-white/10'}`}></span>)}
          </div>
          <p className="my-3">ظرفیت فعلی: <b>{alliance.capacity}</b> / ۳۰ نفر</p>
          <p className="mb-4 text-sm text-slate-400">۵ عضو بیشتر · ۳۰۰ کیوجی از خزانه</p>
          <button disabled={!isLeader||alliance.treasury<300||alliance.capacity>=30} onClick={()=>upgrade('capacity')} className={`${btnPrimary} w-full rounded-xl p-2.5`}>ارتقای ظرفیت</button>
        </div>
        <div className={`${card} md:col-span-3 animate-[alz2-fadeSlide_.4s_ease_both]`} style={{animationDelay:'180ms'}}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black">💰 واریز به خزانه</h3>
              <p className="mt-1 text-sm text-slate-400">با واریز کیوجی، خزانه برای ارتقاها شارژ می‌شود. موجودی شما: {currentUser.coins?.toLocaleString('fa-IR')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[100,500,1000].map(v=><button key={v} onClick={()=>{setDonateOpen(true);setDonation(String(v));}} className={`rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-2 font-bold text-amber-300 transition-all duration-200 hover:bg-amber-500/20 active:scale-95`}>{v}</button>)}
              <button onClick={()=>setDonateOpen(true)} className={`rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-2 font-bold text-white shadow-lg shadow-emerald-600/25 ${btnBase}`}>واریز به خزانه</button>
            </div>
          </div>
        </div>
      </section>}

      {tab==='settings'&&<section className={`${card} space-y-7`}>
        <h2 className="text-xl font-black">⚙️ تنظیمات آلیانز</h2>
        {isAdmin?<>
          <div className="rounded-2xl border border-white/[.06] bg-white/[.03] p-5">
            <label className="mb-2 block font-bold">هزینه ورود (۰ برای رایگان)</label>
            <div className="flex max-w-md gap-2">
              <input type="number" min="0" max="100000" value={entryFee} onChange={e=>setEntryFee(e.target.value)} className={inputCls}/>
              <button onClick={saveFee} className={`${btnPrimary} rounded-xl px-6`}>ذخیره</button>
            </div>
            <p className="mt-2 text-sm text-slate-400">هزینه ورود اعضای جدید مستقیماً به خزانه واریز می‌شود.</p>
          </div>
          {isLeader&&<>
            <div className="rounded-2xl border border-white/[.06] bg-white/[.03] p-5">
              <h3 className="mb-3 font-bold">نوع عضویت</h3>
              <div className="inline-flex rounded-xl border border-white/10 bg-black/25 p-1">
                {[['public','پابلیک'],['private','پرایوت']].map(([value,label])=>
                  <button key={value} onClick={()=>{if(setAlliancePrivacy(currentUser.username,value)){refresh();feedback('success','تنظیم حریم عضویت ذخیره شد.');}else feedback('error','ذخیره تنظیم حریم عضویت ناموفق بود.');}}
                    className={`rounded-lg px-6 py-2 font-bold transition-all duration-300 active:scale-95 ${alliance.privacy===value?'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-600/25':'text-slate-300 hover:text-white'}`}>{label}</button>)}
              </div>
              <div className="mt-4 rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-4 text-sm leading-7 text-indigo-100/80">
                پابلیک: هر بازیکن بلافاصله پس از پرداخت هزینه ورود (در صورت وجود ظرفیت) عضو می‌شود. پرایوت: پس از پرداخت هزینه ورود، درخواست عضویت در بخش «درخواست‌ها» ثبت می‌شود و سازنده یا ادمین‌ها می‌توانند پروفایل درخواست‌کننده (برد، باخت، کیوجی) را ببینند و قبول یا رد کنند؛ در صورت رد، مبلغ بازگردانده می‌شود.
              </div>
            </div>
            <div className="rounded-2xl border border-white/[.06] bg-white/[.03] p-5">
              <h3 className="mb-3 font-bold">مدیریت ادمین‌ها</h3>
              {(alliance.admins||[]).length?alliance.admins.map((u,i)=>
                <div key={u} className="mb-2 flex items-center justify-between rounded-2xl border border-white/[.06] bg-white/[.03] p-3 transition-all duration-300 hover:border-indigo-400/30 animate-[alz2-fadeSlide_.4s_ease_both]" style={{animationDelay:`${i*50}ms`}}>
                  <button onClick={()=>onOpenProfile?.(u)} className="flex items-center gap-2 font-bold"><span className="text-amber-300">★</span>{u}</button>
                  <button onClick={()=>{const r=setAllianceAdmin(currentUser.username,u,false);if(!r.ok)return feedback('error',r.msg);refresh();feedback('success',r.msg||'ادمین حذف شد.');}} className={`${btnRose} rounded-lg px-3 py-2 text-sm`}>حذف ادمین</button>
                </div>):<p className="text-sm text-slate-400">ادمینی ثبت نشده است؛ از فهرست اعضا ادمین اضافه کنید.</p>}
            </div>
          </>}
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/[.06] p-5">
            <h3 className="mb-1 font-black text-rose-300">⚠️ Danger Zone</h3>
            <p className="mb-4 text-sm text-rose-200/70">خروج از آلیانز قابل بازگشت نیست{isLeader?' و با خروج شما آلیانز برای همیشه منحل می‌شود.':'.'}</p>
            <button onClick={()=>setLeaveOpen(true)} className={`${btnRose} rounded-xl px-5 py-2.5`}>{isLeader?'انحلال آلیانز':'خروج از آلیانز'}</button>
          </div>
        </>:<p className="text-slate-400">تنظیمات فقط برای سازنده یا ادمین آلیانز قابل ویرایش است.</p>}
      </section>}

      {tab==='requests'&&isAdmin&&<section className={`${card} space-y-3`}>
        <h2 className="mb-4 text-xl font-black">✉️ درخواست‌های عضویت</h2>
        {[...(alliance.joinRequests||[])].sort((a,b)=>new Date(b.at)-new Date(a.at)).map((req,i)=>{
          const u=findUser(req.username)||{username:req.username,coins:0,stats:{}};
          return <div key={`${req.username}-${req.at}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[.06] bg-white/[.03] p-4 transition-all duration-300 hover:border-indigo-400/30 hover:-translate-y-1 animate-[alz2-fadeSlide_.4s_ease_both]" style={{animationDelay:`${i*50}ms`}}>
            <div className="flex flex-wrap items-center gap-3">
              <AvatarLetter u={u}/>
              <button onClick={()=>onOpenProfile?.(req.username)} className="font-bold text-indigo-300 hover:underline">{req.username}</button>
              <span className="text-sm text-slate-300">برد: {u.stats?.wins||0} · باخت: {u.stats?.losses||0} · کیوجی: {(u.coins||0).toLocaleString('fa-IR')}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>respond(req,true)} className={`${btnEmerald} rounded-xl px-5 py-2 text-sm`}>قبول</button>
              <button onClick={()=>respond(req,false)} className={`${btnRose} rounded-xl px-5 py-2 text-sm`}>رد</button>
            </div>
          </div>;
        })}
        {!alliance.joinRequests?.length&&<p className="py-6 text-center text-slate-400">درخواستی وجود ندارد.</p>}
      </section>}
    </div>

    {leaveOpen&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={()=>setLeaveOpen(false)}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl animate-[alz2-pop_.3s_cubic-bezier(.2,.8,.2,1)_both]" onClick={e=>e.stopPropagation()}>
        <h3 className="mb-3 text-xl font-black">خروج از آلیانز</h3>
        <p className="mb-5 leading-7 text-slate-300">{isLeader?<span className="font-bold text-rose-300">با خروج شما آلیانز منحل می‌شود! ادامه می‌دهید؟</span>:'آیا از خروج از آلیانز مطمئن هستید؟'}</p>
        <div className="flex gap-2">
          <button onClick={confirmLeave} className={`${btnRose} flex-1 rounded-xl p-3`}>تأیید خروج</button>
          <button onClick={()=>setLeaveOpen(false)} className="rounded-xl border border-white/15 px-4 font-bold text-slate-300 transition-all duration-200 hover:bg-white/5 active:scale-95">انصراف</button>
        </div>
      </div>
    </div>}

    {donateOpen&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={()=>setDonateOpen(false)}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl animate-[alz2-pop_.3s_cubic-bezier(.2,.8,.2,1)_both]" onClick={e=>e.stopPropagation()}>
        <h3 className="mb-3 text-xl font-black">واریز به خزانه</h3>
        <p className="mb-3 text-sm text-slate-400">موجودی شما: {currentUser.coins?.toLocaleString('fa-IR')} کیوجی</p>
        <div className="mb-3 flex gap-2">{[100,500,1000].map(v=><button key={v} type="button" onClick={()=>setDonation(String(v))} className={`flex-1 rounded-lg border px-2 py-1.5 text-sm font-bold transition-all duration-200 active:scale-95 ${Number(donation)===v?'border-amber-400/60 bg-amber-500/20 text-amber-200':'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}>{v}</button>)}</div>
        <input type="number" min="1" value={donation} onChange={e=>setDonation(e.target.value)} placeholder="مبلغ کیوجی" className={`${inputCls} mb-4`}/>
        <div className="flex gap-2">
          <button onClick={donate} className={`${btnEmerald} flex-1 rounded-xl p-3`}>واریز</button>
          <button onClick={()=>setDonateOpen(false)} className="rounded-xl border border-white/15 px-4 font-bold text-slate-300 transition-all duration-200 hover:bg-white/5 active:scale-95">انصراف</button>
        </div>
      </div>
    </div>}
  </main>;
};
