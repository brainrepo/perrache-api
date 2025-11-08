# Perrache

**Open source enterprise API catalog platform for effortless API discovery and governance**

## The Problem

In enterprises with 200+ internal APIs, developers waste days or weeks searching for the right endpoint. Teams unknowingly build duplicate services because they can't discover what already exists. Breaking changes surprise consumers. API discovery is broken.

## The Solution

Perrache solves the API discovery crisis through automated ingestion, semantic search, and intelligent governance - all in a single platform that requires zero manual effort.

### Key Features

- **Automatic CI/CD Ingestion**: Webhook endpoint receives OpenAPI specs from any CI/CD pipeline - one line of config, zero maintenance
- **Semantic Discovery**: Search by concept, not keywords. Find "user profile data" across `userEmail`, `contactEmail`, `primaryEmail`
- **Breaking Change Detection**: Automatic spec diffing classifies changes (breaking/non-breaking) and notifies affected consumers
- **Dependency Tracking**: Track who consumes which endpoints at a granular level - know the impact before you deploy
- **Landscape Visualization**: Visual clustering reveals duplicate APIs and domain overlap across your entire API ecosystem
- **Risk-Based Governance**: Visibility-driven approach without blocking deployments

## How It Works

1. **Teams add one line to CI/CD**: `POST` OpenAPI spec to Perrache webhook on deployment
2. **Perrache generates embeddings**: Routes, schemas, and metadata become semantically searchable
3. **Developers search by intent**: "customer contact info" finds relevant endpoints across all services
4. **Breaking changes auto-detected**: Spec comparison runs on every upload, consumers notified automatically
5. **Impact analysis**: See exactly which services are affected by API changes

## Why Perrache?

**Existing tools fall short:**
- Swagger UI: Lives in each repo, no centralized discovery
- Postman: Manual collection maintenance, no semantic search
- Backstage: Requires manual YAML catalog entries teams won't maintain
- Kong/3scale: Gateway-dependent, runtime overhead, keyword search only

**Perrache is different:**
- Zero manual effort (webhook-first automation)
- Platform-agnostic (works with any CI/CD)
- Zero runtime overhead (catalog-only, no gateway)
- Semantic intelligence (embeddings-based discovery)
- Open source (no vendor lock-in)

## Quick Start

```bash
# Coming soon - Perrache is in active development
# Star this repo to follow progress
```

## Integration Example

```yaml
# GitHub Actions example
- name: Upload OpenAPI spec to Perrache
  run: |
    curl -X POST https://perrache.yourorg.com/api/v1/specs/openapi \
      -H "Authorization: Bearer ${{ secrets.PERRACHE_API_KEY }}" \
      -H "Content-Type: application/json" \
      -d @openapi.json
```

## MVP Features (Phase 1)

- CI/CD webhook integration for automatic spec ingestion
- Semantic search with embeddings-based relationship discovery
- Two-tier subscription model (person + endpoint subscribers)
- Automatic breaking change detection with impact analysis
- Risk-based governance (visibility without blocking)
- Environment tracking (dev/staging/prod spec versions)

## Vision (Future Phases)

- Change proposal workflow with consumer feedback
- Visual landscape clustering (HDBSCAN + UMAP) for duplication detection
- API design editor with semantic suggestions
- Per-endpoint Q&A knowledge base

## Contributing

Perrache is open source and welcomes contributions. More details coming soon.

## License

GNU AFFERO GENERAL PUBLIC LICENSE

## Contact

- GitHub Issues: [Report bugs or request features](https://github.com/brainrepo/perrache-api/issues)
- Discussions: [Join the conversation](https://github.com/brainrepo/perrache-api/discussions)

---

**Built with the conviction that API discovery should be effortless, not a weeks-long search.**
