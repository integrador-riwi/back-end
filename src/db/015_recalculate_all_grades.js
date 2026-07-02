// Migration 015: Recalculate all grades after adding missing rubric evaluations
// Run: node src/db/015_recalculate_all_grades.js
//
// After migration 014 added placeholder evaluations for rubrics lost by the
// old unique constraint, the persisted results in individual_area_results and
// individual_project_results are stale. This script recalculates grades for
// every project that has evaluation data, using the exact same calculation
// logic as calculateProjectGrades.

import pool from "../db/pool.js";
import { calculateProjectGrades } from "../modules/evaluations/evaluations.service.js";

const RECALCULATE_EVENT_ID = null; // set to an event ID to limit scope, or null for all

async function recalculateAllGrades() {
  console.log("=== Grade Recalculation Migration ===");
  console.log("Finding projects to recalculate...\n");

  let projects;
  if (RECALCULATE_EVENT_ID) {
    const res = await pool.query(
      `SELECT DISTINCT p.id_project, p.name
       FROM projects p
       JOIN evaluations e ON e.project_id = p.id_project
       WHERE p.id_event = $1
       ORDER BY p.id_project`,
      [RECALCULATE_EVENT_ID],
    );
    projects = res.rows;
  } else {
    const res = await pool.query(
      `SELECT DISTINCT p.id_project, p.name
       FROM projects p
       JOIN evaluations e ON e.project_id = p.id_project
       ORDER BY p.id_project`,
    );
    projects = res.rows;
  }

  console.log(`Found ${projects.length} projects with evaluations.\n`);

  let successCount = 0;
  let failCount = 0;

  for (const project of projects) {
    try {
      console.log(`[${successCount + failCount + 1}/${projects.length}] Recalculating project ${project.id_project} (${project.name || "unnamed"})...`);
      await calculateProjectGrades(project.id_project, "ADMIN");
      console.log(`  ✓ Done`);
      successCount++;
    } catch (err) {
      console.log(`  ✗ Failed: ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n=== Complete: ${successCount} succeeded, ${failCount} failed ===`);
}

recalculateAllGrades()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
