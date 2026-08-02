import { Music } from 'lucide-react';
import { useMusicPlayer } from './context/MusicPlayerContext';
import HomePanel from './components/HomePanel';
import SearchPanel from './components/SearchPanel';
import LocalPanel from './components/LocalPanel';
import PlaylistPanel from './components/PlaylistPanel';
import MiniPlayer from './components/MiniPlayer';
import BottomNav from './components/BottomNav';
import FullPlayer from './components/FullPlayer';
import PlaylistModal from './components/PlaylistModal';
import ShortcutModal from './components/ShortcutModal';
import Toast from './components/Toast';
import { Disc3, Keyboard } from 'lucide-react';

function App() {
  const { state, audioRef } = useMusicPlayer();
  const currentTab = state.activeTab || 'home';

  return (
    <div className="app">
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

      <FullPlayer />
      <PlaylistModal />
      <ShortcutModal />
      <Toast />
    </div>
  );
}

export default App;
