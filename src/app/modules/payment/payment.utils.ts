import Stripe from 'stripe'
import config from '../../config'

const stripe: Stripe = new Stripe(config.stripe?.stripe_api_secret as string, {
  apiVersion: '2025-08-27.basil',
  typescript: true,
})
interface TPayload {
  product: {
    amount: number
    name: string
    quantity: number
  }
  // customerId: string;
  paymentId: string
}

export const createCheckoutSession = async (payload: TPayload) => {
  const paymentGatewayData = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: payload?.product?.name,
          },
          unit_amount: Math.round(payload.product?.amount * 100),
        },
        quantity: payload.product?.quantity,
      },
    ],

    success_url: `${config.server_url}/payments/confirm-payment?sessionId={CHECKOUT_SESSION_ID}&paymentId=${payload?.paymentId}`,
    cancel_url: config?.payment_cancel_url,
    mode: 'payment',
    invoice_creation: {
      enabled: true,
    },
    payment_method_types: ['card'],
  })

  return paymentGatewayData
}