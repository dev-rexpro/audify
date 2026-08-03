import { useMusicPlayer } from '../context/MusicPlayerContext';
import { Home, Search, HardDrive, Library } from 'lucide-react';

export default function BottomNav() {
  const { state, setActiveTab, toggleSearchTab } = useMusicPlayer();
  const currentTab = state.activeTab || 'home';

  return (
    <div className="floating-nav-row">
      <div className="bottom-nav-pill">
        <button
          className={`nav-btn ${currentTab === 'home' ? 'active' : ''}`}
          data-target="view-home"
          onClick={() => setActiveTab('home')}
        >
          <Home className="nav-icon mb-1" size={26} />
          <span>Home</span>
        </button>
        <button
          className={`nav-btn ${currentTab === 'local' ? 'active' : ''}`}
          data-target="view-local"
          onClick={() => setActiveTab('local')}
        >
          <HardDrive className="nav-icon mb-1" size={26} />
          <span>Devices</span>
        </button>
        <button
          className={`nav-btn ${currentTab === 'playlist' ? 'active' : ''}`}
          data-target="view-playlist"
          onClick={() => setActiveTab('playlist')}
        >
          <Library className="nav-icon mb-1" size={26} />
          <span>Library</span>
        </button>
      </div>
      <div
        className={`nav-search-circle ${currentTab === 'search' ? 'active' : ''}`}
        title="Search"
        onClick={() => toggleSearchTab()}
      >
        <Search size={25} color={currentTab === 'search' ? 'var(--accent)' : '#000000'} />
      </div>
    </div>
  );
}
