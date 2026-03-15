import pool from "../../db/pool.js";
import ProjectsRepository from "./projects.repository.js";
import TeamsRepository from "../teams/teams.repository.js";
import n8nService from "../../integrations/n8n.service.js";
import { searchProjectByDescription } from "../../integrations/Google AI/searchService.js";
import { generarEmbedding } from "../../integrations/Google AI/embeddingService.js";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from "../../middleware/errorHandler.js";

const SEMANTIC_SIMILARITY_THRESHOLD = 0.3;

export const listProjects = async (query) => {
  const { search, page, limit } = query;

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;

  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    throw new ValidationError("Parámetros de paginación inválidos");
  }

  return ProjectsRepository.findAll({ search, page: pageNum, limit: limitNum });
};

// Semantic search against project descriptions using vector similarity.
// Only returns projects with similarity >= SEMANTIC_SIMILARITY_THRESHOLD (0.15).
// Optionally filtered by eventId.
export const searchProjectsSemantic = async (query, limit = 20, eventId = null) => {
  if (!query || query.trim().length === 0) {
    throw new ValidationError("Search query cannot be empty");
  }
  return searchProjectByDescription(
      query.trim(),
      limit,
      SEMANTIC_SIMILARITY_THRESHOLD,
      null,
      eventId,
  );
};

export const getProjectById = async (id, userId, userRole) => {
  const project = await ProjectsRepository.findById(id);

  if (!project) {
    throw new NotFoundError("Proyecto no encontrado");
  }

  const isMember = await ProjectsRepository.isMemberOfTeam(id, userId);
  const isAdmin = userRole === "ADMIN";

  if (!isMember && !isAdmin) {
    throw new ForbiddenError("No tienes acceso a este proyecto");
  }

  return project;
};

export const getProjectByTeamId = async (teamId, userId, userRole) => {
  const project = await ProjectsRepository.findByTeamId(teamId);

  if (!project) {
    throw new NotFoundError("Proyecto no encontrado");
  }

  const isMember = await TeamsRepository.isMember(teamId, userId);
  const isAdmin = userRole === "ADMIN";

  if (!isMember && !isAdmin) {
    throw new ForbiddenError("No tienes acceso a este proyecto");
  }

  return project;
};

export const updateProject = async (id, data, userId, userRole) => {
  const project = await ProjectsRepository.findById(id);

  if (!project) {
    throw new NotFoundError("Proyecto no encontrado");
  }

  const isLeader = await ProjectsRepository.isLeaderOfTeamByProjectId(
      id,
      userId,
  );
  const isAdmin = userRole === "ADMIN";

  if (!isLeader && !isAdmin) {
    throw new ForbiddenError("No tienes permiso para editar este proyecto");
  }

  if (data.name !== undefined) {
    if (data.name.trim().length === 0) {
      throw new ValidationError("El nombre del proyecto no puede estar vacío");
    }
    if (data.name.length > 200) {
      throw new ValidationError(
          "El nombre del proyecto no puede exceder 200 caracteres",
      );
    }
  }

  const updatedProject = await ProjectsRepository.update(id, {
    name: data.name?.trim(),
    description: data.description?.trim(),
    repoUrl: data.repoUrl,
  });

  // Regenerate the embedding whenever the description changes.
  // Fire-and-forget: don't block the response if the embedding API fails.
  const descriptionChanged =
      data.description !== undefined &&
      data.description?.trim() !== project.description?.trim();

  if (descriptionChanged && updatedProject?.description) {
    const textToEmbed = `${updatedProject.name}. ${updatedProject.description}`;
    generarEmbedding(textToEmbed)
        .then((vector) => ProjectsRepository.updateEmbedding(id, vector))
        .catch((err) =>
            console.error(`[updateProject] Failed to update embedding for project ${id}:`, err.message),
        );
  }

  return updatedProject;
};

export const updateDeliverables = async (id, data, userId, userRole) => {
  const project = await ProjectsRepository.findById(id);

  if (!project) {
    throw new NotFoundError("Proyecto no encontrado");
  }

  if (project.submitted_at) {
    throw new ForbiddenError(
        "El proyecto ya fue entregado y no puede ser modificado",
    );
  }

  const isLeader = await ProjectsRepository.isLeaderOfTeamByProjectId(
      id,
      userId,
  );
  const isAdmin = userRole === "ADMIN";

  if (!isLeader && !isAdmin) {
    throw new ForbiddenError(
        "No tienes permiso para editar los entregables de este proyecto",
    );
  }

  if (data.videoUrl !== undefined) {
    if (data.videoUrl && !isValidUrl(data.videoUrl)) {
      throw new ValidationError("La URL del video no es válida");
    }
  }

  if (data.presentationUrl !== undefined) {
    if (data.presentationUrl && !isValidUrl(data.presentationUrl)) {
      throw new ValidationError("La URL de la presentación no es válida");
    }
  }

  if (data.deployUrl !== undefined) {
    if (data.deployUrl && !isValidUrl(data.deployUrl)) {
      throw new ValidationError("La URL del deploy no es válida");
    }
  }

  const updatedProject = await ProjectsRepository.updateDeliverables(id, {
    videoUrl: data.videoUrl,
    presentationUrl: data.presentationUrl,
    previewPhotoUrl: data.previewPhotoUrl,
    deployUrl: data.deployUrl,
  });

  return updatedProject;
};

