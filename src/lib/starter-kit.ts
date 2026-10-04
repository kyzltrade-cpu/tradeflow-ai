import { supabaseAdmin } from '@/lib/supabase';
import { resolveOpportunityIdentities } from '@/lib/demo-identity';

export const DEMO_COMPANY_ID = '99b52405-c9f2-4ac0-bf7e-69b10c3cfea5';

export const SAMPLE_TAG = 'Sample';
export const SAMPLE_QUOTE_NUMBER = 'QT-SAMPLE-0001';

export interface StarterKitSummary {
  companyId: string;
  seeded: boolean;
  skippedReason?: string;
  products: number;
  suppliers: number;
  customers: number;
  contacts: number;
  quotesLinked: number;
  faqRules: number;
  goals: number;
  conversations: number;
  messages: number;
  opportunities: number;
  quotes: number;
  quoteLineItems: number;
  quoteCostComponents: number;
  quoteVersions: number;
  errors: Array<{ step: string; message: string }>;
}

interface ProductSeed {
  name: string;
  category: string;
  description: string;
  moq: string;
  price_range: string;
  lead_time: string;
  default_lead_time_days: number;
  price_currency: string;
  materials: string[];
  certifications: string[];
  sample_policy: string;
  packaging_req: string;
  quote_assumptions: string;
  specs: Record<string, unknown>;
}

const PRODUCTS: ProductSeed[] = [
  {
    name: '500ml Double-Wall Vacuum Bottle',
    category: 'Drinkware',
    description:
      '304 food-grade stainless steel body, double-wall vacuum insulation, 12h hot / 24h cold, powder-coated matte finish with leak-proof threaded lid.',
    moq: '500 pcs',
    price_range: 'USD 2.80 - 3.20 / pc',
    lead_time: '25-30 days after deposit',
    default_lead_time_days: 30,
    price_currency: 'USD',
    materials: ['304 stainless steel', 'PP lid', 'Silicone gasket'],
    certifications: ['FDA', 'LFGB', 'SGS test report'],
    sample_policy: '1 free sample per buyer, buyer pays DHL (USD 35). Sample cost deducted from first bulk order.',
    packaging_req: 'White colour box + brown master carton, 50 pcs per carton.',
    quote_assumptions: 'Laser engraving or 1-colour silk screen included in quoted unit price above 1,000 pcs.',
    specs: {
      capacity: '500ml',
      material: '304 stainless steel',
      insulation: 'Double-wall vacuum',
      lid: 'PP screw lid with silicone seal',
      branding: 'Laser engraving / silk screen / UV print',
      colors: 'Matte black, pearl white, sage, sand',
      carton: '50 pcs',
    },
  },
  {
    name: '750ml Single-Wall Sports Bottle',
    category: 'Drinkware',
    description:
      'Single-wall 304 stainless steel sports bottle with flip-top spout and carabiner loop. Sports cap mould, sip-from-lid.',
    moq: '1000 pcs',
    price_range: 'USD 1.95 - 2.30 / pc',
    lead_time: '20-25 days after deposit',
    default_lead_time_days: 25,
    price_currency: 'USD',
    materials: ['304 stainless steel', 'PP flip lid'],
    certifications: ['FDA', 'LFGB'],
    sample_policy: 'Sample available on request, buyer pays courier.',
    packaging_req: 'Polybag + colour box, 60 pcs per carton.',
    quote_assumptions: 'Unit price assumes 1-colour pad print on body.',
    specs: {
      capacity: '750ml',
      material: '304 stainless steel',
      lid: 'Flip-top spout',
      branding: 'Pad print / laser',
      colors: 'Silver, matte black, coral',
      carton: '60 pcs',
    },
  },
  {
    name: '350ml Ceramic Coffee Mug',
    category: 'Drinkware',
    description:
      'White glazed stoneware mug, 350ml, C-handle, microwave and dishwasher safe, sublimation-ready flat print area.',
    moq: '500 pcs',
    price_range: 'USD 1.05 - 1.40 / pc',
    lead_time: '22-28 days after deposit',
    default_lead_time_days: 28,
    price_currency: 'USD',
    materials: ['Glazed stoneware ceramic'],
    certifications: ['FDA food contact', 'LFGB'],
    sample_policy: 'Free blank sample, buyer pays courier.',
    packaging_req: 'Bubble-wrapped individually, 36 pcs per carton.',
    quote_assumptions: 'Sublimation wrap and coloured glaze priced separately.',
    specs: {
      capacity: '350ml',
      material: 'Glazed stoneware',
      print_area: 'Sublimation-ready, 190 x 90mm',
      branding: 'Sublimation / pad print',
      colors: 'White gloss, black matte, pastel',
      carton: '36 pcs',
    },
  },
  {
    name: 'Recycled Canvas Tote Bag 38x42cm',
    category: 'Eco Products',
    description:
      'Heavyweight 12oz recycled cotton canvas tote, reinforced handles, gusseted base, GOTS-certified cotton available.',
    moq: '500 pcs',
    price_range: 'USD 0.95 - 1.25 / pc',
    lead_time: '25-30 days after deposit',
    default_lead_time_days: 30,
    price_currency: 'USD',
    materials: ['12oz recycled cotton canvas', 'Cotton webbing handles'],
    certifications: ['GOTS', 'OEKO-TEX Standard 100'],
    sample_policy: 'Free pre-production sample, buyer pays courier.',
    packaging_req: 'Polybag + brown carton, 100 pcs per carton.',
    quote_assumptions: 'Price assumes 1-colour screen print, 1 side. 2-colour both sides adds USD 0.22/pc.',
    specs: {
      size: '38 x 42 cm',
      gusset: '10 cm',
      material: '12oz recycled cotton canvas',
      handle: '70cm reinforced cotton webbing',
      branding: 'Screen print / embroidery',
      carton: '100 pcs',
    },
  },
  {
    name: 'Foldable Nylon Shopping Bag',
    category: 'Eco Products',
    description:
      '30L ripstop nylon carry bag that folds into its own pouch with carabiner clip. Water-resistant, reusable supermarket format.',
    moq: '2000 pcs',
    price_range: 'USD 0.42 - 0.55 / pc',
    lead_time: '20-25 days after deposit',
    default_lead_time_days: 25,
    price_currency: 'USD',
    materials: ['210D ripstop nylon'],
    certifications: ['REACH', 'SGS test report'],
    sample_policy: 'Free sample, buyer pays courier.',
    packaging_req: 'Polybag, 200 pcs per carton.',
    quote_assumptions: 'Unit price assumes single-colour silkscreen on the pouch.',
    specs: {
      capacity: '30L',
      material: '210D ripstop nylon',
      feature: 'Folds into attached pouch with carabiner',
      branding: 'Silkscreen on pouch / full-print body',
      carton: '200 pcs',
    },
  },
  {
    name: '20000mAh Power Bank 22.5W',
    category: 'Electronics',
    description:
      '20,000mAh lithium-polymer power bank, dual USB-A + USB-C, 22.5W PD fast charge, aluminium alloy shell with LED level display.',
    moq: '200 pcs',
    price_range: 'USD 8.90 - 10.50 / pc',
    lead_time: '30-35 days after deposit',
    default_lead_time_days: 35,
    price_currency: 'USD',
    materials: ['Aluminium alloy shell', 'Li-polymer cells'],
    certifications: ['CE', 'FCC', 'RoHS', 'UN38.3', 'MSDS'],
    sample_policy: 'One evaluation sample per qualified buyer, buyer pays courier.',
    packaging_req: 'Retail colour box with manual, 40 pcs per carton.',
    quote_assumptions: 'Price assumes CE/FCC documentation already on file for this mould.',
    specs: {
      capacity: '20000mAh',
      output: 'USB-C 22.5W PD, USB-A 18W, dual output',
      cells: 'Li-polymer',
      shell: 'Aluminium alloy',
      branding: 'Laser logo on shell',
      carton: '40 pcs',
    },
  },
  {
    name: 'Cotton Twill Baseball Cap',
    category: 'Accessories & Fashion',
    description:
      'Unstructured 6-panel cotton twill cap, pre-curved brim, metal buckle strap, mid-profile crown. Embroidery or 3D puff print.',
    moq: '300 pcs',
    price_range: 'USD 1.60 - 2.10 / pc',
    lead_time: '20-25 days after deposit',
    default_lead_time_days: 25,
    price_currency: 'USD',
    materials: ['100% cotton twill', 'Metal buckle', 'ABS snapback option'],
    certifications: ['OEKO-TEX Standard 100'],
    sample_policy: 'Free sample with embroidery mockup, buyer pays courier.',
    packaging_req: 'One cap per polybag, 100 caps per carton.',
    quote_assumptions: 'Price assumes 6,000+ stitch embroidery, 1-colour, 1 position.',
    specs: {
      material: '100% cotton twill',
      panels: '6-panel unstructured',
      brim: 'Pre-curved',
      closure: 'Metal buckle strap',
      branding: 'Embroidery / 3D puff / patch',
      carton: '100 pcs',
    },
  },
  {
    name: '5-Fold Automatic Umbrella',
    category: 'Accessories & Fashion',
    description:
      '30cm 5-fold automatic opening umbrella, 190T pongee canopy, aluminium shaft, 8 ribs, matching velcro pouch with logo print.',
    moq: '1000 pcs',
    price_range: 'USD 1.75 - 2.15 / pc',
    lead_time: '25-30 days after deposit',
    default_lead_time_days: 30,
    price_currency: 'USD',
    materials: ['190T pongee canopy', 'Aluminium shaft and ribs'],
    certifications: ['REACH', 'SGS test report'],
    sample_policy: 'Free sample, buyer pays courier.',
    packaging_req: 'Velcro pouch + polybag, 60 pcs per carton.',
    quote_assumptions: 'Unit price assumes 1-colour screen print on the pouch only.',
    specs: {
      size: '30cm diameter, 5-fold',
      canopy: '190T pongee',
      shaft: 'Aluminium',
      ribs: '8',
      branding: 'Screen print on pouch',
      carton: '60 pcs',
    },
  },
];


