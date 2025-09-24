import emailSender from "../emailSender";

export const sendAssignmentCheckedEmail = async (
  email: string,
  name: string,
  assignmentTitle: string,
  marksObtained: number,
  grade: string,
  feedback: string,
  dashboardUrl: string
) => {
  await emailSender(
    email,
    `✅ Your assignment "${assignmentTitle}" has been graded!`,
    `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #333;">Hello ${name},</h2>
        <h3 style="color: #007bff;">Your assignment "<em>${assignmentTitle}</em>" has been checked!</h3>

        <p style="color: #555;">
          Here are your results:  
          <strong>Marks Obtained:</strong> ${marksObtained} <br/>
          <strong>Grade:</strong> ${grade} <br/>
          <strong>Feedback:</strong> ${feedback || "No feedback provided."}
        </p>

        <p style="color: #555; margin-top: 20px;">
          🎯 You can view your submission and track progress in your dashboard:  
          <a href="${dashboardUrl}" style="color:#007bff;">${dashboardUrl}</a>
        </p>

        <p style="color: #555; margin-top: 20px;">
          Keep up the good work and continue learning! 🚀
        </p>

        <p style="color: #555;">Best regards,<br/>Ensinor Team</p>
      </div>
    `
  );
};