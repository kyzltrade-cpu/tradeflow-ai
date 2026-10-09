-- Pilot-call bookings from the public landing page.
--
-- Mirrors demo_requests: an unauthenticated INSERT from the marketing site, an
-- admin-only read, and an outbound operator notification (sent by
-- /api/booking, not the database). Rows here are leads, not tenant data, so
-- there is no company_id and no RLS-by-tenant.
CREATE TABLE IF NOT EXISTS booking_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL,
  volume TEXT,
  note TEXT,
  scheduled_for TIMESTAMPTZ,
  timezone TEXT,
  slot_label TEXT,
  status TEXT DEFAULT 'requested' CHECK (status IN ('requested', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS booking_requests_created_at_idx ON booking_requests (created_at DESC);

ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;

-- Public landing page may create bookings.
CREATE POLICY "Anyone can create booking requests" ON booking_requests
  FOR INSERT
  WITH CHECK (true);

-- Operators read bookings through the service-role client; the anon role must
-- not list other people's contact details.
CREATE POLICY "No public read of booking requests" ON booking_requests
  FOR SELECT
  USING (false);