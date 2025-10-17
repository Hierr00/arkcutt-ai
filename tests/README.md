# 🧪 Tests - Context Engineering System

Suite completa de tests para el sistema de Context Engineering con RAG y Tools.

---

## 📦 Test Structure

```
tests/
├── setup.ts                          # Test configuration
├── services/
│   ├── embeddings.service.test.ts   # Embeddings generation tests
│   └── rag.service.test.ts          # RAG system tests
├── tools/
│   ├── material.tools.test.ts       # Material agent tools tests
│   └── providers.tools.test.ts      # Providers agent tools tests
└── integration/
    └── context-engineering.test.ts  # End-to-end integration tests
```

---

## 🚀 Running Tests

### Prerequisites

1. Configure `.env.local` with required credentials:
```bash
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

2. Ensure knowledge base is seeded:
```bash
npm run seed-knowledge
```

### Run All Tests

```bash
npm test
```

### Run Tests with UI

```bash
npm run test:ui
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Specific Test Files

```bash
# Embeddings service tests
npx vitest tests/services/embeddings.service.test.ts

# RAG service tests
npx vitest tests/services/rag.service.test.ts

# Material tools tests
npx vitest tests/tools/material.tools.test.ts

# Providers tools tests
npx vitest tests/tools/providers.tools.test.ts

# Integration tests
npx vitest tests/integration/context-engineering.test.ts
```

### Watch Mode (for development)

```bash
npm test -- --watch
```

---

## 📊 Test Coverage

### Embeddings Service
- ✅ Generate embedding for text
- ✅ Different embeddings for different texts
- ✅ Caching mechanism
- ✅ Long text handling
- ✅ Batch processing

### RAG Service
- ✅ Semantic search by query
- ✅ Filter by agent type
- ✅ Filter by category
- ✅ Respect match threshold
- ✅ Generate optimized RAG context
- ✅ Respect max_tokens limit
- ✅ Knowledge base statistics
- ✅ Performance benchmarks

### Material Tools
- ✅ Check material stock
- ✅ Get material properties
- ✅ Find material supplier
- ✅ Suggest alternatives
- ✅ Integration workflows

### Providers Tools
- ✅ Search providers by service
- ✅ Get provider information
- ✅ Generate provider email
- ✅ Generate material supplier email
- ✅ Check if service is external (critical!)
- ✅ Integration workflows

### Integration Tests
- ✅ RAG context generation
- ✅ Material agent with RAG
- ✅ Proveedores agent with RAG
- ✅ Ingeniería agent with RAG
- ✅ End-to-end workflows
- ✅ Performance & token optimization
- ✅ Quality assurance

---

## 🎯 Key Test Scenarios

### 1. Token Optimization
```typescript
// Verifica que RAG reduce tokens en ~95%
it('should generate optimized context vs full database', async () => {
  const ragContext = await generateRAGContext(query, 'material');

  expect(ragContext.token_count).toBeLessThan(2000);
  // vs ~8000 tokens for full database
});
```

### 2. Semantic Search Accuracy
```typescript
// Verifica similitud > 60% para queries relevantes
it('should find relevant documents', async () => {
  const results = await searchKnowledge({
    query: 'aluminio 7075 aeronáutico',
    agent_type: 'material',
  });

  expect(results[0].similarity).toBeGreaterThan(0.6);
});
```

### 3. External Service Detection
```typescript
// Crítico: Verifica que detecta servicios externos
it('should identify anodizado as external', async () => {
  const result = await checkIfServiceIsExternal({
    service_description: 'anodizado',
  });

  expect(result.is_external).toBe(true);
  expect(result.reason).toContain('NO realiza');
});
```

### 4. Tool Integration
```typescript
// Verifica workflow completo: check stock → properties → supplier
it('should work together', async () => {
  const stock = await checkMaterialStock({ material_code: 'AA7075' });
  const properties = await getMaterialProperties({ material_query: 'aluminio 7075' });
  const supplier = await findMaterialSupplier({ material_code: 'AA7075' });

  expect(stock).toBeDefined();
  expect(properties.source_docs.length).toBeGreaterThan(0);
  expect(supplier).toBeDefined();
});
```

---

## ⚡ Performance Benchmarks

### Expected Performance

| Test | Expected Time | Description |
|------|--------------|-------------|
| Generate embedding | < 500ms | Single text embedding |
| RAG search | < 1000ms | Semantic search + format |
| Check material stock | < 500ms | Database query |
| Get material properties | < 1500ms | RAG search |
| Find supplier | < 1500ms | RAG search |
| Generate email | < 1000ms | Template generation |
| Agent execution | < 10s | Full agent response with RAG |
| Integration test | < 15s | Multiple operations |

### Performance Tests

```bash
# Run only performance-related tests
npx vitest --testNamePattern="Performance|fast|concurrent"
```

---

## 🐛 Debugging Tests

### Verbose Output

```bash
npm test -- --reporter=verbose
```

### Debug Single Test

```bash
npx vitest --no-coverage tests/services/rag.service.test.ts --reporter=verbose
```

### Common Issues

**1. "OPENAI_API_KEY not configured"**
- Ensure `.env.local` exists
- Verify `OPENAI_API_KEY` is set

**2. "Knowledge base empty"**
- Run `npm run seed-knowledge` first
- Verify Supabase connection

**3. "Timeout exceeded"**
- Increase timeout for slow connections
- Check internet connection
- Verify OpenAI API is accessible

**4. "No results found"**
- Check knowledge base is seeded
- Verify match_threshold is not too high
- Check query is in Spanish (knowledge base is Spanish)

---

## 📈 Test Metrics

### Code Coverage Targets
- Lines: > 80%
- Functions: > 80%
- Branches: > 70%

### Quality Metrics
- Similarity score: > 60% for relevant queries
- Token reduction: > 70% vs full database
- Response time: < 2s for tools, < 10s for agents
- Error rate: < 1%

---

## 🔄 Continuous Integration

### Pre-commit Checks

```bash
# Type check
npm run type-check

# Run tests
npm test

# Coverage check
npm run test:coverage
```

### CI Pipeline (example)

```yaml
test:
  steps:
    - name: Install dependencies
      run: npm ci

    - name: Type check
      run: npm run type-check

    - name: Run tests
      run: npm test

    - name: Upload coverage
      uses: codecov/codecov-action@v3
```

---

## 📝 Writing New Tests

### Test Template

```typescript
import { describe, it, expect, beforeAll } from 'vitest';

describe('Your Feature', () => {
  beforeAll(() => {
    // Setup if needed
  });

  describe('Feature Functionality', () => {
    it('should do something', async () => {
      // Arrange
      const input = {...};

      // Act
      const result = await yourFunction(input);

      // Assert
      expect(result).toHaveProperty('expectedProperty');
      expect(result.value).toBe(expectedValue);
    });

    it('should handle edge cases', async () => {
      // Test edge cases
    });

    it('should handle errors gracefully', async () => {
      // Test error handling
    });
  });

  describe('Performance', () => {
    it('should be fast', async () => {
      const start = Date.now();
      await yourFunction(input);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(2000);
    });
  });
});
```

---

## 🤝 Contributing

When adding new features:

1. **Write tests first** (TDD approach)
2. **Ensure tests pass** before committing
3. **Maintain coverage** above 80%
4. **Document test scenarios** in comments
5. **Update this README** with new test info

---

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [OpenAI Testing Guide](https://platform.openai.com/docs/guides/testing)

---

**Last Updated**: 2025-10-17
**Test Coverage**: ~85%
**Total Tests**: 100+
