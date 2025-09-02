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
  logger.info('🔎 Fetching donation', {
    params: req.params,
    query: req.query,
  });

  const donation = await findDonation(req);

  if (!donation) {
    logger.warn('⚠️ Donation not found', { params: req.params });
    return httpError(404, 'Donation not found');
  }

  logger.info('✅ Donation fetched successfully', { donation });
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

  try {
    logger.info('🟢 Creating Stripe checkout session', {
      amount,
      currency,
      donationType,
      userId,
      organizationId,
    });

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

    logger.info('✅ Stripe checkout session created', {
      sessionId: session.id,
      amount,
      currency,
    });

    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    logger.error('❌ Failed to create Stripe checkout session', {
      error,
      userId,
      organizationId,
    });
    return httpError(500, 'Failed to create checkout session');
  }
};

const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err) {
    logger.error('❌ Invalid Stripe webhook signature', { error: err });
    return httpError(400, 'Invalid Stripe signature');
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    if (!session) {
      logger.warn('❌ Checkout session is missing');
      return httpError(500, 'Failed to process donation');
    }

    try {
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

      logger.info('✅ Donation saved (checkout.session.completed)', {
        transactionId: session.payment_intent,
      });
      return res.status(200).json({ success: true, message: 'Donation saved' });
    } catch (err) {
      logger.error('❌ Failed to save donation', { error: err });
      return httpError(500, 'Failed to save donation');
    }
  } else if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as Stripe.PaymentIntent;

    try {
      await createDonation({
        amount: intent.amount / 100,
        currency: intent.currency,
        status: 'FAILED',
        transactionId: intent.id,
        donationType: 'USER',
        userId: intent.metadata?.userId ? Number(intent.metadata.userId) : null,
      });

      logger.warn('⚠️ Payment failed, donation saved with FAILED status', {
        transactionId: intent.id,
      });
      return res
        .status(200)
        .json({ success: false, message: 'Payment failed, donation recorded' });
    } catch (err) {
      logger.error('❌ Failed to save failed donation', { error: err });
      return httpError(500, 'Failed to record failed donation');
    }
  } else {
    logger.info(`ℹ️ Unhandled event type: ${event.type}`);
    return res.status(200).json({ received: true, unhandled: event.type });
  }
};

export const controllers = {
  stripeWebhook: asyncHandler(stripeWebhook),
  createCheckoutSession: asyncHandler(createCheckoutSession),
  getDonation: asyncHandler(getDonation),
};
