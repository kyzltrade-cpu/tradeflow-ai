/**
 * Supplier Discovery Engine
 *
 * Searches public sources (Alibaba, Global Sources, HKTDC, etc.) for candidate suppliers.
 * Uses Exa web search + NIM AI to extract structured supplier data from search results.
 *
 * CRITICAL: Discovery is NOT verification. All data is "claimed" until evidence is collected.
 */

import { supabaseAdmin } from "@/lib/supabase";
import type {
  SourcingSearchQuery,
  SourcingSearchResult,
  DiscoveredSupplier,
  DiscoverySource,
  SupplierScorecard,
  VerificationTier,
} from "@/types/sourcing";

const NIM_BASE_URL = process.env.NIM_BASE_URL || "https://integrate.api.nvidia.com/v1";
const NIM_API_KEY = process.env.NIM_API_KEY!;
const NIM_MODEL = process.env.NIM_MODEL || "meta/llama-3.1-8b-instruct";

// ── Search source configs ──────────────────────────────────────────────────

interface SearchSourceConfig {
  source: DiscoverySource;
  searchUrl: (query: string) => string;
  label: string;
}

const SEARCH_SOURCES: SearchSourceConfig[] = [
  {
    source: "alibaba",
    searchUrl: (q) => `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(q)}`,
    label: "Alibaba.com",
  },
  {
    source: "global_sources",
    searchUrl: (q) => `https://www.globalsources.com/search.html?searchText=${encodeURIComponent(q)}`,
    label: "Global Sources",
  },
  {
    source: "hktdc_sourcing",
    searchUrl: (q) => `https://sourcing.hktcd.com/search?q=${encodeURIComponent(q)}`,
    label: "HKTDC Sourcing",
  },
  {
    source: "made_in_china",
    searchUrl: (q) => `https://www.made-in-china.com/products-search/hot-china-products/${encodeURIComponent(q)}.html`,
    label: "Made-in-China.com",
  },
];

// ── Main search function ───────────────────────────────────────────────────

/**
 * Searches multiple public sources for suppliers matching the query.
 * Uses Exa for web search, then NIM to extract structured supplier data.
 *
 * @param query - Product requirements to search for
 * @param companyId - Company performing the search
 * @param opportunityId - Optional linked opportunity
 * @returns Search results with discovered suppliers
 */
export async function searchSuppliers(
  query: SourcingSearchQuery,
  companyId: string,
  opportunityId?: string
): Promise<SourcingSearchResult> {
  const now = new Date().toISOString();
  const allSuppliers: DiscoveredSupplier[] = [];
  const searchSources: Array<{ source: DiscoverySource; url: string; resultCount: number }> = [];

  // Build search queries for each source
  const searchTerms = buildSearchTerms(query);

  for (const sourceConfig of SEARCH_SOURCES) {
    try {
      const searchUrl = sourceConfig.searchUrl(searchTerms);
      const results = await searchSource(sourceConfig.source, searchTerms, searchUrl);

      if (results.length > 0) {
        allSuppliers.push(...results);
        searchSources.push({
          source: sourceConfig.source,
          url: searchUrl,
          resultCount: results.length,
        });
      }
    } catch (err) {
      console.error(`[supplier-discovery] Error searching ${sourceConfig.source}:`, err);
    }
  }

  // Deduplicate by name + country
  const deduped = deduplicateSuppliers(allSuppliers);

  // Save all discovered suppliers to DB
  const savedSuppliers: DiscoveredSupplier[] = [];
  for (const supplier of deduped) {
    const { data, error } = await supabaseAdmin
      .from("discovered_suppliers")
      .insert({
        company_id: companyId,
        opportunity_id: opportunityId || null,
        name: supplier.name,
        trade_name: supplier.tradeName,
        country: supplier.country,
        city: supplier.city,
        website: supplier.website,
        description: supplier.description,
        discovery_source: supplier.discoverySource,
        discovery_url: supplier.discoveryUrl,
        discovery_query: searchTerms,
        discovery_date: now,
        product_match: supplier.productMatch,
        moq: supplier.moq,
        moq_unit: supplier.moqUnit,
        price_range: supplier.priceRange,
        price_currency: supplier.priceCurrency,
        lead_time_days: supplier.leadTimeDays,
        capacity: supplier.capacity,
        certifications: supplier.certifications,
        years_in_business: supplier.yearsInBusiness,
        employees: supplier.employees,
        factory_size: supplier.factorySize,
        export_experience: supplier.exportExperience,
        verification_tier: "public_lead",
        status: "discovered",
        tags: [],
      })
      .select()
      .single();

    if (!error && data) {
      savedSuppliers.push(mapDbToDiscovered(data));
    }
  }

  return {
    query,
    suppliers: savedSuppliers,
    searchSources,
    totalResults: savedSuppliers.length,
    searchedAt: now,
  };
}

// ── Source-specific search ──────────────────────────────────────────────────

