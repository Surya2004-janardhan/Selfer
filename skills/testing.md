# Testing & Quality Engineering

## Test Strategy
- **Testing Pyramid**: Prioritize unit tests, followed by integration and E2E tests.
- **TDD/BDD**: Drive feature development through failing tests. Use Gherkin for behavioral specs.

## Automated Testing
- **Unit Testing**: Jest or Vitest for high-speed logic validation. Mock external dependencies.
- **Integration Testing**: Supertest for API boundary testing. Test against real (containerized) databases.
- **End-to-End (E2E)**: Playwright for cross-browser validation of critical user journeys.

## Quality Assurance
- **Static Analysis**: ESLint and Prettier for code style and consistency.
- **Type Checking**: Strict TypeScript mode to catch errors at compile time.
- **CI Integration**: Automated pipelines must block merges on test or lint failure.

## Advanced Techniques
- **Mutation Testing**: Use Stryker to verify test suite effectiveness.
- **Performance Testing**: K6 or Artillery for load and stress testing under concurrency.
- **Chaos Engineering**: Introduce controlled failures to verify system resilience.
