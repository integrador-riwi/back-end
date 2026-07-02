import EvaluationsService from "./evaluations.service.js";
import { success, created } from "../../utils/response.js";
import { asyncHandler } from "../../middleware/errorHandler.js";

const EvaluationsController = {
  // GET /api/evaluations/rubrics/:eventId
  getRubrics: asyncHandler(async (req, res) => {
    const eventId = parseInt(req.params.eventId);
    const rubrics = await EvaluationsService.getRubricsForEvent(eventId);
    return success(res, rubrics);
  }),

  // POST /api/evaluations/project/:projectId
  submitEvaluations: asyncHandler(async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const evaluatorUserId = req.user.id_user;
    const evaluatorRole = req.user.role;
    const { evaluations } = req.body;

    const results = await EvaluationsService.submitEvaluations({
      projectId,
      evaluatorUserId,
      evaluatorRole,
      evaluations,
    });

    return created(res, results);
  }),

  // GET /api/evaluations/project/:projectId/my
  getMyEvaluations: asyncHandler(async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const evaluatorUserId = req.user.id_user;

    const evaluations = await EvaluationsService.getMyEvaluationsForProject(
        projectId,
        evaluatorUserId,
    );

    return success(res, evaluations);
  }),

  // GET /api/evaluations/project/:projectId/my/summary
  getMyEvaluationSummary: asyncHandler(async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const evaluatorUserId = req.user.id_user;

    const summary = await EvaluationsService.getMyEvaluationSummaryForProject(
        projectId,
        evaluatorUserId,
    );

    return success(res, summary);
  }),

  // POST /api/evaluations/project/:projectId/calculate
  // Triggers grade calculation and persists results.
  // Accessible by ADMIN and any TL.
  calculateGrades: asyncHandler(async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const requestingRole = req.user.role;

    const results = await EvaluationsService.calculateProjectGrades(
        projectId,
        requestingRole,
    );

    return success(res, {
      message: "Grades calculated and saved successfully.",
      calculatedFor: results.length,
      results,
    });
  }),

  // GET /api/evaluations/project/:projectId/results
  // Returns persisted grade results for a project.
  getProjectResults: asyncHandler(async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const results = await EvaluationsService.getProjectResults(projectId);
    return success(res, results);
  }),

  // GET /api/evaluations/project/:projectId/results/summary
  // Returns persisted project score and area summaries.
  getProjectResultsSummary: asyncHandler(async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const summary = await EvaluationsService.getProjectResultsSummary(projectId);
    return success(res, summary);
  }),

  // GET /api/evaluations/event/:eventId/results
  // Returns persisted grade results for all projects in an event.
  getEventResults: asyncHandler(async (req, res) => {
    const eventId = parseInt(req.params.eventId);
    const results = await EvaluationsService.getEventResults(eventId);
    return success(res, results);
  }),

  // GET /api/evaluations/event/:eventId/grade-audit
  // Returns raw evaluation audit rows plus calculated result snapshots.
  getGradeAuditByEvent: asyncHandler(async (req, res) => {
    const eventId = parseInt(req.params.eventId);
    const requestingRole = req.user.role;
    const audit = await EvaluationsService.getGradeAuditByEvent(
        eventId,
        requestingRole,
    );
    return success(res, audit);
  }),

  // POST /api/evaluations/event/:eventId/recalculate-existing-results
  // Updates only already-created calculated rows. It does not insert missing
  // individual_project_results or individual_area_results records.
  recalculateExistingEventResults: asyncHandler(async (req, res) => {
    const eventId = parseInt(req.params.eventId);
    const requestingRole = req.user.role;
    const result = await EvaluationsService.recalculateExistingEventResults(
        eventId,
        requestingRole,
    );
    return success(res, {
      message: "Existing calculated results updated successfully.",
      ...result,
    });
  }),

  // GET /api/evaluations/event/:eventId/coverage
  // Returns per-project area coverage so the admin can see readiness to close.
  getEventEvalCoverage: asyncHandler(async (req, res) => {
    const eventId = parseInt(req.params.eventId);
    const coverage = await EvaluationsService.getEventEvalCoverage(eventId);
    return success(res, coverage);
  }),

  // POST /api/evaluations/event/:eventId/close  (ADMIN only)
  closeEvaluations: asyncHandler(async (req, res) => {
    const eventId = parseInt(req.params.eventId);
    const result = await EvaluationsService.closeEventEvaluations(eventId);
    return success(res, { message: "Evaluations closed successfully.", ...result });
  }),

  // POST /api/evaluations/event/:eventId/reopen  (ADMIN only)
  reopenEvaluations: asyncHandler(async (req, res) => {
    const eventId = parseInt(req.params.eventId);
    const result = await EvaluationsService.reopenEventEvaluations(eventId);
    return success(res, { message: "Evaluations reopened successfully.", ...result });
  }),

  // GET /api/evaluations/project/:projectId/eval-status
  // Returns blocking status for the current TL (closed flag, area cap, already submitted).
  getProjectEvalStatus: asyncHandler(async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const evaluatorUserId = req.user.id_user;
    const evaluatorRole = req.user.role;
    const status = await EvaluationsService.getProjectEvalStatus(
        projectId,
        evaluatorUserId,
        evaluatorRole,
    );
    return success(res, status);
  }),
  // GET /api/evaluations/event/:eventId/team-eval-counts
  getTeamEvalCounts: asyncHandler(async (req, res) => {
    const eventId = parseInt(req.params.eventId);
    const counts = await EvaluationsService.getTeamEvalCounts(eventId);
    return success(res, counts);
  }),
};

export default EvaluationsController;
