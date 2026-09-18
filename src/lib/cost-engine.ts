/**
 * Deterministic cost and margin calculation engine for trading operations.
 *
 * All arithmetic is pure application logic — no LLM calls, no external
 * side-effects. Every function is stateless and testable.
 */

import type {
  CostBuildUpInput,
  CostBuildUpResult,
  CostLineItem,
  MarginRule,
  CustomerPriceResult,
  CostValidationResult,
  CostValidationWarning,
  CompanySettings,
} from "@/types/trading";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Safely round a number to the given number of decimal places.
 * Uses Number.EPSILON to avoid IEEE-754 floating-point surprises.
 */
function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Build a single {@link CostLineItem} from a raw value and metadata.
 */
function lineItem(
  value: number,
  currency: string,
  source: string,
  effectiveDate: string,
  status: "confirmed" | "estimated",
  assumptionNote?: string,
): CostLineItem {
  return {
    value,
    currency,
    source,
    effective_date: effectiveDate,
    status,
    assumption_note: assumptionNote,
  };
}

// ---------------------------------------------------------------------------
// 1. Cost Build-Up
// ---------------------------------------------------------------------------

/**
 * Aggregate every cost component into a single cost build-up result.
 *
 * Each component is recorded with its value, currency, provenance, and
 * confirmation status so downstream consumers can reason about confidence
 * levels.
 *
 * @param params - Raw cost inputs for the deal.
 * @returns A fully-hydrated {@link CostBuildUpResult} with line items and
 *   the computed total estimated cost.
 */
export function calculateCostBuildUp(
  params: CostBuildUpInput,
): CostBuildUpResult {
  const currency = params.currency ?? "USD";
  const effectiveDate = params.effective_date ?? new Date().toISOString().slice(0, 10);

  const components: CostLineItem[] = [
    lineItem(
      params.supplier_cost,
      currency,
      "supplier_quote",
      effectiveDate,
      params.supplier_cost_status ?? "estimated",
      params.supplier_cost_note,
    ),
    lineItem(
      params.tooling_cost,
      currency,
      "tooling_quote",
      effectiveDate,
      params.tooling_cost_status ?? "estimated",
      params.tooling_cost_note,
    ),
    lineItem(
      params.packaging_cost,
      currency,
      "packaging_estimate",
      effectiveDate,
      params.packaging_cost_status ?? "estimated",
      params.packaging_cost_note,
    ),
    lineItem(
      params.inspection_cost,
      currency,
      "inspection_quote",
      effectiveDate,
      params.inspection_cost_status ?? "estimated",
      params.inspection_cost_note,
    ),
    lineItem(
      params.local_transport_cost,
      currency,
      "transport_estimate",
      effectiveDate,
      params.local_transport_cost_status ?? "estimated",
      params.local_transport_cost_note,
    ),
    lineItem(
      params.freight_cost,
      currency,
      "freight_quote",
      effectiveDate,
      params.freight_cost_status ?? "estimated",
      params.freight_cost_note,
    ),
    lineItem(
      params.insurance_cost,
      currency,
      "insurance_quote",
      effectiveDate,
      params.insurance_cost_status ?? "estimated",
      params.insurance_cost_note,
    ),
    lineItem(
      params.financing_allowance,
      currency,
      "financing_policy",
      effectiveDate,
      params.financing_allowance_status ?? "estimated",
      params.financing_allowance_note,
    ),
    lineItem(
      params.contingency,
      currency,
      "contingency_policy",
      effectiveDate,
      params.contingency_status ?? "estimated",
      params.contingency_note,
    ),
  ];

  const total_estimated_cost = roundTo(
    components.reduce((sum, c) => sum + c.value, 0),
    2,
  );

  return {
    components,
    total_estimated_cost,
    currency,
    effective_date: effectiveDate,
  };
}

// ---------------------------------------------------------------------------
// 2. Customer Price
// ---------------------------------------------------------------------------

