/**
 * Supplier Scoring Engine
 *
 * Evaluates discovered suppliers across 9 dimensions with weighted scoring.
 * All scores must reference evidence — no scoring without data.
 */

import { supabaseAdmin } from "@/lib/supabase";
import type {
  DiscoveredSupplier,
  SupplierScore,
  SupplierScorecard,
  ScoreDimension,
  SourcingSearchQuery,
} from "@/types/sourcing";

// ── Default weights (sum to 1.0) ───────────────────────────────────────────

const DEFAULT_WEIGHTS: Record<ScoreDimension, number> = {
  product_fit: 0.20,
  moq_alignment: 0.10,
  price_competitive: 0.15,
  lead_time: 0.15,
  certifications: 0.10,
  location: 0.05,
  capacity: 0.10,
  communication: 0.05,
  track_record: 0.10,
};

// ── Scoring functions ──────────────────────────────────────────────────────

function scoreProductFit(supplier: DiscoveredSupplier, query: SourcingSearchQuery): SupplierScore {
  let score = 50; // baseline
  const evidence: string[] = [];

  // Name/product match
  const nameMatch = supplier.productMatch.toLowerCase().includes(query.productName.toLowerCase());
  if (nameMatch) { score += 20; evidence.push("Product name matches search query"); }

  // Spec match
  if (query.specifications && supplier.description) {
    const specWords = query.specifications.toLowerCase().split(/\s+/);
    const descLower = supplier.description.toLowerCase();
    const matched = specWords.filter((w) => descLower.includes(w));
    const specScore = Math.min(20, (matched.length / specWords.length) * 20);
    score += specScore;
    if (matched.length > 0) evidence.push(`Specification keywords matched: ${matched.join(", ")}`);
  }

  // Cap at 100
  score = Math.min(100, score);

  return {
    dimension: "product_fit",
    score,
    weight: DEFAULT_WEIGHTS.product_fit,
    evidence: evidence.join("; ") || "Basic product match from listing",
    sourceDate: supplier.discoveryDate,
  };
}

function scoreMoqAlignment(supplier: DiscoveredSupplier, query: SourcingSearchQuery): SupplierScore {
  if (!supplier.moq || !query.quantity) {
    return {
      dimension: "moq_alignment",
      score: 50,
      weight: DEFAULT_WEIGHTS.moq_alignment,
      evidence: "MOQ data not available — unable to assess alignment",
      sourceDate: supplier.discoveryDate,
    };
  }

  const ratio = query.quantity / supplier.moq;
  let score: number;
  let evidence: string;

  if (ratio >= 10) {
    score = 95;
    evidence = `Order quantity (${query.quantity}) is ${ratio.toFixed(0)}x MOQ (${supplier.moq}) — well above minimum`;
  } else if (ratio >= 2) {
    score = 80;
    evidence = `Order quantity (${query.quantity}) is ${ratio.toFixed(1)}x MOQ (${supplier.moq}) — comfortably above`;
  } else if (ratio >= 1) {
    score = 65;
    evidence = `Order quantity (${query.quantity}) meets MOQ (${supplier.moq}) — negotiable`;
  } else if (ratio >= 0.5) {
    score = 40;
    evidence = `Order quantity (${query.quantity}) is below MOQ (${supplier.moq}) — may need negotiation`;
  } else {
    score = 20;
    evidence = `Order quantity (${query.quantity}) is significantly below MOQ (${supplier.moq}) — likely won't qualify`;
  }

  return { dimension: "moq_alignment", score, weight: DEFAULT_WEIGHTS.moq_alignment, evidence, sourceDate: supplier.discoveryDate };
}

