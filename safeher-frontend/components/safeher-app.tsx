"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import {
  ArrowDownRight, ArrowRight, Bell, CalendarDays, Check, CheckCircle2,
  ChevronDown, CircleHelp, Clock3, CreditCard, FileText, Flower2, Heart,
  HeartHandshake, Home, LifeBuoy, LockKeyhole, LogOut, Menu, MessageCircle,
  MoreHorizontal, Plus, Scale, Search, Settings, ShieldCheck, Sparkles,
  Users, Wallet, X, BookOpen, Video, MapPin, Mail, SlidersHorizontal,
  CalendarClock, AlertCircle, Languages, DoorOpen
} from "lucide-react";
import Brand from "./brand";
import { resources, services } from "@/lib/demo-data";
import type { AppData, Appointment, PageKey } from "@/lib/types";
import { quickExit, translateUI } from "@/lib/ui-language";
import type { UILanguage } from "@/lib/ui-language";

const navItems: { key: PageKey; label: string; icon: typeof Home }[] = [
  { key: "overview", label: "Overview", icon: Home },
  { key: "support", label: "Find support", icon: HeartHandshake },
  { key: "appointments", label: "My appointments", icon: CalendarDays },
  { key: "credits", label: "Sponsored credits", icon: Wallet },
  { key: "resources", label: "Resource library", icon: BookOpen },
  { key: "settings", label: "Privacy & settings", icon: Settings },
];

const money = (n: number) => new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 }).format(n);

function IconFor({ name }: { name: "scale" | "heart-handshake" | "users" }) {
  if (name === "scale") return <Scale size={23} />;
  if (name === "heart-handshake") return <HeartHandshake size={23} />;
  return <Users size={23} />;
}

type ComplaintCategory = "legal" | "psychosocial" | "community" | "other";
type ComplaintRecord = {
  id: string;
  category: ComplaintCategory;
  status: "received" | "under_review" | "closed";
  demo_note: string | null;
  created_at: string;
};
type ProfileAgeGroup = "adult" | "under_18" | "not_provided";
type ApiAppointment = {
  id: string;
  service: string;
  professional: string;
  starts_at: string;
  duration_minutes: number;
  format: "online" | "in_person" | "phone";
  status: "requested" | "confirmed" | "completed" | "cancelled" | "no_show";
  created_at: string;
};
type ApiCredit = {
  id: string;
  sponsor: string;
  amount: number | string;
  remaining: number | string;
  purpose: string;
  currency: string;
};
type ApiPreferences = {
  user_id: string;
  share_anonymous_insights: boolean;
  email_updates: boolean;
};
const emptyRemoteData: AppData = {
  appointments: [],
  credits: [],
  privacy: { shareAnonymousInsights: false, emailUpdates: false },
};

// Display dates/times in Sri Lanka time; send explicit +05:30 offset to FastAPI.
function colomboParts(iso: string) {
  const pieces = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const part = (type: string) => pieces.find(p => p.type === type)?.value ?? "";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, time: `${part("hour")}:${part("minute")}` };
}
function todayColombo() {
  return colomboParts(new Date().toISOString()).date;
}
function mapAppointment(row: ApiAppointment): Appointment {
  const { date, time } = colomboParts(row.starts_at);
  const statuses: Record<ApiAppointment["status"], Appointment["status"]> = {
    requested: "Requested", confirmed: "Confirmed", completed: "Completed",
    cancelled: "Cancelled", no_show: "No-show",
  };
  return {
    id: row.id, service: row.service, professional: row.professional,
    date, time, format: row.format === "in_person" ? "In person" : row.format === "phone" ? "Phone" : "Online",
    status: statuses[row.status], createdAt: row.created_at,
  };
}


type SafeHerAppProps = {
  language: UILanguage;
  onLanguageChange: (language: UILanguage) => void;
  userId?: string;
  userEmail?: string;
  onSignOut: () => void | Promise<void>;
  onRequestAuth: (reason?: "complaint" | "account") => void;
  complaintRequested?: boolean;
  onComplaintNoticeShown?: () => void;
};

