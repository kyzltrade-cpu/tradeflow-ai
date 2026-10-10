import {
  BookOpen,
  CircleCheck,
  EyeOff,
  FileSpreadsheet,
  Inbox,
  Lock,
  ScanLine,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { PLANS as PLANS_CATALOG, formatPrice } from '@/lib/billing-plans';

/* Every string on the marketing pages lives here, so the split across routes
   cannot drift into four slightly different versions of the same claim. All
   copy is [English, Traditional Chinese]. */

export type Bi = [en: string, zh: string];

/* ── Content ─────────────────────────────────────────────────────────────── */


/* These three numbers ride on the hero as an over-photo ribbon — the same job
   the stat band does on the reference. Each one is phrased as something the
   buyer gets, not as a feature. */
export const FACTS: { value: Bi; label: Bi }[] = [
  { value: ['1 click', '一按'], label: ['Connects Gmail or Outlook', '連接 Gmail 或 Outlook'] },
  { value: ['3 days', '3 天'], label: ['Before a silent buyer is chased', '靜默買方自動跟進'] },
  { value: ['4', '4'], label: ['Languages read and written', '讀寫四種語言'] },
];

export const BENEFITS: { label: Bi; title: Bi; body: Bi }[] = [
  {
    label: ['Specs', '規格'],
    title: ['Found in seconds, not days', '數秒找到，不是數天'],
    body: [
      'Quantities, materials, certifications and lead times are pulled from the message and its attachments — each one cited to the line it came from.',
      '數量、材質、認證與交期，直接從郵件及附件中擷取——每項都標明來源行。',
    ],
  },
  {
    label: ['Gaps', '缺項'],
    title: ['Missing specs, filled in', '缺項自動補齊'],
    body: [
      'When a field is in neither the email nor the attachments, Sailwise fetches it from your own catalogue and records where it came from — so the reply is specific instead of vague.',
      '郵件與附件裡都沒有的欄位，Sailwise 會從您自己的目錄補上，並記錄來源——回覆因此具體，而不是含糊帶過。',
    ],
  },
  {
    label: ['Language', '語言'],
    title: ['In the buyer’s own words', '用買方熟悉的語言'],
    body: [
      'English, 繁體中文, 简体中文 or Español — composed in seconds and sent from the address your customers already reply to.',
      '英文、繁體中文、簡體中文或西班牙文——數秒內完成，並由客戶熟悉的地址寄出。',
    ],
  },
];

/* Each card names the cost of the status quo, because the problem is what makes
   the benefit legible. */
export const PROBLEM: { label: Bi; title: Bi; body: Bi }[] = [
  {
    label: ['Half-written', '殘缺'],
    title: ['The buyer sends an ask, not a brief', '買方寄來的是「詢問」，不是「規格表」'],
    body: [
      'Quantities, materials, certifications, incoterms and dates arrive scattered across the message and its attachments — and some never arrive at all. Every gap you have to ask about is another day the deal sits still.',
      '數量、材質、認證、貿易條件與日期散落在訊息與附件之中——有些則根本沒有提及。每一個要追問的缺項，都讓訂單再停滯一天。',
    ],
  },
  {
    label: ['Chasing', '追問'],
    title: ['Every gap is another round trip', '每一個缺項，都是一趟來回'],
    body: [
      'Ask, wait, ask again — and the buyer has usually started looking elsewhere. The order goes to whoever answered completely, not to whoever was cheapest.',
      '問了、等了、再問一次——而買方多半已開始找別人。訂單流向最快給出完整答案的那一方，而不是最便宜的那一方。',
    ],
  },
  {
    label: ['Quoting', '報價'],
    title: ['The price lives in someone’s head', '價格記在某個人的腦中'],
    body: [
      'Each quote gets rebuilt from memory, so two answers to the same product can carry two different numbers — and neither is traceable when a buyer pushes back.',
      '每份報價都靠記憶重組，同一產品兩次回覆可能出現兩個數字——而當買方質疑時，兩個都無從追溯。',
    ],
  },
];

export const SETUP: { step: string; title: Bi; body: Bi; icon: typeof Inbox }[] = [
  {
    step: '01',
    icon: Inbox,
    title: ['Connect the mailbox you already use', '連接您現用的信箱'],
    body: [
      'One click to Google or Microsoft. Your team keeps the same inbox and the same address your customers already reply to.',
      '一按連接 Google 或 Microsoft。團隊沿用同一個收件匣，客戶也仍然回覆到熟悉的地址。',
    ],
  },
  {
    step: '02',
    icon: FileSpreadsheet,
    title: ['Upload the price list you already keep', '上傳您現有的價格表'],
    body: [
      'An .xlsx or .csv. Columns are matched by name — product, category, price, MOQ — and matching products are updated automatically.',
      '一份 .xlsx 或 .csv。系統依欄名對應——產品、類別、價格、MOQ——相符的產品會自動更新。',
    ],
  },
  {
    step: '03',
    icon: BookOpen,
    title: ['Add what only you know', '補上只有您知道的部分'],
    body: [
      'Upload documents, point Sailwise at your website, and set the rules it must answer within. Your margins decide what it may quote.',
      '上傳文件、連接網站，並設定它必須遵守的規則。您的利潤規則決定它可以怎麼報價。',
    ],
  },
];

export const INTEGRATIONS: Bi[] = [
  ['Gmail', 'Gmail'],
  ['Microsoft Outlook', 'Microsoft Outlook'],
  ['WhatsApp alerts', 'WhatsApp 提示'],
  ['Website chat widget', '網站聊天小工具'],
  ['.xlsx / .csv price lists', '.xlsx / .csv 價格表'],
  ['PDFs and attachments', 'PDF 與附件'],
];

export const QUEUE: { label: Bi; tone: string; title: Bi; body: Bi }[] = [
  {
    label: ['Needs specs', '待補規格'],
    tone: '#8A8279',
    title: ['Waiting on the buyer', '等待買方'],
    body: [
      'The inquiry is missing something you need before it can be priced. Sailwise drafts the one question to ask, in their language.',
      '詢盤尚缺計價所需的資料。Sailwise 以對方的語言草擬唯一要問的問題。',
    ],
  },
  {
    label: ['Owed replies', '待您回覆'],
    tone: '#B4552D',
    title: ['Waiting on you', '等待您'],
    body: [
      'The customer asked something and is still waiting. These are the threads quietly costing you the deal.',
      '客戶提出了問題，仍在等候。這些正是悄悄流失訂單的對話。',
    ],
  },
  {
    label: ['Needs you', '需要您'],
    tone: '#14342B',
    title: ['Ready for sign-off', '待您簽核'],
    body: [
      'A reply has been drafted and is waiting for you, one tap from going out with every number cited.',
      '回覆已草擬完成，等您一按就能送出，每個數字都標明來源。',
    ],
  },
];

export const EXTRACTION: { label: Bi; title: Bi; body: Bi; points: Bi[] }[] = [
  {
    label: ['Extraction', '擷取'],
    title: ['Every spec carries its source', '每個規格都附帶來源'],
    body: [
      'Each field lands with the line it came from, a confidence and a status — so you can see exactly what Sailwise read, and exactly what it is still unsure about.',
      '每個欄位都連同來源行、可信度與狀態一起落地——您看得見 Sailwise 讀到了什麼，以及哪裡仍不確定。',
    ],
    points: [
      ['Quantities, materials, certifications and lead times', '數量、材質、認證與交期'],
      ['Attachments parsed alongside the message', '附件與訊息一併解析'],
      ['Low-confidence fields flagged, never quietly filled in', '可信度低的欄位會標示，絕不悄悄填補'],
    ],
  },
  {
    label: ['Clarification', '釐清'],
    title: ['Gaps get asked about, not assumed', '缺漏用問的，不用猜的'],
    body: [
      'Sailwise fetches the missing data automatically, then asks only what is genuinely unknown — in the buyer’s own language.',
      'Sailwise 自動補齊缺項資料，只有真正查不到的才追問——而且用對方的語言。',
    ],
    points: [
      ['Target price, Incoterm, destination and date', '目標價、貿易條件、目的地與日期'],
      ['Drafted in English, 繁體中文, 简体中文 or Español', '以英文、繁體中文、簡體中文或西班牙文草擬'],
      ['Flagged before quoting so nothing is guessed on your behalf', '報價前先標示，絕不代您臆測'],
    ],
  },
];

export const GATES: { label: Bi; title: Bi; body: Bi }[] = [
  {
    label: ['Knowledge', '知識'],
    title: ['Your rules do the pricing', '定價由您的規則決定'],
    body: [
      'Products, margins, certifications and FAQ rules define what the AI may say and charge.',
      '產品、利潤、認證與 FAQ 規則界定 AI 可說什麼、可收多少。',
    ],
  },
  {
    label: ['Handover', '交接'],
    title: ['Step in — and hand it back', '隨時接手——再交還給 AI'],
    body: [
      'Sailwise flags the sensitive threads — a discount, a complaint, a big order — and hands over. Take control mid-conversation, then hand it back to the AI when you are done.',
      'Sailwise 會標示敏感對話——折扣、投訴、大額訂單——並交棒給您。您可中途接管，處理完再交回 AI。',
    ],
  },
];

/* Every line here is either enforced by the product or already published in the
   privacy policy. Nothing on this list is aspirational — a trust section that
   overstates is worse than none at all, because the whole ask is that the buyer
   believe it. */
export const TRUST: { icon: typeof Lock; title: Bi; body: Bi }[] = [
  {
    icon: CircleCheck,
    title: ['Nothing sends without you', '未經您核准，不會送出'],
    body: [
      'Every reply and every quote is a draft until you approve it. There is no auto-send switch to leave on by mistake.',
      '每則回覆與每份報價在您批准前都是草稿。沒有「自動發送」開關，不會不小心開著。',
    ],
  },
  {
    icon: ScanLine,
    title: ['Every number shows its source', '每個數字都標明來源'],
    body: [
      'Open any draft and each figure traces back to the line of the email, or the row of your price list, that it came from.',
      '打開任何草稿，每個數字都可追溯回它來自郵件的哪一行，或您價格表的哪一列。',
    ],
  },
  {
    icon: Lock,
    title: ['Encrypted in transit and at rest', '傳輸與靜態皆加密'],
    body: [
      'Your catalogue, conversations and connected-mailbox credentials are encrypted; provider tokens are sealed with AES-256-GCM.',
      '您的目錄、對話與連接信箱的憑證均經加密；供應商權杖以 AES-256-GCM 封存。',
    ],
  },
  {
    icon: ShieldCheck,
    title: ['Never used to train someone else’s model', '絕不用於訓練他人的模型'],
    body: [
      'Your data is not used to train third-party models, is never sold, and never appears in advertising.',
      '您的資料不會用於訓練第三方模型，不會被出售，也不會用於廣告。',
    ],
  },
  {
    icon: EyeOff,
    title: ['Analytics that never sees the content', '分析工具看不到內容'],
    body: [
      'No cookies, no identifier carried between visits, and no message content, customer names or email addresses.',
      '不使用 Cookie、不保留跨造訪的識別碼，也不含訊息內容、客戶名稱或電郵地址。',
    ],
  },
  {
    icon: Trash2,
    title: ['Delete or export whenever you like', '隨時刪除或匯出'],
    body: [
      'Export your data from the dashboard at any time, or close the account and everything is purged within 30 days.',
      '可隨時從控制台匯出資料；關閉帳戶後，所有資料會在 30 天內清除。',
    ],
  },
];

export const PLANS = [
  {
    name: ['Starter', '入門'] as Bi,
    price: formatPrice(PLANS_CATALOG.starter.monthly),
    period: '/mo',
    features: [
      ['Email inbox (Google / Microsoft)', '電郵收件匣（Google / Microsoft）'],
      ['WhatsApp alerts when a thread needs you', '對話需要您時發出 WhatsApp 提示'],
      ['Unlimited AI conversations', '無限 AI 對話'],
      ['Unlimited products & FAQ rules', '無限產品與 FAQ 規則'],
      ['English, Traditional & Simplified Chinese, Spanish', '英文、繁體及簡體中文、西班牙文'],
      ['Human takeover anytime', '隨時由真人接手'],
    ] as Bi[],
  },
];

export const FAQS: { q: Bi; a: Bi }[] = [
  {
    q: ['Does it work with the email I already use?', '它適用於我現用的電郵嗎？'],
    a: [
      'Yes. Sailwise runs over your existing mailbox with a one-click Google or Microsoft connection — no new software for your team or your customers.',
      '是。Sailwise 直接運作於您現有的信箱，一鍵連接 Google 或 Microsoft——團隊與客戶都無需安裝新軟件。',
    ],
  },
  {
    q: ['Can it handle Chinese and mixed-language messages?', '能處理中文及混合語言的訊息嗎？'],
    a: [
      'It handles inquiries in English, Traditional and Simplified Chinese, Spanish, and mixed-language threads — common in international trade.',
      '它能閱讀並以英文、繁體及簡體中文、西班牙文回覆，也能處理混合語言的對話——這在國際貿易中十分常見。',
    ],
  },
  {
    q: ['Who controls what actually gets sent?', '由誰決定實際送出的內容？'],
    a: [
      'You do. Every reply and every quote is a draft until you approve it. Sailwise cites where each number came from so you can verify fast.',
      '由您決定。每則回覆與每份報價在您批准前都是草稿。Sailwise 會標明每個數字的來源，讓您快速核對。',
    ],
  },
  {
    q: ['What happens if it gets something wrong?', '如果它出錯了怎麼辦？'],
    a: [
      'You would see it before your buyer does. Every reply is a draft you approve, and every figure is cited to the line or list it came from — so a wrong number is visible against its source rather than hidden inside a finished answer. Correct the draft, take the thread over, or tell us which rule to fix and it stops happening.',
      '在買方看到之前，您就會先看到。每則回覆都是要您批准的草稿，每個數字都標明來自哪一行或哪份清單——錯誤數字會在來源旁露出來，而不是藏在一個看起來完成的答案裡。您可以修改草稿、整條對話接手處理，或告訴我們該修正哪條規則。',
    ],
  },
  {
    q: ['How does the WhatsApp feature work?', 'WhatsApp 功能如何運作？'],
    a: [
      'WhatsApp is how Sailwise reaches you, not a channel your customers talk to. When a thread needs a decision — a discount request, a large order — you get an alert with the sender, product and quantity. Replies and quotes always send as normal email from your own mailbox, so your customers see the address they already know.',
      'WhatsApp 是 Sailwise 聯絡您的方式，並非客戶洽談的渠道。當對話需要決定——例如折扣請求或大額訂單——您會收到附有寄件人、產品與數量的提示。回覆與報價一律以自己信箱的一般電郵寄出，客戶看到的仍是他們熟悉的地址。',
    ],
  },
  {
    q: ['Do I need to be technical to set it up?', '設定需要技術背景嗎？'],
    a: [
      'No. Guided setup connects your mailbox, imports your products and has you answering your first inquiry the same day.',
      '不需要。引導式設定會連接您的信箱、匯入產品，讓您當天就能回覆第一封詢盤。',
    ],
  },
  {
    q: ['Is my product and pricing data safe?', '我的產品與價格資料安全嗎？'],
    a: [
      'Your knowledge base is private to your company, stored encrypted, and never used to train models shared with other customers.',
      '您的知識庫專屬於您的公司，以加密方式儲存，絕不會用於訓練與其他客戶共用的模型。',
    ],
  },
];

/* The founders. Their portraits are real photographs where we have one —
   never a stock face standing in for a real person. */
export const FOUNDERS: {
  initials: string;
  name: Bi;
  role: Bi;
  headline: Bi;
  body: Bi;
  photo?: string;
}[] = [
  {
    initials: 'N',
    photo: '/founders/neel.jpg',
    name: ['Neel', 'Neel'],
    role: ['Co-founder', '共同創辦人'],
    headline: ['He saw it at the dinner table.', '他在餐桌上就看到了。'],
    body: [
      'Neel grew up around a family business in the industry. His dad runs sourcing, and the same thing kept coming home: an inquiry that arrived half-finished, and a quote that took days to send. The problem was never effort — every answer had to be rebuilt by hand, from scratch, every single time.',
      'Neel 在業內的家庭生意中長大。他的父親從事採購，而同樣的情況總是被帶回家：一封殘缺不全的詢盤，一份要花好幾天才寄出的報價。問題從來不是不夠努力——每一個答案都得從零開始、用手重做一次。',
    ],
  },
  {
    initials: 'K',
    photo: '/founders/kyle.jpg',
    name: ['Kyle', 'Kyle'],
    role: ['Co-founder', '共同創辦人'],
    headline: ['Then he asked fifty other owners.', '然後他問了五十位其他老闆。'],
    body: [
      'Kyle sat down with well over fifty sourcing and trading business owners. Different products, countries and sizes — and the same afternoon described back to him every time: chasing specs, rebuilding prices from memory, losing the order to whoever answered completely first.',
      'Kyle 與超過五十位採購與貿易公司的老闆坐下來談。產品、國家、規模都不同——但每個人描述的下午都一樣：追規格、憑記憶重算價格，然後把訂單輸給最快給出完整答案的那一方。',
    ],
  },
];
