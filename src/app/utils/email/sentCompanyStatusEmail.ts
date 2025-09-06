import emailSender from "../emailSender";

export const sendCompanyApprovalEmail = async (email: string, name: string, password: string) => {
    console.log({email, name, password});
    
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

export const sendCompanyDenialEmail = async (email: string, name: string) => {
  await emailSender(
    email,
    "❌ Company Request Denied",
    `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #d9534f;">Hello ${name},</h2>
        <p style="color: #555;">We regret to inform you that your company request has been <strong>denied</strong>.</p>
        <p style="color: #555;">You can review your request details and apply again if needed.</p>
        <p style="color: #555;">Thank you for your interest,<br/>Ensinor Team</p>
      </div>
    `
  );
};