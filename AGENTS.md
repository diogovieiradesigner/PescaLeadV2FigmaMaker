# AGENTS.md - PescaLead Project Guidelines

## Build/Lint/Test Commands
- **Development server**: `npm run dev` (Vite dev server on port 3000)
- **Build**: `npm run build` (TypeScript + Vite build to `build/` dir)
- **Lint**: `npm run lint` (ESLint for .ts,.tsx files, max 0 warnings)
- **Full test suite**: `npm run test:e2e` (Playwright e2e tests)
- **Single test**: `npx playwright test tests/e2e/kanban.spec.ts` (run specific file)
- **Visual tests**: `npm run test:visual` (UI validation tests)
- **Kanban tests**: `npm run test:kanban` (kanban functionality tests)
- **Test with UI**: `npm run test:ui` (interactive test runner)
- **Test report**: `npm run test:report` (view test results)

## Code Style Guidelines
- **Imports**: Use relative paths for local modules, absolute for external. Aliases like `'@/utils'` for src/. Versioned imports for UI libs (e.g., `'sonner@2.0.3'`)
- **Formatting**: ESLint with TypeScript/React plugins. Single quotes, trailing commas, 2-space indentation
- **Types**: Strict TypeScript. Use interfaces for objects, union types for variants. Export types from `.types.ts` files
- **Naming**: camelCase for functions/variables, PascalCase for components/classes, UPPER_SNAKE for constants
- **Error Handling**: Try/catch blocks with specific error types. Use `toast` from sonner for user notifications. Throw descriptive Error messages
- **Components**: Functional with hooks. Use `forwardRef` for ref forwarding. Props: destructure in function params
- **Hooks**: Custom hooks in `/hooks`, follow `useXxx` naming. Handle loading/error states consistently
- **Services**: Async functions returning Promises. Use Supabase client for DB operations with proper error handling
- **Database**: PostgreSQL via Supabase. Use Row Level Security. Prefer server-side functions for complex logic
- **Security**: Never log/commit secrets. Use environment variables. Validate inputs with Zod schemas
- **Performance**: Memoize expensive operations. Use React Query for caching. Lazy load components when possible

## Additional Notes
- **Testing**: Write e2e tests for critical user flows. Use data-testid for element selection
- **Commits**: Follow conventional commits. Run lint/build before committing
- **Deployment**: Cloudflare Pages for static assets, Supabase for backend functions
- **AI Usage**: Agents handle lead processing, use structured prompts with clear instructions