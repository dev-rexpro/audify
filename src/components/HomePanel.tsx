import { useEffect } from 'react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { usePlayerStore } from '../stores/playerStore';
import { ChevronRight, Play, Music as MusicIcon, Sparkles } from 'lucide-react';
import PageHeader from './PageHeader';

export default function HomePanel() {
  const {
    state,
    playTrack,
    setSearchKeyword,
    search,
    setActiveTab,
    closeProviderModal,
    switchLibraryTab
  } = useMusicPlayer();

  const recentlyPlayedTracks = usePlayerStore(s => s.recentlyPlayed);
  const recommendedTracks = usePlayerStore(s => s.recommendedTracks);
  const fetchRecommendations = usePlayerStore(s => s.fetchRecommendations);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

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

  const handlePlayAllFavorites = () => {
    if (state.favorites.length > 0) {
      playTrack(state.favorites[0], { type: 'favorites', index: 0, playlistId: null });
    } else if (recentlyPlayedTracks.length > 0) {
      playTrack(recentlyPlayedTracks[0]);
    } else {
      navigateToSearch('Top Hits');
    }
  };

  const handleOpenRecentlyPlayedLibrary = () => {
    switchLibraryTab('recentlyPlayed');
    setActiveTab('playlist');
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

  // Stations for You (YouTube Music Style Artist Cards & Badges)
  const stations = [
    {
      id: 'st-1',
      title: 'Feel-Good Pop & Rock',
      subtitle: 'Ed Sheeran, Imagine Dragons, Coldplay',
      query: 'Ed Sheeran Pop Rock',
      badge: 'Pop & Rock',
      badgeBg: 'linear-gradient(90deg, #d97706 0%, #b45309 100%)',
      art: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80'
    },
    {
      id: 'st-2',
      title: "I'm So Indie",
      subtitle: 'Sal Priadi, Hindia, Kunto Aji, Fourtwnty',
      query: 'Indie Indonesia',
      badge: 'Indie Banget',
      badgeBg: 'linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%)',
      art: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80'
    },
    {
      id: 'st-3',
      title: 'Chill R&B',
      subtitle: 'SZA, Summer Walker, Kehlani, Daniel Caesar',
      query: 'Chill R&B',
      badge: 'Chill R&B',
      badgeBg: 'linear-gradient(90deg, #9333ea 0%, #7e22ce 100%)',
      art: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&auto=format&fit=crop&q=80'
    },
    {
      id: 'st-4',
      title: 'Feel-Good R&B Pop',
      subtitle: 'Ariana Grande, Bruno Mars, Jaz',
      query: 'R&B Pop Hits',
      badge: 'Feel Good',
      badgeBg: 'linear-gradient(90deg, #e11d48 0%, #be123c 100%)',
      art: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80'
    }
  ];

  return (
    <div className="apple-home-container">
      <PageHeader 
        title="Home"
      />

      {/* Section 1: Top Picks for You */}
      <div className="apple-section">
        <div className="apple-section-header">
          <h2>Top Picks for You</h2>
        </div>

        <div className="top-picks-scroll">
          {/* Card 1: Replay */}
          <div className="top-pick-card replay-card" onClick={handlePlayAllFavorites}>
            <div className="card-top-eyebrow">Replay</div>
            <div className="card-main-title">
              <span className="replay-sub">Replay</span>
              <span className="replay-big">All<br />Time</span>
            </div>
            <div className="card-bottom-info">
              <p>{state.favorites.length > 0 ? `${state.favorites.length} Favorite Songs ready to play` : 'Listen to your top favorite songs'}</p>
            </div>
            <div className="card-play-btn">
              <Play size={16} fill="white" color="white" />
            </div>
          </div>

          {/* Card 2: Friends Mix */}
          <div className="top-pick-card friends-card" onClick={() => navigateToSearch('Pop Hits')}>
            <div className="card-top-eyebrow">Made for You</div>
            <div className="card-brand-logo">Music</div>
            <div className="card-main-title">
              <span className="friends-big">Friends<br />Mix</span>
            </div>
            <div className="card-bottom-info">
              <p>Curated mix based on popular trending tracks</p>
            </div>
            <div className="card-play-btn">
              <Play size={16} fill="white" color="white" />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Recently Played */}
      <div className="apple-section">
        <div className="apple-section-header clickable" onClick={handleOpenRecentlyPlayedLibrary}>
          <h2>Recently Played</h2>
          <ChevronRight size={18} className="chevron-icon" />
        </div>

        <div className="horizontal-cards-scroll">
          {recentlyPlayedTracks.length > 0 ? (
            recentlyPlayedTracks.map((track) => (
              <div key={'recent-' + track.uid} className="square-media-card" onClick={() => playTrack(track)}>
                <div className="media-art-box">
                  {track.cover ? (
                    <img src={track.cover} alt={track.title} />
                  ) : (
                    <div className="custom-art focus-art">
                      <MusicIcon size={32} color="white" />
                    </div>
                  )}
                  <div className="hover-play-icon">
                    <Play size={18} fill="white" color="white" />
                  </div>
                </div>
                <div className="media-info">
                  <span className="media-title">{track.title || 'Unknown Track'}</span>
                  <span className="media-sub">{track.artist || 'Unknown Artist'}</span>
                </div>
              </div>
            ))
          ) : (
            recentlyPlayed.map((item) => (
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
            ))
          )}
        </div>
      </div>

      {/* Section 3: Recommended for You */}
      {recommendedTracks.length > 0 && (
        <div className="apple-section">
          <div className="apple-section-header">
            <h2>Recommended for You</h2>
          </div>

          <div className="horizontal-cards-scroll">
            {recommendedTracks.map((track) => (
              <div key={'rec-' + track.uid} className="square-media-card" onClick={() => playTrack(track)}>
                <div className="media-art-box">
                  {track.cover ? (
                    <img src={track.cover} alt={track.title} />
                  ) : (
                    <div className="custom-art focus-art">
                      <MusicIcon size={32} color="white" />
                    </div>
                  )}
                  <div className="hover-play-icon">
                    <Play size={18} fill="white" color="white" />
                  </div>
                </div>
                <div className="media-info">
                  <span className="media-title">{track.title || 'Unknown Track'}</span>
                  <span className="media-sub">{track.artist || 'Unknown Artist'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 4: Stations for You */}
      <div className="apple-section">
        <div className="apple-section-header clickable" onClick={() => navigateToSearch('Radio')}>
          <h2>Stations for You</h2>
          <ChevronRight size={18} className="chevron-icon" />
        </div>

        <div className="horizontal-cards-scroll">
          {stations.map((st) => (
            <div key={st.id} className="square-media-card" onClick={() => handleCardClick(st.query)}>
              <div className="media-art-box" style={{ position: 'relative' }}>
                <img src={st.art} alt={st.title} />
                {st.badge && (
                  <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '8px',
                    right: '8px',
                    padding: '5px 10px',
                    borderRadius: '8px',
                    background: st.badgeBg || 'rgba(0,0,0,0.6)',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    pointerEvents: 'none'
                  }}>
                    {st.badge}
                  </div>
                )}
                <div className="hover-play-icon">
                  <Play size={18} fill="white" color="white" />
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