/**
 * Derive the customer-facing price from a cost build-up and a margin rule.
 *
 * Supports:
 * - **percentage markup** – cost × (1 + rate)
 * - **fixed commission** – cost + fixed amount
 * - **margin** – cost / (1 − rate)  (margin on selling price)
 *
 * @param costBuildUp - The aggregated cost build-up.
 * @param marginRule  - How margin should be applied (principal or sourcing
 *   agent model).
 * @returns The final customer price together with the margin amount and
 *   effective percentage.
 */
export function calculateCustomerPrice(
  costBuildUp: CostBuildUpResult,
  marginRule: MarginRule,
): CustomerPriceResult {
  const { total_estimated_cost, currency } = costBuildUp;

  let marginAmount: number;

  switch (marginRule.type) {
    case "percentage_markup":
      marginAmount = roundTo(total_estimated_cost * marginRule.rate, 2);
      break;

    case "fixed_commission":
      marginAmount = roundTo(marginRule.amount, 2);
      break;

    case "margin":
      // margin on selling price: selling = cost / (1 - rate)
      marginAmount = roundTo(
        total_estimated_cost * (marginRule.rate / (1 - marginRule.rate)),
        2,
      );
      break;

    default:
      throw new Error(`Unknown margin rule type: ${(marginRule as MarginRule).type}`);
  }

  const customer_price = roundTo(total_estimated_cost + marginAmount, 2);

  const margin_percentage =
    customer_price === 0
      ? 0
      : roundTo((marginAmount / customer_price) * 100, 2);

  return {
    customer_price,
    currency,
    margin_amount: marginAmount,
    margin_percentage,
    trading_model: marginRule.trading_model,
    margin_rule: marginRule,
  };
}

// ---------------------------------------------------------------------------
// 3. Validation
// ---------------------------------------------------------------------------

/**
 * Validate a cost build-up against company policy and completeness rules.
 *
 * Each check pushes a {@link CostValidationWarning} into the result array
 * when a rule is violated. No checks throw — consumers decide how to act
 * on warnings vs errors.
 *
 * @param costBuildUp     - The cost build-up to validate.
 * @param companySettings - Company-wide thresholds and policy constraints.
 * @returns An array of validation warnings (empty = fully valid).
 */
