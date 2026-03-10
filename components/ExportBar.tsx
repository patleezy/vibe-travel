'use client';
import { Destination } from '@/types';
import { Mail, FileText, Share2 } from 'lucide-react';

interface Props {
  destinations: Destination[];
  vibe: string;
}

function generateTxt(destinations: Destination[], vibe: string): string {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const lines = [
    `VIBE TRAVEL ✈️`,
    `Vibe: "${vibe}"`,
    `Generated: ${date}`,
    ``,
    `─────────────────────────────────────`,
    ``,
  ];
  destinations.forEach((d, i) => {
    const safetyLabel = d.safetyStatus === 'green' ? 'All clear' : d.safetyStatus === 'yellow' ? 'Heads up' : 'Reconsider';
    lines.push(`${i + 1}. ${d.name}, ${d.country}`);
    lines.push(`   ${d.region} · ${d.vibeEmoji}`);
    lines.push(`   "${d.tagline}"`);
    lines.push(``);
    lines.push(`   Why it fits: ${d.whyItFits}`);
    lines.push(``);
    lines.push(`   💎 Hidden Gem: ${d.hiddenGemTip}`);
    lines.push(`   📅 Best time: ${d.bestTime}`);
    lines.push(`   🛡  Safety: ${safetyLabel}${d.safetyNote ? ` — ${d.safetyNote}` : ''}`);
    lines.push(`   💰 Cost: ${d.costSignal}`);
    lines.push(``);
    lines.push(`─────────────────────────────────────`);
    lines.push(``);
  });
  lines.push(`vibetravel.space`);
  return lines.join('\n');
}

