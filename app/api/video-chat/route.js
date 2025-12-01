import { NextResponse } from 'next/server';

// --- FREE SIMULATION MODE ---
export async function POST(req) {
  try {
    const { userMessage } = await req.json();

    console.log("1. (Simulation) Received message:", userMessage);
    
    // Simulate a delay (like Santa is thinking)
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log("2. (Simulation) Returning fake response");

    // Return a pre-made video URL (or a placeholder)
    // This allows you to test the UI without paying OpenAI or D-ID
    return NextResponse.json({ 
      text: "Ho ho ho! I am in Simulation Mode. Your website works perfectly!", 
      // This is a sample video URL for testing
      video: "https://www.w3schools.com/html/mov_bbb.mp4" 
    });

  } catch (error) {
    return NextResponse.json({ error: "Simulation failed" }, { status: 500 });
  }
}