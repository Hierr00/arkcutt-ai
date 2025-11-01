# Fin AI - Email Classification and Routing API

## Endpoint

`POST /api/fin/classify-and-route`

## Purpose

This endpoint is called by Fin AI workflows to determine how to handle each incoming email. It performs fast classification (< 1 second) and returns routing decisions that Fin uses to decide its next action.

## Authentication

**Required:** Bearer token in Authorization header

```http
Authorization: Bearer YOUR_FIN_API_TOKEN
```

Set `FIN_API_TOKEN` in your environment variables.

## Request Body

```typescript
{
  from: string;           // Email address of sender (validated as email)
  subject: string;        // Email subject line
  body: string;           // Email body content
  thread_id: string;      // Conversation/thread identifier
  has_attachments: boolean;
  attachments?: Array<{
    filename: string;
    content_type: string;
    size?: number;
  }>;
}
```

### Example Request

```json
{
  "from": "customer@example.com",
  "subject": "Presupuesto para piezas mecanizadas",
  "body": "Necesito 100 piezas en aluminio 6061, adjunto planos",
  "thread_id": "conv_abc123",
  "has_attachments": true,
  "attachments": [
    {
      "filename": "plano_tecnico.pdf",
      "content_type": "application/pdf",
      "size": 245678
    }
  ]
}
```

## Response

```typescript
{
  routing_decision: "CUSTOMER_INQUIRY" | "CUSTOMER_FOLLOWUP" | "PROVIDER_RESPONSE" | "OUT_OF_SCOPE" | "UNCERTAIN";
  action: "CONTINUE_WITH_FIN" | "CLOSE_AND_PROCESS_EXTERNALLY" | "ESCALATE_TO_HUMAN" | "IGNORE";
  confidence: number;  // 0.0 to 1.0
  reason: string;

  // Optional fields based on decision
  automated_reply?: string;
  escalation_message?: string;
  context?: object;
  metadata?: object;
}
```

### Response Scenarios

#### 1. New Customer Quotation Request

```json
{
  "routing_decision": "CUSTOMER_INQUIRY",
  "action": "CONTINUE_WITH_FIN",
  "confidence": 0.95,
  "reason": "quotation_keywords_detected",
  "context": {
    "existing_customer": false,
    "detected_intent": "quotation_request",
    "has_technical_attachments": true
  }
}
```

**Fin Action:** Continue conversation, request missing data, create quotation.

---

#### 2. Existing Customer Follow-up

```json
{
  "routing_decision": "CUSTOMER_FOLLOWUP",
  "action": "CONTINUE_WITH_FIN",
  "confidence": 1.0,
  "reason": "existing_customer_thread",
  "context": {
    "existing_customer": true,
    "previous_quotation_id": "quot-12345",
    "customer_history": {
      "total_quotations": 5,
      "last_interaction_date": "2025-10-25T10:30:00Z",
      "successful_orders": 3
    }
  }
}
```

**Fin Action:** Continue with context, reference previous quotations.

---

#### 3. Provider Response

```json
{
  "routing_decision": "PROVIDER_RESPONSE",
  "action": "CLOSE_AND_PROCESS_EXTERNALLY",
  "confidence": 1.0,
  "reason": "email_from_known_provider",
  "automated_reply": "Hola, gracias por tu cotización. La estamos procesando y te contactaremos si necesitamos alguna aclaración.\n\nSaludos,\nEquipo Arkcutt",
  "metadata": {
    "provider_id": "prov-789",
    "provider_name": "Anodizados SA",
    "rfq_id": "rfq-456"
  }
}
```

**Fin Action:** Send automated reply, close conversation, trigger webhook to Providers Agent.

---

#### 4. Spam or Out of Scope

```json
{
  "routing_decision": "OUT_OF_SCOPE",
  "action": "IGNORE",
  "confidence": 0.85,
  "reason": "spam_detected"
}
```

**Fin Action:** Close conversation silently, add tag "spam".

---

#### 5. Uncertain Intent

```json
{
  "routing_decision": "UNCERTAIN",
  "action": "ESCALATE_TO_HUMAN",
  "confidence": 0.45,
  "reason": "no_clear_intent_detected",
  "escalation_message": "Gracias por contactarnos. Un miembro de nuestro equipo revisará tu mensaje y te responderá en breve."
}
```

**Fin Action:** Send escalation message, assign to human team.

---

## Classification Logic

The endpoint uses a priority-based decision tree:

### Priority 1: Spam Detection (IGNORE)
- Spam keywords: viagra, casino, lottery
- Multiple external links (>5)
- All-caps subject lines
- Suspicious TLDs (.xyz, .top, .gq, etc.)

### Priority 2: Provider Response (CLOSE)
- Email from known provider (DB lookup on `provider_contacts`)
- Subject contains "Re: RFQ-XXX"
- Route to Providers Agent for processing

### Priority 3: Out of Scope (IGNORE)
- HR keywords: nómina, salario, contrato, despido
- Accounting: factura, pago, transferencia
- IT Support: incidencia, error, bug
- Marketing: publicidad, campaña

### Priority 4: Existing Customer (CONTINUE WITH CONTEXT)
- Thread ID matches existing quotation
- Email address in `quotation_requests` table
- Provide historical context to Fin

### Priority 5: Quotation Intent (CONTINUE)
- Technical attachments (.pdf, .dxf, .dwg, .step, .stl)
- Quotation keywords: presupuesto, cotización, mecanizar, piezas
- Confidence threshold: 0.4+