function downloadTxt(destinations: Destination[], vibe: string) {
  const blob = new Blob([generateTxt(destinations, vibe)], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'vibe-travel.txt'; a.click();
  URL.revokeObjectURL(url);
}

function openEmail(destinations: Destination[], vibe: string) {
  const subject = encodeURIComponent('My Vibe Travel picks ✈️');
  // mailto bodies need CRLF (%0D%0A) for line breaks across all email clients
  const txt = generateTxt(destinations, vibe).replace(/\n/g, '\r\n');
  const body = encodeURIComponent(txt);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, align: CanvasTextAlign = 'center') {
  ctx.textAlign = align;
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
  return cy;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function generateAndShareStory(destinations: Destination[], vibe: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d')!;

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, 1920);
  bg.addColorStop(0, '#08080e');
  bg.addColorStop(0.5, '#0d0820');
  bg.addColorStop(1, '#080e1a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1920);

  // Purple glow
  const g1 = ctx.createRadialGradient(540, 600, 0, 540, 600, 700);
  g1.addColorStop(0, 'rgba(124,58,237,0.2)');
  g1.addColorStop(1, 'transparent');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, 1080, 1920);

  // Blue glow
  const g2 = ctx.createRadialGradient(1000, 1600, 0, 1000, 1600, 500);
  g2.addColorStop(0, 'rgba(37,99,235,0.14)');
  g2.addColorStop(1, 'transparent');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, 1080, 1920);

  // --- Layout constants ---
  // Canvas is 1080 x 1920. We have 3 cards to fit.
  // Header zone: ~340px. Branding footer: ~80px. Cards: 1500px total => 500px each.
  const CARD_W = 960;
  const CARD_X = 60;
  const CARD_H = 490;
  const CARD_GAP = 10;
  const INNER_X = 104;
  const INNER_W = 872; // 960 - 2*44 padding

  // --- Header ---
  ctx.textAlign = 'center';
  ctx.font = '600 26px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(167,139,250,0.9)';
  ctx.fillText('\u2708\uFE0F  VIBE TRAVEL', 540, 110);

  ctx.font = '300 28px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText('You wanted to feel...', 540, 164);

  // Vibe text — full wrap, no truncation
  ctx.font = '500 38px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  const vibeBottom = wrapText(ctx, `"${vibe}"`, 540, 218, 900, 50);

  // Divider
  const dividerY = vibeBottom + 30;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(120, dividerY); ctx.lineTo(960, dividerY); ctx.stroke();

  // --- Cards ---
  const top3 = destinations.slice(0, 3);
  // Distribute remaining space evenly
  const cardsStartY = dividerY + 20;
  let cardY = cardsStartY;

  top3.forEach((d) => {
    // Card background
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    roundRect(ctx, CARD_X, cardY, CARD_W, CARD_H, 28);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    roundRect(ctx, CARD_X, cardY, CARD_W, CARD_H, 28);
    ctx.stroke();

    let y = cardY + 52;

    // Region
    ctx.textAlign = 'left';
    ctx.font = '600 19px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(167,139,250,0.8)';
    ctx.fillText(d.region.toUpperCase(), INNER_X, y);
    y += 52;

    // Destination name
    ctx.font = '700 56px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText(d.name, INNER_X, y);
    y += 38;

    // Country
    ctx.font = '300 24px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.fillText(d.country, INNER_X, y);
    y += 42;

    // Tagline — full wrap, no truncation
    ctx.font = 'italic 300 25px Georgia, serif';
    ctx.fillStyle = 'rgba(196,181,253,0.8)';
    const taglineBottom = wrapText(ctx, `"${d.tagline}"`, INNER_X, y, INNER_W, 36, 'left');
    y = taglineBottom + 28;

    // Safety + cost + timing on one line
    const safetyColor = d.safetyStatus === 'green' ? '#4ade80' : d.safetyStatus === 'yellow' ? '#fbbf24' : '#f87171';
    const safetyIcon = d.safetyStatus === 'green' ? '\u2713' : d.safetyStatus === 'yellow' ? '\u26A0' : '\u2715';
    const safetyLabel = d.safetyStatus === 'green' ? 'All clear' : d.safetyStatus === 'yellow' ? 'Heads up' : 'Reconsider';
    const cost = d.costSignal === 'budget' ? '$' : d.costSignal === 'mid' ? '$$' : '$$$';

    ctx.font = '500 21px system-ui, sans-serif';
    // Safety badge
    ctx.fillStyle = safetyColor;
    ctx.fillText(`${safetyIcon} ${safetyLabel}`, INNER_X, y);
    // Measure safety text width to position cost after it
    const safetyW = ctx.measureText(`${safetyIcon} ${safetyLabel}`).width;
    // Dot separator + cost
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillText(`  \u00B7  ${cost}`, INNER_X + safetyW, y);
    const costW = ctx.measureText(`  \u00B7  ${cost}`).width;
    // Dot separator + timing — wrap if needed
    const timingX = INNER_X + safetyW + costW;
    ctx.fillText(`  \u00B7  `, timingX, y);
    const dotW = ctx.measureText(`  \u00B7  `).width;
    // Timing text — truncate only if extremely long
    const timing = d.bestTime.length > 40 ? d.bestTime.slice(0, 40) + '\u2026' : d.bestTime;
    ctx.fillText(timing, timingX + dotW, y);

    cardY += CARD_H + CARD_GAP;
  });

  // Bottom branding
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(120, 1840); ctx.lineTo(960, 1840); ctx.stroke();

  ctx.font = '500 26px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.textAlign = 'center';
  ctx.fillText('✈️  vibetravel.space', 540, 1890);

  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], 'vibe-travel-story.png', { type: 'image/png' });

    // Try native share sheet first (works on iOS/Android — opens Instagram Stories)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Vibe Travel', text: `My picks for: "${vibe}" ✈️` });
        return;
      } catch {
        // Cancelled or unsupported — fall through to download
      }
    }

    // Desktop fallback: download PNG
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'vibe-travel-story.png'; a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

export default function ExportBar({ destinations, vibe }: Props) {
  const btn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '10px 18px', borderRadius: 100,
    border: '1px solid var(--border)', background: 'var(--chip-bg)',
    color: 'var(--text-dim)', fontFamily: 'inherit',
    fontSize: 13, fontWeight: 500, cursor: 'pointer',
    transition: 'all 0.15s ease', whiteSpace: 'nowrap',
  };

  const hover = (e: React.MouseEvent<HTMLButtonElement>, enter: boolean) => {
    const el = e.currentTarget as HTMLButtonElement;
    el.style.borderColor = enter ? 'var(--accent-light)' : 'var(--border)';
    el.style.color = enter ? 'var(--text)' : 'var(--text-dim)';
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', padding: '24px 0 8px' }}>
      <button style={btn} onClick={() => downloadTxt(destinations, vibe)}
        onMouseEnter={e => hover(e, true)} onMouseLeave={e => hover(e, false)}>
        <FileText size={13} /> Export TXT
      </button>

      <button style={btn} onClick={() => openEmail(destinations, vibe)}
        onMouseEnter={e => hover(e, true)} onMouseLeave={e => hover(e, false)}>
        <Mail size={13} /> Email
      </button>

      <button
        style={{ ...btn, background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(37,99,235,0.15))', borderColor: 'rgba(167,139,250,0.3)', color: 'var(--accent-light)' }}
        onClick={() => generateAndShareStory(destinations, vibe)}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(124,58,237,0.2)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'; }}>
        <Share2 size={13} /> Share as Story ✈️
      </button>
    </div>
  );
}
