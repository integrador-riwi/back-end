-- Add id_rubric column and create unique constraint on
-- (project_id, evaluator_user_id, evaluated_user_id, id_rubric)
-- so that one evaluation per rubric per member can be stored.

-- Step 1: Drop existing unique constraint(s) on evaluations
DO $$
DECLARE
    con_name text;
BEGIN
    FOR con_name IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'evaluations'
          AND con.contype = 'u'
    LOOP
        EXECUTE 'ALTER TABLE evaluations DROP CONSTRAINT ' || con_name;
    END LOOP;
END $$;

-- Step 2: Add id_rubric column
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS id_rubric INTEGER;

-- Step 3: Backfill id_rubric for existing rows
UPDATE evaluations e
SET id_rubric = g.id_rubric
FROM grades g
WHERE e.id_grade = g.id_grade
  AND e.id_rubric IS NULL;

-- Step 4: Set NOT NULL
ALTER TABLE evaluations ALTER COLUMN id_rubric SET NOT NULL;

-- Step 5: Create new unique constraint including id_rubric
ALTER TABLE evaluations
ADD CONSTRAINT evaluations_unique_evaluator_rubric
UNIQUE (project_id, evaluator_user_id, evaluated_user_id, id_rubric);
