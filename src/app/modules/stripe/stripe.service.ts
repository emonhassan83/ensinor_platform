import config from '../../config';
import httpStatus from 'http-status';
import { PrismaClient, UserStatus } from '@prisma/client';
import StripeService from '../../class/stripe/stripe';
import ApiError from '../../errors/ApiError';

const prisma = new PrismaClient();

// Create Stripe Connect account link
const stripLinkAccount = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, isDeleted: false, status: UserStatus.active },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found!');
  }

  try {
    const account = await StripeService.getStripe().accounts.create({
      type: 'express',
      country: 'US',   // Platform country
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    const accountId = account.id;

    const refresh_url = `${config.server_url}/stripe/refresh/${accountId}?userId=${userId}`;
    const return_url = `${config.server_url}/stripe/return?userId=${userId}&stripeAccountId=${accountId}`;

    const accountLink = await StripeService.connectAccount(return_url, refresh_url, accountId);

    console.log('Stripe Account Link Generated:', {
      accountId,
      url: accountLink.url,
    });

    return accountLink.url;
  } catch (error: any) {
   if (error.code === 'platform_profile_incomplete') {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Stripe platform profile incomplete. Please visit https://dashboard.stripe.com/settings/connect/platform-profile to accept responsibilities.'
    );
  }
  throw new ApiError(httpStatus.BAD_GATEWAY, error.message);
  }
};

// Check if Stripe is connected
const checkStripeConnected = async (userId: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeAccountId: true },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const isConnected = !!user.stripeAccountId;
  console.log('Stripe Connected Check:', { userId, isConnected, stripeAccountId: user.stripeAccountId });

  return isConnected;
};

// Handle OAuth callback from Stripe (code exchange)
const handleStripeOAuth = async (query: Record<string, any>, userId: string) => {
  const { code, state } = query;

  if (!code) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No authorization code received from Stripe');
  }

  console.log('Stripe OAuth Callback:', { code, state, userId });

  try {
    const response = await StripeService.getStripe().oauth.token({
      grant_type: 'authorization_code',
      code: code as string,
    });

    const connectedAccountId = response.stripe_user_id;

    if (!connectedAccountId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'No stripe_user_id received');
    }

    // Update user with connected account ID
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { stripeAccountId: connectedAccountId },
    });

    console.log('Stripe Connected Successfully:', {
      userId,
      connectedAccountId,
      updatedUserStripeId: updatedUser.stripeAccountId,
    });

    return { success: true, stripeAccountId: connectedAccountId };
  } catch (error: any) {
    console.error('Stripe OAuth failed:', error);
    throw new ApiError(httpStatus.BAD_REQUEST, error.message || 'Failed to connect Stripe account');
  }
};

// Refresh link (if user needs to restart onboarding)
const refresh = async (accountId: string, query: Record<string, any>) => {
  const userId = query.userId as string;

  const user = await prisma.user.findFirst({
    where: { id: userId, isDeleted: false, status: UserStatus.active },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found!');
  }

  try {
    const refresh_url = `${config.server_url}/stripe/refresh/${accountId}?userId=${userId}`;
    const return_url = `${config.server_url}/stripe/return?userId=${userId}&stripeAccountId=${accountId}`;

    const accountLink = await StripeService.connectAccount(return_url, refresh_url, accountId);

    return accountLink.url;
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error.message);
  }
};

// Return URL after onboarding complete
const returnUrl = async (payload: Record<string, any>) => {
  const userId = payload.userId as string;
  const stripeAccountId = payload.stripeAccountId as string;

  console.log('Stripe Return URL hit:', { userId, stripeAccountId });

  try {
    if (!userId || !stripeAccountId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Missing userId or stripeAccountId');
    }

    // Update DB
    const user = await prisma.user.update({
      where: { id: userId },
      data: { stripeAccountId },
    });

    console.log('User updated with Stripe ID:', user.stripeAccountId);

    return { url: `${config.payment_success_url}/account?success=true` };
  } catch (error: any) {
    console.error('Return URL error:', error);
    return { url: `${config.payment_success_url}/account?error=stripe_connect_failed` };
  }
};

export const stripeService = {
  handleStripeOAuth,
  stripLinkAccount,
  refresh,
  returnUrl,
  checkStripeConnected
};