export const submitProject = async (id, userId, userRole) => {
  const isAdmin = userRole === "ADMIN";

  const row = await ProjectsRepository.findByIdWithLeaderGithub(id, userId);

  if (!row) {
    throw new NotFoundError("Proyecto no encontrado");
  }

  const { project, isLeader, leaderGithub } = row;

  if (project.submitted_at) {
    throw new ConflictError("El proyecto ya fue entregado anteriormente");
  }

  if (!isLeader && !isAdmin) {
    throw new ForbiddenError(
        "Solo el líder del equipo puede entregar el proyecto",
    );
  }

  const missingFields = [];
  if (!project.video_url) missingFields.push("Pitch Video");
  if (!project.preview_photo_url) missingFields.push("Preview Photo");
  if (!project.repo_url) missingFields.push("Repository");
  if (!project.deploy_url) missingFields.push("Deploy Link");

  if (missingFields.length > 0) {
    throw new ValidationError(
        `Faltan los siguientes entregables: ${missingFields.join(", ")}`,
    );
  }

  const submitted = await ProjectsRepository.submitProject(id);

  try {
    if (leaderGithub?.github_token) {
      const repoName =
          project.repo_url?.split("/").filter(Boolean).pop() ?? null;

      let githubOrg = null;
      let orgToken = null;
      if (project.id_event) {
        try {
          const { findById: findEvent } =
              await import("../events/events.repository.js");
          const event = await findEvent(project.id_event);
          githubOrg = event?.github_org ?? null;
          orgToken = event?.github_org_token ?? null;
        } catch (_) {}
      }

      await n8nService.triggerProjectSubmitted(
          {
            id: project.id_project,
            repoName,
            repoUrl: project.repo_url,
            githubOrg,
            orgToken,
          },
          {
            githubUsername: leaderGithub.github_username,
            githubToken: orgToken ?? leaderGithub.github_token,
          },
      );
    } else {
      console.warn(
          `[submitProject] Leader ${userId} has no github_token — skipping repo visibility automation`,
      );
    }
  } catch (err) {
    console.error("[submitProject] n8n trigger failed:", err.message);
  }

  return submitted;
};

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

export const createProject = async (teamId, data, userId, userRole) => {
  const isLeader = await TeamsRepository.isLeader(teamId, userId);
  const isAdmin = userRole === "ADMIN";

  if (!isLeader && !isAdmin) {
    throw new ForbiddenError("Solo el líder puede crear el proyecto");
  }

  if (!data.name || data.name.trim().length === 0) {
    throw new ValidationError("El nombre del proyecto es requerido");
  }

  if (data.name.length > 200) {
    throw new ValidationError(
        "El nombre del proyecto no puede exceder 200 caracteres",
    );
  }

  const leaderWithGithub = await TeamsRepository.getMemberWithGithub(userId);

  if (!leaderWithGithub || !leaderWithGithub.github_username) {
    throw new ValidationError(
        "Debes tener GitHub conectado para crear un proyecto",
    );
  }

  if (!leaderWithGithub.github_token) {
    throw new ValidationError(
        "Tu token de GitHub no está disponible. Por favor, reconnécta tu cuenta.",
    );
  }

  const team = await TeamsRepository.findById(teamId);
  if (!team) throw new NotFoundError("Equipo no encontrado");

  const project = await ProjectsRepository.create(teamId, {
    name: data.name.trim(),
    description: data.description?.trim() || "",
    idEvent: team.id_event ?? null,
  });

  // Generate embedding for the new project description (fire-and-forget).
  if (project.description) {
    const textToEmbed = `${project.name}. ${project.description}`;
    generarEmbedding(textToEmbed)
        .then((vector) => ProjectsRepository.updateEmbedding(project.id_project, vector))
        .catch((err) =>
            console.error(`[createProject] Failed to generate embedding for project ${project.id_project}:`, err.message),
        );
  }

  const repoName = `project-${data.name.toLowerCase().replace(/\s+/g, "-")}`;
  const repoUrl = `https://github.com/riwi-proyects-integrations/${repoName}`;

  try {
    await n8nService.triggerProjectCreated(
        {
          id: project.id_project,
          name: data.name.trim(),
        },
        {
          githubUsername: leaderWithGithub.github_username,
          githubToken: leaderWithGithub.github_token,
        },
    );

    await ProjectsRepository.update(project.id_project, {
      name: null,
      description: null,
      repoUrl,
    });
    project.repo_url = repoUrl;

    return project;
  } catch (error) {
    console.error("Error triggering n8n:", error.message);
    return project;
  }
};

export const confirmTeamProject = async (teamId, data, userId, userRole) => {
  return createProject(teamId, data, userId, userRole);
};

export default {
  listProjects,
  searchProjectsSemantic,
  getProjectById,
  getProjectByTeamId,
  updateProject,
  updateDeliverables,
  submitProject,
  createProject,
  confirmTeamProject,
};

// Generates embeddings for all projects that don't have one yet.
// Returns a summary of how many were processed and how many failed.
export const backfillEmbeddings = async (requestingRole) => {
  if (requestingRole !== "ADMIN") {
    throw new ForbiddenError("Only admins can trigger embedding backfill");
  }

  const { rows } = await pool.query(
      `SELECT id_project, name, description
       FROM projects
       WHERE embedding IS NULL AND description IS NOT NULL AND description != ''`,
  );

  if (rows.length === 0) {
    return { processed: 0, failed: 0, message: "All projects already have embeddings" };
  }

  let processed = 0;
  let failed = 0;

  for (const project of rows) {
    try {
      const text = `${project.name}. ${project.description}`;
      const vector = await generarEmbedding(text);
      await ProjectsRepository.updateEmbedding(project.id_project, vector);
      processed++;
      // Small pause to avoid hitting OpenAI rate limits
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      console.error(`[backfillEmbeddings] Failed for project ${project.id_project}:`, err.message);
      failed++;
    }
  }

  return {
    processed,
    failed,
    total: rows.length,
    message: `Embeddings generated: ${processed}/${rows.length}`,
  };
};
