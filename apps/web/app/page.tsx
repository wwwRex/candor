'use client';

import { useEffect, useRef, useState } from 'react';

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4';

const NAV_LINKS = ['Home', 'About', 'Journal', 'Reach Us'];

const STEPS = [
  {
    number: '01',
    title: 'Speak',
    body: 'Record a short video about your day. No script. No pressure. Just you, speaking honestly.',
  },
  {
    number: '02',
    title: 'Reflect',
    body: 'Candor transcribes your words and finds the patterns — moods, habits, goals — across your entries.',
  },
  {
    number: '03',
    title: 'Grow',
    body: 'Receive personalized life coaching insights, narrated aloud, built around who you actually are.',
  },
];

const FEATURES = [
  {
    title: 'Video Journal',
    body: 'Speak freely. Every word is transcribed, every entry saved privately — your raw thoughts, preserved.',
  },
  {
    title: 'Goal Tracking',
    body: 'Set daily intentions and long-term goals. Check them off. Watch your patterns emerge over time.',
  },
  {
    title: 'AI Life Coach',
    body: 'Claude analyzes your entries and narrates personalized lifestyle advice — delivered on your schedule.',
  },
];

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);
  const [email, setEmail] = useState('');
  const [waitlistState, setWaitlistState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [waitlistMsg, setWaitlistMsg] = useState('');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const FADE = 0.8;

    function tick() {
      if (!video) return;
      const { currentTime, duration, paused } = video;
      if (!duration || paused) { rafRef.current = requestAnimationFrame(tick); return; }
      if (currentTime < FADE) {
        video.style.opacity = String(currentTime / FADE);
      } else if (currentTime > duration - FADE) {
        video.style.opacity = String((duration - currentTime) / FADE);
      } else {
        video.style.opacity = '1';
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    function handleEnded() {
      if (!video) return;
      video.style.opacity = '0';
      setTimeout(() => { if (!video) return; video.currentTime = 0; video.play().catch(() => {}); }, 200);
    }

    video.addEventListener('ended', handleEnded);
    video.play().catch(() => {});
    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); video.removeEventListener('ended', handleEnded); };
  }, []);

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault();
    setWaitlistState('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json() as { message?: string; error?: string };
      if (res.ok) {
        setWaitlistState('done');
        setWaitlistMsg(data.message === 'Already on the list!' ? "You're already on the list." : "You're in. We'll be in touch.");
      } else {
        setWaitlistState('error');
        setWaitlistMsg(data.error ?? 'Something went wrong.');
      }
    } catch {
      setWaitlistState('error');
      setWaitlistMsg('Something went wrong.');
    }
  }

  return (
    <div className="relative w-full overflow-hidden bg-white">

      {/* ── Nav + Hero (video at natural 16:9 ratio) ── */}
      <section className="relative z-10 w-full">

        {/* Navigation overlaid on top of video */}
        <nav className="relative z-20 w-full">
          <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
            <span className="text-3xl tracking-tight font-serif select-none" style={{ color: '#000000' }}>
              Candor
            </span>
            <ul className="hidden md:flex items-center gap-8">
              {NAV_LINKS.map((item) => (
                <li key={item}>
                  <a
                    href={item === 'About' ? '#about' : item === 'Reach Us' ? '#contact' : item === 'Journal' ? '#journal' : '#'}
                    className="text-sm transition-colors hover:text-black"
                    style={{ color: item === 'Home' ? '#000000' : '#6F6F6F' }}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
            <a href="#waitlist">
              <button className="rounded-full px-6 py-2.5 text-sm font-medium text-white transition-transform hover:scale-[1.03] active:scale-[0.98]" style={{ backgroundColor: '#000000' }}>
                Join Waitlist
              </button>
            </a>
          </div>
        </nav>

        {/* Video at natural 16:9 — no cropping */}
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16/9' }}>
          <video
            ref={videoRef}
            src={VIDEO_URL}
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover animate-slow-zoom"
            style={{ opacity: 0 }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white pointer-events-none" />

          {/* Hero text in upper light area of video */}
          <div className="absolute inset-0 flex flex-col items-center justify-start text-center px-6 pt-28">
            <h1
              className="animate-fade-rise font-serif font-normal max-w-5xl text-5xl sm:text-7xl md:text-8xl"
              style={{ lineHeight: 0.95, letterSpacing: '-2.46px', color: '#000000' }}
            >
              Daily{' '}
              <em className="not-italic" style={{ color: '#6F6F6F' }}>awareness.</em>{' '}
              Lasting{' '}
              <em className="not-italic" style={{ color: '#6F6F6F' }}>growth.</em>
            </h1>
            <p className="animate-fade-rise-delay mt-8 max-w-xl text-base sm:text-lg leading-relaxed" style={{ color: '#6F6F6F' }}>
              A video journal that coaches you back. Speak your truth daily — Candor turns it into the guidance you need to grow.
            </p>
            <a href="#waitlist">
              <button className="animate-fade-rise-delay-2 mt-12 rounded-full px-14 py-5 text-base font-medium text-white transition-transform hover:scale-[1.03] active:scale-[0.98]" style={{ backgroundColor: '#000000' }}>
                Begin Journey
              </button>
            </a>
          </div>
        </div>

      </section>

      {/* ── How it works ── */}
      <section id="about" className="relative z-10 bg-white px-6 py-28">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-medium tracking-widest uppercase text-center mb-4" style={{ color: '#6F6F6F' }}>How it works</p>
          <h2 className="font-serif text-4xl sm:text-5xl text-center mb-20" style={{ color: '#000000', letterSpacing: '-1px' }}>
            Three steps to knowing yourself.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {STEPS.map((step) => (
              <div key={step.number} className="flex flex-col gap-4">
                <span className="font-serif text-5xl" style={{ color: '#A0A0A0' }}>{step.number}</span>
                <h3 className="font-serif text-2xl" style={{ color: '#000000' }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6F6F6F' }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative z-10 px-6 py-28" style={{ backgroundColor: '#F9F9F9' }}>
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-medium tracking-widest uppercase text-center mb-4" style={{ color: '#6F6F6F' }}>What's inside</p>
          <h2 className="font-serif text-4xl sm:text-5xl text-center mb-20" style={{ color: '#000000', letterSpacing: '-1px' }}>
            Built for honest self-discovery.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-3xl p-8 flex flex-col gap-3" style={{ border: '1px solid #EBEBEB' }}>
                <h3 className="font-serif text-xl" style={{ color: '#000000' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6F6F6F' }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Journal / App Preview ── */}
      <section id="journal" className="relative z-10 bg-white px-6 py-28 overflow-hidden">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-16">

          {/* Copy */}
          <div className="flex-1 flex flex-col gap-6 text-left">
            <p className="text-xs font-medium tracking-widest uppercase" style={{ color: '#6F6F6F' }}>Your Journal</p>
            <h2 className="font-serif text-4xl sm:text-5xl" style={{ color: '#000000', letterSpacing: '-1px' }}>
              Every entry, always yours.
            </h2>
            <p className="text-base leading-relaxed" style={{ color: '#6F6F6F' }}>
              Browse your full history of video entries. See how your mood shifts, your goals stack up, and your language evolves — all in one honest record.
            </p>
            <ul className="flex flex-col gap-3">
              {[
                'Date, mood tag, and transcript at a glance',
                'Goal completion summary per entry',
                'Tap any entry to replay your video',
              ].map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm" style={{ color: '#6F6F6F' }}>
                  <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px]" style={{ backgroundColor: '#000000' }}>✓</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Phone mockup */}
          <div className="flex-1 flex justify-center">
            <div
              className="relative rounded-[44px] overflow-hidden"
              style={{
                width: 280,
                height: 580,
                backgroundColor: '#FDFAF6',
                border: '8px solid #DDD5C8',
                boxShadow: '0 32px 64px rgba(180,140,100,0.18), 0 2px 8px rgba(180,140,100,0.10)',
              }}
            >
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 rounded-b-2xl z-10" style={{ backgroundColor: '#DDD5C8' }} />

              {/* Screen content */}
              <div className="absolute inset-0 flex flex-col" style={{ paddingTop: 24 }}>

                {/* Header */}
                <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                  <span className="font-serif text-lg" style={{ color: '#1A1208' }}>Journal</span>
                  <span className="text-xs" style={{ color: '#A08060' }}>32 entries</span>
                </div>

                {/* Entry cards */}
                <div className="flex-1 overflow-hidden px-4 flex flex-col gap-2.5">
                  {[
                    {
                      date: 'Today', mood: 'Focused', excerpt: "Really solid morning. Finished the design and felt genuinely proud of the…", goals: '3/3',
                      moodBg: '#FEF3E2', moodColor: '#B8780A',
                    },
                    {
                      date: 'Yesterday', mood: 'Reflective', excerpt: "Had a slower day. Spent time thinking about where I want to be in…", goals: '2/3',
                      moodBg: '#F3EFFA', moodColor: '#7B6FA0',
                    },
                    {
                      date: 'May 26', mood: 'Energized', excerpt: "Woke up early and went for a run before work. That single habit changes…", goals: '3/3',
                      moodBg: '#EDFAF2', moodColor: '#3A7D5C',
                    },
                    {
                      date: 'May 25', mood: 'Tired', excerpt: "Long day. Back to back meetings. Didn't get to the things I wanted…", goals: '1/3',
                      moodBg: '#FDF0ED', moodColor: '#C47B6A',
                    },
                  ].map((entry) => (
                    <div
                      key={entry.date}
                      className="rounded-2xl p-4 flex flex-col gap-1.5"
                      style={{ backgroundColor: '#FFFFFF', border: '1px solid #EDE8E3' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium" style={{ color: '#1A1208' }}>{entry.date}</span>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: entry.moodBg, color: entry.moodColor }}
                        >
                          {entry.mood}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed" style={{ color: '#9A8070' }}>{entry.excerpt}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px]" style={{ color: '#C49A3A' }}>⚑ {entry.goals} goals</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tab bar */}
                <div
                  className="px-4 py-3 flex items-center justify-around"
                  style={{ borderTop: '1px solid #EDE8E3', backgroundColor: '#FDFAF6' }}
                >
                  {[
                    { icon: '⏺', label: 'Record' },
                    { icon: '☰', label: 'Journal', active: true },
                    { icon: '✦', label: 'Insights' },
                    { icon: '⚙', label: 'Settings' },
                  ].map((tab) => (
                    <div key={tab.label} className="flex flex-col items-center gap-0.5">
                      <span className="text-sm" style={{ color: tab.active ? '#B8780A' : '#C8B89A' }}>{tab.icon}</span>
                      <span className="text-[9px]" style={{ color: tab.active ? '#B8780A' : '#C8B89A' }}>{tab.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pull quote ── */}
      <section className="relative z-10 bg-white px-6 py-28 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="font-serif text-3xl sm:text-4xl leading-snug" style={{ color: '#000000', letterSpacing: '-0.5px' }}>
            "I finally understand the patterns behind how I feel — and what to do about them."
          </p>
          <p className="mt-6 text-sm" style={{ color: '#6F6F6F' }}>— Early access member</p>
        </div>
      </section>

      {/* ── Privacy ── */}
      <section className="relative z-10 px-6 py-10 text-center" style={{ backgroundColor: '#F9F9F9' }}>
        <p className="text-sm" style={{ color: '#6F6F6F' }}>
          🔒 &nbsp;Your videos are private, encrypted, and never shared. What you say stays between you and Candor.
        </p>
      </section>

      {/* ── Waitlist ── */}
      <section id="waitlist" className="relative z-10 bg-white px-6 py-28 text-center">
        <div className="max-w-xl mx-auto flex flex-col items-center gap-6">
          <p className="text-xs font-medium tracking-widest uppercase" style={{ color: '#6F6F6F' }}>Early access</p>
          <h2 className="font-serif text-4xl sm:text-5xl" style={{ color: '#000000', letterSpacing: '-1px' }}>
            Be the first to know.
          </h2>
          <p className="text-base leading-relaxed" style={{ color: '#6F6F6F' }}>
            Candor is launching on iOS soon. Join the waitlist and we'll reach out the moment you can begin.
          </p>

          {waitlistState === 'done' ? (
            <p className="text-base font-medium" style={{ color: '#000000' }}>{waitlistMsg} ✓</p>
          ) : (
            <form onSubmit={handleWaitlist} className="w-full flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-full px-6 py-4 text-sm outline-none"
                style={{ border: '1px solid #E0E0E0', color: '#000000', backgroundColor: '#FAFAFA' }}
              />
              <button
                type="submit"
                disabled={waitlistState === 'loading'}
                className="rounded-full px-8 py-4 text-sm font-medium text-white transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:opacity-50"
                style={{ backgroundColor: '#000000', whiteSpace: 'nowrap' }}
              >
                {waitlistState === 'loading' ? 'Joining…' : 'Join Waitlist'}
              </button>
            </form>
          )}
          {waitlistState === 'error' && (
            <p className="text-sm" style={{ color: '#E05B5B' }}>{waitlistMsg}</p>
          )}
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" className="relative z-10 px-6 py-28" style={{ backgroundColor: '#F9F9F9' }}>
        <div className="max-w-xl mx-auto text-center flex flex-col items-center gap-6">
          <p className="text-xs font-medium tracking-widest uppercase" style={{ color: '#6F6F6F' }}>Reach Us</p>
          <h2 className="font-serif text-4xl sm:text-5xl" style={{ color: '#000000', letterSpacing: '-1px' }}>
            Get in touch.
          </h2>
          <p className="text-base leading-relaxed" style={{ color: '#6F6F6F' }}>
            Have questions, feedback, or press inquiries? We'd love to hear from you.
          </p>
          <div className="flex flex-col gap-4 w-full">
            <a
              href="tel:6107557999"
              className="flex items-center justify-center gap-3 rounded-2xl px-8 py-5 text-sm font-medium transition-colors hover:bg-gray-100"
              style={{ border: '1px solid #EBEBEB', backgroundColor: '#FFFFFF', color: '#000000' }}
            >
              <span style={{ color: '#6F6F6F' }}>Phone</span>
              <span>(610) 755-7999</span>
            </a>
            <a
              href="mailto:robbieslinkard0722@gmail.com"
              className="flex items-center justify-center gap-3 rounded-2xl px-8 py-5 text-sm font-medium transition-colors hover:bg-gray-100"
              style={{ border: '1px solid #EBEBEB', backgroundColor: '#FFFFFF', color: '#000000' }}
            >
              <span style={{ color: '#6F6F6F' }}>Email</span>
              <span>robbieslinkard0722@gmail.com</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 px-8 py-10" style={{ borderTop: '1px solid #EBEBEB' }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-serif text-xl" style={{ color: '#000000' }}>
            Candor
          </span>
          <div className="flex items-center gap-6 text-xs" style={{ color: '#6F6F6F' }}>
            <a href="#" className="hover:text-black transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-black transition-colors">Terms of Use</a>
            <a href="#contact" className="hover:text-black transition-colors">Contact</a>
          </div>
          <p className="text-xs" style={{ color: '#6F6F6F' }}>
            © {new Date().getFullYear()} Candor. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
