import * as EventsRepository from "./events.repository.js";
import {
  NotFoundError,
  ValidationError,
} from "../../middleware/errorHandler.js";

export const getAllEvents = async ({ status, search, page, limit }) => {
  return await EventsRepository.findAll({ status, search, page, limit });
};

export const getEventById = async (id) => {
  const event = await EventsRepository.findById(id);
  if (!event) {
    throw new NotFoundError("Evento no encontrado");
  }
  return event;
};

export const getActiveEvents = async () => {
  return await EventsRepository.findActive();
};

export const getUpcomingEvents = async (limit) => {
  return await EventsRepository.findUpcoming(limit);
};

export const getPastEvents = async (limit) => {
  return await EventsRepository.findPast(limit);
};

export const createEvent = async (eventData) => {
  if (!eventData.title || !eventData.eventDate) {
    throw new ValidationError(
      "El título y la fecha del evento son obligatorios",
    );
  }

  return await EventsRepository.create({
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
};

export const updateEvent = async (id, eventData) => {
  const existingEvent = await EventsRepository.findById(id);
  if (!existingEvent) {
    throw new NotFoundError("Evento no encontrado");
  }

  return await EventsRepository.update(id, {
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
  if (!existingEvent) {
    throw new NotFoundError("Evento no encontrado");
  }

  return await EventsRepository.remove(id);
};

export const getEventStats = async () => {
  const total = await EventsRepository.count({});
  const upcoming = await EventsRepository.count({ status: "UPCOMING" });
  const completed = await EventsRepository.count({ status: "COMPLETED" });
  const inProgress = await EventsRepository.count({ status: "IN_PROGRESS" });

  return {
    total,
    upcoming,
    completed,
    inProgress,
  };
};

export default {
  getAllEvents,
  getEventById,
  getUpcomingEvents,
  getPastEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventStats,
};