function scorePriceCompetitive(supplier: DiscoveredSupplier, query: SourcingSearchQuery): SupplierScore {
  if (!supplier.priceRange || !query.targetPrice) {
    return {
      dimension: "price_competitive",
      score: 50,
      weight: DEFAULT_WEIGHTS.price_competitive,
      evidence: "Price data not available — unable to assess competitiveness",
      sourceDate: supplier.discoveryDate,
    };
  }

  // Parse price range (e.g., "$2.50-$4.00")
  const priceMatch = supplier.priceRange.match(/[\d.]+/g);
  if (!priceMatch || priceMatch.length < 1) {
    return {
      dimension: "price_competitive",
      score: 50,
      weight: DEFAULT_WEIGHTS.price_competitive,
      evidence: `Could not parse price range: ${supplier.priceRange}`,
      sourceDate: supplier.discoveryDate,
    };
  }

  const avgPrice = priceMatch.length >= 2
    ? (parseFloat(priceMatch[0]) + parseFloat(priceMatch[1])) / 2
    : parseFloat(priceMatch[0]);

  const ratio = query.targetPrice / avgPrice;
  let score: number;
  let evidence: string;

  if (ratio >= 1.5) {
    score = 90;
    evidence = `Listed price avg $${avgPrice.toFixed(2)} is well below target $${query.targetPrice} — strong margin potential`;
  } else if (ratio >= 1.1) {
    score = 75;
    evidence = `Listed price avg $${avgPrice.toFixed(2)} is below target $${query.targetPrice} — good margin`;
  } else if (ratio >= 0.9) {
    score = 60;
    evidence = `Listed price avg $${avgPrice.toFixed(2)} is near target $${query.targetPrice} — tight margin`;
  } else {
    score = 30;
    evidence = `Listed price avg $${avgPrice.toFixed(2)} exceeds target $${query.targetPrice} — margin at risk`;
  }

  return { dimension: "price_competitive", score, weight: DEFAULT_WEIGHTS.price_competitive, evidence, sourceDate: supplier.discoveryDate };
}

function scoreLeadTime(supplier: DiscoveredSupplier, query: SourcingSearchQuery): SupplierScore {
  if (!supplier.leadTimeDays || !query.maxLeadTimeDays) {
    return {
      dimension: "lead_time",
      score: 50,
      weight: DEFAULT_WEIGHTS.lead_time,
      evidence: "Lead time data not available",
      sourceDate: supplier.discoveryDate,
    };
  }

  const ratio = query.maxLeadTimeDays / supplier.leadTimeDays;
  let score: number;
  let evidence: string;

  if (ratio >= 2) {
    score = 90;
    evidence = `Lead time ${supplier.leadTimeDays} days is well within ${query.maxLeadTimeDays} day requirement`;
  } else if (ratio >= 1.2) {
    score = 75;
    evidence = `Lead time ${supplier.leadTimeDays} days fits within ${query.maxLeadTimeDays} day window`;
  } else if (ratio >= 1) {
    score = 60;
    evidence = `Lead time ${supplier.leadTimeDays} days just meets ${query.maxLeadTimeDays} day requirement`;
  } else {
    score = 25;
    evidence = `Lead time ${supplier.leadTimeDays} days exceeds ${query.maxLeadTimeDays} day requirement`;
  }

  return { dimension: "lead_time", score, weight: DEFAULT_WEIGHTS.lead_time, evidence, sourceDate: supplier.discoveryDate };
}

function scoreCertifications(supplier: DiscoveredSupplier, query: SourcingSearchQuery): SupplierScore {
  if (!query.requiredCerts?.length) {
    return {
      dimension: "certifications",
      score: 70,
      weight: DEFAULT_WEIGHTS.certifications,
      evidence: "No certifications required for this inquiry",
      sourceDate: supplier.discoveryDate,
    };
  }

  const matched = query.requiredCerts.filter((cert) =>
    supplier.certifications.some((sc) => sc.toLowerCase().includes(cert.toLowerCase()))
  );

  const ratio = matched.length / query.requiredCerts.length;
  const score = Math.round(ratio * 100);
  const evidence = ratio === 1
    ? `All required certifications present: ${matched.join(", ")}`
    : `${matched.length}/${query.requiredCerts.length} required certs found (${matched.join(", ") || "none"})`;

  return { dimension: "certifications", score, weight: DEFAULT_WEIGHTS.certifications, evidence, sourceDate: supplier.discoveryDate };
}

