# 🎨 Templates API Documentation

**Library**: `src/lib/templates.js`
**Hook**: `src/hooks/useTemplate.js`
**Component**: `src/components/TemplateManager.jsx`
**Developer**: Agent 3 (Template System Developer)
**Status**: ✅ Complete (Day 1)

---

## 📋 Overview

The Templates API provides complete CRUD (Create, Read, Update, Delete) operations for habit templates in the Habit Tracker application. Templates allow users to save habit configurations and quickly apply them to different weeks and children.

### Key Features
- Create and manage reusable habit templates
- Apply templates to specific weeks for children
- Set default templates for quick access
- Duplicate existing templates for variations
- Child-specific or shared templates

---

## 🔧 Core Functions

### 1. `createTemplate(templateData)`

Create a new habit template.

**Signature**:
```javascript
async function createTemplate(templateData: TemplateData): Promise<Template>
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `templateData` | Object | ✅ | Template configuration object |
| `templateData.name` | string | ✅ | Template name |
| `templateData.description` | string | ❌ | Template description |
| `templateData.habits` | Array<Habit> | ✅ | Array of habit objects |
| `templateData.child_id` | string (UUID) | ❌ | Child ID (null for shared templates) |
| `templateData.is_default` | boolean | ❌ | Set as default template (default: false) |

**Habit Object Structure**:
```javascript
{
  name: string,           // Habit name (e.g., "숙제하기")
  time_period: string,    // Time period: "아침", "오후", "저녁"
  display_order: number   // Display order (1, 2, 3, ...)
}
```

**Returns**: `Promise<Template>` - Created template object

**Example**:
```javascript
import { createTemplate } from '@/lib/templates.js'

const template = await createTemplate({
  name: "학교 생활 습관",
  description: "학교 다니는 날 기본 습관",
  child_id: "uuid-of-child", // or null for shared template
  is_default: true,
  habits: [
    { name: "아침 운동", time_period: "아침", display_order: 1 },
    { name: "숙제하기", time_period: "오후", display_order: 2 },
    { name: "일기 쓰기", time_period: "저녁", display_order: 3 }
  ]
})

console.log(`Template created with ID: ${template.id}`)
```

**Errors**:
- Throws if user is not authenticated
- Throws if `name` is empty
- Throws if `habits` is not an array
- Throws on database errors

---

### 2. `loadTemplates(filters)`

Load habit templates with optional filtering.

**Signature**:
```javascript
async function loadTemplates(filters?: TemplateFilters): Promise<Template[]>
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filters` | Object | ❌ | Filter options |
| `filters.child_id` | string (UUID) | ❌ | Filter by child ID |
| `filters.is_default` | boolean | ❌ | Filter by default status |
| `filters.include_shared` | boolean | ❌ | Include shared templates (default: true) |

**Returns**: `Promise<Template[]>` - Array of templates

**Example 1: Load all templates**:
```javascript
const allTemplates = await loadTemplates()
```

**Example 2: Load default templates only**:
```javascript
const defaultTemplates = await loadTemplates({ is_default: true })
```

**Example 3: Load child-specific templates**:
```javascript
const childTemplates = await loadTemplates({
  child_id: "uuid-of-child",
  include_shared: false // Exclude shared templates
})
```

**Example 4: Load defaults for a specific child**:
```javascript
const templates = await loadTemplates({
  child_id: "uuid-of-child",
  is_default: true,
  include_shared: true
})
```

**Errors**:
- Throws if user is not authenticated
- Returns empty array if no templates found

---

### 3. `updateTemplate(id, updates)`

Update an existing habit template.

**Signature**:
```javascript
async function updateTemplate(id: string, updates: Partial<TemplateData>): Promise<Template>
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | ✅ | Template ID to update |
| `updates` | Object | ✅ | Fields to update |
| `updates.name` | string | ❌ | New template name |
| `updates.description` | string | ❌ | New description |
| `updates.habits` | Array<Habit> | ❌ | New habits array |
| `updates.is_default` | boolean | ❌ | Change default status |

**Returns**: `Promise<Template>` - Updated template object

