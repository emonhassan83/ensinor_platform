import httpStatus from 'http-status';
import jwt, { JwtPayload, Secret } from 'jsonwebtoken';
import moment from 'moment';
import config from '../../config';
import ApiError from '../../errors/ApiError';
import { generateOtp } from '../../utils/generateOtp';
import emailSender from '../../utils/emailSender';
import { createToken, TExpiresIn } from '../auth/auth.utils';
import prisma from '../../utils/prisma';

const verifyOtp = async (token: string, otp: string | number) => {
  if (!token) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
  }

  let decode: JwtPayload;
  try {
    decode = jwt.verify(
      token,
      config.jwt_access_secret as Secret,
    ) as JwtPayload;
  } catch (err) {
    console.error(err);
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'Session has expired. Please try to submit OTP within 5 minute',
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: decode?.email },
    include: { verification: true },
  });
  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User not found');
  }
  if (!user.verification) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'OTP not generated for this user',
    );
  }

  if (new Date() > user.verification.expiresAt) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'OTP has expired. Please resend it',
    );
  }

  if (Number(otp) !== Number(user.verification.otp)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'OTP did not match');
  }

 await prisma.verification.update({
    where: { userId: user.id },
    data: {
      otp: '',
      expiresAt: moment().add(5, 'minute').toDate(),
      status: true,
    },
  });

  const jwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as TExpiresIn,
  );

  return { token: accessToken };
};

const resendOtp = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User not found');
  }

  const otp = generateOtp();
  const expiresAt = moment().add(5, 'minute').toDate();

  // Upsert ensures either update existing or create new verification record
  const updateOtp = await prisma.verification.upsert({
    where: { userId: user.id },
    update: {
      otp,
      expiresAt,
      status: false,
    },
    create: {
      userId: user.id,
      otp,
      expiresAt,
      status: false,
    },
  });

  if (!updateOtp) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Failed to resend OTP. Please try again later',
    );
  }

  const jwtPayload = {
    email: user?.email,
    userId: user?.id,
  };
  const token = jwt.sign(jwtPayload, config.jwt_access_secret as Secret, {
    expiresIn: '5m',
  });

  await emailSender(
    user?.email,
    'Your One-Time OTP',
    `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <div style="text-align: left; padding: 10px 20px;">
          <h2 style="color: #333;">Your One-Time OTP</h2>
          <p style="color: #555; margin-top: 10px;">Dear ${user?.name},</p>
          <p style="color: #555;">Use the following One-Time Password (OTP) to proceed with your request. This OTP is valid for a limited time.</p>
          <div style="text-align: center; margin: 20px 0;">
            <span style="background-color: #9C6498; color: white; padding: 10px 20px; font-size: 18px; font-weight: bold; border-radius: 5px; display: inline-block;">
              ${otp}
            </span>
          </div>
          <p style="color: #555;">This OTP is valid until: <strong>${expiresAt.toLocaleString()}</strong></p>
          <p style="color: #555;">If you did not request this OTP, please ignore this email.</p>
          <p style="color: #555;">Thank you,<br/>Dear Henrietta Team</p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
          <p>&copy; ${new Date().getFullYear()} Dear Henrietta. All rights reserved.</p>
        </div>
      </div>
    `,
  );

  return { token };
};

export const otpServices = {
  verifyOtp,
  resendOtp,
};
