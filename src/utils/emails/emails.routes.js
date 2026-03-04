import { Router } from 'express';
import { sendEmail, sendBulkEmails } from './email.service.js';
import pool from '../../db/pool.js'; // tu conexión a Postgres

const router = Router();

// POST /api/emails/send
router.post('/send', async (req, res) => {
    const { toEmail, toName, subject, html } = req.body;
    try {
        const info = await sendEmail({ toEmail, toName, subject, html });
        res.json({ success: true, messageId: info.messageId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/emails/broadcast
router.post('/broadcast', async (req, res) => {
    try {
        const { rows: users } = await pool.query(
            'SELECT name, email FROM users WHERE is_active = true'
        );

        const results = await sendBulkEmails(users);
        const exitosos = results.filter(r => r.success).length;

        res.json({
            message: 'Proceso completado',
            total: users.length,
            exitosos,
            fallidos: users.length - exitosos,
            detalle: results,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
