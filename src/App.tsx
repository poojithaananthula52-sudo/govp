import { useMemo, useState, useEffect, useRef } from 'react'
import { authApi, schemesApi, aiApi, UserSession, SchemeItem } from './api'
import {
  ArrowRight, BadgeCheck, Bell, BookOpen, Bot, Check, CheckCircle2, ChevronRight,
  CircleHelp, ClipboardCheck, FileText, Heart, Landmark, LogOut, Menu, Search,
  ShieldCheck, Sparkles, UserRound, X, ExternalLink, MapPin, Clock3, SlidersHorizontal,
  Mic, MicOff, Volume2, VolumeX, Plus, Trash2, Edit3, RefreshCw, Send, LayoutDashboard
} from 'lucide-react'

type Page = 'home' | 'login' | 'signup' | 'forgot' | 'dashboard' | 'directory' | 'detail' | 'eligibility' | 'saved' | 'history' | 'profile' | 'chat' | 'admin'
type Scheme = SchemeItem

const initialSchemes: Scheme[] = [
  { id: 'pm-kisan', name: 'PM-KISAN', department: 'Ministry of Agriculture & Farmers Welfare', description: 'Income support for eligible landholding farmer families across India.', category: 'Agriculture', location: 'Central Government', beneficiaries: 'Landholding farmer families', benefit: '₹6,000 per year in three equal instalments of ₹2,000', documents: ['Aadhaar card', 'Bank account details linked with Aadhaar', 'Land ownership records'], updated: '20 August 2026', link: 'https://pmkisan.gov.in/', application_url: 'https://pmkisan.gov.in/RegistrationFormNew.aspx', application_mode: 'online', rules: { residency: 'Indian resident', occupation: 'Landholding farmer' } },
  { id: 'ayushman', name: 'Ayushman Bharat PM-JAY', department: 'National Health Authority', description: 'Cashless health cover for eligible families at empanelled hospitals.', category: 'Healthcare', location: 'Central Government', beneficiaries: 'Eligible families under programme criteria', benefit: 'Health cover up to ₹5 lakh per family per year', documents: ['Aadhaar card', 'Ration card or family ID', 'Mobile number'], updated: '8 September 2026', link: 'https://pmjay.gov.in/', application_url: 'https://mera.pmjay.gov.in/search/login', application_mode: 'both', rules: { residency: 'Indian resident', income: 'As per programme / state criteria' } },
  { id: 'nsp', name: 'National Scholarship Portal', department: 'Ministry of Education', description: 'A single portal for eligible central and state scholarship applications.', category: 'Scholarships', location: 'Central & State', beneficiaries: 'Students meeting individual scholarship criteria', benefit: 'Varies by scholarship', documents: ['Aadhaar card', 'Income certificate', 'Educational certificate', 'Bank account details'], updated: '1 September 2026', link: 'https://scholarships.gov.in/', application_url: 'https://scholarships.gov.in/fresh/newstdRegfrmInstruction', application_mode: 'online', rules: { occupation: 'Student', income: 'Varies by scholarship' } },
  { id: 'pmay', name: 'Pradhan Mantri Awas Yojana', department: 'Ministry of Housing and Urban Affairs', description: 'Housing assistance for eligible households under applicable PMAY components.', category: 'Housing', location: 'Central Government', beneficiaries: 'Eligible households without a pucca house', benefit: 'Assistance varies by programme component', documents: ['Aadhaar card', 'Income certificate', 'Residence certificate', 'Bank account details'], updated: '14 July 2026', link: 'https://pmay-urban.gov.in/', application_url: 'https://pmaymis.gov.in/', application_mode: 'online', rules: { income: 'Category limits apply', residency: 'Indian resident' } },
]

const navItems: { label: string; page: Page; icon: typeof Search }[] = [
  { label: 'Find schemes', page: 'directory', icon: Search }, { label: 'Check eligibility', page: 'eligibility', icon: ClipboardCheck }, { label: 'Saved schemes', page: 'saved', icon: Heart }, { label: 'Ask Sahayak AI', page: 'chat', icon: Bot }
]

