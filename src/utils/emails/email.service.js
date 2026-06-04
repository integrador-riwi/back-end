import { Resend } from 'resend';

// Initialize Resend with the API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({ toEmail, toName, subject, html }) => {
    // Determine the sender address. If using Resend without a verified domain, 
    // it MUST be onboarding@resend.dev (for testing). 
    // In production with a verified domain, it should be your actual EMAIL_FROM.
    const fromAddress = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    
    // Resend requires the 'to' address. If using the testing domain (onboarding@resend.dev),
    // you can ONLY send emails to the email address associated with your Resend account.
    const { data, error } = await resend.emails.send({
        from: `TeamUp <${fromAddress}>`,
        to: [toEmail],
        subject: subject,
        html: html,
    });

    if (error) {
        console.error('❌ Error enviando correo con Resend:', error);
        // Throwing the error here will cause a 500 response in the controller
        throw new Error(`Resend Error: ${error.message}`);
    }

    console.log('✅ Correo enviado exitosamente con Resend:', data);
    return data;
};

export const sendBulkEmails = async (users) => {
    const results = [];

    for (const user of users) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
                <h1>Hola, ${user.name}! 👋</h1>
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