interface SupplierSeed {
  legal_name: string;
  trading_name: string;
  location: string;
  product_capabilities: string[];
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  contact_wechat: string;
  moq_notes: string;
  typical_lead_time_days: number;
  payment_terms: string;
  certifications: string[];
  is_approved: boolean;
  performance_score: number;
  total_orders: number;
  on_time_rate: number;
  quality_reject_rate: number;
  quality_notes: string;
  delivery_notes: string;
  notes: string;
  tags: string[];
}

const SUPPLIERS: SupplierSeed[] = [
  {
    legal_name: 'Shenzhen Yantian Precision Drinkware Manufacturing Co., Ltd.',
    trading_name: 'Yantian Precision Drinkware',
    location: 'Shenzhen, Guangdong, China',
    product_capabilities: ['Drinkware', 'Vacuum bottles', 'Ceramic mugs', 'Stainless steel'],
    contact_name: 'Lena Zhou',
    contact_email: 'sales@yantian-drinkware.example.com',
    contact_phone: '+86 755 8888 1201',
    contact_wechat: 'yantian_drinkware',
    moq_notes: 'MOQ 500 pcs per model, mixed colours allowed across one order. Minimum order value USD 3,000 per PO.',
    typical_lead_time_days: 30,
    payment_terms: '30% deposit, 70% against B/L copy',
    certifications: ['BSCI audited', 'ISO 9001', 'LFGB test reports', 'FDA declaration'],
    is_approved: true,
    performance_score: 4.6,
    total_orders: 34,
    on_time_rate: 96,
    quality_reject_rate: 1.2,
    quality_notes:
      'Consistent vacuum seal performance across batches. Reject one 304-steel lot in 2025 for lid thread tolerance; corrected without charge.',
    delivery_notes: 'Owns export packing team. Loads 40HQ in 3 days, photos on request.',
    notes: 'Primary drinkware partner. Holds FDA and LFGB reports on file, 3-year validity on most SKUs.',
    tags: ['primary', 'drinkware', 'shenzhen', 'audited'],
  },
  {
    legal_name: 'Dongguan Evergreen Textile & Bag Manufacturing Ltd.',
    trading_name: 'Evergreen Textile & Bags',
    location: 'Dongguan, Guangdong, China',
    product_capabilities: ['Eco products', 'Tote bags', 'Reusable bags', 'Cotter canvas'],
    contact_name: 'Marco Ng',
    contact_email: 'marco@evergreen-bags.example.com',
    contact_phone: '+86 769 8899 4410',
    contact_wechat: 'evergreen_bags',
    moq_notes: 'MOQ 500 pcs per colourway, 1,000 pcs per model. Minimum order value USD 2,500 per PO.',
    typical_lead_time_days: 30,
    payment_terms: '30% deposit, 70% before shipment',
    certifications: ['GOTS certified cotton available', 'OEKO-TEX Standard 100', 'SEDEX'],
    is_approved: true,
    performance_score: 4.4,
    total_orders: 26,
    on_time_rate: 93,
    quality_reject_rate: 2.0,
    quality_notes: 'Strong on GOTS organic cotton chains. Print adhesion good; request a wash test on new substrates.',
    delivery_notes: 'Ex-works Dongguan. Consolidates with drinkware orders for one booking.',
    notes: 'Go-to partner for reusable bags. Can supply recycled and GOTS cotton to 1000pcs MOQ.',
    tags: ['bags', 'eco', 'dongguan', 'gots'],
  },
  {
    legal_name: 'Huizhou NovaPower Electronics Technology Co., Ltd.',
    trading_name: 'NovaPower Electronics',
    location: 'Huizhou, Guangdong, China',
    product_capabilities: ['Electronics', 'Power banks', 'Chargers', 'Bluetooth accessories'],
    contact_name: 'Kevin Lam',
    contact_email: 'kevin@novapower-elec.example.com',
    contact_phone: '+86 752 8877 6630',
    contact_wechat: 'novapower_elec',
    moq_notes: 'MOQ 200 pcs per model, custom shell MOQ 1,000 pcs. Minimum order value USD 5,000 per PO.',
    typical_lead_time_days: 35,
    payment_terms: '40% deposit, 60% before shipment',
    certifications: ['CE', 'FCC', 'RoHS', 'UN38.3', 'MSDS', 'ISO 14001'],
    is_approved: true,
    performance_score: 4.2,
    total_orders: 18,
    on_time_rate: 90,
    quality_reject_rate: 2.6,
    quality_notes: 'Electronics QC is the weak point — specify A-grade cells and require a 100% capacity test report on every lot.',
    delivery_notes: 'Longer lead time than other partners. Book production slot 10 days before you need ex-factory date.',
    notes: 'Only partner approved for battery goods. Un38.3 and MSDS on file, mandatory for sea freight.',
    tags: ['electronics', 'powerbank', 'huizhou', 'certified'],
  },
  {
    legal_name: 'Yangjiang Sunrise Headwear Factory Co., Ltd.',
    trading_name: 'Sunrise Headwear',
    location: 'Yangjiang, Guangdong, China',
    product_capabilities: ['Accessories & Fashion', 'Caps', 'Hats', 'Beanies'],
    contact_name: 'Sunny Chen',
    contact_email: 'sunny@sunrise-caps.example.com',
    contact_phone: '+86 662 8666 2205',
    contact_wechat: 'sunrise_caps',
    moq_notes: 'MOQ 300 pcs per style, 500 pcs per colour. Blank caps MOQ 300 pcs. Minimum order value USD 1,500 per PO.',
    typical_lead_time_days: 25,
    payment_terms: '30% deposit, 70% before shipment',
    certifications: ['OEKO-TEX Standard 100', 'BSCI audited'],
    is_approved: true,
    performance_score: 4.5,
    total_orders: 22,
    on_time_rate: 97,
    quality_reject_rate: 1.0,
    quality_notes: 'Best-in-class embroidery. Sends a stitch-count proof before production on every order.',
    delivery_notes: 'Flexible — can add 500 pcs mid-production if capacity allows. Useful for top-up orders.',
    notes: 'Fastest and most reliable cap supplier. Keep on call for small reorders and top-ups.',
    tags: ['caps', 'headwear', 'yangjiang', 'fast-lead'],
  },
  {
    legal_name: 'Thanh Ha Umbrella & Promotional Goods JSC',
    trading_name: 'Thanh Ha Umbrella',
    location: 'Hanoi, Vietnam',
    product_capabilities: ['Accessories & Fashion', 'Umbrellas', 'Rain gear', 'Promotional items'],
    contact_name: 'Linh Pham',
    contact_email: 'linh@thanhha-umbrella.example.com',
    contact_phone: '+84 24 3333 7788',
    contact_wechat: 'thanhha_umbrella',
    moq_notes: 'MOQ 1,000 pcs per model. Minimum order value USD 1,800 per PO.',
    typical_lead_time_days: 30,
    payment_terms: '30% deposit, 70% against shipping documents',
    certifications: ['REACH', 'SGS test report', 'ISO 9001'],
    is_approved: true,
    performance_score: 4.1,
    total_orders: 9,
    on_time_rate: 89,
    quality_reject_rate: 2.4,
    quality_notes: 'Good canopy stitching, occasional handle friction reported. Ask for a wind-tolerance check on automatic models.',
    delivery_notes: 'Origin flexibility option outside China. Useful for EU buyers avoiding China-origin tariffs.',
    notes: 'Non-China origin backup. Lower labour cost on umbrellas, smaller capacity — book early.',
    tags: ['umbrella', 'vietnam', 'alternate-origin', 'tariff-option'],
  },
];

