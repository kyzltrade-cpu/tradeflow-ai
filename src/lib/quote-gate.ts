/**
 * Pure quote send-gate.
 *
 * Encodes the spec's hard rule: a quote must NOT reach a customer until
 *   - every line is matched and carries evidence,
 *   - the margin rule is present (never a 0‑margin quote),
 *   - the quote total is recomputed from line items,
 *   - a recipient, currency and a future validity date exist, and
 *   - a human approval covers the *exact* current version and snapshot.
 *
 * All functions here are pure (no DB/network) so the gate can be unit-tested
 * and reused by the send route, the queue derivation, and the UI's locked state.
 */

export type LineItemInput = {
  id?: string | null;
  product_name?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  total_price?: number | null;
  match_status?: string | null;
  evidence_type?: string | null;
  margin_pct?: number | null;
};

export type ApprovalSnapshotInput = {
  total_amount?: number | null;
  margin_pct?: number | null;
  recipient_email?: string | null;
};

export type QuoteInput = {
  id: string;
  quote_number?: string | null;
  status?: string | null;
  currency?: string | null;
  total_amount?: number | null;
  total_margin?: number | null;
  margin_pct?: number | null;
  valid_until?: string | null;
  contact_id?: string | null;
  customer_id?: string | null;
  recipient_email?: string | null;
  current_version?: number | null;
  approval_version?: number | null;
  approval_snapshot?: ApprovalSnapshotInput | null;
  line_items?: LineItemInput[] | null;
};

export type GateIssue = {
  code: string;
  reason: string;
};

