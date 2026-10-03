-- Мысли после чтения, лента и комментарии. Одна команда — окно Query в Vercel выполняет только одну.
DO $$
BEGIN
  -- Мысль к отметке вечера
  ALTER TABLE entries ADD COLUMN IF NOT EXISTS note text
    CONSTRAINT entries_note_len CHECK (char_length(note) <= 1000);
  ALTER TABLE entries ADD COLUMN IF NOT EXISTS is_spoiler boolean NOT NULL DEFAULT false;
  ALTER TABLE entries ADD COLUMN IF NOT EXISTS note_updated_at timestamp;

  -- Комментарии к мыслям (без вложенности)
  CREATE TABLE IF NOT EXISTS comments (
    id serial PRIMARY KEY,
    entry_id integer NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    user_id integer NOT NULL REFERENCES users(id),
    text text NOT NULL CONSTRAINT comments_text_len CHECK (char_length(text) BETWEEN 1 AND 1000),
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS comments_entry_idx ON comments (entry_id, created_at);

  -- Лента: только записи с мыслью, новые сверху
  CREATE INDEX IF NOT EXISTS entries_notes_idx ON entries (habit_id, note_updated_at DESC)
    WHERE note IS NOT NULL;

  -- Непрочитанное: когда участник последний раз открывал ленту
  ALTER TABLE users ADD COLUMN IF NOT EXISTS last_feed_seen_at timestamp;
END $$;
