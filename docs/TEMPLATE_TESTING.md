# Template System Testing Guide

**Agent 3: Template System Developer - Day 2 Complete**
**Date**: 2025-10-15
**Status**: Integration Complete - Ready for Testing

## Overview

The Template System allows users to save habit patterns as reusable templates and quickly apply them to new weeks. This guide provides comprehensive testing scenarios to validate the system.

## System Architecture

### Files Created
- `src/lib/templates.js` (313 lines) - Database operations for templates
- `src/hooks/useTemplate.js` (193 lines) - React hooks for template management
- `src/components/TemplateManager.jsx` (494 lines) - UI component for template management

### Integration Points
- **App.jsx**: Integrated with new "템플릿" button in header
- **Database**: Uses `habit_templates` table from migration 009
- **Dual-Write**: Compatible with Phase 2 Edge Function architecture

---

## Test Scenarios

### Test 1: Save Current Week as Template

**Prerequisites**:
- User is logged in
- At least one habit is configured
- A child is selected

**Steps**:
1. Configure 5 habits in the habit tracker
2. Fill in habit names (e.g., "아침 일찍 일어나기", "숙제하기")
3. Click the "템플릿" button in the header
4. Click "현재 주간 저장" button
5. Enter template name: "학기 중 루틴"
6. Enter description: "평일 학교 다닐 때 사용하는 루틴"
7. Check "기본 템플릿으로 설정"
8. Click "저장" button

**Expected Results**:
- Green notification: "템플릿이 저장되었습니다!"
- View switches to template list
- New template appears at the top of the list
- Template shows:
  - Name: "학기 중 루틴"
  - Description: "평일 학교 다닐 때 사용하는 루틴"
  - Badge: "기본" (yellow star badge)
  - Badge: "5개 습관"
  - Habit preview showing all 5 habit names

**Validation**:
- Template saved with correct `user_id`
- Template saved with correct `child_id` (if child selected)
- `is_default` flag set to true
- Habits array contains 5 items with correct names
- `times` arrays are NOT saved (only habit names)

---

### Test 2: Browse Template List

**Prerequisites**:
- User has 3+ saved templates

**Steps**:
1. Click "템플릿" button
2. View the template list

**Expected Results**:
- Templates sorted by creation date (newest first)
- Each template card shows:
  - Template name (bold, large)
  - Description (if provided)
  - "기본" badge (if is_default = true)
  - "{N}개 습관" badge
  - Creation date in Korean format
  - Habit preview (first 5 habits + "+N개 더" if more)
  - Three action buttons: "적용", "수정", "삭제"

**Edge Cases**:
- Empty list shows: "저장된 템플릿이 없습니다" message
- Very long habit names are truncated properly
- Templates with 10+ habits show "+5개 더" badge

---

### Test 3: Apply Template to New Week

**Prerequisites**:
- At least one saved template exists
- Current week has different habit configuration

**Steps**:
1. Set up current week with 3 default habits
2. Click "템플릿" button
3. Find template with 5 habits
4. Click "적용" button on that template
5. Confirm the warning dialog (if current data exists)

**Expected Results**:
- Warning dialog appears: "현재 입력 중인 데이터가 있습니다..."
- After confirmation:
  - Habits array is replaced with template habits (5 items)
  - Each habit has empty `times` array: Array(7).fill('')
  - Habit IDs are regenerated (Date.now() + index)
  - Green notification: "'{template_name}' 템플릿을 적용했습니다!"
  - Template manager closes after 1 second
  - Habit tracker view shows new habits

**Validation**:
- Old habits are completely replaced (not merged)
- New habits have correct names from template
- New habits have empty tracking data (no green/yellow/red)
- Habit order matches template display_order

---

### Test 4: Edit Template

**Prerequisites**:
- Template "학기 중 루틴" exists

**Steps**:
1. Click "템플릿" button
2. Find "학기 중 루틴" template
3. Click the "수정" (Edit) button
4. Change name to: "학기 중 루틴 (업데이트)"
5. Change description to: "2025년 2학기용 루틴"
6. Uncheck "기본 템플릿으로 설정"
7. Click "수정 완료" button

**Expected Results**:
- Green notification: "템플릿이 수정되었습니다!"
- View returns to template list
- Template name updated to "학기 중 루틴 (업데이트)"
- Description updated
- "기본" badge removed
- Habit list unchanged

