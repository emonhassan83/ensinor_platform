import emailSender from '../emailSender';

export const sendEmployeeInvitationEmail = async (
  email: string,
  name: string,
  password: string,
  companyName: string,
  inviterName: string,
) => {
  await emailSender(
    email,
    `🎉 Congratulations! Welcome to ${name}`,
    `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
         <h2 style="color: #333;">Welcome aboard, ${name}!</h2>
          <p style="color: #555; line-height: 1.6;">
            You have been officially invited to join <strong>${companyName}</strong> by 
            <strong>${inviterName}</strong>. We’re excited to have you with us!
          </p>

          <div style="margin: 20px 0; padding: 15px; background: #f2f2f2; border-radius: 6px;">
            <p style="margin: 5px 0; color: #333;"><strong>Login Email:</strong> ${email}</p>
            <p style="margin: 5px 0; color: #333;"><strong>Temporary Password:</strong> ${password}</p>
          </div>

          <p style="color: #555; line-height: 1.6;">
            Please log in with these credentials and update your password immediately 
            to secure your account.
          </p>

          <p style="margin-top: 30px; color: #777; font-size: 13px; border-top: 1px solid #eee; padding-top: 15px;">
            This is an automated message. If you have any questions, please reach out to your company administrator.
          </p>
           <p>Ensinor Team</p>
      </div>
    `,
  );
};