**Example 1: Update name and description**:
```javascript
const updated = await updateTemplate("template-uuid", {
  name: "학교 생활 습관 (개선)",
  description: "더 나은 습관으로 업데이트"
})
```

**Example 2: Add new habit**:
```javascript
// First, load the template
const template = await loadTemplates({ /* filters */ })
const currentHabits = template[0].habits

// Add a new habit
const newHabits = [
  ...currentHabits,
  { name: "책 읽기", time_period: "저녁", display_order: currentHabits.length + 1 }
]

// Update the template
await updateTemplate(template[0].id, { habits: newHabits })
```

**Example 3: Set as default**:
```javascript
await updateTemplate("template-uuid", { is_default: true })
```

**Errors**:
- Throws if user is not authenticated
- Throws if template not found
- Throws if user doesn't own the template
- Throws on database errors

---

### 4. `deleteTemplate(id)`

Delete a habit template.

**Signature**:
```javascript
async function deleteTemplate(id: string): Promise<void>
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | ✅ | Template ID to delete |

**Returns**: `Promise<void>`

**Example**:
```javascript
await deleteTemplate("template-uuid")
console.log("Template deleted successfully")
```

**Errors**:
- Throws if user is not authenticated
- Throws if template not found
- Throws if user doesn't own the template

**⚠️ Warning**: This is a permanent operation and cannot be undone.

---

### 5. `duplicateTemplate(id, newName)`

Duplicate an existing template with a new name.

**Signature**:
```javascript
async function duplicateTemplate(id: string, newName: string): Promise<Template>
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | ✅ | Template ID to duplicate |
| `newName` | string | ✅ | Name for the new template |

**Returns**: `Promise<Template>` - New template object

**Example**:
```javascript
const original = await loadTemplates({ name: "주중 습관" })
const duplicated = await duplicateTemplate(original[0].id, "주중 습관 (복사본)")

console.log(`Original: ${original[0].id}`)
console.log(`Duplicated: ${duplicated.id}`)
```

**Behavior**:
- Creates a new template with the same habits
- Copies all properties except `id`, `created_at`, `updated_at`
- Sets `is_default` to `false` on the duplicate
- Preserves `child_id` from original

**Errors**:
- Throws if user is not authenticated
- Throws if original template not found
- Throws if `newName` is empty

---

### 6. `applyTemplateToWeek(templateId, childId, weekStartDate)`

Apply a template's habits to a specific week for a child.

**Signature**:
```javascript
async function applyTemplateToWeek(
  templateId: string,
  childId: string,
  weekStartDate: string
): Promise<void>
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `templateId` | string (UUID) | ✅ | Template ID to apply |
| `childId` | string (UUID) | ✅ | Child ID |
| `weekStartDate` | string (YYYY-MM-DD) | ✅ | Week start date (Monday) |

**Returns**: `Promise<void>`

**Example**:
```javascript
import { applyTemplateToWeek } from '@/lib/templates.js'

// Apply template to this week
await applyTemplateToWeek(
  "template-uuid",
  "child-uuid",
  "2025-10-07" // Monday
)