**Validation**:
- Database record updated: name, description, is_default
- `updated_at` timestamp updated automatically (trigger)
- `habits` array NOT modified (only metadata changed)

---

### Test 5: Delete Template

**Prerequisites**:
- Template "임시 테스트" exists

**Steps**:
1. Click "템플릿" button
2. Find "임시 테스트" template
3. Click the "삭제" (Trash) button
4. Confirm deletion in browser dialog

**Expected Results**:
- Browser confirm dialog: "정말 이 템플릿을 삭제하시겠습니까?"
- After confirmation:
  - Green notification: "템플릿이 삭제되었습니다!"
  - Template removed from list immediately
  - List refreshes to show remaining templates

**Validation**:
- Database record deleted (CASCADE on user_id)
- Template no longer appears in list
- If deleted template was default, other templates unaffected

---

### Test 6: Default Template Management

**Prerequisites**:
- User has 3 templates, none are default

**Steps**:
1. Create new template "방학 루틴"
2. Check "기본 템플릿으로 설정"
3. Save template
4. Verify "방학 루틴" has "기본" badge
5. Edit different template "학기 중 루틴"
6. Check "기본 템플릿으로 설정"
7. Save changes

**Expected Results**:
- After step 3: "방학 루틴" shows "기본" badge
- After step 7:
  - "학기 중 루틴" shows "기본" badge
  - "방학 루틴" "기본" badge is removed
  - Only ONE template has "기본" badge

**Validation**:
- When setting new default, old default's `is_default` set to false
- Database constraint: only one `is_default=true` per `user_id + child_id`
- Partial unique index enforces this at database level

---

### Test 7: Child-Specific Templates

**Prerequisites**:
- User has 2 children: "민수" and "지영"

**Steps**:
1. Select child "민수"
2. Configure habits for 민수
3. Save as template "민수의 루틴"
4. Select child "지영"
5. Configure different habits
6. Save as template "지영의 루틴"
7. View template list

**Expected Results**:
- Template "민수의 루틴" has `child_id` = 민수's UUID
- Template "지영의 루틴" has `child_id` = 지영's UUID
- Both templates appear in template list (no child filtering yet)
- Each template can be applied to current child

**Future Enhancement**:
- Add child filter dropdown in TemplateManager
- Show only relevant templates for selected child
- Show shared templates (child_id = NULL) for all children

---

### Test 8: Error Handling

#### Test 8a: Save with Empty Name
**Steps**:
1. Click "현재 주간 저장"
2. Leave name empty
3. Click "저장"

**Expected**: Red notification "템플릿 이름을 입력해주세요"

#### Test 8b: Save with No Habits
**Steps**:
1. Remove all habits from current week
2. Try to save as template

**Expected**: Red notification "저장할 습관이 없습니다"

#### Test 8c: Network Error During Save
**Steps**:
1. Disconnect internet
2. Try to save template

**Expected**: Red notification "템플릿 저장 실패: {error message}"

#### Test 8d: Delete Non-Existent Template
**Steps**:
1. Open template list
2. In another tab, delete a template directly from database
3. In first tab, try to delete the same template

**Expected**: Error handled gracefully, list refreshes

---

### Test 9: Integration with Dual-Write System

**Prerequisites**:
- Edge Function `create-week` is deployed
- Dual-write is working (Phase 2)

**Steps**:
1. Apply template "학기 중 루틴" with 5 habits
2. Fill in some habit data (green/yellow/red)
3. Set week_start_date
4. Click "저장" button (save week)
5. Verify data saved to both schemas

**Expected Results**:
- Template application sets habits in state
- Saving week calls `createWeekDualWrite()`
- Data written to:
  - Old schema: `habit_tracker` table (backward compatibility)
  - New schema: `children`, `weeks`, `habits`, `habit_records` tables
- Both schemas show same habit names from template

**Validation**:
- Template habits are just structure (names)
- Actual habit records saved via dual-write
- Template system doesn't interfere with data persistence

---

## Performance Testing

### Test 10: Large Template List (100+ Templates)

**Setup**:
- Create 100+ templates via script or manual entry

**Metrics to Check**:
- Template list load time < 2 seconds
- Scrolling performance is smooth
- Search/filter functionality (future feature)

---

## Security Testing

### Test 11: Cross-User Template Access

**Prerequisites**:
- Two user accounts: User A and User B

