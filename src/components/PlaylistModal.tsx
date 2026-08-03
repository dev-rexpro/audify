import { useState, useRef, useEffect } from 'react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { X } from 'lucide-react';

export default function PlaylistModal() {
  const { state, createPlaylist, closePlaylistModal } = useMusicPlayer();
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const show = state.showPlaylistModal;

  useEffect(() => {
    if (show) {
      setName('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [show]);

  const handleSave = () => {
    if (!name.trim()) return;
    createPlaylist(name);
    setName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && show) closePlaylistModal();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [show, closePlaylistModal]);

  return (
    <div id="playlist-modal" className={`modal-backdrop ${show ? 'show' : ''}`} onClick={closePlaylistModal}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span style={{ fontWeight: 700, fontSize: '18px' }}>Create Playlist</span>
          </div>
          <button id="playlist-close" className="modal-close-btn" onClick={closePlaylistModal}><X size={18} strokeWidth={1.8} /></button>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>Enter a name for your new playlist</p>
        <input
          id="playlist-name-input"
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          type="text"
          placeholder="My Playlist"
        />
        <div className="modal-actions">
          <button id="playlist-cancel-btn" className="btn btn-ghost" onClick={closePlaylistModal}>Cancel</button>
          <button id="playlist-confirm-btn" className="btn" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
