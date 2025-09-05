import bcrypt from 'bcrypt';
import httpStatus from 'http-status';
import config from '../../config';
import { JwtPayload } from 'jsonwebtoken';
import emailSender from '../../utils/emailSender';
import {
  // authNotifyAdmin,
  createToken,
  TExpiresIn,
  verifyToken,
} from './auth.utils';
import { TLoginUser } from './auth.interface';
import { generateOtp } from '../../utils/generateOtp';
import moment from 'moment';
import ApiError from '../../errors/ApiError';
import { RegisterWith, UserRole } from '@prisma/client';
import { IUser } from '../user/user.interface';
import prisma from '../../utils/prisma';

// ---------------------- LOGIN ----------------------
const loginUser = async (payload: TLoginUser) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
    include: { verification: true },
  });
  if (!user || user?.isDeleted) {
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
      photoUrl: user?.email,
      role: user?.role,
      status: user?.status,
    },
  };
};

// ---------------------- REGISTER WITH GOOGLE ----------------------
const registerWithGoogle = async (payload: Partial<IUser>) => {
  // 🚫 Prevent admin role assignment by user
  if (payload.role === UserRole.super_admin) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'You cannot directly assign super admin role',
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: payload.email as string },
    include: { verification: true },
  });
  if (user) {
    // Check if account was not created with Google
    if (user?.registerWith !== RegisterWith.google) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `This account is registered with ${user.registerWith}, so you should try logging in using that method.`,
      );
    }

    // If user is soft deleted, reactivate
    if (user?.isDeleted) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: payload.name,
          email: payload.email,
          photoUrl: payload.photoUrl,
          registerWith: RegisterWith.google,
          isDeleted: false,
          verification: {
            update: {
              otp: '',
              expiresAt: new Date(),
              status: true,
            },
          },
          expireAt: null,
        },
        include: { verification: true },
      });

      if (!updatedUser) {
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          'Failed to reactivate deleted user.',
        );
      }

      const jwtPayload = {
        userId: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
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

      return {
        user: updatedUser,
        accessToken,
        refreshToken,
      };
    }

    // If user is valid and active
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

    return {
      accessToken,
      refreshToken,
    };
  }

  // Create new user if not exists
  const newUser = await prisma.user.create({
    data: {
      name: payload.name!,
      email: payload.email!,
      photoUrl: payload.photoUrl,
      registerWith: RegisterWith.google,
      verification: {
        create: {
          otp: '',
          expiresAt: new Date(),
          status: true,
        },
      },
      expireAt: null,
    },
    include: { verification: true },
  });

  if (!newUser) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to create user!',
    );
  }

  const jwtPayload = {
    userId: newUser.id,
    email: newUser.email,
    role: newUser.role,
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

  return {
    user: newUser,
    accessToken,
    refreshToken,
  };
};

const registerWithLinkedIn = async (payload: Partial<IUser>) => {
  // 🚫 Prevent admin role assignment by user
  if (payload.role === UserRole.super_admin) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'You cannot directly assign super admin role',
    );
  }

  //* checking if the user is exist
  const user = await prisma.user.findUnique({
    where: { email: payload.email as string },
    include: { verification: true },
  });

  // if login Linkedin with existing user
  if (user) {
    if (user?.registerWith !== RegisterWith.linkedIn) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `This account is registered with ${user.registerWith}, so you should try logging in using that method.`,
      );
    }

    if (user?.isDeleted) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: payload.name,
          email: payload.email,
          photoUrl: payload.photoUrl,
          registerWith: RegisterWith.linkedIn,
          isDeleted: false,
          verification: {
            update: {
              otp: '',
              expiresAt: new Date(),
              status: true,
            },
          },
          expireAt: null,
        },
        include: { verification: true },
      });

      if (!updatedUser) {
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          'Failed to reactivate deleted user.',
        );
      }

      const jwtPayload = {
        userId: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
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

      return {
        user: updatedUser,
        accessToken,
        refreshToken,
      };
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

    const refreshToken = createToken(
      jwtPayload,
      config.jwt_refresh_secret as string,
      config.jwt_refresh_expires_in as TExpiresIn,
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  const newUser = await prisma.user.create({
    data: {
      name: payload.name!,
      email: payload.email!,
      photoUrl: payload.photoUrl,
      registerWith: RegisterWith.linkedIn,
      verification: {
        create: {
          otp: '',
          expiresAt: new Date(),
          status: true,
        },
      },
      expireAt: null,
    },
    include: { verification: true },
  });

  if (!newUser) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to create user!',
    );
  }

  const jwtPayload = {
    userId: newUser.id,
    email: newUser.email,
    role: newUser.role,
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

  return {
    user: newUser,
    accessToken,
    refreshToken,
  };
};

