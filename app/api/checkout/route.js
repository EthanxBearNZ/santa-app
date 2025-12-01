import Stripe from 'stripe';
import { NextResponse } from 'next/server';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const { userId } = await req.json();

    // 1. Determine the Return URL
    // If Vercel didn't give us a Base URL, we try to guess it from the request headers
    // (This fixes the "Missing URL" crash)
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    
    if (!baseUrl) {
      const host = req.headers.get('host');
      const protocol = host.includes('localhost') ? 'http' : 'https';
      baseUrl = `${protocol}://${host}`;
    }

    console.log("Stripe Checkout using URL:", baseUrl); // Debug log

    // 2. Create the Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: '5 Santa Video Credits',
              description: 'Live Video Call with Santa',
              images: ['https://cdn-icons-png.flaticon.com/512/744/744546.png'],
            },
            unit_amount: 500, // $5.00
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: {
        userId: userId, 
        creditsToAdd: '5'
      },
      // Use the safe URL we found
      success_url: `${baseUrl}/?success=true`,
      cancel_url: `${baseUrl}/?canceled=true`,
    });

    return NextResponse.json({ url: session.url });

  } catch (err) {
    console.error("Stripe Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}