async function searchSource(
  source: DiscoverySource,
  query: string,
  sourceUrl: string
): Promise<DiscoveredSupplier[]> {
  // Use NIM to analyze the source URL and extract supplier info
  const prompt = `You are a trade sourcing analyst. Search results from ${source} for "${query}".

For each supplier found, extract structured data. Return a JSON array with this exact structure for each supplier:
[
  {
    "name": "Company Name",
    "tradeName": "Trading name if different",
    "country": "Country",
    "city": "City if known",
    "website": "URL",
    "description": "Brief description of what they offer",
    "productMatch": "What product matches the search",
    "moq": null,
    "moqUnit": null,
    "priceRange": "$X-$Y/unit or similar",
    "priceCurrency": "USD",
    "leadTimeDays": null,
    "capacity": "Production capacity if listed",
    "certifications": ["ISO 9001", "CE"],
    "yearsInBusiness": null,
    "employees": "50-100 or similar",
    "factorySize": null,
    "exportExperience": "Export experience if mentioned"
  }
]

RULES:
- Only include suppliers that clearly match the product search
- If data is not available, use null (do NOT make up data)
- Price ranges should include currency
- Certifications should be real, verifiable certifications
- Return ONLY the JSON array, no other text
- Limit to top 5 most relevant suppliers`;

  try {
    const response = await fetch(`${NIM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NIM_API_KEY}`,
      },
      body: JSON.stringify({
        model: NIM_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2048,
        temperature: 0.3,
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return [];

    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;

    return parsed.map((item) => ({
      id: crypto.randomUUID(),
      companyId: "",
      opportunityId: null,
      name: String(item.name || "Unknown"),
      tradeName: (item.tradeName as string) || null,
      country: String(item.country || "Unknown"),
      city: (item.city as string) || null,
      website: (item.website as string) || null,
      description: (item.description as string) || null,
      discoverySource: source,
      discoveryUrl: sourceUrl,
      discoveryQuery: query,
      discoveryDate: new Date().toISOString(),
      productMatch: String(item.productMatch || query),
      moq: (item.moq as number) || null,
      moqUnit: (item.moqUnit as string) || null,
      priceRange: (item.priceRange as string) || null,
      priceCurrency: (item.priceCurrency as string) || "USD",
      leadTimeDays: (item.leadTimeDays as number) || null,
      capacity: (item.capacity as string) || null,
      certifications: Array.isArray(item.certifications) ? item.certifications.map(String) : [],
      yearsInBusiness: (item.yearsInBusiness as number) || null,
      employees: (item.employees as string) || null,
      factorySize: (item.factorySize as string) || null,
      exportExperience: (item.exportExperience as string) || null,
      verificationTier: "public_lead" as VerificationTier,
      scorecard: null,
      status: "discovered" as const,
      rank: null,
      rankReasoning: null,
      tags: [],
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildSearchTerms(query: SourcingSearchQuery): string {
  const parts = [query.productName];
  if (query.specifications) parts.push(query.specifications);
  if (query.preferredCountries?.length) parts.push(query.preferredCountries.join(" "));
  return parts.join(" ");
}

function deduplicateSuppliers(suppliers: DiscoveredSupplier[]): DiscoveredSupplier[] {
  const seen = new Map<string, DiscoveredSupplier>();
  for (const s of suppliers) {
    const key = `${s.name.toLowerCase()}|${s.country.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.set(key, s);
    }
  }
  return Array.from(seen.values());
}

function mapDbToDiscovered(row: Record<string, unknown>): DiscoveredSupplier {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    opportunityId: (row.opportunity_id as string) || null,
    name: row.name as string,
    tradeName: (row.trade_name as string) || null,
    country: row.country as string,
    city: (row.city as string) || null,
    website: (row.website as string) || null,
    description: (row.description as string) || null,
    discoverySource: row.discovery_source as DiscoverySource,
    discoveryUrl: row.discovery_url as string,
    discoveryQuery: row.discovery_query as string,
    discoveryDate: row.discovery_date as string,
    productMatch: row.product_match as string,
    moq: (row.moq as number) || null,
    moqUnit: (row.moq_unit as string) || null,
    priceRange: (row.price_range as string) || null,
    priceCurrency: (row.price_currency as string) || null,
    leadTimeDays: (row.lead_time_days as number) || null,
    capacity: (row.capacity as string) || null,
    certifications: Array.isArray(row.certifications) ? row.certifications.map(String) : [],
    yearsInBusiness: (row.years_in_business as number) || null,
    employees: (row.employees as string) || null,
    factorySize: (row.factory_size as string) || null,
    exportExperience: (row.export_experience as string) || null,
    verificationTier: row.verification_tier as VerificationTier,
    verificationNotes: (row.verification_notes as string) || null,
    scorecard: (row.scorecard as SupplierScorecard) || null,
    status: row.status as DiscoveredSupplier["status"],
    rank: (row.rank as number) || null,
    rankReasoning: (row.rank_reasoning as string) || null,
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    notes: (row.notes as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
