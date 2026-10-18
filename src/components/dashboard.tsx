"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MotionConfig, motion, useReducedMotion } from "motion/react";
import { MagnifyingGlass, Moon, PencilSimple, Plus, SignOut, Sun } from "@phosphor-icons/react";
import type { DashboardCategory, DashboardConfig, DashboardLink } from "@/lib/config";
import { BookmarkSection } from "@/components/bookmark-section";
import { EditorDialog } from "@/components/editor-dialog";
import { NetworkMap } from "@/components/network-map";
import { TrainWidget } from "@/components/train-widget";

type Editor = { kind: "link"; categoryId: string; value?: DashboardLink } | { kind: "category"; value?: DashboardCategory };

const dateText = () => new Intl.DateTimeFormat("fr-BE", { timeZone: "Europe/Brussels", weekday: "long", day: "numeric", month: "long" }).format(new Date());
const timeText = () => new Intl.DateTimeFormat("fr-BE", { timeZone: "Europe/Brussels", hour: "2-digit", minute: "2-digit" }).format(new Date());

export function Dashboard({ initialConfig }: { initialConfig: DashboardConfig }) {
  const [config, setConfig] = useState(initialConfig);
  const [editMode, setEditMode] = useState(false);
  const [search, setSearch] = useState("");
  const [clock, setClock] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const reduceMotion = useReducedMotion();

  const saveConfig = useCallback(async (next: DashboardConfig) => {
    setConfig(next);
    setSaving(true);
    setSaveError("");
    try {
      const response = await fetch("/api/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      if (!response.ok) throw new Error("save");
      const saved = await response.json() as DashboardConfig;
      setConfig(saved);
    } catch {
      setSaveError("Modifications non enregistrées. Réessaie dans un instant.");
    } finally {
      setSaving(false);
    }
  }, []);

  const onStation = useCallback((stationId: string, stationName: string) => {
    setConfig((current) => {
      if (current.stationId === stationId && current.stationName === stationName) return current;
      const next = { ...current, stationId, stationName };
      void saveConfig(next);
      return next;
    });
  }, [saveConfig]);

  useEffect(() => {
    const update = () => setClock(timeText());
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = config.theme;
    window.localStorage.setItem("init-theme", config.theme);
  }, [config.theme]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("quick-search")?.focus();
      }
      if (event.key === "Escape" && document.activeElement?.id === "quick-search") setSearch("");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visibleCategories = useMemo(() => config.categories.filter((category) => category.name.toLocaleLowerCase("fr").includes(search.toLocaleLowerCase("fr")) || category.links.some((link) => `${link.name} ${link.note}`.toLocaleLowerCase("fr").includes(search.toLocaleLowerCase("fr")))), [config.categories, search]);

  function saveEditor(value: DashboardLink | DashboardCategory, kind: "link" | "category", categoryId?: string) {
    let categories = config.categories;
    if (kind === "link" && categoryId) {
      const link = value as DashboardLink;
      categories = categories.map((category) => category.id === categoryId ? { ...category, links: category.links.some((item) => item.id === link.id) ? category.links.map((item) => item.id === link.id ? link : item) : [...category.links, link] } : category);
    } else if (kind === "category") {
      const category = value as DashboardCategory;
      categories = categories.some((item) => item.id === category.id) ? categories.map((item) => item.id === category.id ? category : item) : [...categories, category];
    }
    void saveConfig({ ...config, categories });
  }

  function deleteEntry(kind: "link" | "category", id: string, categoryId?: string) {
    if (!window.confirm(kind === "link" ? "Supprimer ce raccourci ?" : "Supprimer cette catégorie et ses liens ?")) return;
    const categories = kind === "category"
      ? config.categories.filter((category) => category.id !== id)
      : config.categories.map((category) => category.id === categoryId ? { ...category, links: category.links.filter((link) => link.id !== id) } : category);
    if (categories.length) void saveConfig({ ...config, categories });
    else setSaveError("Garde au moins une catégorie. Tu peux la renommer ou la vider.");
  }

  function moveCategory(id: string, direction: -1 | 1) {
    const categories = [...config.categories];
    const index = categories.findIndex((category) => category.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= categories.length) return;
    [categories[index], categories[target]] = [categories[target], categories[index]];
    void saveConfig({ ...config, categories });
  }

  function moveLink(categoryId: string, id: string, direction: -1 | 1) {
    const categories = config.categories.map((category) => {
      if (category.id !== categoryId) return category;
      const links = [...category.links];
      const index = links.findIndex((link) => link.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= links.length) return category;
      [links[index], links[target]] = [links[target], links[index]];
      return { ...category, links };
    });
    void saveConfig({ ...config, categories });
  }

  async function toggleTheme() {
    await saveConfig({ ...config, theme: config.theme === "light" ? "dark" : "light" });
  }

  async function signOut() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    window.location.assign("/login");
  }

  return (
    <MotionConfig reducedMotion="user">
      <motion.main className="startpage" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}>
        <header className="topbar">
          <a className="brand" href="/" aria-label="INIT, accueil"><span className="brand-mark">N</span><span className="brand-name">INIT <i>/</i> STARTPAGE</span></a>
          <label className="search-box"><MagnifyingGlass size={17} weight="light" /><span className="sr-only">Rechercher un raccourci</span><input id="quick-search" type="search" placeholder="Trouver un lien…" value={search} onChange={(event) => setSearch(event.target.value)} /><kbd>⌘ K</kbd></label>
          <div className="topbar-actions">
            <button className="icon-button theme-button" onClick={toggleTheme} aria-label={config.theme === "light" ? "Passer en mode sombre" : "Passer en mode clair"}>{config.theme === "light" ? <Moon size={18} weight="light" /> : <Sun size={18} weight="light" />}</button>
            <button className={`edit-toggle ${editMode ? "is-active" : ""}`} onClick={() => setEditMode((value) => !value)} aria-pressed={editMode}><PencilSimple size={15} weight="light" />{editMode ? "Terminer" : "Modifier"}</button>
            <button className="icon-button signout-button" onClick={signOut} aria-label="Se déconnecter"><SignOut size={17} weight="light" /></button>
          </div>
        </header>

        <div className="welcome-line">
          <div><h1>Bonjour<span className="signal-period">.</span></h1><p>{dateText()} <span aria-hidden="true">·</span> Bruxelles</p></div>
          <time className="clock" aria-label={`Heure locale : ${clock}`}>{clock || "—:—"}</time>
        </div>

        <div className="content-grid">
          <div className="personal-column">
            <div className="section-bar"><h2>Mes raccourcis</h2><span>{visibleCategories.reduce((n, category) => n + category.links.length, 0)} liens</span></div>
            {visibleCategories.map((category) => <BookmarkSection key={category.id} category={category} editMode={editMode} search={search} onAddLink={(categoryId) => setEditor({ kind: "link", categoryId })} onEditLink={(categoryId, value) => setEditor({ kind: "link", categoryId, value })} onEditCategory={(value) => setEditor({ kind: "category", value })} onDeleteCategory={(id) => deleteEntry("category", id)} onMoveCategory={moveCategory} onMoveLink={moveLink} />)}
            {editMode && <button className="add-category" onClick={() => setEditor({ kind: "category" })}><Plus size={16} weight="light" />Ajouter une catégorie</button>}
            {!visibleCategories.length && <p className="search-empty">Aucun raccourci ne correspond à « {search} ».</p>}
          </div>
          <div className="rail-column">
            <TrainWidget stationId={config.stationId} stationName={config.stationName} onStation={onStation} />
            <NetworkMap />
          </div>
        </div>

        <footer className="page-footer"><span>INIT <i>/</i> ESPACE PERSONNEL</span><span>{saving ? "Enregistrement…" : saveError || "Réglages enregistrés"}</span><span>LOCAL · BRUXELLES</span></footer>
        {editor && <EditorDialog {...editor} onClose={() => setEditor(null)} onSave={saveEditor} onDelete={deleteEntry} />}
      </motion.main>
    </MotionConfig>
  );
}