function scoreLocation(supplier: DiscoveredSupplier, query: SourcingSearchQuery): SupplierScore {
  if (!query.preferredCountries?.length) {
    return {
      dimension: "location",
      score: 70,
      weight: DEFAULT_WEIGHTS.location,
      evidence: "No location preference specified",
      sourceDate: supplier.discoveryDate,
    };
  }

  const preferred = query.preferredCountries.map((c) => c.toLowerCase());
  const match = preferred.some((c) => supplier.country.toLowerCase().includes(c));

  return {
    dimension: "location",
    score: match ? 90 : 40,
    weight: DEFAULT_WEIGHTS.location,
    evidence: match
      ? `Located in preferred country: ${supplier.country}`
      : `Not in preferred countries (${query.preferredCountries.join(", ")}). Located in ${supplier.country}`,
    sourceDate: supplier.discoveryDate,
  };
}

function scoreCapacity(supplier: DiscoveredSupplier, query: SourcingSearchQuery): SupplierScore {
  if (!supplier.capacity || !query.quantity) {
    return {
      dimension: "capacity",
      score: 50,
      weight: DEFAULT_WEIGHTS.capacity,
      evidence: "Capacity data not available",
      sourceDate: supplier.discoveryDate,
    };
  }

  // Parse capacity (e.g., "50,000 units/month")
  const capMatch = supplier.capacity.match(/[\d,]+/);
  if (!capMatch) {
    return {
      dimension: "capacity",
      score: 50,
      weight: DEFAULT_WEIGHTS.capacity,
      evidence: `Could not parse capacity: ${supplier.capacity}`,
      sourceDate: supplier.discoveryDate,
    };
  }

  const capNum = parseInt(capMatch[0].replace(/,/g, ""), 10);
  const ratio = capNum / query.quantity;

  let score: number;
  let evidence: string;

  if (ratio >= 10) {
    score = 90;
    evidence = `Capacity ${supplier.capacity} is ${ratio.toFixed(0)}x order quantity — plenty of headroom`;
  } else if (ratio >= 2) {
    score = 75;
    evidence = `Capacity ${supplier.capacity} comfortably covers order quantity`;
  } else if (ratio >= 1) {
    score = 55;
    evidence = `Capacity ${supplier.capacity} roughly matches order quantity`;
  } else {
    score = 25;
    evidence = `Capacity ${supplier.capacity} may be insufficient for order quantity`;
  }

  return { dimension: "capacity", score, weight: DEFAULT_WEIGHTS.capacity, evidence, sourceDate: supplier.discoveryDate };
}

function scoreCommunication(supplier: DiscoveredSupplier): SupplierScore {
  let score = 50;
  const evidence: string[] = [];

  if (supplier.website) { score += 10; evidence.push("Has company website"); }
  if (supplier.exportExperience) { score += 15; evidence.push(`Export experience: ${supplier.exportExperience}`); }
  if (supplier.employees) { score += 5; evidence.push(`Team size: ${supplier.employees}`); }

  score = Math.min(100, score);

  return {
    dimension: "communication",
    score,
    weight: DEFAULT_WEIGHTS.communication,
    evidence: evidence.join("; ") || "Limited information available",
    sourceDate: supplier.discoveryDate,
  };
}

function scoreTrackRecord(supplier: DiscoveredSupplier): SupplierScore {
  let score = 50;
  const evidence: string[] = [];

  if (supplier.yearsInBusiness && supplier.yearsInBusiness >= 10) {
    score += 30;
    evidence.push(`${supplier.yearsInBusiness} years in business — established`);
  } else if (supplier.yearsInBusiness && supplier.yearsInBusiness >= 5) {
    score += 20;
    evidence.push(`${supplier.yearsInBusiness} years in business`);
  } else if (supplier.yearsInBusiness) {
    score += 10;
    evidence.push(`${supplier.yearsInBusiness} years in business — relatively new`);
  }

  if (supplier.certifications.length > 0) {
    score += 10;
    evidence.push(`${supplier.certifications.length} certification(s) listed`);
  }

  score = Math.min(100, score);

  return {
    dimension: "track_record",
    score,
    weight: DEFAULT_WEIGHTS.track_record,
    evidence: evidence.join("; ") || "Track record data not available",
    sourceDate: supplier.discoveryDate,
  };
}

// ── Main scoring function ──────────────────────────────────────────────────

/**
 * Generates a full scorecard for a discovered supplier.
 *
 * @param supplier - The discovered supplier to evaluate
 * @param query - The original sourcing search query
 * @returns Complete scorecard with recommendation
 */
