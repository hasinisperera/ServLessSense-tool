# ServLessSense

Dashboard for detecting and visualizing serverless code smells.

## Install

```bash
yarn install
```

## Run Analysis

Analyze a target serverless project and write results to `public/data/`:

```bash
yarn analyze <path-to-project>
```

This runs ESLint smell rules and async/sync call analysis in one step.

## Run Application

```bash
yarn dev
```

Open [http://localhost:3039](http://localhost:3039).

## Build for Production

```bash
yarn build
yarn preview
```

Static smell data in `public/data/` is included in the build output.

## GPT Refactoring (optional)

1. Copy the server env template and set your API key:

```bash
cp ../server/.env.example ../server/.env
```

Edit `../server/.env` and set `OPENAI_API_KEY` to your real key. The `.env` file is gitignored and must not be committed.

2. Start the refactoring API server:

```bash
yarn dev:api
```

Or run frontend and API together:

```bash
yarn dev:all
```

3. Configure the frontend API URL via `.env` (optional):

```
VITE_API_URL=http://localhost:3001
```

## Lint

```bash
yarn lint
```

## Project Structure

- `src/sections/smells/` — shared smell visualization module
- `public/data/smells/` — analysis output JSON (dev + production)
- `tools/analyze/` — ESLint and async call analyzers
