"use client";

import { useEffect, useState } from "react";

/*
 * Checklist de développement : reste enregistrée sur ce navigateur (même
 * clé que l'ancienne page, pour retrouver les tâches déjà cochées).
 */
type Task = { id: string; title: string; done: boolean; due: string };
const KEY = "auto9-crm-development-v1";
const firstTasks: Task[] = [
  { id: "1", title: "Qualifier 20 garages VO autour de Nîmes", done: false, due: "" },
  { id: "2", title: "Préparer le mail de présentation AUTO 9", done: false, due: "" },
  { id: "3", title: "Préparer les visuels avant/après et la plaquette", done: false, due: "" },
  { id: "4", title: "Contacter 8 prospects prioritaires", done: false, due: "" },
  { id: "5", title: "Relancer par téléphone les premiers contacts", done: false, due: "" },
  { id: "6", title: "Contacter 12 autres prospects", done: false, due: "" },
  { id: "7", title: "Obtenir 5 échanges commerciaux", done: false, due: "" },
  { id: "8", title: "Décrocher 2 essais payants", done: false, due: "" },
  { id: "9", title: "Signer 2 collaborations régulières", done: false, due: "" },
];

function readStore(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export default function LocalChecklist() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");

  useEffect(() => {
    const store = readStore();
    const stored = Array.isArray(store.tasks) ? (store.tasks as Task[]) : firstTasks;
    queueMicrotask(() => setTasks(stored));
  }, []);

  const save = (next: Task[]) => {
    setTasks(next);
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...readStore(), tasks: next }));
    } catch {}
  };

  if (!tasks) return <p className="crm-muted text-sm">Chargement de la checklist…</p>;
  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <section className="crm-glass rounded-[22px] p-5 md:p-6" data-checklist>
      <div className="flex items-center justify-between gap-3">
        <h2 className="crm-display text-2xl">Plan de développement</h2>
        <p className="crm-accent-text text-sm font-bold">{doneCount}/{tasks.length}</p>
      </div>
      <p className="crm-muted mt-1 text-xs">Enregistrée sur ce navigateur uniquement.</p>
      <div className="mt-4 grid gap-2">
        {tasks.map((t) => (
          <label key={t.id} className="crm-glass flex items-center gap-3 rounded-2xl p-3">
            <input type="checkbox" checked={t.done} onChange={(e) => save(tasks.map((x) => (x.id === t.id ? { ...x, done: e.target.checked } : x)))} className="h-5 w-5" />
            <span className="min-w-0 flex-1">
              <span className={"block text-sm " + (t.done ? "crm-faint line-through" : "")}>{t.title}</span>
              {t.due && <span className="crm-muted block text-xs">Échéance : {t.due}</span>}
            </span>
            <button type="button" aria-label={"Supprimer " + t.title} className="crm-faint px-2" onClick={() => save(tasks.filter((x) => x.id !== t.id))}>×</button>
          </label>
        ))}
      </div>
      <form
        className="mt-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          save([...tasks, { id: Math.random().toString(36).slice(2, 10), title: title.trim(), due, done: false }]);
          setTitle("");
          setDue("");
        }}
      >
        <input className="crm-field min-w-[180px] flex-1 rounded-xl px-3 py-2.5 text-sm" placeholder="Nouvelle tâche…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="crm-field rounded-xl px-3 py-2.5 text-sm" type="date" aria-label="Échéance" value={due} onChange={(e) => setDue(e.target.value)} />
        <button className="crm-btn" data-variant="primary">Ajouter</button>
      </form>
    </section>
  );
}
