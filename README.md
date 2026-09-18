# TradeFlow AI

WhatsApp + WeChat AI Sales Assistant for Hong Kong Trading Companies

## Features

- **AI-Powered Responses** - Instant replies to customer inquiries in any language
- **Multi-Channel Support** - WhatsApp and WeChat integration
- **Product Catalog** - Manage your products for AI-powered responses
- **Knowledge Base** - Upload documents for AI context
- **FAQ Rules** - Custom keyword-triggered responses
- **Real-time Conversations** - Live chat with human takeover
- **Billing Integration** - Stripe subscription management
- **Bilingual Interface** - English and Chinese (Traditional)

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4
- **Backend:** Next.js API Routes, Supabase (PostgreSQL)
- **AI:** NVIDIA NIM (Llama 3.2)
- **Integrations:** Meta WhatsApp Cloud API, WeChat Work API, Stripe
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- NVIDIA NIM API key
- Meta Developer account (for WhatsApp)
- Stripe account (for billing)

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# NVIDIA NIM (AI)
NIM_API_KEY=your_nim_api_key
NIM_BASE_URL=https://integrate.api.nvidia.com/v1
NIM_MODEL=meta/llama-3.2-11b-vision-instruct

# WhatsApp (Meta)
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_VERIFY_TOKEN=your_verify_token
NEXT_PUBLIC_META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret

# WeChat Work (Optional)
WECHAT_WORK_CORP_ID=your_corp_id
WECHAT_WORK_AGENT_ID=your_agent_id
WECHAT_WORK_SECRET=your_secret

# Stripe (Billing)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_publishable_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Sentry (Optional - for error monitoring)
SENTRY_DSN=your_sentry_dsn
SENTRY_ORG=your_org
SENTRY_PROJECT=your_project
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Database Setup

1. Go to your Supabase project SQL Editor
2. Run the migrations in order from `supabase/migrations/`:
   - `001_initial_schema.sql`
   - `002_persistence_tables.sql`
   - `003_add_language_column.sql`
   - `004_auth_trigger.sql`
   - `005_rls_policies.sql`
   - `006_whatsapp_meta_fields.sql`
   - `007_whatsapp_waba_id.sql`
   - `008_wechat_work_fields.sql`
   - `009_stripe_fields.sql`

## Project Structure

```
tradeflow-ai/
├── src/
│   ├── app/
│   │   ├── api/              # API routes
│   │   ├── admin/            # Dashboard pages
│   │   ├── onboarding/       # User onboarding
│   │   ├── login/            # Authentication
│   │   └── signup/           # User registration
│   ├── components/           # React components
│   ├── lib/                  # Utilities and helpers
│   │   ├── ai.ts            # AI engine (NVIDIA NIM)
│   │   ├── auth.tsx         # Authentication context
│   │   ├── company.tsx      # Company context
│   │   ├── lang.tsx         # Internationalization
│   │   └── supabase.ts      # Supabase clients
│   └── types/               # TypeScript types
├── supabase/
│   └── migrations/          # Database migrations
├── scripts/                 # Utility scripts
└── public/                  # Static assets
```

## API Endpoints

### Public
- `GET /api/health` - Health check

### Webhooks
- `POST /api/webhooks/whatsapp` - WhatsApp message handler
- `GET /api/webhooks/whatsapp` - WhatsApp webhook verification
- `POST /api/webhooks/wechat` - WeChat message handler
- `GET /api/webhooks/wechat` - WeChat webhook verification
- `POST /api/webhooks/stripe` - Stripe webhook handler

### Admin (Authenticated)
- `GET/POST /api/admin/company` - Company management
- `GET/POST/PUT/DELETE /api/admin/products` - Product catalog
- `GET/PATCH /api/admin/conversations` - Conversation management
- `GET/POST /api/admin/conversations/[id]/messages` - Messages
- `GET/POST/DELETE /api/admin/faq` - FAQ rules
- `GET/POST/DELETE /api/admin/knowledge` - Knowledge base
- `GET/POST /api/admin/settings` - Company settings

### Billing
- `POST /api/billing/checkout` - Create Stripe checkout
- `POST /api/billing/portal` - Open Stripe portal

## Deployment

### Vercel

1. Push to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Environment Variables for Production

Make sure to set all environment variables in your Vercel project settings.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

Private - All rights reserved.
