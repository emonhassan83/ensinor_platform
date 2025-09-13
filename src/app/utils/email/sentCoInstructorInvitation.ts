import emailSender from '../emailSender';

export const sendCoInstructorInvitationEmail = async (
  email: string,
  name: string,
  inviterName: string,
  courseTitle: string,
) => {
  await emailSender(
    email,
    'Invitation to Join as Co-Instructor',
    `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #333;">Hello ${name},</h2>
        <p>You have been invited by <strong>${inviterName}</strong> to join the course <strong>"${courseTitle}"</strong> as a Co-Instructor.</p>

        <p>As a Co-Instructor, you will get access based on the permissions assigned to you (add, edit, review, grade_assignment).</p>

        <p>To get started, please log in to your account. If you don’t have an account yet, please sign up using the same email address (<strong>${email}</strong>).</p>

        <p>We’re excited to have you onboard and look forward to your contributions!</p>

        <p>— Ensinor Team</p>
      </div>
    `,
  );
};
