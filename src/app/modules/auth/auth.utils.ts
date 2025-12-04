import axios from 'axios';
import jwt from 'jsonwebtoken';
import { NotificationService } from '../notification/notification.service';
import { messages } from '../notification/notification.constant';
import { NotificationModeType, User } from '@prisma/client';
import { IUser } from '../user/user.interface';
import config from '../../config';

export type TExpiresIn =
| number
| '30s'
| '1m'
| '5m'
| '10m'
| '1h'
| '1d'
| '7d'
| '30d'
| '365d';

interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
}

interface FacebookProfile {
  id: string;
  name: string;
  email?: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

interface LinkedInEmail {
  email: string;
}
export const createToken = (
  jwtPayload: { userId: string; email: string; role: string },
  secret: string,
  expiresIn: TExpiresIn,
) => {
  return jwt.sign(jwtPayload, secret, { expiresIn });
};

export const verifyToken = (token: string, secret: string) => {
  return jwt.verify(token, secret) as jwt.JwtPayload;
};


/**
 * Exchange LinkedIn authorization code for access token
 */
export const getLinkedInAccessToken = async (code: string): Promise<string> => {
  const response = await axios.post(
    'https://www.linkedin.com/oauth/v2/accessToken',
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: config.linkedIn.client_id!,
      client_secret: config.linkedIn.client_secret!,
      redirect_uri: config.linkedIn.redirect_url!,
    }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );

  return response.data.access_token;
};

/**
 * Fetch LinkedIn profile (name, id, profile picture)
 */
export const getLinkedInProfile = async (accessToken: string): Promise<LinkedInProfile> => {
  const profileResponse = await axios.get('https://api.linkedin.com/v2/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const profilePicture =
    profileResponse.data.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers[0]?.identifier;
    

  return {
    id: profileResponse.data.id,
    firstName: profileResponse.data.localizedFirstName,
    lastName: profileResponse.data.localizedLastName,
    profilePicture,
  };
};

/**
 * Fetch LinkedIn email address
 */
export const getLinkedInEmail = async (accessToken: string): Promise<LinkedInEmail> => {
  const emailResponse = await axios.get(
    'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  return {
    email: emailResponse.data.elements[0]['handle~'].emailAddress,
  };
};

/**
 * Full fetch: access token + profile + email
 */
export const getLinkedInUser = async (code: string) => {
  const response = await axios.post(
    'https://www.linkedin.com/oauth/v2/accessToken',
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: config.linkedIn.client_id!,
      client_secret: config.linkedIn.client_secret!,
      redirect_uri: config.linkedIn.redirect_url!,
    }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );

  const { access_token, id_token } = response.data;
  console.log("FULL TOKEN RESPONSE -->", response.data);
  console.log("ID TOKEN পেয়েছি:", !!id_token);

  // id_token থেকে সব ডাটা বের করো (এটাই আসল ডাটা)
  const decoded = jwt.decode(id_token) as any;

  return {
    accessToken: access_token,
    profile: {
      id: decoded.sub,                    // LinkedIn ID
      firstName: decoded.given_name || decoded.name?.split(' ')[0],
      lastName: decoded.family_name || decoded.name?.split(' ').slice(1).join(' '),
      profilePicture: decoded.picture,    // ছবি এখানে থাকে
    },
    email: decoded.email,
    emailVerified: decoded.email_verified,
  };
};


export const generateTokens = (user: IUser) => {
  const jwtPayload = { userId: user.id, email: user.email, role: user.role };
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
  return { accessToken, refreshToken };
};


/**
 * Fetch Facebook user data using accessToken
 * - First, exchange short-lived token for long-lived (optional but recommended)
 * - Then, fetch profile data (id, name, email, picture)
 */
export const getFacebookUser = async (accessToken: string): Promise<FacebookProfile> => {
  console.log('Fetching Facebook user with access token:', accessToken);
  
  try {
    // Step 1: Exchange for long-lived token (recommended for better UX)
    const tokenResponse = await axios.get(
      'https://graph.facebook.com/v20.0/oauth/access_token',
      {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: config.facebook.app_id, // From config or process.env.FACEBOOK_APP_ID
          client_secret: config.facebook.app_secret, // From config or process.env.FACEBOOK_APP_SECRET
          fb_exchange_token: accessToken,
        },
      }
    );

    const longLivedToken = tokenResponse.data.access_token || accessToken;

    // Step 2: Fetch user profile
    const profileResponse = await axios.get(
      'https://graph.facebook.com/v20.0/me',
      {
        params: {
          fields: 'id,name,email,picture.width(400).height(400)',
          access_token: longLivedToken,
        },
      }
    );

    console.log('Facebook Profile Data:', profileResponse.data);

    return profileResponse.data;
  } catch (error: any) {
    console.error('Facebook API Error:', error.response?.data || error.message);
    throw new Error('Failed to fetch Facebook user data');
  }
};

export const authNotify = async (
  action: 'PASSWORD_CHANGE' | 'PASSWORD_RESET',
  user: Partial<User>,
) => {
  // Determine the message and description based on the action
  let message;
  let description;

  switch (action) {
    case 'PASSWORD_CHANGE':
      message = messages.authSettings.passwordChanged;
      description = `Hello ${user?.name}, your password was successfully changed. If you did not perform this action, please contact support immediately.`;
      break;

    case 'PASSWORD_RESET':
      message = messages.authSettings.passwordReset;
      description = `Hello ${user?.name}, your password has been reset. Use your new password to login. If this was not you, please secure your account.`;
      break;

    default:
      throw new Error('Invalid action type');
  }

  // Create a notification entry
  await NotificationService.createNotificationIntoDB({
    receiverId: user?.id,
    message,
    description,
    modeType: NotificationModeType.users,
  });
};