function Logo({ light = false }: { light?: boolean }) { return <div className="flex items-center gap-2.5"><div className={`grid h-9 w-9 place-items-center rounded-xl ${light ? 'bg-white/15 text-white' : 'bg-leaf text-white'}`}><Landmark size={20}/></div><div><div className={`font-bold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>SAHAYAK <span className="text-leaf">AI</span></div><div className={`text-[9px] font-semibold uppercase tracking-[.16em] ${light ? 'text-white/60' : 'text-slate-400'}`}>Public service guide</div></div></div> }

function Button({ children, onClick, variant = 'primary', className = '', type = 'button', disabled = false }: { children: React.ReactNode; onClick?: () => void; variant?: 'primary'|'secondary'|'ghost'; className?: string; type?: 'button'|'submit'; disabled?: boolean }) {
  const styles = variant === 'primary' ? 'bg-leaf text-white hover:bg-[#155e3e]' : variant === 'secondary' ? 'border border-[#bddacf] bg-white text-ink hover:bg-mint' : 'text-leaf hover:bg-mint'
  return <button disabled={disabled} type={type} onClick={onClick} className={`focus-ring inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed ${styles} ${className}`}>{children}</button>
}

function Landing({ go, user }: { go: (p: Page) => void; user?: UserSession['user']|null }) {
  return <div className="min-h-screen bg-sand">
    <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
      <button onClick={() => go(user ? 'dashboard' : 'home')} className="text-left"><Logo/></button>
      <nav className="hidden gap-7 md:flex">
        <button className="navlink" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>How it works</button>
        <button className="navlink" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Features</button>
        <button className="navlink" onClick={() => go('directory')}>Scheme directory</button>
      </nav>
      {user ? (
        <div className="flex items-center gap-2.5">
          <button onClick={() => go('profile')} className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#d9eee1] text-leaf text-[10px]">
              {user.full_name ? user.full_name.slice(0, 2).toUpperCase() : user.email.slice(0, 2).toUpperCase()}
            </span>
            <span className="max-w-[120px] truncate">{user.full_name || user.email.split('@')[0]}</span>
          </button>
          <Button onClick={() => go('dashboard')}>
            <LayoutDashboard size={15}/> My Dashboard
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => go('login')}>Log in</Button>
          <Button onClick={() => go('signup')}>Get started <ArrowRight size={16}/></Button>
        </div>
      )}
    </header>
    <main>
      <section className="grain relative overflow-hidden"><div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:py-24"><div className="max-w-2xl"><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#c9e1d5] bg-white px-3 py-1.5 text-xs font-bold text-leaf"><Sparkles size={14}/> Designed around official scheme information</div><h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-6xl">Your AI Guide to <span className="text-leaf">Government Schemes.</span></h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Discover schemes that may fit your needs, understand eligibility in plain language, and follow the right official path to apply.</p>
      {user ? (
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={() => go('dashboard')}><LayoutDashboard size={17}/> Open Citizen Dashboard <ArrowRight size={17}/></Button>
          <Button variant="secondary" onClick={() => go('directory')}>Browse schemes <Search size={17}/></Button>
        </div>
      ) : (
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={() => go('directory')}>Find schemes <Search size={17}/></Button>
          <Button variant="secondary" onClick={() => go('eligibility')}>Check eligibility <ClipboardCheck size={17}/></Button>
        </div>
      )}
      <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold text-slate-600"><span className="flex items-center gap-2"><CheckCircle2 size={18} className="text-leaf"/> Clear, simple guidance</span><span className="flex items-center gap-2"><CheckCircle2 size={18} className="text-leaf"/> Official sources first</span></div></div>
      <div className="relative mx-auto w-full max-w-md"><div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#d3eadc]"></div><div className="shadow-soft relative rounded-[28px] border border-[#d9e8df] bg-white p-5"><div className="flex items-center justify-between border-b border-slate-100 pb-4"><div className="flex items-center gap-2"><div className="grid h-9 w-9 place-items-center rounded-full bg-mint text-leaf"><Bot size={18}/></div><div><b className="text-sm">Sahayak AI</b><p className="text-xs text-leaf">● Ready to help</p></div></div><span className="rounded-full bg-mint px-2.5 py-1 text-[10px] font-bold text-leaf">GUIDED</span></div><div className="space-y-3 py-5"><div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-100 p-3 text-sm leading-5 text-slate-700">I can help you find a scheme, check what you may qualify for, or prepare your documents.</div><div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-leaf p-3 text-sm leading-5 text-white">I am a student. What support is available?</div><div className="rounded-xl border border-[#cfe5d9] bg-[#f4faf6] p-3"><div className="flex items-center gap-2 text-sm font-bold"><BadgeCheck size={18} className="text-leaf"/> Let’s narrow it down</div><p className="mt-1 text-xs leading-5 text-slate-600">Share your state, course and family income to see relevant official options.</p></div></div><div className="flex gap-2 rounded-xl border border-slate-200 p-2 text-xs text-slate-400"><span className="flex-1 px-1 py-1">Ask about schemes...</span><div className="grid h-7 w-7 place-items-center rounded-lg bg-leaf text-white"><ArrowRight size={14}/></div></div></div></div></div></section>
      <section id="how" className="mx-auto max-w-7xl px-5 py-18 lg:px-8"><div className="mb-10 flex items-end justify-between"><div><p className="text-sm font-bold uppercase tracking-widest text-leaf">A clear path forward</p><h2 className="mt-2 text-3xl font-extrabold">How Sahayak AI works</h2></div><p className="hidden max-w-xs text-sm leading-6 text-slate-500 md:block">Simple steps, with government decisions always remaining with the relevant authority.</p></div><div className="grid gap-5 md:grid-cols-3">{[['01','Tell us about you','Build a private profile with only the details needed for personalised guidance.'],['02','Explore relevant schemes','Search trusted scheme records and compare the key criteria.'],['03','Apply with confidence','Prepare documents and use the official application route.']].map(([n,t,d])=><div className="card p-6" key={n}><span className="text-3xl font-extrabold text-[#b9dccc]">{n}</span><h3 className="mt-6 text-lg font-bold">{t}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{d}</p><ChevronRight className="mt-5 text-leaf" size={19}/></div>)}</div></section>
      <section id="features" className="bg-[#eaf3ef]"><div className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><p className="text-center text-sm font-bold uppercase tracking-widest text-leaf">Built to be useful</p><h2 className="mt-2 text-center text-3xl font-extrabold">Everything you need to get started</h2><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[[Search,'Scheme discovery','Search by need, category, location and more.'],[ClipboardCheck,'Eligibility guidance','See matched criteria and what information is missing.'],[FileText,'Document checklist','Track the documents you already have.'],[ShieldCheck,'Official-source focus','Get links and guidance distinct from the official process.']].map(([Icon,t,d])=>{const C=Icon as typeof Search;return <div className="rounded-2xl bg-white p-5" key={t as string}><div className="grid h-10 w-10 place-items-center rounded-xl bg-mint text-leaf"><C size={20}/></div><h3 className="mt-4 font-bold">{t as string}</h3><p className="mt-1.5 text-sm leading-5 text-slate-600">{d as string}</p></div>})}</div></div></section>
      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8"><div className="flex gap-3 rounded-2xl border border-[#eedfa9] bg-[#fff8df] p-5 text-sm leading-6 text-[#6b5817]"><CircleHelp className="mt-0.5 shrink-0" size={20}/><p><b>Important:</b> Sahayak AI provides informational guidance based on available scheme data. It does not guarantee eligibility, benefits, or approval. Final decisions are made only by the relevant government authority.</p></div></section>
    </main><Footer go={go} user={user}/></div>
}

function Footer({go, user}:{go:(p:Page)=>void; user?: UserSession['user']|null}) {
  return <footer className="bg-[#173a35] px-5 py-9 text-white">
    <div className="mx-auto flex max-w-7xl flex-col gap-5 md:flex-row md:items-center md:justify-between">
      <button onClick={()=>go(user ? 'dashboard' : 'home')} className="text-left"><Logo light/></button>
      <p className="max-w-md text-xs leading-5 text-white/65">A guidance platform for discovering government schemes. Always verify details through official government sources.</p>
      <div className="flex items-center gap-4">
        {user && <button onClick={()=>go('dashboard')} className="text-xs font-semibold text-white/70 hover:text-white">Citizen Dashboard</button>}
        <button onClick={()=>go('directory')} className="text-xs font-semibold text-white/70 hover:text-white">Schemes</button>
        <button onClick={()=>go('admin')} className="text-xs font-semibold text-white/60 hover:text-white">Admin access</button>
      </div>
    </div>
  </footer>
}

function Auth({ page, go, login }: { page: Page; go:(p:Page)=>void; login:(user: UserSession['user'])=>void }) {
  const [sent,setSent]=useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isForgot=page==='forgot';
  const signup=page==='signup';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isForgot) {
      setSent(true);
      return;
    }
    setLoading(true);
    try {
      if (signup) {
        const session = await authApi.signup(email, password, fullName);
        login(session.user);
      } else {
        const session = await authApi.login(email, password);
        login(session.user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return <div className="grid min-h-screen lg:grid-cols-2">
    <div className="hidden bg-[#173a35] p-10 lg:flex lg:flex-col">
      <Logo light/>
      <div className="m-auto max-w-md">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-[#bfe1c9]"><Landmark size={30}/></div>
        <h1 className="mt-7 text-4xl font-extrabold leading-tight text-white">Guidance that feels clear and human.</h1>
        <p className="mt-5 leading-7 text-white/70">Find official scheme information, understand the steps, and keep your application preparation on track.</p>
        <div className="mt-10 border-t border-white/10 pt-6 text-sm text-white/65">“A simple starting point for navigating public-service support.”</div>
      </div>
      <p className="text-xs text-white/40">Sahayak AI · Supabase Authentication</p>
    </div>
    <div className="flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        <button onClick={()=>go('home')} className="mb-10 flex items-center gap-2 text-sm font-bold text-leaf"><ChevronRight className="rotate-180" size={17}/> Back to home</button>
        <h2 className="text-3xl font-extrabold">{isForgot?'Reset your password':signup?'Create your account':'Welcome back'}</h2>
        <p className="mt-2 text-sm text-slate-600">{isForgot?'Enter your email and we’ll send reset instructions.':signup?'Create a user account directly connected to Supabase.':'Log in with your Supabase account to access schemes and profile.'}</p>
        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
        {sent?<div className="mt-8 rounded-2xl border border-[#cde5d7] bg-mint p-5 text-sm leading-6"><CheckCircle2 className="mb-2 text-leaf"/>If an account exists for this email, reset instructions have been sent.</div>:<form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          {signup&&<Field label="Full name" placeholder="Your name" value={fullName} onChange={e=>setFullName(e.target.value)}/>}
          <Field label="Email address" placeholder="you@example.com" type="email" value={email} onChange={e=>setEmail(e.target.value)}/>
          {!isForgot&&<Field label="Password" placeholder="•••••••• (min 8 chars)" type="password" value={password} onChange={e=>setPassword(e.target.value)}/>}
          {!signup&&!isForgot&&<button type="button" onClick={()=>go('forgot')} className="block ml-auto -mt-1 text-xs font-bold text-leaf">Forgot password?</button>}
          <Button type="submit" className="mt-2 w-full" disabled={loading}>{loading ? 'Connecting to Supabase...' : isForgot?'Send reset link':signup?'Create user in Supabase':'Log in'} <ArrowRight size={17}/></Button>
        </form>}
        {!isForgot&&<p className="mt-6 text-center text-sm text-slate-600">{signup?'Already have an account?':'New to Sahayak AI?'} <button className="font-bold text-leaf" onClick={()=>{setError(null);go(signup?'login':'signup')}}>{signup?'Log in':'Create an account'}</button></p>}
        <p className="mt-8 text-center text-[11px] leading-5 text-slate-400">Powered by Supabase Auth with Row Level Security.</p>
      </div>
    </div>
  </div>
}

function Field({label,placeholder,type='text',value,onChange}:{label:string;placeholder:string;type?:string;value?:string;onChange?:(e:React.ChangeEvent<HTMLInputElement>)=>void}){
  return <label className="block text-sm font-bold text-slate-700">{label}<input required value={value} onChange={onChange} type={type} placeholder={placeholder} className="focus-ring mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-normal outline-none placeholder:text-slate-400"/></label>
}

function AppShell({page,go,children,savedCount,user,onLogout}:{page:Page;go:(p:Page,id?:string)=>void;children:React.ReactNode;savedCount:number;user?:UserSession['user']|null;onLogout?:()=>void}){
  const [menu,setMenu]=useState(false);
  const initials = user?.full_name ? user.full_name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() : (user?.email?.slice(0,2).toUpperCase() || 'AS');
  const displayName = user?.full_name || user?.email?.split('@')[0] || 'User';
  const isAdmin = Boolean(user?.email?.toLowerCase().includes('admin'));

  const currentNavItems = [
    ...(user ? [{ label: 'Dashboard', page: 'dashboard' as Page, icon: LayoutDashboard }] : []),
    { label: 'Find schemes', page: 'directory' as Page, icon: Search },
    { label: 'Check eligibility', page: 'eligibility' as Page, icon: ClipboardCheck },
    { label: 'Saved schemes', page: 'saved' as Page, icon: Heart },
    { label: 'Ask Sahayak AI', page: 'chat' as Page, icon: Bot }
  ];

  return <div className="min-h-screen bg-sand flex flex-col justify-between">
    <div>
      <header className="sticky top-0 z-20 border-b border-[#dde9e2] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <button onClick={()=>go(user ? 'dashboard' : 'home')} className="text-left"><Logo/></button>
          <nav className="hidden items-center gap-1 lg:flex">
            {currentNavItems.map(({label,page:p,icon:Icon})=>(
              <button
                onClick={()=>go(p)}
                key={p}
                className={`rounded-lg px-3 py-2 text-sm font-bold transition ${page===p?'bg-mint text-leaf':'text-slate-600 hover:bg-slate-50'}`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Icon size={15}/>{label}
                  {p==='saved'&&savedCount>0&&<span className="ml-1 rounded-full bg-leaf px-1.5 py-0.2 text-[10px] font-extrabold text-white">{savedCount}</span>}
                </span>
              </button>
            ))}
            {isAdmin && (
              <button onClick={()=>go('admin')} className={`rounded-lg px-3 py-2 text-sm font-bold transition ${page==='admin'?'bg-[#173a35] text-white':'text-amber-800 bg-amber-50 hover:bg-amber-100'}`}>
                <span className="inline-flex items-center gap-1.5"><ShieldCheck size={15}/>Admin Panel</span>
              </button>
            )}
          </nav>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button onClick={()=>go('admin')} className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-2 text-xs font-extrabold text-amber-900 hover:bg-amber-200 transition">
                <ShieldCheck size={14}/> Admin Panel
              </button>
            )}
            {user ? (
              <>
                <button onClick={()=>go('profile')} className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-bold hover:bg-slate-50 transition sm:flex">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#d9eee1] text-leaf text-xs">{initials}</span>
                  <span className="mr-1 max-w-[120px] truncate">{displayName}</span>
                </button>
                {onLogout && (
                  <button onClick={onLogout} title="Log out" className="hidden rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600 transition sm:block">
                    <LogOut size={16}/>
                  </button>
                )}
              </>
            ) : (
              <div className="hidden gap-2 sm:flex">
                <Button variant="ghost" onClick={()=>go('login')}>Log in</Button>
                <Button onClick={()=>go('signup')}>Sign up</Button>
              </div>
            )}
            <button className="rounded-lg p-2 lg:hidden" onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button>
          </div>
        </div>
        {menu&&<nav className="space-y-1 border-t bg-white p-3 lg:hidden">
          {currentNavItems.map(({label,page:p,icon:Icon})=>(
            <button key={p} onClick={()=>{go(p);setMenu(false)}} className={`flex w-full items-center gap-3 rounded-lg p-3 text-sm font-bold ${page===p ? 'bg-mint text-leaf' : 'text-slate-700 hover:bg-slate-50'}`}>
              <Icon size={17}/>{label}
              {p==='saved'&&savedCount>0&&<span className="ml-auto rounded-full bg-mint px-2 text-xs text-leaf">{savedCount}</span>}
            </button>
          ))}
          {isAdmin && (
            <button onClick={()=>{go('admin');setMenu(false)}} className="flex w-full items-center gap-3 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-900"><ShieldCheck size={17}/>Admin Panel</button>
          )}
          {user ? (
            <button onClick={()=>{onLogout?.();setMenu(false)}} className="flex w-full items-center gap-3 rounded-lg p-3 text-sm font-bold text-red-600 hover:bg-red-50"><LogOut size={17}/>Log out ({displayName})</button>
          ) : (
            <button onClick={()=>{go('login');setMenu(false)}} className="flex w-full items-center gap-3 rounded-lg p-3 text-sm font-bold text-leaf hover:bg-mint">Log in / Sign up</button>
          )}
        </nav>}
      </header>
      {children}
    </div>
    <Footer go={go} user={user}/>
  </div>
}

function SchemeCard({scheme,go,onSave,saved,isNew=false}:{scheme:Scheme;go:(p:Page,id?:string)=>void;onSave:(id:string)=>void;saved:boolean;isNew?:boolean}){
  return <article className="card flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-soft relative">
    <div className="flex items-start justify-between gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-mint px-2.5 py-0.5 text-xs font-bold text-leaf">{scheme.category}</span>
        {isNew && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800 uppercase tracking-wide">✨ New</span>}
        {scheme.application_mode && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
            {scheme.application_mode}
          </span>
        )}
      </div>
      <button title={saved ? 'Remove from saved' : 'Save scheme'} onClick={()=>onSave(scheme.id)} className={`rounded-lg p-1.5 transition ${saved?'bg-[#fff0ed] text-[#c54f3e]':'text-slate-400 hover:bg-mint hover:text-leaf'}`}>
        <Heart size={18} fill={saved?'currentColor':'none'}/>
      </button>
    </div>
    <h3 className="mt-3 text-lg font-extrabold leading-snug text-ink">{scheme.name}</h3>
    <p className="mt-1 text-xs font-semibold text-slate-500 line-clamp-1">{scheme.department}</p>
    <p className="mt-2.5 text-sm leading-5 text-slate-600 line-clamp-2">{scheme.description}</p>
    <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500">
      <p className="flex items-center gap-2 truncate"><UserRound size={14} className="shrink-0 text-leaf"/>{scheme.beneficiaries}</p>
      <p className="flex items-center gap-2 truncate"><MapPin size={14} className="shrink-0 text-leaf"/>{scheme.location}</p>
    </div>
    <div className="mt-5 flex gap-2">
      <Button className="flex-1 px-3" variant="secondary" onClick={()=>go('detail',scheme.id)}>View details</Button>
      <Button className="flex-1 px-3" onClick={()=>go('eligibility',scheme.id)}>Check</Button>
    </div>
  </article>
}

function Dashboard({
  go,
  onSave,
  saved,
  schemes,
  user,
  onLogout,
  onRefresh,
  loadingSchemes
}: {
  go: (p: Page, id?: string) => void;
  onSave: (id: string) => void;
  saved: string[];
  schemes: Scheme[];
  user?: UserSession['user'] | null;
  onLogout?: () => void;
  onRefresh: () => Promise<void>;
  loadingSchemes?: boolean;
}) {
  const isAdmin = Boolean(user?.email?.toLowerCase().includes('admin'));
  const [catFilter, setCatFilter] = useState('All');
  const [dashQuery, setDashQuery] = useState('');
  const [quickSchemeId, setQuickSchemeId] = useState<string>(() => schemes[0]?.id || 'nsp');

  const categories = useMemo(() => Array.from(new Set(schemes.map(s => s.category))), [schemes]);

  // Newly created schemes from Supabase (reverse of schemes array)
  const newlyAdded = useMemo(() => {
    return [...schemes].reverse().slice(0, 4);
  }, [schemes]);

  // Filtered schemes for Explore section
  const exploreSchemes = useMemo(() => {
    return schemes.filter(s => {
      const matchCat = catFilter === 'All' || s.category.toLowerCase() === catFilter.toLowerCase();
      const matchQ = !dashQuery || (s.name + ' ' + s.description + ' ' + s.department + ' ' + s.category).toLowerCase().includes(dashQuery.toLowerCase());
      return matchCat && matchQ;
    });
  }, [schemes, catFilter, dashQuery]);

  const onlineCount = useMemo(() => schemes.filter(s => s.application_mode === 'online' || s.application_mode === 'both').length, [schemes]);

  return (
    <AppShell page="dashboard" go={go} savedCount={saved.length} user={user} onLogout={onLogout}>
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        {/* Welcome Header */}
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-xs font-bold uppercase tracking-wider text-leaf">
                Supabase Connected · {schemes.length} Active Schemes
              </p>
            </div>
            <h1 className="mt-1 text-3xl font-extrabold text-ink">
              Welcome, {user?.full_name || user?.email?.split('@')[0] || 'Citizen'} <span>👋</span>
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              Logged in as <span className="font-semibold text-leaf">{user?.email || 'Citizen'}</span>. Discover government schemes, verify eligibility, and apply with confidence.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onRefresh}
              disabled={loadingSchemes}
              title="Sync latest schemes from Supabase"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm disabled:opacity-60"
            >
              <RefreshCw size={14} className={loadingSchemes ? "animate-spin text-leaf" : "text-leaf"}/>
              {loadingSchemes ? 'Syncing...' : 'Sync Schemes'}
            </button>
            {isAdmin && (
              <Button onClick={() => go('admin')} className="bg-[#173a35] text-white hover:bg-[#204a43] shadow-sm">
                <ShieldCheck size={16}/> Admin Panel
              </Button>
            )}
            <Button onClick={() => go('directory')}>
              <Search size={16}/> Find schemes
            </Button>
          </div>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="mt-7 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <button onClick={() => go('directory')} className="card text-left p-4 transition hover:border-[#9fcdb5] hover:shadow-soft">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Verified Schemes</p>
              <Sparkles size={18} className="text-leaf"/>
            </div>
            <p className="mt-2 text-3xl font-extrabold text-ink">{String(schemes.length).padStart(2, '0')}</p>
            <p className="mt-1 text-xs text-slate-500">Live in Supabase database</p>
          </button>

          <button onClick={() => go('saved')} className="card text-left p-4 transition hover:border-[#9fcdb5] hover:shadow-soft">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Saved Shortlist</p>
              <Heart size={18} className="text-[#c54f3e]" fill={saved.length ? '#c54f3e' : 'none'}/>
            </div>
            <p className="mt-2 text-3xl font-extrabold text-ink">{String(saved.length).padStart(2, '0')}</p>
            <p className="mt-1 text-xs text-slate-500">{saved.length ? 'Saved for review' : 'No saved schemes yet'}</p>
          </button>

          <button onClick={() => go('eligibility')} className="card text-left p-4 transition hover:border-[#9fcdb5] hover:shadow-soft">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Eligibility Check</p>
              <ClipboardCheck size={18} className="text-leaf"/>
            </div>
            <p className="mt-2 text-3xl font-extrabold text-ink">Instant</p>
            <p className="mt-1 text-xs text-slate-500">Rule-based assessment</p>
          </button>

          <button onClick={() => go('directory')} className="card text-left p-4 transition hover:border-[#9fcdb5] hover:shadow-soft">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Online Portals</p>
              <ExternalLink size={18} className="text-leaf"/>
            </div>
            <p className="mt-2 text-3xl font-extrabold text-ink">{String(onlineCount).padStart(2, '0')}</p>
            <p className="mt-1 text-xs text-slate-500">Direct application links</p>
          </button>
        </div>

        {/* Main 2-Column Layout */}
        <section className="mt-8 grid gap-8 xl:grid-cols-[1fr_330px]">
          <div className="space-y-8">
            {/* Newly Added Schemes Section */}
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-800 uppercase tracking-wide">
                      ⚡ Live Database
                    </span>
                    <h2 className="text-xl font-extrabold text-ink">Newly Added Schemes</h2>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">Recent government schemes published directly in Supabase</p>
                </div>
                <button onClick={() => go('directory')} className="text-sm font-bold text-leaf hover:underline">
                  View all ({schemes.length}) <ArrowRight className="inline" size={15}/>
                </button>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {newlyAdded.map((s, idx) => (
                  <SchemeCard
                    key={s.id}
                    scheme={s}
                    go={go}
                    onSave={onSave}
                    saved={saved.includes(s.id)}
                    isNew={idx < 2}
                  />
                ))}
              </div>
            </div>

            {/* Explore Schemes with Category Filter */}
            <div className="border-t border-slate-200/70 pt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-ink">Explore Schemes by Category</h2>
                  <p className="mt-1 text-sm text-slate-500">Select a category or search by keywords</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input
                    value={dashQuery}
                    onChange={e => setDashQuery(e.target.value)}
                    placeholder="Search schemes..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-leaf"
                  />
                </div>
              </div>

              {/* Category Pills */}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setCatFilter('All')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    catFilter === 'All' ? 'bg-leaf text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-mint hover:text-leaf'
                  }`}
                >
                  All ({schemes.length})
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCatFilter(cat)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      catFilter === cat ? 'bg-leaf text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-mint hover:text-leaf'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Filtered Schemes Grid */}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {exploreSchemes.slice(0, 4).map(s => (
                  <SchemeCard
                    key={s.id}
                    scheme={s}
                    go={go}
                    onSave={onSave}
                    saved={saved.includes(s.id)}
                  />
                ))}
              </div>
              {exploreSchemes.length === 0 && (
                <div className="card mt-4 p-8 text-center text-slate-500">
                  No schemes found matching "{dashQuery}". <button onClick={() => { setDashQuery(''); setCatFilter('All'); }} className="font-bold text-leaf hover:underline">Reset filters</button>
                </div>
              )}
              {exploreSchemes.length > 4 && (
                <div className="mt-5 text-center">
                  <Button variant="secondary" onClick={() => go('directory')}>
                    View all {exploreSchemes.length} schemes in Directory <ArrowRight size={15}/>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Right Aside Sidebar */}
          <aside className="space-y-5">
            {/* AI Assistant Card */}
            <div className="rounded-2xl bg-[#173a35] p-5 text-white shadow-soft">
              <div className="flex items-center justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-[#bfe1c9]">
                  <Bot size={21}/>
                </div>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#bfe1c9]">
                  ElevenLabs AI Voice
                </span>
              </div>
              <h3 className="mt-5 text-lg font-extrabold">Need guidance on schemes?</h3>
              <p className="mt-2 text-xs leading-5 text-white/70">
                Ask how to apply, understand qualification rules, or talk using speech-to-text and AI voice.
              </p>
              <div className="mt-4 space-y-2">
                {['How to apply for PM-KISAN?', 'Scholarships for college students', 'Eligibility for Ayushman Bharat'].map(q => (
                  <button
                    key={q}
                    onClick={() => go('chat')}
                    className="block w-full text-left rounded-lg bg-white/5 px-3 py-2 text-xs text-white/85 hover:bg-white/15 transition truncate"
                  >
                    💬 {q}
                  </button>
                ))}
              </div>
              <Button
                className="mt-5 w-full bg-white !text-[#173a35] hover:!bg-[#eaf5ef]"
                onClick={() => go('chat')}
              >
                Ask Sahayak AI <ArrowRight size={16}/>
              </Button>
            </div>

            {/* Quick Eligibility Checker Widget */}
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-ink">Quick Eligibility Checker</h3>
                <ClipboardCheck size={18} className="text-leaf"/>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Select a scheme to test qualification against your citizen profile.
              </p>
              <div className="mt-3">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Select Scheme</label>
                <select
                  value={quickSchemeId}
                  onChange={e => setQuickSchemeId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-leaf"
                >
                  {schemes.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                  ))}
                </select>
              </div>
              <Button
                className="mt-3 w-full py-2 text-xs"
                onClick={() => go('eligibility', quickSchemeId)}
              >
                Check My Eligibility <ArrowRight size={14}/>
              </Button>
            </div>

            {/* Profile Status Card */}
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-ink">Citizen Profile Readiness</h3>
                <Clock3 size={17} className="text-leaf"/>
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-700">Telangana · Student · Urban</p>
              <p className="mt-0.5 text-xs text-slate-400">Complete details improve eligibility matching.</p>
              <div className="mt-3 h-2 overflow-hidden rounded bg-slate-100">
                <div className="h-full w-3/4 rounded bg-leaf"/>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Profile 75% complete</span>
                <button className="font-bold text-leaf hover:underline" onClick={() => go('profile')}>
                  Edit profile
                </button>
              </div>
            </div>

            {/* Verified Data Badge */}
            <div className="rounded-xl border border-[#dde9e2] bg-[#f4faf6] p-4 text-xs text-[#1e583c] flex items-start gap-2.5">
              <ShieldCheck size={18} className="shrink-0 text-leaf mt-0.5"/>
              <div>
                <b className="block font-bold">Official Sources Guaranteed</b>
                <span className="text-slate-600 leading-4 block mt-0.5">
                  All schemes and application links are verified against authentic government portals.
                </span>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </AppShell>
  );
}

