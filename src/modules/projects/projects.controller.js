import ProjectsService from "./projects.service.js";
import { success, created } from "../../utils/response.js";
import { asyncHandler } from "../../middleware/errorHandler.js";

export const list = asyncHandler(async (req, res) => {
  const { search, page, limit } = req.query;
  const result = await ProjectsService.listProjects({ search, page, limit });
  return success(res, result);
});

// Semantic search over project descriptions using vector similarity (min 0.3).
// Query params: q (required), eventId (optional), limit (optional)
export const semanticSearch = asyncHandler(async (req, res) => {
  const { q, limit, eventId } = req.query;
  const results = await ProjectsService.searchProjectsSemantic(
      q,
      limit ? parseInt(limit) : 20,
      eventId ? parseInt(eventId) : null,
  );
  return success(res, results);
});

export const get = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id_user;
  const userRole = req.user.role;
  const project = await ProjectsService.getProjectById(id, userId, userRole);
  return success(res, project);
});

export const getByTeam = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id_user;
  const userRole = req.user.role;
  const project = await ProjectsService.getProjectByTeamId(id, userId, userRole);
  return success(res, project);
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, repoUrl } = req.body;
  const userId = req.user.id_user;
  const userRole = req.user.role;
  const project = await ProjectsService.updateProject(
      id,
      { name, description, repoUrl },
      userId,
      userRole,
  );
  return success(res, project);
});

export const updateDeliverables = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { videoUrl, presentationUrl, previewPhotoUrl, deployUrl } = req.body;
  const userId = req.user.id_user;
  const userRole = req.user.role;
  const project = await ProjectsService.updateDeliverables(
      id,
      { videoUrl, presentationUrl, previewPhotoUrl, deployUrl },
      userId,
      userRole,
  );
  return success(res, project);
});

export const create = asyncHandler(async (req, res) => {
  const { teamId, name, description } = req.body;
  const userId = req.user.id_user;
  const userRole = req.user.role;
  const project = await ProjectsService.createProject(
      teamId,
      { name, description },
      userId,
      userRole,
  );
  return created(res, project);
});

export const confirmTeam = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const userId = req.user.id_user;
  const userRole = req.user.role;
  const project = await ProjectsService.confirmTeamProject(
      id,
      { name, description },
      userId,
      userRole,
  );
  return created(res, project);
});

export const submitProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id_user;
  const userRole = req.user.role;
  const project = await ProjectsService.submitProject(id, userId, userRole);
  return success(res, project);
});


// POST /api/projects/embeddings/backfill
// Generates embeddings for all projects that don't have one yet. Admin only.
export const backfillEmbeddings = asyncHandler(async (req, res) => {
  const result = await ProjectsService.backfillEmbeddings(req.user.role);
  return success(res, result);
});

export default {
  list,
  semanticSearch,
  get,
  getByTeam,
  update,
  updateDeliverables,
  submitProject,
  create,
  confirmTeam,
  backfillEmbeddings,
};
