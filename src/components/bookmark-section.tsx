"use client";

import { ArrowDown, ArrowUp, ArrowUpRight, PencilSimple, Plus } from "@phosphor-icons/react";
import type { DashboardCategory, DashboardLink } from "@/lib/config";

type Props = {
  category: DashboardCategory;
  editMode: boolean;
  search: string;
  onAddLink: (categoryId: string) => void;
  onEditLink: (categoryId: string, link: DashboardLink) => void;
  onEditCategory: (category: DashboardCategory) => void;
  onDeleteCategory: (categoryId: string) => void;
  onMoveCategory: (categoryId: string, direction: -1 | 1) => void;
  onMoveLink: (categoryId: string, linkId: string, direction: -1 | 1) => void;
};

export function BookmarkSection({ category, editMode, search, onAddLink, onEditLink, onEditCategory, onDeleteCategory, onMoveCategory, onMoveLink }: Props) {
  const links = category.links.filter((link) => `${link.name} ${link.note} ${category.name}`.toLocaleLowerCase("fr").includes(search.toLocaleLowerCase("fr")));
  if (!links.length && search) return null;
  return (
    <section className={`bookmark-section ${category.isWork ? "work-section" : ""}`} aria-labelledby={`category-${category.id}`}>
      <header className="bookmark-heading">
        <div className="bookmark-heading-title">{category.isWork && <span className="signal-square" aria-hidden="true" />}<h2 id={`category-${category.id}`}>{category.name}</h2></div>
        {editMode && <div className="section-tools">
          <button className="text-action" onClick={() => onAddLink(category.id)}><Plus size={14} weight="light" />Lien</button>
          <button className="icon-button small" onClick={() => onMoveCategory(category.id, -1)} aria-label={`Déplacer ${category.name} vers le haut`}><ArrowUp size={14} weight="light" /></button>
          <button className="icon-button small" onClick={() => onMoveCategory(category.id, 1)} aria-label={`Déplacer ${category.name} vers le bas`}><ArrowDown size={14} weight="light" /></button>
          <button className="icon-button small" onClick={() => onEditCategory(category)} aria-label={`Modifier ${category.name}`}><PencilSimple size={14} weight="light" /></button>
        </div>}
      </header>
      <ul className={`bookmark-grid ${category.isWork ? "work-grid" : ""}`}>
        {links.map((link, index) => <li key={link.id} className="bookmark-item">
          <a className="bookmark-link" href={link.url} target="_blank" rel="noopener noreferrer" aria-label={`${link.name}${link.note ? `, ${link.note}` : ""} — ouvre dans un nouvel onglet`}>
            <span className="bookmark-mark" aria-hidden="true">{link.icon || "↗"}</span>
            <span className="bookmark-copy"><strong>{link.name}</strong>{category.isWork && link.note && <small>{link.note}</small>}</span>
            <ArrowUpRight className="bookmark-arrow" size={15} weight="light" aria-hidden="true" />
          </a>
          {editMode && <div className="link-tools">
            <button className="icon-button small" onClick={() => onMoveLink(category.id, link.id, -1)} aria-label={`Déplacer ${link.name} avant`} disabled={index === 0}><ArrowUp size={13} weight="light" /></button>
            <button className="icon-button small" onClick={() => onMoveLink(category.id, link.id, 1)} aria-label={`Déplacer ${link.name} après`} disabled={index === links.length - 1}><ArrowDown size={13} weight="light" /></button>
            <button className="icon-button small" onClick={() => onEditLink(category.id, link)} aria-label={`Modifier ${link.name}`}><PencilSimple size={13} weight="light" /></button>
          </div>}
        </li>)}
        {!links.length && <li className="empty-links">Aucun lien ici. Ajoute ton premier raccourci.</li>}
      </ul>
      {editMode && category.isWork && <button className="work-add" onClick={() => onAddLink(category.id)}><Plus size={15} weight="light" />Ajouter une application de travail</button>}
      {editMode && <button className="category-remove" onClick={() => onDeleteCategory(category.id)}>Supprimer la catégorie</button>}
    </section>
  );
}
