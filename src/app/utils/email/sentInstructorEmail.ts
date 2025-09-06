import emailSender from '../emailSender';

export const sendInstructorRequestEmail = async (
  email: string,
  name: string,
  password: string,
) => {
  await emailSender(
    email,
    'Instructor Account Request Submitted',
    `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #333;">Welcome Aboard, ${name}!</h2>
         <p>Thank you for submitting your instructor request on our platform.</p>

      <p>Your account has been created and is currently <strong>under review by the super admin</strong>. Once your profile is approved, you will receive another email with full access.</p>

      <h3>Your Login Details</h3>
      <ul>
        <li>Email: <strong>${email}</strong></li>
        <li>Password: <strong>${password}</strong></li>
      </ul>

      <p>Please keep your login credentials safe and do not share them with anyone.</p>

      <p>We appreciate your patience while we review your account. Thank you for joining our platform!</p>
        <p style="color: #555;">Cheers,<br/>Ensinor Team</p>
      </div>
    `,
  );
};
