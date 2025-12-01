'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function SantaPage() {
  // User Session State
  const [session, setSession] = useState(null);
  
  // Navigation State
  const [showLogin, setShowLogin] = useState(false); // Controls Landing vs Login view

  // Login Form State
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  // App State (Santa Interface)
  const [input, setInput] = useState('');
  const [videoSrc, setVideoSrc] = useState(null);
  const [credits, setCredits] = useState(0); 
  const [snowflakes, setSnowflakes] = useState([]);

  // --- 1. MASTER EFFECT ---
  useEffect(() => {
    // Generate Snow
    const flakes = Array.from({ length: 50 }).map((_, i) => ({
      id: i, left: Math.random() * 100, delay: Math.random() * 5,
      duration: Math.random() * 3 + 4, size: Math.random() * 0.8 + 0.5
    }));
    setSnowflakes(flakes);

    // Check Session
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session) {
        fetchCredits(session.user.id);
        // Handle Stripe Return
        if (window.location.search.includes('success=true')) {
            console.log("💰 Payment detected...");
            setTimeout(() => {
                fetchCredits(session.user.id);
                window.history.replaceState({}, document.title, "/");
            }, 3000);
        }
      }
    };
    initSession();

    // Listen for Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchCredits(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  // --- 2. HELPER FUNCTIONS ---
  const fetchCredits = async (userId) => {
    const { data } = await supabase.from('profiles').select('credits').eq('id', userId).single();
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
    setShowLogin(false); // Reset to Landing Page
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

  const handleInteract = async () => {
    if (!input) return;
    if (credits <= 0) { alert("You need more magic credits!"); return; }
    setLoading(true);

    try {
      // Deduct Credit
      const newBalance = credits - 1;
      const { error } = await supabase.from('profiles').update({ credits: newBalance }).eq('id', session.user.id);
      if (error) throw error;
      setCredits(newBalance);
      
      // Simulate Video
      setTimeout(() => {
          setVideoSrc("https://www.w3schools.com/html/mov_bbb.mp4");
          setLoading(false);
      }, 2000);
    } catch (error) {
      console.error(error);
      alert("Error updating credits.");
      setLoading(false);
    }
  };

  // --- 3. THE RENDER ---
  return (
    <div style={{ 
      position: 'relative', width: '100vw', minHeight: '100vh', overflowX: 'hidden', overflowY: 'auto',
      background: `url('https://images.unsplash.com/photo-1542601098-8fc114e148e2?q=80&w=2070&auto=format&fit=crop')`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
      fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }}></div>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Mountains+of+Christmas:wght@700&display=swap');
        @keyframes fall { 100% { transform: translateY(110vh); opacity: 0.3; } }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .glass-card {
           background: rgba(20, 40, 60, 0.75);
           backdrop-filter: blur(20px);
           border: 2px solid rgba(255, 255, 255, 0.2);
           box-shadow: 0 0 50px rgba(0,0,0,0.5);
           border-radius: 30px;
        }
      `}</style>

      {/* Snow */}
      {snowflakes.map(flake => ( <div key={flake.id} style={{ position: 'fixed', top: '-20px', left: `${flake.left}%`, width: `${10 * flake.size}px`, height: `${10 * flake.size}px`, backgroundColor: 'white', borderRadius: '50%', opacity: 0.9, boxShadow: '0 0 5px white', animation: `fall ${flake.duration}s linear infinite`, animationDelay: `${flake.delay}s`, zIndex: 1 }} /> ))}

      {/* === CONDITIONAL VIEWS === */}

      {session ? (
        
        // --- VIEW 3: SANTA APP (Logged In) ---
        <div className="glass-card" style={{ position: 'relative', zIndex: 10, width: '90%', maxWidth: '550px', padding: '35px', display: 'flex', flexDirection: 'column', gap: '25px', marginTop: '20px', marginBottom: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontFamily: "'Mountains of Christmas', cursive", margin: 0, color: '#fff', fontSize: '3rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>North Pole Direct 🎅</h1>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
              <div style={{ background: credits > 0 ? '#2F5233' : '#991b1b', color: '#FFD700', padding: '5px 15px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold', border: '1px solid #FFD700' }}>✨ Credits: {credits}</div>
              <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid white', color: 'white', borderRadius: '20px', padding: '5px 10px', fontSize: '0.8rem', cursor: 'pointer', opacity: 0.8 }}>Log Out</button>
            </div>
          </div>
          <div style={{ background: 'repeating-linear-gradient(45deg, #ff4d4d, #ff4d4d 10px, #ffffff 10px, #ffffff 20px)', padding: '10px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
              <div style={{ background: '#000', borderRadius: '12px', aspectRatio: '16/9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 {loading ? ( <div style={{ color: 'white', textAlign: 'center' }}><div style={{ fontSize: '3rem', animation: 'spin 1s infinite linear' }}>❄️</div><p style={{ fontFamily: "'Mountains of Christmas', cursive", fontSize: '1.5rem', marginTop: '10px' }}>The Elves are working...</p></div> ) : videoSrc ? ( <video src={videoSrc} controls autoPlay style={{ width: '100%', height: '100%' }} /> ) : ( <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.8)' }}><div style={{ fontSize: '3rem' }}>🎅</div><p style={{ fontFamily: "'Mountains of Christmas', cursive", fontSize: '1.8rem' }}>Santa is Listening</p></div> )}
              </div>
          </div>
          {credits > 0 ? (
             <div style={{ display: 'flex', gap: '10px' }}>
               <input value={input} onChange={e => setInput(e.target.value)} placeholder="What is your wish this year?" style={{ flex: 1, padding: '15px 20px', borderRadius: '25px', border: '2px solid rgba(255,255,255,0.5)', outline: 'none', background: 'rgba(255,255,255,0.9)', color: '#333', fontSize: '1rem' }} />
               <button onClick={handleInteract} style={{ background: 'linear-gradient(to bottom, #D42426, #990000)', color: 'white', border: '2px solid white', borderRadius: '50%', width: '54px', height: '54px', cursor: 'pointer', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.4)' }}>🎁</button>
             </div>
          ) : (
             <button onClick={handleBuy} style={{ width: '100%', padding: '15px', borderRadius: '25px', border: 'none', background: 'linear-gradient(to right, #16a34a, #15803d)', color: 'white', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 5px 15px rgba(0,0,0,0.3)' }}>🎄 Buy 5 Credits for $5.00</button>
          )}
        </div>

      ) : showLogin ? (

        // --- VIEW 2: LOGIN SCREEN (With Back Button) ---
        <div className="glass-card" style={{ zIndex: 10, width: '90%', maxWidth: '400px', padding: '40px', textAlign: 'center' }}>
           <h1 style={{ fontFamily: "'Mountains of Christmas', cursive", color: 'white', fontSize: '2.5rem', marginBottom: '10px' }}>Parent Gate 🔐</h1>
           <p style={{ color: '#cbd5e1', marginBottom: '30px' }}>Enter your email to access the workshop.</p>
           {magicSent ? ( <div style={{ background: '#dcfce7', color: '#166534', padding: '15px', borderRadius: '15px' }}>✅ <strong>Check your email!</strong><br/>We sent you a magic link.</div> ) : (
             <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
               <input type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '15px', borderRadius: '15px', border: 'none', fontSize: '1rem' }} required />
               <button type="submit" disabled={loading} style={{ padding: '15px', borderRadius: '15px', border: 'none', background: '#D42426', color: 'white', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>{loading ? 'Sending...' : 'Send Magic Link ✨'}</button>
             </form>
           )}
           <button onClick={() => setShowLogin(false)} style={{ marginTop: '20px', background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', textDecoration: 'underline' }}>&larr; Back to Home</button>
        </div>

      ) : (

        // --- VIEW 1: LANDING PAGE (New!) ---
        <div className="glass-card" style={{ zIndex: 10, width: '90%', maxWidth: '800px', padding: '50px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px', marginBottom: '20px' }}>
           <h1 style={{ fontFamily: "'Mountains of Christmas', cursive", color: '#FFD700', fontSize: '4rem', margin: '0 0 10px 0', textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>North Pole Direct 🎅</h1>
           <p style={{ color: 'white', fontSize: '1.5rem', maxWidth: '600px', lineHeight: '1.6' }}>Give your child the magical gift of a <span style={{ color: '#FF4D4D', fontWeight: 'bold' }}>real video conversation</span> with Santa Claus.</p>
           
           {/* Feature Grid */}
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', width: '100%', marginTop: '40px', marginBottom: '40px' }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '20px' }}>
                 <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📹</div>
                 <h3 style={{ color: 'white', margin: '0 0 5px 0' }}>Personalized Video</h3>
                 <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0 }}>Santa speaks directly to your child by name.</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '20px' }}>
                 <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>⚡</div>
                 <h3 style={{ color: 'white', margin: '0 0 5px 0' }}>Instant Magic</h3>
                 <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0 }}>No waiting for weeks. Get a response in seconds.</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '20px' }}>
                 <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🛡️</div>
                 <h3 style={{ color: 'white', margin: '0 0 5px 0' }}>Safe & Secure</h3>
                 <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0 }}>Parent-controlled login via secure email.</p>
              </div>
           </div>

           <button onClick={() => setShowLogin(true)} style={{ 
               background: 'linear-gradient(to right, #D42426, #A61B1D)', 
               color: 'white', 
               border: 'none', 
               padding: '20px 50px', 
               borderRadius: '50px', 
               fontSize: '1.5rem', 
               fontWeight: 'bold', 
               cursor: 'pointer',
               boxShadow: '0 0 30px rgba(212, 36, 38, 0.6)',
               transition: 'transform 0.2s'
           }}
           onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
           onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
           >
             Start the Magic ✨
           </button>
           <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '20px' }}>Only $5.00 for 5 Video Chats</p>
        </div>

      )}
    </div>
  );
}