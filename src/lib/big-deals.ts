/**
 * Pure "Big Deals" derivation.
 *
 * Surfaces a company's most important open opportunities so the trader sees
 * high-magnitude money in play the moment they open the app. A deal counts as
 * "big" when it is still open AND (estimated order value >= threshold OR it is
 * explicitly prioritized high/urgent). No side effects here — the API layer
 * gathers rows and this module classifies + sorts. Tests pin the rules down.
 */

export const BIG_DEAL_MIN_VALUE = 50_000;
export const BIG_DEAL_PRIORITIES = ['high', 'urgent'] as const;
export const BIG_DEAL_MAX = 10;
export const BIG_DEAL_CLOSED_STAGES = ['WON', 'LOST', 'EXPIRED'];

export type OpportunityInput = {
  id: string;
  title: string | null;
  stage: string | null;
  priority: string | null;
  currency: string | null;
  estimated_order_value: number | null;
  next_action: string | null;
  next_action_due: string | null;
  last_activity_at: string | null;
  updated_at: string | null;
};

export type BigDeal = {
  id: string;
  title: string;
  stage: string;
  priority: string;
  currency: string;
  estimated_order_value: number | null;
  next_action: string | null;
  next_action_due: string | null;
  last_activity_at: string | null;
};

export function isBigDeal(opp: Partial<OpportunityInput> | null | undefined): boolean {
  if (!opp) return false;
  if (opp.stage && BIG_DEAL_CLOSED_STAGES.includes(opp.stage)) return false;
  const value = Number(opp.estimated_order_value);
  const byValue = Number.isFinite(value) && value >= BIG_DEAL_MIN_VALUE;
  const byPriority = !!opp.priority && (BIG_DEAL_PRIORITIES as readonly string[]).includes(opp.priority);
  return byValue || byPriority;
}

export function deriveBigDeals(opportunities: OpportunityInput[]): BigDeal[] {
  return opportunities
    .filter((o): o is OpportunityInput => isBigDeal(o))
    .map((o) => ({
      id: o.id,
      title: o.title || 'Untitled deal',
      stage: o.stage || 'NEW',
      priority: o.priority || 'normal',
      currency: o.currency || 'USD',
      estimated_order_value: o.estimated_order_value,
      next_action: o.next_action ?? null,
      next_action_due: o.next_action_due ?? null,
      last_activity_at: o.last_activity_at ?? null,
    }))
    .sort((a, b) => (b.estimated_order_value ?? 0) - (a.estimated_order_value ?? 0))
    .slice(0, BIG_DEAL_MAX);
}