const FAQ_RULES = [
  {
    question_pattern: 'Payment terms',
    answer:
      'We accept T/T (bank transfer) for orders under USD 5,000. L/C at sight for larger orders. Standard terms are 30% deposit, 70% before shipment.',
    priority: 10,
    keywords: ['payment', 'pay', 'bank', 'transfer', 'deposit', 'lc', 'terms'],
  },
  {
    question_pattern: 'Shipping & delivery',
    answer:
      'FOB Shenzhen standard. SE Asia 7-10 days, Europe 25-35 days, US 20-30 days by sea. Express DHL/FedEx for samples: 3-5 days.',
    priority: 9,
    keywords: ['shipping', 'delivery', 'freight', 'dhl', 'fedex', 'fob', 'cif'],
  },
  {
    question_pattern: 'Sample policy',
    answer:
      'Free samples for qualified buyers — you cover shipping (USD 20-40 via DHL). Lead time 3-5 days. Sample cost is deducted from your first bulk order.',
    priority: 8,
    keywords: ['sample', 'trial', 'test', 'sample cost'],
  },
  {
    question_pattern: 'Certifications',
    answer:
      'FDA, CE, LFGB, RoHS certified. SGS testing available on request. Battery goods additionally ship with UN38.3 and MSDS.',
    priority: 7,
    keywords: ['certification', 'fda', 'ce', 'lfgb', 'rohs', 'quality', 'sgs', 'test report'],
  },
  {
    question_pattern: 'OEM/ODM customization',
    answer:
      'Full OEM/ODM: custom logo (silk screen, laser, UV), custom packaging, custom colors (Pantone matched), custom moulds from 5,000 pcs.',
    priority: 6,
    keywords: ['custom', 'logo', 'oem', 'odm', 'print', 'branding', 'private label'],
  },
];

const STARTER_GOAL = {
  title: 'The Concierge (Warm Welcome)',
  description:
    'Open-ended, human-like greeting for a trading company. Parses customer intent naturally, answers on products, pricing, MOQ and lead time, then hands off to your team when the deal needs a person.',
  enabled: true,
  greeting:
    "Hi there! Thanks for reaching out to {company}. I'm the sales assistant here. Could you tell me a bit about what you're sourcing right now — product, quantity and destination?",
  flow_steps: [
    {
      trigger: 'product inquiry / specific item',
      response:
        "Got it. Could you share the quantity you're looking at, any spec you must hit, and the destination country? I'll check lead time and come back with a price.",
    },
    {
      trigger: 'ready to order / asks for a quote',
      response:
        "Perfect — I have enough to price this. I'll prepare a quotation you can review, and our team confirms the final numbers before anything goes out.",
    },
    {
      trigger: 'pricing question',
      response:
        'Pricing depends on quantity, spec and finish. Share your target quantity and I will give you the tier that fits rather than a list price.',
    },
    {
      trigger: 'samples or pre-production check',
      response:
        'Happy to arrange samples. You cover the courier (USD 20-40 by DHL, 3-5 days) and the sample cost comes off your first bulk order.',
    },
    {
      trigger: 'complaint, legal, or very large order',
      response:
        'That needs a person — I am connecting you with our team now and passing on the full thread so nothing is repeated.',
    },
  ],
  handoff_message:
    'New lead: {client_info} | Product: {product} | Volume: {volume} | Status: {status}. Priority: {priority}',
};

interface CustomerSeed {
  legal_name: string;
  trading_name: string;
  email_domain: string;
  country: string;
  industry: string;
  currency: string;
  preferred_language: string;
  notes: string;
  tags: string[];
}

interface ContactSeed {
  customer_trading_name: string;
  full_name: string;
  email: string | null;
  phone?: string | null;
  title: string;
  preferred_language: string;
}

