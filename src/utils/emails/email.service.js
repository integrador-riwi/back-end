import { google } from 'googleapis';

const OAuth2 = google.auth.OAuth2;

const createTransporter = async () => {
    const oauth2Client = new OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    return google.gmail({ version: 'v1', auth: oauth2Client });
};

// Convierte un string a Base64URL
const makeBody = (to, from, subject, message) => {
    const str = [
        `To: ${to}`,
        `From: TeamUp <${from}>`,
        `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        message,
    ].join('\n');

    return Buffer.from(str).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};

export const sendEmail = async ({ toEmail, toName, subject, html }) => {
    const gmail = await createTransporter();
    
    const rawMessage = makeBody(
        toEmail, 
        process.env.EMAIL_USER, 
        subject, 
        html
    );

    const { data } = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
            raw: rawMessage,
        },
    });

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

        await new Promise(resolve => setTimeout(resolve, 300));
    }

    return results;
};
