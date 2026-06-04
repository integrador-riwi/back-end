/**
 * Branded HTML email template for password reset.
 * Uses inline styles for maximum email client compatibility.
 *
 * @param {string} userName   - Recipient's first name
 * @param {string} resetLink  - Full URL with the reset token
 * @returns {string}          - HTML string
 */
export const buildPasswordResetEmail = (userName, resetLink) => {
  const firstName = userName?.split(" ")[0] || "Coder";
  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Restablecer contraseña – TeamUp</title>
</head>
<body style="margin:0;padding:0;background-color:#0f1117;font-family:'Segoe UI',Arial,sans-serif;">

  <!-- Wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px;width:100%;border-radius:20px;overflow:hidden;
                      background:linear-gradient(160deg,#1a1f35 0%,#12162a 100%);
                      border:1px solid rgba(107,92,255,0.25);">

          <!-- ── HEADER ── -->
          <tr>
            <td style="padding:0;background:linear-gradient(135deg,#1e2040 0%,#0f1117 100%);
                       border-bottom:1px solid rgba(107,92,255,0.2);">
              <!-- Accent bar -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height:4px;background:linear-gradient(90deg,#6b5cff,#eaa2fc,#5acca4,#fe654f,#e6ca52);"></td>
                </tr>
              </table>
              <!-- Logo area -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:32px 40px 24px;">
                    <div style="display:inline-block;background:rgba(107,92,255,0.15);
                                border:1px solid rgba(107,92,255,0.35);
                                border-radius:14px;padding:12px 28px;">
                      <span style="font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#ffffff;">
                        Team<span style="color:#6b5cff;">Up</span>
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── BODY ── -->
          <tr>
            <td style="padding:40px 48px 32px;">

              <!-- Icon -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <div style="width:72px;height:72px;border-radius:50%;
                                background:rgba(107,92,255,0.12);border:2px solid rgba(107,92,255,0.4);
                                display:inline-flex;align-items:center;justify-content:center;
                                font-size:32px;line-height:72px;text-align:center;">
                      🔐
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Greeting -->
              <p style="margin:0 0 8px;font-size:13px;font-weight:700;
                         text-transform:uppercase;letter-spacing:0.08em;color:#6b5cff;">
                Seguridad de cuenta
              </p>
              <h1 style="margin:0 0 16px;font-size:26px;font-weight:800;
                          color:#ffffff;letter-spacing:-0.3px;line-height:1.3;">
                Hola, ${firstName} 👋
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:rgba(255,255,255,0.7);line-height:1.7;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta en
                <strong style="color:#ffffff;">TeamUp</strong>. Haz clic en el botón de abajo para crear una nueva contraseña.
              </p>

              <!-- Warning box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:rgba(230,202,82,0.1);border:1px solid rgba(230,202,82,0.3);
                              border-radius:12px;padding:14px 18px;">
                    <p style="margin:0;font-size:13px;color:#e6ca52;line-height:1.6;">
                      ⏱️ <strong>Este enlace expira en 15 minutos.</strong>
                      Si no solicitaste este cambio, puedes ignorar este correo con seguridad.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <a href="${resetLink}"
                       style="display:inline-block;background:linear-gradient(135deg,#6b5cff,#8a7bff);
                              color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;
                              padding:16px 40px;border-radius:12px;
                              box-shadow:0 8px 24px rgba(107,92,255,0.4);
                              letter-spacing:0.02em;">
                      Restablecer mi contraseña →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- URL fallback -->
              <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.4);">
                Si el botón no funciona, copia y pega esta URL en tu navegador:
              </p>
              <p style="margin:0;font-size:11px;word-break:break-all;
                         color:rgba(107,92,255,0.8);">
                ${resetLink}
              </p>

            </td>
          </tr>

          <!-- ── DIVIDER ── -->
          <tr>
            <td style="padding:0 48px;">
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0;" />
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="padding:24px 48px 32px;">
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.3);line-height:1.7;text-align:center;">
                Este correo fue enviado de forma automática. Por favor no respondas a este mensaje.<br />
                © ${year} TeamUp · Todos los derechos reservados.
              </p>
            </td>
          </tr>

          <!-- Bottom accent bar -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,#6b5cff,#eaa2fc,#5acca4);">
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();
};
