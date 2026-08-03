import React, { useState, useEffect } from 'react';
import { Music } from 'lucide-react';
import { useMusicPlayer } from './context/MusicPlayerContext';
import HomePanel from './components/HomePanel';
import SearchPanel from './components/SearchPanel';
import LocalPanel from './components/LocalPanel';
import PlaylistPanel from './components/PlaylistPanel';
import MiniPlayer from './components/MiniPlayer';
import BottomNav from './components/BottomNav';

import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { restoreAppPersistence, saveLastPlayState } from './utils/playerPersistence';

import PlaylistModal from './components/PlaylistModal';
import ShortcutModal from './components/ShortcutModal';
import Toast from './components/Toast';

const LazyFullPlayer = React.lazy(() => import('./components/FullPlayer').then(m => ({ default: m.default })));

function App() {
  const { state, audioRef } = useMusicPlayer();
  useKeyboardShortcuts();
  const currentTab = state.activeTab || 'home';
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    restoreAppPersistence();

    const handleSave = () => saveLastPlayState();
    window.addEventListener('beforeunload', handleSave);
    document.addEventListener('visibilitychange', handleSave);

    const timer = setInterval(() => {
      saveLastPlayState();
    }, 3000);

    return () => {
      saveLastPlayState();
      window.removeEventListener('beforeunload', handleSave);
      document.removeEventListener('visibilitychange', handleSave);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="app">
      {isOffline && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: '#ff3b30', color: '#fff', textAlign: 'center',
          padding: '8px 16px', fontSize: '13px', fontWeight: 600
        }}>
          You are offline — only downloaded tracks are available
        </div>
      )}
      <main className="layout">
        <section id="view-home" className={`view-section home-panel ${currentTab === 'home' ? 'active' : ''}`}>
          <HomePanel />
        </section>

        <section id="view-search" className={`view-section search-panel ${currentTab === 'search' ? 'active' : ''}`}>
          <SearchPanel />
        </section>

        <div id="view-player" style={{ display: 'none' }}>
          {state.currentTrack?.cover ? <img id="cover-img" src={state.currentTrack.cover} alt="" /> : null}
          <div className="cover-placeholder">
            <Music size={48} color="rgba(255,255,255,0.4)" strokeWidth={1.5} />
          </div>
          <div id="track-title">No Track Selected</div>
          <div id="track-artist">Select music to start</div>
          <span id="track-source-pill" className="source-pill"></span>
          <span id="track-quality-pill" className="lossless-pill">LOSSLESS</span>
          <div id="player-status" data-i18n="playerStatusIdle">Idle</div>
        </div>
        <audio id="audio" ref={audioRef} preload="metadata" />

        <section id="view-local" className={`view-section local-panel ${currentTab === 'local' ? 'active' : ''}`}>
          <LocalPanel />
        </section>

        <section id="view-playlist" className={`view-section playlist-panel ${currentTab === 'playlist' ? 'active' : ''}`}>
          <PlaylistPanel />
        </section>
      </main>

      <div className="floating-ui-container">
        <MiniPlayer />
        <BottomNav />
      </div>

      <React.Suspense fallback={null}>
        <LazyFullPlayer />
      </React.Suspense>
      <PlaylistModal />
      <ShortcutModal />
      <Toast />
    </div>
  );
}

export default App;
