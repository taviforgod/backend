# Baptism Module Schema Fix

## Issue
The baptism module was failing with errors like:
- `column bc.first_name does not exist`
- `column bc.visitor_id does not exist`  
- `column "counseling_completed" does not exist`

This occurred because the `baptism_candidates` and `baptism_records` tables had an incorrect schema that didn't match what the controllers and models expected.

## Root Cause
The database had an older version of the baptism tables from a previous migration. When the new `cell_ministry_enhancements.sql` migration ran, it used `CREATE TABLE IF NOT EXISTS`, which skipped creating the new schema since the tables already existed.

## Solution

### Automatic Fix
Run this command to automatically fix the schema:

```bash
npm run fix-baptism
```

This script:
1. Drops the existing `baptism_records` and `baptism_candidates` tables
2. Recreates them with the correct schema from `cell_ministry_enhancements.sql`
3. Verifies all required columns exist

### Manual Steps (if needed)

```bash
# Run all migrations
npm run migrate

# Fix baptism schema specifically
npm run fix-baptism

# Verify the schema
npm run check-baptism
```

## Database Migrations

To apply all migrations when setting up a fresh database:

```bash
npm run migrate
```

This will:
- Read all SQL files from the `/migrations` directory
- Execute them in alphabetical order
- Skip files that have already been applied (CREATE TABLE IF NOT EXISTS)
- Continue on errors (constraint violations, etc.)

## Testing

To verify the baptism tables have the correct schema:

```bash
npm run check-baptism
```

Output should show:
- ✅ baptism_candidates table exists with columns: first_name, surname, visitor_id, counseling_completed, etc.
- ✅ baptism_records table exists with all required columns

## Files Added

- `runMigrations.js` - Applies all SQL migrations from `/migrations` folder
- `fixBaptismSchema.js` - Drops and recreates baptism tables with correct schema
- `checkBaptismSchema.js` - Verifies baptism table schema

These scripts are available as npm commands:
- `npm run migrate` - Run all migrations
- `npm run fix-baptism` - Fix baptism schema
- `npm run check-baptism` - Verify baptism schema
