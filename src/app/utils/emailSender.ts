import nodemailer from 'nodemailer'
import config from '../config'
import axios from 'axios';
import httpStatus from 'http-status'
import ApiError from '../errors/ApiError';

const emailSender = async (email: string, subject: string, html: string) => {
 try {
    const emailData = {
      to: email,
      subject,
      html,
      nodemailer_host_email: config.emailSender.email,
      nodemailer_host_pass: config.emailSender.app_pass,
    };

    const res = await axios.post(
      'https://amirafoundation-nodemailer.vercel.app',
      emailData,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const result = res?.data;
    if (!result.success) {
      throw new ApiError(httpStatus.BAD_REQUEST, result.message);
    }
    return result;
  } catch (error) {
    console.error('Email sending error:', error);
    throw new ApiError(httpStatus.BAD_REQUEST, 'Error sending email');
  }
}

export default emailSender
