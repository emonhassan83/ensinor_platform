import * as bcrypt from 'bcrypt';
import config from '../../config';
import emailSender from '../../utils/emailSender';

export const hashedPassword = async (password: string): Promise<string> => {
    try {
        const hashedPassword: string = await bcrypt.hash(password, Number(config.bcrypt_salt_rounds));
        return hashedPassword;
    } catch (error) {
        throw new Error('Error hashing password');
    }
}

export const sendCompanyApprovalApprovalEmail = async (email: string, name: string, password: string) => {
  await emailSender(
    email,
    "🎉 Congratulations! Your Company Admin Account is Approved",
    `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #333;">Welcome Aboard, ${name}!</h2>
        <p style="color: #555;">Your company admin profile has been <strong>approved</strong>.</p>
        <p style="color: #555;">Here are your login credentials:</p>
        <div style="background:#f4f4f4;padding:15px;border-radius:5px;margin:15px 0;">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> ${password}</p>
        </div>
        <p style="color:#555;">Please change your password after first login for security purposes.</p>
        <p style="color: #555;">Cheers,<br/>Ensinor Team</p>
      </div>
    `
  );
};

export const sendBusinessInstructorInvitationEmail = async (email: string, name: string, password: string) => {
await emailSender(
    email,
    "📢 Invitation: Your Business Instructor Account is Ready",
    `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #333;">Hello ${name}, Welcome to Ensinor! 🎓</h2>
        
        <p style="color: #555;">
          You’ve been invited to join as a <strong>Business Instructor</strong> on the Ensinor platform.  
          This role empowers you to <strong>train, guide, and mentor professionals</strong> within your company.
        </p>

        <p style="color: #555;">Here are your login credentials:</p>
        <div style="background:#f4f4f4;padding:15px;border-radius:5px;margin:15px 0;">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> ${password}</p>
        </div>

        <p style="color:#555;">
          👉 Please log in using the credentials above. For security, we highly recommend changing your password after your first login.
        </p>

        <p style="color:#555;">
          We’re excited to have you onboard and can’t wait to see the impact you’ll make as a Business Instructor.
        </p>

        <p style="color: #555;">Best regards,<br/>Ensinor Team</p>
      </div>
    `
  );
};
