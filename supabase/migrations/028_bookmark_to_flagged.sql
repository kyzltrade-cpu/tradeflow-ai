-- ============================================
-- 028: Retire status='bookmarked' in favour of conversations.flagged
--
-- The thread header used to express "bookmark" as the conversation status,
-- but status is a single-valued column: writing 'bookmarked' overwrote the
-- ownership state, so flagging a thread a human was handling silently handed
-- it back to the AI. The inbox list has always read the real `flagged`
-- boolean instead, so those rows rendered as unflagged anyway.
--
-- The UI now toggles `flagged`. This folds any legacy status into that
-- boolean and returns the thread to the AI, which is what the bookmark was
-- standing in for. Idempotent: re-running matches nothing.
-- ============================================

UPDATE public.conversations
SET flagged = true,
    status = 'active',
    updated_at = now()
WHERE status = 'bookmarked';