import config from '../../config';
import httpStatus from 'http-status';
import { PrismaClient, UserStatus } from '@prisma/client';
import StripeService from '../../class/stripe/stripe';
import ApiError from '../../errors/ApiError';

const prisma = new PrismaClient();

// Create Stripe account and return the account link URL
const stripLinkAccount = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isDeleted: false,
      status: UserStatus.active,
    },
  });
  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User not found!');
  }

  try {
    const account = await StripeService.getStripe().accounts.create({
      // email: user.email, (optional)
    });

    const refresh_url = `${config.server_url}/stripe/refresh/${account.id}?userId=${user.id}`;
    const return_url = `${config.server_url}/stripe/return?userId=${user.id}&stripeAccountId=${account.id}`;

    const accountLink = await StripeService.connectAccount(
      return_url,
      refresh_url,
      account.id,
    );
    return accountLink.url;
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_GATEWAY, error.message);
  }
};

const checkStripeConnected = async (userId: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeAccountId: true },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  return !!user.stripeAccountId;
};

// Handle Stripe OAuth and save the connected account ID
const handleStripeOAuth = async (
  query: Record<string, any>,
  userId: string,
) => {
  try {
    const response = await StripeService.getStripe().oauth.token({
      grant_type: 'authorization_code',
      code: query.code as string,
    });

    const connectedAccountId = response.stripe_user_id;

    await prisma.user.update({
      where: { id: userId },
      data: { stripeAccountId: connectedAccountId },
    });
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error.message);
  }
};

// Refresh the account link for a given payment ID
const refresh = async (paymentId: string, query: Record<string, any>) => {
  const user = await prisma.user.findFirst({
    where: { id: query.userId, isDeleted: false, status: UserStatus.active },
  });

  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User not found!');
  }

  try {
    const refresh_url = `${config.server_url}/stripe/refresh/${paymentId}?userId=${user.id}`;
    const return_url = `${config.server_url}/stripe/return?userId=${user.id}&stripeAccountId=${paymentId}`;

    const accountLink = await StripeService.connectAccount(
      return_url,
      refresh_url,
      paymentId,
    );

    return accountLink.url;
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error.message);
  }
};

// Handle the return URL and update the user's Stripe account ID
const returnUrl = async (payload: Record<string, any>) => {
  console.log('Return URL payload:', payload.userId);
  const userId = payload.userId.split('=')[1];

  try {
    const user = await prisma.user.update({
      where: { id: userId, isDeleted: false, status: UserStatus.active },
      data: { stripeAccountId: payload?.stripeAccountId },
    });

    if (!user) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'User not found!');
    }

    return { url: `${config.payment_success_url}/account` };
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error.message);
  }
};

export const stripeService = {
  handleStripeOAuth,
  stripLinkAccount,
  refresh,
  returnUrl,
  checkStripeConnected
};
