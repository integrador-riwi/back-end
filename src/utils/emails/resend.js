import { Resend } from 'resend';
import dotenv from 'dotenv';

const resend = new Resend(process.env.RESEND_API_KEY);

// Email individual personalizado
export const sendEmail = async ({ to, subject, html }) => {
    const { data, error } = await resend.emails.send({
        from: 'Team Up <noreply@teamup.com>',
        to,
        subject,
        html,
    });

    if (error) throw new Error(error.message);
    return data;
};

// Emails masivos a múltiples usuarios (desde tu BD Postgres)
export const sendBulkEmails = async (users) => {
    const results = [];

    for (const user of users) {
        const html = `
            <h1>Hola, ${user.name}!</h1>
            <p>Esta será tu cuenta para TeamUp.</p>
            <p>Correo de acceso: ${user.email}</p>
            <p>Contraseña: Riwi123!</p>
        `;

        try {
            const result = await sendEmail({
                to: user.email,
                subject: `Hola ${user.name}, TeamUp tiene novedades para ti`,
                html,
            });
            results.push({ email: user.email, success: true, id: result.id });
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
            results.push({ email: user.email, success: false, error: err.message });
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    return results;
};

export default {
    sendEmail,
    sendBulkEmails
};
