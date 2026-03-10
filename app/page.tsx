'use client';
import { useState, useRef, useEffect } from 'react';
import { ArrowRight, RotateCcw, Shuffle, Dna, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import DestinationCard from '@/components/DestinationCard';
import LoadingState from '@/components/LoadingState';
import ExportBar from '@/components/ExportBar';
import { Destination, DiscoverResponse } from '@/types';

const VIBE_CHIPS = [
  { emoji: '🏔️', text: 'A quiet mountain lodge with good bourbon' },
  { emoji: '🌊', text: 'Rainy coastal town for writing a novel' },
  { emoji: '🍜', text: 'Neon city with incredible street food' },
  { emoji: '🏛️', text: 'Ancient ruins with almost no tourists' },
  { emoji: '🌸', text: 'Peaceful countryside with flower fields' },
  { emoji: '🤿', text: 'Warm island that feels undiscovered' },
];

const SURPRISE_VIBES = [
  'A Soviet-era spa town with thermal pools and strange murals',
  'A tiny island where fishermen still wave at strangers',
  'A mountain city where it snows in June and the coffee is perfect',
  'A desert oasis with ancient stargazing traditions',
  'A rainy port city that smells like salt and old books',
  'A hill town where every restaurant has the same grandmothers recipe',
  'A volcanic island where the black sand beaches are always empty',
  'A city that was briefly the capital of an empire, now almost forgotten',
  'A lake town so calm it feels like time is running at half speed',
  'A jungle village where the night sounds are louder than the day',
];

const SEASONS = [
  { label: '🌱 Spring', value: 'spring' },
  { label: '☀️ Summer', value: 'summer' },
  { label: '🍂 Fall', value: 'fall' },
  { label: '❄️ Winter', value: 'winter' },
];

const BUDGETS = [
  { label: '💸 Backpacker', value: 'budget' },
  { label: '🏨 Mid-range', value: 'mid' },
  { label: '✨ Splurge', value: 'splurge' },
];

const DNA_FIELDS = [
  { key: 'travelerType', placeholder: 'What kind of traveler are you? (e.g. photographer, slow traveler, foodie)' },
  { key: 'alwaysSeek', placeholder: 'What do you always seek out? (e.g. hidden coffee shops, street art, local markets)' },
  { key: 'ruinsTrip', placeholder: 'What ruins a trip for you? (e.g. tourist traps, loud resorts, no wifi)' },
  { key: 'extraContext', placeholder: 'Anything else? (e.g. solo traveler, always bring a camera, vegetarian)' },
];

export default function Home() {
  const [vibe, setVibe] = useState('');
  const [season, setSeason] = useState('');
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [searchedVibe, setSearchedVibe] = useState('');
  const [searchedFor, setSearchedFor] = useState('');
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [focused, setFocused] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Travel DNA state
  const [dnaOpen, setDnaOpen] = useState(false);
  const [dnaProfile, setDnaProfile] = useState({ travelerType: '', alwaysSeek: '', ruinsTrip: '', extraContext: '' });
  const [dnaSaved, setDnaSaved] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load DNA from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vt-dna');
      if (saved) {
        const parsed = JSON.parse(saved);
        setDnaProfile(parsed);
        const hasContent = Object.values(parsed).some((v) => (v as string).trim());
        if (hasContent) setDnaSaved(true);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) { ta.style.height = 'auto'; ta.style.height = `${ta.scrollHeight}px`; }
  }, [vibe]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // DNA panel closes via Save or X button only

  const saveDna = () => {
    try {
      localStorage.setItem('vt-dna', JSON.stringify(dnaProfile));
      const hasContent = Object.values(dnaProfile).some((v) => (v as string).trim());
      setDnaSaved(hasContent);
      setDnaOpen(false);
    } catch { /* ignore */ }
  };

  const clearDna = () => {
    const empty = { travelerType: '', alwaysSeek: '', ruinsTrip: '', extraContext: '' };
    setDnaProfile(empty);
    setDnaSaved(false);
    try { localStorage.removeItem('vt-dna'); } catch { /* ignore */ }
  };

  const buildDnaString = () => {
    const parts = [];
    if (dnaProfile.travelerType.trim()) parts.push(dnaProfile.travelerType.trim());
    if (dnaProfile.alwaysSeek.trim()) parts.push(`Always seeks: ${dnaProfile.alwaysSeek.trim()}`);
    if (dnaProfile.ruinsTrip.trim()) parts.push(`Avoid: ${dnaProfile.ruinsTrip.trim()}`);
    if (dnaProfile.extraContext.trim()) parts.push(dnaProfile.extraContext.trim());
    return parts.join('. ');
  };

  const discover = async (customVibe?: string) => {
    const query = (customVibe ?? vibe).trim();
    if (!query || loading) return;
    setLoading(true);
    setError('');
    setDestinations([]);
    setHasSearched(true);

    let enriched = query;
    if (season) enriched += `. Traveling in ${season}.`;
    if (budget) enriched += ` Budget: ${budget}.`;
    setSearchedVibe(query);

    const dnaString = buildDnaString();

    try {
      const res = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vibe: enriched, travelerDna: dnaString || undefined }),
      });
      const data: DiscoverResponse = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Something went wrong. Please try again.');
      } else {
        setDestinations(data.destinations || []);
        setSearchedFor(data.searchedFor || '');
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    } catch {
      setError('Could not connect. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChip = (text: string) => { setVibe(text); discover(text); };

  const handleSurprise = () => {
    const random = SURPRISE_VIBES[Math.floor(Math.random() * SURPRISE_VIBES.length)];
    setVibe(random);
    discover(random);
  };

  const reset = () => {
    setVibe('');
    setSeason('');
    setBudget('');
    setDestinations([]);
    setError('');
    setHasSearched(false);
    setSearchedFor('');
    setSearchedVibe('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => textareaRef.current?.focus(), 400);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap');

        .vt-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          padding: 18px 28px;
          display: flex; align-items: center; justify-content: space-between;
          transition: all 0.3s ease;
        }
        .vt-nav.scrolled {
          background: rgba(8,8,14,0.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding: 13px 28px;
        }
        html:not(.dark) .vt-nav.scrolled {
          background: rgba(250,249,247,0.9);
          border-bottom: 1px solid rgba(0,0,0,0.07);
        }
        .vt-logo {
          display: flex; align-items: center; gap: 8px;
          cursor: pointer; font-size: 13px; font-weight: 600;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--text-dim); border: none; background: none;
          font-family: 'Geist', inherit; transition: color 0.2s;
        }
        .vt-logo:hover { color: var(--text); }
        .vt-logo-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: linear-gradient(135deg, #a78bfa, #60a5fa); flex-shrink: 0;
        }
        .vt-hero {
          min-height: 100svh;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 110px 20px 32px;
          position: relative; overflow: hidden;
          transition: padding 0.4s ease;
        }
        .vt-hero.compact {
          min-height: auto;
          padding: 80px 20px 24px;
        }
        .vt-glow {
          position: absolute; pointer-events: none; border-radius: 50%;
          filter: blur(90px);
        }
        .vt-eyebrow {
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.22em; text-transform: uppercase;
          color: var(--accent-light); text-align: center; margin-bottom: 24px;
          display: flex; align-items: center; justify-content: center; gap: 12px;
          transition: all 0.3s ease;
        }
        .vt-hero.compact .vt-eyebrow { margin-bottom: 14px; }
        .vt-eyebrow::before, .vt-eyebrow::after {
          content: ''; width: 20px; height: 1px;
          background: var(--accent-light); opacity: 0.35;
        }
        .vt-headline {
          font-size: clamp(40px, 7vw, 60px);
          font-weight: 600; line-height: 1.03; letter-spacing: -0.03em;
          text-align: center; color: var(--text); margin-bottom: 14px;
          transition: all 0.3s ease;
        }
        .vt-hero.compact .vt-headline {
          font-size: clamp(26px, 4vw, 38px);
          margin-bottom: 8px;
        }
        .vt-grad {
          font-weight: 300; font-style: italic; display: block;
          background: linear-gradient(135deg, #c4b5fd 0%, #93c5fd 60%, #a78bfa 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        html:not(.dark) .vt-grad {
          background: linear-gradient(135deg, #6d28d9 0%, #1d4ed8 60%, #7c3aed 100%);
          -webkit-background-clip: text; background-clip: text;
        }
        .vt-sub {
          font-size: clamp(13px, 2vw, 15px); font-weight: 300;
          color: var(--muted); text-align: center;
          letter-spacing: 0.01em; margin-bottom: 40px; line-height: 1.6;
          transition: all 0.3s ease;
        }
        .vt-hero.compact .vt-sub { margin-bottom: 20px; font-size: 13px; }
        .vt-input-shell {
          width: 100%; max-width: 560px; border-radius: 18px;
          border: 1px solid var(--border); background: var(--bg-input);
          transition: border-color 0.2s ease, box-shadow 0.2s ease; overflow: hidden;
          margin-bottom: 14px;
        }
        .vt-input-shell.focused {
          border-color: rgba(124,58,237,0.4);
          box-shadow: 0 0 0 4px rgba(124,58,237,0.07), 0 12px 40px rgba(0,0,0,0.12);
        }
        .vt-textarea {
          width: 100%; background: transparent; border: none; outline: none;
          padding: 20px 22px 10px;
          font-family: 'Geist', inherit; font-size: 15px; font-weight: 300;
          color: var(--text); resize: none; line-height: 1.6;
          caret-color: var(--accent-light);
        }
        .vt-textarea::placeholder { color: var(--muted); font-style: italic; }
        .vt-input-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding: 6px 10px 12px 22px;
        }
        .vt-hint { font-size: 11px; color: var(--muted); letter-spacing: 0.02em; }
        .vt-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 10px 20px; border-radius: 10px; border: none;
          font-family: 'Geist', inherit; font-size: 13px; font-weight: 500;
          cursor: pointer; transition: all 0.2s ease;
        }
        .vt-btn-on {
          background: linear-gradient(135deg, #7c3aed, #2563eb);
          color: white; box-shadow: 0 4px 16px rgba(124,58,237,0.25);
        }
        .vt-btn-on:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(124,58,237,0.35); }
        .vt-btn-off { background: var(--border); color: var(--muted); cursor: not-allowed; }
        .vt-filters {
          display: flex; flex-wrap: wrap; gap: 7px;
          justify-content: center; max-width: 560px; margin-bottom: 0;
        }
        .vt-filter-pill {
          padding: 7px 14px; border-radius: 100px;
          border: 1px solid var(--border); background: var(--chip-bg);
          color: var(--chip-text); font-family: 'Geist', inherit;
          font-size: 12px; font-weight: 400; cursor: pointer; transition: all 0.15s ease;
        }
        .vt-filter-pill.active {
          border-color: var(--accent-light);
          background: rgba(124,58,237,0.1); color: var(--accent-light);
        }
        html:not(.dark) .vt-filter-pill.active {
          background: rgba(109,40,217,0.08); color: var(--accent);
          border-color: var(--accent);
        }
        .vt-surprise {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 18px; border-radius: 100px;
          border: 1px dashed rgba(255,255,255,0.35); background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.7);
          font-family: 'Geist', inherit; font-size: 12px; font-weight: 500;
          cursor: pointer; transition: all 0.2s ease; margin-bottom: 20px;
        }
        html:not(.dark) .vt-surprise {
          border-color: rgba(0,0,0,0.3); color: rgba(0,0,0,0.58);
          background: rgba(0,0,0,0.04);
        }
        .vt-surprise:hover {
          border-color: var(--accent-light); color: var(--accent-light);
          background: rgba(124,58,237,0.07); transform: translateY(-1px);
        }
        .vt-chips-label {
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.18em; text-transform: uppercase;
          color: var(--muted); text-align: center; margin-bottom: 10px;
        }
        .vt-chips { display: flex; flex-wrap: wrap; gap: 7px; justify-content: center; max-width: 560px; }
        .vt-chip {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 100px;
          border: 1px solid var(--border); background: var(--chip-bg);
          font-family: 'Geist', inherit; font-size: 12px; font-weight: 400;
          color: var(--chip-text); cursor: pointer; white-space: nowrap;
          transition: all 0.15s ease;
        }
        .vt-chip:hover {
          border-color: rgba(167,139,250,0.35); background: rgba(124,58,237,0.07);
          color: var(--text); transform: translateY(-1px);
        }
        .vt-ghost {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 20px; background: none;
          border: 1px solid var(--border); border-radius: 100px;
          font-family: 'Geist', inherit; font-size: 13px; font-weight: 400;
          color: var(--text-dim); cursor: pointer; transition: all 0.15s ease;
        }
        .vt-ghost:hover { border-color: var(--accent-light); color: var(--text); }
        .vt-nav-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 14px; background: none;
          border: 1px solid var(--border); border-radius: 100px;
          font-family: 'Geist', inherit; font-size: 12px;
          color: var(--text-dim); cursor: pointer; transition: all 0.15s ease;
        }
        .vt-nav-btn:hover { border-color: var(--accent-light); color: var(--text); }
        .vt-footer {
          text-align: center; padding: 24px;
          border-top: 1px solid var(--border);
          font-size: 10px; font-weight: 500;
          color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase;
        }
        .vt-dot {
          display: inline-block; width: 3px; height: 3px; border-radius: 50%;
          background: var(--accent-light); opacity: 0.4; margin: 0 8px; vertical-align: middle;
        }
        .vt-divider { width: 28px; height: 1px; background: var(--border); margin: 0 auto 18px; }

        /* Travel DNA */
        .vt-dna-trigger {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 14px; border-radius: 100px;
          border: 1px solid rgba(255,255,255,0.28); background: rgba(255,255,255,0.07);
          font-family: 'Geist', inherit; font-size: 11px; font-weight: 500;
          color: rgba(255,255,255,0.72); cursor: pointer; transition: all 0.2s ease;
          margin-top: 10px;
        }
        html:not(.dark) .vt-dna-trigger {
          border-color: rgba(0,0,0,0.25); background: rgba(0,0,0,0.05);
          color: rgba(0,0,0,0.6);
        }
        .vt-dna-trigger.active {
          border-color: rgba(124,58,237,0.5);
          color: var(--accent-light);
          background: rgba(124,58,237,0.08);
        }
        .vt-dna-trigger:hover {
          border-color: rgba(167,139,250,0.5);
          color: rgba(255,255,255,0.8);
          background: rgba(255,255,255,0.07);
        }
        html:not(.dark) .vt-dna-trigger:hover {
          border-color: var(--accent);
          color: var(--accent);
          background: rgba(109,40,217,0.05);
        }
        .vt-dna-panel {
          width: 100%; max-width: 560px;
          background: var(--bg-input);
          border: 1px solid var(--border);
          border-radius: 16px; overflow: hidden;
          margin-top: 10px;
          animation: slideDown 0.2s ease;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .vt-dna-header {
          padding: 14px 18px 10px;
          font-size: 11px; font-weight: 600;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--accent-light); display: flex; align-items: center; gap: 7px;
        }
        .vt-dna-input {
          width: 100%; background: transparent; border: none;
          border-top: 1px solid var(--border); outline: none;
          padding: 11px 18px;
          font-family: 'Geist', inherit; font-size: 12px; font-weight: 300;
          color: var(--text); line-height: 1.5;
        }
        .vt-dna-input::placeholder { color: var(--muted); }
        .vt-dna-input:focus { background: rgba(124,58,237,0.03); }
        .vt-dna-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 18px; border-top: 1px solid var(--border);
        }
        .vt-dna-save {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 16px; border-radius: 8px; border: none;
          background: linear-gradient(135deg, #7c3aed, #2563eb);
          font-family: 'Geist', inherit; font-size: 12px; font-weight: 500;
          color: white; cursor: pointer; transition: all 0.2s ease;
        }
        .vt-dna-save:hover { opacity: 0.9; transform: translateY(-1px); }
        .vt-dna-clear {
          background: none; border: none; font-family: 'Geist', inherit;
          font-size: 11px; color: var(--muted); cursor: pointer;
          transition: color 0.15s ease; padding: 4px;
        }
        .vt-dna-clear:hover { color: #f87171; }
        .vt-dna-badge {
          display: inline-block; width: 6px; height: 6px; border-radius: 50%;
          background: linear-gradient(135deg, #a78bfa, #60a5fa);
          flex-shrink: 0;
        }
      `}</style>

      <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>

        {/* Nav */}
        <nav className={`vt-nav${scrolled ? ' scrolled' : ''}`}>
          <button className="vt-logo" onClick={reset}>
            <div className="vt-logo-dot" />
            Vibe Travel
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {hasSearched && (
              <button className="vt-nav-btn" onClick={reset}>
                <RotateCcw size={11} /> New search
              </button>
            )}
            <ThemeToggle />
          </div>
        </nav>

        {/* Hero */}
        <section className={`vt-hero${hasSearched ? ' compact' : ''}`}>
          <div className="vt-glow" style={{ width: 500, height: 500, background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)', top: '15%', left: '25%', transform: 'translate(-50%,-50%)' }} />
          <div className="vt-glow" style={{ width: 400, height: 400, background: 'radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)', top: '65%', left: '75%', transform: 'translate(-50%,-50%)' }} />

          <div style={{ width: '100%', maxWidth: 600, position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            <p className="vt-eyebrow fade-up">AI-powered travel discovery</p>

            <h1 className="vt-headline fade-up stagger-1">
              Start with a feeling.
              <span className="vt-grad">We&apos;ll find the place.</span>
            </h1>

            <p className="vt-sub fade-up stagger-2">
              Describe the trip you want to feel — not just where to go.
            </p>

            {/* Input */}
            <div className={`vt-input-shell fade-up stagger-2${focused ? ' focused' : ''}`}>
              <textarea
                ref={textareaRef}
                className="vt-textarea"
                value={vibe}
                onChange={e => setVibe(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); discover(); } }}
                placeholder="e.g. A cabin in the snow where the wifi is bad and the stars are good"
                rows={2}
              />
              <div className="vt-input-footer">
                <span className="vt-hint">Press Enter to search</span>
                <button
                  className={`vt-btn ${vibe.trim() && !loading ? 'vt-btn-on' : 'vt-btn-off'}`}
                  onClick={() => discover()}
                  disabled={!vibe.trim() || loading}
                >
                  Find my vibe <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', marginBottom: 12 }} className="fade-up stagger-2">
              <div className="vt-filters">
                {SEASONS.map(s => (
                  <button key={s.value} className={`vt-filter-pill${season === s.value ? ' active' : ''}`}
                    onClick={() => setSeason(season === s.value ? '' : s.value)}>{s.label}</button>
                ))}
              </div>
              <div className="vt-filters">
                {BUDGETS.map(b => (
                  <button key={b.value} className={`vt-filter-pill${budget === b.value ? ' active' : ''}`}
                    onClick={() => setBudget(budget === b.value ? '' : b.value)}>{b.label}</button>
                ))}
              </div>
            </div>

            {/* Travel DNA toggle */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 560 }}>
            <button
              className={`vt-dna-trigger fade-up stagger-2${dnaSaved ? ' active' : ''}`}
              onClick={() => setDnaOpen(o => !o)}
            >
              {dnaSaved && <span className="vt-dna-badge" />}
              <Dna size={11} />
              Your Travel DNA
              {dnaOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>

            {/* Travel DNA panel */}
            <div className="vt-dna-panel" style={{ display: dnaOpen ? 'flex' : 'none', flexDirection: 'column' }}>
                <div className="vt-dna-header">
                  <Sparkles size={11} /> Travel DNA — shapes every search, silently
                </div>
                {DNA_FIELDS.map(field => (
                  <input
                    key={field.key}
                    className="vt-dna-input"
                    placeholder={field.placeholder}
                    value={dnaProfile[field.key as keyof typeof dnaProfile]}
                    onChange={e => setDnaProfile(p => ({ ...p, [field.key]: e.target.value }))}
                  />
                ))}
                <div className="vt-dna-footer">
                  <button className="vt-dna-clear" onClick={clearDna}>Clear</button>
                  <button className="vt-dna-save" onClick={saveDna}>
                    <Sparkles size={11} /> Save DNA
                  </button>
                </div>
              </div>

            </div>

            {/* Surprise me + chips — only before first search */}
            {!hasSearched && (
              <>
                <button className="vt-surprise fade-up stagger-3" style={{ marginTop: 16 }} onClick={handleSurprise}>
                  <Shuffle size={12} /> Surprise me
                </button>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }} className="fade-up stagger-3">
                  <p className="vt-chips-label">Or try a vibe</p>
                  <div className="vt-chips">
                    {VIBE_CHIPS.map(chip => (
                      <button key={chip.text} className="vt-chip" onClick={() => handleChip(chip.text)}>
                        <span>{chip.emoji}</span>{chip.text}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Results */}
        {hasSearched && (
          <section ref={resultsRef} style={{ padding: '0 20px 100px', maxWidth: 720, margin: '0 auto' }}>
            {loading && <LoadingState />}

            {error && (
              <div style={{ padding: '18px 22px', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 14, color: '#f87171', fontSize: 14, textAlign: 'center' }}>
                {error}
              </div>
            )}

            {!loading && destinations.length > 0 && (
              <>
                {searchedFor && (
                  <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginBottom: 20, fontStyle: 'italic' }}>
                    {searchedFor}
                  </p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {destinations.map((d, i) => (
                    <DestinationCard key={`${d.name}-${i}`} destination={d} index={i} />
                  ))}
                </div>

                <ExportBar destinations={destinations} vibe={searchedVibe} />

                <div style={{ textAlign: 'center', marginTop: 32 }}>
                  <div className="vt-divider" />
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>Not feeling these?</p>
                  <button className="vt-ghost" onClick={reset}>
                    <RotateCcw size={11} /> Try a different vibe
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        <footer className="vt-footer">
          Vibe Travel
          <span className="vt-dot" />
          Live web research
          <span className="vt-dot" />
          Real-time safety signals
        </footer>
      </main>
    </>
  );
}