### Priority 6: Uncertain (ESCALATE)
- No clear pattern matched
- Low confidence (<0.4)
- Route to human for review

---

## Performance Requirements

- **Response Time:** < 1000ms (critical)
- **DB Query Time:** < 500ms
- **Timeout:** 3 seconds (configured in Fin workflow)

### Performance Tips

1. **Indexed Lookups:**
   - `provider_contacts.email` (unique index)
   - `quotation_requests.customer_email` (index)
   - `quotation_requests.conversation_thread_id` (index)

2. **Parallel Queries:**
   - Provider check, customer check, spam check run concurrently via `Promise.all()`

3. **Caching (Future):**
   - Cache provider emails in memory
   - Refresh every 1 hour

---

## Error Handling

### 401 Unauthorized

```json
{
  "error": "Unauthorized"
}
```

**Cause:** Missing or invalid `Authorization` header.

### 400 Bad Request

```json
{
  "error": "Invalid request",
  "details": [
    {
      "path": ["from"],
      "message": "Invalid email"
    }
  ]
}
```

**Cause:** Validation error (Zod schema).

### Fallback on Error

If classification fails due to internal error, the endpoint returns:

```json
{
  "routing_decision": "UNCERTAIN",
  "action": "ESCALATE_TO_HUMAN",
  "confidence": 0,
  "reason": "classification_error",
  "escalation_message": "Gracias por contactarnos. Un miembro de nuestro equipo te responderá en breve."
}
```

---

## Logging

Every classification is logged to `routing_logs` table:

```sql
CREATE TABLE routing_logs (
  id UUID PRIMARY KEY,
  email_from VARCHAR(255),
  email_subject TEXT,
  thread_id VARCHAR(255),
  routing_decision VARCHAR(50),
  action VARCHAR(50),
  confidence DECIMAL(3,2),
  reason VARCHAR(255),
  response_time_ms INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ
);
```

### Metrics View

```sql
SELECT * FROM routing_metrics
WHERE date >= NOW() - INTERVAL '7 days'
ORDER BY date DESC;
```

Shows aggregated metrics: total count, avg confidence, avg response time, slow responses.

---

## Testing

Run tests:

```bash
npm test tests/api/fin/classify-and-route.test.ts
```

Test coverage:
- Authentication (valid/invalid tokens)
- Input validation (email format, required fields)
- Provider detection
- Spam detection
- Out-of-scope detection
- Existing customer routing
- New quotation routing
- Uncertain case escalation
- Performance (<2s)
- Database logging

---

## Integration with Fin Workflows

### Workflow: Email Router

```yaml
Name: "Email Router"
Trigger: conversation.user.created

Steps:
  1. Extract email data from conversation

  2. Custom Action: classify_email
     URL: https://your-domain.com/api/fin/classify-and-route
     Method: POST
     Headers:
       Authorization: Bearer {{secrets.FIN_API_TOKEN}}
     Body:
       {
         "from": "{{user.email}}",
         "subject": "{{conversation.subject}}",
         "body": "{{conversation.body}}",
         "thread_id": "{{conversation.id}}",
         "has_attachments": {{conversation.has_attachments}}
       }
     Timeout: 3 seconds

  3. Branch on response.action:

     CONTINUE_WITH_FIN:
       - Set custom_attributes from response.context
       - Continue to Quotation Handler workflow

     CLOSE_AND_PROCESS_EXTERNALLY:
       - Send automated_reply message
       - Close conversation
       - Add tag "provider-response"
       - Call webhook: /api/providers/process-response

     ESCALATE_TO_HUMAN:
       - Send escalation_message
       - Assign to "Human Review" team
       - Set priority HIGH if confidence < 0.5

     IGNORE:
       - Close conversation silently
       - Add tag "spam-or-out-of-scope"
```

---

## Monitoring

### Key Metrics

1. **Routing Accuracy**
   - Target: >90%
   - Query: `SELECT COUNT(*) FROM routing_logs WHERE confidence >= 0.9`

2. **Response Time**
   - Target: <500ms average
   - Query: `SELECT AVG(response_time_ms) FROM routing_logs WHERE created_at > NOW() - INTERVAL '1 day'`

3. **Slow Responses**
   - Alert if: >5% responses > 1000ms
   - Query: `SELECT COUNT(*) FILTER (WHERE response_time_ms > 1000) / COUNT(*) FROM routing_logs`

4. **Decision Distribution**
   ```sql
   SELECT routing_decision, COUNT(*)
   FROM routing_logs
   WHERE created_at > NOW() - INTERVAL '7 days'
   GROUP BY routing_decision
   ORDER BY COUNT(*) DESC;
   ```

### Alerts

Set up alerts for:
- Response time > 1000ms (performance degradation)
- Error rate > 5% (classification failures)
- Confidence < 0.6 in >20% of requests (needs tuning)

---

## Future Enhancements

1. **Machine Learning Classifier**
   - Train ONNX model on historical data
   - Use for ambiguous cases (current: rule-based only)

2. **Provider Email Caching**
   - In-memory cache with 1h TTL
   - Reduce DB queries by 50%

3. **A/B Testing**
   - Test different confidence thresholds
   - Measure impact on escalation rate

4. **Sentiment Analysis**
   - Detect frustrated customers
   - Auto-escalate with high priority

5. **Multi-language Support**
   - Detect email language
   - Adapt keywords for English, French, etc.
