'use client';
import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { DestinationTags, TagEntry, SavedTrip } from '@/types';

type DrawerTab = 'saved' | 'wishlist' | 'visited' | 'dna';

const DNA_FIELDS = [
  { key: 'travelerType', placeholder: 'What kind of traveler are you? (e.g. photographer, slow traveler, foodie)' },
  { key: 'alwaysSeek', placeholder: 'What do you always seek out? (e.g. hidden coffee shops, street art, local markets)' },
  { key: 'ruinsTrip', placeholder: 'What ruins a trip for you? (e.g. tourist traps, loud resorts, no wifi)' },
  { key: 'extraContext', placeholder: 'Anything else? (e.g. solo traveler, always bring a camera, vegetarian)' },
];

function relativeDate(ts?: number): string {
  if (!ts) return '';
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  initialTab?: DrawerTab;
  savedTrips: SavedTrip[];
  onRestoreTrip: (trip: SavedTrip) => void;
  onDeleteTrip: (vibe: string) => void;
  destinationTags: DestinationTags;
  onRemoveTag: (key: string) => void;
  onFindSimilar: (entry: TagEntry) => void;
  onWhereNext: () => void;
  dnaProfile: { travelerType: string; alwaysSeek: string; ruinsTrip: string; extraContext: string };
  onDnaChange: (field: string, value: string) => void;
  onSaveDna: () => void;
  onClearDna: () => void;
  dnaSaved: boolean;
  pastVibesCount: number;
}

function SavedTab({ savedTrips, onRestoreTrip, onDeleteTrip }: {
  savedTrips: SavedTrip[];
  onRestoreTrip: (trip: SavedTrip) => void;
  onDeleteTrip: (vibe: string) => void;
}) {
  if (!savedTrips.length) {
    return (
      <div className="vt-drawer-empty">
        <span>🗂</span>
        <p>No saved trips yet.</p>
        <p>After a search, tap &quot;Save this trip&quot; to keep it here.</p>
      </div>
    );
  }
  return (
    <>
      {savedTrips.map(trip => (
        <div key={trip.vibe} className="vt-saved-card">
          <div className="vt-saved-card-header">
            <span className="vt-saved-card-vibe">{trip.vibe}</span>
            {trip.savedAt && <span className="vt-saved-card-date">{relativeDate(trip.savedAt)}</span>}
            <button className="vt-saved-delete" onClick={() => onDeleteTrip(trip.vibe)} title="Remove">×</button>
          </div>
          {trip.destinations?.length > 0 && (
            <div className="vt-saved-card-destinations">
              {trip.destinations.map((d, i) => (
                <span key={i} className="vt-saved-dest-preview">{d.vibeEmoji} {d.name}</span>
              ))}
            </div>
          )}
          <button className="vt-saved-card-restore" onClick={() => onRestoreTrip(trip)}>
            Restore this trip
          </button>
        </div>
      ))}
    </>
  );
}

function WishlistTab({ entries, onRemove, onFindSimilar }: {
  entries: [string, TagEntry][];
  onRemove: (key: string) => void;
  onFindSimilar: (entry: TagEntry) => void;
}) {
  if (!entries.length) {
    return (
      <div className="vt-drawer-empty">
        <span>♡</span>
        <p>No wishlisted places yet.</p>
        <p>Tap ♡ on any destination card to add it here.</p>
      </div>
    );
  }
  return (
    <>
      {entries.map(([key, entry]) => (
        <div key={key} className="vt-drawer-tag-card">
          <div className="vt-drawer-tag-card-top">
            <span className="vt-drawer-tag-emoji">{entry.vibeEmoji}</span>
            <div className="vt-drawer-tag-info">
              <strong>{entry.name}</strong>
              <span>{entry.country} · {entry.region}</span>
            </div>
            <button className="vt-drawer-remove" onClick={() => onRemove(key)}>×</button>
          </div>
          <p className="vt-drawer-tag-tagline">&ldquo;{entry.tagline}&rdquo;</p>
          <button className="vt-drawer-find-similar" onClick={() => onFindSimilar(entry)}>
            Find similar →
          </button>
        </div>
      ))}
    </>
  );
}

