import { Router } from "express";
import pool from "../../db/pool.js";
const router = Router();

router.get("/", (req, res) => {
  res.json({ message: "Users API" });
});

router.get("/test", async (req, res) => {
  const result = await pool.query("SELECT * FROM users LIMIT 10");
  res.json(result.rows);
});
export default router;
