# Backend Architecture & Systems

## Design Patterns
- **Clean Architecture**: Separation of concerns (Entities, Use Cases, Interface Adapters, Frameworks).
- **Service Layer Pattern**: Decoupling business logic from transport layers (Express/Fastify).
- **Dependency Injection**: Enhancing testability by injecting dependencies rather than hardcoding them.

## API Engineering
- **RESTful Best Practices**: Correct HTTP methods, status codes (200, 201, 400, 401, 403, 404, 500), and resource-based URI structure.
- **GraphQL**: Efficient data fetching, schema-first development, and type safety.
- **Error Handling**: Centralized middleware for catching and formatting errors.
- **Rate Limiting**: Protecting APIs from abuse using Redis-backed limiters.

## Database & Persistence
- **Indexing**: Optimize queries by indexing frequently searched columns.
- **Migrations**: Use versioned migrations (Prisma, TypeORM, Knex) to manage schema changes.
- **ACID Compliance**: Ensure data integrity using transactions for multi-step operations.
- **Connection Pooling**: Manage DB connections efficiently to prevent exhaustion.

## Security
- **OWASP Top 10**: Mitigate XSS, SQLi, and CSRF.
- **Authentication**: Use JWT with short-lived access tokens and secure refresh tokens.
- **Encryption**: Scrypt or Argon2 for password hashing. TLS for all data in transit.

## Performance
- **Caching**: implement Redis for high-frequency, low-variance data.
- **Async Processing**: Use message brokers (RabbitMQ, BullMQ) for long-running tasks.
