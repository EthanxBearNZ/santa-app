'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function SantaPage() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  // --- CALL STATE ---
  const [isInCall, setIsInCall] = useState(false); // Are we in "FaceTime" mode?
  const [credits, setCredits] = useState(0); 
  const [input, setInput] = useState('');
  
  // Conversation Memory
  const [chatHistory, setChatHistory] = useState([
    { role: 'system', content: 'You are Santa Claus. Be short and magical.' }
  ]);

  // Video Refs
  const santaVideoRef = useRef(null);
  const userCamRef = useRef(null);

  // SANTA STATES
  // 1. Idle Video (Santa blinking/breathing)
  const idleVideoUrl = "https://cdn.pixabay.com/video/2022/12/12/142659-780447141_large.mp4"; 
  const [currentVideoSrc, setCurrentVideoSrc] = useState(idleVideoUrl);
  const [isSantaTalking, setIsSantaTalking] = useState(false);

  // --- 1. SETUP & AUTH ---
  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        fetchCredits(session.user.id);
        // Handle Return from Stripe
        if (window.location.search.includes('success=true')) {
            console.log("💰 Payment return detected...");
            setTimeout(() => {
                fetchCredits(session.user.id);
                window.history.replaceState({}, document.title, "/");
            }, 3000);
        }
      }
    };
    initSession();
    
    // Start Webcam when entering call
    if (isInCall) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            .then(stream => {
                if (userCamRef.current) userCamRef.current.srcObject = stream;
            })
            .catch(err => console.error("Camera denied:", err));
    }
  }, [isInCall]);

  // --- 2. ACTIONS ---
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

  // --- FIX: ADDED HEADERS TO THIS FUNCTION ---
  const handleBuy = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, // <--- THIS WAS MISSING
          body: JSON.stringify({ userId: session.user.id }) 
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url; 
    } catch (e) { 
        alert("Error connecting to store"); 
        console.error(e);
    } finally {
        setLoading(false); 
    }
  };

  // --- 3. THE CONVERSATION LOGIC ---
  const handleSendMessage = async () => {
    if (!input) return;
    if (credits <= 0) { alert("You need credits to start the call!"); return; }

    // 1. Add User Message to History
    const newHistory = [...chatHistory, { role: 'user', content: input }];
    setChatHistory(newHistory);
    setInput('');
    setLoading(true);

    // 2. Deduct Credit
    const newBalance = credits - 1;
    await supabase.from('profiles').update({ credits: newBalance }).eq('id', session.user.id);
    setCredits(newBalance);

    try {
      // 3. Send History to Backend
      const res = await fetch('/api/video-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: newHistory }),
      });
      const data = await res.json();

      // 4. Santa Speaks!
      if (data.video) {
        setIsSantaTalking(true);
        setCurrentVideoSrc(data.video); 
        setChatHistory([...newHistory, { role: 'assistant', content: data.text }]);
      }
    } catch (e) {
      alert("Santa is having trouble hearing you.");
    } finally {
      setLoading(false);
    }
  };

  const handleVideoEnded = () => {
    if (isSantaTalking) {
        setIsSantaTalking(false);
        setCurrentVideoSrc(idleVideoUrl); 
        if(santaVideoRef.current) {
            santaVideoRef.current.loop = true; 
            santaVideoRef.current.play();
        }
    }
  };

  return (
    <div style={{ 
      position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden',
      background: '#000', fontFamily: 'sans-serif', color: 'white'
    }}>
      
      {/* GLOBAL STYLES */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Mountains+of+Christmas:wght@700&display=swap');
        .glass-btn {
           background: rgba(255,255,255,0.2); backdrop-filter: blur(10px);
           border: 1px solid rgba(255,255,255,0.4); color: white;
           padding: 10px 20px; border-radius: 30px; cursor: pointer;
        }
        .call-btn {
           width: 60px; height: 60px; border-radius: 50%; border: none;
           display: flex; alignItems: center; justifyContent: center;
           font-size: 1.5rem; cursor: pointer; transition: transform 0.2s;
        }
        .call-btn:hover { transform: scale(1.1); }
      `}</style>


      {/* --- SCENE 1: THE LOBBY --- */}
      {!isInCall ? (
         <div style={{ 
             width: '100%', height: '100%', 
             background: `url('https://images.unsplash.com/photo-1542601098-8fc114e148e2') center/cover`,
             display: 'flex', alignItems: 'center', justifyContent: 'center'
         }}>
            <div style={{ background: 'rgba(0,0,0,0.6)', position: 'absolute', inset: 0 }}></div>
            
            {!session ? (
                // LOGIN FORM
                <div style={{ zIndex: 10, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', padding: '40px', borderRadius: '30px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <h1 style={{ fontFamily: "'Mountains of Christmas'", fontSize: '3rem', margin: 0 }}>North Pole Direct</h1>
                    <p>Parent Login Required</p>
                    {magicSent ? <p>✅ Check your email!</p> : (
                        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                            <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border:'none' }} />
                            <button type="submit" disabled={loading} className="glass-btn" style={{ background: '#D42426' }}>{loading ? '...' : 'Login'}</button>
                        </form>
                    )}
                </div>
            ) : (
                // START CALL DASHBOARD
                <div style={{ zIndex: 10, textAlign: 'center' }}>
                    <h1 style={{ fontFamily: "'Mountains of Christmas'", fontSize: '4rem', textShadow: '0 0 20px gold' }}>Ready to Call Santa?</h1>
                    <div style={{ background: '#2F5233', display: 'inline-block', padding: '5px 20px', borderRadius: '20px', marginBottom: '30px' }}>
                        ✨ Credits: {credits}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                        {credits > 0 ? (
                            <button onClick={() => setIsInCall(true)} style={{ 
                                background: '#22c55e', color: 'white', border: 'none', 
                                padding: '20px 60px', borderRadius: '50px', fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer',
                                boxShadow: '0 0 30px rgba(34, 197, 94, 0.6)'
                            }}>
                                📞 Start Video Call
                            </button>
                        ) : (
                            <button onClick={handleBuy} style={{ background: '#D42426', padding: '20px 40px', borderRadius: '50px', border:'none', color:'white', fontSize:'1.2rem', cursor:'pointer' }}>
                                Buy Credits ($5)
                            </button>
                        )}
                    </div>
                </div>
            )}
         </div>

      ) : (

         // --- SCENE 2: THE VIDEO CALL UI ---
         <div style={{ width: '100%', height: '100%', position: 'relative', background: '#111' }}>
            
            {/* 1. SANTA (Main Screen) */}
            <video 
                ref={santaVideoRef}
                src={currentVideoSrc} 
                autoPlay 
                loop={!isSantaTalking} 
                onEnded={handleVideoEnded}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />

            {/* 2. USER (Self View - Picture in Picture) */}
            <div style={{ 
                position: 'absolute', top: '20px', right: '20px', 
                width: '120px', height: '160px', 
                background: '#333', borderRadius: '15px', overflow: 'hidden',
                border: '2px solid rgba(255,255,255,0.5)',
                boxShadow: '0 10px 20px rgba(0,0,0,0.5)'
            }}>
                <video ref={userCamRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
            </div>

            {/* 3. CONTROLS (Bottom Bar) */}
            <div style={{ 
                position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
                padding: '15px 30px', borderRadius: '40px',
                display: 'flex', alignItems: 'center', gap: '15px',
                width: '90%', maxWidth: '600px'
            }}>
                
                <input 
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                    placeholder={loading ? "Santa is thinking..." : "Type to speak to Santa..."}
                    disabled={loading || isSantaTalking}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    style={{ 
                        flex: 1, background: 'rgba(255,255,255,0.1)', border: 'none', 
                        color: 'white', padding: '15px', borderRadius: '20px', outline: 'none'
                    }} 
                />

                <button className="call-btn" onClick={handleSendMessage} disabled={loading} style={{ background: '#3b82f6' }}>
                    {loading ? '...' : '➤'}
                </button>

                <button className="call-btn" onClick={() => setIsInCall(false)} style={{ background: '#ef4444' }}>
                    📞
                </button>
            </div>
         </div>
      )}
    </div>
  );
}