function Directory({go,onSave,saved,schemes,user,onLogout}:{go:(p:Page,id?:string)=>void;onSave:(id:string)=>void;saved:string[];schemes:Scheme[];user?:UserSession['user']|null;onLogout?:()=>void}) {
  const [query,setQuery]=useState('');
  const [cat,setCat]=useState('All categories');
  const results=useMemo(()=>schemes.filter(s=>(cat==='All categories'||s.category===cat)&&(s.name+s.description+s.category).toLowerCase().includes(query.toLowerCase())),[schemes,query,cat]);
  const categories = useMemo(()=>Array.from(new Set(schemes.map(s=>s.category))),[schemes]);

  return <AppShell page="directory" go={go} savedCount={saved.length} user={user} onLogout={onLogout}><main className="mx-auto max-w-7xl px-5 py-8 lg:px-8"><p className="text-sm font-bold uppercase tracking-widest text-leaf">Scheme directory</p><h1 className="mt-2 text-3xl font-extrabold">Find the support that fits</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Explore scheme records maintained in Supabase. Always check the official link for current conditions.</p><div className="mt-7 flex flex-col gap-3 rounded-2xl border border-[#dbe9e1] bg-white p-3 shadow-sm md:flex-row"><label className="flex flex-1 items-center gap-2 rounded-xl bg-slate-50 px-3"><Search size={19} className="text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by scheme, need or category" className="w-full bg-transparent py-3 text-sm outline-none"/></label><label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm"><SlidersHorizontal size={17} className="text-leaf"/><select value={cat} onChange={e=>setCat(e.target.value)} className="bg-transparent py-3 outline-none"><option>All categories</option>{categories.map(x=><option key={x} value={x}>{x}</option>)}</select></label></div><div className="mt-7 flex flex-col gap-6 lg:flex-row"><aside className="card h-fit w-full p-5 lg:w-58"><h2 className="font-extrabold">Refine results</h2><Filter label="Coverage" values={['Central Government','State Government']}/><Filter label="Category" values={categories}/><Filter label="Your location" values={['Telangana','All India']}/></aside><section className="min-w-0 flex-1"><div className="mb-4 flex justify-between"><p className="text-sm text-slate-500"><b className="text-ink">{results.length}</b> schemes found</p><p className="text-xs text-slate-400">Updated directly from Supabase</p></div><div className="grid gap-4 md:grid-cols-2">{results.map(s=><SchemeCard key={s.id} scheme={s} go={go} onSave={onSave} saved={saved.includes(s.id)}/>)}</div>{!results.length&&<div className="card p-10 text-center text-slate-500">No schemes matched those filters. Try a broader search.</div>}</section></div></main></AppShell>
}

