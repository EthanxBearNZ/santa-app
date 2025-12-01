import Stripe from 'stripe';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase Admin
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  const body = await req.text();
  
  // --- THE FIX FOR NEXT.JS 15 ---
  const headerPayload = await headers(); 
  const signature = headerPayload.get('stripe-signature');
  // ------------------------------

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;
    const creditsToAdd = parseInt(session.metadata.creditsToAdd || '5');

    console.log(`💰 Payment success! Adding ${creditsToAdd} credits to user: ${userId}`);

    // Update Database
    // First, get current credits
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();
    
    // Calculate new total (if no profile exists, assume 0)
    const currentCredits = profile ? profile.credits : 0;
    const newBalance = currentCredits + creditsToAdd;

    // Save back to DB
    await supabase
      .from('profiles')
      .upsert({ id: userId, credits: newBalance });
      
    console.log(`✅ Credits updated to: ${newBalance}`);
  }

  return NextResponse.json({ received: true });
}