-- Create HNSW indexes for semantic search performance
-- Parameters optimized for <1s search latency (NFR-P1)
-- m = 16: max connections per layer
-- ef_construction = 64: build-time accuracy

CREATE INDEX IF NOT EXISTS idx_endpoint_domain_embedding
  ON "endpoints"
  USING hnsw ("domainObjectEmbedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_endpoint_full_embedding
  ON "endpoints"
  USING hnsw ("fullEndpointEmbedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
