import { useRef, useEffect } from 'react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { Disc3, Keyboard, X } from 'lucide-react';

export default function Header() {
  const { showToast } = useMusicPlayer();
  const shortcutBtnRef = useRef<HTMLButtonElement>(null);
  const shortcutModalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const btn = shortcutBtnRef.current;
    const modal = shortcutModalRef.current;
    if (!btn || !modal) return;
    const open = () => modal.classList.add('show');
    const close = () => modal.classList.remove('show');
    btn.addEventListener('click', open);
    modal.addEventListener('click', (e: any) => { if (e.target === modal) close(); });
    return () => {
      btn.removeEventListener('click', open);
      modal.removeEventListener('click', close);
    };
  }, []);

  return (
    <>
      <header>
        <div className="logo-area">
          <div className="brand-box">
            <Disc3 size={24} />
          </div>
          <div className="title-text">
            <h1 data-i18n="appTitle">Audify</h1>
            <p data-i18n="authorLabel">Web Audio Experience</p>
          </div>
        </div>
        <div className="header-controls">
          <button ref={shortcutBtnRef} id="shortcut-toggle-btn" className="shortcut-toggle-btn btn btn-secondary btn-icon" title="Shortcuts">
            <Keyboard size={18} />
          </button>
        </div>
      </header>
      <div id="shortcut-modal" ref={shortcutModalRef} className="modal-backdrop">
        <div className="modal">
          <div className="modal-header">
            <div className="modal-title-wrap">
              <span data-i18n="shortcutPanelTitle" style={{ fontWeight: 700, fontSize: '18px' }}>Keyboard Shortcuts</span>
            </div>
            <button className="modal-close-btn" onClick={() => shortcutModalRef.current?.classList.remove('show')}><X size={18} strokeWidth={1.8} /></button>
          </div>
          <div className="shortcut-grid">
            <div className="shortcut-card"><span className="shortcut-label">Play / Pause</span><kbd>Space</kbd></div>
            <div className="shortcut-card"><span className="shortcut-label">Seek 5s</span><kbd>← / →</kbd></div>
            <div className="shortcut-card"><span className="shortcut-label">Volume</span><kbd>↑ / ↓</kbd></div>
            <div className="shortcut-card"><span className="shortcut-label">Next / Prev</span><kbd>N / P</kbd></div>
            <div className="shortcut-card"><span className="shortcut-label">Favorite</span><kbd>F</kbd></div>
            <div className="shortcut-card"><span className="shortcut-label">Mute</span><kbd>M</kbd></div>
          </div>
        </div>
      </div>
    </>
  );
}
