# Database & Data Engineering

## Relational Databases (SQL)
- **PostgreSQL**: Advanced indexing (B-Tree, GIN, GiST), JSONB for semi-structured data, and views/materialized views.
- **Performance**: Query optimization through `EXPLAIN ANALYZE`. Manage connection pooling with PgBouncer.
- **Data Integrity**: Enforce constraints (Foreign Keys, Unique, Check) and use Serialized isolation levels for critical transactions.

## NoSQL & Specialized Stores
- **MongoDB/Document Stores**: Efficient schema design (embedding vs referencing) and aggregation pipelines.
- **Redis**: High-performance caching, pub/sub, and distributed locking.
- **Vector Databases**: Pinecone or Weaviate for AI-driven semantic search.

## Data Operations
- **Migrations**: Versioned, non-destructive schema updates using Prisma or Flyway.
- **Backups**: Point-in-time recovery and geographically distributed replication.
- **ETL Pipelines**: Extracting, transforming, and loading data for analytical workloads.

## Modeling
- **ERD Design**: Logical and physical data modeling.
- **Normalization**: Reducing redundancy while maintaining performance (3rd Normal Form vs Denormalization).
