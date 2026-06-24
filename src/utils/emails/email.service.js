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
export const sendWelcomeEmails = async (users) => {
    const results = [];

    for (const user of users) {
        const html = `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e8ebf2; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
                <div style="background-color: #6b5cff; padding: 24px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">¡Bienvenido a TeamUp!</h1>
                </div>
                
                <div style="padding: 32px 24px; color: #1a1e35;">
                    <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">Hola <strong>${user.name}</strong>, 👋</p>
                    <p style="font-size: 16px; line-height: 1.6;">Estas son tus credenciales oficiales para ingresar a la plataforma de TeamUp:</p>
                    
                    <div style="background-color: #f4f6f9; border-radius: 8px; padding: 16px; margin: 24px 0; border-left: 4px solid #eaa2fc;">
                        <p style="margin: 0 0 8px 0;"><strong>Correo:</strong> ${user.email}</p>
                        <p style="margin: 0;"><strong>Contraseña:</strong> Tu número de documento</p>
                    </div>

                    <h2 style="font-size: 18px; color: #6b5cff; margin-top: 32px; border-bottom: 2px solid #f4f6f9; padding-bottom: 8px;">Pasos a seguir:</h2>
                    
                    <ol style="font-size: 15px; line-height: 1.6; padding-left: 20px; color: #6b7a99;">
                        <li style="margin-bottom: 12px;"><strong>Inicia sesión:</strong> Ingresa a TeamUp con tus credenciales y cambia tu contraseña por seguridad.</li>
                        <li style="margin-bottom: 12px;"><strong>Conecta tu GitHub:</strong> Dirígete a tu <span style="color: #6b5cff; font-weight: 600;">Perfil</span> y haz clic en el botón para vincular tu cuenta de GitHub. Esto es obligatorio.</li>
                        <li style="margin-bottom: 12px;"><strong>Evento Proyecto Integrador Ruta Avanzada Cohorte 6:</strong>
                            <ul style="padding-left: 16px; margin-top: 8px;">
                                <li style="margin-bottom: 6px;">El líder debe crear el equipo con su descripción. Esto creará <strong style="color: #5acca4;">inmediatamente</strong> el repositorio oficial en la organización de Riwi.</li>
                                <li style="margin-bottom: 6px;">Los demás integrantes deben solicitar unirse al equipo creado por el líder. Al ser aceptados, quedarán automáticamente como colaboradores en el repositorio.</li>
                            </ul>
                        </li>
                    </ol>

                    <div style="text-align: center; margin-top: 40px;">
                        <a href="https://team-up.crudzaso.com"
                           style="background-color: #6b5cff; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 30px; font-weight: 600; display: inline-block; box-shadow: 0 4px 12px rgba(107, 92, 255, 0.2);">
                            Ir a TeamUp
                        </a>
                    </div>
                </div>
                
                <div style="background-color: #f4f6f9; padding: 16px; text-align: center; border-top: 1px solid #e8ebf2;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3b8;">
                        © ${new Date().getFullYear()} TeamUp. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        `;

        try {
            const info = await sendEmail({
                toEmail: user.email,
                toName: user.name,
                subject: 'Tus credenciales y pasos para iniciar en TeamUp 🚀',
                html,
            });
            results.push({ email: user.email, success: true, messageId: info.id });
        } catch (err) {
            results.push({ email: user.email, success: false, error: err.message });
        }

        await new Promise(resolve => setTimeout(resolve, 300));
    }

    return results;
};
