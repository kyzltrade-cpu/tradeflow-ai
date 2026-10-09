// Ship-to locations for an opportunity.
//
// A buyer sometimes orders from one country but wants the goods delivered
// somewhere else — occasionally to several places (a forwarder plus two retail
// DCs, say). The single `opportunities.destination` column cannot express that,
// so the extra places ride along in `opportunities.delivery_locations` (JSONB).
//
// Each entry is a consignee plus an optional address, allocated quantity, and
// contact note. `label` is the short name shown in the UI; `quantity` is free
// text (e.g. "2,000 pcs") because buyers split allocations in every format.

export interface DeliveryLocation {
  label: string;
  address: string;
  quantity: string;
  note: string;
}

export const MAX_DELIVERY_LOCATIONS = 20;

/**
 * Normalise anything array-shaped into usable ship-to rows: drop fully blank
 * entries, trim every string, and cap the list so a runaway client cannot
 * bloat the opportunity record.
 */
export function sanitizeDeliveryLocations(input: unknown): DeliveryLocation[] {
  if (!Array.isArray(input)) return [];

  const out: DeliveryLocation[] = [];

  for (const raw of input) {
    if (out.length >= MAX_DELIVERY_LOCATIONS) break;

    const entry = (raw || {}) as Record<string, unknown>;
    const label = String(entry.label ?? '').trim().slice(0, 80);
    const address = String(entry.address ?? '').trim().slice(0, 400);
    const quantity = String(entry.quantity ?? '').trim().slice(0, 80);
    const note = String(entry.note ?? '').trim().slice(0, 200);

    // A row with neither a name nor an address carries no information.
    if (!label && !address) continue;

    out.push({ label, address, quantity, note });
  }

  return out;
}