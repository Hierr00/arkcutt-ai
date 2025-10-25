# Arreglar el Constraint de quotation_interactions

## Problema

El constraint `valid_type` NO se actualizó correctamente. Todavía rechaza 'confirmation_sent' y otros tipos nuevos.

## Solución

Ve al **SQL Editor** de Supabase y ejecuta este SQL:

```sql
-- 1. Ver el constraint actual (para confirmar el problema)
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'quotation_interactions'::regclass
  AND conname = 'valid_type';

-- 2. ELIMINAR el constraint viejo
ALTER TABLE quotation_interactions
  DROP CONSTRAINT IF EXISTS valid_type;

-- 3. CREAR el nuevo constraint con TODOS los tipos
ALTER TABLE quotation_interactions
  ADD CONSTRAINT valid_type CHECK (
    type IN (
      'email_received',
      'email_sent',
      'confirmation_sent',
      'info_request',
      'info_provided',
      'provider_contacted',
      'provider_response',
      'quote_received',
      'agent_note'
    )
  );

-- 4. Verificar que se creó correctamente
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'quotation_interactions'::regclass
  AND conname = 'valid_type';
```

## Resultado Esperado

La última query debe mostrar:

```
constraint_name: valid_type
definition: CHECK ((type = ANY (ARRAY['email_received'::text, 'email_sent'::text, 'confirmation_sent'::text, ...]))
```

Si ves 'confirmation_sent' en la lista, ¡está arreglado!

## Después de Ejecutar

Una vez aplicado, vuelve a ejecutar:

```bash
node scripts/test-interaction-insert.js
```

Debe decir: ✅ Successfully inserted interaction!
