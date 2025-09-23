import emailSender from "../emailSender";

export const sendCourseEnrollmentEmail = async (
  email: string,
  name: string,
  courseTitle: string,
  dashboardUrl: string
) => {
  await emailSender(
    email,
    `🎉 Congratulations! You are enrolled in ${courseTitle}`,
    `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #333;">Hello ${name},</h2>
        <h3 style="color: #28a745;">🎉 Congratulations on Enrolling in <em>${courseTitle}</em>!</h3>

        <p style="color: #555;">
          We’re excited to have you on board! You’ve officially enrolled in <strong>${courseTitle}</strong>.  
          As part of this course, you now have access to <strong>dedicated chat groups</strong> to help you learn better.
        </p>

        <h4 style="color:#333;margin-top:20px;">📌 Community Guidelines</h4>
        <ul style="color:#555; line-height:1.6;">
          <li>💬 <strong>Discussion Group</strong> → For learners to share ideas, ask questions, and support each other.</li>
          <li>📢 <strong>Announcements</strong> → For instructors/admins only. Stay tuned for important updates here.</li>
          <li>🤝 Be respectful, collaborate, and contribute positively.</li>
        </ul>

        <h4 style="color:#333;margin-top:20px;">🏆 Rewards & Motivation</h4>
        <ul style="color:#555; line-height:1.6;">
          <li>⏳ Complete the course on time to earn <strong>points & rewards</strong>.</li>
          <li>🌟 Active participation in discussions may also bring recognition.</li>
          <li>📈 Stay consistent and make the most of your learning journey!</li>
        </ul>

        <p style="color:#555; margin-top:20px;">
          👉 You can access your course and track progress from your dashboard:  
          <a href="${dashboardUrl}" style="color:#007bff;">${dashboardUrl}</a>
        </p>

        <p style="color:#555; margin-top:20px;">
          Once again, congratulations on taking this step toward growth! 🚀  
          We’re confident you’ll make the most of this journey.
        </p>

        <p style="color: #555;">Best regards,<br/>Ensinor Team</p>
      </div>
    `
  );
};