const DEMO_CUSTOMERS: CustomerSeed[] = [
  {
    legal_name: 'Nagoya Greens Trading Co., Ltd.',
    trading_name: 'Nagoya Greens',
    email_domain: 'nagoya-greens.jp',
    country: 'Japan',
    industry: 'Stationery & Eco Products',
    currency: 'JPY',
    preferred_language: 'en',
    notes: 'Stationery retailer. Orders bamboo notebooks and branded stationery in bulk.',
    tags: ['stationery', 'eco', 'jp'],
  },
  {
    legal_name: 'Müller Event GmbH',
    trading_name: 'Müller Event',
    email_domain: 'mueller-event.de',
    country: 'Germany',
    industry: 'Event / Promo',
    currency: 'EUR',
    preferred_language: 'de',
    notes: 'Sustainably-minded event agency. Buys giveaway items for summit packs.',
    tags: ['event', 'promo', 'de'],
  },
  {
    legal_name: 'Blue Ocean Retail Ltd.',
    trading_name: 'Blue Ocean Retail',
    email_domain: 'blueoceanretail.com',
    country: 'South Korea',
    industry: 'Retail',
    currency: 'KRW',
    preferred_language: 'en',
    notes: 'Retail buyer for insulated drinkware. Repeated orders for steel bottles.',
    tags: ['retail', 'drinkware', 'kr'],
  },
  {
    legal_name: 'Northwind Promotions Inc.',
    trading_name: 'Northwind Promo',
    email_domain: 'northwindpromo.com',
    country: 'Hong Kong',
    industry: 'Promotional Products',
    currency: 'HKD',
    preferred_language: 'en',
    notes: 'Promo distributor. Runs retail launch and trade-show promo lines.',
    tags: ['promo', 'distributor', 'hk'],
  },
  {
    legal_name: 'Harbin Trading Co., Ltd.',
    trading_name: 'Harbin Trading',
    email_domain: 'harbingtrade.com',
    country: 'China',
    industry: 'Promotional Gifts',
    currency: 'CNY',
    preferred_language: 'zh',
    notes: 'China-based trader. Sourcing keychain bottle openers and giveaway lines.',
    tags: ['gifts', 'cn'],
  },
  {
    legal_name: 'Ocean & Co Pte Ltd.',
    trading_name: 'Ocean & Co',
    email_domain: 'oceancoltd.com',
    country: 'Singapore',
    industry: 'Corporate Gifts',
    currency: 'USD',
    preferred_language: 'en',
    notes: 'Corporate event gifts buyer. Buys vacuum bottles and canvas totes.',
    tags: ['corporate', 'gifts', 'sg'],
  },
  {
    legal_name: 'Fontaine Paris SAS',
    trading_name: 'Fontaine Paris',
    email_domain: 'fontaine-paris.fr',
    country: 'France',
    industry: 'Event / Promo',
    currency: 'EUR',
    preferred_language: 'fr',
    notes: 'Paris agency. Orders lanyards and badges for conferences.',
    tags: ['event', 'fr'],
  },
  {
    legal_name: 'LuxE Events HK Limited',
    trading_name: 'LuxE Events HK',
    email_domain: 'luxeevents.hk',
    country: 'Hong Kong',
    industry: 'Corporate Events',
    currency: 'HKD',
    preferred_language: 'en',
    notes: 'HK event organiser. Corporate giveaway tote bags for January events.',
    tags: ['event', 'hk'],
  },
  {
    legal_name: 'Rahma Bags CV',
    trading_name: 'Rahma Bags',
    email_domain: 'rahma-bags.co',
    country: 'Indonesia',
    industry: 'Giftware',
    currency: 'IDR',
    preferred_language: 'en',
    notes: 'Giftware buyer in Jakarta. Executive gift sets for corporate clients.',
    tags: ['gifts', 'id'],
  },
  {
    legal_name: 'Kim Trading Co., Ltd.',
    trading_name: 'Kim Trading',
    email_domain: 'kimtrading.co.kr',
    country: 'South Korea',
    industry: 'Trading / Bags',
    currency: 'KRW',
    preferred_language: 'ko',
    notes: 'Seoul trading house. Canvas messenger bags and apparel accessories.',
    tags: ['trading', 'bags', 'kr'],
  },
  {
    legal_name: 'Hoffmann GmbH',
    trading_name: 'Hoffmann GmbH',
    email_domain: 'hoffmann-gmbh.de',
    country: 'Germany',
    industry: 'Apparel / Promo',
    currency: 'EUR',
    preferred_language: 'de',
    notes: 'Berlin buyer. Embroidered caps for trade-show staff.',
    tags: ['apparel', 'de'],
  },
  {
    legal_name: 'Greenfields Catering Ltd.',
    trading_name: 'Greenfields Catering',
    email_domain: 'greenfields-catering.com',
    country: 'United Kingdom',
    industry: 'Catering',
    currency: 'GBP',
    preferred_language: 'en',
    notes: 'UK caterer. Annual branded staff kit order.',
    tags: ['catering', 'uk'],
  },
  {
    legal_name: 'Mendes Promo LTDA',
    trading_name: 'Mendes Promo',
    email_domain: 'mendespromo.com.br',
    country: 'Brazil',
    industry: 'Promotional Products',
    currency: 'BRL',
    preferred_language: 'pt',
    notes: 'São Paulo promo distributor. Woven polypropylene bags for supermarkets.',
    tags: ['promo', 'br'],
  },
  {
    legal_name: 'Verde & Co S.r.l.',
    trading_name: 'Verde & Co',
    email_domain: 'verdegoods.it',
    country: 'Italy',
    industry: 'Giftware',
    currency: 'EUR',
    preferred_language: 'it',
    notes: 'Milan giftware distributor. Ceramic mugs and eco desk items.',
    tags: ['gifts', 'it'],
  },
  {
    legal_name: 'Petrova Supply LLC',
    trading_name: 'Petrova Supply',
    email_domain: 'petrova-supply.ru',
    country: 'Russia',
    industry: 'Tech Accessories',
    currency: 'RUB',
    preferred_language: 'ru',
    notes: 'Moscow buyer. Cordura laptop sleeves in black only.',
    tags: ['tech', 'ru'],
  },
  {
    legal_name: 'Sharma Imports Pvt. Ltd.',
    trading_name: 'Sharma Imports',
    email_domain: 'sharma-imports.in',
    country: 'India',
    industry: 'Giftware',
    currency: 'INR',
    preferred_language: 'en',
    notes: 'Delhi importer. Ceramic travel mugs with custom lid colours.',
    tags: ['imports', 'in'],
  },
  {
    legal_name: 'Almeida & Companhia',
    trading_name: 'Almeida & Co',
    email_domain: 'almeida.pt',
    country: 'Portugal',
    industry: 'Sports / Promo',
    currency: 'EUR',
    preferred_language: 'pt',
    notes: 'Lisbon buyer. Silicone wristbands for a charity run.',
    tags: ['sports', 'pt'],
  },
  {
    legal_name: 'Shenzhen Retail Chain Co., Ltd.',
    trading_name: 'Shenzhen Retail Chain',
    email_domain: '',
    country: 'China',
    industry: 'Retail',
    currency: 'CNY',
    preferred_language: 'zh',
    notes: 'Shenzhen retail chain. Enquiry current stock of insulated bottles.',
    tags: ['retail', 'cn'],
  },
  {
    legal_name: 'Smart Cup Brand (Wei Landt)',
    trading_name: 'Smart Cup Brand',
    email_domain: '',
    country: 'China',
    industry: 'Smart Drinkware',
    currency: 'CNY',
    preferred_language: 'zh',
    notes: 'New smart water-bottle brand exploring temperature-display stock or ODM.',
    tags: ['smart', 'cn'],
  },
  {
    legal_name: 'George Wong Trading',
    trading_name: 'George Wong Trading',
    email_domain: '',
    country: 'Hong Kong',
    industry: 'Retail',
    currency: 'HKD',
    preferred_language: 'zh',
    notes: 'HK buyer. Current stock of 500ml insulated bottles.',
    tags: ['retail', 'hk'],
  },
  // The three sample big deals below name these accounts in their titles, so
  // they need real customer rows — otherwise those opportunities can never
  // resolve to an identity and the queue shows a blank dash.
  {
    legal_name: 'Nova Retail Group, Inc.',
    trading_name: 'Nova Retail Group',
    email_domain: 'novaretailgroup.example.com',
    country: 'United States',
    industry: 'Mass Retail',
    currency: 'USD',
    preferred_language: 'en',
    notes: 'National retail chain. 120k-unit insulated drinkware programme under volume commitment.',
    tags: ['retail', 'us', 'key-account'],
  },
  {
    legal_name: 'Mitsui Living Co., Ltd.',
    trading_name: 'Mitsui Living',
    email_domain: 'mitsuiliving.example.jp',
    country: 'Japan',
    industry: 'Home & Lifestyle',
    currency: 'JPY',
    preferred_language: 'en',
    notes: 'Japanese lifestyle retailer. Recycled PET lanyards and totes for gifting programmes.',
    tags: ['retail', 'jp'],
  },
  {
    legal_name: 'Le Cadeau SAS',
    trading_name: 'Le Cadeau',
    email_domain: 'lecadeau.example.fr',
    country: 'France',
    industry: 'Luxury Gifting',
    currency: 'EUR',
    preferred_language: 'fr',
    notes: 'French luxury gifting house. Private-label gift-set rebrand programme.',
    tags: ['luxury', 'fr'],
  },
];

const DEMO_CONTACTS: ContactSeed[] = [
  { customer_trading_name: 'Nagoya Greens', full_name: 'Tom Nakamura', email: 'tom@nagoya-greens.jp', title: 'Purchasing Manager', preferred_language: 'en' },
  { customer_trading_name: 'Müller Event', full_name: 'Hans Müller', email: 'hans.mueller@mueller-event.de', title: 'Event Producer', preferred_language: 'de' },
  { customer_trading_name: 'Blue Ocean Retail', full_name: 'James Park', email: 'james.park@blueoceanretail.com', title: 'Senior Buyer', preferred_language: 'en' },
  { customer_trading_name: 'Northwind Promo', full_name: 'Amy Liu', email: 'amy.l@northwindpromo.com', title: 'Head of Procurement', preferred_language: 'en' },
  { customer_trading_name: 'Harbin Trading', full_name: 'Emily Zhao', email: 'emily.zhao@harbingtrade.com', title: 'Lead Sourcer', preferred_language: 'zh' },
  { customer_trading_name: 'Ocean & Co', full_name: 'Maria Chen', email: 'partner@oceancoltd.com', title: 'Procurement Partner', preferred_language: 'en' },
  { customer_trading_name: 'Fontaine Paris', full_name: 'Chloe Fontaine', email: 'chloe@fontaine-paris.fr', title: 'Operations Director', preferred_language: 'fr' },
  { customer_trading_name: 'LuxE Events HK', full_name: 'Amelia Wong', email: 'amelia.wong@luxeevents.hk', title: 'Event Buyer', preferred_language: 'en' },
  { customer_trading_name: 'Rahma Bags', full_name: 'Siti Rahma', email: 'siti@rahma-bags.co', title: 'Owner', preferred_language: 'en' },
  { customer_trading_name: 'Kim Trading', full_name: 'Daniel Kim', email: 'daniel@kimtrading.co.kr', title: 'Director', preferred_language: 'ko' },
  { customer_trading_name: 'Hoffmann GmbH', full_name: 'Ingrid Hoffmann', email: 'ingrid@hoffmann-gmbh.de', title: 'Marketing Lead', preferred_language: 'de' },
  { customer_trading_name: 'Greenfields Catering', full_name: 'Peter Hale', email: 'peter@greenfields-catering.com', title: 'Field Ops Manager', preferred_language: 'en' },
  { customer_trading_name: 'Mendes Promo', full_name: 'Ricardo Mendes', email: 'ricardo@mendespromo.com.br', title: 'Buyer', preferred_language: 'pt' },
  { customer_trading_name: 'Verde & Co', full_name: 'Sofia Rossi', email: 'sofia.rossi@verdegoods.it', title: 'Product Manager', preferred_language: 'it' },
  { customer_trading_name: 'Petrova Supply', full_name: 'Elena Petrova', email: 'elena@petrova-supply.ru', title: 'Procurement Lead', preferred_language: 'ru' },
  { customer_trading_name: 'Sharma Imports', full_name: 'Priya Sharma', email: 'priya@sharma-imports.in', title: 'Import Manager', preferred_language: 'en' },
  { customer_trading_name: 'Almeida & Co', full_name: 'Sara Almeida', email: 'sara@almeida.pt', title: 'Buyer', preferred_language: 'pt' },
  { customer_trading_name: 'Shenzhen Retail Chain', full_name: 'Lin Jie', email: 'linjie@szretailchain.cn', title: 'Purchasing Manager', preferred_language: 'zh' },
  { customer_trading_name: 'Smart Cup Brand', full_name: 'Wei Landt', email: 'wei.landt@smartcup.com', title: 'Founder', preferred_language: 'zh' },
  { customer_trading_name: 'George Wong Trading', full_name: 'George Wong', email: 'george.wong@wongtrading.hk', title: 'Owner', preferred_language: 'zh' },
  { customer_trading_name: 'Nova Retail Group', full_name: 'Rachel Kim', email: 'rachel.kim@novaretailgroup.example.com', phone: '+1 312 555 0148', title: 'Category Buyer', preferred_language: 'en' },
  { customer_trading_name: 'Mitsui Living', full_name: 'Kenji Watanabe', email: 'kenji@mitsuiliving.example.jp', phone: '+81 3 5555 0217', title: 'Sourcing Manager', preferred_language: 'ja' },
  { customer_trading_name: 'Le Cadeau', full_name: 'Camille Dubois', email: 'camille@lecadeau.example.fr', phone: '+33 1 55 55 01 92', title: 'Directrice Achats', preferred_language: 'fr' },
];

