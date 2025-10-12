# Edge Function Deployment Guide

**Function**: dual-write-habit
**Status**: Phase 1 Implementation Complete
**Date**: 2025-10-12

---

## Prerequisites

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
npx supabase login
```

This will open a browser window for authentication.

### 3. Link to Project

```bash
npx supabase link --project-ref gqvyzqodyspvwlwfjmfg
```

---

## Deployment Steps

### Method 1: Deploy via Supabase CLI (Recommended)

```bash
# From project root
npx supabase functions deploy dual-write-habit

# Or with specific flags
npx supabase functions deploy dual-write-habit --no-verify-jwt
```

**Expected Output**:
```
Deploying function dual-write-habit...
Function URL: https://gqvyzqodyspvwlwfjmfg.supabase.co/functions/v1/dual-write-habit
```

### Method 2: Deploy All Functions

```bash
npx supabase functions deploy
```

---

## Verification

### 1. Check Deployment Status

```bash
npx supabase functions list
```

**Expected Output**:
```
dual-write-habit (deployed)
```

### 2. View Function Logs

```bash
npx supabase functions logs dual-write-habit --tail
```

### 3. Test with curl

```bash
# Test create_week operation
curl -X POST https://gqvyzqodyspvwlwfjmfg.supabase.co/functions/v1/dual-write-habit \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: test-$(date +%s)" \
  -d '{
    "operation": "create_week",
    "data": {
      "user_id": "fc24adf2-a7af-4fbf-abe0-c332bb48b02b",
      "child_name": "테스트",
      "week_start_date": "2025-10-14",
      "habits": [
        {
          "id": 1,
          "name": "아침운동",
          "times": ["green", "yellow", "", "", "", "", ""]
        }
      ],
      "theme": "건강한 습관",
      "reflection": "",
      "reward": ""
    }
  }'
```

**Expected Response** (200 OK):
```json
{
  "success": true,
  "operation": "create_week",
  "result": {
    "old_id": "uuid",
    "new_week_id": "uuid",
    "child_id": "uuid",
    "habits_created": 1
  },
  "idempotencyKey": "test-xxxxx"
}
```

---

## Environment Variables

Edge Functions automatically have access to these environment variables:

- `SUPABASE_URL` - Auto-configured
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-configured (has full database access)
- `SUPABASE_ANON_KEY` - Auto-configured

**No manual configuration needed!**

---

## Testing Operations

### 1. Create Week

```bash
curl -X POST https://gqvyzqodyspvwlwfjmfg.supabase.co/functions/v1/dual-write-habit \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: create-$(date +%s)" \
  -d @- << 'EOF'
{
  "operation": "create_week",
  "data": {
    "user_id": "fc24adf2-a7af-4fbf-abe0-c332bb48b02b",
    "child_name": "이은지",
    "week_start_date": "2025-10-21",
    "habits": [
      {"id": 1, "name": "양치하기", "times": ["green", "", "", "", "", "", ""]},
      {"id": 2, "name": "책읽기", "times": ["yellow", "", "", "", "", "", ""]}
    ],
    "theme": "주간 목표",
    "reflection": null,
    "reward": null
  }
}
EOF
```

### 2. Update Habit Record

```bash
curl -X POST https://gqvyzqodyspvwlwfjmfg.supabase.co/functions/v1/dual-write-habit \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: update-$(date +%s)" \
  -d @- << 'EOF'
{
  "operation": "update_habit_record",
  "data": {
    "child_name": "이은지",
    "week_start_date": "2025-10-21",
    "habit_name": "양치하기",
    "day_index": 1,
    "status": "green"
  }
}
EOF
```

### 3. Verify Consistency

```bash
curl -X POST https://gqvyzqodyspvwlwfjmfg.supabase.co/functions/v1/dual-write-habit \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: verify-$(date +%s)" \
  -d '{"operation": "verify_consistency", "data": {}}'
```

### 4. Delete Week

```bash
curl -X POST https://gqvyzqodyspvwlwfjmfg.supabase.co/functions/v1/dual-write-habit \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: delete-$(date +%s)" \
  -d @- << 'EOF'
{
  "operation": "delete_week",
  "data": {
    "child_name": "이은지",
    "week_start_date": "2025-10-21"
  }
}
EOF
```

---

## Monitoring

### View Real-time Logs

```bash
npx supabase functions logs dual-write-habit --tail
```

### Check Idempotency Log

```sql
-- In Supabase SQL Editor
SELECT * FROM idempotency_log
ORDER BY created_at DESC
LIMIT 10;
```

### Check Drift Detection

```bash
# Run drift detection script
node scripts/drift-detection.js
```

---

## Troubleshooting

### Issue: "Function not found"

**Solution**: Ensure function is deployed
```bash
npx supabase functions list
npx supabase functions deploy dual-write-habit
```

### Issue: "X-Idempotency-Key header required"

**Solution**: Add header to request
```bash
-H "X-Idempotency-Key: unique-key-$(date +%s)"
```

### Issue: "Missing required fields"

**Solution**: Check request data matches expected format
- `create_week`: needs user_id, child_name, week_start_date
- `update_habit_record`: needs child_name, week_start_date, habit_name, day_index, status
- `delete_week`: needs child_name, week_start_date

### Issue: "New schema write failed"

**Solution**: Check database trigger logs
```sql
-- Check if trigger is enabled
SELECT tgname, tgenabled FROM pg_trigger
WHERE tgname = 'trigger_habit_tracker_dual_write';

-- If needed, Database Trigger will handle sync
```

---

## Rollback

### Disable Edge Function

```bash
# Delete function
npx supabase functions delete dual-write-habit
```

### Revert to Previous Version

```bash
# Redeploy from git
git checkout HEAD~1 supabase/functions/dual-write-habit/index.ts
npx supabase functions deploy dual-write-habit
```

---

## Performance Monitoring

### Expected Performance

- **p50 latency**: < 100ms
- **p95 latency**: < 200ms
- **p99 latency**: < 500ms
- **Error rate**: < 1%

### Alert Thresholds

- ⚠️ **Warning**: p95 > 200ms
- 🚨 **Critical**: Error rate > 1% or p99 > 1s

---

## Next Steps After Deployment

1. ✅ Deploy Edge Function
2. ✅ Test all 4 operations
3. ✅ Verify idempotency works
4. ✅ Check drift detection shows < 0.1%
5. ⏳ Frontend integration (src/lib/database.js)
6. ⏳ 24-hour stability test
7. ⏳ Phase 2 approval

---

**Created**: 2025-10-12
**Status**: Ready for deployment
**Function**: dual-write-habit
**Version**: 1.0.0 (Phase 1)
