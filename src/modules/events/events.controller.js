import * as EventsService from "./events.service.js";
import { success, created } from "../../utils/response.js";

export const list = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    const result = await EventsService.getAllEvents({
      status,
      search,
      page: parseInt(page),
      limit: parseInt(limit),
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const get = async (req, res, next) => {
  try {
    const event = await EventsService.getEventById(req.params.id);
    res.json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
};

export const getActive = async (req, res, next) => {
  try {
    const events = await EventsService.getActiveEvents();
    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
};

export const getUpcoming = async (req, res, next) => {
  try {
    const events = await EventsService.getUpcomingEvents(
      parseInt(req.query.limit ?? 10),
    );
    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
};

export const getPast = async (req, res, next) => {
  try {
    const events = await EventsService.getPastEvents(
      parseInt(req.query.limit ?? 10),
    );
    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const event = await EventsService.createEvent(req.body, req.user);
    res.status(201).json({
      success: true,
      data: event,
      message: "Evento creado exitosamente",
    });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const event = await EventsService.updateEvent(
      req.params.id,
      req.body,
      req.user,
    );
    res.json({
      success: true,
      data: event,
      message: "Evento actualizado exitosamente",
    });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    await EventsService.deleteEvent(req.params.id, req.user);
    res.json({
      success: true,
      data: null,
      message: "Evento eliminado exitosamente",
    });
  } catch (err) {
    next(err);
  }
};

export const getStats = async (req, res, next) => {
  try {
    const stats = await EventsService.getEventStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

// ── Rubric endpoints ──────────────────────────────────────────────────────────

// GET /api/events/:id/rubrics
export const getRubrics = async (req, res, next) => {
  try {
    const rubrics = await EventsService.getEventRubrics(req.params.id);
    res.json({ success: true, data: rubrics });
  } catch (err) {
    next(err);
  }
};

// POST /api/events/:id/rubrics  — add rubrics to an existing event
export const addRubrics = async (req, res, next) => {
  try {
    const { rubrics } = req.body;
    const saved = await EventsService.addRubrics(req.params.id, rubrics);
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

// PUT /api/events/:id/rubrics/:rubricId
export const updateRubric = async (req, res, next) => {
  try {
    const updated = await EventsService.updateRubric(
      req.params.id,
      req.params.rubricId,
      req.body,
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/events/:id/rubrics/:rubricId  — soft delete (active = false)
export const deleteRubric = async (req, res, next) => {
  try {
    await EventsService.deactivateRubric(req.params.id, req.params.rubricId);
    res.json({ success: true, data: null, message: "Rúbrica desactivada" });
  } catch (err) {
    next(err);
  }
};

export const getMetrics = async (req, res, next) => {
  try {
    const metrics = await EventsService.getEventMetrics(req.params.id);
    res.json({ success: true, data: metrics });
  } catch (err) {
    next(err);
  }
};

export default {
  list,
  get,
  getUpcoming,
  getPast,
  getActive,
  create,
  update,
  remove,
  getStats,
  getMetrics,
  getRubrics,
  addRubrics,
  updateRubric,
  deleteRubric,
};