interface ConversationSeed {
  contact_name: string;
  contact_email: string;
  subject: string;
  detected_language: string;
  product_summary: string;
  estimated_value: number;
  currency: string;
  next_action: string;
  status: string;
  hours_ago: number;
  missing_info: string[];
  thread: Array<{ role: 'customer' | 'assistant'; text: string }>;
}

const CONVERSATIONS: ConversationSeed[] = [
  {
    contact_name: 'Sample — Maria Chen',
    contact_email: 'maria.chen@ocean-and-co.example.com',
    subject: 'Q4 event gifts — 5,000 vacuum bottles + 3,000 canvas totes (FOB quote)',
    detected_language: 'en',
    product_summary: 'Custom printed vacuum bottles and canvas totes for a Q4 event',
    estimated_value: 16850,
    currency: 'USD',
    next_action: 'Send quotation for 5,000 bottles + 3,000 totes',
    status: 'active',
    hours_ago: 2,
    missing_info: ['Target delivery date', 'Certification reports'],
    thread: [
      {
        role: 'customer',
        text: '[Sample] Hi — we are organising a Q4 staff and customer event and need corporate gifts in two items:\n\n1. 500ml double-wall vacuum bottles, 5,000 pcs, laser engraved with our logo\n2. Recycled canvas tote bags, 3,000 pcs, 1-colour print both sides\n\nCan you quote FOB, and confirm lead time and whether you can hold the December delivery date? Please also send your certification reports for the bottles.',
      },
    ],
  },
  {
    contact_name: 'Sample — Daniel Weber',
    contact_email: 'daniel.weber@rhein-retail.example.com',
    subject: 'Spring range — 3,000 embroidered caps + 2,000 five-fold umbrellas',
    detected_language: 'en',
    product_summary: 'Embroidered cotton caps and 5-fold umbrellas for a German retail chain',
    estimated_value: 11240,
    currency: 'EUR',
    next_action: 'Confirm cap closure type and umbrella print',
    status: 'active',
    hours_ago: 5,
    missing_info: ['Cap closure type', 'Umbrella logo placement'],
    thread: [
      {
        role: 'customer',
        text: '[Sample] Guten Tag, we supply a retail chain across Germany and Brandenburg. For spring we need 3,000 cotton twill caps with 2-colour embroidery, and 2,000 five-fold umbrellas with our logo on the pouch. What are your MOQ, unit price and production time? We would prefer an EU-friendly option for the umbrellas if you have one.',
      },
      {
        role: 'assistant',
        text: 'Thanks Daniel — noted: 3,000 cotton twill caps, 2-colour embroidery, plus 2,000 five-fold umbrellas with logo on the pouch.\n\nOn your questions:\n• MOQ — 300 pcs per cap style, 1,000 pcs per umbrella model, so both quantities are fine.\n• Lead time — 25-30 days for caps, 30 days for umbrellas after deposit.\n• EU-friendly umbrellas — yes, we can ship the umbrellas from our Vietnam line to avoid China-origin duty.\n\nTwo things I need to price this exactly: is the cap closure a metal buckle strap or a plastic snapback, and do you want the umbrella logo on the pouch only or full-panel print? Once you confirm I will send a written quotation with the FOB and CIF options.',
      },
    ],
  },
];

const SAMPLE_QUOTE = {
  quote_number: SAMPLE_QUOTE_NUMBER,
  opportunity_title: 'Sample — Maria Chen, Ocean & Co: 5,000 vacuum bottles + 3,000 canvas totes',
  stage: 'rfq_sent',
  currency: 'USD',
  incoterm: 'FOB Yantian',
  payment_terms: '30% deposit, 70% before shipment',
  delivery_terms: '30 days after deposit',
  validity_days: 30,
  margin_pct: 0.28,
  internal_notes: 'Sample quote created with the starter kit so you can see how a priced quotation is laid out. Delete it before you send anything real.',
  notes: 'Sample — laser engraving on bottles, 1-colour print both sides on totes. Margins verified · USD',
  terms_and_conditions:
    'Sample quotation. Prices are indicative pending final supplier confirmation. Goods are subject to our standard quality inspection before shipment.',
  lines: [
    {
      key: '500ml Double-Wall Vacuum Bottle',
      description: '304 stainless, double-wall vacuum, laser engraved logo',
      quantity: 5000,
      unit: 'pcs',
      unit_price: 2.8,
    },
    {
      key: 'Recycled Canvas Tote Bag 38x42cm',
      description: '12oz recycled cotton canvas, 1-colour print both sides',
      quantity: 3000,
      unit: 'pcs',
      unit_price: 0.95,
    },
  ],
};

const SAMPLE_BIG_DEAL_NOTES = 'Sample big deal created with the starter kit. Safe to delete.';

interface SampleBigDeal {
  title: string;
  stage: string;
  priority: string;
  currency: string;
  estimated_order_value: number | null;
  product_category: string;
  country: string;
  next_action: string;
  ageMinutes: number;
}

const SAMPLE_BIG_DEALS: SampleBigDeal[] = [
  {
    title: 'Sample — Nova Retail Group: 120,000 insulated steel water bottles',
    stage: 'NEGOTIATING',
    priority: 'high',
    currency: 'USD',
    estimated_order_value: 248000,
    product_category: 'Drinkware',
    country: 'United States',
    next_action: 'Prepare revised pricing against volume commitment',
    ageMinutes: 4 * 24 * 60,
  },
  {
    title: 'Sample — Mitsui Living: 60,000 recycled PET lanyards + totes',
    stage: 'PENDING_APPROVAL',
    priority: 'normal',
    currency: 'USD',
    estimated_order_value: 84300,
    product_category: 'Eco Products',
    country: 'Japan',
    next_action: 'Review DHL freight packing proposal before client send',
    ageMinutes: 2 * 24 * 60,
  },
  {
    title: 'Sample — Le Cadeau SAS: private-label luxury gift-set rebrand',
    stage: 'SENT',
    priority: 'urgent',
    currency: 'EUR',
    estimated_order_value: 12900,
    product_category: 'Gift Sets',
    country: 'France',
    next_action: 'Follow up on quote sent at client request',
    ageMinutes: 26 * 60,
  },
  // A closed-won reorder for a returning buyer. WON is excluded from the Big
  // deal pod, but it feeds the thread rail's "past orders" figure.
  {
    title: 'Sample — Maria Chen, Ocean & Co: reorder of 8,000 vacuum bottles',
    stage: 'WON',
    priority: 'normal',
    currency: 'USD',
    estimated_order_value: 18600,
    product_category: 'Drinkware',
    country: 'United States',
    next_action: 'Reorder shipped — upsell insulated tumblers next cycle',
    ageMinutes: 45 * 24 * 60,
  },
];

/** Insert the demo big-deal opportunities. Idempotent: skips when a row stamped
 * with the sample marker already exists for the company, but self-heals the
 * headline deal's inquiry link so re-runs keep the drill-down pod attached. */