function VisitedTab({ entries, onRemove, onWhereNext }: {
  entries: [string, TagEntry][];
  onRemove: (key: string) => void;
  onWhereNext: () => void;
}) {
  if (!entries.length) {
    return (
      <div className="vt-drawer-empty">
        <span>✓</span>
        <p>No visited places yet.</p>
        <p>Tap ✓ on any destination card to mark it as visited.</p>
      </div>
    );
  }
  return (
    <>
      {entries.length >= 2 && (
        <button className="vt-drawer-where-next" onClick={onWhereNext}>
          Where next? →
        </button>
      )}
      {entries.map(([key, entry]) => (
        <div key={key} className="vt-drawer-tag-card">
          <div className="vt-drawer-tag-card-top">
            <span className="vt-drawer-tag-emoji">{entry.vibeEmoji}</span>
            <div className="vt-drawer-tag-info">
              <strong>{entry.name}</strong>
              <span>{entry.country} · {entry.region}</span>
            </div>
            <button className="vt-drawer-remove" onClick={() => onRemove(key)}>×</button>
          </div>
          <p className="vt-drawer-tag-tagline">&ldquo;{entry.tagline}&rdquo;</p>
        </div>
      ))}
    </>
  );
}

function DnaTab({ dnaProfile, onDnaChange, onSaveDna, onClearDna, dnaSaved }: {
  dnaProfile: { travelerType: string; alwaysSeek: string; ruinsTrip: string; extraContext: string };
  onDnaChange: (field: string, value: string) => void;
  onSaveDna: () => void;
  onClearDna: () => void;
  dnaSaved: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <p className="vt-drawer-dna-note">
        Your DNA shapes every search and personalizes vibe chips — silently.
        {dnaSaved && ' ✓ Profile saved.'}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
        {DNA_FIELDS.map(field => (
          <input
            key={field.key}
            className="vt-dna-input"
            placeholder={field.placeholder}
            value={dnaProfile[field.key as keyof typeof dnaProfile]}
            onChange={e => onDnaChange(field.key, e.target.value)}
          />
        ))}
      </div>
      <div className="vt-dna-footer" style={{ marginTop: 12, paddingLeft: 0, paddingRight: 0 }}>
        <button className="vt-dna-clear" onClick={onClearDna}>Clear</button>
        <button className="vt-dna-save" onClick={onSaveDna}>
          <Sparkles size={11} /> Save DNA
        </button>
      </div>
      {dnaSaved && (
        
      )}
    </div>
  );
}

export default function Drawer({
  open,
  onClose,
  initialTab = 'saved',
  savedTrips,
  onRestoreTrip,
  onDeleteTrip,
  destinationTags,
  onRemoveTag,
  onFindSimilar,
  onWhereNext,
  dnaProfile,
  onDnaChange,
  onSaveDna,
  onClearDna,
  dnaSaved,
  pastVibesCount,
}: DrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>(initialTab);

  useEffect(() => {
    if (open) setActiveTab(initialTab);
  }, [open, initialTab]);

  const allEntries = Object.entries(destinationTags);
  const wishlistEntries = allEntries.filter(([, e]) => e.tag === 'wishlist');
  const visitedEntries = allEntries.filter(([, e]) => e.tag === 'visited');

  const tabs: { id: DrawerTab; label: string; icon: string }[] = [
    { id: 'saved', label: 'Saved', icon: '🗂' },
    { id: 'wishlist', label: 'Wishlist', icon: '♥' },
    { id: 'visited', label: 'Visited', icon: '✓' },
    { id: 'dna', label: 'DNA', icon: '🧬' },
  ];

  return (
    <>
      {open && <div className="vt-drawer-backdrop" onClick={onClose} />}

      <div className={`vt-drawer${open ? ' open' : ''}`} role="dialog" aria-modal="true">
        {/* Header */}
        <div className="vt-drawer-header">
          <span className="vt-drawer-title">My Travel</span>
          <button className="vt-drawer-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Stats bar */}
        <div className="vt-drawer-stats">
          <span>{wishlistEntries.length} wishlisted</span>
          <span className="vt-drawer-stats-dot" />
          <span>{visitedEntries.length} visited</span>
          <span className="vt-drawer-stats-dot" />
          <span>{pastVibesCount} search{pastVibesCount !== 1 ? 'es' : ''}</span>
        </div>

        {/* Tabs */}
        <div className="vt-drawer-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`vt-drawer-tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="vt-drawer-content">
          {activeTab === 'saved' && (
            <SavedTab savedTrips={savedTrips} onRestoreTrip={onRestoreTrip} onDeleteTrip={onDeleteTrip} />
          )}
          {activeTab === 'wishlist' && (
            <WishlistTab entries={wishlistEntries} onRemove={onRemoveTag} onFindSimilar={onFindSimilar} />
          )}
          {activeTab === 'visited' && (
            <VisitedTab entries={visitedEntries} onRemove={onRemoveTag} onWhereNext={onWhereNext} />
          )}
          {activeTab === 'dna' && (
            <DnaTab
              dnaProfile={dnaProfile}
              onDnaChange={onDnaChange}
              onSaveDna={onSaveDna}
              onClearDna={onClearDna}
              dnaSaved={dnaSaved}
            />
          )}
        </div>
      </div>
    </>
  );
}
