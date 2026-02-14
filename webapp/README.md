# EVE Market Web App - Application

A Next.js 16 web application for analyzing trading opportunities in EVE Online markets using real-time data from the EVE Swagger Interface (ESI) API.

## Technology Stack

- **Next.js:** 16.1.6 (App Router, Turbopack)
- **React:** 19.2.3
- **TypeScript:** 5.x
- **Tailwind CSS:** 4.x
- **Node.js:** 20.9+ (minimum)

## Prerequisites

- Node.js 20.9 or higher
- npm, pnpm, or yarn package manager
- Git for version control
- **Docker Desktop** (for local PostgreSQL database)

## Getting Started

### Database Setup (Local Development)

1. Start the PostgreSQL database using Docker Compose (from project root):
   ```bash
   cd ..  # Navigate to project root if in webapp/
   docker-compose up -d
   ```

2. Verify the database is running:
   ```bash
   docker-compose ps  # Should show "healthy" status
   ```

3. The database connection is configured in `webapp/.env.local`:
   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/eve_market"
   ```

### Installation

1. Clone the repository and navigate to the webapp directory:
   ```bash
   cd eve-market-web-app/webapp
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   # or
   yarn install
   ```

### Development

Run the development server:

```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

The page auto-updates as you edit files (Turbopack Fast Refresh).

### Building for Production

```bash
npm run build
npm run start
```

### Linting

```bash
npm run lint
```

## Project Structure

```
webapp/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── page.tsx        # Home page
│   │   ├── layout.tsx      # Root layout
│   │   ├── globals.css     # Global styles & Tailwind config
│   │   └── favicon.ico
│   └── components/         # React components
├── public/                 # Static assets
├── package.json
├── tsconfig.json           # TypeScript configuration
├── next.config.ts          # Next.js configuration
├── eslint.config.mjs       # ESLint configuration
└── README.md
```

## Key Features (Planned)

- Real-time market data from EVE Online ESI API
- Region-to-region trading opportunity analysis
- High-performance virtual scrolling for large datasets
- Keyboard navigation and WCAG AA accessibility
- Dark/light theme support
- Data freshness tracking

## Development Notes

- Uses **src/app/** directory structure (Next.js App Router)
- TypeScript strict mode enabled
- Tailwind CSS 4 with CSS-based configuration
- Import alias: `@/*` maps to `src/*`
- Turbopack enabled by default for fast development

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [EVE Online ESI Documentation](https://esi.evetech.net/ui)

## License

[To be determined]

