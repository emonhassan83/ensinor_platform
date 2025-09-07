import emailSender from "../emailSender";

export const sendStudentInvitationEmail = async (
  email: string,
  name: string,
  password: string,
) => {
  await emailSender(
    email,
    'Student Account Invitation Submitted',
    `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #333;">Welcome Aboard, ${name}!</h2>
        <p>You have been invited by our <strong>Super Admin</strong> to join the Ensinor platform as an Student.</p>

        <p>Your account has been created successfully. Please use the credentials below to log in:</p>
        <ul>
          <li>Email: <strong>${email}</strong></li>
          <li>Password: <strong>${password}</strong></li>
        </ul>

        <p>Once you log in, you will be able to complete your profile and begin your journey with us.</p>

        <p>Welcome aboard!<br/>— Ensinor Team</p>
      </div>
    `,
  );
};