export function scoreSupplier(
  supplier: DiscoveredSupplier,
  query: SourcingSearchQuery
): SupplierScorecard {
  const scores: SupplierScore[] = [
    scoreProductFit(supplier, query),
    scoreMoqAlignment(supplier, query),
    scorePriceCompetitive(supplier, query),
    scoreLeadTime(supplier, query),
    scoreCertifications(supplier, query),
    scoreLocation(supplier, query),
    scoreCapacity(supplier, query),
    scoreCommunication(supplier),
    scoreTrackRecord(supplier),
  ];

  // Weighted average
  const overallScore = Math.round(
    scores.reduce((sum, s) => sum + s.score * s.weight, 0)
  );

  // Recommendation
  let recommendation: SupplierScorecard["recommendation"];
  if (overallScore >= 70) recommendation = "recommend";
  else if (overallScore >= 50) recommendation = "conditional";
  else recommendation = "not_recommended";

  // Build reasoning
  const strong = scores.filter((s) => s.score >= 70).map((s) => s.dimension.replace(/_/g, " "));
  const weak = scores.filter((s) => s.score < 50).map((s) => s.dimension.replace(/_/g, " "));

  const reasoning = [
    strong.length > 0 ? `Strengths: ${strong.join(", ")}` : "",
    weak.length > 0 ? `Weaknesses: ${weak.join(", ")}` : "",
    `Overall score: ${overallScore}/100`,
    recommendation === "recommend"
      ? "Supplier meets minimum requirements across most dimensions."
      : recommendation === "conditional"
        ? "Supplier has gaps that need addressing before proceeding."
        : "Supplier does not meet minimum requirements for this inquiry.",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    supplierId: supplier.id,
    overallScore,
    scores,
    recommendation,
    reasoning,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Ranks multiple suppliers and produces a shortlist with trade-off analysis.
 *
 * @param suppliers - Array of discovered suppliers to rank
 * @param query - The original sourcing search query
 * @returns Suppliers sorted by score with reasoning
 */
export function rankSuppliers(
  suppliers: DiscoveredSupplier[],
  query: SourcingSearchQuery
): Array<{ supplier: DiscoveredSupplier; scorecard: SupplierScorecard; rank: number; tradeoffs: string }> {
  const scored = suppliers.map((s) => ({
    supplier: s,
    scorecard: scoreSupplier(s, query),
  }));

  // Sort by overall score descending
  scored.sort((a, b) => b.scorecard.overallScore - a.scorecard.overallScore);

  return scored.map((item, index) => {
    const rank = index + 1;
    const prev = index > 0 ? scored[index - 1] : null;
    const tradeoffs = prev
      ? generateTradeoffAnalysis(item, prev)
      : `Top-ranked supplier with highest overall score (${item.scorecard.overallScore}/100).`;

    return {
      supplier: item.supplier,
      scorecard: item.scorecard,
      rank,
      tradeoffs,
    };
  });
}

function generateTradeoffAnalysis(
  current: { supplier: DiscoveredSupplier; scorecard: SupplierScorecard },
  previous: { supplier: DiscoveredSupplier; scorecard: SupplierScorecard }
): string {
  const diffs: string[] = [];
  const currScores = new Map(current.scorecard.scores.map((s) => [s.dimension, s.score]));
  const prevScores = new Map(previous.scorecard.scores.map((s) => [s.dimension, s.score]));

  for (const [dim, currScore] of currScores) {
    const prevScore = prevScores.get(dim) || 0;
    const diff = currScore - prevScore;
    if (Math.abs(diff) >= 15) {
      const dimLabel = dim.replace(/_/g, " ");
      if (diff > 0) {
        diffs.push(`${dimLabel}: +${diff} pts over ${previous.supplier.name}`);
      } else {
        diffs.push(`${dimLabel}: ${diff} pts vs ${previous.supplier.name}`);
      }
    }
  }

  return diffs.length > 0
    ? `Key trade-offs vs #${previous.scorecard.supplierId.slice(0, 8)}: ${diffs.join("; ")}`
    : `Very similar profile to the supplier ranked above — close call.`;
}
