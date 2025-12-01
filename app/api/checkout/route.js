import Stripe from 'stripe';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const { userId } = await req.json();

    // --- 1. FIND THE CORRECT URL ---
    // Order of preference:
    // A. The manual one you set in Vercel (NEXT_PUBLIC_BASE_URL)
    // B. The automatic one Vercel provides (VERCEL_URL)
    // C. The request host (headers)
    
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL;

    if (!baseUrl) {
        const host = req.headers.get('host');
        baseUrl = host;
    }

    // --- 2. CLEAN THE URL (The Fix for your Error) ---
    // Stripe crashes if "https://" is missing. We force it here.
    if (baseUrl && !baseUrl.startsWith('http')) {
        // If we are on localhost, use http. Otherwise, force https.
        const protocol = baseUrl.includes('localhost') ? 'http' : 'https';
        baseUrl = `${protocol}://${baseUrl}`;
    }
    
    // Remove trailing slash if it exists (e.g. .com/ -> .com)
    if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
    }

    console.log("✅ Stripe returning to:", baseUrl);

    // --- 3. CREATE SESSION ---
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: '5 Video Call Credits',
              description: 'Live Video Call with Santa',
              images: ['https://cdn-icons-png.flaticon.com/512/744/744546.png'],
            },
            unit_amount: 500, // $5.00
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: { userId: userId, creditsToAdd: '5' },
      success_url: `${baseUrl}/?success=true`,
      cancel_url: `${baseUrl}/?canceled=true`,
    });

    return NextResponse.json({ url: session.url });

  } catch (err) {
    console.error("Stripe Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}