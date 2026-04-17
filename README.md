# Fletcher Order Summary App

A React TypeScript application for managing and tracking orders for Fletcher Insulation products.

## Features

- Order management with real-time updates
- Live loading tracking
- PDF order analysis
- Print view for orders
- Product database integration
- Responsive design
- Animated transitions
- Dark mode support

## Tech Stack

- React
- TypeScript
- Tailwind CSS
- Framer Motion
- Supabase
- Vite
- Google Gemini AI

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/alevalenteee/fletcher-ordersummary-app.git
cd fletcher-ordersummary-app
```

2. Install dependencies:
```bash
npm install
```

3. Copy `.env.example` to `.env` in the root directory and fill in the values:
```bash
cp .env.example .env
```

Required variables:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

4. Start the development server:
```bash
npm run dev
```

## Building for Production

To create a production build:

```bash
npm run build
```

## License

MIT 