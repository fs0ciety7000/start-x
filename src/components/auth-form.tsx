"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, LockKey, ShieldCheck } from "@phosphor-icons/react";

export function AuthForm({ mode }: { mode: "login" | "setup" }) {
  const setup = mode === "setup";
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/${setup ? "sign-up" : "sign-in"}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(setup ? { "x-init-setup-token": setupToken } : {}) },
        body: JSON.stringify(setup ? { name, email, password, callbackURL: "/" } : { email, password, callbackURL: "/" }),
      });
      if (!response.ok) {
        setError(setup ? "La configuration n’a pas abouti. Vérifie le jeton et réessaie." : "Adresse ou mot de passe incorrect.");
        return;
      }
      window.location.assign("/");
    } catch {
      setError("Connexion impossible. Vérifie que le service est disponible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <header className="auth-brand"><span className="brand-mark">N</span><span>INIT <i>/</i> ESPACE PERSONNEL</span></header>
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-symbol"><LockKey size={21} weight="light" /></div>
        <h1 id="auth-title">{setup ? "Créer l’accès admin." : "Bon retour."}</h1>
        <p>{setup ? "Cette première inscription ouvre l’espace privé et ferme ensuite la création de compte." : "Connecte-toi pour retrouver tes raccourcis et le réseau en direct."}</p>
        <form onSubmit={submit} className="auth-form">
          {setup && <label>Nom<input autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} /></label>}
          <label>Adresse e-mail<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Mot de passe<input type="password" autoComplete={setup ? "new-password" : "current-password"} minLength={setup ? 12 : undefined} required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {setup && <label>Jeton de configuration<input type="password" autoComplete="off" required value={setupToken} onChange={(e) => setSetupToken(e.target.value)} /></label>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button-primary" disabled={busy}>{busy ? "Un instant…" : setup ? "Créer le compte" : "Se connecter"}<ArrowRight size={17} weight="light" /></button>
        </form>
        <div className="auth-foot"><ShieldCheck size={15} weight="light" /><span>Accès privé · inscription unique</span></div>
      </section>
      <span className="auth-coordinates">50°50′ N &nbsp; 4°21′ E</span>
    </main>
  );
}
