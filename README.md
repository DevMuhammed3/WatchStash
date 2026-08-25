# WatchStash

WatchStash is a full-stack media tracking application built with modern web technologies. Track your movies, series, and anime — rate, review, and share your progress with friends.

## Tech Stack

- **Runtime**: Bun — fast all-in-one JavaScript runtime
- **Backend**: Express 5, MongoDB (Mongoose), JWT authentication, Zod validation
- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Architecture**: Monorepo with shared `@watchstash/types` and `@watchstash/ui` packages

## Getting Started

To install dependencies:

```bash
bun install
```

To run both backend and frontend in dev mode:

```bash
bun run dev
```

Or run them individually:

```bash
bun run dev:backend
bun run dev:frontend
```

## Project Structure

```
watchstash/
├── apps/
│   ├── backend/      # Express API server
│   └── frontend/     # Next.js web app
├── packages/
│   ├── types/        # Shared TypeScript types
│   └── ui/           # Shared UI components
```

## License

MIT
