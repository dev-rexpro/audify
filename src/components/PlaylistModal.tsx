import { useState, useRef, useEffect } from 'react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { X } from 'lucide-react';

export default function PlaylistModal() {
  const { createPlaylist } = useMusicPlayer();
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const open = () => {
    setShow(true);
    setName('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const close = () => setShow(false);

  const handleSave = () => {
    createPlaylist(name);
    close();
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && show) close();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [show]);

  return (
    <div id="playlist-modal" className={`modal-backdrop ${show ? 'show' : ''}`}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span style={{ fontWeight: 700, fontSize: '18px' }}>Create Playlist</span>
          </div>
          <button id="playlist-close" className="modal-close-btn" onClick={close}><X size={18} strokeWidth={1.8} /></button>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>Enter a name for your new playlist</p>
        <input
          id="playlist-name-input"
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          type="text"
          placeholder="My Playlist"
        />
        <div className="modal-actions">
          <button id="playlist-cancel-btn" className="btn btn-ghost" onClick={close}>Cancel</button>
          <button id="playlist-confirm-btn" className="btn" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
