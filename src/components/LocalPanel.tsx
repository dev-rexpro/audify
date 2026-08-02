import { useRef, useState, Fragment } from 'react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { Play, Heart, HardDrive, FolderSearch, FolderPlus, MoreVertical, ListPlus, Music as MusicIcon } from 'lucide-react';

export default function LocalPanel() {
  const { state, handleLocalFilesSelect, clearLocalTracks, playFromList, toggleFavorite, addToQueue } = useMusicPlayer();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [activeMenuUid, setActiveMenuUid] = useState<string | null>(null);

  const handleFolderScanClick = async () => {
    // If File System Access API is available, use showDirectoryPicker for direct folder scanning
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        const files: File[] = [];
        async function readDir(handle: any) {
          for await (const entry of handle.values()) {
            if (entry.kind === 'file') {
              const f = await entry.getFile();
              files.push(f);
            } else if (entry.kind === 'directory') {
              await readDir(entry);
            }
          }
        }
        await readDir(dirHandle);
        if (files.length) {
          handleLocalFilesSelect(files as any);
        }
        return;
      } catch (err) {
        // User cancelled or fallback to webkitdirectory input
      }
    }
    folderInputRef.current?.click();
  };

  return (
    <Fragment>
      <div className="panel-header">
        <div className="panel-title"><span>Devices</span></div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>
        <div style={{ display: 'flex', gap: '10px', margin: '4px 0 10px' }}>
          <button className="btn" onClick={handleFolderScanClick} style={{ borderRadius: '20px', padding: '10px 18px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <FolderSearch size={18} />
            <span>Scan Folder</span>
          </button>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} style={{ borderRadius: '20px', padding: '10px 18px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <FolderPlus size={18} />
            <span>Choose Files</span>
          </button>

          <input
            ref={folderInputRef}
            type="file"
            //@ts-ignore
            webkitdirectory=""
            directory=""
            multiple
            style={{ display: 'none' }}
            onChange={handleLocalFilesSelect}
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*,.mp3,.flac,.wav,.m4a,.ogg,.aac,.wma,.opus"
            style={{ display: 'none' }}
            onChange={handleLocalFilesSelect}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
          <span id="local-tracks-count" style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>{state.localTracks.length} Local Track{state.localTracks.length === 1 ? '' : 's'}</span>
          {state.localTracks.length > 0 && (
            <button id="clear-local-btn" className="btn btn-ghost" onClick={clearLocalTracks} style={{ display: 'inline-block', padding: '4px 12px', fontSize: '12px' }}>Clear All</button>
          )}
        </div>

        <div id="local-track-list" className="playlist-main" style={{ flex: 1, overflowY: 'auto' }}>
          {state.localTracks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-secondary)', fontSize: '14px' }}>No local files or folder scanned yet.</div>
          ) : (
            state.localTracks.map((track, idx) => (
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
                      <span>LOCAL</span>
                    </span>
                  </div>
                </div>
                <div className="track-actions" style={{ position: 'relative' }}>
                  <button className="icon-btn" title="Play" onClick={(e) => { e.stopPropagation(); playFromList('local', idx); }}>
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
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Fragment>
  );
}
