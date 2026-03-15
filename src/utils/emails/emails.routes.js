import { Router } from 'express';
import { sendEmail, sendBulkEmails } from './email.service.js';
import pool from '../../db/pool.js'; // tu conexión a Postgres

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Emails
 *   description: Endpoints para envío de correos electrónicos
 */

/**
 * @swagger
 * /api/emails/send:
 *   post:
 *     summary: Enviar un correo electrónico individual
 *     tags: [Emails]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               toEmail:
 *                 type: string
 *               toName:
 *                 type: string
 *               subject:
 *                 type: string
 *               html:
 *                 type: string
 *     responses:
 *       200:
 *         description: Correo enviado correctamente
 *       500:
 *         description: Error al enviar el correo
 */

/**
 * @swagger
 * /api/emails/broadcast:
 *   post:
 *     summary: Enviar un correo masivo a todos los usuarios activos
 *     tags: [Emails]
 *     responses:
 *       200:
 *         description: Correos enviados correctamente
 *       500:
 *         description: Error al enviar los correos
 */

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
    w
});

export default router;
