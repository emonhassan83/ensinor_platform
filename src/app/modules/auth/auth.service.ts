import bcrypt from 'bcrypt';
import httpStatus from 'http-status';
import config from '../../config';
import { JwtPayload } from 'jsonwebtoken';
import emailSender from '../../utils/emailSender';
import {
  authNotify,
  createToken,
  generateTokens,
  getLinkedInUser,
  TExpiresIn,
  verifyToken,
} from './auth.utils';
import { SocialLoginPayload, TLoginUser } from './auth.interface';
import { generateOtp } from '../../utils/generateOtp';
import moment from 'moment';
import ApiError from '../../errors/ApiError';
import { RegisterWith, UserRole, UserStatus } from '@prisma/client';
import { IUser } from '../user/user.interface';
import prisma from '../../utils/prisma';

const socialLogin = async (
  payload: SocialLoginPayload,
  platform: RegisterWith,
) => {
  if ((payload as any).role === UserRole.super_admin) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'You cannot assign super admin role directly.',
    );
  }

  // Check if user exists
  let user = await prisma.user.findUnique({
    where: { email: payload.email },
    include: { verification: true, student: true },
  });

  if (user) {
    if (user.registerWith !== platform) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `This account is registered with ${user.registerWith}. Use that method to login.`,
      );
    }

    // Reactivate soft-deleted user
    if (user.isDeleted) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: payload.name,
          photoUrl: payload.photoUrl,
          isDeleted: false,
          registerWith: platform,
          status: UserStatus.active,
          verification: {
            update: { otp: '', expiresAt: new Date(), status: true },
          },
          expireAt: null,
        },
        include: { verification: true, student: true },
      });
    }

    // Update lastActive + FCM token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastActive: new Date(),
        ...(payload.fcmToken && { fcmToken: payload.fcmToken }),
      },
    });

    // Create Student record if not exists
    if (!user.student) {
      await prisma.student.create({ data: { userId: user.id } });
    }

    const tokens = generateTokens({
      ...user,
      password: user.password ?? '',
    } as IUser);
    return { user, ...tokens };
  }

  // Create new user
  const newUser = await prisma.user.create({
    data: {
      name: payload.name!,
      email: payload.email!,
      photoUrl: payload.photoUrl,
      registerWith: platform,
      status: UserStatus.active,
      verification: {
        create: { otp: '', expiresAt: new Date(), status: true },
      },
      expireAt: null,
    },
    include: { verification: true },
  });

  // Create student record
  await prisma.student.create({ data: { userId: newUser.id } });

  // Update lastActive + FCM token
  await prisma.user.update({
    where: { id: newUser.id },
    data: {
      lastActive: new Date(),
      ...(payload.fcmToken && { fcmToken: payload.fcmToken }),
    },
  });

  const tokens = generateTokens({
    ...newUser,
    password: newUser.password ?? '',
  } as IUser);
  return { user: newUser, ...tokens };
};

// ---------------------- LOGIN ----------------------
const loginUser = async (payload: TLoginUser) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email, isDeleted: false },
    include: { verification: true },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'This user is not found !');
  }

  const isPasswordMatched = await bcrypt.compare(
    payload.password,
    user.password!,
  );
  if (!isPasswordMatched) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Invalid Password !');
  }

  // if user is not verify yet throw error
  if (!user?.verification?.status) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User account is not verified');
  }

  //* create token and sent to the  client
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

  const refreshToken = createToken(
    jwtPayload,
    config.jwt_refresh_secret as string,
    config.jwt_refresh_expires_in as TExpiresIn,
  );

  // Update lastActive + save FCM token if provided
  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastActive: new Date(),
      ...(payload.fcmToken && { fcmToken: payload.fcmToken }),
    },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user?.id,
      name: user?.name,
      email: user?.email,
      photoUrl: user?.photoUrl,
      role: user?.role,
      status: user?.status,
    },
  };
};

// ---------------------- REGISTER WITH SOCIAL ----------------------
const registerWithGoogle = (payload: SocialLoginPayload) =>
  socialLogin(payload, RegisterWith.google);

const registerWithLinkedIn = async (payload: { code: string; fcmToken?: string }) => {
  const { code, fcmToken } = payload;
  if (!code) {
    throw new Error('Authorization code is required');
  }

  // 1️. Fetch LinkedIn user data
  const linkedInData = await getLinkedInUser(code);

  // 2️. Map LinkedIn data to your app payload
  const socialPayload: SocialLoginPayload = {
    name: `${linkedInData.profile.firstName} ${linkedInData.profile.lastName}`,
    email: linkedInData.email,
    photoUrl: linkedInData.profile.profilePicture,
  };

  // 3️. Call your existing socialLogin function
  const result = await socialLogin(socialPayload, RegisterWith.linkedIn);

  return result;
};

