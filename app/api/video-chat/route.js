import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    // We now accept 'history' (the whole chat) instead of just one message
    const { history } = await req.json();

    console.log("1. (Simulation) Received conversation history length:", history.length);
    
    // Simulate thinking time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // IN REAL LIFE: You would send 'history' to OpenAI here.
    // For now, we simulate a response based on the last message.
    const lastMessage = history[history.length - 1].content.toLowerCase();
    
    let fakeResponseVideo = "https://www.w3schools.com/html/mov_bbb.mp4"; // Default
    
    // Simple logic to make it feel "real" during testing
    if (lastMessage.includes("hello") || lastMessage.includes("hi")) {
        // Santa saying hello
        fakeResponseVideo = "https://www.w3schools.com/html/mov_bbb.mp4"; 
    } else if (lastMessage.includes("gift") || lastMessage.includes("want")) {
        // Santa talking about gifts
        fakeResponseVideo = "https://www.w3schools.com/html/mov_bbb.mp4"; 
    }

    return NextResponse.json({ 
      video: fakeResponseVideo,
      // We return the text too so we can save it to history
      text: "Ho ho ho! I hear you loud and clear!" 
    });

  } catch (error) {
    return NextResponse.json({ error: "Connection lost" }, { status: 500 });
  }
}