async function seedBigDealOpportunities(companyId: string): Promise<number> {
  // Attach the headline deal to a demo thread that carries an inquiry, so the
  // drill-down pod shows it; the rest stay standalone. This never mutates the
  // conversation itself.
  const { data: demoConv } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .eq('company_id', companyId)
    .ilike('contact_email', '%oceancoltd.com')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: demoInquiry } = demoConv
    ? await supabaseAdmin
        .from('inquiries')
        .select('id')
        .eq('conversation_id', demoConv.id)
        .limit(1)
        .maybeSingle()
    : { data: null };
  const linkInquiryId = demoInquiry?.id ?? null;

  const { data: existing } = await supabaseAdmin
    .from('opportunities')
    .select('id, title, contact_id, customer_id')
    .eq('company_id', companyId)
    .eq('notes', SAMPLE_BIG_DEAL_NOTES)
    .limit(20);
  if ((existing ?? []).length) {
    const { data: headline } = await supabaseAdmin
      .from('opportunities')
      .select('id, inquiry_id')
      .eq('company_id', companyId)
      .eq('notes', SAMPLE_BIG_DEAL_NOTES)
      .eq('title', SAMPLE_BIG_DEALS[0]!.title)
      .maybeSingle();
    if (headline?.id && headline.inquiry_id !== linkInquiryId && linkInquiryId) {
      await supabaseAdmin
        .from('opportunities')
        .update({ inquiry_id: linkInquiryId })
        .eq('id', headline.id);
    }
    await linkOpportunityIdentities(
      companyId,
      (existing as Array<{ id: string; title: string; contact_id: string | null; customer_id: string | null }>).filter(
        (o) => !o.contact_id && !o.customer_id,
      ),
    );
    return 0;
  }

  const identities = await resolveOpportunityIdentities(
    supabaseAdmin as any,
    companyId,
    SAMPLE_BIG_DEALS.map((d) => d.title),
  );

  const rows = SAMPLE_BIG_DEALS.map((d, idx) => {
    const createdAt = isoOffset(Date.now() - d.ageMinutes * 60 * 1000);
    const identity = identities.get(d.title);
    return {
      company_id: companyId,
      inquiry_id: idx === 0 ? linkInquiryId : null,
      title: d.title,
      stage: d.stage,
      trading_model: 'principal',
      product_category: d.product_category,
      product_name: d.title,
      estimated_order_value: d.estimated_order_value,
      currency: d.currency,
      expected_margin_pct: 28,
      country: d.country,
      priority: d.priority,
      next_action: d.next_action,
      last_activity_at: createdAt,
      quote_status: d.stage === 'SENT' ? 'SENT' : 'DRAFT',
      contact_id: identity?.contact_id ?? null,
      customer_id: identity?.customer_id ?? null,
      notes: SAMPLE_BIG_DEAL_NOTES,
      created_at: createdAt,
      updated_at: createdAt,
    };
  });

  const { error } = await supabaseAdmin.from('opportunities').insert(rows);
  if (error) throw new Error(`opportunities insert failed: ${error.message}`);
  return rows.length;
}

/** Fill in contact_id/customer_id on opportunities that were seeded before the
 *  identity link existed. Without it the queue shows a blank dash instead of a
 *  customer name, which reads as broken data to anyone evaluating the demo. */
async function linkOpportunityIdentities(
  companyId: string,
  rows: Array<{ id: string; title: string }>,
): Promise<void> {
  if (rows.length === 0) return;
  const identities = await resolveOpportunityIdentities(
    supabaseAdmin as any,
    companyId,
    rows.map((r) => r.title),
  );
  for (const row of rows) {
    const identity = identities.get(row.title);
    if (!identity?.contact_id && !identity?.customer_id) continue;
    await supabaseAdmin
      .from('opportunities')
      .update({ contact_id: identity.contact_id, customer_id: identity.customer_id })
      .eq('id', row.id);
  }
}

