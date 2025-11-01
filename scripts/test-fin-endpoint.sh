#!/bin/bash

# Script para testear el endpoint de Fin
# Uso: ./scripts/test-fin-endpoint.sh [URL]

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# URL del endpoint (puede ser local o Vercel)
if [ -z "$1" ]; then
  URL="http://localhost:3000"
else
  URL="$1"
fi

# Token de Fin - Load from environment
if [ -z "$FIN_API_TOKEN" ]; then
  echo -e "${RED}ERROR: FIN_API_TOKEN not set${NC}"
  echo "Set it with: export FIN_API_TOKEN='your-token-here'"
  exit 1
fi
TOKEN="$FIN_API_TOKEN"

echo "========================================="
echo "🧪 TESTING FIN ENDPOINT"
echo "========================================="
echo "URL: $URL"
echo ""

# Test 1: Debug endpoint (GET)
echo "📋 Test 1: Debug Endpoint (GET)"
echo "-----------------------------------------"
curl -s "$URL/api/fin/debug" | jq '.'
echo ""
echo ""

# Test 2: Debug endpoint (POST con token)
echo "📋 Test 2: Debug Endpoint (POST con Authorization)"
echo "-----------------------------------------"
curl -s -X POST "$URL/api/fin/debug" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "test@example.com",
    "subject": "Test",
    "body": "Test body",
    "thread_id": "test-123",
    "has_attachments": false
  }' | jq '.'
echo ""
echo ""

# Test 3: Classify endpoint sin auth (debe dar 401)
echo "📋 Test 3: Classify Endpoint SIN Authorization (debe dar 401)"
echo "-----------------------------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$URL/api/fin/classify-and-route" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "test@example.com",
    "subject": "Test",
    "body": "Test",
    "thread_id": "test-123",
    "has_attachments": false
  }')

if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✅ CORRECTO: Devuelve 401 sin auth${NC}"
else
  echo -e "${RED}❌ ERROR: Esperaba 401, recibió $HTTP_CODE${NC}"
fi
echo ""
echo ""

# Test 4: Classify endpoint CON auth (debe dar 200)
echo "📋 Test 4: Classify Endpoint CON Authorization (debe dar 200)"
echo "-----------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$URL/api/fin/classify-and-route" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "test@example.com",
    "subject": "Presupuesto mecanizado",
    "body": "Necesito cotización para 100 piezas",
    "thread_id": "test-123",
    "has_attachments": false
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed \$d)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ CORRECTO: Devuelve 200 con auth${NC}"
  echo "Response:"
  echo "$BODY" | jq '.'
else
  echo -e "${RED}❌ ERROR: Esperaba 200, recibió $HTTP_CODE${NC}"
  echo "Response:"
  echo "$BODY"
fi
echo ""
echo ""

# Test 5: Classify endpoint con token INCORRECTO (debe dar 401)
echo "📋 Test 5: Classify Endpoint con Token INCORRECTO (debe dar 401)"
echo "-----------------------------------------"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$URL/api/fin/classify-and-route" \
  -H "Authorization: Bearer WRONG_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "test@example.com",
    "subject": "Test",
    "body": "Test",
    "thread_id": "test-123",
    "has_attachments": false
  }')

if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✅ CORRECTO: Devuelve 401 con token incorrecto${NC}"
else
  echo -e "${RED}❌ ERROR: Esperaba 401, recibió $HTTP_CODE${NC}"
fi
echo ""
echo ""

echo "========================================="
echo "✨ Tests completados"
echo "========================================="
