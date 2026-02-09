interface InvitationEmailProps {
  workspaceName: string;
  invitedByName: string;
  inviteUrl: string;
}

export function invitationEmailHtml({
  workspaceName,
  invitedByName,
  inviteUrl,
}: InvitationEmailProps): string {
  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 40px 20px; background: #f5f5f5;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; border: 1px solid #e5e5e5;">
          <h1 style="font-size: 20px; margin: 0 0 8px;">You've been invited to Jakoniko</h1>
          <p style="color: #737373; margin: 0 0 24px;">
            <strong>${invitedByName}</strong> invited you to join <strong>${workspaceName}</strong> on Jakoniko.
          </p>
          <a href="${inviteUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">
            Accept invitation
          </a>
          <p style="color: #a3a3a3; font-size: 13px; margin: 24px 0 0;">
            If you didn't expect this invitation, you can ignore this email.
          </p>
        </div>
      </body>
    </html>
  `;
}
