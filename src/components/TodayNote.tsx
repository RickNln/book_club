"use client";
import { useState } from "react";
import { NoteEditor } from "./Feed";

/** Мысль к сегодняшней отметке: показать, добавить или изменить до конца дня. */
export function TodayNote({ entryId, note, isSpoiler }: { entryId: number; note: string | null; isSpoiler: boolean }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <div className="mt-2">
        <NoteEditor entryId={entryId} note={note} isSpoiler={isSpoiler} autoFocus
          onCancel={() => setEditing(false)} onSaved={() => setEditing(false)} />
      </div>
    );
  }
  return note ? (
    <div className="mt-2 rounded-xl bg-raised/60 px-3 py-2">
      <p className="whitespace-pre-wrap text-[14px] text-ink/90 [overflow-wrap:anywhere]">
        {isSpoiler && <span className="mr-1.5 rounded bg-lamp/15 px-1.5 py-0.5 text-[11px] font-semibold text-lamp">спойлер</span>}
        {note}
      </p>
      <button type="button" onClick={() => setEditing(true)} className="mt-1 text-[13px] text-teal">Изменить мысль</button>
    </div>
  ) : (
    <button type="button" onClick={() => setEditing(true)} className="mt-1 text-[13px] text-teal">+ Что запомнилось?</button>
  );
}
