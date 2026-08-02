import { useState, Fragment } from 'react';
import { useMusicPlayer, Track, Playlist, SYSTEM_DOWNLOADED_ID } from '../context/MusicPlayerContext';
import { Play, Heart, Trash2, Plus, ListMusic, ArrowDownToLine, Folder, ChevronRight, Repeat, Repeat1, Shuffle, ChevronDown, ListPlus, ChevronLeft, Download, Music as MusicIcon, MoreVertical } from 'lucide-react';

export default function PlaylistPanel() {
  const {
    state,
    switchLibraryTab,
    openPlaylistDetail,
    handleBackNavigation,
    playFromList,
    toggleFavorite,
    addToQueue,
    handleDownloadTrack,
    removeTrackFromCurrentPlaylist,
    deleteSelectedPlaylist,
    createPlaylist,
    togglePlayMode,
    openPlaylistModal
  } = useMusicPlayer();

  const [showNewPopover, setShowNewPopover] = useState(false);
  const [activeMenuUid, setActiveMenuUid] = useState<string | null>(null);
  const currentView = state.activeLibraryView || 'root';

  const getSourceKey = (source: string) => {
    if (source === 'qq') return 'QQ Music';
    if (source === 'joox') return 'JOOX';
    if (source === 'netease') return 'Netease';
    return 'Kuwo';
  };

  const isCustomPlaylist = (currentView === 'playlists' && !!state.selectedPlaylistId && state.selectedPlaylistId !== SYSTEM_DOWNLOADED_ID);

  const backBtnText = (currentView === 'playlists' && !!state.selectedPlaylistId)
    ? 'Back to Playlists'
    : 'Back to Library';

  const userPlaylists = state.playlists.filter(p => !p.isSystem && p.id !== SYSTEM_DOWNLOADED_ID);

  const getInterleaved = (): Track[] => {
    const grouped: Record<string, Track[]> = { qq: [], joox: [], netease: [], kuwo: [] };
    state.searchResults.forEach(t => { if (grouped[t.source]) grouped[t.source].push(t); });
    Object.keys(grouped).forEach(k => grouped[k].sort((a, b) => (a.displayIndex || 0) - (b.displayIndex || 0)));
    const order = ['qq', 'joox', 'netease', 'kuwo'];
    const idx: Record<string, number> = { qq: 0, joox: 0, netease: 0, kuwo: 0 };
    const out: Track[] = [];
    let added = true;
    while (added) {
      added = false;
      for (const s of order) {
        const arr = grouped[s];
        const i = idx[s];
        if (arr && i < arr.length) { out.push(arr[i]); idx[s]++; added = true; }
      }
    }
    return out;
  };

  const getPlaylistTracks = () => {
    if (currentView === 'results') return getInterleaved();
    if (currentView === 'favorites') return state.favorites;
    if (currentView === 'downloaded') {
      const pl = state.playlists.find(p => p.id === SYSTEM_DOWNLOADED_ID);
      return pl ? pl.tracks : state.downloads;
    }
    if (currentView === 'playlists' && state.selectedPlaylistId) {
      const pl = state.playlists.find(p => p.id === state.selectedPlaylistId);
      return pl ? pl.tracks : [];
    }
    return [];
  };

  const tracks = getPlaylistTracks();

  const getPlaylistInfoText = () => {
    if (currentView === 'results') return 'Search Results';
    if (currentView === 'favorites') return 'Favorite Songs';
    if (currentView === 'downloaded') return 'Downloaded';
    if (currentView === 'playlists') {
      if (state.selectedPlaylistId) {
        const pl = state.playlists.find(p => p.id === state.selectedPlaylistId);
        return pl ? pl.name : 'Playlist';
      }
      return 'Playlists';
    }
    return 'Library';
  };

  return (
    <Fragment>
      {/* ROOT LIBRARY VIEW (CATEGORY MENU) */}
      {currentView === 'root' && (
        <div id="library-root-view">
          <div className="panel-header">
            <div className="panel-title"><span>Library</span></div>
          </div>
          <div id="apple-category-list" className="apple-category-list">
            <div className="apple-category-item" onClick={() => switchLibraryTab('playlists')}>
              <div className="apple-category-left">
                <ListMusic size={22} color="var(--accent)" />
                <span>Playlists</span>
              </div>
              <div className="apple-category-right"><ChevronRight size={18} /></div>
            </div>
            <div className="apple-category-item" onClick={() => switchLibraryTab('favorites')}>
              <div className="apple-category-left">
                <Heart size={22} color="var(--accent)" />
                <span>Favorite Songs</span>
              </div>
              <div className="apple-category-right"><ChevronRight size={18} /></div>
            </div>
            <div className="apple-category-item" onClick={() => switchLibraryTab('downloaded')}>
              <div className="apple-category-left">
                <ArrowDownToLine size={22} color="var(--accent)" />
                <span>Downloaded</span>
              </div>
              <div className="apple-category-right"><ChevronRight size={18} /></div>
            </div>
            <div className="apple-category-item" onClick={() => switchLibraryTab('results')}>
              <div className="apple-category-left">
                <MusicIcon size={22} color="var(--accent)" />
                <span>Search Results</span>
              </div>
              <div className="apple-category-right"><ChevronRight size={18} /></div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-PAGE FULL PAGE CONTAINER */}
      {currentView !== 'root' && (
        <div className="playlist-main" id="playlist-main" style={{ display: 'block' }}>
          <div className="playlist-bar">
            {/* BACK HEADER */}
            <div id="playlist-detail-header" className="playlist-detail-header" style={{ display: 'flex' }}>
              <button id="back-header-btn" className="back-playlists-btn" onClick={handleBackNavigation}>
                <ChevronLeft size={20} />
                <span id="back-btn-text">{backBtnText}</span>
              </button>
              {isCustomPlaylist && (
                <div id="playlist-detail-tools" style={{ display: 'flex', gap: '8px' }}>
                  <button id="delete-playlist-btn" className="btn btn-ghost" onClick={() => deleteSelectedPlaylist()}>Delete</button>
                </div>
              )}
            </div>

            <div className="playlist-top-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 10px' }}>
              <span id="playlist-info" className="playlist-info" style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 700 }}>
                {getPlaylistInfoText()}
              </span>
              <div className="playmode-row">
                <button className={`playmode-btn ${state.playMode === 'list' ? 'active' : ''}`} data-mode="list" title="Loop List" onClick={() => togglePlayMode('list')}><Repeat size={16} /></button>
                <button className={`playmode-btn ${state.playMode === 'single' ? 'active' : ''}`} data-mode="single" title="Repeat Single" onClick={() => togglePlayMode('single')}><Repeat1 size={16} /></button>
                <button className={`playmode-btn ${state.playMode === 'shuffle' ? 'active' : ''}`} data-mode="shuffle" title="Shuffle" onClick={() => togglePlayMode('shuffle')}><Shuffle size={16} /></button>
              </div>
            </div>

            {/* PLAYLIST ACTIONS (FOR PLAYLISTS TAB ROOT) */}
            {currentView === 'playlists' && !state.selectedPlaylistId && (
              <div id="playlist-folder-actions" className="playlist-file-actions" style={{ display: 'flex', marginBottom: '14px', position: 'relative' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button id="new-playlist-btn" className="btn btn-ghost" onClick={() => setShowNewPopover(!showNewPopover)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={16} />
                    <span>New</span>
                    <ChevronDown size={14} />
                  </button>
                  <button id="import-playlist-btn" className="btn btn-ghost">Import</button>
                  <button id="export-playlist-btn" className="btn btn-ghost">Export</button>
                </div>

                {showNewPopover && (
                  <div id="playlist-popover-menu" className="ios-popover-menu show" style={{ top: '42px', left: 0 }}>
                    <button className="ios-popover-item" onClick={() => { setShowNewPopover(false); openPlaylistModal(); }}>
                      <ListPlus size={18} />
                      <span>Create New Playlist</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RENDER PLAYLIST FOLDERS OR TRACK LIST */}
          <div id="playlist-list" className="playlist-list">
            {currentView === 'playlists' && !state.selectedPlaylistId ? (
              userPlaylists.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '30px 0', textAlign: 'center' }}>
                  No custom playlists yet. Tap "+ New" above to create one.
                </div>
              ) : (
                userPlaylists.map(pl => (
                  <div key={pl.id} className="playlist-folder-card" onClick={() => openPlaylistDetail(pl.id)}>
                    <div className="playlist-folder-left">
                      <div className="playlist-folder-icon-box">
                        <Folder size={18} />
                      </div>
                      <div className="playlist-folder-info">
                        <div className="playlist-folder-title">{pl.name}</div>
                        <div className="playlist-folder-sub">{(pl.tracks || []).length} track{(pl.tracks || []).length === 1 ? '' : 's'}</div>
                      </div>
                    </div>
                    <div className="playlist-folder-right">
                      <button className="icon-btn" title="Delete Playlist" onClick={(e) => { e.stopPropagation(); deleteSelectedPlaylist(pl.id); }}>
                        <Trash2 size={18} />
                      </button>
                      <ChevronRight size={18} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                  </div>
                ))
              )
            ) : (
              tracks.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '20px 0', textAlign: 'center' }}>
                  No songs found
                </div>
              ) : (
                tracks.map((track, idx) => (
                  <div key={track.uid} className={`track-item ${state.currentTrack?.uid === track.uid ? 'playing' : ''}`}>
                    <div className="track-index">{String(idx + 1).padStart(2, '0')}</div>
                    <div className="track-thumb-box">
                      {track.cover ? (
                        <img src={track.cover} alt="" className="track-thumb-art" />
                      ) : (
                        <div className="track-thumb-placeholder">
                          <MusicIcon size={18} color="var(--accent)" />
                        </div>
                      )}
                    </div>
                    <div className="track-meta-main">
                      <div className="track-meta-title">{track.title || 'Unknown'}</div>
                      <div className="track-meta-sub">
                        <span>{track.artist || ''}</span>
                        <span className="track-source-tag">
                          <span>{getSourceKey(track.source)}</span>
                        </span>
                      </div>
                    </div>
                    <div className="track-actions" style={{ position: 'relative' }}>
                      <button className="icon-btn" title="Play" onClick={(e) => { e.stopPropagation(); playFromList(currentView === 'playlists' ? 'playlist' : currentView as any, idx, state.selectedPlaylistId); }}>
                        <Play size={18} fill="currentColor" />
                      </button>
                      <button className="icon-btn" title="More Options" onClick={(e) => { e.stopPropagation(); setActiveMenuUid(activeMenuUid === track.uid ? null : track.uid); }}>
                        <MoreVertical size={18} />
                      </button>

                      {activeMenuUid === track.uid && (
                        <div className="ios-popover-menu show" style={{ top: '38px', right: 0 }}>
                          <button
                            className="ios-popover-item"
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(track); setActiveMenuUid(null); }}
                          >
                            <Heart size={16} fill={state.favorites.some(f => f.uid === track.uid) ? 'var(--accent)' : 'none'} color={state.favorites.some(f => f.uid === track.uid) ? 'var(--accent)' : 'currentColor'} />
                            <span>{state.favorites.some(f => f.uid === track.uid) ? 'Remove Favorite' : 'Add to Favorites'}</span>
                          </button>
                          <button
                            className="ios-popover-item"
                            onClick={(e) => { e.stopPropagation(); addToQueue(track); setActiveMenuUid(null); }}
                          >
                            <ListPlus size={16} />
                            <span>Add to Queue</span>
                          </button>
                          <button
                            className="ios-popover-item"
                            onClick={(e) => { e.stopPropagation(); handleDownloadTrack(track); setActiveMenuUid(null); }}
                          >
                            <Download size={16} />
                            <span>Download</span>
                          </button>
                          {(currentView === 'downloaded' || currentView === 'playlists') && (
                            <button
                              className="ios-popover-item danger"
                              onClick={(e) => { e.stopPropagation(); removeTrackFromCurrentPlaylist(track.uid); setActiveMenuUid(null); }}
                            >
                              <Trash2 size={16} />
                              <span>{currentView === 'playlists' ? 'Remove from Playlist' : 'Delete Download'}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      )}
    </Fragment>
  );
}
