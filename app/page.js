'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function SantaPage() {
  // Login State
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  // App State
  const [input, setInput] = useState('');
  const [videoSrc, setVideoSrc] = useState(null);
  const [credits, setCredits] = useState(0); 
  const [snowflakes, setSnowflakes] = useState([]);

  // --- 1. MASTER EFFECT: HANDLES LOAD, LOGIN, SNOW, AND PAYMENTS ---
  useEffect(() => {
    // A. Generate Snow
    const flakes = Array.from({ length: 50 }).map((_, i) => ({
      id: i, left: Math.random() * 100, delay: Math.random() * 5,
      duration: Math.random() * 3 + 4, size: Math.random() * 0.8 + 0.5
    }));
    setSnowflakes(flakes);

    // B. Check Session & Handle Payment Return
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session) {
        // Fetch credits immediately
        fetchCredits(session.user.id);

        // CHECK IF RETURNING FROM STRIPE
        if (window.location.search.includes('success=true')) {
            console.log("💰 Just returned from payment. Waiting for database update...");
            setTimeout(() => {
                fetchCredits(session.user.id);
                // Clean the URL so we don't refresh and check again
                window.history.replaceState({}, document.title, "/");
            }, 3000);
        }
      }
    };

    initSession();

    // Listen for login/logout changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchCredits(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);


  // --- 2. HELPER FUNCTIONS ---

  const fetchCredits = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();
    if (data) setCredits(data.credits);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert(error.message);
    else setMagicSent(true);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCredits(0);
    setVideoSrc(null);
  };

  const handleBuy = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url; 
    } catch (e) {
      alert("Error connecting to store");
    } finally {
      setLoading(false);
    }
  };

  // --- THE FIX: REAL DATABASE DEDUCTION ---
  const handleInteract = async () => {
    if (!input) return;
    
    // Check if we actually have credits
    if (credits <= 0) {
      alert("You need more magic credits!");
      return;
    }

    setLoading(true);

    try {
      // 1. Calculate new balance
      const newBalance = credits - 1;

      // 2. Save to Database
      const { error } = await supabase
        .from('profiles')
        .update({ credits: newBalance })
        .eq('id', session.user.id);

      if (error) throw error;

      // 3. Update Screen
      setCredits(newBalance);
      
      // 4. Simulate Video (Replace this with real API call later when ready)
      setTimeout(() => {
          setVideoSrc("https://www.w3schools.com/html/mov_bbb.mp4");
          setLoading(false);
      }, 2000);

    } catch (error) {
      console.error(error);
      alert("Error updating credits. Please refresh.");
      setLoading(false);
    }
  };


  // --- 3. THE RENDER (HTML/CSS) ---
  return (
    <div style={{ 
      position: 'relative', width: '100vw', minHeight: '100vh', overflow: 'hidden',
      background: `url('https://images.unsplash.com/photo-1542601098-8fc114e148e2?q=80&w=2070&auto=format&fit=crop')`,
      backgroundSize: 'cover', backgroundPosition: 'center', fontFamily: 'sans-serif',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      {/* Dark Overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}></div>
      
      {/* Global Styles */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Mountains+of+Christmas:wght@700&display=swap');
        @keyframes fall { 100% { transform: translateY(110vh); opacity: 0.3; } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>

      {/* Snowflakes */}
      {snowflakes.map(flake => ( 
        <div key={flake.id} style={{ 
          position: 'absolute', top: '-20px', left: `${flake.left}%`, 
          width: `${10 * flake.size}px`, height: `${10 * flake.size}px`, 
          backgroundColor: 'white', borderRadius: '50%', opacity: 0.9, 
          boxShadow: '0 0 5px white', animation: `fall ${flake.duration}s linear infinite`, 
          animationDelay: `${flake.delay}s`, zIndex: 5 
        }} /> 
      ))}

      {/* --- CONDITIONAL VIEWS --- */}
      
      {!session ? (
        // === VIEW 1: LOGIN SCREEN ===
        <div style={{ zIndex: 10, width: '90%', maxWidth: '400px', background: 'rgba(20, 40, 60, 0.85)', backdropFilter: 'blur(20px)', borderRadius: '30px', padding: '40px', border: '2px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 0 50px rgba(0,0,0,0.5)', textAlign: 'center' }}>
           <h1 style={{ fontFamily: "'Mountains of Christmas', cursive", color: 'white', fontSize: '2.5rem', marginBottom: '10px' }}>North Pole Login 🎄</h1>
           <p style={{ color: '#cbd5e1', marginBottom: '30px' }}>Parents, sign in to see Santa.</p>
           {magicSent ? ( 
             <div style={{ background: '#dcfce7', color: '#166534', padding: '15px', borderRadius: '15px' }}>✅ <strong>Check your email!</strong><br/>We sent you a magic link.</div> 
           ) : (
             <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
               <input type="email" placeholder="Parent's Email Address" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '15px', borderRadius: '15px', border: 'none', fontSize: '1rem' }} required />
               <button type="submit" disabled={loading} style={{ padding: '15px', borderRadius: '15px', border: 'none', background: '#D42426', color: 'white', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>{loading ? 'Sending...' : 'Send Magic Link ✨'}</button>
             </form>
           )}
        </div>
      ) : (
        // === VIEW 2: SANTA APP ===
        <div style={{ position: 'relative', zIndex: 10, width: '90%', maxWidth: '550px', background: 'rgba(20, 40, 60, 0.75)', backdropFilter: 'blur(20px)', borderRadius: '30px', padding: '35px', border: '2px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 0 50px rgba(212, 36, 38, 0.3)', display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontFamily: "'Mountains of Christmas', cursive", margin: 0, color: '#fff', fontSize: '3rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>North Pole Direct 🎅</h1>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
              <div style={{ background: credits > 0 ? '#2F5233' : '#991b1b', color: '#FFD700', padding: '5px 15px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold', border: '1px solid #FFD700' }}>
                 ✨ Credits: {credits}
              </div>
              <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid white', color: 'white', borderRadius: '20px', padding: '5px 10px', fontSize: '0.8rem', cursor: 'pointer', opacity: 0.8 }}>Log Out</button>
            </div>
          </div>

          {/* Video Box (Candy Cane Frame) */}
          <div style={{ background: 'repeating-linear-gradient(45deg, #ff4d4d, #ff4d4d 10px, #ffffff 10px, #ffffff 20px)', padding: '10px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
              <div style={{ background: '#000', borderRadius: '12px', aspectRatio: '16/9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 {loading ? ( <div style={{ color: 'white', textAlign: 'center' }}><div style={{ fontSize: '3rem', animation: 'spin 1s infinite linear' }}>❄️</div><p style={{ fontFamily: "'Mountains of Christmas', cursive", fontSize: '1.5rem', marginTop: '10px' }}>The Elves are working...</p></div> ) : videoSrc ? ( <video src={videoSrc} controls autoPlay style={{ width: '100%', height: '100%' }} /> ) : ( <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.8)' }}><div style={{ fontSize: '3rem' }}>🎅</div><p style={{ fontFamily: "'Mountains of Christmas', cursive", fontSize: '1.8rem' }}>Santa is Listening</p></div> )}
              </div>
          </div>

          {/* Footer: Input OR Buy Button */}
          {credits > 0 ? (
             <div style={{ display: 'flex', gap: '10px' }}>
               <input value={input} onChange={e => setInput(e.target.value)} placeholder="What is your wish this year?" style={{ flex: 1, padding: '15px 20px', borderRadius: '25px', border: '2px solid rgba(255,255,255,0.5)', outline: 'none', background: 'rgba(255,255,255,0.9)', color: '#333', fontSize: '1rem' }} />
               <button onClick={handleInteract} style={{ background: 'linear-gradient(to bottom, #D42426, #990000)', color: 'white', border: '2px solid white', borderRadius: '50%', width: '54px', height: '54px', cursor: 'pointer', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.4)' }}>🎁</button>
             </div>
          ) : (
             <button onClick={handleBuy} style={{ width: '100%', padding: '15px', borderRadius: '25px', border: 'none', background: 'linear-gradient(to right, #16a34a, #15803d)', color: 'white', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 5px 15px rgba(0,0,0,0.3)' }}>
               🎄 Buy 5 Credits for $5.00
             </button>
          )}

        </div>
      )}
    </div>
  );
}