const registerWithFacebook = async (payload: Partial<IUser>) => {
  // 🚫 Prevent admin role assignment by user
  if (payload.role === UserRole.super_admin) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'You cannot directly assign admin role',
    );
  }

  //* checking if the user is exist
  const user = await prisma.user.findUnique({
    where: { email: payload.email as string },
    include: { verification: true },
  });

  if (user) {
    if (user?.registerWith !== RegisterWith.facebook) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `This account is registered with ${user.registerWith}, so you should try logging in using that method.`,
      );
    }

    if (user?.isDeleted) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: payload.name,
          email: payload.email,
          photoUrl: payload.photoUrl,
          registerWith: RegisterWith.facebook,
          isDeleted: false,
          verification: {
            update: {
              otp: '',
              expiresAt: new Date(),
              status: true,
            },
          },
          expireAt: null,
        },
        include: { verification: true },
      });

      if (!updatedUser) {
        throw new ApiError(
          httpStatus.INTERNAL_SERVER_ERROR,
          'Failed to reactivate deleted user.',
        );
      }

      const jwtPayload = {
        userId: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
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

      return {
        user: updatedUser,
        accessToken,
        refreshToken,
      };
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

    const refreshToken = createToken(
      jwtPayload,
      config.jwt_refresh_secret as string,
      config.jwt_refresh_expires_in as TExpiresIn,
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  const newUser = await prisma.user.create({
    data: {
      name: payload.name!,
      email: payload.email!,
      photoUrl: payload.photoUrl,
      registerWith: RegisterWith.facebook,
      verification: {
        create: {
          otp: '',
          expiresAt: new Date(),
          status: true,
        },
      },
      expireAt: null,
    },
    include: { verification: true },
  });

  if (!newUser) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to create user!',
    );
  }

  const jwtPayload = {
    userId: newUser.id,
    email: newUser.email,
    role: newUser.role,
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

  return {
    user: newUser,
    accessToken,
    refreshToken,
  };
};

const changePassword = async (
  userData: JwtPayload,
  payload: { oldPassword: string; newPassword: string },
) => {
  //* checking if the user is exist
  const user = await prisma.user.findUnique({
    where: { email: userData.email },
  });
  if (!user || user?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'This user is not found !');
  }

  //* checking if the password is correct
  const isPasswordMatched = await bcrypt.compare(
    payload.oldPassword,
    user.password!,
  );
  if (!isPasswordMatched)
    throw new ApiError(httpStatus.FORBIDDEN, 'Invalid Password !');

  //* hash new password
  const newHashedPassword = await bcrypt.hash(
    payload.newPassword,
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

  // Send a notification to the admin informing them about the successful password change
  // user?.role === UserRole.super_admin  && (await authNotifyAdmin('PASSWORD_CHANGE'))
};

const refreshToken = async (token: string) => {
  //* checking if the given token is valid
  const decoded = verifyToken(token, config.jwt_refresh_secret as string);

  //* checking if the user is exist
  const user = await prisma.user.findUnique({
    where: { email: decoded.email },
  });
  if (!user || user?.isDeleted) {
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
    where: { email: payload.email },
    include: { verification: true },
  });
  if (!user || user?.isDeleted) {
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

  // const resetUILink = `${config.reset_pass_link}?id=${user._id}&token=${resetToken} `

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

  // Send a notification to the admin informing them about the forgot password request
  // user?.role === UserRole.super_admin && (await authNotifyAdmin('PASSWORD_FORGET'))

  return { token: resetToken };
};

const resetPassword = async (
  payload: { email: string; newPassword: string; confirmPassword: string },
  token: string,
) => {
  //* checking if the user is exist
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
    include: { verification: true },
  });
  if (!user || user?.isDeleted) {
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

  // Send a notification to the admin informing them about the password reset
  // user?.role === UserRole.super_admin && (await authNotifyAdmin('PASSWORD_RESET'))
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
