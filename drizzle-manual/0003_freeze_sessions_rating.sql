-- Оценка книги, «дочитал(а)» в ленте, пометка «изменено». Одна команда — окно Query в Vercel выполняет только одну.
DO $$
BEGIN
  -- Оценка и отзыв о книге
  ALTER TABLE items ADD COLUMN IF NOT EXISTS rating smallint
    CONSTRAINT items_rating_range CHECK (rating BETWEEN 1 AND 5);
  ALTER TABLE items ADD COLUMN IF NOT EXISTS review text
    CONSTRAINT items_review_len CHECK (char_length(review) <= 1000);
  -- Когда нажали «Дочитал» — время записи в ленте; у книг, дочитанных раньше, пусто
  ALTER TABLE items ADD COLUMN IF NOT EXISTS finished_at timestamp;
  -- Для пометки «изменено» у отзыва
  ALTER TABLE items ADD COLUMN IF NOT EXISTS review_updated_at timestamp;
  CREATE INDEX IF NOT EXISTS items_finished_feed_idx ON items (habit_id, finished_at DESC)
    WHERE finished_at IS NOT NULL;

  -- Мысль: время создания (порядок ленты и пометка «изменено»)
  ALTER TABLE entries ADD COLUMN IF NOT EXISTS note_created_at timestamp;
  UPDATE entries SET note_created_at = note_updated_at
    WHERE note IS NOT NULL AND note_created_at IS NULL;

  -- Комментарии и к записи «дочитал(а)»: ровно одно из entry_id / item_id
  ALTER TABLE comments ADD COLUMN IF NOT EXISTS item_id integer REFERENCES items(id) ON DELETE CASCADE;
  ALTER TABLE comments ALTER COLUMN entry_id DROP NOT NULL;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_one_target') THEN
    ALTER TABLE comments ADD CONSTRAINT comments_one_target CHECK (num_nonnulls(entry_id, item_id) = 1);
  END IF;
  CREATE INDEX IF NOT EXISTS comments_item_idx ON comments (item_id, created_at);
END $$;
