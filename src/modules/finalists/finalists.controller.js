import * as FinalistsService from './finalists.service.js';

export const calculateFinalists = async (req, res, next) => {
  try {
    const result = await FinalistsService.calculateAndSaveFinalists(
        req.params.eventId,
        req.user.role,
    );
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getFinalists = async (req, res, next) => {
  try {
    const result = await FinalistsService.getFinalists(req.params.eventId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const autoSelectFinalists = async (req, res, next) => {
  try {
    const { count } = req.query;
    const result = await FinalistsService.selectTopProjectsAsFinalists(
        req.params.eventId,
        count ? parseInt(count) : 3,
        req.user.role,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const setFinalists = async (req, res, next) => {
  try {
    const { projectIds } = req.body;
    if (!projectIds || !Array.isArray(projectIds)) {
      return res.status(400).json({
        success: false,
        error: 'Must provide an array of projectIds',
      });
    }
    const result = await FinalistsService.setFinalistsManually(
        req.params.eventId,
        projectIds,
        req.user.role,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export default {
  calculateFinalists,
  getFinalists,
  autoSelectFinalists,
  setFinalists,
};
