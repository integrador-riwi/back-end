import * as EventsRepository from "./events.repository.js";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../../middleware/errorHandler.js";

const VALID_AREAS = ["DEVELOPMENT", "SOFT_SKILLS", "ENGLISH"];

export const getAllEvents = async ({ status, search, page, limit }) => {
  return EventsRepository.findAll({ status, search, page, limit });
};

export const getEventById = async (id) => {
  const event = await EventsRepository.findById(id);
  if (!event) throw new NotFoundError("Evento no encontrado");
  return event;
};

export const getActiveEvents = async () => EventsRepository.findActive();

export const getUpcomingEvents = async (limit) =>
  EventsRepository.findUpcoming(limit);

export const getPastEvents = async (limit) => EventsRepository.findPast(limit);

export const createEvent = async (eventData) => {
  if (!eventData.title || !eventData.eventDate) {
    throw new ValidationError(
      "El título y la fecha del evento son obligatorios",
    );
  }

  // Validate rubrics if provided
  const rubrics = eventData.rubrics ?? [];
  _validateRubrics(rubrics);

  // 1. Create the event
  const event = await EventsRepository.create({
    title: eventData.title,
    description: eventData.description,
    eventDate: eventData.eventDate,
    endDate: eventData.endDate,
    status: eventData.status || "UPCOMING",
    eventType: eventData.eventType || "CAPSTONE",
    cohort: eventData.cohort,
    route: eventData.route,
    githubOrg: eventData.githubOrg ?? null,
    maxTeamSize: eventData.maxTeamSize ?? 5,
  });

  // 2. Create rubrics if any were provided
  let savedRubrics = [];
  if (rubrics.length > 0) {
    savedRubrics = await EventsRepository.createRubricsWithGrades(
      event.id,
      rubrics,
    );
  }

  return { ...event, rubrics: savedRubrics };
};

export const updateEvent = async (id, eventData) => {
  const existingEvent = await EventsRepository.findById(id);
  if (!existingEvent) throw new NotFoundError("Evento no encontrado");

  return EventsRepository.update(id, {
    title: eventData.title,
    description: eventData.description,
    eventDate: eventData.eventDate,
    endDate: eventData.endDate,
    status: eventData.status,
    eventType: eventData.eventType,
    cohort: eventData.cohort,
    route: eventData.route,
    githubOrg: eventData.githubOrg ?? null,
    maxTeamSize: eventData.maxTeamSize ?? null,
  });
};

export const deleteEvent = async (id) => {
  const existingEvent = await EventsRepository.findById(id);
  if (!existingEvent) throw new NotFoundError("Evento no encontrado");
  return EventsRepository.remove(id);
};

export const getEventStats = async () => {
  const [total, upcoming, completed, inProgress] = await Promise.all([
    EventsRepository.count({}),
    EventsRepository.count({ status: "UPCOMING" }),
    EventsRepository.count({ status: "COMPLETED" }),
    EventsRepository.count({ status: "IN_PROGRESS" }),
  ]);
  return { total, upcoming, completed, inProgress };
};

export const getEventMetrics = async (eventId) => {
  const event = await EventsRepository.findById(eventId);
  if (!event) throw new NotFoundError("Evento no encontrado");
  const metrics = await EventsRepository.getEventMetrics(eventId);
  return {
    eventId: parseInt(eventId),
    eventTitle: event.title,
    eventStatus: event.event_status,
    totalTeams: parseInt(metrics.total_teams ?? 0),
    totalProjects: parseInt(metrics.total_projects ?? 0),
    totalCoders: parseInt(metrics.total_coders ?? 0),
    totalVotes: parseInt(metrics.total_votes ?? 0),
    evaluatedProjects: parseInt(metrics.evaluated_projects ?? 0),
    activeAreas: parseInt(metrics.active_areas ?? 0),
  };
};

export const getEventRubrics = async (eventId) => {
  const event = await EventsRepository.findById(eventId);
  if (!event) throw new NotFoundError("Evento no encontrado");
  return EventsRepository.getRubricsForEvent(eventId);
};

export const addRubrics = async (eventId, rubrics) => {
  const event = await EventsRepository.findById(eventId);
  if (!event) throw new NotFoundError("Evento no encontrado");

  _validateRubrics(rubrics);

  return EventsRepository.createRubricsWithGrades(eventId, rubrics);
};

export const updateRubric = async (eventId, rubricId, data) => {
  const event = await EventsRepository.findById(eventId);
  if (!event) throw new NotFoundError("Evento no encontrado");

  const updated = await EventsRepository.updateRubric(rubricId, {
    name: data.name,
    description: data.description,
    weight: data.weight,
    active: data.active,
  });

  if (!updated) throw new NotFoundError("Rúbrica no encontrada");
  return updated;
};

export const deactivateRubric = async (eventId, rubricId) => {
  const event = await EventsRepository.findById(eventId);
  if (!event) throw new NotFoundError("Evento no encontrado");

  const result = await EventsRepository.deactivateRubric(rubricId);
  if (!result) throw new NotFoundError("Rúbrica no encontrada");
  return result;
};

function _validateRubrics(rubrics) {
  if (!Array.isArray(rubrics)) {
    throw new ValidationError("rubrics debe ser un arreglo");
  }

  for (const r of rubrics) {
    if (!r.area || !VALID_AREAS.includes(r.area)) {
      throw new ValidationError(
        `Área inválida "${r.area}". Debe ser: ${VALID_AREAS.join(", ")}`,
      );
    }
    if (!r.name || r.name.trim().length === 0) {
      throw new ValidationError("Cada rúbrica debe tener un nombre");
    }
    if (r.weight === undefined || r.weight === null || isNaN(r.weight)) {
      throw new ValidationError(
        `La rúbrica "${r.name}" debe tener un peso numérico`,
      );
    }
    if (r.weight <= 0 || r.weight > 1) {
      throw new ValidationError(
        `El peso de "${r.name}" debe estar entre 0 y 1 (ej: 0.4 = 40%)`,
      );
    }
    if (!Array.isArray(r.grades) || r.grades.length === 0) {
      throw new ValidationError(
        `La rúbrica "${r.name}" debe tener al menos una opción de calificación`,
      );
    }
    for (const g of r.grades) {
      if (g.score === undefined || g.score === null || isNaN(g.score)) {
        throw new ValidationError(
          `Todas las opciones de calificación de "${r.name}" deben tener un score numérico`,
        );
      }
    }
  }
}

export default {
  getAllEvents,
  getEventById,
  getUpcomingEvents,
  getPastEvents,
  getActiveEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventStats,
  getEventRubrics,
  addRubrics,
  updateRubric,
  deactivateRubric,
};
