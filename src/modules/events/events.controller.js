import * as EventsService from './events.service.js';
import { success, created } from '../../utils/response.js';

export const list = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    
    const result = await EventsService.getAllEvents({
      status,
      search,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const get = async (req, res, next) => {
  try {
    const { id } = req.params;
    const event = await EventsService.getEventById(id);
    res.json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
};

export const getUpcoming = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const events = await EventsService.getUpcomingEvents(parseInt(limit));
    res.json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
};

export const getPast = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const events = await EventsService.getPastEvents(parseInt(limit));
    res.json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const eventData = req.body;
    const event = await EventsService.createEvent(eventData);
    res.status(201).json({ success: true, data: event, message: 'Evento creado exitosamente' });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const eventData = req.body;
    const event = await EventsService.updateEvent(id, eventData);
    res.json({ success: true, data: event, message: 'Evento actualizado exitosamente' });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await EventsService.deleteEvent(id);
    res.json({ success: true, data: null, message: 'Evento eliminado exitosamente' });
  } catch (error) {
    next(error);
  }
};

export const getStats = async (req, res, next) => {
  try {
    const stats = await EventsService.getEventStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

export default {
  list,
  get,
  getUpcoming,
  getPast,
  create,
  update,
  remove,
  getStats
};
