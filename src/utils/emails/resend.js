const { Resend } = require('resend');
import dotenv from 'dotenv';

const resend = new Resend(process.env.RESEND_API_KEY);

// Email individual personalizado
const sendEmail = async ({ to, subject, html }) => {
    const { data, error } = await resend.emails.send({
        from: 'Tu App <noreply@tudominio.com>',
        to,
        subject,
        html,
    });

    if (error) throw new Error(error.message);
    return data;
};

// Emails masivos a múltiples usuarios (desde tu BD Postgres)
const sendBulkEmails = async (users) => {
    const results = [];

    for (const user of users) {
        const html = `
      <h1>Hola, ${user.nombre}!</h1>
      <p>Este es un mensaje personalizado para ti.</p>
    `;

        try {
            const result = await sendEmail({
                to: user.email,
                subject: `Hola ${user.nombre}, tenemos novedades`,
                html,
            });
            results.push({ email: user.email, success: true, id: result.id });
        } catch (err) {
            results.push({ email: user.email, success: false, error: err.message });
        }
    }

    return results;
};

module.exports = { sendEmail, sendBulkEmails };
