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
};

export default EvaluationsController;