const registerWithFacebook = (payload: SocialLoginPayload) =>
  socialLogin(payload, RegisterWith.facebook);

const changePassword = async (
  userData: JwtPayload,
  payload: {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
  },
) => {
  const { oldPassword, newPassword, confirmPassword } = payload;
  //* checking if the user is exist
  const user = await prisma.user.findUnique({
    where: {
      email: userData.email,
      status: UserStatus.active,
      isDeleted: false,
    },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'This user is not found !');
  }

  //* checking if the password is correct
  const isPasswordMatched = await bcrypt.compare(oldPassword, user.password!);
  if (!isPasswordMatched)
    throw new ApiError(httpStatus.FORBIDDEN, 'Invalid Password !');

  // * Check if old and new password are the same
  const isSamePassword = await bcrypt.compare(newPassword, user.password!);
  if (isSamePassword) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'New password cannot be the same as your old password!',
    );
  }

  // if new pass and confirm pass not matched
  if (newPassword !== confirmPassword) {
    throw new ApiError(
      httpStatus.CONFLICT,
      'New password and confirmation password do not match. Please re-enter your password.',
    );
  }

  //* hash new password
  const newHashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  const updateUserPassword = await prisma.user.update({
    where: { id: user.id },
    data: {
      password: newHashedPassword,
      needsPasswordChange: false,
      passwordChangedAt: new Date(),
    },
  });

  //if password is not updated throw error
  if (!updateUserPassword) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'Password was not updated. Please try again!',
    );
  }

  // Send a notification to the user password change
  await authNotify('PASSWORD_CHANGE', user);
};

const refreshToken = async (token: string) => {
  //* checking if the given token is valid
  const decoded = verifyToken(token, config.jwt_refresh_secret as string);

  //* checking if the user is exist
  const user = await prisma.user.findUnique({
    where: { email: decoded.email, isDeleted: false },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'This user is not found !');
  }

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

  return {
    accessToken,
  };
};

const forgetPassword = async (payload: { email: string }) => {
  //* checking if the user is exist
  const user = await prisma.user.findUnique({
    where: { email: payload.email, isDeleted: false },
    include: { verification: true },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'This user is not found !');
  }

  //* create token and sent to the  client
  const jwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const resetToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    '5m',
  );

  const currentTime = new Date();
  const otp = generateOtp();
  const expiresAt = moment(currentTime).add(5, 'minute').toDate();

  await prisma.verification.update({
    where: { userId: user.id },
    data: { otp, expiresAt, status: false },
  });

  // sent forgot email
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
            <span style="padding: 10px 20px; font-size: 18px; font-weight: bold; border-radius: 5px; display: inline-block;">
              ${otp}
            </span>
          </div>
          <p style="color: #555;">This OTP is valid until: <strong>${expiresAt.toLocaleString()}</strong></p>
          <p style="color: #555;">If you did not request this OTP, please ignore this email.</p>
          <p style="color: #555;">Thank you,<br/>Dear Ensinor Team</p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
          <p>&copy; ${new Date().getFullYear()} Dear Ensinor. All rights reserved.</p>
        </div>
      </div>
    `,
  );

  return { token: resetToken };
};

const resetPassword = async (
  payload: { email: string; newPassword: string; confirmPassword: string },
  token: string,
) => {
  //* checking if the user is exist
  const user = await prisma.user.findUnique({
    where: { email: payload.email, isDeleted: false },
    include: { verification: true },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'This user is not found !');
  }

  // if session is expired
  if (new Date() > user!.verification!.expiresAt!) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Session has expired');
  }

  // if user verification status is not available
  if (!user?.verification?.status) {
    throw new ApiError(httpStatus.FORBIDDEN, 'OTP is not verified yet');
  }

  const decoded = verifyToken(token, config.jwt_access_secret as string);
  if (payload.email !== decoded.email) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are forbidden!');
  }

  // if new password and confirm Password is not match
  if (payload?.newPassword !== payload?.confirmPassword) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'New password and confirm password do not match',
    );
  }

  //* hash new password
  const newHashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(config.bcrypt_salt_rounds),
  );

  const passwordResetUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      password: newHashedPassword,
      needsPasswordChange: false,
      passwordChangedAt: new Date(),
      verification: {
        update: { otp: '', status: true, expiresAt: new Date() },
      },
    },
  });

  //if password is not updated throw error
  if (!passwordResetUser) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'Password was not reset. Please try again!',
    );
  }

  // Send a notification to user about the password reset
  await authNotify('PASSWORD_RESET', user);
};

export const AuthServices = {
  loginUser,
  registerWithGoogle,
  registerWithLinkedIn,
  registerWithFacebook,
  changePassword,
  refreshToken,
  forgetPassword,
  resetPassword,
};
