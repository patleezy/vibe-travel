import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Vibe Travel — Start with a feeling. We\'ll find the place.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#07070f',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'Georgia, serif',
        }}
      >
        {/* Deep purple radial glow — upper center */}
        <div style={{
          position: 'absolute',
          width: 900,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(109,40,217,0.22) 0%, transparent 65%)',
          top: -100,
          left: '50%',
          transform: 'translateX(-50%)',
        }} />

        {/* Subtle blue accent — lower right */}
        <div style={{
          position: 'absolute',
          width: 500,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(29,78,216,0.12) 0%, transparent 70%)',
          bottom: -80,
          right: -60,
        }} />

        {/* Top badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 22px',
          background: 'rgba(124,58,237,0.12)',
          border: '1px solid rgba(124,58,237,0.3)',
          borderRadius: 100,
          marginBottom: 44,
        }}>
          <span style={{ fontSize: 16, color: '#a78bfa', fontFamily: 'serif' }}>*</span>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#a78bfa',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontFamily: 'Georgia, serif',
          }}>
            AI Travel Discovery
          </span>
        </div>

        {/* Main headline */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span style={{
            fontSize: 76,
            fontWeight: 700,
            color: '#eeeef5',
            lineHeight: 1.05,
            textAlign: 'center',
            letterSpacing: '-0.02em',
          }}>
            Start with a feeling.
          </span>
          <span style={{
            fontSize: 76,
            fontWeight: 700,
            fontStyle: 'italic',
            color: '#a78bfa',
            lineHeight: 1.1,
            textAlign: 'center',
            letterSpacing: '-0.02em',
          }}>
            {"We'll find the place."}
          </span>
        </div>

        {/* Descriptor chips row */}
        <div style={{
          display: 'flex',
          gap: 12,
          marginTop: 40,
        }}>
          {['Reddit + blogs', 'Safety signals', 'Hidden gems', 'Free'].map((label) => (
            <div key={label} style={{
              padding: '7px 18px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 100,
              fontSize: 14,
              color: '#8080a8',
              letterSpacing: '0.02em',
            }}>
              {label}
            </div>
          ))}
        </div>

        {/* Bottom URL */}
        <div style={{
          position: 'absolute',
          bottom: 36,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          
          <span style={{
            fontSize: 15,
            color: '#4a4a6a',
            letterSpacing: '0.06em',
            fontFamily: 'Georgia, serif',
          }}>
            vibetravel.space
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
