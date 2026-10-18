"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { X } from "@phosphor-icons/react";
import type { DashboardCategory, DashboardLink } from "@/lib/config";

type LinkValue = { kind: "link"; categoryId: string; value?: DashboardLink };
type CategoryValue = { kind: "category"; value?: DashboardCategory };
type Props = (LinkValue | CategoryValue) & { onClose: () => void; onSave: (value: DashboardLink | DashboardCategory, kind: "link" | "category", categoryId?: string) => void; onDelete?: (kind: "link" | "category", id: string, categoryId?: string) => void };

export function EditorDialog(props: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(props.value?.name ?? "");
  const [url, setUrl] = useState(props.kind === "link" ? props.value?.url ?? "https://" : "");
  const [icon, setIcon] = useState(props.kind === "link" ? props.value?.icon ?? "↗" : "");
  const [note, setNote] = useState(props.kind === "link" ? props.value?.note ?? "" : "");
  const [isWork, setIsWork] = useState(props.kind === "category" ? props.value?.isWork ?? false : false);
  const [error, setError] = useState("");
  const editing = Boolean(props.value);

  useEffect(() => { dialog.current?.showModal(); }, []);
  const close = () => { dialog.current?.close(); props.onClose(); };

  function submit(event: FormEvent) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) { setError("Ajoute un nom pour continuer."); return; }
    if (props.kind === "link") {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
      } catch { setError("Entre une adresse web valide (https:// ou http://)."); return; }
      props.onSave({ id: props.value?.id ?? crypto.randomUUID(), name: cleanName, url, icon: icon.trim().slice(0, 4) || "↗", note: note.trim() }, "link", props.categoryId);
    } else {
      props.onSave({ id: props.value?.id ?? crypto.randomUUID(), name: cleanName, isWork, links: props.value?.links ?? [] }, "category");
    }
    close();
  }

  return (
    <dialog ref={dialog} className="editor-dialog" onCancel={(event) => { event.preventDefault(); close(); }}>
      <div className="dialog-top"><span>{editing ? "Modifier" : "Ajouter"} {props.kind === "link" ? "un lien" : "une catégorie"}</span><button type="button" className="icon-button" aria-label="Fermer" onClick={close}><X size={18} weight="light" /></button></div>
      <form onSubmit={submit} className="editor-form">
        <label>Nom<input autoFocus maxLength={48} value={name} onChange={(event) => setName(event.target.value)} required /></label>
        {props.kind === "link" ? <>
          <label>Adresse<input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" required /></label>
          <div className="form-row">
            <label>Monogramme<input value={icon} onChange={(event) => setIcon(event.target.value)} maxLength={4} /></label>
            <label>Note<input value={note} onChange={(event) => setNote(event.target.value)} maxLength={80} placeholder="Optionnel" /></label>
          </div>
        </> : <label className="check-label"><input type="checkbox" checked={isWork} onChange={(event) => setIsWork(event.target.checked)} />Marquer comme espace WORK</label>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="dialog-actions">
          {editing && props.onDelete && <button type="button" className="button-quiet danger" onClick={() => { props.onDelete?.(props.kind, props.value!.id, props.kind === "link" ? props.categoryId : undefined); close(); }}>Supprimer</button>}
          <button type="button" className="button-quiet" onClick={close}>Annuler</button>
          <button className="button-primary">{editing ? "Enregistrer" : "Ajouter"}</button>
        </div>
      </form>
    </dialog>
  );
}
