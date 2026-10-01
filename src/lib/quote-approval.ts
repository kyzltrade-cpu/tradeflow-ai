/**
 * Single source of truth for "is this quote cleared to go to a customer?".
 *
 * Used by both the quote detail UI (to disable Send with a tooltip) and the
 * send API (to reject the request outright). The rule must never be relaxed on
 * one side only — an unapproved quote reaching a customer is unrecoverable.
 */

export type QuoteApprovalLike = {
  status?: string | null;
  invalidated?: boolean | null;
};

/** An approval only counts when it was granted and has not been invalidated. */
export function hasValidApproval(approvals: QuoteApprovalLike[] | null | undefined): boolean {
  if (!Array.isArray(approvals)) return false;
  return approvals.some(
    (a) => a && a.status === 'approved' && a.invalidated !== true
  );
}

/**
 * A quote is sendable when the quote itself reached APPROVED, or when a live
 * approval record exists (covers quotes approved below the company threshold).
 */
export function isClearedToSend(
  status: string | null | undefined,
  approvals: QuoteApprovalLike[] | null | undefined
): boolean {
  if (status === 'APPROVED') return true;
  return hasValidApproval(approvals);
}

export const NEEDS_APPROVAL_MESSAGE =
  'Needs approval first — request approval before sending';
