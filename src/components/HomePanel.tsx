import { useMusicPlayer } from '../context/MusicPlayerContext';
import { ChevronRight, Play } from 'lucide-react';
import PageHeader from './PageHeader';

export default function HomePanel() {
  const {
    state,
    playTrack,
    setSearchKeyword,
    search,
    setActiveTab,
    closeProviderModal
  } = useMusicPlayer();

  const navigateToSearch = (keyword?: string) => {
    if (keyword !== undefined) {
      setSearchKeyword(keyword);
    }
    closeProviderModal();
    setActiveTab('search');
    if (keyword) {
      search(true, keyword);
    } else {
      setTimeout(() => document.getElementById('search-input')?.focus(), 100);
    }
  };

  const handleCardClick = (query: string) => {
    const match = state.searchResults.find(t => t.title.toLowerCase().includes(query.toLowerCase()) || query.toLowerCase().includes(t.title.toLowerCase()))
      || state.favorites.find(t => t.title.toLowerCase().includes(query.toLowerCase()));

    if (match) {
      playTrack(match);
    } else {
      navigateToSearch(query);
    }
  };

  // Recently Played Items (Apple Music Style)
  const recentlyPlayed = [
    {
      id: 'rp-1',
      title: 'Creative Focus',
      subtitle: 'Apple Music Focus',
      query: 'Focus Chill',
      art: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&auto=format&fit=crop&q=80',
      graphicType: 'focus'
    },
    {
      id: 'rp-2',
      title: 'Immersive Gaming',
      subtitle: 'Apple Music Gaming',
      query: 'Gaming EDM',
      art: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&auto=format&fit=crop&q=80',
      graphicType: 'gaming'
    },
    {
      id: 'rp-3',
      title: 'Ad Infinitum',
      subtitle: 'The Stupendous Yuggoth',
      query: 'Ad Infinitum',
      art: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80'
    },
    {
      id: 'rp-4',
      title: 'Blinding Lights',
      subtitle: 'The Weeknd • After Hours',
      query: 'Blinding Lights The Weeknd',
      art: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80'
    },
    {
      id: 'rp-5',
      title: 'Lo-Fi Chill Beats',
      subtitle: 'Audify Ambient',
      query: 'Lo-Fi Chill',
      art: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80'
    }
  ];

  // Stations for You
  const stations = [
    {
      id: 'st-1',
      title: 'Chill Station',
      subtitle: 'Based on your likes',
      query: 'Chill Music',
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)'
    },
    {
      id: 'st-2',
      title: "Today's Hits",
      subtitle: 'Top 50 Global',
      query: 'Top Hits 2026',
      gradient: 'linear-gradient(135deg, #ea580c 0%, #9a3412 100%)'
    },
    {
      id: 'st-3',
      title: 'Acoustic Morning',
      subtitle: 'Soft Acoustic & Indie',
      query: 'Acoustic Songs',
      gradient: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)'
    }
  ];

  return (
    <div className="apple-home-container">
      <PageHeader 
        title="Home"
        rightContent={
          <div className="apple-profile-avatar" title="Account" style={{ margin: 0 }}>
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" alt="Profile" />
          </div>
        }
      />

      {/* Section 1: Top Picks for You */}
      <div className="apple-section">
        <div className="apple-section-header">
          <h2>Top Picks for You</h2>
        </div>

        <div className="top-picks-scroll">
          {/* Card 1: Replay */}
          <div className="top-pick-card replay-card" onClick={() => handleCardClick('Replay All Time')}>
            <div className="card-top-eyebrow">Replay</div>
            <div className="card-main-title">
              <span className="replay-sub">Replay</span>
              <span className="replay-big">All<br />Time</span>
            </div>
            <div className="card-bottom-info">
              <p>StackOne, Dualizm, Evil Needle, Dr. Dundiff, Misha, imagiro and more</p>
            </div>
            <div className="card-play-btn">
              <Play size={16} fill="white" color="white" />
            </div>
          </div>

          {/* Card 2: Friends Mix */}
          <div className="top-pick-card friends-card" onClick={() => handleCardClick('Friends Mix')}>
            <div className="card-top-eyebrow">Made for You</div>
            <div className="card-brand-logo">Music</div>
            <div className="card-main-title">
              <span className="friends-big">Friends<br />Mix</span>
            </div>
            <div className="card-bottom-info">
              <p>Cardi B, Offset, Kendrick, Notorious B.I.G., JID and more</p>
            </div>
            <div className="card-play-btn">
              <Play size={16} fill="white" color="white" />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Recently Played */}
      <div className="apple-section">
        <div className="apple-section-header clickable" onClick={() => navigateToSearch('Recently Played')}>
          <h2>Recently Played</h2>
          <ChevronRight size={18} className="chevron-icon" />
        </div>

        <div className="horizontal-cards-scroll">
          {recentlyPlayed.map((item) => (
            <div key={item.id} className="square-media-card" onClick={() => handleCardClick(item.query)}>
              <div className="media-art-box">
                {item.graphicType === 'focus' ? (
                  <div className="custom-art focus-art">
                    <div className="wave-lines-box">
                      <div className="wline wl1"></div>
                      <div className="wline wl2"></div>
                      <div className="wline wl3"></div>
                      <div className="wline wl4"></div>
                    </div>
                    <span className="art-brand">Music</span>
                    <span className="art-title-text">Creative Focus</span>
                  </div>
                ) : item.graphicType === 'gaming' ? (
                  <div className="custom-art gaming-art">
                    <div className="poly-shape"></div>
                    <span className="art-brand">Music</span>
                    <span className="art-title-text">Immersive<br />Gaming</span>
                  </div>
                ) : (
                  <img src={item.art} alt={item.title} />
                )}
                <div className="hover-play-icon">
                  <Play size={18} fill="white" color="white" />
                </div>
              </div>
              <div className="media-info">
                <span className="media-title">{item.title}</span>
                <span className="media-sub">{item.subtitle}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Stations for You */}
      <div className="apple-section">
        <div className="apple-section-header clickable" onClick={() => navigateToSearch('Radio')}>
          <h2>Stations for You</h2>
          <ChevronRight size={18} className="chevron-icon" />
        </div>

        <div className="horizontal-cards-scroll">
          {stations.map((st) => (
            <div key={st.id} className="square-media-card" onClick={() => handleCardClick(st.query)}>
              <div className="media-art-box station-art" style={{ background: st.gradient }}>
                <div className="station-circle">
                  <Play size={20} fill="white" color="white" />
                </div>
              </div>
              <div className="media-info">
                <span className="media-title">{st.title}</span>
                <span className="media-sub">{st.subtitle}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
