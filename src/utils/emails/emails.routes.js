import { Router } from 'express';
import sendBulkEmails from './resend.js'
import pool from 'src/db/pool.js';

const router = Router();

// POST /api/emails/broadcast
router.post('/broadcast', async (req, res) => {
    try {
        // Obtener usuarios de tu base de datos
        const { rows: users } = await pool.query(
            'SELECT name, email FROM users WHERE is_active = true'
        );

        const results = await sendBulkEmails(users);

        res.json({
            message: 'Emails enviados',
            total: users.length,
            results,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
