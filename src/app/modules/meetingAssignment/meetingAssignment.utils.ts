import { NotificationModeType } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';
import emailSender from '../../utils/emailSender';

interface MeetingDetails {
  topic: string;
  agenda?: string | null;
  joinUrl: string;
  password?: string | null;
  startTime: Date;
  duration: number;
  timezone?: string | null;
}

export const sendMeetingAssignmentNotification = async (
  recipients: { id: string; email: string; fcmToken?: string | null; name?: string }[],
  meeting: MeetingDetails,
  assignType: 'course' | 'event' | 'user'
) => {
  const now = new Date().toLocaleString('en-US', { timeZone: meeting.timezone || 'UTC' });

  const notifications = recipients.map(async (rec) => {
    // 1. DB Notification
      await NotificationService.createNotificationIntoDB({
        receiverId: rec.id,
        message: `New Zoom Meeting Assigned (${assignType})`,
        description:`Topic: ${meeting.topic} | Starts: ${now}`,
        modeType: NotificationModeType.meeting,
      });
    
  });

  // Run in background (no await)
  Promise.allSettled(notifications).catch(err =>
    console.error('Meeting notification failed:', err)
  );
};

export const sendMeetingAssignmentEmail = async (
  recipientEmail: string,
  recipientName: string | null | undefined,
  meeting: MeetingDetails,
  assignType: 'course' | 'event' | 'user'
) => {
  const startDateTime = new Date(meeting.startTime).toLocaleString('en-US', {
    timeZone: meeting.timezone || 'UTC',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #000000ff;">New Zoom Meeting Assigned!</h2>
      <p>Dear ${recipientName || 'Student'},</p>
      <p>A new Zoom meeting has been assigned to you via ${assignType}:</p>
      
      <table style="width:100%; margin: 20px 0; border-collapse: collapse;">
        <tr><td style="padding:8px; font-weight:bold;">Topic:</td><td>${meeting.topic}</td></tr>
        <tr><td style="padding:8px; font-weight:bold;">Agenda:</td><td>${meeting.agenda || 'N/A'}</td></tr>
        <tr><td style="padding:8px; font-weight:bold;">Date & Time:</td><td>${startDateTime}</td></tr>
        <tr><td style="padding:8px; font-weight:bold;">Duration:</td><td>${meeting.duration} minutes</td></tr>
        <tr><td style="padding:8px; font-weight:bold;">Join URL:</td><td><a href="${meeting.joinUrl}" style="color:#0E71EB;">Click to Join</a></td></tr>
        ${meeting.password ? `<tr><td style="padding:8px; font-weight:bold;">Password:</td><td>${meeting.password}</td></tr>` : ''}
      </table>

      <p style="color:#555;">Please join on time. If you have any questions, contact your instructor.</p>
      <p>Best regards,<br/>Ensinor Team</p>
      
      <div style="text-align:center; margin-top:30px; font-size:12px; color:#999;">
        © ${new Date().getFullYear()} Ensinor. All rights reserved.
      </div>
    </div>
  `;

  await emailSender(
    recipientEmail,
    `Zoom Meeting Invitation: ${meeting.topic}`,
    htmlContent
  );
};