'use client';
import { useState, useRef, useEffect } from 'react';
import { ArrowRight, RotateCcw, Shuffle, Dna, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import DestinationCard from '@/components/DestinationCard';
import LoadingState from '@/components/LoadingState';
import ExportBar from '@/components/ExportBar';
import dynamic from 'next/dynamic';
const DestinationMap = dynamic(() => import('@/components/DestinationMap'), { ssr: false });
import { Destination, DiscoverResponse, SavedTrip } from '@/types';

const VIBE_CHIPS_POOL = [
  { emoji: '🏔️', text: 'A quiet mountain lodge with good bourbon' },
  { emoji: '🌊', text: 'Rainy coastal town for writing a novel' },
  { emoji: '🍜', text: 'Neon city with incredible street food' },
  { emoji: '🏛️', text: 'Ancient ruins with almost no tourists' },
  { emoji: '🌸', text: 'Peaceful countryside with flower fields' },
  { emoji: '🤿', text: 'Warm island that feels undiscovered' },
  { emoji: '🛖', text: 'A village so remote the locals still stare at strangers' },
  { emoji: '🌃', text: 'A city that parties until sunrise and sleeps until noon' },
  { emoji: '♨️', text: 'A hot spring town with no agenda and slow mornings' },
  { emoji: '🎭', text: 'Incredible arts and culture with zero hype' },
  { emoji: '🚂', text: 'A city best reached by overnight train' },
  { emoji: '🍷', text: 'A wine region with no famous names on the label' },
  { emoji: '🌋', text: 'Somewhere geologically dramatic and barely visited' },
  { emoji: '📚', text: 'A university town with cheap coffee and big ideas' },
  { emoji: '🎵', text: 'A city with a live music scene the world hasnt found yet' },
  { emoji: '🏜️', text: 'Silence, sand, and a sky full of stars' },
  { emoji: '🛶', text: 'A river delta you navigate by boat' },
  { emoji: '🧘', text: 'Somewhere to do absolutely nothing for a week' },
  { emoji: '🎪', text: 'A city with a permanent carnival energy' },
  { emoji: '🌿', text: 'Cloud forest where everything is damp and green and quiet' },
  { emoji: '🏊', text: 'A thermal lake you can swim in year-round' },
  { emoji: '🦅', text: 'Highland plateau where the wind never stops' },
  { emoji: '🌅', text: 'A fishing village where the day starts at 4am' },
  { emoji: '🧉', text: 'Somewhere people gather in plazas every evening just to talk' },
  { emoji: '🏯', text: 'A walled medieval city that forgot to become a museum' },
  { emoji: '🎨', text: 'An artists colony with cheap studios and no gallery scene yet' },
  { emoji: '🌁', text: 'A foggy peninsula at the edge of a continent' },
  { emoji: '🍄', text: 'Deep forest with foraging trails and wooden guesthouses' },
  { emoji: '🌊', text: 'Clifftop village where the sea is always audible' },
  { emoji: '🏙️', text: 'A megacity with a neighborhood nobody talks about' },
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

function Home() {
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

  // Past vibes — auto-saved, last 3
  const [pastVibes, setPastVibes] = useState<SavedTrip[]>([]);
  // Saved trips — explicit saves, persistent wishlist
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [savedOpen, setSavedOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Travel DNA state
  const [dnaOpen, setDnaOpen] = useState(false);
  const [dnaProfile, setDnaProfile] = useState({ travelerType: '', alwaysSeek: '', ruinsTrip: '', extraContext: '' });
  const [dnaSaved, setDnaSaved] = useState(false);

  // Vibe chips — 10 shown at a time, rotating per session, personalizable
  const [visibleChips, setVisibleChips] = useState<{ emoji: string; text: string }[]>([]);
  const [personalizedChips, setPersonalizedChips] = useState<{ emoji: string; text: string }[] | null>(null);
  const [chipsPersonalized, setChipsPersonalized] = useState(false);
  const [chipsLoading, setChipsLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load DNA + recent searches from localStorage on mount
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
    try {
      const trips = localStorage.getItem('vt-trips');
      if (trips) setPastVibes(JSON.parse(trips));
    } catch { /* ignore */ }
    try {
      const saved = localStorage.getItem('vt-saved');
      if (saved) setSavedTrips(JSON.parse(saved));
    } catch { /* ignore */ }

    // Chip rotation: pick 10 random chips per session
    try {
      const sessionChips = sessionStorage.getItem('vt-chips-session');
      if (sessionChips) {
        setVisibleChips(JSON.parse(sessionChips));
      } else {
        const shuffled = [...VIBE_CHIPS_POOL].sort(() => Math.random() - 0.5).slice(0, 10);
        sessionStorage.setItem('vt-chips-session', JSON.stringify(shuffled));
        setVisibleChips(shuffled);
      }
    } catch {
      setVisibleChips(VIBE_CHIPS_POOL.slice(0, 10));
    }

    // Personalized chips: load from sessionStorage if previously generated
    try {
      const cached = sessionStorage.getItem('vt-chips-dna');
      if (cached) {
        setPersonalizedChips(JSON.parse(cached));
        setChipsPersonalized(true);
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

  // Auto-search if ?v= param is present in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('v');
    if (v && v.trim().length >= 3) {
      setVibe(v);
      discover(v);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // DNA panel closes via Save or X button only

  const saveDna = () => {
    try {
      localStorage.setItem('vt-dna', JSON.stringify(dnaProfile));
      const hasContent = Object.values(dnaProfile).some((v) => (v as string).trim());
      setDnaSaved(hasContent);
      setDnaOpen(false);
      // Clear cached personalized chips so they regenerate with new profile
      sessionStorage.removeItem('vt-chips-dna');
      setPersonalizedChips(null);
      setChipsPersonalized(false);
    } catch { /* ignore */ }
  };

  const personalizeChips = async () => {
    const dnaString = buildDnaString();
    if (!dnaString.trim()) return;
    setChipsLoading(true);
    try {
      const res = await fetch('/api/chips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ travelerDna: dnaString }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.chips?.length) {
          sessionStorage.setItem('vt-chips-dna', JSON.stringify(data.chips));
          setPersonalizedChips(data.chips);
          setChipsPersonalized(true);
        }
      }
    } catch { /* ignore */ }
    setChipsLoading(false);
  };

  const reshuffleChips = () => {
    try {
      const shuffled = [...VIBE_CHIPS_POOL].sort(() => Math.random() - 0.5).slice(0, 10);
      sessionStorage.setItem('vt-chips-session', JSON.stringify(shuffled));
      setVisibleChips(shuffled);
      setPersonalizedChips(null);
      setChipsPersonalized(false);
    } catch { /* ignore */ }
  };

  const clearDna = () => {
    const empty = { travelerType: '', alwaysSeek: '', ruinsTrip: '', extraContext: '' };
    setDnaProfile(empty);
    setDnaSaved(false);
    try { localStorage.removeItem('vt-dna'); } catch { /* ignore */ }
  };

  const saveTrip = () => {
    try {
      const trip = { vibe: searchedVibe, destinations, searchedFor, savedAt: Date.now() };
      const prev = JSON.parse(localStorage.getItem('vt-saved') || '[]');
      const updated = [trip, ...prev.filter((t: { vibe: string }) => t.vibe !== searchedVibe)];
      localStorage.setItem('vt-saved', JSON.stringify(updated));
      setSavedTrips(updated);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch { /* ignore */ }
  };

  const deleteTrip = (vibe: string) => {
    try {
      const updated = savedTrips.filter(t => t.vibe !== vibe);
      localStorage.setItem('vt-saved', JSON.stringify(updated));
      setSavedTrips(updated);
    } catch { /* ignore */ }
  };

  const restoreTrip = (trip: SavedTrip) => {
    setVibe(trip.vibe);
    setSearchedVibe(trip.vibe);
    setSearchedFor('Saved trip');
    setDestinations(trip.destinations);
    setHasSearched(true);
    setSavedOpen(false);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
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
    // Update URL so it's shareable
    if (typeof window !== 'undefined') window.history.replaceState(null, '', `/?v=${encodeURIComponent(query)}`);

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
        // Save full trip to past vibes (max 3, dedupe by vibe string)
        try {
          const newTrip = { vibe: query, destinations: data.destinations || [], searchedFor: data.searchedFor || '' };
          const prev = JSON.parse(localStorage.getItem('vt-trips') || '[]');
          const updated = [newTrip, ...prev.filter((t: { vibe: string }) => t.vibe !== query)].slice(0, 3);
          localStorage.setItem('vt-trips', JSON.stringify(updated));
          setPastVibes(updated);
        } catch { /* ignore */ }
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
    if (typeof window !== 'undefined') window.history.replaceState(null, '', '/');
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

            {/* Saved trips — collapsible wishlist */}
            {!hasSearched && savedTrips.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 560, marginBottom: 4 }} className="fade-up stagger-1">
                <button className="vt-saved-toggle" onClick={() => setSavedOpen(o => !o)}>
                  🗂 Saved trips ({savedTrips.length})
                  {savedOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
                {savedOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', alignItems: 'center' }}>
                    {savedTrips.map(trip => (
                      <div key={trip.vibe} className="vt-saved-row" onClick={() => restoreTrip(trip)}>
                        <span style={{ fontSize: 13 }}>✦</span>
                        <span className="vt-saved-row-text">{trip.vibe}</span>
                        <button
                          className="vt-saved-delete"
                          onClick={e => { e.stopPropagation(); deleteTrip(trip.vibe); }}
                          title="Remove"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Past vibes — instant restore, no API call */}
            {!hasSearched && pastVibes.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 12, width: '100%', maxWidth: 560 }} className="fade-up stagger-1">
                <p className="vt-recent-label">✦ Past vibes</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                  {pastVibes.map((trip) => (
                    <button
                      key={trip.vibe}
                      className="vt-recent-pill"
                      title={trip.vibe}
                      onClick={() => {
                        setVibe(trip.vibe);
                        setSearchedVibe(trip.vibe);
                        setSearchedFor('Your results from last time');
                        setDestinations(trip.destinations);
                        setHasSearched(true);
                        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                      }}
                    >
                      {trip.vibe}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <p className="vt-chips-label" style={{ margin: 0 }}>
                      {chipsPersonalized ? '✦ For you' : 'Or try a vibe'}
                    </p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {dnaSaved && !chipsPersonalized && (
                        <button
                          onClick={personalizeChips}
                          disabled={chipsLoading}
                          style={{ fontSize: 11, padding: '3px 9px', borderRadius: 100, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', opacity: chipsLoading ? 0.6 : 1 }}
                        >
                          {chipsLoading ? '...' : '✦ Personalize'}
                        </button>
                      )}
                      <button
                        onClick={reshuffleChips}
                        title="Shuffle chips"
                        style={{ fontSize: 11, padding: '3px 8px', borderRadius: 100, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer' }}
                      >
                        ↺
                      </button>
                    </div>
                  </div>
                  <div className="vt-chips">
                    {(personalizedChips ?? visibleChips).map(chip => (
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

                {destinations.some(d => d.lat != null && d.lng != null) && (
                  <div style={{ marginBottom: 20, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <DestinationMap destinations={destinations} />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {destinations.map((d, i) => (
                    <DestinationCard key={`${d.name}-${i}`} destination={d} index={i} />
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
                  <button
                    className={`vt-save-btn${justSaved ? ' saved' : ''}`}
                    onClick={saveTrip}
                  >
                    {justSaved ? '✓ Saved!' : '🗂 Save this trip'}
                  </button>
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

export default Home;
