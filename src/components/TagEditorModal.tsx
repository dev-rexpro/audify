import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Music, Check } from 'lucide-react';
import type { Track } from '../stores/types';
import { useLibraryStore } from '../stores/libraryStore';
import { useMusicPlayer } from '../context/MusicPlayerContext';

interface TagEditorModalProps {
  track: Track | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TagEditorModal({ track, isOpen, onClose }: TagEditorModalProps) {
  const { showToast } = useMusicPlayer();
  const updateTrackMetadata = useLibraryStore(s => s.updateTrackMetadata);

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [lrc, setLrc] = useState('');
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (track) {
      setTitle(track.title || '');
      setArtist(track.artist || '');
      setAlbum(track.album || '');
      setCoverUrl(track.cover || null);
      setLrc(track.lrc || '');
    }
  }, [track]);

  if (!isOpen || !track) return null;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCoverUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    updateTrackMetadata(track.uid, {
      title: title.trim() || 'Unknown Title',
      artist: artist.trim() || 'Unknown Artist',
      album: album.trim(),
      cover: coverUrl,
      lrc: lrc.trim() || null
    });
    showToast('Track metadata updated');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          maxHeight: '85vh',
          background: 'var(--bg-main)',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Tag Editor</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', paddingRight: '4px', flex: 1 }}>
          {/* Cover Art Upload / Preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '16px', overflow: 'hidden',
              background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0, position: 'relative', border: '1px solid var(--border-subtle)'
            }}>
              {coverUrl ? (
                <img src={coverUrl} alt="Cover Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Music size={28} color="var(--text-secondary)" />
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '7px 12px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                onClick={() => coverInputRef.current?.click()}
              >
                <Upload size={14} />
                <span>Upload Cover Image</span>
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleImageFileChange}
              />
              <input
                className="input"
                type="text"
                placeholder="Or paste cover URL..."
                value={coverUrl || ''}
                onChange={e => setCoverUrl(e.target.value || null)}
                style={{ fontSize: '11px', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Title</label>
            <input
              className="input"
              type="text"
              placeholder="Song title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', fontSize: '13px' }}
            />
          </div>

          {/* Artist */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Artist</label>
            <input
              className="input"
              type="text"
              placeholder="Artist name"
              value={artist}
              onChange={e => setArtist(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', fontSize: '13px' }}
            />
          </div>

          {/* Album */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Album</label>
            <input
              className="input"
              type="text"
              placeholder="Album name"
              value={album}
              onChange={e => setAlbum(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', fontSize: '13px' }}
            />
          </div>

          {/* Synced LRC Lyrics */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>LRC Synced Lyrics</label>
            <textarea
              placeholder="Paste .lrc synced lyrics here (e.g. [00:12.34] Lyric line)..."
              value={lrc}
              onChange={e => setLrc(e.target.value)}
              rows={4}
              style={{
                width: '100%', padding: '9px 12px', borderRadius: '12px',
                border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)',
                fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-primary)', resize: 'vertical'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
          <button className="btn btn-secondary" style={{ flex: 1, borderRadius: '12px', padding: '10px', fontSize: '13px' }} onClick={onClose}>
            Cancel
          </button>
          <button className="btn" style={{ flex: 1, borderRadius: '12px', padding: '10px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={handleSave}>
            <Check size={16} />
            <span>Save Tag</span>
          </button>
        </div>
      </div>
    </div>
  );
}