function isoOffset(ms: number): string {
  return new Date(ms).toISOString();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

async function runStep<T>(
  step: string,
  errors: StarterKitSummary['errors'],
  fn: () => Promise<T>
): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    errors.push({
      step,
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

async function seedProducts(companyId: string): Promise<number> {
  const { data: existing } = await supabaseAdmin
    .from('products')
    .select('name')
    .eq('company_id', companyId);
  const have = new Set(((existing ?? []) as Array<{ name: string }>).map((p) => p.name));

  const rows = PRODUCTS.filter((p) => !have.has(p.name)).map((p) => ({
    company_id: companyId,
    name: p.name,
    description: p.description,
    category: p.category,
    moq: p.moq,
    price_range: p.price_range,
    lead_time: p.lead_time,
    specs: p.specs,
    photos: [],
    materials: p.materials,
    certifications: p.certifications,
    sample_policy: p.sample_policy,
    packaging_req: p.packaging_req,
    quote_assumptions: p.quote_assumptions,
    default_lead_time_days: p.default_lead_time_days,
    price_currency: p.price_currency,
  }));

  if (rows.length === 0) return 0;
  const { error } = await supabaseAdmin.from('products').insert(rows);
  if (error) throw new Error(`products insert failed: ${error.message}`);
  return rows.length;
}

async function seedSuppliers(companyId: string): Promise<number> {
  const { data: existing } = await supabaseAdmin
    .from('suppliers')
    .select('legal_name')
    .eq('company_id', companyId)
    .is('deleted_at', null);
  const have = new Set(
    ((existing ?? []) as Array<{ legal_name: string }>).map((s) => s.legal_name)
  );

  const verified = dateOnly(isoOffset(Date.now() - 45 * 24 * 60 * 60 * 1000));
  const rows = SUPPLIERS.filter((s) => !have.has(s.legal_name)).map((s) => ({
    company_id: companyId,
    ...s,
    contact_whatsapp: s.contact_phone,
    last_verification_date: verified,
  }));

  if (rows.length === 0) return 0;
  const { error } = await supabaseAdmin.from('suppliers').insert(rows);
  if (error) throw new Error(`suppliers insert failed: ${error.message}`);
  return rows.length;
}

async function seedCustomers(companyId: string): Promise<number> {
  const { data: existing } = await supabaseAdmin
    .from('customers')
    .select('trading_name')
    .eq('company_id', companyId)
    .is('deleted_at', null);
  const have = new Set(
    ((existing ?? []) as Array<{ trading_name: string }>).map((c) => c.trading_name)
  );

  const rows = DEMO_CUSTOMERS.filter((c) => !have.has(c.trading_name)).map((c) => ({
    company_id: companyId,
    legal_name: c.legal_name,
    trading_name: c.trading_name,
    email_domain: c.email_domain || null,
    country: c.country,
    industry: c.industry,
    currency: c.currency,
    preferred_language: c.preferred_language,
    notes: c.notes,
    tags: c.tags,
  }));

  if (rows.length === 0) return 0;
  const { error } = await supabaseAdmin.from('customers').insert(rows);
  if (error) throw new Error(`customers insert failed: ${error.message}`);
  return rows.length;
}

async function seedContacts(companyId: string): Promise<number> {
  const { data: customers } = await supabaseAdmin
    .from('customers')
    .select('id, trading_name')
    .eq('company_id', companyId)
    .is('deleted_at', null);
  const customerByTradingName = new Map<string, string>(
    ((customers ?? []) as Array<{ id: string; trading_name: string }>).map((c) => [c.trading_name, c.id])
  );

  const { data: existing } = await supabaseAdmin
    .from('contacts')
    .select('email')
    .eq('company_id', companyId)
    .is('deleted_at', null);
  const have = new Set(
    ((existing ?? []) as Array<{ email: string | null }>).map((c) => c.email)
  );

  const rows = DEMO_CONTACTS.filter((c) => c.email && !have.has(c.email)).map((c) => ({
    company_id: companyId,
    customer_id: customerByTradingName.get(c.customer_trading_name) || null,
    full_name: c.full_name,
    email: c.email,
    phone: c.phone ?? null,
    title: c.title,
    is_primary: true,
    preferred_language: c.preferred_language,
  }));

  if (rows.length > 0) {
    const { error } = await supabaseAdmin.from('contacts').insert(rows);
    if (error) throw new Error(`contacts insert failed: ${error.message}`);
  }

  // Backfill phone on already-seeded contacts so the opportunity overview panel
  // has a full contact card even for rows created before phones were seeded.
  let backfilled = 0;
  for (const c of DEMO_CONTACTS) {
    if (!c.email || !c.phone) continue;
    const { data: updated } = await supabaseAdmin
      .from('contacts')
      .update({ phone: c.phone })
      .eq('company_id', companyId)
      .eq('email', c.email)
      .is('phone', null)
      .select('id');
    backfilled += updated?.length ?? 0;
  }

  return rows.length + backfilled;
}

async function linkQuotesToCustomers(companyId: string): Promise<number> {
  const { data: contacts } = await supabaseAdmin
    .from('contacts')
    .select('id, customer_id, full_name, email')
    .eq('company_id', companyId)
    .is('deleted_at', null);

  const { data: quotes } = await supabaseAdmin
    .from('quotes')
    .select('id, opportunity_id')
    .eq('company_id', companyId)
    .is('contact_id', null);

  const oppIds = [
    ...new Set((quotes ?? []).map((q: { opportunity_id: string | null }) => q.opportunity_id).filter(Boolean)),
  ];
  const oppTitles = new Map<string, string | null>();
  if (oppIds.length) {
    const { data: opps } = await supabaseAdmin
      .from('opportunities')
      .select('id, title')
      .in('id', oppIds);
    for (const o of opps ?? []) oppTitles.set(o.id, o.title);
  }

  let linked = 0;
  for (const quote of quotes ?? []) {
    const title = oppTitles.get(quote.opportunity_id) || '';
    const stripped = title.replace(/^\s*Sample\s*[-–—]\s*/i, '').trim();
    const lead = stripped.split(/\s*[-–—]\s*|—/)[0]?.trim() || '';
    const contact = (contacts ?? []).find((c: { full_name: string | null }) =>
      lead.includes(c.full_name || '') || (c.full_name || '').includes(lead)
    );
    if (!contact) continue;
    const { error } = await supabaseAdmin
      .from('quotes')
      .update({
        customer_id: contact.customer_id,
        contact_id: contact.id,
      })
      .eq('id', quote.id);
    if (error) continue;
    linked += 1;
  }
  return linked;
}

async function seedFaqRules(companyId: string): Promise<number> {
  const { data: existing } = await supabaseAdmin
    .from('faq_rules')
    .select('question_pattern')
    .eq('company_id', companyId);
  const have = new Set(
    ((existing ?? []) as Array<{ question_pattern: string }>).map((f) => f.question_pattern)
  );

  const rows = FAQ_RULES.filter((f) => !have.has(f.question_pattern)).map((f) => ({
    company_id: companyId,
    ...f,
  }));

  if (rows.length === 0) return 0;
  const { error } = await supabaseAdmin.from('faq_rules').insert(rows);
  if (error) throw new Error(`faq_rules insert failed: ${error.message}`);
  return rows.length;
}

async function seedGoal(companyId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from('company_goals')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId);

  if ((count ?? 0) > 0) return 0;

  const { error } = await supabaseAdmin.from('company_goals').insert({
    company_id: companyId,
    title: STARTER_GOAL.title,
    description: STARTER_GOAL.description,
    enabled: STARTER_GOAL.enabled,
    greeting: STARTER_GOAL.greeting,
    flow_steps: STARTER_GOAL.flow_steps,
    handoff_message: STARTER_GOAL.handoff_message,
  });
  if (error) throw new Error(`company_goals insert failed: ${error.message}`);
  return 1;
}

/* `024_inbox_upgrade` adds subject/folder/read_at/flagged to conversations and
   subject to messages. Seeding must still work on a database where that
   migration has not run, so probe once and only write the columns that exist.
   Without folder the rows read as inbox anyway, and the list falls back to the
   first message body when subject is absent. */
let mailboxColumnsChecked = false;
let mailboxColumnsReady = false;

async function hasMailboxColumns(): Promise<boolean> {
  if (mailboxColumnsChecked) return mailboxColumnsReady;
  const [conv, msg] = await Promise.all([
    supabaseAdmin.from('conversations').select('id, subject, folder').limit(1),
    supabaseAdmin.from('messages').select('id, subject').limit(1),
  ]);
  mailboxColumnsChecked = true;
  mailboxColumnsReady = !conv.error && !msg.error;
  if (!mailboxColumnsReady) {
    console.warn(
      '[starter-kit] migration 024 columns unavailable, seeding without subject/folder:',
      conv.error?.message || msg.error?.message
    );
  }
  return mailboxColumnsReady;
}

async function seedConversations(
  companyId: string
): Promise<{ conversations: number; messages: number }> {
  const hasColumns = await hasMailboxColumns();

  const { data: existing } = await supabaseAdmin
    .from('conversations')
    .select(hasColumns ? 'id, contact_email, subject, folder, missing_info' : 'id, contact_email')
    .eq('company_id', companyId);
  const idByEmail = new Map(
    ((existing ?? []) as Array<{
      id: string;
      contact_email: string | null;
      subject: string | null;
      folder: string | null;
      missing_info: unknown;
    }>).map((c) => [c.contact_email, c])
  );
  const missingIsEmpty = (v: unknown): boolean =>
    v == null || (Array.isArray(v) ? v.length === 0 : typeof v === 'string' ? v.trim() === '' : false);

  let conversations = 0;
  let messages = 0;

  const buildThread = (conversationId: string, seed: ConversationSeed, lastAt: string) =>
    seed.thread.map((m, i) => ({
      conversation_id: conversationId,
      role: m.role,
      content: m.text,
      ...(hasColumns ? { subject: seed.subject } : {}),
      created_at: isoOffset(
        new Date(lastAt).getTime() - (seed.thread.length - 1 - i) * 4 * 60 * 1000
      ),
    }));

  for (const seed of CONVERSATIONS) {
    const lastAt = isoOffset(Date.now() - seed.hours_ago * 60 * 60 * 1000);
    const existingRow = idByEmail.get(seed.contact_email);

    if (existingRow) {
      // A conversation seeded by an older run has no subject, so it renders
      // in the mailbox as a blank line. Patch the mailbox columns the inbox
      // list depends on before checking the thread.
      if (hasColumns) {
        await supabaseAdmin
          .from('conversations')
          .update({
            subject: existingRow.subject ?? seed.subject,
            folder: existingRow.folder ?? 'inbox',
            // A thread with no recorded missing info derives as ready_to_quote
            // and drops out of the default inbox. Backfill it so the seeded
            // mailbox stays a work-in-progress instead of looking empty.
            ...(missingIsEmpty(existingRow.missing_info)
              ? { missing_info: seed.missing_info }
              : {}),
          })
          .eq('id', existingRow.id);
      }

      // An earlier run may have inserted the conversation but failed on its
      // thread, which would leave a permanently empty conversation in the
      // inbox. Repair that case instead of skipping.
      const { count } = await supabaseAdmin
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', existingRow.id);
      if (count) continue;

      const repairRows = buildThread(existingRow.id, seed, lastAt);
      const { error: repairErr } = await supabaseAdmin.from('messages').insert(repairRows);
      if (repairErr) {
        throw new Error(
          `messages repair failed for ${seed.contact_email}: ${repairErr.message}`
        );
      }
      messages += repairRows.length;
      continue;
    }

    const conversationRow: Record<string, unknown> = {
      company_id: companyId,
      channel: 'email',
      source_channel: 'email',
      contact_name: seed.contact_name,
      contact_email: seed.contact_email,
      contact_phone: null,
      status: seed.status,
      detected_language: seed.detected_language,
      product_summary: seed.product_summary,
      estimated_value: seed.estimated_value,
      currency: seed.currency,
      next_action: seed.next_action,
      missing_info: seed.missing_info,
      external_search_enabled: false,
      created_at: lastAt,
      updated_at: lastAt,
    };
    if (hasColumns) {
      conversationRow.subject = seed.subject;
      conversationRow.folder = 'inbox';
      conversationRow.read_at = null;
      conversationRow.flagged = false;
    }

    const { data: conv, error: convErr } = await supabaseAdmin
      .from('conversations')
      .insert(conversationRow)
      .select('id')
      .single();
    if (convErr || !conv) {
      throw new Error(
        `conversation insert failed for ${seed.contact_email}: ${convErr?.message ?? 'no row returned'}`
      );
    }
    conversations += 1;

    const rows = buildThread(conv.id, seed, lastAt);
    const { error: msgErr } = await supabaseAdmin.from('messages').insert(rows);
    if (msgErr) {
      throw new Error(`messages insert failed for ${seed.contact_email}: ${msgErr.message}`);
    }
    messages += rows.length;
  }

  return { conversations, messages };
}

interface QuoteSeedResult {
  opportunities: number;
  quotes: number;
  lineItems: number;
  costComponents: number;
  versions: number;
}

async function seedSampleQuote(companyId: string): Promise<QuoteSeedResult> {
  const { data: existingQuote } = await supabaseAdmin
    .from('quotes')
    .select('id')
    .eq('company_id', companyId)
    .eq('quote_number', SAMPLE_QUOTE.quote_number)
    .maybeSingle();

  if (existingQuote) {
    // Same partial-run hazard as conversations: a quote whose line items never
    // landed would render as an empty quote forever. Finish it if it's bare.
    const { count } = await supabaseAdmin
      .from('quote_line_items')
      .select('id', { count: 'exact', head: true })
      .eq('quote_id', existingQuote.id);
    if (count) {
      return {
        opportunities: 0,
        quotes: 0,
        lineItems: 0,
        costComponents: 0,
        versions: 0,
      };
    }
    const repaired = await seedQuoteChildren(
      companyId,
      existingQuote.id,
      isoOffset(Date.now() - 26 * 60 * 60 * 1000)
    );
    return { opportunities: 0, quotes: 0, ...repaired };
  }

  const total = round2(
    SAMPLE_QUOTE.lines.reduce((acc, l) => acc + l.quantity * l.unit_price, 0)
  );
  const margin = round2(total * SAMPLE_QUOTE.margin_pct);
  const cost = round2(total - margin);
  const createdAt = isoOffset(Date.now() - 26 * 60 * 60 * 1000);

  const { data: opp, error: oppErr } = await supabaseAdmin
    .from('opportunities')
    .insert({
      company_id: companyId,
      title: SAMPLE_QUOTE.opportunity_title,
      stage: SAMPLE_QUOTE.stage,
      trading_model: 'principal',
      product_category: 'Drinkware + Eco Products',
      product_name: SAMPLE_QUOTE.lines.map((l) => l.key).join(', '),
      estimated_order_value: total,
      currency: SAMPLE_QUOTE.currency,
      expected_margin_pct: Math.round(SAMPLE_QUOTE.margin_pct * 100),
      country: 'Singapore',
      priority: 'normal',
      next_action: 'Review the sample quotation, then send or edit',
      last_activity_at: createdAt,
      quote_status: 'DRAFT',
      notes: 'Sample opportunity created with the starter kit. Safe to delete.',
      created_at: createdAt,
      updated_at: createdAt,
    })
    .select('id')
    .single();
  if (oppErr || !opp) {
    throw new Error(`opportunities insert failed: ${oppErr?.message ?? 'no row returned'}`);
  }

  const { data: quote, error: quoteErr } = await supabaseAdmin
    .from('quotes')
    .insert({
      company_id: companyId,
      opportunity_id: opp.id,
      quote_number: SAMPLE_QUOTE.quote_number,
      status: 'DRAFT',
      currency: SAMPLE_QUOTE.currency,
      incoterm: SAMPLE_QUOTE.incoterm,
      payment_terms: SAMPLE_QUOTE.payment_terms,
      delivery_terms: SAMPLE_QUOTE.delivery_terms,
      validity_days: SAMPLE_QUOTE.validity_days,
      valid_until: dateOnly(isoOffset(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      notes: SAMPLE_QUOTE.notes,
      internal_notes: SAMPLE_QUOTE.internal_notes,
      terms_and_conditions: SAMPLE_QUOTE.terms_and_conditions,
      total_amount: total,
      total_cost: cost,
      total_margin: margin,
      margin_pct: SAMPLE_QUOTE.margin_pct,
      current_version: 1,
      created_at: createdAt,
      updated_at: createdAt,
    })
    .select('id')
    .single();
  if (quoteErr || !quote) {
    throw new Error(`quotes insert failed: ${quoteErr?.message ?? 'no row returned'}`);
  }

  const children = await seedQuoteChildren(companyId, quote.id, createdAt);
  return { opportunities: 1, quotes: 1, ...children };
}

/** Insert the line items, cost breakdown and version row for the sample quote. */
async function seedQuoteChildren(
  companyId: string,
  quoteId: string,
  createdAt: string
): Promise<Pick<QuoteSeedResult, 'lineItems' | 'costComponents' | 'versions'>> {
  const total = round2(
    SAMPLE_QUOTE.lines.reduce((acc, l) => acc + l.quantity * l.unit_price, 0)
  );
  const cost = round2(total - round2(total * SAMPLE_QUOTE.margin_pct));

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name')
    .eq('company_id', companyId);
  const productIdByName = new Map(
    ((products ?? []) as Array<{ id: string; name: string }>).map((p) => [p.name, p.id])
  );

  const lineRows = SAMPLE_QUOTE.lines.map((l, idx) => ({
    quote_id: quoteId,
    company_id: companyId,
    product_id: productIdByName.get(l.key) ?? null,
    product_name: l.key,
    description: l.description,
    quantity: l.quantity,
    unit: l.unit,
    unit_price: l.unit_price,
    total_price: round2(l.quantity * l.unit_price),
    sort_order: idx,
    created_at: createdAt,
  }));
  const { error: lineErr } = await supabaseAdmin.from('quote_line_items').insert(lineRows);
  if (lineErr) throw new Error(`quote_line_items insert failed: ${lineErr.message}`);

  const { error: costErr } = await supabaseAdmin.from('quote_cost_components').insert([
    {
      quote_id: quoteId,
      company_id: companyId,
      component_name: 'Supplier cost (confirmed)',
      amount: round2(cost * 0.85),
      currency: SAMPLE_QUOTE.currency,
      source: 'supplier',
      source_entity_type: 'supplier_quotes',
      source_entity_id: null,
      effective_date: dateOnly(createdAt),
      status: 'confirmed',
      assumption_note: 'Confirmed supplier quote',
      sort_order: 0,
    },
    {
      quote_id: quoteId,
      company_id: companyId,
      component_name: 'Freight & handling (estimated)',
      amount: round2(cost * 0.15),
      currency: SAMPLE_QUOTE.currency,
      source: 'manual',
      source_entity_type: null,
      source_entity_id: null,
      effective_date: dateOnly(createdAt),
      status: 'estimated',
      assumption_note: 'Estimated till carrier quote',
      sort_order: 1,
    },
  ]);
  if (costErr) throw new Error(`quote_cost_components insert failed: ${costErr.message}`);

  const { error: verErr } = await supabaseAdmin.from('quote_versions').insert({
    quote_id: quoteId,
    company_id: companyId,
    version_number: 1,
    snapshot: { quote_number: SAMPLE_QUOTE.quote_number, status: 'DRAFT', total_amount: total },
    change_summary: 'Sample quote created with the starter kit',
    created_at: createdAt,
  });
  if (verErr) throw new Error(`quote_versions insert failed: ${verErr.message}`);

  return { lineItems: lineRows.length, costComponents: 2, versions: 1 };
}

export async function seedStarterKit(companyId: string): Promise<StarterKitSummary> {
  const summary: StarterKitSummary = {
    companyId,
    seeded: false,
    products: 0,
    suppliers: 0,
    customers: 0,
    contacts: 0,
    quotesLinked: 0,
    faqRules: 0,
    goals: 0,
    conversations: 0,
    messages: 0,
    opportunities: 0,
    quotes: 0,
    quoteLineItems: 0,
    quoteCostComponents: 0,
    quoteVersions: 0,
    errors: [],
  };

  if (!companyId) {
    summary.skippedReason = 'missing-company-id';
    return summary;
  }

  if (companyId === DEMO_COMPANY_ID) {
    // Demo workspace is pre-seeded; only backfill customers/contacts that are
    // missing and link existing quotes. Additive and idempotent — never touch
    // the protected conversations/quotes already in place.
    const customers = await runStep('customers', summary.errors, () => seedCustomers(companyId));
    if (customers) summary.customers = customers;
    const contacts = await runStep('contacts', summary.errors, () => seedContacts(companyId));
    if (contacts) summary.contacts = contacts;
    const linked = await runStep('quotes_link', summary.errors, () => linkQuotesToCustomers(companyId));
    if (linked) summary.quotesLinked = linked;
    const bigDeals = await runStep('big_deals', summary.errors, () =>
      seedBigDealOpportunities(companyId)
    );
    if (bigDeals) summary.opportunities = (summary.opportunities || 0) + bigDeals;
    summary.seeded = true;
    return summary;
  }

  const steps: Array<[string, () => Promise<number>]> = [
    ['products', () => seedProducts(companyId)],
    ['suppliers', () => seedSuppliers(companyId)],
    ['customers', () => seedCustomers(companyId)],
    ['contacts', () => seedContacts(companyId)],
    ['faq_rules', () => seedFaqRules(companyId)],
    ['company_goals', () => seedGoal(companyId)],
  ];

  for (const [step, fn] of steps) {
    const count = await runStep(step, summary.errors, fn);
    if (count === null) continue;
    if (step === 'products') summary.products = count;
    else if (step === 'suppliers') summary.suppliers = count;
    else if (step === 'customers') summary.customers = count;
    else if (step === 'contacts') summary.contacts = count;
    else if (step === 'faq_rules') summary.faqRules = count;
    else if (step === 'company_goals') summary.goals = count;
  }

  const convs = await runStep('conversations', summary.errors, () => seedConversations(companyId));
  if (convs) {
    summary.conversations = convs.conversations;
    summary.messages = convs.messages;
  }

  const q = await runStep('quotes', summary.errors, () => seedSampleQuote(companyId));
  if (q) {
    summary.opportunities = q.opportunities;
    summary.quotes = q.quotes;
    summary.quoteLineItems = q.lineItems;
    summary.quoteCostComponents = q.costComponents;
    summary.quoteVersions = q.versions;
  }

  const linked = await runStep('quotes_link', summary.errors, () => linkQuotesToCustomers(companyId));
  if (linked) summary.quotesLinked = linked;

  summary.seeded = true;
  return summary;
}
