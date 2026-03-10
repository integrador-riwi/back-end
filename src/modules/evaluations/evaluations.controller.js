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

  // GET /api/evaluations/event/:eventId/results
  // Returns persisted grade results for all projects in an event.
  getEventResults: asyncHandler(async (req, res) => {
    const eventId = parseInt(req.params.eventId);
    const results = await EvaluationsService.getEventResults(eventId);
    return success(res, results);
  }),
};

export default EvaluationsController;
