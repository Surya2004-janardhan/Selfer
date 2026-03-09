# API Design & Implementation

## Architecture
- **API First**: Design the contract (OpenAPI/Swagger) before writing code.
- **Statelessness**: Ensure each request contains all necessary data (JWT for auth).
- **HATEOAS**: Implement hypermedia links if required for true REST maturity.

## Implementation Details
- **Serialization**: Use efficient formats like JSON or Protobuf. Optimize payload sizes.
- **Versioning**: Prefer URL versioning (`/v1/...`) for breaking changes. Use headers for non-breaking variations.
- **Documentation**: Auto-generate documentation (Swagger UI, Redoc) from code/specs.

## Reliability
- **Circuit Breakers**: Prevent cascading failures when calling external APIs.
- **Timeouts**: Enforce strict timeouts on all outgoing requests.
- **Retries**: Implement exponential backoff for transient failures.

## Testing & Validation
- **Contract Testing**: Verify that both provider and consumer adhere to the spec.
- **Schema Validation**: Use Zod or Joi to validate all incoming and outgoing data at the boundary.