**Steps**:
1. User A creates template "A의 루틴"
2. Note template UUID from database
3. Log out as User A
4. Log in as User B
5. Try to access User A's template via API or direct URL

**Expected Results**:
- User B cannot see User A's templates in list
- Direct API calls fail with authentication error
- RLS policies block cross-user access

**Validation**:
- `habit_templates_select_policy` enforces `auth.uid() = user_id`
- No data leakage between users

---

## Accessibility Testing

### Test 12: Keyboard Navigation

**Steps**:
1. Tab through template manager UI
2. Use Enter/Space to activate buttons
3. Use Escape to close dialogs

**Expected Results**:
- All interactive elements are keyboard-accessible
- Focus indicators visible
- Logical tab order

### Test 13: Screen Reader Support

**Tools**: VoiceOver (Mac), NVDA (Windows)

**Expected Results**:
- Template names read clearly
- Button purposes announced
- Form fields have proper labels

---

## Mobile Testing

### Test 14: Responsive Design

**Devices**: iPhone SE, iPad, Android phone

**Checks**:
- Template list scrollable
- Buttons touch-friendly (minimum 44x44px)
- Text readable without zooming
- "템플릿" button visible in header
- Modal dialogs fit screen

---

## Data Integrity Testing

### Test 15: Concurrent Template Edits

**Steps**:
1. Open same template in two browser tabs
2. Edit in Tab 1, save
3. Edit in Tab 2, save

**Expected**:
- Last write wins (no conflict resolution yet)
- No database corruption

### Test 16: Template-Week Relationship

**Validation**:
- Deleting template does NOT delete weeks created from it
- Editing template does NOT affect existing weeks
- Templates are "snapshots" at creation time

---

## Regression Testing

### Test 17: Existing Features Still Work

**Checklist**:
- [ ] Can still save week data without using templates
- [ ] Dashboard still loads correctly
- [ ] Child selector still works
- [ ] Habit color selection still works
- [ ] Date picker still functions
- [ ] Logout still clears state

---

## Browser Compatibility

### Test 18: Cross-Browser Testing

**Browsers to Test**:
- Chrome 120+
- Firefox 120+
- Safari 17+
- Edge 120+

**Features to Verify**:
- Template manager renders correctly
- Notifications display properly
- Date/time formats correct
- No console errors

---

## Known Limitations

1. **No Template Editing of Habits**: Currently can only edit metadata (name, description, is_default), not the habit list itself.
2. **No Child Filtering**: Template list shows all templates, not filtered by child.
3. **No Search/Sort**: Large template lists may be hard to navigate.
4. **No Template Preview Before Apply**: User must remember what's in each template.
5. **No Undo After Apply**: Once applied, must manually revert or reload.

---

## Future Enhancements (Day 3+)

1. **Template Search**: Add search bar to filter templates by name
2. **Child Filter**: Dropdown to show only child-specific or shared templates
3. **Template Categories**: Tags like "School", "Vacation", "Weekend"
4. **Template Duplication**: "Copy Template" button to create variations
5. **Template Sharing**: Export/import templates between users
6. **Habit Editing in Templates**: Allow modifying habit list in edit mode
7. **Undo/Redo**: History stack for template applications
8. **Toast Notifications**: Replace browser alerts with styled toasts
9. **Template Analytics**: "Most Used", "Last Used" badges
10. **Bulk Operations**: Select multiple templates to delete

---

## Test Summary Checklist

**Before Production**:
- [ ] All 18 test scenarios pass
- [ ] No console errors in browser
- [ ] Mobile responsive works
- [ ] Data persists correctly in Supabase
- [ ] RLS policies enforced
- [ ] Performance acceptable (<2s load times)
- [ ] Accessible via keyboard/screen reader
- [ ] Cross-browser compatible

**Deployment Notes**:
- Enable RLS on `habit_templates` table in production
- Verify indexes are created (migration 010)
- Monitor query performance for large template lists
- Set up error logging for template operations

---

## Support & Documentation

**For Developers**:
- See `src/lib/templates.js` for API documentation
- See `src/hooks/useTemplate.js` for hook usage examples
- See migration `009_create_habit_templates_table.sql` for schema

**For Users**:
- Templates save only habit names, not tracking data
- Apply template before filling in the week
- Default template is just a convenience marker

**Contact**: Agent 3 (Template System Developer)
