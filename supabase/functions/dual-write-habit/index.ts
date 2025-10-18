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

    // Phase 3: NEW SCHEMA ONLY (no more dual-write)
    console.log(`NEW SCHEMA operation: ${operation}`);
    console.log(`Idempotency key: ${idempotencyKey}`);
    console.log('Data:', data);

    let result;
    let responseStatus = 200;

    try {
      switch (operation) {
        case 'create_week':
          result = await createWeekNewSchema(supabase, data);
          break;

        case 'update_habit_record':
          result = await updateHabitRecordNewSchema(supabase, data);
          break;

        case 'delete_week':
          result = await deleteWeekNewSchema(supabase, data);
          break;

        case 'verify_consistency':
          result = await verifyNewSchema(supabase);
          break;

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      const responseData = {
        success: true,
        operation,
        result,
        idempotencyKey,
        schema_version: 'new_only' // Phase 3: NEW SCHEMA ONLY
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
// Phase 3: NEW SCHEMA ONLY Functions
// ============================================================================

/**
 * Create a new week in NEW SCHEMA only (Phase 3: Old schema is READ-ONLY)
 */
async function createWeekNewSchema(supabase: any, data: any) {
  const { user_id, child_name, week_start_date, habits, theme, reflection, reward } = data;

  // Validate required fields
  if (!user_id || !child_name || !week_start_date) {
    throw new Error('Missing required fields: user_id, child_name, week_start_date');
  }

  // Adjust week_start_date to Monday (for new schema constraint)
  const originalDate = new Date(week_start_date);
  const adjustedDate = adjustToMonday(originalDate);
  const adjustedDateStr = adjustedDate.toISOString().split('T')[0];

  // Calculate week_end_date
  const endDate = new Date(adjustedDate);
  endDate.setDate(endDate.getDate() + 6);

  console.log(`[NEW SCHEMA ONLY] Creating/updating week for ${child_name}, ${adjustedDateStr} to ${endDate.toISOString().split('T')[0]}`);

  // Get or create child
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
        source_version: 'new_schema_only' // Phase 3
      })
      .select()
      .single();

    if (childError) {
      throw new Error(`Failed to create child: ${childError.message}`);
    }
    child = newChild;
    console.log(`✅ Created new child: ${child.id}`);
  }

  // Upsert week
  const { data: existingWeek } = await supabase
    .from('weeks')
    .select('id')
    .eq('child_id', child.id)
    .eq('week_start_date', adjustedDateStr)
    .single();

  let week;
  if (existingWeek) {
    // UPDATE existing week
    const { data: updated, error: updateError } = await supabase
      .from('weeks')
      .update({
        theme: theme || null,
        reflection: reflection || null,
        reward: reward || null,
        source_version: 'new_schema_only'
      })
      .eq('id', existingWeek.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update week: ${updateError.message}`);
    }
    week = updated;
    console.log(`✅ Updated week ${week.id}`);
  } else {
    // INSERT new week
    const { data: inserted, error: insertError } = await supabase
      .from('weeks')
      .insert({
        user_id,
        child_id: child.id,
        week_start_date: adjustedDateStr,
        week_end_date: endDate.toISOString().split('T')[0],
        theme: theme || null,
        reflection: reflection || null,
        reward: reward || null,
        source_version: 'new_schema_only'
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create week: ${insertError.message}`);
    }
    week = inserted;
    console.log(`✅ Created week ${week.id}`);
  }

  // Sync habits and habit_records
  // Strategy: Delete all existing habits for this week and recreate
  const { error: deleteHabitsError } = await supabase
    .from('habits')
    .delete()
    .eq('week_id', week.id);

  if (deleteHabitsError) {
    console.warn(`Failed to delete old habits: ${deleteHabitsError.message}`);
  }

  let habitsCreated = 0;
  if (habits && habits.length > 0) {
    for (const habit of habits) {
      const { data: habitRow, error: habitError } = await supabase
        .from('habits')
        .insert({
          week_id: week.id,
          name: habit.name,
          display_order: habitsCreated,
          source_version: 'new_schema_only'
        })
        .select()
        .single();

      if (habitError) {
        console.error(`❌ Failed to create habit "${habit.name}":`, habitError);
        continue;
      }

      console.log(`✅ Created habit: ${habit.name} (id: ${habitRow.id})`);
      habitsCreated++;

      // Create habit_records from times array (7 days)
      if (habit.times && habit.times.length > 0) {
        const records = [];
        for (let day = 0; day < 7 && day < habit.times.length; day++) {
          const status = habit.times[day];
          if (status && status !== '') {
            const recordDate = new Date(adjustedDate);
            recordDate.setDate(recordDate.getDate() + day);

            records.push({
              habit_id: habitRow.id,
              record_date: recordDate.toISOString().split('T')[0],
              status: status,
              source_version: 'new_schema_only'
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

  console.log(`✅ NEW SCHEMA: week_id=${week.id}, habits=${habitsCreated}`);

  return {
    new_week_id: week.id,
    child_id: child.id,
    habits_created: habitsCreated
  };
}

/**
 * Update a habit record in NEW SCHEMA only
 */
async function updateHabitRecordNewSchema(supabase: any, data: any) {
  const { user_id, child_name, week_start_date, habit_name, day_index, status } = data;

  // Validate required fields
  if (!user_id || !child_name || !week_start_date || !habit_name || day_index === undefined || !status) {
    throw new Error('Missing required fields: user_id, child_name, week_start_date, habit_name, day_index, status');
  }

  // Adjust week_start_date to Monday
  const originalDate = new Date(week_start_date);
  const adjustedDate = adjustToMonday(originalDate);
  const adjustedDateStr = adjustedDate.toISOString().split('T')[0];

  console.log(`[NEW SCHEMA ONLY] Updating habit record: ${child_name}, ${adjustedDateStr}, ${habit_name}, day ${day_index} -> ${status}`);

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
        user_id,
        name: child_name,
        source_version: 'new_schema_only'
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
    .eq('week_start_date', adjustedDateStr)
    .single();

  if (existingWeek) {
    week = existingWeek;
  } else {
    // Auto-create week if not exists
    const endDate = new Date(adjustedDateStr);
    endDate.setDate(endDate.getDate() + 6);

    const { data: newWeek, error: weekError } = await supabase
      .from('weeks')
      .insert({
        user_id,
        child_id: child.id,
        week_start_date: adjustedDateStr,
        week_end_date: endDate.toISOString().split('T')[0],
        source_version: 'new_schema_only'
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
    const { data: newHabit, error: habitError } = await supabase
      .from('habits')
      .insert({
        week_id: week.id,
        name: habit_name,
        display_order: 999,
        source_version: 'new_schema_only'
      })
      .select()
      .single();

    if (habitError) {
      throw new Error(`Failed to create habit: ${habitError.message}`);
    }
    habit = newHabit;
    console.log(`✅ Auto-created habit: ${habit.id}`);
  }

  // Calculate record_date
  const recordDate = new Date(adjustedDateStr);
  recordDate.setDate(recordDate.getDate() + day_index);
  const recordDateStr = recordDate.toISOString().split('T')[0];

  // Upsert habit_record
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
        source_version: 'new_schema_only'
      })
      .eq('id', existingRecord.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update record: ${updateError.message}`);
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
        source_version: 'new_schema_only'
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to insert record: ${insertError.message}`);
    }
    record = inserted;
  }

  console.log(`✅ Updated/created habit_record ${record.id}`);

  return {
    new_updated: true,
    record_id: record.id
  };
}

/**
 * Delete a week from NEW SCHEMA only
 */
async function deleteWeekNewSchema(supabase: any, data: any) {
  const { child_name, week_start_date } = data;

  if (!child_name || !week_start_date) {
    throw new Error('Missing required fields: child_name, week_start_date');
  }

  console.log(`[NEW SCHEMA ONLY] Deleting week: ${child_name}, ${week_start_date}`);

  // Find child
  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('name', child_name)
    .single();

  if (!child) {
    console.warn(`Child '${child_name}' not found - nothing to delete`);
    return {
      new_deleted: false,
      cascade_count: 0
    };
  }

  // Count habits and records before deletion
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

    cascadeCount = habitCount || 0;
  }

  // Delete week (CASCADE will delete habits and habit_records)
  const { data: deleted, error: deleteError } = await supabase
    .from('weeks')
    .delete()
    .eq('child_id', child.id)
    .eq('week_start_date', week_start_date)
    .select();

  if (deleteError) {
    throw new Error(`Delete failed: ${deleteError.message}`);
  }

  const deletedCount = deleted && deleted.length > 0;
  console.log(`✅ Deleted ${deleted.length} week(s), ~${cascadeCount} cascaded records`);

  return {
    new_deleted: deletedCount,
    cascade_count: cascadeCount
  };
}

/**
 * Verify NEW SCHEMA consistency
 */
async function verifyNewSchema(supabase: any) {
  console.log('Verifying NEW SCHEMA...');

  const stats = {
    weeks: 0,
    habits: 0,
    habit_records: 0,
    children: 0
  };

  const { count: weeksCount } = await supabase
    .from('weeks')
    .select('*', { count: 'exact', head: true });

  const { count: habitsCount } = await supabase
    .from('habits')
    .select('*', { count: 'exact', head: true });

  const { count: recordsCount } = await supabase
    .from('habit_records')
    .select('*', { count: 'exact', head: true });

  const { count: childrenCount } = await supabase
    .from('children')
    .select('*', { count: 'exact', head: true });

  stats.weeks = weeksCount || 0;
  stats.habits = habitsCount || 0;
  stats.habit_records = recordsCount || 0;
  stats.children = childrenCount || 0;

  console.log('NEW SCHEMA stats:', stats);

  return {
    consistent: true,
    stats,
    schema_version: 'new_only',
    timestamp: new Date().toISOString()
  };
}

/**
 * Adjust date to the nearest Monday
 */
function adjustToMonday(date: Date): Date {
  const adjusted = new Date(date);
  const dayOfWeek = adjusted.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  if (dayOfWeek === 1) {
    return adjusted;
  }

  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  adjusted.setDate(adjusted.getDate() - daysToSubtract);

  return adjusted;
}
