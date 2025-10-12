# Dual-Write Edge Function

**Status**: Phase 0 Skeleton (Not Implemented)
**Deploy Status**: Returns 501 Not Implemented
**Phase 1 Target**: Full implementation

---

## Overview

This Edge Function provides dual-write functionality to synchronize data between the old schema (`habit_tracker` table) and the new schema (`children`, `weeks`, `habits`, `habit_records` tables) during Phase 1 migration.

### Architecture

```
Client Request
      │
      ▼
┌─────────────────────┐
│  Edge Function      │
│  (Dual-Write)       │
└──────┬──────────────┘
       │
       ├───────────────────┐
       ▼                   ▼
┌─────────────┐    ┌──────────────┐
│ Old Schema  │    │  New Schema  │
│ habit_tracker│    │ children     │
└─────────────┘    │ weeks        │
                   │ habits       │
                   │ habit_records│
                   └──────────────┘
```

### Backup Mechanism

If the Edge Function fails, a Database Trigger (`sync_old_to_new()`) provides automatic fallback synchronization.

---

## Phase 0 Status

### ✅ Implemented
- CORS handling
- Idempotency key validation
- Idempotency log storage
- Error handling
- Request/response structure
- Placeholder functions with documentation

### ⏳ Not Implemented (Phase 1)
- `createWeekDualWrite()` - Create week in both schemas
- `updateHabitRecordDualWrite()` - Update habit record in both schemas
- `deleteWeekDualWrite()` - Delete week from both schemas
- `verifyConsistency()` - Drift detection and reporting

---

## API Specification

### Endpoint
```
POST https://YOUR_PROJECT.supabase.co/functions/v1/dual-write-habit
```

### Headers
```
Authorization: Bearer YOUR_ANON_KEY
Content-Type: application/json
X-Idempotency-Key: unique-request-id-123
```

### Request Body
```json
{
  "operation": "create_week" | "update_habit_record" | "delete_week",
  "data": {
    // Operation-specific data
  }
}
```

### Response (Phase 0)
```json
{
  "message": "Dual-write Edge Function skeleton",
  "status": "not_implemented",
  "phase": "Phase 0",
  "note": "Will be implemented in Phase 1",
  "received": {
    "operation": "create_week",
    "data": { ... },
    "idempotencyKey": "unique-request-id-123"
  }
}
```

**Status Code**: `501 Not Implemented`

---

## Testing

### Test with curl (Phase 0)

```bash
curl -X POST https://gqvyzqodyspvwlwfjmfg.supabase.co/functions/v1/dual-write-habit \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: test-key-$(date +%s)" \
  -d '{
    "operation": "create_week",
    "data": {
      "child_name": "Test Child",
      "week_start_date": "2025-10-14",
      "habits": []
    }
  }'
```

**Expected Response**:
```json
{
  "message": "Dual-write Edge Function skeleton",
  "status": "not_implemented",
  "phase": "Phase 0"
}
```

### Test Idempotency

```bash
# Send the same request twice with identical idempotency key
KEY="test-idempotency-123"

curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/dual-write-habit \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: $KEY" \
  -d '{"operation":"create_week","data":{"child_name":"Test"}}'

# Second request should return cached response
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/dual-write-habit \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: $KEY" \
  -d '{"operation":"create_week","data":{"child_name":"Test"}}'
```

---

## Deployment

### Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Logged in: `npx supabase login`
- Linked to project: `npx supabase link --project-ref gqvyzqodyspvwlwfjmfg`

### Deploy Command
```bash
npx supabase functions deploy dual-write-habit
```

### Verify Deployment
```bash
npx supabase functions list
```

### Check Logs
```bash
npx supabase functions logs dual-write-habit
```

---

## Phase 1 Implementation Plan

### Week 1: Core Dual-Write Logic

#### Day 1-2: `createWeekDualWrite()`
1. **Old Schema Write**:
   ```typescript
   await supabase.from('habit_tracker').insert({
     child_name: data.child_name,
     week_start_date: data.week_start_date,
     week_period: formatWeekPeriod(data.week_start_date),
     habits: data.habits, // JSONB array
     user_id: data.user_id
   });
   ```

2. **New Schema Write**:
   ```typescript
   // 1. Get or create child
   const { data: child } = await supabase
     .from('children')
     .upsert({ name: data.child_name, user_id: data.user_id })
     .select()
     .single();

   // 2. Create week
   const { data: week } = await supabase
     .from('weeks')
     .insert({
       child_id: child.id,
       user_id: data.user_id,
       week_start_date: data.week_start_date,
       week_end_date: calculateEndDate(data.week_start_date)
     })
     .select()
     .single();

   // 3. Create habits
   for (const habit of data.habits) {
     const { data: habitRow } = await supabase
       .from('habits')
       .insert({
         week_id: week.id,
         name: habit.name,
         display_order: habit.id
       })
       .select()
       .single();

     // 4. Create habit records (from times array)
     for (let day = 0; day < 7; day++) {
       if (habit.times[day]) {
         await supabase.from('habit_records').insert({
           habit_id: habitRow.id,
           record_date: addDays(data.week_start_date, day),
           status: habit.times[day] // 'green', 'yellow', 'red'
         });
       }
     }
   }
   ```