export default function SafeHerApp({ language, onLanguageChange, userId, userEmail, onSignOut, onRequestAuth, complaintRequested, onComplaintNoticeShown }: SafeHerAppProps) {
  const tr = (text: string) => translateUI(language, text);
  const isSignedIn = Boolean(userId);
  const [page, setPage] = useState<PageKey>("overview");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [data, setData] = useState<AppData>(emptyRemoteData);
  const [phase4Reload, setPhase4Reload] = useState(0);
  const [phase4Loading, setPhase4Loading] = useState(false);
  const [phase4Error, setPhase4Error] = useState("");
  const [appointmentBusy, setAppointmentBusy] = useState(false);
  const [appointmentError, setAppointmentError] = useState("");
  const [preferencesBusy, setPreferencesBusy] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedService, setSelectedService] = useState("Legal consultation");
  const [notice, setNotice] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [under18, setUnder18] = useState(false);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [ageGroup, setAgeGroup] = useState<ProfileAgeGroup | null>(null);
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [complaintCategory, setComplaintCategory] = useState<ComplaintCategory>("legal");
  const [complaintNote, setComplaintNote] = useState("");
  const [editingComplaintId, setEditingComplaintId] = useState<string | null>(null);
  const [complaintFormError, setComplaintFormError] = useState("");
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [complaintAccessOpen, setComplaintAccessOpen] = useState(false);
  const [complaintAccessError, setComplaintAccessError] = useState("");
  const [complaintAccessReload, setComplaintAccessReload] = useState(0);


  useEffect(() => {
    if (!isSignedIn) {
      setPage("overview");
      setBookingOpen(false);
      setComplaintOpen(false);
      setComplaintNote("");
      setEditingComplaintId(null);
      setComplaintAccessOpen(false);
      setShowProfile(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (!isSignedIn || !complaintRequested) return;
    if (ageGroup === null && !complaintAccessError) return;
    if (ageGroup === "adult") {
      setEditingComplaintId(null);
      setComplaintCategory("legal");
      setComplaintNote("");
      setComplaintFormError("");
      setComplaintOpen(true);
    } else {
      setComplaintAccessOpen(true);
    }
    onComplaintNoticeShown?.();
  }, [isSignedIn, complaintRequested, ageGroup, complaintAccessError, onComplaintNoticeShown]);

  // Fetch private dashboard data from FastAPI, using the signed-in Supabase token.
  // Never use localStorage as a fallback for appointments, credits or preferences.
  useEffect(() => {
    let active = true;
    setData(emptyRemoteData);
    setPhase4Error("");
    if (!userId) { setPhase4Loading(false); return; }
    setPhase4Loading(true);
    async function loadDashboard() {
      const results = await Promise.allSettled([
        apiFetch<ApiAppointment[]>("/appointments"),
        apiFetch<ApiCredit[]>("/credits"),
        apiFetch<ApiPreferences>("/preferences"),
      ]);
      if (!active) return;
      const errors: string[] = [];
      const [appointmentsResult, creditsResult, preferencesResult] = results;
      setData({
        appointments: appointmentsResult.status === "fulfilled" ? appointmentsResult.value.map(mapAppointment) : [],
        credits: creditsResult.status === "fulfilled" ? creditsResult.value.map(c => ({
          id: c.id, sponsor: c.sponsor, amount: Number(c.amount),
          remaining: Number(c.remaining), purpose: c.purpose,
        })) : [],
        privacy: preferencesResult.status === "fulfilled" ? {
          shareAnonymousInsights: preferencesResult.value.share_anonymous_insights,
          emailUpdates: preferencesResult.value.email_updates,
        } : emptyRemoteData.privacy,
      });
      if (appointmentsResult.status === "rejected") errors.push("appointments");
      if (creditsResult.status === "rejected") errors.push("credits");
      if (preferencesResult.status === "rejected") errors.push("privacy settings");
      if (errors.length) setPhase4Error(`Could not load ${errors.join(", ")}. Check FastAPI and retry.`);
      setPhase4Loading(false);
    }
    void loadDashboard();
    return () => { active = false; };
  }, [userId, phase4Reload]);

  // Load age eligibility and this user's category-only submissions from FastAPI.
  // No complaint data is stored in localStorage.
  useEffect(() => {
    let active = true;
    setAgeGroup(null);
    setComplaints([]);
    setComplaintAccessError("");
    if (!userId) return;

    async function loadComplaintAccess() {
      try {
        const profile = await apiFetch<{
          id: string;
          age_group: ProfileAgeGroup;
        }>("/me");
        if (!active) return;
        setAgeGroup(profile.age_group);
        const rows = await apiFetch<ComplaintRecord[]>("/complaints");
        if (active) setComplaints(rows);
      } catch (error) {
        if (active) {
          setComplaintAccessError(error instanceof Error ? error.message : "Could not load complaint access.");
        }
      }
    }

    void loadComplaintAccess();
    return () => { active = false; };
  }, [userId, complaintAccessReload]);

  const upcoming = useMemo(
    () => data.appointments.filter(a => a.status === "Requested" || a.status === "Confirmed").sort((a,b) => a.date.localeCompare(b.date)),
    [data.appointments]
  );
  const totalCredits = data.credits.reduce((sum, c) => sum + c.remaining, 0);

  function go(key: PageKey) {
    if (!isSignedIn && (key === "appointments" || key === "credits" || key === "settings")) {
      onRequestAuth("account");
      return;
    }
    setPage(key);
    setMobileMenu(false);
    setNotice("");
  }

  function openBooking(service: string) {
    if (!isSignedIn) {
      onRequestAuth("account");
      return;
    }
    if (ageGroup !== "adult") {
      setUnder18(true);
      return;
    }
    setSelectedService(service);
    setAppointmentError("");
    setBookingOpen(true);
  }

  function openComplaint() {
    if (!isSignedIn) {
      onRequestAuth("complaint");
      return;
    }
    if (ageGroup === null || ageGroup !== "adult") {
      setComplaintAccessOpen(true);
      return;
    }
    setEditingComplaintId(null);
    setComplaintCategory("legal");
    setComplaintNote("");
    setComplaintFormError("");
    setComplaintOpen(true);
  }

  function editComplaint(record: ComplaintRecord) {
    if (record.status !== "received") return;
    setEditingComplaintId(record.id);
    setComplaintCategory(record.category);
    setComplaintNote(record.demo_note ?? "");
    setComplaintFormError("");
    setComplaintOpen(true);
  }

  async function submitComplaint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSignedIn || ageGroup !== "adult" || submittingComplaint) return;
    setSubmittingComplaint(true);
    setComplaintFormError("");
    try {
      // Never persist complaint notes in localStorage. Only send fictional test notes.
      const isEditing = Boolean(editingComplaintId);
      const record = await apiFetch<ComplaintRecord>(
        isEditing ? `/complaints/${editingComplaintId}` : "/complaints",
        {
          method: isEditing ? "PATCH" : "POST",
          body: JSON.stringify({ category: complaintCategory, demo_note: complaintNote.trim() }),
        }
      );
      setComplaints(previous => isEditing
        ? previous.map(item => item.id === record.id ? record : item)
        : [record, ...previous]);
      setComplaintOpen(false);
      setEditingComplaintId(null);
      setComplaintNote("");
      setNotice(isEditing
        ? "Your demo request was updated in Supabase. No staff are notified."
        : "Your demo request was saved in Supabase. No staff are notified or assigned.");
    } catch (error) {
      setComplaintFormError(error instanceof Error ? error.message : "The request could not be saved.");
    } finally {
      setSubmittingComplaint(false);
    }
  }

  async function createAppointment(formData: FormData) {
    if (!isSignedIn || ageGroup !== "adult" || appointmentBusy) return;
    const date = String(formData.get("date") || "");
    const time = String(formData.get("time") || "");
    const format = String(formData.get("format") || "Online");
    if (!date || !time) return;
    setAppointmentBusy(true);
    setAppointmentError("");
    try {
      const startsAt = new Date(`${date}T${time}:00+05:30`);
      if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
        throw new Error("Choose a future date and time (Sri Lanka time).");
      }
      const record = await apiFetch<ApiAppointment>("/appointments", {
        method: "POST",
        body: JSON.stringify({
          service: selectedService,
          starts_at: startsAt.toISOString(),
          duration_minutes: 45,
          format: format === "In person" ? "in_person" : format === "Phone" ? "phone" : "online",
        }),
      });
      setData(prev => ({ ...prev, appointments: [mapAppointment(record), ...prev.appointments] }));
      setBookingOpen(false);
      setPage("appointments");
      setNotice("Request saved in Supabase. No professional has been booked or notified.");
    } catch (error) {
      setAppointmentError(error instanceof Error ? error.message : "Could not save appointment request.");
    } finally {
      setAppointmentBusy(false);
    }
  }

  async function cancelAppointment(id: string) {
    if (appointmentBusy) return;
    setAppointmentBusy(true);
    try {
      const record = await apiFetch<ApiAppointment>(`/appointments/${id}/cancel`, { method: "POST" });
      setData(prev => ({ ...prev, appointments: prev.appointments.map(a => a.id === id ? mapAppointment(record) : a) }));
      setNotice("Appointment request cancelled in Supabase.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not cancel appointment request.");
    } finally {
      setAppointmentBusy(false);
    }
  }

  async function savePreference(field: "share_anonymous_insights" | "email_updates", value: boolean) {
    if (preferencesBusy) return;
    setPreferencesBusy(true);
    try {
      const result = await apiFetch<ApiPreferences>("/preferences", {
        method: "PATCH", body: JSON.stringify({ [field]: value }),
      });
      setData(prev => ({ ...prev, privacy: {
        shareAnonymousInsights: result.share_anonymous_insights,
        emailUpdates: result.email_updates,
      } }));
      setNotice("Preference saved to Supabase.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save preference.");
    } finally {
      setPreferencesBusy(false);
    }
  }

  const filteredResources = resources.filter(r => `${r.title} ${r.description} ${r.category}`.toLowerCase().includes(searchText.toLowerCase()));

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <Brand />
          <button className="icon-button mobile-close" onClick={() => setMobileMenu(false)} aria-label="Close menu"><X size={20}/></button>
        </div>
        <div className="workspace-label">{tr(isSignedIn ? "YOUR SPACE" : "EXPLORE SAFEHER")}</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.filter(item => isSignedIn || ["overview", "support", "resources"].includes(item.key)).map(item => {
            const Icon = item.icon;
            return <button key={item.key} className={`nav-item ${page === item.key ? "active" : ""}`} onClick={() => go(item.key)}>
              <Icon size={18} strokeWidth={1.8}/><span>{tr(item.label)}</span>
              {item.key === "appointments" && upcoming.length > 0 && <span className="nav-count">{upcoming.length}</span>}
            </button>;
          })}
        </nav>
        <div className="sidebar-spacer"/>
        <div className="sidebar-help">
          <div className="help-icon"><LifeBuoy size={19}/></div>
          <strong>{tr("Need a little help?")}</strong>
          <p>{tr("Find your way around SafeHer.")}</p>
          <button className="text-link" onClick={() => setShowHelp(true)}>{tr("Visit help centre")} <ArrowRight size={14}/></button>
        </div>
        <div className="sidebar-footer"><ShieldCheck size={15}/> Your choices matter here</div>
      </aside>

      {mobileMenu && <button className="scrim" onClick={() => setMobileMenu(false)} aria-label="Close navigation"/>}

      <main className="main-area">
        <header className="topbar" style={{ height: "auto", minHeight: 76, display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: 10, paddingTop: 14, paddingBottom: 14 }}>
          <div className="topbar-left">
            <button className="icon-button mobile-menu-button" onClick={() => setMobileMenu(true)} aria-label="Open menu"><Menu size={21}/></button>
            <div className="breadcrumb">{isSignedIn ? tr("My space") : "SafeHer"} <span>/</span> <strong>{tr(navItems.find(n => n.key === page)?.label ?? "Overview")}</strong></div>
          </div>
          <div className="topbar-actions" style={{ width: "100%", flexWrap: "wrap", gap: 8, justifyContent: "flex-end", marginLeft: 0 }}>
            <label title={tr("Language")} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#6b4657", fontSize: 13 }}>
              <Languages size={17} aria-hidden="true" />
              <span className="sr-only">{tr("Language")}</span>
              <select
                aria-label={tr("Language")}
                value={language}
                onChange={(event) => onLanguageChange(event.target.value as UILanguage)}
                style={{ maxWidth: 125, border: "1px solid #e9d9df", borderRadius: 9, padding: "8px 5px", background: "#fff", color: "#5b1835" }}
              >
                <option value="en">English</option>
                <option value="si">සිංහල</option>
                <option value="ta">தமிழ்</option>
              </select>
            </label>
            <button
              type="button"
              onClick={quickExit}
              aria-label={tr("Quick exit")}
              title={tr("Quick exit")}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "9px 11px", border: "1px solid #c7b6bd", borderRadius: 9, background: "#fff", color: "#5b1835", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}
            >
              <DoorOpen size={16} aria-hidden="true" /> {tr("Quick exit")}
            </button>
            <button className="button button-primary" onClick={openComplaint}>{tr("File a complaint")}</button>
            {isSignedIn ? (
              <>
                <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotice("You’re all caught up. These are demonstration notifications only.")}><Bell size={19}/><i/></button>
                <div className="profile-wrap">
                  <button className="profile-button" onClick={() => setShowProfile(v => !v)}>
                    <span className="avatar">{(userEmail ?? "S").charAt(0).toUpperCase()}</span><span className="profile-name">{userEmail ?? "SafeHer user"}<small>{tr("Signed-in account")}</small></span><ChevronDown size={15}/>
                  </button>
                  {showProfile && <div className="profile-menu"><strong>{tr("Signed-in account")}</strong><span>{tr("Dashboard demo data")}</span><button onClick={() => {setShowProfile(false); go("settings");}}>{tr("Account settings")}</button><button onClick={() => {setShowProfile(false); void onSignOut();}}>{tr("Sign out")} <LogOut size={14}/></button></div>}
                </div>
              </>
            ) : (
              <button className="button button-outline" onClick={() => onRequestAuth("account")}>{tr("Sign in / Sign up")}</button>
            )}
          </div>
        </header>

        <div className="page-content">
          {isSignedIn && phase4Loading && <div className="safety-note" role="status"><Clock3 size={18}/><span>Loading your dashboard from Supabase…</span></div>}
          {isSignedIn && phase4Error && <div className="modal-warning" role="alert"><AlertCircle size={17}/><span>{phase4Error}</span><button type="button" className="text-link" onClick={() => setPhase4Reload(n => n + 1)}>Retry</button></div>}
          {notice && <div className="notice" role="status"><CheckCircle2 size={17}/><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss"><X size={16}/></button></div>}

          {page === "overview" && <section>
            <div className="welcome-row">
              <div><div className="eyebrow">{new Intl.DateTimeFormat(language === "si" ? "si-LK" : language === "ta" ? "ta-LK" : "en-GB", { dateStyle: "full" }).format(new Date("2026-11-10T12:00:00Z"))}</div><h1>{tr("A little support can make a big difference.")}</h1><p className="lead">{tr("Welcome to your SafeHer space. Take things one step at a time — support starts with you.")}</p></div>
              <div className="welcome-art"><div className="art-circle"><Flower2 size={76} strokeWidth={0.8}/></div><span className="art-sparkle sparkle-one">✳</span><span className="art-sparkle sparkle-two">✧</span><span className="art-leaf">♡</span></div>
            </div>

            <div className="quick-grid">
              <button className="quick-card primary-quick" onClick={() => go("support")}><span className="quick-icon"><HeartHandshake size={21}/></span><span><strong>{tr("Explore support")}</strong><small>{tr("Find the help that feels right")}</small></span><ArrowRight size={18}/></button>
              <button className="quick-card" onClick={openComplaint}><span className="quick-icon rose"><FileText size={21}/></span><span><strong>{tr("File a complaint")}</strong><small>{isSignedIn ? tr("Protected complaint access") : tr("Sign in or sign up to continue")}</small></span><ArrowRight size={18}/></button>
              <button className="quick-card" onClick={() => go(isSignedIn ? "credits" : "resources")}><span className="quick-icon copper"><BookOpen size={21}/></span><span><strong>{isSignedIn ? tr("View support credits") : tr("Explore resources")}</strong><small>{isSignedIn ? tr("See available sponsored support") : tr("Read guides without signing in")}</small></span><ArrowRight size={18}/></button>
            </div>

            {isSignedIn ? <div className="section-heading"><div><div className="eyebrow">{tr("YOUR OVERVIEW")}</div><h2>{tr("Your support at a glance")}</h2></div><button className="text-link" onClick={() => go("appointments")}>{tr("View appointments")} <ArrowRight size={15}/></button></div> : <div className="section-heading"><div><div className="eyebrow">{tr("WELCOME TO SAFEHER")}</div><h2>{tr("Explore support freely")}</h2><p className="muted">{tr("You can browse services and resources without creating an account. Sign in only when you need protected features.")}</p></div></div>}
            {isSignedIn && <>
            <div className="stats-grid">
              <div className="stat-card"><div className="stat-icon blush"><CalendarClock size={19}/></div><span>{tr("Upcoming requests")}</span><strong>{upcoming.length.toString().padStart(2,"0")}</strong><small>{tr("Appointments in progress")}</small></div>
              <div className="stat-card"><div className="stat-icon peach"><Wallet size={19}/></div><span>{tr("Available support credits")}</span><strong>{money(totalCredits)}</strong><small>Read-only Supabase allocation</small></div>
              <div className="stat-card"><div className="stat-icon mauve"><Heart size={19}/></div><span>{tr("Support pathways")}</span><strong>03</strong><small>{tr("Explore options at your pace")}</small></div>
            </div>

            <div className="lower-grid">
              <div className="panel appointments-panel"><div className="panel-heading"><div><h3>{tr("Coming up")}</h3><p>{tr("Your next appointment requests")}</p></div><button className="icon-button" onClick={() => go("appointments")} aria-label="View all"><ArrowRight size={18}/></button></div>
                {upcoming.slice(0,2).map(a => <AppointmentMini key={a.id} appointment={a}/>)}
                {upcoming.length === 0 && <EmptyState text={tr("No upcoming appointments yet.")}/>}
              </div>
              <div className="gentle-card"><div className="gentle-flower"><Flower2 size={29}/></div><div className="eyebrow">{tr("A NOTE FOR YOU")}</div><h3>{tr("You deserve to feel heard, supported and respected.")}</h3><p>{tr("There is no right pace. Explore the options available and choose what feels comfortable.")}</p><button className="light-link" onClick={() => go("resources")}>{tr("Explore helpful resources")} <ArrowRight size={15}/></button></div>
            </div>
            </>}
          </section>}

          {page === "support" && <section>
            <PageIntro eyebrow={tr("HERE WHEN YOU NEED US")} title={tr("Find the support that feels right.")} text={tr("Every journey is different. Explore the support pathways and choose what feels most helpful to you.")}/>
            <div className="safety-note"><LockKeyhole size={18}/><span><strong>{tr("Your choice comes first.")}</strong> {tr("You can explore these options without requesting an appointment.")}</span></div>
            <div className="service-grid">
              {services.map((s, i) => <article className="service-card" key={s.title}><div className={`service-icon service-${i}`}><IconFor name={s.icon}/></div><span className="service-tag">{tr(s.tag)}</span><h3>{tr(s.title)}</h3><p>{tr(s.description)}</p><button className="button button-outline" onClick={() => openBooking(i === 0 ? "Legal consultation" : i === 1 ? "Psychosocial support" : "Community support referral")}>{tr("Request support")} <ArrowRight size={16}/></button></article>)}
            </div>
            <div className="under18-card"><div className="under18-icon"><ShieldCheck size={23}/></div><div><span className="eyebrow">{tr("YOUNG PEOPLE")}</span><h3>{tr("Are you under 18?")}</h3><p>{tr("Young people need an age-appropriate, safeguarded support pathway. This prototype does not collect details or create appointments for under-18 users.")}</p></div><button className="button button-dark" onClick={() => setUnder18(true)}>{tr("View safety information")} <ArrowRight size={16}/></button></div>
          </section>}

          {isSignedIn && page === "appointments" && <section>
            <PageIntro eyebrow="YOUR NEXT STEPS" title="My appointments" text="Keep track of your support requests in one place." action={<button className="button button-primary" onClick={() => openBooking("Legal consultation")}><Plus size={17}/> New request</button>}/>
            <div className="safety-note"><AlertCircle size={18}/><span>Prototype: requests are saved to Supabase, but no professional is notified or booked.</span></div>
            <div className="panel table-panel"><div className="panel-heading"><div><h3>Appointment requests</h3><p>{data.appointments.length} requests from your Supabase account</p></div><span className="subtle-label">SUPABASE DATA</span></div>
              {data.appointments.length === 0 ? <EmptyState text="You haven't made an appointment request yet."/> : <div className="appointment-list">{[...data.appointments].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(a => <div className="appointment-row" key={a.id}><div className="appointment-date"><strong>{new Date(`${a.date}T12:00:00`).toLocaleDateString("en-GB",{day:"2-digit"})}</strong><span>{new Date(`${a.date}T12:00:00`).toLocaleDateString("en-GB",{month:"short"})}</span></div><div className="appointment-info"><strong>{a.service}</strong><span><CalendarDays size={14}/> {new Date(`${a.date}T12:00:00`).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})} · {a.time}</span><span>{a.format === "Online" ? <Video size={14}/> : <MapPin size={14}/>} {a.format}</span><small>Ref: {a.id}</small></div><div className="appointment-end"><Status status={a.status}/>{(a.status === "Requested" || a.status === "Confirmed") && <button className="quiet-button" disabled={appointmentBusy} onClick={() => void cancelAppointment(a.id)}>Cancel request</button>}</div></div>)}</div>}
            </div>
          </section>}

          {isSignedIn && page === "credits" && <section>
            <PageIntro eyebrow="SUPPORT MADE MORE ACCESSIBLE" title="Sponsored support credits" text="Explore the demonstration credits that may help cover eligible support services."/>
            <div className="credit-summary"><div><span className="eyebrow">AVAILABLE DEMO BALANCE</span><strong>{money(totalCredits)}</strong><p>Allocated balance · Read-only prototype</p></div><div className="credit-summary-icon"><Wallet size={43}/></div></div>
            <div className="section-heading"><div><h2>Available programmes</h2><p className="muted">Only allocations assigned to your account appear here</p></div></div>
            {data.credits.length === 0 && <EmptyState text="No sponsored credits have been allocated to your account."/>}
            <div className="credit-grid">{data.credits.map(c => <article className="credit-card" key={c.id}><div className="credit-top"><div className="credit-icon"><Heart size={20}/></div><span className="subtle-label">{c.id}</span></div><h3>{c.sponsor}</h3><p>{c.purpose}</p><div className="credit-amount"><strong>{money(c.remaining)}</strong><span>remaining demo credit</span></div><div className="progress-track"><span style={{width:`${Math.max(0,Math.min(100,c.remaining / c.amount * 100))}%`}}/></div><button className="button button-outline full-width" type="button" disabled>Redemption unavailable in prototype</button></article>)}</div>
            <p className="fine-print"><LockKeyhole size={14}/> Balances are read from Supabase. Redemption and payments are not available in this prototype.</p>
          </section>}

          {page === "resources" && <section>
            <PageIntro eyebrow={tr("INFORMATION & GUIDANCE")} title={tr("Resource library")} text={tr("A small collection of introductory guides to help you understand the support pathways.")}/>
            <div className="search-box"><Search size={18}/><input value={searchText} onChange={e=>setSearchText(e.target.value)} placeholder={tr("Search guides and topics...")} aria-label={tr("Search guides and topics...")}/><SlidersHorizontal size={17}/></div>
            <div className="resource-grid">{filteredResources.map((r,i)=><article className="resource-card" key={r.title}><div className={`resource-art resource-art-${i%4}`}><FileText size={27}/><span>{tr(r.category)}</span></div><div className="resource-body"><span className="eyebrow">{tr(r.read)}</span><h3>{tr(r.title)}</h3><p>{tr(r.description)}</p><button className="text-link" onClick={()=>setNotice(`“${r.title}” is a sample resource. Full reviewed content will be added before launch.`)}>{tr("Read guide")} <ArrowRight size={15}/></button></div></article>)}</div>
            {filteredResources.length === 0 && <EmptyState text={tr("No guides match that search. Try another keyword.")}/>}
          </section>}

          {isSignedIn && page === "settings" && <section>
            <PageIntro eyebrow="YOUR ACCOUNT, YOUR CHOICES" title="Privacy & settings" text="Review the demonstration preferences below. These controls do not represent production security or consent management."/>
            <div className="settings-layout"><div className="panel settings-panel"><div className="panel-heading"><div><h3>Privacy preferences</h3><p>Choose how this demo handles optional preferences.</p></div><LockKeyhole size={20}/></div>
              <ToggleRow title="Anonymous service insights" description="Save a preference for possible future aggregated insights; no analytics collection is enabled here." checked={data.privacy.shareAnonymousInsights} onChange={v=>void savePreference("share_anonymous_insights",v)}/>
              <ToggleRow title="Email updates" description="Save a preference for future product updates; no mailing service is connected." checked={data.privacy.emailUpdates} onChange={v=>void savePreference("email_updates",v)}/>
              <div className="settings-foot"><button className="button button-outline" onClick={()=>setPhase4Reload(n=>n+1)}>Reload from Supabase</button></div>
            </div><div className="privacy-aside"><div className="privacy-lock"><ShieldCheck size={27}/></div><h3>Your safety matters.</h3><p>This is a frontend demonstration. Do not enter real names, contact details, case information or other sensitive personal data.</p><p>Before real-world use, SafeHer needs secure authentication, backend authorization, verified providers, safeguarding procedures and a privacy review.</p></div></div>
          </section>}

          <footer className="page-footer"><Brand compact/><span>{tr("Designed with care. Built around choice and dignity.")}</span><span>© 2026 SafeHer · Prototype</span></footer>
        </div>
      </main>

      {(complaintOpen || bookingOpen || under18 || showHelp) && (
        <button
          type="button"
          onClick={quickExit}
          aria-label={tr("Quick exit")}
          style={{ position: "fixed", top: 12, right: 12, zIndex: 100, display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 12px", border: "1px solid #bca9b1", borderRadius: 9, background: "#fff", color: "#5b1835", fontWeight: 700, boxShadow: "0 4px 16px #0002" }}
        >
          <DoorOpen size={16} /> {tr("Quick exit")}
        </button>
      )}

      {complaintOpen && isSignedIn && ageGroup === "adult" && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setComplaintOpen(false);}}>
        <div className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="complaint-title" style={{ maxHeight: "90vh", overflowY: "auto" }}>
          <div className="modal-head">
            <div><span className="eyebrow">PRIVATE REQUEST · DEMO</span><h2 id="complaint-title">{editingComplaintId ? "Edit demo complaint" : "File a complaint"}</h2></div>
            <button type="button" className="icon-button" onClick={()=>setComplaintOpen(false)} aria-label="Close"><X size={20}/></button>
          </div>
          <div className="safety-note"><ShieldCheck size={19}/><span>This is a technical prototype, not a staffed reporting service. Use fictional examples only. Do not enter real names, contact information, incident descriptions or other sensitive details.</span></div>
          <form onSubmit={e => void submitComplaint(e)}>
            <label htmlFor="complaint-category">Complaint category</label>
            <select id="complaint-category" value={complaintCategory} onChange={e => setComplaintCategory(e.target.value as ComplaintCategory)} required>
              <option value="legal">Legal support</option>
              <option value="psychosocial">Psychosocial support</option>
              <option value="community">Community support</option>
              <option value="other">Other</option>
            </select>
            <label htmlFor="complaint-demo-note" style={{ display: "block", marginTop: 16 }}>Additional information (demo only)</label>
            <textarea
              id="complaint-demo-note"
              value={complaintNote}
              onChange={e => setComplaintNote(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Example: I would like general information about community services. (Fictional test text only)"
              style={{ width: "100%", resize: "vertical", border: "1px solid #e9d9df", borderRadius: 10, padding: 12, background: "#fff", color: "#4d2837", font: "inherit", marginTop: 8 }}
            />
            <p className="fine-print" style={{ textAlign: "right", marginTop: 4 }}>{complaintNote.length}/500 characters · Do not enter real case details</p>
            {complaintFormError && <div className="modal-warning" role="alert"><AlertCircle size={17}/><span>{complaintFormError}</span></div>}
            <div className="modal-actions">
              <button type="button" className="button button-outline" onClick={()=>{setComplaintOpen(false);setEditingComplaintId(null);}}>Cancel</button>
              <button type="submit" disabled={submittingComplaint} className="button button-primary">{submittingComplaint ? "Saving…" : editingComplaintId ? "Save changes" : "Submit demo request"} <ArrowRight size={16}/></button>
            </div>
          </form>
          <div style={{ borderTop: "1px solid #e9d9df", marginTop: 22, paddingTop: 18 }}>
            <div className="panel-heading"><div><h3>My submitted complaints</h3><p>Only your own demo requests appear here.</p></div><span className="subtle-label">{complaints.length} saved</span></div>
            {editingComplaintId && <button type="button" className="text-link" onClick={()=>{setEditingComplaintId(null);setComplaintCategory("legal");setComplaintNote("");setComplaintFormError("");}}>+ Create a new request instead</button>}
            {complaints.length === 0 && <p className="muted">No requests saved yet.</p>}
            {complaints.map(record => (
              <div key={record.id} style={{ border: "1px solid #eadce2", borderRadius: 12, padding: 12, marginTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <strong>{({ legal: "Legal support", psychosocial: "Psychosocial support", community: "Community support", other: "Other" } as Record<ComplaintCategory,string>)[record.category]}</strong>
                  <span className="subtle-label">{record.status.replace("_", " ")}</span>
                </div>
                <p className="muted" style={{ marginTop: 6, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{record.demo_note || "No additional demo information."}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <small className="fine-print">{new Date(record.created_at).toLocaleDateString()}</small>
                  {record.status === "received" && <button type="button" className="text-link" onClick={()=>editComplaint(record)}>Edit request <ArrowRight size={14}/></button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>}

      {complaintAccessOpen && isSignedIn && (
        <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setComplaintAccessOpen(false); }}>
          <div className="booking-modal small-modal" role="dialog" aria-modal="true" aria-labelledby="complaint-access-title">
            <div className="modal-head">
              <div>
                <span className="eyebrow">COMPLAINT ACCESS</span>
                <h2 id="complaint-access-title">{ageGroup === null ? "Checking your account" : "Protected submission"}</h2>
              </div>
              <button type="button" className="icon-button" aria-label="Close" onClick={() => setComplaintAccessOpen(false)}><X size={20}/></button>
            </div>
            {ageGroup === null ? (
              <>
                <p className="muted">{complaintAccessError || "Waiting for the FastAPI account verification response."}</p>
                <p className="fine-print">If you see a session error, sign out and sign in again. The backend must return 200 for /api/v1/me.</p>
                <div className="modal-actions">
                  <button type="button" className="button button-outline" onClick={() => setComplaintAccessOpen(false)}>Close</button>
                  <button type="button" className="button button-primary" onClick={() => setComplaintAccessReload(n => n + 1)}>Retry check</button>
                </div>
              </>
            ) : (
              <>
                <p className="muted">Complaint submission is not enabled for this account. This prototype accepts category-only submissions from verified adult test accounts. Do not change an under-18 or unverified account to bypass this safeguard.</p>
                <button type="button" className="button button-primary full-width" onClick={() => { setComplaintAccessOpen(false); setUnder18(true); }}>View safety information</button>
              </>
            )}
          </div>
        </div>
      )}

      {bookingOpen && isSignedIn && <div className="modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setBookingOpen(false);}}><div className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-title"><div className="modal-head"><div><span className="eyebrow">{tr("TAKE THE NEXT STEP")}</span><h2 id="booking-title">{tr("Request support")}</h2><p>This saves a request in Supabase, not a confirmed booking.</p></div><button className="icon-button" onClick={()=>setBookingOpen(false)} aria-label="Close"><X size={20}/></button></div>
        <form onSubmit={e=>{e.preventDefault();void createAppointment(new FormData(e.currentTarget));}}>
          <label>Support pathway<select value={selectedService} onChange={e=>setSelectedService(e.target.value)}><option>Legal consultation</option><option>Psychosocial support</option><option>Community support referral</option></select></label>
          <div className="form-row"><label>{tr("Preferred date")}<input type="date" required min={todayColombo()} name="date"/></label><label>{tr("Preferred time")}<select name="time" defaultValue="10:00"><option value="09:00">09:00</option><option value="10:00">10:00</option><option value="10:30">10:30</option><option value="11:00">11:00</option><option value="13:00">13:00</option><option value="14:00">14:00</option><option value="15:00">15:00</option></select></label></div>
          <label>{tr("Preferred format")}<select name="format" defaultValue="Online"><option>Online</option><option>In person</option></select></label>
          <div className="modal-warning"><AlertCircle size={17}/><span>Time zone: Sri Lanka (UTC+05:30). This saves a request to Supabase but does not confirm professional availability or a booking.</span></div>
          {appointmentError && <div className="modal-warning" role="alert"><AlertCircle size={17}/><span>{appointmentError}</span></div>}
          <div className="modal-actions"><button type="button" className="button button-outline" onClick={()=>setBookingOpen(false)}>{tr("Go back")}</button><button type="submit" disabled={appointmentBusy} className="button button-primary">{appointmentBusy ? "Saving…" : "Save request"} <ArrowRight size={16}/></button></div>
        </form></div></div>}

      {under18 && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setUnder18(false);}}><div className="booking-modal small-modal" role="dialog" aria-modal="true"><div className="modal-head"><div><span className="eyebrow">{tr("YOUNG PEOPLE")}</span><h2>{tr("Age-appropriate support")}</h2></div><button className="icon-button" onClick={()=>setUnder18(false)} aria-label="Close"><X size={20}/></button></div><div className="under18-message"><ShieldCheck size={35}/><p>This prototype does not collect personal details or allow appointment booking for anyone under 18.</p><p>A live service must provide a separately designed, age-appropriate safeguarding pathway with trained personnel and clear escalation procedures.</p></div><button className="button button-primary full-width" onClick={()=>setUnder18(false)}>{tr("I understand")}</button></div></div>}

      {showHelp && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowHelp(false);}}><div className="booking-modal small-modal" role="dialog" aria-modal="true"><div className="modal-head"><div><span className="eyebrow">SAFEHER HELP</span><h2>{tr("How can we help?")}</h2></div><button className="icon-button" onClick={()=>setShowHelp(false)} aria-label="Close"><X size={20}/></button></div><p className="muted">This is a demonstration help panel. In a production release, this area can connect to reviewed help articles and a staffed support channel.</p><div className="help-options"><div><CircleHelp size={18}/> Getting started</div><div><CalendarDays size={18}/> Appointment requests</div><div><LockKeyhole size={18}/> Privacy and safety</div></div><button className="button button-primary full-width" onClick={()=>setShowHelp(false)}>{tr("Close")}</button></div></div>}
    </div>
  );
}

function PageIntro({eyebrow,title,text,action}:{eyebrow:string;title:string;text:string;action?:ReactNode}) {
  return <div className="page-intro"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="lead">{text}</p></div>{action}</div>;
}
function AppointmentMini({appointment:a}:{appointment:Appointment}) {
  return <div className="mini-appointment"><div className="mini-date"><CalendarDays size={17}/></div><div><strong>{a.service}</strong><span>{new Date(`${a.date}T12:00:00`).toLocaleDateString("en-GB",{day:"numeric",month:"short"})} · {a.time}</span></div><Status status={a.status}/></div>;
}
function Status({status}:{status:Appointment["status"]}) {
  const cls = status.toLowerCase();
  return <span className={`status status-${cls}`}>{status}</span>;
}
function EmptyState({text}:{text:string}) {
  return <div className="empty-state"><div><CalendarDays size={22}/></div><p>{text}</p></div>;
}
function ToggleRow({title,description,checked,onChange}:{title:string;description:string;checked:boolean;onChange:(v:boolean)=>void}) {
  return <div className="toggle-row"><div><strong>{title}</strong><p>{description}</p></div><button type="button" role="switch" aria-checked={checked} className={`switch ${checked?"switch-on":""}`} onClick={()=>onChange(!checked)}><span/></button></div>;
}
