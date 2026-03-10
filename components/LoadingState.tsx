'use client';
import { useEffect, useState, useRef } from 'react';

const STEPS = [
  {
    emoji: '🧠',
    label: 'Reading your vibe',
    details: [
      'Parsing emotional cues...',
      'Identifying travel archetypes...',
      'Mapping mood to geography...',
    ],
    duration: 3000,
    progress: 12,
  },
  {
    emoji: '🔍',
    label: 'Scanning Reddit',
    details: [
      'Diving into r/solotravel...',
      'Reading r/travel hidden gems...',
      'Checking r/digitalnomad threads...',
      'Analyzing r/backpacking posts...',
    ],
    duration: 4000,
    progress: 32,
  },
  {
    emoji: '📖',
    label: 'Reading travel blogs',
    details: [
      'Skimming Nomadic Matt...',
      'Checking Lonely Planet guides...',
      'Reading CN Traveler picks...',
      'Scanning independent travel blogs...',
    ],
    duration: 3500,
    progress: 52,
  },
  {
    emoji: '📰',
    label: 'Checking safety & news',
    details: [
      'Scanning travel.state.gov advisories...',
      'Reading Reuters travel alerts...',
      'Checking BBC world news...',
      'Reviewing recent incident reports...',
    ],
    duration: 3500,
    progress: 68,
  },
  {
    emoji: '✨',
    label: 'Curating your destinations',
    details: [
      'Weighing vibe match scores...',
      'Filtering crowd levels...',
      'Cross-referencing safety data...',
      'Finalizing hidden gem tips...',
    ],
    duration: 3000,
    progress: 82,
  },
  {
    emoji: '🔬',
    label: 'Second AI pass',
    details: [
      'Checking for tourist traps...',
      'Verifying surprise factor...',
      'Matching your Travel DNA...',
      'Refining final picks...',
    ],
    duration: 4000,
    progress: 95,
  },
];

export default function LoadingState() {
  const [stepIndex, setStepIndex] = useState(0);
  const [detailIndex, setDetailIndex] = useState(0);
  const [progress, setProgress] = useState(2);
  const [visible, setVisible] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const progressRef = useRef(2);

  // Advance steps
  useEffect(() => {
    let elapsed = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    STEPS.forEach((step, i) => {
      const t = setTimeout(() => {
        setVisible(false);
        setTimeout(() => {
          setStepIndex(i);
          setDetailIndex(0);
          setCompletedSteps(prev => i > 0 ? [...prev, i - 1] : prev);
          setVisible(true);
        }, 200);
      }, elapsed);
      timers.push(t);
      elapsed += step.duration;
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  // Cycle detail lines within each step
  useEffect(() => {
    const step = STEPS[stepIndex];
    if (!step) return;
    const interval = setInterval(() => {
      setDetailIndex(d => (d + 1) % step.details.length);
    }, 900);
    return () => clearInterval(interval);
  }, [stepIndex]);

  // Smooth progress bar
  useEffect(() => {
    const target = STEPS[stepIndex].progress;
    const gap = target - progressRef.current;
    const steps = 40;
    const stepSize = gap / steps;
    let count = 0;

    const interval = setInterval(() => {
      if (count >= steps) { clearInterval(interval); return; }
      progressRef.current += stepSize;
      setProgress(Math.min(Math.round(progressRef.current), 99));
      count++;
    }, 30);

    return () => clearInterval(interval);
  }, [stepIndex]);

  const currentStep = STEPS[stepIndex];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '48px 24px 64px',
      gap: 0,
    }}>

      {/* Pulsing orb */}
      <div style={{ position: 'relative', width: 72, height: 72, marginBottom: 32 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute',
            inset: -(i * 10),
            borderRadius: '50%',
            border: '1px solid rgba(124,106,247,0.3)',
            animation: `ping ${1.4 + i * 0.4}s ease-out infinite`,
            animationDelay: `${i * 0.3}s`,
            opacity: 0,
          }} />
        ))}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,106,247,0.5) 0%, rgba(124,106,247,0.15) 60%, transparent 100%)',
        }} />
        <div style={{
          position: 'absolute',
          inset: 10,
          borderRadius: '50%',
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
        }}>
          <span style={{
            transition: 'opacity 0.2s ease',
            opacity: visible ? 1 : 0,
          }}>
            {currentStep.emoji}
          </span>
        </div>
      </div>

      {/* Step label */}
      <div style={{
        textAlign: 'center',
        marginBottom: 10,
        minHeight: 64,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--text)',
          marginBottom: 6,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}>
          {currentStep.label}
        </p>
        <p style={{
          fontSize: 13,
          color: 'var(--accent-light, #a89ef5)',
          fontStyle: 'italic',
          minHeight: 18,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}>
          {currentStep.details[detailIndex]}
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', maxWidth: 440, marginBottom: 28, marginTop: 24 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 8,
          fontSize: 11,
          color: 'var(--text-dim)',
          letterSpacing: '0.05em',
        }}>
          <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>Researching</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{progress}%</span>
        </div>
        <div style={{
          height: 4,
          background: 'var(--border)',
          borderRadius: 4,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            borderRadius: 4,
            background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent-light, #a89ef5) 100%)',
            transition: 'width 0.1s linear',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
              animation: 'shimmer 1.5s linear infinite',
              backgroundSize: '200% 100%',
            }} />
          </div>
        </div>
      </div>

      {/* Completed steps log */}
      <div style={{
        width: '100%',
        maxWidth: 440,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        marginBottom: 32,
        minHeight: 100,
      }}>
        {STEPS.slice(0, stepIndex + 1).map((s, i) => {
          const isDone = i < stepIndex;
          return (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              opacity: isDone ? 0.5 : 1,
              transition: 'opacity 0.4s ease',
              animation: i === stepIndex ? 'fadeUp 0.3s ease forwards' : 'none',
            }}>
              <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>
                {isDone ? '✓' : s.emoji}
              </span>
              <span style={{
                fontSize: 13,
                color: isDone ? 'var(--text-dim)' : 'var(--text)',
                fontWeight: isDone ? 400 : 500,
                textDecoration: isDone ? 'line-through' : 'none',
                textDecorationColor: 'var(--border)',
              }}>
                {s.label}
              </span>
              {isDone && (
                <span style={{ fontSize: 11, color: '#4ade80', marginLeft: 'auto' }}>done</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Shimmer destination placeholders */}
      <div style={{ width: '100%', maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ borderRadius: 16, overflow: 'hidden', opacity: 1 / (i + 0.5) }}>
            <div className="shimmer-bg" style={{ height: 90, marginBottom: 2 }} />
            <div className="shimmer-bg" style={{ height: 30, width: '60%' }} />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