console.log("Template applied successfully!")
```

**Behavior**:
- Calls Edge Function `apply-template-to-week`
- Creates habits and empty habit_records for the week
- Automatically adjusts date to Monday if not already
- **Overwrites existing habits** for that week (use with caution!)

**Errors**:
- Throws if user is not authenticated
- Throws if template not found
- Throws if child not found
- Throws if Edge Function fails

**⚠️ Warning**: This will replace all existing habits for the specified week. Consider prompting the user for confirmation before calling.

---

## 🎣 React Hook: `useTemplate`

The `useTemplate` hook provides React Query integration for template operations.

**Import**:
```javascript
import { useTemplate } from '@/hooks/useTemplate.js'
```

**Usage**:
```javascript
function TemplateManager() {
  const {
    templates,        // Array of templates
    isLoading,        // Loading state
    error,            // Error object
    createTemplate,   // Mutation function
    updateTemplate,   // Mutation function
    deleteTemplate,   // Mutation function
    duplicateTemplate // Mutation function
  } = useTemplate({ child_id: "uuid" }) // Optional filters

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      {templates.map(template => (
        <div key={template.id}>
          <h3>{template.name}</h3>
          <button onClick={() => deleteTemplate.mutate(template.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  )
}
```

**Hook Options**:

| Option | Type | Description |
|--------|------|-------------|
| `child_id` | string | Filter templates by child |
| `is_default` | boolean | Filter by default status |
| `include_shared` | boolean | Include shared templates |

**Returned Values**:

| Property | Type | Description |
|----------|------|-------------|
| `templates` | Array<Template> | Loaded templates |
| `isLoading` | boolean | Initial loading state |
| `error` | Error \| null | Error object if any |
| `createTemplate` | Mutation | Create template mutation |
| `updateTemplate` | Mutation | Update template mutation |
| `deleteTemplate` | Mutation | Delete template mutation |
| `duplicateTemplate` | Mutation | Duplicate template mutation |

**Mutation Usage**:
```javascript
// All mutations return a React Query mutation object
createTemplate.mutate(
  { name: "New Template", habits: [...] },
  {
    onSuccess: (data) => console.log('Created:', data),
    onError: (error) => console.error('Failed:', error)
  }
)
```

---

## 🗂️ Data Structures

### Template Object

```typescript
interface Template {
  id: string                // UUID
  user_id: string           // UUID of creator
  child_id: string | null   // UUID or null for shared
  name: string              // Template name
  description: string | null // Optional description
  habits: Habit[]           // Array of habits
  is_default: boolean       // Default template flag
  created_at: string        // ISO timestamp
  updated_at: string        // ISO timestamp
}
```

### Habit Object

```typescript
interface Habit {
  name: string              // Habit name
  time_period: string       // "아침" | "오후" | "저녁"
  display_order: number     // Display order (1, 2, 3, ...)
}
```

---

## 🧪 Testing Examples

### Unit Test Example

```javascript
import { describe, it, expect } from 'vitest'
import { createTemplate, loadTemplates } from '@/lib/templates.js'

describe('Templates API', () => {
  it('creates a template successfully', async () => {
    const template = await createTemplate({
      name: "Test Template",
      habits: [{ name: "Test Habit", time_period: "아침", display_order: 1 }]
    })

    expect(template.id).toBeDefined()
    expect(template.name).toBe("Test Template")
    expect(template.habits).toHaveLength(1)
  })

  it('loads templates with filters', async () => {
    const templates = await loadTemplates({ is_default: true })

    templates.forEach(template => {
      expect(template.is_default).toBe(true)
    })
  })
})
```

---

## ⚠️ Important Notes

### Authentication Required
All functions require Supabase authentication. Always ensure user is logged in:

```javascript
import { supabase } from '@/lib/supabase.js'

const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  // Redirect to login
}
```

### Monday-Aligned Weeks
When using `applyTemplateToWeek`, dates are automatically adjusted to Monday:

```javascript
// If you pass 2025-10-09 (Wednesday), it will use 2025-10-07 (Monday)
await applyTemplateToWeek(templateId, childId, "2025-10-09")
```

### Template Limits
- Maximum 50 habits per template (database constraint)
- Maximum 255 characters for template name
- Maximum 1000 characters for description

### Best Practices
1. Always use `loadTemplates()` before `updateTemplate()` to get current state
2. Prompt user before calling `deleteTemplate()` (irreversible)
3. Use `duplicateTemplate()` instead of manual copying (preserves relationships)
4. Set only one template as `is_default` per child

---

## 🔗 Related Documentation

- **[TEMPLATE_SYSTEM_SPEC.md](../TEMPLATE_SYSTEM_SPEC.md)** - Technical specification
- **[TEMPLATE_SYSTEM_USAGE.md](../TEMPLATE_SYSTEM_USAGE.md)** - User guide
- **[API Index](./README.md)** - All API documentation

---

**Last Updated**: 2025-10-13
**Version**: 1.0.0
**Maintainer**: Agent 4
