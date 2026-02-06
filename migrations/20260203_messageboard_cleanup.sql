-- 20260203_messageboard_cleanup.sql
BEGIN;

-- If legacy messageboards table exists, rename to avoid confusion with message_board_posts
DO $$
BEGIN
  IF to_regclass('public.messageboards') IS NOT NULL THEN
    ALTER TABLE messageboards RENAME TO message_board_boards_deprecated;
  END IF;
END $$;

-- If legacy messages table exists (messageboard version), rename it
DO $$
BEGIN
  IF to_regclass('public.messages') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_name = 'messages' AND column_name = 'board_id'
     ) THEN
    ALTER TABLE messages RENAME TO message_board_messages_deprecated;
  END IF;
END $$;

COMMIT;