3. **Consistency Verification**:
   ```typescript
   // Verify both writes succeeded
   const oldExists = await supabase
     .from('habit_tracker')
     .select('id')
     .eq('child_name', data.child_name)
     .eq('week_start_date', data.week_start_date)
     .single();

   const newExists = await supabase
     .from('weeks')
     .select('id')
     .eq('child_id', child.id)
     .eq('week_start_date', data.week_start_date)
     .single();

   if (!oldExists || !newExists) {
     throw new Error('Dual-write verification failed');
   }
   ```

#### Day 3-4: `updateHabitRecordDualWrite()`
- Update JSONB habits array in old schema
- Update habit_records table in new schema
- Handle Last-Write-Wins conflicts

#### Day 5: `deleteWeekDualWrite()`
- Delete from both schemas
- Verify CASCADE cleanup
- Return deletion confirmation

### Week 2: Integration & Testing
- Frontend integration (`src/lib/database.js`)
- Retry logic with exponential backoff
- Error handling and rollback
- Performance testing (100+ concurrent requests)

---

## Idempotency

### How It Works
1. Client sends request with `X-Idempotency-Key` header
2. Edge Function checks `idempotency_log` table
3. If key exists, return cached response (no re-execution)
4. If key is new, process request and log result
5. Log expires after 24 hours (automatic cleanup)

### Idempotency Log Table
```sql
CREATE TABLE idempotency_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  operation TEXT NOT NULL,
  request_data JSONB,
  response_data JSONB,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
);
```

### Cleanup
```sql
-- Runs daily via pg_cron (Phase 1)
SELECT cleanup_idempotency_log();
```

---

## Error Handling

### Client-Side Errors (4xx)
- `400 Bad Request`: Missing required fields
- `401 Unauthorized`: Invalid auth token
- `409 Conflict`: Data consistency violation

### Server-Side Errors (5xx)
- `500 Internal Server Error`: Unexpected error
- `501 Not Implemented`: Phase 0 skeleton (current)
- `503 Service Unavailable`: Database connection failure

### Retry Strategy (Phase 1)
```typescript
async function callDualWriteWithRetry(operation, data, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': generateIdempotencyKey()
        },
        body: JSON.stringify({ operation, data })
      });

      if (response.ok) return await response.json();

      // Exponential backoff
      await sleep(Math.pow(2, attempt) * 1000);
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
    }
  }
}
```

---

## Rollback Plan

### Scenario 1: Edge Function Failure
**Action**: Database Trigger handles sync automatically
**Impact**: Minimal (seamless fallback)
**Recovery**: Fix Edge Function and redeploy

### Scenario 2: Excessive Drift (>1%)
**Action**: Disable dual-write, use old schema only
**Impact**: New schema stops receiving writes
**Recovery**: Investigate drift, re-run backfill, re-enable

### Scenario 3: Performance Degradation
**Action**: Optimize queries, add indexes, scale vertically
**Impact**: Increased latency (temporary)
**Recovery**: Performance tuning, possibly horizontal scaling

---

## Monitoring

### Metrics to Track (Phase 1)
- Request rate (req/min)
- Success rate (%)
- Error rate (%)
- Latency (p50, p95, p99)
- Drift rate (%)
- Idempotency cache hit rate (%)

### Alerts
- Error rate > 1% → Critical
- Drift rate > 0.1% → High
- p95 latency > 200ms → Medium

### Logs
```bash
# View recent logs
npx supabase functions logs dual-write-habit --tail

# Filter errors only
npx supabase functions logs dual-write-habit | grep ERROR
```

---

## Security

### Service Role Key
Edge Function uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS policies. This is required for dual-write to both schemas.

**⚠️ IMPORTANT**: Service role key must be kept secret. Never expose in client-side code.

### Environment Variables
Set in Supabase Dashboard:
- `SUPABASE_URL`: Auto-configured
- `SUPABASE_SERVICE_ROLE_KEY`: Auto-configured
- `SUPABASE_ANON_KEY`: Auto-configured (for client auth)

---

## Development

### Local Testing (with Supabase CLI)
```bash
# Start local Supabase
npx supabase start

# Serve function locally
npx supabase functions serve dual-write-habit

# Test locally
curl -X POST http://localhost:54321/functions/v1/dual-write-habit \
  -H "Authorization: Bearer eyJhbGciOiJI..." \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: local-test-123" \
  -d '{"operation":"create_week","data":{}}'
```

### Debug Mode
```typescript
// Add to index.ts for debugging
console.log('[DEBUG] Operation:', operation);
console.log('[DEBUG] Data:', JSON.stringify(data, null, 2));
console.log('[DEBUG] Idempotency Key:', idempotencyKey);
```

---

## Next Steps

### Phase 0 Complete ✅
- [x] Edge Function skeleton created
- [x] Idempotency infrastructure ready
- [x] CORS and error handling
- [x] Documentation complete

### Phase 1 Pending ⏳
- [ ] Implement `createWeekDualWrite()`
- [ ] Implement `updateHabitRecordDualWrite()`
- [ ] Implement `deleteWeekDualWrite()`
- [ ] Implement `verifyConsistency()`
- [ ] Frontend integration
- [ ] Performance testing
- [ ] 24-hour stability test

---

**Created**: 2025-10-12
**Status**: Phase 0 Skeleton
**Next Phase**: Phase 1 Week 1-2
**Owner**: Claude Code
