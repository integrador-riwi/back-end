import * as RankingService from "./ranking.service.js";

// GET /api/events/:eventId/ranking/status
export const getRankingStatus = async (req, res, next) => {
  try {
    const status = await RankingService.getRankingStatus(req.params.eventId);
    res.json({ success: true, data: status });
  } catch (err) {
    next(err);
  }
};

// POST /api/events/:eventId/ranking/publish — admin only, calculates + returns ranking
export const publishRanking = async (req, res, next) => {
  try {
    const result = await RankingService.publishRanking(
      req.params.eventId,
      req.user.role,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// GET /api/events/:eventId/ranking — read published ranking (no recalc)
export const getRanking = async (req, res, next) => {
  try {
    const result = await RankingService.getPublishedRanking(req.params.eventId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export default { getRankingStatus, publishRanking, getRanking };
