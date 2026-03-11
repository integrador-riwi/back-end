import * as RankingService from "./ranking.service.js";

// GET /api/events/:id/ranking-status
export const getRankingStatus = async (req, res, next) => {
  try {
    const status = await RankingService.getRankingStatus(req.params.id);
    res.json({ success: true, data: status });
  } catch (err) {
    next(err);
  }
};

// POST /api/events/:id/publish-ranking  — admin only, calculates + returns ranking
export const publishRanking = async (req, res, next) => {
  try {
    const result = await RankingService.publishRanking(
      req.params.id,
      req.user.role,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// GET /api/events/:id/ranking  — read published ranking (no recalc)
export const getRanking = async (req, res, next) => {
  try {
    const result = await RankingService.getPublishedRanking(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export default { getRankingStatus, publishRanking, getRanking };
