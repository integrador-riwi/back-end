import { Resend } from 'resend';

// Initialize Resend with the API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({ toEmail, toName, subject, html }) => {
    const fromAddress = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    const apiKeySet = !!process.env.RESEND_API_KEY;

    console.log(`[Resend] Attempting to send email:
  - From: ${fromAddress}
  - To: ${toEmail}
  - Subject: ${subject}
  - API Key set: ${apiKeySet}`);

    const { data, error } = await resend.emails.send({
        from: `TeamUp <${fromAddress}>`,
        to: [toEmail],
        subject: subject,
        html: html,
    });

    if (error) {
        console.error('[Resend] Error response:', JSON.stringify(error, null, 2));
        throw new Error(`Resend Error: ${error.message}`);
    }

    console.log('[Resend] Email sent successfully. Response:', JSON.stringify(data, null, 2));
    return data;
};

export const sendBulkEmails = async (users) => {
    const results = [];

    for (const user of users) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
                <h1>Hola, ${user.name}! </h1>
                <p>Estas son tus credenciales para TeamUp.</p>
                <hr>
                <p>Correo: ${user.email}</p>
                <p>Contraseña: Riwi123!</p>
                <a href="https://team-up.crudzaso.com"
                style="background:#4F46E5; 
                    color:white; padding:10px 20px;
                    text-decoration:none; 
                    border-radius:5px;">
                    Visitar la TeamUp
                </a>
            </div>
        `;

        try {
            const info = await sendEmail({
                toEmail: user.email,
                toName: user.name,
                subject: `Hola ${user.name}, tenemos novedades`,
                html,
            });
            results.push({ email: user.email, success: true, messageId: info.id });
        } catch (err) {
            results.push({ email: user.email, success: false, error: err.message });
        }

        // Resend API rate limits are generally higher, but keeping a small delay is safe
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    return results;
};
