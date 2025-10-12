import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-idempotency-key',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Parse request
    const { operation, data } = await req.json();

    // Check idempotency key
    const idempotencyKey = req.headers.get('X-Idempotency-Key');
    if (!idempotencyKey) {
      throw new Error('X-Idempotency-Key header required');
    }

    // Check if this request was already processed (idempotency check)
    const { data: existingLog, error: logError } = await supabase
      .from('idempotency_log')
      .select('*')
      .eq('key', idempotencyKey)
      .single();

    if (existingLog && !logError) {
      console.log(`Idempotent request detected: ${idempotencyKey}`);
      return new Response(
        JSON.stringify({
          message: 'Request already processed (idempotent)',
          cached: true,
          original_response: existingLog.response_data
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Phase 1: Route to appropriate dual-write function
    console.log(`Dual-write request: ${operation}`);
    console.log(`Idempotency key: ${idempotencyKey}`);
    console.log('Data:', data);

    let result;
    let responseStatus = 200;

    try {
      switch (operation) {
        case 'create_week':
          result = await createWeekDualWrite(supabase, data);
          break;

        case 'update_habit_record':
          result = await updateHabitRecordDualWrite(supabase, data);
          break;

        case 'delete_week':
          result = await deleteWeekDualWrite(supabase, data);
          break;

        case 'verify_consistency':
          result = await verifyConsistency(supabase);
          break;

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      const responseData = {
        success: true,
        operation,
        result,
        idempotencyKey
      };

      // Log successful operation
      await supabase
        .from('idempotency_log')
        .insert({
          key: idempotencyKey,
          operation: operation,
          request_data: data,
          response_data: responseData,
          status: 'success'
        });

      return new Response(
        JSON.stringify(responseData),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: responseStatus
        }
      );

    } catch (operationError) {
      console.error(`Operation failed: ${operation}`, operationError);

      const errorResponse = {
        success: false,
        operation,
        error: operationError.message,
        idempotencyKey
      };

      // Log failed operation
      await supabase
        .from('idempotency_log')
        .insert({
          key: idempotencyKey,
          operation: operation,
          request_data: data,
          response_data: errorResponse,
          status: 'failed'
        });

      return new Response(
        JSON.stringify(errorResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

  } catch (error) {
    console.error('Edge Function error:', error);

    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

// ============================================================================
// Placeholder functions for Phase 1 implementation
// ============================================================================

/**
 * Create a new week with dual-write to both old and new schemas
 *
 * @param supabase - Supabase client with service role
 * @param data - Week data (user_id, child_name, week_start_date, habits, theme, reflection, reward)
 * @returns Promise<{ old_id: string, new_week_id: string, child_id: string, habits_created: number }>
 */
async function createWeekDualWrite(supabase: any, data: any) {
  const { user_id, child_name, week_start_date, habits, theme, reflection, reward } = data;

  // Validate required fields
  if (!user_id || !child_name || !week_start_date) {
    throw new Error('Missing required fields: user_id, child_name, week_start_date');
  }

  // Calculate week_end_date and week_period
  const startDate = new Date(week_start_date);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  const weekPeriod = formatWeekPeriod(startDate);

  console.log(`Creating week for ${child_name}, ${week_start_date} to ${endDate.toISOString().split('T')[0]}`);

  // Step 1: Write to OLD SCHEMA (habit_tracker)
  const { data: oldRecord, error: oldError } = await supabase
    .from('habit_tracker')
    .insert({
      user_id,
      child_name,
      week_start_date,
      week_period: weekPeriod,
      habits: habits || [],
      theme: theme || null,
      reflection: reflection || null,
      reward: reward || null
    })
    .select()
    .single();

  if (oldError) {
    console.error('Failed to write to old schema:', oldError);
    throw new Error(`Old schema write failed: ${oldError.message}`);
  }

  console.log(`✅ Old schema: Created record ${oldRecord.id}`);

  try {
    // Step 2: Write to NEW SCHEMA
    // 2a. Get or create child
    let child;
    const { data: existingChild } = await supabase
      .from('children')
      .select('id')
      .eq('name', child_name)
      .eq('user_id', user_id)
      .single();

    if (existingChild) {
      child = existingChild;
      console.log(`✅ Found existing child: ${child.id}`);
    } else {
      const { data: newChild, error: childError } = await supabase
        .from('children')
        .insert({
          user_id,
          name: child_name,
          source_version: 'dual_write'
        })
        .select()
        .single();

      if (childError) {
        throw new Error(`Failed to create child: ${childError.message}`);
      }
      child = newChild;
      console.log(`✅ Created new child: ${child.id}`);
    }

    // 2b. Create week
    const { data: week, error: weekError } = await supabase
      .from('weeks')
      .insert({
        user_id,
        child_id: child.id,
        week_start_date,
        week_end_date: endDate.toISOString().split('T')[0],
        theme: theme || null,
        reflection: reflection || null,
        reward: reward || null,
        source_version: 'dual_write'
      })
      .select()
      .single();

    if (weekError) {
      throw new Error(`Failed to create week: ${weekError.message}`);
    }

    console.log(`✅ New schema: Created week ${week.id}`);

    // 2c. Create habits and habit_records
    let habitsCreated = 0;
    if (habits && habits.length > 0) {
      for (const habit of habits) {
        const { data: habitRow, error: habitError } = await supabase
          .from('habits')
          .insert({
            week_id: week.id,
            name: habit.name,
            display_order: habit.id || habitsCreated,
            source_version: 'dual_write'
          })
          .select()
          .single();

        if (habitError) {
          console.error(`Failed to create habit ${habit.name}:`, habitError);
          continue;
        }

        habitsCreated++;

        // Create habit_records from times array (7 days)
        if (habit.times && habit.times.length > 0) {
          const records = [];
          for (let day = 0; day < 7 && day < habit.times.length; day++) {
            const status = habit.times[day];
            if (status && status !== '') {
              const recordDate = new Date(startDate);
              recordDate.setDate(recordDate.getDate() + day);

              records.push({
                habit_id: habitRow.id,
                record_date: recordDate.toISOString().split('T')[0],
                status: status,
                source_version: 'dual_write'
              });
            }
          }

          if (records.length > 0) {
            const { error: recordsError } = await supabase
              .from('habit_records')
              .insert(records);

            if (recordsError) {
              console.error(`Failed to create habit records:`, recordsError);
            } else {
              console.log(`✅ Created ${records.length} habit records for ${habit.name}`);
            }
          }
        }
      }
    }

    console.log(`✅ Dual-write complete: old_id=${oldRecord.id}, new_week_id=${week.id}, habits=${habitsCreated}`);

    return {
      old_id: oldRecord.id,
      new_week_id: week.id,
      child_id: child.id,
      habits_created: habitsCreated
    };

  } catch (newSchemaError) {
    // New schema failed, but old schema succeeded
    // Log error but don't rollback old schema (Database Trigger will handle)
    console.error('New schema write failed:', newSchemaError);
    throw new Error(`New schema write failed: ${newSchemaError.message}. Old record created: ${oldRecord.id}`);
  }
}

/**
 * Format week period string (Korean format)
 * Example: "2025년 10월 14일 ~ 2025년 10월 20일"
 */
function formatWeekPeriod(startDate: Date): string {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}년 ${month}월 ${day}일`;
  };

  return `${formatDate(startDate)} ~ ${formatDate(endDate)}`;
}

/**
 * Update a habit record with dual-write to both schemas
 *
 * @param supabase - Supabase client with service role
 * @param data - Habit record update (child_name, week_start_date, habit_name, day_index, status)
 * @returns Promise<{ old_updated: boolean, new_updated: boolean, record_id: string }>
 */
async function updateHabitRecordDualWrite(supabase: any, data: any) {
  const { child_name, week_start_date, habit_name, day_index, status } = data;

  // Validate required fields
  if (!child_name || !week_start_date || !habit_name || day_index === undefined || !status) {
    throw new Error('Missing required fields: child_name, week_start_date, habit_name, day_index, status');
  }

  console.log(`Updating habit record: ${child_name}, ${week_start_date}, ${habit_name}, day ${day_index} -> ${status}`);

  // Step 1: Update OLD SCHEMA (JSONB habits array)
  const { data: oldRecord, error: oldFetchError } = await supabase
    .from('habit_tracker')
    .select('*')
    .eq('child_name', child_name)
    .eq('week_start_date', week_start_date)
    .single();

  if (oldFetchError || !oldRecord) {
    throw new Error(`Old record not found: ${oldFetchError?.message || 'No data'}`);
  }

  // Update habits JSONB array
  const habits = oldRecord.habits || [];
  let habitFound = false;

  for (const habit of habits) {
    if (habit.name === habit_name) {
      habitFound = true;
      if (!habit.times) {
        habit.times = Array(7).fill('');
      }
      habit.times[day_index] = status;
      break;
    }
  }

  if (!habitFound) {
    throw new Error(`Habit '${habit_name}' not found in old schema`);
  }

  const { error: oldUpdateError } = await supabase
    .from('habit_tracker')
    .update({ habits })
    .eq('id', oldRecord.id);

  if (oldUpdateError) {
    throw new Error(`Old schema update failed: ${oldUpdateError.message}`);
  }

  console.log(`✅ Old schema: Updated habit_tracker ${oldRecord.id}`);

  // Step 2: Update NEW SCHEMA (habit_records table)
  try {
    // Find or create child
    let child;
    const { data: existingChild } = await supabase
      .from('children')
      .select('id')
      .eq('name', child_name)
      .single();

    if (existingChild) {
      child = existingChild;
    } else {
      // Auto-create child if not exists
      const { data: newChild, error: childError } = await supabase
        .from('children')
        .insert({
          user_id: oldRecord.user_id,
          name: child_name,
          source_version: 'dual_write'
        })
        .select()
        .single();

      if (childError) {
        throw new Error(`Failed to create child: ${childError.message}`);
      }
      child = newChild;
      console.log(`✅ Auto-created child: ${child.id}`);
    }

    // Find or create week
    let week;
    const { data: existingWeek } = await supabase
      .from('weeks')
      .select('id')
      .eq('child_id', child.id)
      .eq('week_start_date', week_start_date)
      .single();

    if (existingWeek) {
      week = existingWeek;
    } else {
      // Auto-create week if not exists
      const endDate = new Date(week_start_date);
      endDate.setDate(endDate.getDate() + 6);

      const { data: newWeek, error: weekError } = await supabase
        .from('weeks')
        .insert({
          user_id: oldRecord.user_id,
          child_id: child.id,
          week_start_date,
          week_end_date: endDate.toISOString().split('T')[0],
          theme: oldRecord.theme || null,
          reflection: oldRecord.reflection || null,
          reward: oldRecord.reward || null,
          source_version: 'dual_write'
        })
        .select()
        .single();

      if (weekError) {
        throw new Error(`Failed to create week: ${weekError.message}`);
      }
      week = newWeek;
      console.log(`✅ Auto-created week: ${week.id}`);
    }

    // Find or create habit
    let habit;
    const { data: existingHabit } = await supabase
      .from('habits')
      .select('id')
      .eq('week_id', week.id)
      .eq('name', habit_name)
      .single();

    if (existingHabit) {
      habit = existingHabit;
    } else {
      // Auto-create habit if not exists
      // Find the display_order from old schema
      const oldHabit = habits.find((h: any) => h.name === habit_name);
      const displayOrder = oldHabit?.id || 999;

      const { data: newHabit, error: habitError } = await supabase
        .from('habits')
        .insert({
          week_id: week.id,
          name: habit_name,
          display_order: displayOrder,
          source_version: 'dual_write'
        })
        .select()
        .single();

      if (habitError) {
        throw new Error(`Failed to create habit: ${habitError.message}`);
      }
      habit = newHabit;
      console.log(`✅ Auto-created habit: ${habit.id} (${habit_name})`);
    }

    // Calculate record_date
    const recordDate = new Date(week_start_date);
    recordDate.setDate(recordDate.getDate() + day_index);
    const recordDateStr = recordDate.toISOString().split('T')[0];

    // Check if record exists
    const { data: existingRecord } = await supabase
      .from('habit_records')
      .select('id')
      .eq('habit_id', habit.id)
      .eq('record_date', recordDateStr)
      .single();

    let record;
    if (existingRecord) {
      // Update existing record
      const { data: updated, error: updateError } = await supabase
        .from('habit_records')
        .update({
          status,
          source_version: 'dual_write'
        })
        .eq('id', existingRecord.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`New schema update failed: ${updateError.message}`);
      }
      record = updated;
    } else {
      // Insert new record
      const { data: inserted, error: insertError } = await supabase
        .from('habit_records')
        .insert({
          habit_id: habit.id,
          record_date: recordDateStr,
          status,
          source_version: 'dual_write'
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`New schema insert failed: ${insertError.message}`);
      }
      record = inserted;
    }

    console.log(`✅ New schema: Updated/created habit_record ${record.id}`);

    return {
      old_updated: true,
      new_updated: true,
      record_id: record.id
    };

  } catch (newSchemaError) {
    console.error('New schema update failed:', newSchemaError);
    throw new Error(`New schema update failed: ${newSchemaError.message}`);
  }
}

/**
 * Delete a week with dual-write to both schemas
 *
 * @param supabase - Supabase client with service role
 * @param data - Week identifier (child_name + week_start_date)
 * @returns Promise<{ old_deleted: boolean, new_deleted: boolean, cascade_count: number }>
 */
async function deleteWeekDualWrite(supabase: any, data: any) {
  const { child_name, week_start_date } = data;

  // Validate required fields
  if (!child_name || !week_start_date) {
    throw new Error('Missing required fields: child_name, week_start_date');
  }

  console.log(`Deleting week: ${child_name}, ${week_start_date}`);

  // Step 1: Delete from OLD SCHEMA
  const { data: deletedOld, error: oldDeleteError } = await supabase
    .from('habit_tracker')
    .delete()
    .eq('child_name', child_name)
    .eq('week_start_date', week_start_date)
    .select();

  if (oldDeleteError) {
    throw new Error(`Old schema delete failed: ${oldDeleteError.message}`);
  }

  const oldDeleted = deletedOld && deletedOld.length > 0;
  console.log(`✅ Old schema: Deleted ${deletedOld.length} record(s)`);

  // Step 2: Delete from NEW SCHEMA
  try {
    // Find child
    const { data: child } = await supabase
      .from('children')
      .select('id')
      .eq('name', child_name)
      .single();

    if (!child) {
      console.warn(`Child '${child_name}' not found in new schema - nothing to delete`);
      return {
        old_deleted: oldDeleted,
        new_deleted: false,
        cascade_count: 0
      };
    }

    // Count habits and records before deletion (for reporting)
    const { data: week } = await supabase
      .from('weeks')
      .select('id')
      .eq('child_id', child.id)
      .eq('week_start_date', week_start_date)
      .single();

    let cascadeCount = 0;
    if (week) {
      const { count: habitCount } = await supabase
        .from('habits')
        .select('*', { count: 'exact', head: true })
        .eq('week_id', week.id);

      const { count: recordCount } = await supabase
        .from('habit_records')
        .select('*', { count: 'exact', head: true })
        .in('habit_id',
          await supabase.from('habits').select('id').eq('week_id', week.id)
            .then(r => r.data?.map(h => h.id) || [])
        );

      cascadeCount = (habitCount || 0) + (recordCount || 0);
    }

    // Delete week (CASCADE will delete habits and habit_records)
    const { data: deletedNew, error: newDeleteError } = await supabase
      .from('weeks')
      .delete()
      .eq('child_id', child.id)
      .eq('week_start_date', week_start_date)
      .select();

    if (newDeleteError) {
      throw new Error(`New schema delete failed: ${newDeleteError.message}`);
    }

    const newDeleted = deletedNew && deletedNew.length > 0;
    console.log(`✅ New schema: Deleted ${deletedNew.length} week(s), ~${cascadeCount} cascaded records`);

    return {
      old_deleted: oldDeleted,
      new_deleted: newDeleted,
      cascade_count: cascadeCount
    };

  } catch (newSchemaError) {
    console.error('New schema delete failed:', newSchemaError);
    throw new Error(`New schema delete failed: ${newSchemaError.message}`);
  }
}

/**
 * Verify consistency between old and new schemas
 *
 * @param supabase - Supabase client with service role
 * @returns Promise<{ consistent: boolean, drift_report: any }>
 */
async function verifyConsistency(supabase: any) {
  console.log('Starting consistency verification...');

  const issues = [];
  const stats = {
    old_weeks: 0,
    new_weeks: 0,
    sample_size: 10,
    checked: 0,
    mismatches: 0
  };

  // Step 1: Count comparison
  const { count: oldCount } = await supabase
    .from('habit_tracker')
    .select('*', { count: 'exact', head: true });

  const { count: newCount } = await supabase
    .from('weeks')
    .select('*', { count: 'exact', head: true });

  stats.old_weeks = oldCount || 0;
  stats.new_weeks = newCount || 0;

  if (oldCount !== newCount) {
    issues.push({
      severity: 'HIGH',
      type: 'COUNT_MISMATCH',
      old_count: oldCount,
      new_count: newCount,
      diff: (newCount || 0) - (oldCount || 0)
    });
  }

  console.log(`Count: old=${oldCount}, new=${newCount}`);

  // Step 2: Sample data verification
  const { data: oldSamples } = await supabase
    .from('habit_tracker')
    .select('*')
    .limit(stats.sample_size);

  if (oldSamples) {
    for (const oldRow of oldSamples) {
      stats.checked++;

      // Find corresponding new schema data
      const { data: child } = await supabase
        .from('children')
        .select('id')
        .eq('name', oldRow.child_name)
        .single();

      if (!child) {
        issues.push({
          severity: 'CRITICAL',
          type: 'MISSING_CHILD',
          child_name: oldRow.child_name
        });
        stats.mismatches++;
        continue;
      }

      const { data: week } = await supabase
        .from('weeks')
        .select('*')
        .eq('child_id', child.id)
        .eq('week_start_date', oldRow.week_start_date)
        .single();

      if (!week) {
        issues.push({
          severity: 'CRITICAL',
          type: 'MISSING_WEEK',
          child_name: oldRow.child_name,
          week_start_date: oldRow.week_start_date
        });
        stats.mismatches++;
        continue;
      }

      // Compare fields
      if (oldRow.theme !== week.theme) {
        issues.push({
          severity: 'MEDIUM',
          type: 'DATA_MISMATCH',
          field: 'theme',
          child_name: oldRow.child_name,
          week_start_date: oldRow.week_start_date,
          old_value: oldRow.theme,
          new_value: week.theme
        });
        stats.mismatches++;
      }
    }
  }

  // Step 3: Source version distribution
  const { data: sourceVersions } = await supabase
    .from('weeks')
    .select('source_version');

  const versionCounts: { [key: string]: number } = {};
  if (sourceVersions) {
    for (const row of sourceVersions) {
      const version = row.source_version || 'unknown';
      versionCounts[version] = (versionCounts[version] || 0) + 1;
    }
  }

  const consistent = issues.length === 0;
  const driftRate = stats.old_weeks > 0 ? Math.abs(stats.new_weeks - stats.old_weeks) / stats.old_weeks : 0;

  console.log(`Consistency check complete: ${consistent ? 'PASS' : 'FAIL'}, ${issues.length} issues, ${driftRate.toFixed(2)}% drift`);

  return {
    consistent,
    drift_rate: driftRate,
    stats,
    issues,
    source_versions: versionCounts,
    timestamp: new Date().toISOString()
  };
}
