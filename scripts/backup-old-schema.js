#!/usr/bin/env node

/**
 * Phase 3 Day 5-6: Backup OLD SCHEMA before removal
 *
 * This script creates a full backup of the habit_tracker table
 * before renaming it to habit_tracker_old
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read .env file
const envPath = path.join(__dirname, '..', '.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const SUPABASE_URL = envVars.VITE_SUPABASE_URL
const SUPABASE_KEY = envVars.VITE_SUPABASE_ANON_KEY

// Import Supabase
const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

console.log('💾 Phase 3 Day 5-6: Backing up OLD SCHEMA\n')
console.log('================================================================================\n')

// Step 1: Get all data from habit_tracker
console.log('📊 Step 1: Fetching all data from habit_tracker...\n')

const { data: allRecords, error: fetchError } = await supabase
  .from('habit_tracker')
  .select('*')
  .order('id', { ascending: true })

if (fetchError) {
  console.error('❌ Error fetching data:', fetchError.message)
  process.exit(1)
}

console.log(`   ✅ Fetched ${allRecords.length} records\n`)

// Step 2: Create backup directory
const backupDir = path.join(__dirname, '..', 'backups')
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true })
  console.log('   ✅ Created backups directory\n')
}

// Step 3: Save backup as JSON
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupFilename = `habit_tracker_backup_${timestamp}.json`
const backupPath = path.join(backupDir, backupFilename)

const backupData = {
  backup_date: new Date().toISOString(),
  table_name: 'habit_tracker',
  record_count: allRecords.length,
  records: allRecords,
  metadata: {
    phase: 'Phase 3 Day 5-6',
    purpose: 'Backup before renaming to habit_tracker_old',
    note: 'This is the final backup before removing OLD SCHEMA'
  }
}

fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2))

console.log('💾 Step 2: Backup saved successfully\n')
console.log(`   File: ${backupFilename}`)
console.log(`   Path: ${backupPath}`)
console.log(`   Size: ${(fs.statSync(backupPath).size / 1024).toFixed(2)} KB`)
console.log(`   Records: ${allRecords.length}\n`)

// Step 4: Generate statistics
console.log('📊 Step 3: Backup Statistics\n')

const stats = {
  total_records: allRecords.length,
  children: new Set(allRecords.map(r => r.child_name)).size,
  date_range: {
    earliest: allRecords[0]?.week_start_date,
    latest: allRecords[allRecords.length - 1]?.week_start_date
  },
  total_habits: allRecords.reduce((sum, r) => sum + (r.habits?.length || 0), 0),
  with_theme: allRecords.filter(r => r.theme).length,
  with_reflection: allRecords.filter(r => r.reflection).length,
  with_reward: allRecords.filter(r => r.reward).length
}

console.log(`   Total records: ${stats.total_records}`)
console.log(`   Unique children: ${stats.children}`)
console.log(`   Date range: ${stats.date_range.earliest} ~ ${stats.date_range.latest}`)
console.log(`   Total habits: ${stats.total_habits}`)
console.log(`   With theme: ${stats.with_theme} (${(stats.with_theme / stats.total_records * 100).toFixed(1)}%)`)
console.log(`   With reflection: ${stats.with_reflection} (${(stats.with_reflection / stats.total_records * 100).toFixed(1)}%)`)
console.log(`   With reward: ${stats.with_reward} (${(stats.with_reward / stats.total_records * 100).toFixed(1)}%)\n`)

// Step 5: Create backup index
const indexPath = path.join(backupDir, 'BACKUP_INDEX.md')
const indexEntry = `
## ${backupFilename}

- **Date**: ${new Date().toISOString()}
- **Records**: ${stats.total_records}
- **Children**: ${stats.children}
- **Phase**: Phase 3 Day 5-6
- **Purpose**: Final backup before renaming to habit_tracker_old
- **File size**: ${(fs.statSync(backupPath).size / 1024).toFixed(2)} KB

`

if (fs.existsSync(indexPath)) {
  const existingIndex = fs.readFileSync(indexPath, 'utf-8')
  fs.writeFileSync(indexPath, existingIndex + indexEntry)
} else {
  fs.writeFileSync(indexPath, `# Habit Tracker Backups\n\n` + indexEntry)
}

console.log('📝 Step 4: Updated backup index\n')

// Step 6: Verify backup integrity
console.log('🔍 Step 5: Verifying backup integrity...\n')

const verifyData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'))

if (verifyData.record_count !== allRecords.length) {
  console.error('   ❌ Backup verification failed: record count mismatch')
  process.exit(1)
}

if (verifyData.records.length !== allRecords.length) {
  console.error('   ❌ Backup verification failed: records array length mismatch')
  process.exit(1)
}

// Sample verification
const sampleIndex = Math.floor(Math.random() * allRecords.length)
const originalSample = allRecords[sampleIndex]
const backupSample = verifyData.records[sampleIndex]

if (originalSample.id !== backupSample.id) {
  console.error('   ❌ Backup verification failed: sample record mismatch')
  process.exit(1)
}

console.log(`   ✅ Backup integrity verified`)
console.log(`   ✅ Sample record verified (ID: ${originalSample.id})\n`)

// Final summary
console.log('================================================================================\n')
console.log('🎉 Backup completed successfully!\n')
console.log('📁 Backup Details:')
console.log(`   - Filename: ${backupFilename}`)
console.log(`   - Location: backups/`)
console.log(`   - Records: ${stats.total_records}`)
console.log(`   - Verified: ✅\n`)
console.log('📋 Next Steps:')
console.log('   1. Review backup file')
console.log('   2. Run: node scripts/rename-old-schema.js')
console.log('   3. Monitor for 1 week')
console.log('   4. Complete deletion (optional)\n')
console.log('✅ Backup script complete\n')
