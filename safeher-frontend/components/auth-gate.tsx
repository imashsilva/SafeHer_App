"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import SafeHerApp from "@/components/safeher-app";
import { quickExit, translateUI } from "@/lib/ui-language";
import type { UILanguage } from "@/lib/ui-language";
import { DoorOpen } from "lucide-react";

type AuthMode = "login" | "signup";

export default function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [language, setLanguage] = useState<UILanguage>("en");
  const tr = (text: string) => translateUI(language, text);

  function changeLanguage(next: UILanguage) {
    setLanguage(next);
    document.documentElement.lang = next;
    try { localStorage.setItem("safeher-ui-language", next); } catch {}
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem("safeher-ui-language");
      if (saved === "en" || saved === "si" || saved === "ta") {
        setLanguage(saved);
        document.documentElement.lang = saved;
      }
    } catch {}
  }, []);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingComplaint, setPendingComplaint] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setMessage(error.message);
        setSession(data.session);
      })
      .catch(() => {
        // The public site remains available even if auth cannot be reached.
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!active) return;
        setSession(nextSession);
        if (nextSession) {
          setAuthOpen(false);
          setPassword("");
          setMessage("");
        }
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  function openAuth(reason: "complaint" | "account" = "account") {
    setPendingComplaint(reason === "complaint");
    setMode("login");
    setShowPassword(false);
    setMessage("");
    setAuthOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage(
          data.session
            ? tr("Account created. You are signed in.")
            : tr("Check your email for the confirmation link, then sign in.")
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      const raw = error instanceof Error ? error.message : tr("Authentication failed.");
      setMessage(
        /failed to fetch|networkerror/i.test(raw)
          ? tr("Cannot reach Supabase. Check your internet connection, Supabase project URL, and any browser extensions blocking requests.")
          : raw
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) setMessage(error.message);
  }

  return (
    <>
      <SafeHerApp
        language={language}
        onLanguageChange={changeLanguage}
        userId={session?.user.id}
        userEmail={session?.user.email}
        onSignOut={handleSignOut}
        onRequestAuth={openAuth}
        complaintRequested={pendingComplaint}
        onComplaintNoticeShown={() => setPendingComplaint(false)}
      />

      {authOpen && !session && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setAuthOpen(false);
              setPendingComplaint(false);
            }
          }}
        >
          <div
            className="booking-modal small-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="safeher-auth-title"
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">{tr("SAFEHER ACCOUNT")}</span>
                <h2 id="safeher-auth-title">
                  {tr(mode === "login" ? "Sign in" : "Create an account")}
                </h2>
                <p>{tr("Sign in to access private SafeHer features.")}</p>
              </div>
              <button
                type="button"
                onClick={quickExit}
                title={tr("Quick exit")}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 10px", border: "1px solid #c7b6bd", borderRadius: 9, background: "white", color: "#5b1835", cursor: "pointer", fontWeight: 700 }}
              >
                <DoorOpen size={16} /> {tr("Quick exit")}
              </button>
              <button
                className="icon-button"
                aria-label="Close login"
                onClick={() => {
                  setAuthOpen(false);
                  setPendingComplaint(false);
                }}
                type="button"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label>
                {tr("Email address")}
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label>
                {tr("Password")}
                <span style={{ position: "relative", display: "block" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    style={{ paddingRight: 46 }}
                  />
                  <button
                    type="button"
                    aria-label={tr(showPassword ? "Hide password" : "Show password")}
                    aria-pressed={showPassword}
                    title={tr(showPassword ? "Hide password" : "Show password")}
                    onClick={() => setShowPassword((visible) => !visible)}
                    style={{
                      position: "absolute",
                      right: 9,
                      top: "50%",
                      transform: "translateY(-50%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 4,
                      border: "none",
                      background: "transparent",
                      color: "#745663",
                      cursor: "pointer",
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </label>

              {message && <p role="status" className="muted">{message}</p>}

              <button className="button button-primary full-width" type="submit" disabled={busy}>
                {tr(busy ? "Please wait..." : mode === "login" ? "Sign in" : "Sign up")}
              </button>
            </form>

            <p className="muted" style={{ marginTop: 16 }}>
              {tr(mode === "login" ? "New to SafeHer?" : "Already have an account?")}{" "}
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setShowPassword(false);
                  setMessage("");
                }}
              >
                {tr(mode === "login" ? "Create an account" : "Sign in")}
              </button>
            </p>
            <p className="fine-print">
              {tr("This is a prototype. Do not enter personal case details or complaints here.")}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