export type SendGateResult = {
  ok: boolean;
  issues: GateIssue[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ISSUE = (code: string, reason: string): GateIssue => ({ code, reason });

const hasEvidence = (line: LineItemInput): boolean =>
  (line.match_status ?? 'unmatched') === 'matched' && !!line.evidence_type;

const hasPositivePrice = (line: LineItemInput): boolean =>
  Number(line.quantity) > 0 &&
  Number(line.unit_price) > 0 &&
  (Number(line.total_price) || Number(line.quantity) * Number(line.unit_price)) > 0;

function snapshotsDiffer(
  snapshot: ApprovalSnapshotInput | null,
  quote: QuoteInput,
): { differ: boolean; what: string[] } {
  if (!snapshot) return { differ: true, what: ['no approval snapshot'] };

  const what: string[] = [];
  if (Number(snapshot.total_amount) !== Number(quote.total_amount ?? 0)) {
    what.push('total amount changed');
  }
  if (Number(snapshot.margin_pct) !== Number(quote.margin_pct ?? 0)) {
    what.push('margin changed');
  }
  if ((snapshot.recipient_email ?? null) !== (quote.recipient_email ?? null)) {
    what.push('recipient changed');
  }
  return { differ: what.length > 0, what };
}

// ---------------------------------------------------------------------------
// Gate
// ---------------------------------------------------------------------------

export function evaluateSendGate(quote: QuoteInput): SendGateResult {
  const issues: GateIssue[] = [];

  const totalAmount = Number(quote.total_amount ?? 0);
  const margin = Number(quote.margin_pct ?? 0);
  const validUntil = quote.valid_until ? new Date(quote.valid_until) : null;

  const lineItems = quote.line_items ?? [];

  if (!quote.status) {
    issues.push(ISSUE('no_status', 'Quote has no status.'));
  } else if (quote.status !== 'APPROVED') {
    issues.push(
      ISSUE(
        'not_approved',
        `Quote is "${quote.status}" — a quote can only be sent after a human approval covering the current version.`,
      ),
    );
  }

  if (quote.status === 'APPROVED') {
    if (Number(quote.approval_version ?? 0) !== Number(quote.current_version ?? 1)) {
      issues.push(
        ISSUE(
          'approval_stale',
          `The approval on file covers version ${String(
            quote.approval_version ?? '—',
          )}, but this quote is now version ${String(
            quote.current_version ?? 1,
          )}. Changes invalidated the approval — request a new approval before sending.`,
        ),
      );
    } else {
      const { differ, what } = snapshotsDiffer(quote.approval_snapshot ?? null, quote);
      if (differ) {
        issues.push(
          ISSUE(
            'approval_snapshot_changed',
            `The quote changed after approval (${what.join(', ')}). The approval no longer covers this quote — re-approve before sending.`,
          ),
        );
      }
    }
  }

  if (lineItems.length === 0) {
    issues.push(ISSUE('no_lines', 'Quote has no line items. Add items before sending.'));
  } else {
    const unmatched = lineItems.filter((l) => !hasEvidence(l));
    if (unmatched.length > 0) {
      const names = unmatched
        .map((l) => l.product_name || 'a line item')
        .slice(0, 3)
        .join(', ');
      issues.push(
        ISSUE(
          'unmatched_lines',
          unmatched.length === 1
            ? `Unmatched — evidence needed. "${names}" has no verified supplier evidence.`
            : `Unmatched — evidence needed. ${unmatched.length} lines (${names}) have no verified supplier evidence.`,
        ),
      );
    }

    const unpriced = lineItems.filter((l) => !hasPositivePrice(l));
    if (unpriced.length > 0) {
      issues.push(
        ISSUE(
          'unpriced_lines',
          `Quote contains an unpriced or zero-quantity line ("${String(
            unpriced[0].product_name || 'line item',
          )}"). Review it — wrong prices must never reach a customer.`,
        ),
      );
    }
  }

  if (totalAmount <= 0) {
    issues.push(ISSUE('zero_total', 'Quote total is not set. Resolve pricing before sending.'));
  }

  const marginZero =
    (quote.total_margin == null || Number(quote.total_margin) <= 0) && margin <= 0;
  if (marginZero) {
    issues.push(
      ISSUE(
        'zero_margin',
        `Quote ${String(
          quote.quote_number ?? '',
        ).trim()} has 0% margin. Never send a quote that makes no margin — review pricing first.`,
      ),
    );
  }

  if (!quote.currency) {
    issues.push(ISSUE('missing_currency', 'Quote currency is not set.'));
  }

  if (!validUntil) {
    issues.push(ISSUE('missing_validity', 'Quote validity date is not set.'));
  } else if (validUntil <= new Date()) {
    issues.push(
      ISSUE('expired_validity', 'Quote validity date has already passed. Extend validity before sending.'),
    );
  }

  if (!quote.recipient_email && !quote.contact_id && !quote.customer_id) {
    issues.push(
      ISSUE(
        'missing_recipient',
        'No recipient resolved — link a contact/customer with an email before sending.',
      ),
    );
  }

  return { ok: issues.length === 0, issues };
}

// ---------------------------------------------------------------------------
// Locked-state copy for the UI + a pure totals recompute for sanity checks
// ---------------------------------------------------------------------------

export const LOCKED_STATE_COPY =
  'Incomplete – cannot send until all lines verified + human approved.';

export function recomputeTotals(
  lineItems: LineItemInput[],
): { amount: number; margin: number; margin_pct: number } {
  const marginable = lineItems
    .map((l) => ({
      qty: Number(l.quantity ?? 0),
      unit: Number(l.unit_price ?? 0),
      total: Number(l.total_price ?? 0) || Number(l.quantity ?? 0) * Number(l.unit_price ?? 0),
      lineMargin: Number(l.margin_pct ?? 0) > 0 ? Number(l.margin_pct ?? 0) : 0,
    }))
    .filter((l) => l.qty > 0 && l.unit > 0);

  const amount = round(marginable.reduce((sum, l) => sum + l.total, 0));
  const margin = round(
    marginable.reduce((sum, l) => sum + (l.lineMargin / 100) * l.total, 0),
  );
  const margin_pct = amount > 0 ? Number(((margin / amount) * 100).toFixed(1)) : 0;

  return { amount, margin, margin_pct };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}