import { Request, Response } from 'express';
import Stripe from 'stripe';
import { asyncHandler } from '@/decorators/asyncHandler';
import { httpError } from '@/helpers/httpError';
import { createDonation, findDonation } from '@/services/donate.service';
import logger from '@/utils/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-08-27.basil',
});

export const getDonation = async (req: Request, res: Response) => {
  const donation = await findDonation(req);
  res.json(donation);
};

export const createCheckoutSession = async (req: Request, res: Response) => {
  const {
    amount,
    currency,
    donationType,
    userId,
    organizationId,
    message,
    name,
  } = req.body;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency,
          product_data: { name: 'Donation' },
          unit_amount: amount * 100,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    metadata: {
      userId: userId?.toString() ?? '',
      organizationId: organizationId?.toString() ?? '',
      donationType,
      message,
      name,
    },
  });

  res.status(200).json({ sessionId: session.id });
};

const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      if (!session) {
        logger.warn('❌ Failed to save donation', { session });
        return httpError(500, 'Server Error');
      }

      await createDonation({
        amount: (session.amount_total ?? 0) / 100,
        currency: session.currency ?? 'usd',
        status: 'SUCCEEDED',
        transactionId: session.payment_intent as string,
        donationType: 'USER',
        userId: session.metadata?.userId
          ? Number(session.metadata.userId)
          : null,
        organizationId: session.metadata?.organizationId
          ? Number(session.metadata.organizationId)
          : null,
        message: session.metadata?.message || null,
        name: session.customer_details?.name || null,
        receiptUrl: session.invoice ? String(session.invoice) : null,
      });
      break;
    }

    case 'payment_intent.payment_failed': {
      const intent = event.data.object as Stripe.PaymentIntent;
      await createDonation({
        amount: intent.amount / 100,
        currency: intent.currency,
        status: 'FAILED',
        transactionId: intent.id,
        donationType: 'USER',
        userId: intent.metadata?.userId ? Number(intent.metadata.userId) : null,
      });
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
};

export const controllers = {
  stripeWebhook: asyncHandler(stripeWebhook),
  createCheckoutSession: asyncHandler(createCheckoutSession),
  getDonation: asyncHandler(getDonation),
};
