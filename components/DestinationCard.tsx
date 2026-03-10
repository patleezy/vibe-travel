'use client';
import { Destination } from '@/types';
import { Users, Calendar, Wallet, ShieldCheck, ShieldAlert, ShieldX, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const CROWD_LABELS = { low: 'Off the beaten path', medium: 'Moderate crowds', high: 'Popular destination' };
const COST_LABELS = { budget: 'Budget-friendly', mid: 'Mid-range', splurge: 'Splurge-worthy' };
const COST_ICONS = { budget: '$', mid: '$$', splurge: '$$$' };

const SAFETY_CONFIG = {
  green: { icon: ShieldCheck, label: 'All clear', className: 'safety-green' },
  yellow: { icon: ShieldAlert, label: 'Heads up', className: 'safety-yellow' },
  red: { icon: ShieldX, label: 'Reconsider', className: 'safety-red' },
};

interface Props {
  destination: Destination;
  index: number;
}

export default function DestinationCard({ destination: d, index }: Props) {
  const [expanded, setExpanded] = useState(false);
  const safety = SAFETY_CONFIG[d.safetyStatus] || SAFETY_CONFIG.green;
  const SafetyIcon = safety.icon;

  return (
    <article
      className={`fade-up stagger-${Math.min(index + 1, 5)}`}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        overflow: 'hidden',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(124,106,247,0.12)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {/* Header band */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(124,106,247,0.15) 0%, rgba(124,106,247,0.03) 100%)',
        borderBottom: '1px solid var(--border)',
        padding: '20px 24px 16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 22 }}>{d.vibeEmoji}</span>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500 }}>
                {d.region}
              </span>
            </div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(22px, 5vw, 28px)',
              fontWeight: 700,
              color: 'var(--text)',
              lineHeight: 1.1,
              marginBottom: 4,
            }}>
              {d.name}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 400 }}>{d.country}</p>
          </div>

          {/* Safety badge */}
          <div className={`${safety.className}`} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 100,
            border: '1px solid',
            fontSize: 12,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            <SafetyIcon size={13} />
            {safety.label}
          </div>
        </div>

        <p style={{
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 15,
          color: 'var(--accent-light, #a89ef5)',
          marginTop: 10,
          lineHeight: 1.4,
        }}>
          "{d.tagline}"
        </p>
      </div>

      {/* Body */}
      <div style={{ padding: '20px 24px' }}>
        <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.65, marginBottom: 16 }}>
          {d.whyItFits}
        </p>

        {/* Hidden gem tip */}
        <div style={{
          background: 'rgba(124,106,247,0.06)',
          border: '1px solid rgba(124,106,247,0.15)',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 16,
        }}>
          <p style={{ fontSize: 11, color: 'var(--accent-light, #7c6af7)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
            💎 Hidden Gem Tip
          </p>
          <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.55 }}>{d.hiddenGemTip}</p>
        </div>

        {/* Safety note — always visible if yellow/red */}
        {(d.safetyStatus !== 'green' || expanded) && d.safetyNote && (
          <div className={safety.className} style={{
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 16,
            border: '1px solid',
          }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
              ⚠️ Safety Note
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.55 }}>{d.safetyNote}</p>
          </div>
        )}

        {/* Meta row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <Chip icon={<Calendar size={12} />} label={d.bestTime} />
          <Chip icon={<Users size={12} />} label={CROWD_LABELS[d.crowdLevel]} />
          <Chip icon={<Wallet size={12} />} label={`${COST_ICONS[d.costSignal]} ${COST_LABELS[d.costSignal]}`} />
        </div>

        {/* Expand toggle for green safety note */}
        {d.safetyStatus === 'green' && d.safetyNote && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-dim)',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: 0,
            }}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? 'Hide' : 'Show'} safety details
          </button>
        )}
      </div>
    </article>
  );
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '5px 10px',
      background: 'var(--chip-bg)',
      color: 'var(--text-dim)',
      borderRadius: 100,
      fontSize: 12,
      fontWeight: 500,
    }}>
      {icon}{label}
    </span>
  );
}