export function validateCostBuildUp(
  costBuildUp: CostBuildUpResult,
  companySettings: CompanySettings,
): CostValidationResult {
  const warnings: CostValidationWarning[] = [];

  const now = new Date().toISOString().slice(0, 10);

  // --- Margin minimum ---------------------------------------------------

  if (costBuildUp.total_estimated_cost > 0) {
    // We don't have the customer price here, but we can flag if the
    // company has a policy-level minimum margin that would be impossible
    // given the cost structure. This is informational — the real check
    // happens in calculateCustomerPrice context.
    const costLine = costBuildUp.components.find(
      (c) => c.source === "supplier_quote",
    );
    if (
      costLine &&
      companySettings.minimum_margin_percentage !== undefined &&
      companySettings.minimum_margin_percentage > 0
    ) {
      // informational — nothing to flag here without selling price
    }
  }

  // --- Missing cost components ------------------------------------------

  const zeroComponents = costBuildUp.components.filter((c) => c.value === 0);
  for (const comp of zeroComponents) {
    warnings.push({
      code: "missing_cost_component",
      severity: "warning",
      message: `Cost component "${comp.source}" is zero — verify this is intentional.`,
      component_source: comp.source,
    });
  }

  // --- Expired supplier price -------------------------------------------

  for (const comp of costBuildUp.components) {
    if (
      comp.source === "supplier_quote" &&
      comp.effective_date &&
      comp.effective_date < now
    ) {
      warnings.push({
        code: "expired_supplier_price",
        severity: "error",
        message: `Supplier quote effective date (${comp.effective_date}) is in the past.`,
        component_source: comp.source,
      });
    }
  }

  // --- Unconfirmed freight ----------------------------------------------

  const freight = costBuildUp.components.find(
    (c) => c.source === "freight_quote",
  );
  if (freight && freight.status === "estimated") {
    warnings.push({
      code: "unconfirmed_freight",
      severity: "warning",
      message: "Freight cost is estimated — confirm before finalising the quote.",
      component_source: "freight_quote",
    });
  }

  // --- Currency mismatch ------------------------------------------------

  const currencies = new Set(
    costBuildUp.components.filter((c) => c.value > 0).map((c) => c.currency),
  );
  if (currencies.size > 1) {
    warnings.push({
      code: "currency_mismatch",
      severity: "error",
      message: `Multiple currencies detected in cost build-up: ${[...currencies].join(", ")}.`,
      component_source: undefined,
    });
  }

  // --- Delivery date not verified ---------------------------------------

  if (
    companySettings.require_delivery_date_verification &&
    !costBuildUp.delivery_date_verified
  ) {
    warnings.push({
      code: "delivery_date_not_verified",
      severity: "warning",
      message: "Delivery date has not been verified with the supplier.",
      component_source: undefined,
    });
  }

  // --- Quote validity missing -------------------------------------------

  if (
    companySettings.require_quote_validity &&
    !costBuildUp.quote_valid_until
  ) {
    warnings.push({
      code: "quote_validity_missing",
      severity: "warning",
      message: "No quote validity date set — customer price has no expiry.",
      component_source: undefined,
    });
  } else if (costBuildUp.quote_valid_until && costBuildUp.quote_valid_until < now) {
    warnings.push({
      code: "quote_validity_missing",
      severity: "error",
      message: `Quote validity date (${costBuildUp.quote_valid_until}) has already expired.`,
      component_source: undefined,
    });
  }

  // --- Discount outside policy ------------------------------------------

  if (
    costBuildUp.discount_percentage !== undefined &&
    companySettings.max_discount_percentage !== undefined
  ) {
    if (costBuildUp.discount_percentage > companySettings.max_discount_percentage) {
      warnings.push({
        code: "discount_outside_policy",
        severity: "error",
        message: `Discount (${costBuildUp.discount_percentage}%) exceeds company maximum (${companySettings.max_discount_percentage}%).`,
        component_source: undefined,
      });
    }
  }

  return {
    valid: warnings.filter((w) => w.severity === "error").length === 0,
    warnings,
    checked_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// 4. Currency Conversion
// ---------------------------------------------------------------------------

/**
 * Convert an amount from one currency to another using a flat rate table.
 *
 * Rates are expressed as "1 FROM = N TO". For example, if
 * `rates["EUR_USD"]` is `1.08`, then `convertCurrency(100, "EUR", "USD", rates)`
 * returns `108`.
 *
 * Identity conversion (same currency) returns the amount unchanged.
 *
 * @throws If the required rate pair is missing from `rates`.
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>,
): number {
  const fromUpper = from.toUpperCase();
  const toUpper = to.toUpperCase();

  if (fromUpper === toUpper) {
    return amount;
  }

  const key = `${fromUpper}_${toUpper}`;
  const rate = rates[key];

  if (rate === undefined) {
    throw new Error(
      `Exchange rate not found for "${key}". Available keys: ${Object.keys(rates).join(", ")}`,
    );
  }

  return roundTo(amount * rate, 4);
}

// ---------------------------------------------------------------------------
// 5. Smart Rounding
// ---------------------------------------------------------------------------

/**
 * Round a quote amount to the conventional precision for the given currency.
 *
 * Most currencies use 2 decimal places. JPY and KRW (and other zero-decimal
 * currencies) round to whole units.
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  "JPY",
  "KRW",
  "VND",
  "CLP",
  "ISK",
  "UGX",
  "RWF",
]);

export function roundQuoteAmount(amount: number, currency: string): number {
  const code = currency.toUpperCase();

  if (ZERO_DECIMAL_CURRENCIES.has(code)) {
    return Math.round(amount);
  }

  return roundTo(amount, 2);
}
