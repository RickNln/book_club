-- Смайлики клуба и реакции в ленте. Одна команда — окно Query в Vercel выполняет только одну.
DO $$
BEGIN
  -- Смайлики клуба: набор группы, загружает админ
  CREATE TABLE IF NOT EXISTS custom_emoji (
    id serial PRIMARY KEY,
    group_id integer NOT NULL REFERENCES groups(id),
    code text NOT NULL CONSTRAINT custom_emoji_code_format CHECK (code ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
    label text NOT NULL CONSTRAINT custom_emoji_label_len CHECK (char_length(label) BETWEEN 1 AND 30),
    -- data URL сжатой в браузере картинки 128×128, до 60 КБ (в base64 — до ~82 тыс. символов)
    image text NOT NULL CONSTRAINT custom_emoji_image_size CHECK (char_length(image) <= 90000),
    sort_order integer NOT NULL DEFAULT 0,
    is_hidden boolean NOT NULL DEFAULT false,
    created_by integer REFERENCES users(id),
    created_at timestamp NOT NULL DEFAULT now(),
    CONSTRAINT custom_emoji_group_code UNIQUE (group_id, code)
  );
  CREATE INDEX IF NOT EXISTS custom_emoji_group_order_idx ON custom_emoji (group_id, sort_order);

  -- Реакции: на мысль (entry_id) или на комментарий (comment_id) — ровно одно
  CREATE TABLE IF NOT EXISTS reactions (
    id serial PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users(id),
    -- без каскада: смайлик, которым реагировали, удалить нельзя — только скрыть
    emoji_id integer NOT NULL REFERENCES custom_emoji(id),
    entry_id integer REFERENCES entries(id) ON DELETE CASCADE,
    comment_id integer REFERENCES comments(id) ON DELETE CASCADE,
    created_at timestamp NOT NULL DEFAULT now(),
    CONSTRAINT reactions_one_target CHECK (num_nonnulls(entry_id, comment_id) = 1)
  );
  -- одним смайликом — на одну запись один раз (NULL в UNIQUE не сравниваются, поэтому два частичных индекса)
  CREATE UNIQUE INDEX IF NOT EXISTS reactions_once_entry_idx ON reactions (user_id, emoji_id, entry_id) WHERE entry_id IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS reactions_once_comment_idx ON reactions (user_id, emoji_id, comment_id) WHERE comment_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS reactions_entry_idx ON reactions (entry_id) WHERE entry_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS reactions_comment_idx ON reactions (comment_id) WHERE comment_id IS NOT NULL;
END $$;