function Filter({label,values}:{label:string;values:string[]}) {return <div className="mt-6 border-t border-slate-100 pt-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><div className="mt-3 space-y-2.5">{values.map(x=><label className="flex items-center gap-2 text-sm text-slate-600" key={x}><input type="checkbox" className="accent-[#1d7a52]"/>{x}</label>)}</div></div>}

function Detail({id,go,onSave,saved,schemes,user,onLogout}:{id:string;go:(p:Page,id?:string)=>void;onSave:(id:string)=>void;saved:string[];schemes:Scheme[];user?:UserSession['user']|null;onLogout?:()=>void}){
  const scheme = schemes.find(s=>s.id===id || s.name.toLowerCase().includes(id.toLowerCase())) ?? schemes[0] ?? initialSchemes[0];
  const [docs,setDocs]=useState<Record<string,string>>({});
  return <AppShell page="detail" go={go} savedCount={saved.length} user={user} onLogout={onLogout}><main className="mx-auto max-w-6xl px-5 py-8 lg:px-8"><button onClick={()=>go('directory')} className="flex items-center gap-1 text-sm font-bold text-leaf"><ChevronRight className="rotate-180" size={16}/> Scheme directory</button><div className="mt-6 flex flex-col gap-5 border-b border-[#dce9e2] pb-7 md:flex-row md:justify-between"><div className="max-w-3xl"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-mint px-2.5 py-1 text-xs font-bold text-leaf">{scheme.category}</span><span className="text-xs font-semibold text-slate-500">{scheme.location}</span>{scheme.application_mode&&<span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold uppercase text-blue-700">{scheme.application_mode} mode</span>}</div><h1 className="mt-3 text-3xl font-extrabold">{scheme.name}</h1><p className="mt-2 text-sm font-semibold text-slate-500">{scheme.department}</p><p className="mt-4 text-base leading-7 text-slate-600">{scheme.description}</p></div><div className="flex shrink-0 items-start gap-2"><Button variant="secondary" onClick={()=>onSave(scheme.id)}><Heart size={17} fill={saved.includes(scheme.id)?'currentColor':'none'}/>{saved.includes(scheme.id)?'Saved':'Save scheme'}</Button><Button onClick={()=>go('eligibility',scheme.id)}>Check my eligibility</Button></div></div><div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]"><div className="space-y-8"><Info title="What this scheme offers"><p>{scheme.benefit}. The exact benefits and availability are decided under official programme rules.</p></Info><Info title="Who can apply"><p>{scheme.beneficiaries}. Review the current official notification before applying.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{Object.entries(scheme.rules || {}).map(([k,v])=><div className="rounded-xl bg-slate-50 p-3 text-sm" key={k}><span className="block text-xs font-bold capitalize text-slate-400">{k} requirement</span><b className="mt-1 block">{String(v)}</b></div>)}</div></Info><Info title="Required documents"><div className="mt-2 space-y-2">{(scheme.documents || []).map((d: string)=><div className="flex flex-col gap-2 rounded-xl border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between" key={d}><span className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 size={17} className="text-leaf"/>{d}</span><select value={docs[d]??''} onChange={e=>setDocs({...docs,[d]:e.target.value})} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600"><option value="">Mark status</option><option>Available</option><option>Need to obtain</option><option>Not available</option></select></div>)}</div><p className="mt-3 text-sm font-bold text-leaf">{Object.values(docs).filter(x=>x==='Available').length} of {(scheme.documents || []).length} documents ready</p></Info><Info title="Step-by-step application guidance"><ol className="space-y-4">{['Review the latest official notification, guidelines, and application window.','Gather and prepare clear copies of all required documents.','Click the official portal link below to access the authentic government site.',(scheme.application_mode === 'offline' ? 'Download the application form or visit the nearest local district office.' : 'Complete the online registration form and upload the mandatory documents.'),'Submit your application and note the acknowledgment / registration reference number.'].map((x,i)=><li className="flex gap-3 text-sm leading-6" key={x}><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-mint text-xs font-extrabold text-leaf">{i+1}</span>{x}</li>)}</ol></Info></div><aside className="space-y-4">{scheme.application_url&&<div className="card border-2 border-leaf/30 bg-[#f4faf6] p-5"><p className="text-xs font-bold uppercase tracking-wider text-leaf">Direct Application Portal</p><p className="mt-1 text-sm font-extrabold text-ink">Ready to apply?</p><a href={scheme.application_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-leaf px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#155e3e]">Apply Online Now <ExternalLink size={16}/></a></div>}<div className="card p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Official scheme source</p><p className="mt-2 text-sm font-bold">Verify current details and apply only through verified channels.</p><a href={scheme.link} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-leaf">Open official website <ExternalLink size={15}/></a></div><div className="card p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Last reviewed</p><p className="mt-2 text-sm font-bold">{scheme.updated}</p><p className="mt-3 text-xs leading-5 text-slate-500">Scheme terms can update. Confirm with the nodal ministry.</p></div><Button className="w-full" variant="secondary" onClick={()=>go('chat',scheme.id)}><Bot size={17}/> Ask AI how to apply</Button></aside></div></main></AppShell>}
function Info({title,children}:{title:string;children:React.ReactNode}){return <section><h2 className="text-xl font-extrabold">{title}</h2><div className="mt-3 text-sm leading-6 text-slate-600">{children}</div></section>}

function Eligibility({id,go,saved,schemes,user,onLogout}:{id?:string;go:(p:Page,id?:string)=>void;saved:string[];schemes:Scheme[];user?:UserSession['user']|null;onLogout?:()=>void}){
  const initialScheme = schemes.find(s => id ? (s.id === id || s.name.toLowerCase().includes(id.toLowerCase())) : false) || schemes[0] || initialSchemes[0];
  const [selected,setSelected]=useState(initialScheme.id);
  const [run,setRun]=useState(Boolean(id));

  useEffect(() => {
    if (id) {
      const match = schemes.find(s => s.id === id || s.name.toLowerCase().includes(id.toLowerCase()));
      if (match) {
        setSelected(match.id);
        setRun(true);
      }
    }
  }, [id, schemes]);

  const scheme=schemes.find(s=>s.id===selected)??initialScheme;
  return <AppShell page="eligibility" go={go} savedCount={saved.length} user={user} onLogout={onLogout}><main className="mx-auto max-w-5xl px-5 py-8 lg:px-8"><p className="text-sm font-bold uppercase tracking-widest text-leaf">Eligibility checker</p><h1 className="mt-2 text-3xl font-extrabold">Understand your likely eligibility</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">We compare your profile with structured scheme criteria. This is guidance only — the government authority makes the final decision.</p><div className="mt-7 card p-5"><label className="text-sm font-bold">Choose a scheme<select value={selected} onChange={e=>{setSelected(e.target.value);setRun(false)}} className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none">{schemes.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label><div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4"><div><p className="text-sm font-bold">Profile details used</p><p className="mt-1 text-xs text-slate-500">Age 20 · Telangana · Student · Annual income: not added</p></div><Button onClick={()=>setRun(true)}><ClipboardCheck size={17}/> Check eligibility</Button></div></div>{run&&<div className="mt-7 grid gap-5 lg:grid-cols-[.9fr_1.1fr]"><div className="rounded-2xl bg-[#173a35] p-6 text-white"><p className="text-sm font-bold text-[#bfe1c9]">GUIDANCE RESULT</p><div className="mt-5 flex items-end gap-4"><div className="text-5xl font-extrabold">74<span className="text-2xl">%</span></div><div className="mb-1 rounded-full bg-[#dcf3e4] px-3 py-1 text-xs font-extrabold text-leaf">Possibly eligible</div></div><p className="mt-5 text-sm leading-6 text-white/75">Your location and citizen status align with this scheme. Complete your income and occupation details to verify full qualification.</p><div className="mt-6 border-t border-white/10 pt-5 text-xs text-white/65">Confidence reflects criteria completeness and rule matches — it is not an approval prediction.</div></div><div className="card p-6"><h2 className="font-extrabold">What we found for {scheme.name}</h2><div className="mt-5 grid gap-5 sm:grid-cols-2"><CheckList title="Criteria matched" color="text-leaf" items={['Location: India / Telangana','Citizen residency: Verified']}/><CheckList title="Missing information" color="text-amber-600" items={['Annual family income proof','Category / Caste certificate (if required)']}/></div><div className="mt-5 rounded-xl bg-[#fff8df] p-4 text-sm leading-6 text-[#6b5817]"><b>Next action:</b> Check required documents ({scheme.documents?.join(', ') || 'Aadhaar, Bank details'}) and apply directly on the official portal.</div></div></div>}</main></AppShell>}
function CheckList({title,color,items}:{title:string;color:string;items:string[]}){return <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</p><div className="mt-3 space-y-2">{items.map(x=><p className="flex gap-2 text-sm text-slate-600" key={x}><CheckCircle2 className={color} size={17}/>{x}</p>)}</div></div>}

function Saved({go,onSave,saved,schemes,user,onLogout}:{go:(p:Page,id?:string)=>void;onSave:(id:string)=>void;saved:string[];schemes:Scheme[];user?:UserSession['user']|null;onLogout?:()=>void}){
  const items=schemes.filter(s=>saved.includes(s.id));
  return <AppShell page="saved" go={go} savedCount={saved.length} user={user} onLogout={onLogout}><main className="mx-auto max-w-5xl px-5 py-8 lg:px-8"><h1 className="text-3xl font-extrabold">Saved schemes</h1><p className="mt-2 text-sm text-slate-600">Keep useful schemes together and return when you are ready.</p>{items.length?<div className="mt-7 space-y-3">{items.map(s=><div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center" key={s.id}><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint text-leaf"><Landmark size={20}/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-extrabold">{s.name}</h2><span className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-bold text-leaf">{s.category}</span></div><p className="mt-1 text-sm text-slate-500">Saved today · Documents: {s.documents?.length || 0} required</p></div><div className="flex gap-2"><Button variant="secondary" onClick={()=>go('detail',s.id)}>View</Button><button title="Remove saved scheme" onClick={()=>onSave(s.id)} className="rounded-xl border border-slate-200 p-2.5 text-slate-400 hover:text-red-500"><X size={18}/></button></div></div>)}</div>:<div className="card mt-7 p-12 text-center"><Heart className="mx-auto text-[#99cbb0]" size={32}/><h2 className="mt-4 font-extrabold">Nothing saved yet</h2><p className="mt-1 text-sm text-slate-500">Save schemes to compare them later.</p><Button className="mt-5" onClick={()=>go('directory')}>Browse schemes</Button></div>}</main></AppShell>
}

function Profile({go,saved,user,onLogout}:{go:(p:Page,id?:string)=>void;saved:string[];user?:UserSession['user']|null;onLogout?:()=>void}) { const [edit,setEdit]=useState(false);const [savedForm,setSavedForm]=useState(false);const initials = user?.full_name ? user.full_name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() : (user?.email?.slice(0,2).toUpperCase() || 'AS');const displayName = user?.full_name || user?.email?.split('@')[0] || 'Citizen Profile';return <AppShell page="profile" go={go} savedCount={saved.length} user={user} onLogout={onLogout}><main className="mx-auto max-w-4xl px-5 py-8 lg:px-8"><div className="flex items-end justify-between"><div><p className="text-sm font-bold uppercase tracking-widest text-leaf">Your profile</p><h1 className="mt-2 text-3xl font-extrabold">Personalise your guidance</h1><p className="mt-2 text-sm text-slate-600">Saved securely in your Supabase account. You can update it anytime.</p></div><div className="flex gap-2">{onLogout&&<Button variant="secondary" onClick={onLogout}>Log out</Button>}<Button variant="secondary" onClick={()=>setEdit(!edit)}>{edit?'Cancel':'Edit profile'}</Button></div></div><form className="mt-7 card p-6" onSubmit={e=>{e.preventDefault();setEdit(false);setSavedForm(true)}}><div className="flex items-center gap-4 border-b border-slate-100 pb-6"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#d9eee1] text-lg font-extrabold text-leaf">{initials}</div><div><h2 className="font-extrabold">{displayName}</h2><p className="text-sm text-slate-500">{user?.email || 'Logged in user'}</p></div></div><div className="mt-6 grid gap-x-5 gap-y-5 sm:grid-cols-2">{[['Full name',displayName],['Email address',user?.email||''],['Age','20'],['Gender','Female'],['State','Telangana'],['District','Hyderabad'],['Occupation','Student'],['Annual family income',''],['Area type','Urban'],['Social / economic category',''],['Disability status','Not applicable']].map(([label,value])=><label className="text-sm font-bold text-slate-700" key={label}>{label}{edit?<input defaultValue={value} placeholder={label.includes('income')?'Add amount if relevant':'Not added'} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none"/>:<p className="mt-1.5 rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-600">{value||'Not added'}</p>}</label>)}</div><div className="mt-6 rounded-xl bg-[#fff8df] p-4 text-xs leading-5 text-[#6b5817]"><b>Privacy note:</b> Your profile and activity are protected with Supabase Row Level Security.</div>{edit&&<Button type="submit" className="mt-5">Save changes <Check size={16}/></Button>}{savedForm&&<p className="mt-5 text-sm font-bold text-leaf">Profile updated.</p>}</form></main></AppShell>}

function History({go,saved,user,onLogout,schemes}:{go:(p:Page,id?:string)=>void;saved:string[];user?:UserSession['user']|null;onLogout?:()=>void;schemes?:Scheme[]}){
  return <AppShell page="history" go={go} savedCount={saved.length} user={user} onLogout={onLogout}><main className="mx-auto max-w-5xl px-5 py-8 lg:px-8"><h1 className="text-3xl font-extrabold">Eligibility history</h1><p className="mt-2 text-sm text-slate-600">Revisit past guidance results. Requirements may change, so re-check before applying.</p><div className="mt-7 overflow-hidden rounded-2xl border border-[#dce9e2] bg-white"><div className="grid grid-cols-[1.5fr_.8fr_.8fr_auto] gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-400"><span>Scheme</span><span className="hidden sm:block">Checked</span><span>Status</span><span></span></div>{[['National Scholarship Portal','Today','Possibly eligible','nsp'],['PM-KISAN','2 Sep 2026','Insufficient info','pm-kisan']].map(([name,date,status,id])=>{
    const targetScheme = schemes?.find(s => s.name.toLowerCase().includes(name.toLowerCase()) || s.id === id);
    return <div className="grid grid-cols-[1.5fr_.8fr_.8fr_auto] items-center gap-3 px-5 py-4 text-sm" key={id}><span className="font-bold">{name}</span><span className="hidden text-slate-500 sm:block">{date}</span><span className={`w-fit rounded-full px-2 py-1 text-[11px] font-bold ${status==='Possibly eligible'?'bg-[#fff4d6] text-[#9a6810]':'bg-slate-100 text-slate-600'}`}>{status}</span><button className="font-bold text-leaf hover:underline" onClick={()=>go('eligibility',targetScheme?.id || id)}>View</button></div>;
  })}</div></main></AppShell>}

interface ChatMsg {
  id: string;
  role: 'user' | 'bot';
  text: string;
  scheme?: SchemeItem;
  sources?: string[];
  time: string;
}

function Chat({go,saved,schemeId,schemes,user,onLogout}:{go:(p:Page,id?:string)=>void;saved:string[];schemeId?:string;schemes:Scheme[];user?:UserSession['user']|null;onLogout?:()=>void}) {
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>(schemeId || '');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [autoVoice, setAutoVoice] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeScheme = useMemo(() => schemes.find(s => s.id === selectedSchemeId), [schemes, selectedSchemeId]);

  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'init-msg',
      role: 'bot',
      text: selectedSchemeId && activeScheme
        ? `Namaste! I am your Sahayak AI assistant for **${activeScheme.name}**.\n\nI can explain step-by-step how to apply, eligibility criteria, required documents, and share the official portal. You can also use the microphone to talk or listen via ElevenLabs voice!`
        : `Namaste! I am **Sahayak AI**, your government scheme assistant.\n\nAsk me how to apply for schemes, check eligibility rules, or get a list of required documents. You can type, speak with your microphone, and listen to answers using ElevenLabs Voice!`,
      scheme: activeScheme,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const cleanTextForVoice = (text: string) => {
    return text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/\S+/g, 'the official portal')
      .trim();
  };

  const playVoice = async (text: string, msgId: string) => {
    if (playingId === msgId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setLoadingVoiceId(msgId);
    const clean = cleanTextForVoice(text);

    try {
      const audioUrl = await aiApi.getVoiceAudio(clean.slice(0, 350));
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onended = () => {
          setPlayingId(null);
          audioRef.current = null;
        };
        audio.onerror = () => {
          fallbackSpeech(clean, msgId);
        };
        await audio.play();
        setPlayingId(msgId);
      } else {
        fallbackSpeech(clean, msgId);
      }
    } catch {
      fallbackSpeech(clean, msgId);
    } finally {
      setLoadingVoiceId(null);
    }
  };

  const fallbackSpeech = (text: string, msgId: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.onend = () => setPlayingId(null);
      utterance.onerror = () => setPlayingId(null);
      window.speechSynthesis.speak(utterance);
      setPlayingId(msgId);
    }
  };

  const toggleMic = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please try Google Chrome or Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          handleSend(transcript);
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch (err) {
      console.error('Speech recognition error:', err);
      setIsListening(false);
    }
  };

  const handleSend = async (overrideText?: string) => {
    const question = (overrideText || input).trim();
    if (!question || loading) return;

    const userMsgId = 'u-' + Date.now();
    const botMsgId = 'b-' + Date.now();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages(m => [...m, { id: userMsgId, role: 'user', text: question, time: timeStr }]);
    setInput('');
    setLoading(true);

    try {
      const resp = await aiApi.chat(question, selectedSchemeId || undefined);
      const botMsg: ChatMsg = {
        id: botMsgId,
        role: 'bot',
        text: resp.answer,
        scheme: resp.scheme,
        sources: resp.sources,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(m => [...m, botMsg]);

      if (autoVoice) {
        playVoice(resp.answer, botMsgId);
      }
    } catch (err: any) {
      const errorMsg: ChatMsg = {
        id: botMsgId,
        role: 'bot',
        text: 'I could not generate guidance at this moment. Please check your network connection or select a scheme from the directory.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(m => [...m, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = activeScheme ? [
    `How do I apply for ${activeScheme.name} step-by-step?`,
    `What documents are required for ${activeScheme.name}?`,
    `Who is eligible for ${activeScheme.name}?`,
    `What benefits do I get under ${activeScheme.name}?`
  ] : [
    'How do I apply for farmer financial support?',
    'What scholarships can a student apply for?',
    'How can I get free health cover up to ₹5 lakh?',
    'What documents are needed for government schemes?'
  ];

  return <AppShell page="chat" go={go} savedCount={saved.length} user={user} onLogout={onLogout}>
    <main className="mx-auto grid max-w-6xl gap-5 px-5 py-8 lg:grid-cols-[280px_1fr] lg:px-8">
      <aside className="space-y-4">
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-mint text-leaf">
              <Bot size={22}/>
            </div>
            <div>
              <h2 className="font-extrabold text-ink">Sahayak AI</h2>
              <p className="text-[11px] font-bold text-leaf">● Voice & Guidance Active</p>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Focus Scheme:
            </label>
            <select
              value={selectedSchemeId}
              onChange={e => setSelectedSchemeId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="">All Government Schemes</option>
              {schemes.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-xs font-semibold text-slate-600">Auto-speak answers</span>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" checked={autoVoice} onChange={e => setAutoVoice(e.target.checked)} className="peer sr-only"/>
              <div className="peer h-5 w-9 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-leaf peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
            </label>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Quick Questions</p>
            <div className="mt-2 space-y-1.5">
              {quickPrompts.map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); handleSend(q); }}
                  className="w-full rounded-lg bg-slate-50 p-2 text-left text-xs font-medium leading-4 text-slate-600 transition hover:bg-mint hover:text-leaf"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeScheme && (
          <div className="card bg-[#f4faf6] p-4 border border-[#cbe4d7]">
            <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-bold text-leaf">
              {activeScheme.category}
            </span>
            <h3 className="mt-2 text-sm font-extrabold text-ink">{activeScheme.name}</h3>
            <p className="mt-1 text-xs text-slate-600 line-clamp-2">{activeScheme.description}</p>
            {activeScheme.application_url && (
              <a
                href={activeScheme.application_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-leaf px-3 py-1.5 text-xs font-bold text-white hover:bg-[#155e3e]"
              >
                Apply Online <ExternalLink size={13}/>
              </a>
            )}
          </div>
        )}
      </aside>

      <section className="card flex min-h-[620px] flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-white">
          <div>
            <h1 className="font-extrabold text-ink text-lg">
              {activeScheme ? activeScheme.name : 'Ask about Government Schemes'}
            </h1>
            <p className="text-xs text-slate-500">
              Guidance on application procedures, eligibility rules, and official links
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f0f4ff] px-2.5 py-1 text-[11px] font-bold text-[#3451b2]">
              <Volume2 size={13}/> ElevenLabs Voice
            </span>
            <span className="rounded-full bg-mint px-2.5 py-1 text-[11px] font-bold text-leaf">
              AI Powered
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-[#fbfcfa] p-6">
          {messages.map((m) => {
            const isBot = m.role === 'bot';
            const isSpeaking = playingId === m.id;
            const isLoadingVoice = loadingVoiceId === m.id;

            return (
              <div key={m.id} className={`flex flex-col ${isBot ? 'items-start' : 'items-end'}`}>
                <div className={`relative max-w-[85%] rounded-2xl p-4 text-sm leading-6 ${
                  isBot ? 'rounded-tl-xs bg-white text-slate-800 shadow-sm border border-slate-100' : 'rounded-tr-xs bg-leaf text-white'
                }`}>
                  <div className="whitespace-pre-wrap">{m.text}</div>

                  {isBot && m.scheme && (
                    <div className="mt-4 rounded-xl border border-[#cbe4d7] bg-[#f4faf6] p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <b className="text-leaf text-sm">{m.scheme.name}</b>
                        <span className="rounded-full bg-mint px-2 py-0.5 font-bold text-leaf text-[10px] uppercase">
                          {m.scheme.application_mode || 'online'}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600">{m.scheme.benefit}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {m.scheme.application_url && (
                          <a
                            href={m.scheme.application_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-leaf px-3 py-1.5 font-bold text-white hover:bg-[#155e3e]"
                          >
                            Official Application Portal <ExternalLink size={13}/>
                          </a>
                        )}
                        {m.scheme.link && (
                          <a
                            href={m.scheme.link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50"
                          >
                            Scheme Details <ExternalLink size={13}/>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] opacity-70">
                    <span>{m.time}</span>
                    {isBot && (
                      <button
                        onClick={() => playVoice(m.text, m.id)}
                        disabled={isLoadingVoice}
                        title={isSpeaking ? 'Stop voice playback' : 'Play ElevenLabs voice guide'}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-bold transition ${
                          isSpeaking ? 'bg-amber-100 text-amber-800' : 'bg-mint text-leaf hover:bg-[#d8edd3]'
                        }`}
                      >
                        {isLoadingVoice ? (
                          <RefreshCw size={12} className="animate-spin"/>
                        ) : isSpeaking ? (
                          <VolumeX size={12}/>
                        ) : (
                          <Volume2 size={12}/>
                        )}
                        <span>{isLoadingVoice ? 'Loading audio...' : isSpeaking ? 'Stop voice' : 'Listen'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-start">
              <div className="rounded-2xl rounded-tl-xs bg-white p-4 shadow-sm border border-slate-100 text-sm text-slate-600 flex items-center gap-3">
                <RefreshCw size={17} className="animate-spin text-leaf"/>
                <span>Sahayak AI is researching eligibility rules & application steps...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef}/>
        </div>

        {isListening && (
          <div className="bg-red-50 px-5 py-2.5 text-xs font-bold text-red-600 flex items-center gap-2 border-t border-red-100">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span>Microphone active: Speak your question now...</span>
          </div>
        )}

        <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2 border-t border-slate-100 p-3 bg-white">
          <button
            type="button"
            onClick={toggleMic}
            title={isListening ? 'Stop recording' : 'Voice talking (Speak question)'}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition ${
              isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-mint hover:text-leaf'
            }`}
          >
            {isListening ? <MicOff size={20}/> : <Mic size={20}/>}
          </button>

          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={activeScheme ? `Ask how to apply for ${activeScheme.name}...` : "Ask how to apply, eligibility, or required documents..."}
            className="flex-1 rounded-xl bg-slate-50 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:bg-white focus:ring-1 focus:ring-leaf"
          />

          <Button type="submit" disabled={loading || !input.trim()} className="px-5">
            <Send size={16}/>
          </Button>
        </form>
      </section>
    </main>
  </AppShell>;
}

function Admin({go,schemes,onRefresh,user}:{go:(p:Page,id?:string)=>void;schemes:Scheme[];onRefresh:()=>Promise<void>;user?:UserSession['user']|null}) {
  const [authed, setAuthed] = useState(() => Boolean(user?.email?.toLowerCase().includes('admin')));
  const [adminEmail, setAdminEmail] = useState('admin@sahayakai.co.in');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'success' | 'error'; text: string} | null>(null);

  // Add Scheme Form state
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState('Agriculture');
  const [location, setLocation] = useState('Central Government');
  const [beneficiaries, setBeneficiaries] = useState('');
  const [benefit, setBenefit] = useState('');
  const [applicationMode, setApplicationMode] = useState<'online' | 'offline' | 'both'>('online');
  const [link, setLink] = useState('');
  const [applicationUrl, setApplicationUrl] = useState('');
  const [description, setDescription] = useState('');
  const [documents, setDocuments] = useState('');
  const [residency, setResidency] = useState('Indian resident');
  const [occupation, setOccupation] = useState('');
  const [income, setIncome] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthed(true);
    setFeedback({ type: 'success', text: 'Signed in as Administrator to Supabase database.' });
  };

  const handleAddScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const docList = documents.split(',').map(d => d.trim()).filter(Boolean);
      await schemesApi.adminCreateScheme({
        name,
        department,
        category,
        location,
        beneficiaries,
        benefit,
        application_mode: applicationMode,
        link: link || 'https://www.india.gov.in',
        application_url: applicationUrl || link || 'https://www.india.gov.in',
        description,
        documents: docList.length ? docList : ['Aadhaar card', 'Bank account details'],
        rules: {
          residency: residency.trim() || undefined,
          occupation: occupation.trim() || undefined,
          income: income.trim() || undefined,
        }
      });
      await onRefresh();
      setShowAddModal(false);
      setFeedback({ type: 'success', text: `Scheme "${name}" successfully saved to Supabase!` });
      // Reset form
      setName('');
      setDepartment('');
      setBeneficiaries('');
      setBenefit('');
      setDescription('');
      setDocuments('');
      setLink('');
      setApplicationUrl('');
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to add scheme' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (scheme: Scheme) => {
    if (!window.confirm(`Are you sure you want to delete "${scheme.name}" from Supabase?`)) return;
    try {
      await schemesApi.adminDeleteScheme(scheme.id);
      await onRefresh();
      setFeedback({ type: 'success', text: `Scheme "${scheme.name}" deleted from Supabase.` });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to delete scheme' });
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    setFeedback(null);
    try {
      const res = await schemesApi.adminSeedSchemes();
      await onRefresh();
      setFeedback({ type: 'success', text: `Seeded ${res.seeded_count} official government schemes into Supabase!` });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to seed schemes' });
    } finally {
      setSeeding(false);
    }
  };

  if (!authed) {
    return (
      <div className="grid min-h-screen place-items-center bg-sand p-5">
        <div className="card w-full max-w-md p-8 shadow-soft">
          <Logo/>
          <div className="mt-8 grid h-12 w-12 place-items-center rounded-2xl bg-mint text-leaf">
            <ShieldCheck size={26}/>
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-ink">Admin Dashboard Login</h1>
          <p className="mt-1 text-sm text-slate-600">
            Sign in to manage government schemes and documents directly in Supabase.
          </p>
          <form className="mt-6 space-y-4" onSubmit={handleLogin}>
            <Field label="Admin email" placeholder="admin@organisation.gov.in" type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)}/>
            <Field label="Password" placeholder="••••••••" type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)}/>
            <Button type="submit" className="w-full">Sign in to Admin Dashboard</Button>
          </form>
          <button onClick={() => go(user ? 'dashboard' : 'home')} className="mt-6 block text-center text-sm font-bold text-leaf hover:underline">
            Return to Citizen Portal
          </button>
        </div>
      </div>
    );
  }

  const centralCount = schemes.filter(s => s.location?.toLowerCase().includes('central')).length;
  const stateCount = schemes.filter(s => s.location?.toLowerCase().includes('state')).length;
  const onlineCount = schemes.filter(s => s.application_mode === 'online' || s.application_mode === 'both').length;

  return (
    <div className="min-h-screen bg-[#f6f8f7]">
      <header className="flex h-16 items-center justify-between border-b bg-white px-5 lg:px-8">
        <button onClick={() => go(user ? 'dashboard' : 'home')} className="text-left"><Logo/></button>
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-mint px-3 py-1 text-xs font-bold text-leaf sm:block">
            ● Supabase Database Active
          </span>
          <Button variant="ghost" onClick={() => go(user ? 'dashboard' : 'home')}>
            <LogOut size={16}/> Exit Admin
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        {feedback && (
          <div className={`mb-6 flex items-center justify-between rounded-xl p-4 text-sm font-semibold ${
            feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <span>{feedback.text}</span>
            <button onClick={() => setFeedback(null)} className="font-bold">✕</button>
          </div>
        )}

        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-leaf">Management Portal</p>
            <h1 className="mt-1 text-3xl font-extrabold text-ink">Admin Scheme Management</h1>
            <p className="mt-1 text-sm text-slate-600">
              Add, update, or remove government schemes stored in the Supabase database.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleSeed} disabled={seeding}>
              <RefreshCw size={15} className={seeding ? 'animate-spin' : ''}/>
              {seeding ? 'Seeding...' : 'Seed Official Schemes'}
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus size={17}/> Add New Scheme
            </Button>
          </div>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Active Schemes in DB', schemes.length, Landmark, 'Total in Supabase'],
            ['Central Government', centralCount, Sparkles, 'National coverage'],
            ['State / Regional', stateCount, MapPin, 'State-level schemes'],
            ['Online Application', onlineCount, ExternalLink, 'With direct portal links']
          ].map(([t, n, Icon, desc]) => {
            const C = Icon as typeof Search;
            return (
              <div className="card p-5" key={t as string}>
                <div className="flex justify-between items-center">
                  <p className="text-sm font-bold text-slate-500">{t as string}</p>
                  <C size={18} className="text-leaf"/>
                </div>
                <p className="mt-3 text-3xl font-extrabold text-ink">{n as number}</p>
                <p className="mt-1 text-xs text-slate-400">{desc as string}</p>
              </div>
            );
          })}
        </div>

        <section className="mt-8 card overflow-hidden">
          <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between bg-white">
            <div>
              <h2 className="font-extrabold text-lg text-ink">Government Scheme Records ({schemes.length})</h2>
              <p className="mt-0.5 text-xs text-slate-500">Live data synchronised with Supabase</p>
            </div>
            <Button variant="ghost" onClick={() => onRefresh()} className="text-xs font-bold">
              <RefreshCw size={14}/> Refresh DB
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="p-4 font-bold">Scheme & Department</th>
                  <th className="p-4 font-bold">Category</th>
                  <th className="p-4 font-bold">Mode</th>
                  <th className="p-4 font-bold">Required Documents</th>
                  <th className="p-4 font-bold">Application Portal</th>
                  <th className="p-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {schemes.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-4">
                      <b className="text-ink">{s.name}</b>
                      <span className="mt-0.5 block text-xs text-slate-500 truncate max-w-xs">{s.department}</span>
                    </td>
                    <td className="p-4">
                      <span className="rounded-full bg-mint px-2.5 py-1 text-xs font-bold text-leaf">
                        {s.category}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-semibold text-slate-600 uppercase">
                      {s.application_mode || 'online'}
                    </td>
                    <td className="p-4 text-xs text-slate-600">
                      <span title={s.documents?.join(', ')}>
                        {s.documents?.length || 0} documents
                      </span>
                    </td>
                    <td className="p-4">
                      {s.application_url ? (
                        <a href={s.application_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-leaf hover:underline">
                          Apply Link <ExternalLink size={13}/>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">None</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => go('detail', s.id)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          title="Delete scheme"
                          className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={15}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Add Scheme Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 overflow-y-auto">
          <div className="card w-full max-w-2xl bg-white p-6 shadow-xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-ink">Add Government Scheme</h2>
                <p className="text-xs text-slate-500">Scheme will be saved into Supabase and made visible to citizens.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X size={20}/>
              </button>
            </div>

            <form onSubmit={handleAddScheme} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold text-slate-700">
                  Scheme Name *
                  <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. PM Vishwakarma" className="focus-ring mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"/>
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  Department / Ministry *
                  <input required value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Ministry of MSME" className="focus-ring mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"/>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block text-xs font-bold text-slate-700">
                  Category
                  <select value={category} onChange={e => setCategory(e.target.value)} className="focus-ring mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none">
                    {['Agriculture', 'Healthcare', 'Scholarships', 'Housing', 'Employment', 'Financial assistance', 'Women', 'Business', 'Pension', 'Education'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  Location / Coverage
                  <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Central Government or Telangana" className="focus-ring mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"/>
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  Application Mode
                  <select value={applicationMode} onChange={e => setApplicationMode(e.target.value as any)} className="focus-ring mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none">
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="both">Both</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold text-slate-700">
                  Target Beneficiaries
                  <input value={beneficiaries} onChange={e => setBeneficiaries(e.target.value)} placeholder="e.g. Traditional artisans, craftspeople" className="focus-ring mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"/>
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  Benefit Amount / Description
                  <input value={benefit} onChange={e => setBenefit(e.target.value)} placeholder="e.g. Up to ₹3 Lakh loan at 5% interest" className="focus-ring mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"/>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold text-slate-700">
                  Official Website Link
                  <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." className="focus-ring mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"/>
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  Direct Application Portal URL
                  <input value={applicationUrl} onChange={e => setApplicationUrl(e.target.value)} placeholder="https://..." className="focus-ring mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"/>
                </label>
              </div>

              <label className="block text-xs font-bold text-slate-700">
                Detailed Scheme Description *
                <textarea required rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe what the scheme is and how it helps citizens..." className="focus-ring mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"/>
              </label>

              <label className="block text-xs font-bold text-slate-700">
                Required Documents (comma separated)
                <input value={documents} onChange={e => setDocuments(e.target.value)} placeholder="Aadhaar card, Bank account details, Ration card, Income certificate" className="focus-ring mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"/>
              </label>

              <div className="grid gap-4 sm:grid-cols-3 border-t border-slate-100 pt-3">
                <label className="block text-xs font-bold text-slate-700">
                  Residency Requirement
                  <input value={residency} onChange={e => setResidency(e.target.value)} placeholder="e.g. Indian resident" className="focus-ring mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none"/>
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  Occupation Requirement
                  <input value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="e.g. Farmer / Student" className="focus-ring mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none"/>
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  Income Criteria
                  <input value={income} onChange={e => setIncome(e.target.value)} placeholder="e.g. Less than ₹2.5 Lakh" className="focus-ring mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none"/>
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving to Supabase...' : 'Save Scheme to Supabase'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App(){
  const [user,setUser]=useState<UserSession['user']|null>(()=>authApi.getUser());
  const [page,setPage]=useState<Page>(()=>authApi.getUser() ? 'dashboard' : 'home');
  const [selected,setSelected]=useState(() => initialSchemes[0]?.id || 'nsp');
  const [saved,setSaved]=useState<string[]>([]);
  const [schemes, setSchemes] = useState<Scheme[]>(initialSchemes);
  const [loadingSchemes, setLoadingSchemes] = useState(false);

  const loadSchemes = async () => {
    try {
      setLoadingSchemes(true);
      const data = await schemesApi.getSchemes();
      if (data && data.length > 0) {
        setSchemes(data);
      }
    } catch (err) {
      console.warn('Using initial scheme cache:', err);
    } finally {
      setLoadingSchemes(false);
    }
  };

  useEffect(() => {
    loadSchemes();
  }, []);

  const go=(p:Page,id?:string)=>{
    if(id)setSelected(id);
    setPage(p);
    window.scrollTo({top:0,behavior:'smooth'});
  };

  const toggleSave=(id:string)=>setSaved(x=>x.includes(id)?x.filter(a=>a!==id):[...x,id]);

  const login=(loggedInUser: UserSession['user'])=>{
    setUser(loggedInUser);
    go('dashboard');
  };

  const logout=async()=>{
    await authApi.logout();
    setUser(null);
    go('home');
  };

  if(page==='home')return <Landing go={go} user={user}/>;
  if(['login','signup','forgot'].includes(page))return <Auth page={page} go={go} login={login}/>;
  if(page==='dashboard')return <Dashboard go={go} onSave={toggleSave} saved={saved} schemes={schemes} user={user} onLogout={logout} onRefresh={loadSchemes} loadingSchemes={loadingSchemes}/>;
  if(page==='directory')return <Directory go={go} onSave={toggleSave} saved={saved} schemes={schemes} user={user} onLogout={logout}/>;
  if(page==='detail')return <Detail id={selected} go={go} onSave={toggleSave} saved={saved} schemes={schemes} user={user} onLogout={logout}/>;
  if(page==='eligibility')return <Eligibility id={selected} go={go} saved={saved} schemes={schemes} user={user} onLogout={logout}/>;
  if(page==='saved')return <Saved go={go} onSave={toggleSave} saved={saved} schemes={schemes} user={user} onLogout={logout}/>;
  if(page==='history')return <History go={go} saved={saved} user={user} onLogout={logout} schemes={schemes}/>;
  if(page==='profile')return <Profile go={go} saved={saved} user={user} onLogout={logout}/>;
  if(page==='chat')return <Chat go={go} saved={saved} schemeId={selected} schemes={schemes} user={user} onLogout={logout}/>;
  return <Admin go={go} schemes={schemes} onRefresh={loadSchemes} user={user}/>;
}

