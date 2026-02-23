import { sendEmail } from '../sendEmail';

export const sendInstructorRequestEmail = async (
  email: string,
  name: string,
  password: string,
) => {
  await sendEmail({
    to: email,
    subject: 'Instructor Account Request Submitted',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #333;">Welcome Aboard, ${name}!</h2>
         <p>Thank you for submitting your instructor request on our platform.</p>

      <p>Your account has been created and is currently <strong>under review by the super admin</strong>. Once your profile is approved, you will receive another email with full access.</p>

       <p style="color: #555;">Here are your login credentials:</p>
        <div style="background:#f4f4f4;padding:15px;border-radius:5px;margin:15px 0;">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> ${password}</p>
        </div>

        <p style="color:#555;">
          👉 Please log in using the credentials above. For security, we highly recommend changing your password after your first login.
        </p>
        <p style="color:#555;">Once you log in, you will be able to complete your profile and begin your journey with us.</p>

        <p style="color: #555;">Cheers,<br/>Ensinor Team</p>
      </div>
    `,
    text: 'Instructor Account Request Submitted',
  });
};

export const sendInstructorInvitationEmail = async (
  email: string,
  name: string,
  password: string,
) => {
  await sendEmail({
    to: email,
    subject: 'Instructor Account Invitation Submitted',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #333;">Welcome Aboard, ${name}!</h2>
        <p>You have been invited by our <strong>Super Admin</strong> to join the Ensinor platform as an Instructor.</p>

        <p style="color: #555;">Here are your login credentials:</p>
        <div style="background:#f4f4f4;padding:15px;border-radius:5px;margin:15px 0;">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> ${password}</p>
        </div>

        <p style="color:#555;">
          👉 Please log in using the credentials above. For security, we highly recommend changing your password after your first login.
        </p>
        <p style="color:#555;">Once you log in, you will be able to complete your profile and begin your journey with us.</p>

        <p>Welcome aboard!<br/>— Ensinor Team</p>
      </div>
    `,
    text: 'Instructor Account Invitation Submitted',
  });
};
