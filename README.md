# RLS

A Node.js/TypeScript backend service with OpenAPI/Swagger support.

## Overview

This project is a monorepo-style backend application built with TypeScript, using Bun as the runtime. It includes:

- **REST API** with OpenAPI 3.0 specification
- **Swagger UI** for API documentation and testing
- **Task-based automation** using Taskfile
- **Code quality** tools (Biome for linting/formatting)

## Project Structure

```
├── backend/          # Main backend application
├── docs/             # Documentation
├── swagger/          # OpenAPI specification and UI assets
├── tests/            # Test files
└── .bmad/            # BMad agent configuration
```

## Quick Start

### Prerequisites
- [Bun](https://bun.sh) v1.3.8+
- [Task](https://taskfile.dev) (optional)

### Development

```bash
# Start backend in watch mode
bun run backend:dev

# Run tests
bun run backend:test

# Type check
bun run backend:typecheck
```

### API Documentation

Start Swagger UI locally:
```bash
# Using Docker
docker compose up

# Using Task
task swagger:ui
```

Access at http://localhost:9989

## Scripts

| Command | Description |
|---------|-------------|
| `bun run backend:dev` | Start backend in watch mode |
| `bun run backend:build` | Build backend binary |
| `bun run backend:test` | Run all tests |
| `bun run lint` | Lint code with Biome |
| `bun run generate` | Regenerate routes and schemas |

## License

Private project
