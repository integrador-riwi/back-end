import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true para puerto 465
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

transporter.verify((error) => {
    if (error) console.error('Error de conexión SMTP:', error);
    else console.log('✅ Servidor de email listo');
});

export const sendEmail = async ({ toEmail, toName, subject, html }) => {
    const mailOptions = {
        from: `"TeamUp" <${process.env.EMAIL_FROM}>`,
        to: toEmail,
        subject,
        html,
    };

    return await transporter.sendMail(mailOptions);
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
            results.push({ email: user.email, success: true, messageId: info.messageId });
        } catch (err) {
            results.push({ email: user.email, success: false, error: err.message });
        }

        await new Promise(resolve => setTimeout(resolve, 300));
    }

    return results;
};
