import { Stripe as StripeType } from 'stripe';
import config from '../../config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface IProducts {
  amount: number;
  name: string;
  quantity: number;
}

class StripeService<T> {
  private stripe() {
    return new StripeType(config.stripe?.stripe_api_secret as string, {
      apiVersion: '2025-08-27.basil',
      typescript: true,
    });
  }

  private handleError(error: unknown, message: string): never {
    if (error instanceof StripeType.errors.StripeError) {
      console.error('Stripe Error:', error.message);
      throw new Error(`Stripe Error: ${message} - ${error.message}`);
    } else if (error instanceof Error) {
      console.error('Error:', error.message);
      throw new Error(`${message} - ${error.message}`);
    } else {
      console.error('Unknown Error:', error);
      throw new Error(`${message} - An unknown error occurred.`);
    }
  }

  // --- Account Linking (for Connect Onboarding) ---
  public async connectAccount(returnUrl: string, refreshUrl: string, accountId: string) {
    try {
      const accountLink = await this.stripe().accountLinks.create({
        account: accountId,
        return_url: returnUrl,
        refresh_url: refreshUrl,
        type: 'account_onboarding',
      });
      return accountLink;
    } catch (error) {
      this.handleError(error, 'Error connecting account');
    }
  }

  // --- Payment Intent (for one-time payments) ---
  public async createPaymentIntent(
    amount: number,
    currency: string,
    payment_method_types: string[] = ['card'],
  ) {
    try {
      return await this.stripe().paymentIntents.create({
        amount: amount * 100, // cents
        currency,
        payment_method_types,
      });
    } catch (error) {
      this.handleError(error, 'Error creating payment intent');
    }
  }

  // --- Transfers (to connected accounts) ---
  public async transfer(
    amount: number,
    accountId: string,
    currency: string = 'usd',
  ) {
    try {
      const balance = await this.stripe().balance.retrieve();
      const availableBalance = balance.available.reduce(
        (total, bal) => total + bal.amount,
        0,
      );

      if (availableBalance < amount) {
        throw new Error('Insufficient funds to cover the transfer.');
      }

      return await this.stripe().transfers.create({
        amount,
        currency,
        destination: accountId,
      });
    } catch (error) {
      this.handleError(error, 'Error transferring funds');
    }
  }

  // --- Refunds ---
  public async refund(payment_intent: string, amount: number) {
    try {
      return await this.stripe().refunds.create({
        payment_intent: payment_intent,
        amount: Math.round(amount),
      });
    } catch (error) {
      this.handleError(error, 'Error processing refund');
    }
  }

  // --- Retrieve Checkout Session ---
  public async retrieve(session_id: string) {
    try {
      return await this.stripe().checkout.sessions.retrieve(session_id);
    } catch (error) {
      this.handleError(error, 'Error retrieving session');
    }
  }

  // --- Payment Status ---
  public async getPaymentStatus(session_id: string) {
    try {
      return (await this.stripe().checkout.sessions.retrieve(session_id)).status;
    } catch (error) {
      this.handleError(error, 'Error retrieving payment status');
    }
  }

  // --- Payment Success Boolean ---
  public async isPaymentSuccess(session_id: string) {
    try {
      const status = (await this.stripe().checkout.sessions.retrieve(session_id)).status;
      return status === 'complete';
    } catch (error) {
      this.handleError(error, 'Error checking payment success');
    }
  }

  // --- Checkout Session Creation ---
  public async getCheckoutSession(
    product: IProducts,
    success_url: string,
    cancel_url: string,
    currency: string = 'usd',
    payment_method_types: Array<'card' | 'paypal' | 'ideal'> = ['card'],
    customer: string = '',
  ) {
    try {
      if (!product?.name || !product?.amount || !product?.quantity) {
        throw new Error('Product details are incomplete.');
      }

      return await this.stripe().checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency,
              product_data: { name: product?.name },
              unit_amount: product?.amount * 100,
            },
            quantity: product?.quantity,
          },
        ],
        success_url,
        cancel_url,
        mode: 'payment',
        invoice_creation: { enabled: true },
        customer,
        payment_method_types,
      });
    } catch (error) {
      this.handleError(error, 'Error creating checkout session');
    }
  }

  public getStripe() {
    return this.stripe();
  }
}

export default new StripeService();
