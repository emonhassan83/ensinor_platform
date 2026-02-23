import { sendEmail } from '../sendEmail';

export const sendUserActiveEmail = async (email: string, name: string) => {
  await sendEmail({
    to: email,
    subject: '🎉 Congratulations! Your Account Has Been Active',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background: #ffffff;">
          <h2 style="color: #333; margin-bottom: 16px;">Congratulations, ${name}!</h2>
          <p style="font-size: 15px; color: #444; line-height: 1.6;">
            Your account has been <strong>approved</strong> and is now active.  
            You can log in and start using all features right away.
          </p>
          <p style="margin-top: 20px;">
            <a href="https://ensinor-dashboard-arkan.vercel.app/sign-in" 
               style="display: inline-block; padding: 10px 20px; 
                      background: #e0e0e0; color: #000; text-decoration: none; 
                      border-radius: 4px; font-size: 14px;">
              Go to Dashboard
            </a>
          </p>
          <p style="margin-top: 30px; font-size: 13px; color: #666;">
            Thanks for joining us,<br/>
            — The Ensinor Team
          </p>
      </div>
    `,
    text: 'Your Account Has Been Active',
  });
};

export const sendUserDeniedEmail = async (email: string, name: string) => {
  await sendEmail({
    to: email,
    subject: '📢 Invitation: Your Business Instructor Account is Ready',
    html: `
      < style="font-family: Arial, sans-serif; padding: 20px; background: #ffffff;">
          <h2 style="color: #333; margin-bottom: 16px;">Hello ${name},</h2>
          <p style="font-size: 15px; color: #444; line-height: 1.6;">
            After reviewing your request, we regret to inform you that your account has been <strong>denied</strong>.
          </p>
          <p style="font-size: 15px; color: #444; line-height: 1.6;">
            You can reapply in the future or 
            <a href="mailto:support@your-app.com" style="color: #333; text-decoration: underline;">contact support</a> 
            if you believe this was a mistake.
          </p>
          <p style="margin-top: 30px; font-size: 13px; color: #666;">
            We appreciate your interest,<br/>
            — The Ensinor Team
          </p>
    </div>
    `,
    text: 'Your Business Instructor Account is Ready',
  });
};
