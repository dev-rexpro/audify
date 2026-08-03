import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Track, type Playlist, SYSTEM_DOWNLOADED_ID } from './types';
import { v4 as uuidv4 } from 'uuid';

const LIBRARY_STORAGE_KEY = 'music-player-library-v1';
const OLD_LIBRARY_STORAGE_KEY = 'pikachu-music-library-v1';

function serializeTrack(track: Track | null) {
  if (!track) return null;
  const keys = [
    'uid', 'source', 'displayIndex', 'keyword', 'songid', 'songMid', 'qqId', 'qqSearchKey', 'qqIndex',
    'jooxIndex', 'jooxSongId', 'jooxSongMid', 'title', 'artist', 'album', 'cover', 'pageUrl',
    'quality', 'qualityLabel', 'qqQualityText', 'jooxQualityText', 'pay'
  ];
  const out: Record<string, unknown> = {};
  keys.forEach(k => {
    const val = (track as unknown as Record<string, unknown>)[k];
    if (val !== undefined && val !== null && val !== '') out[k] = val;
  });
  out.detailsLoaded = false;
  out.audioUrl = null;
  out.lrc = null;
  out.lrcUrl = null;
  return out.uid ? out : null;
}

function deserializeTrack(raw: unknown): Track | null {
  if (raw && typeof raw === 'object' && (raw as Record<string, unknown>).source === 'migu') return null;
  const track = serializeTrack(raw as Track | null);
  if (!track) return null;
  const t = track as unknown as Track;
  t.detailsLoaded = false;
  t.audioUrl = null;
  t.lrc = null;
  t.lrcUrl = null;
  return t;
}

function getLibrarySnapshot(state: LibraryState) {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    favorites: state.favorites.map(serializeTrack).filter(Boolean),
    downloads: state.downloads.map(serializeTrack).filter(Boolean),
    playlists: state.playlists.filter(pl => !pl.isSystem).map(pl => ({
      id: pl.id,
      name: pl.name,
      tracks: (pl.tracks || []).map(serializeTrack).filter(Boolean)
    }))
  };
}

function saveLibraryToStorage(state: LibraryState) {
  try {
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(getLibrarySnapshot(state)));
  } catch (e) { }
}

function loadLibraryFromStorage(): Partial<LibraryState> {
  try {
    let raw = localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(OLD_LIBRARY_STORAGE_KEY);
    }
    if (!raw) return {};
    const data = JSON.parse(raw);
    return {
      favorites: Array.isArray(data.favorites) ? data.favorites.map(deserializeTrack).filter(Boolean) as Track[] : [],
      downloads: Array.isArray(data.downloads) ? data.downloads.map(deserializeTrack).filter(Boolean) as Track[] : [],
      playlists: Array.isArray(data.playlists) ? data.playlists.map((pl: Record<string, unknown>, idx: number) => ({
        id: pl.id || ('pl-cached-' + idx + '-' + Date.now()),
        name: pl.name || 'Untitled Playlist',
        tracks: Array.isArray(pl.tracks) ? pl.tracks.map(deserializeTrack).filter(Boolean) as Track[] : []
      })) : []
    };
  } catch (e) {
    return {};
  }
}

const initial = loadLibraryFromStorage();

export interface LibraryState {
  favorites: Track[];
  downloads: Track[];
  localTracks: Track[];
  playlists: Playlist[];
  trackMap: Map<string, Track>;
  addToFavorites: (track: Track) => void;
  removeFromFavorites: (uid: string) => void;
  toggleFavorite: (track: Track) => void;
  isFavorite: (uid: string) => boolean;
  addDownload: (track: Track) => void;
  removeDownload: (uid: string) => void;
  isDownloaded: (uid: string) => boolean;
  addLocalTracks: (tracks: Track[]) => void;
  setLocalTracks: (tracks: Track[]) => void;
  clearLocalTracks: () => void;
  createPlaylist: (name: string) => Playlist;
  deletePlaylist: (id: string) => void;
  renamePlaylist: (id: string, name: string) => void;
  duplicatePlaylist: (id: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => boolean;
  removeTrackFromPlaylist: (playlistId: string, trackUid: string) => void;
  reorderPlaylistTracks: (playlistId: string, fromIndex: number, toIndex: number) => void;
  reorderFavorites: (fromIndex: number, toIndex: number) => void;
  setTrackMap: (map: Map<string, Track>) => void;
  getPlaylistById: (id: string) => Playlist | undefined;
}

function ensureSystemPlaylists(state: { playlists: Playlist[]; downloads: Track[] }): Playlist[] {
  const playlists = [...state.playlists];
  if (!playlists.find(p => p.id === SYSTEM_DOWNLOADED_ID)) {
    playlists.unshift({ id: SYSTEM_DOWNLOADED_ID, name: 'Downloaded Songs', isSystem: true, tracks: state.downloads });
  } else {
    const idx = playlists.findIndex(p => p.id === SYSTEM_DOWNLOADED_ID);
    if (idx >= 0) playlists[idx] = { ...playlists[idx], tracks: state.downloads, isSystem: true, name: 'Downloaded Songs' };
  }
  return playlists;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      favorites: initial.favorites || [],
      downloads: initial.downloads || [],
      localTracks: [],
      playlists: ensureSystemPlaylists({ playlists: initial.playlists || [], downloads: initial.downloads || [] }),
      trackMap: new Map<string, Track>(),

      setTrackMap: (map) => set({ trackMap: map }),

      addToFavorites: (track) => set(state => {
        const newFavorites = [...state.favorites, track];
        saveLibraryToStorage({ ...state, favorites: newFavorites });
        return { favorites: newFavorites };
      }),

      removeFromFavorites: (uid) => set(state => {
        const newFavorites = state.favorites.filter(f => f.uid !== uid);
        saveLibraryToStorage({ ...state, favorites: newFavorites });
        return { favorites: newFavorites };
      }),

      toggleFavorite: (track) => set(state => {
        const exists = state.favorites.some(f => f.uid === track.uid);
        const newFavorites = exists ? state.favorites.filter(f => f.uid !== track.uid) : [...state.favorites, track];
        saveLibraryToStorage({ ...state, favorites: newFavorites });
        return { favorites: newFavorites };
      }),

      isFavorite: (uid) => get().favorites.some(f => f.uid === uid),

      addDownload: (track) => set(state => {
        if (state.downloads.some(d => d.uid === track.uid)) return state;
        const newDownloads = [...state.downloads, track];
        const newPlaylists = state.playlists.map(p => p.id === SYSTEM_DOWNLOADED_ID ? { ...p, tracks: newDownloads, isSystem: true, name: 'Downloaded Songs' } : p);
        saveLibraryToStorage({ ...state, downloads: newDownloads, playlists: newPlaylists });
        return { downloads: newDownloads, playlists: newPlaylists };
      }),

      removeDownload: (uid) => set(state => {
        const newDownloads = state.downloads.filter(d => d.uid !== uid);
        const newPlaylists = state.playlists.map(p => p.id === SYSTEM_DOWNLOADED_ID ? { ...p, tracks: newDownloads, isSystem: true, name: 'Downloaded Songs' } : p);
        saveLibraryToStorage({ ...state, downloads: newDownloads, playlists: newPlaylists });
        return { downloads: newDownloads, playlists: newPlaylists };
      }),

      isDownloaded: (uid) => get().downloads.some(d => d.uid === uid),

      addLocalTracks: (tracks) => set(state => {
        const newLocalTracks = [...state.localTracks, ...tracks];
        const newTrackMap = new Map(state.trackMap);
        tracks.forEach(t => newTrackMap.set(t.uid, t));
        return { localTracks: newLocalTracks, trackMap: newTrackMap };
      }),

      setLocalTracks: (tracks) => set(state => {
        const newTrackMap = new Map(state.trackMap);
        tracks.forEach(t => newTrackMap.set(t.uid, t));
        return { localTracks: tracks, trackMap: newTrackMap };
      }),

      clearLocalTracks: () => set(state => {
        state.localTracks.forEach(t => {
          if (t.audioUrl && t.audioUrl.startsWith('blob:')) URL.revokeObjectURL(t.audioUrl);
        });
        return { localTracks: [] };
      }),

      createPlaylist: (name) => {
        const id = 'pl-' + Date.now() + '-' + uuidv4().slice(0, 8);
        const pl: Playlist = { id, name: name.trim() || 'Untitled Playlist', tracks: [], isSystem: false };
        set(state => {
          const newPlaylists = [pl, ...state.playlists];
          saveLibraryToStorage({ ...state, playlists: newPlaylists });
          return { playlists: newPlaylists };
        });
        return pl;
      },

      deletePlaylist: (id) => set(state => {
        const pl = state.playlists.find(p => p.id === id);
        if (pl?.isSystem) return state;
        const newPlaylists = state.playlists.filter(p => p.id !== id);
        saveLibraryToStorage({ ...state, playlists: newPlaylists });
        return { playlists: newPlaylists };
      }),

      renamePlaylist: (id, name) => set(state => {
        const newPlaylists = state.playlists.map(p => p.id === id ? { ...p, name: name.trim() || 'Untitled Playlist' } : p);
        saveLibraryToStorage({ ...state, playlists: newPlaylists });
        return { playlists: newPlaylists };
      }),

      duplicatePlaylist: (id) => set(state => {
        const pl = state.playlists.find(p => p.id === id);
        if (!pl) return state;
        const newPl: Playlist = { id: 'pl-' + Date.now() + '-' + uuidv4().slice(0, 8), name: pl.name + ' (Copy)', tracks: [...pl.tracks], isSystem: false };
        const newPlaylists = [newPl, ...state.playlists];
        saveLibraryToStorage({ ...state, playlists: newPlaylists });
        return { playlists: newPlaylists };
      }),

      addTrackToPlaylist: (playlistId, track) => {
        const state = get();
        const pl = state.playlists.find(p => p.id === playlistId);
        if (!pl) return false;
        if (pl.tracks.some(tk => tk.uid === track.uid)) return false;
        const newTracks = [...pl.tracks, track];
        const newPlaylists = state.playlists.map(p => p.id === playlistId ? { ...p, tracks: newTracks } : p);
        let newDownloads = state.downloads;
        if (playlistId === SYSTEM_DOWNLOADED_ID) {
          if (!state.downloads.some(x => x.uid === track.uid)) {
            newDownloads = [...state.downloads, track];
          }
        }
        saveLibraryToStorage({ ...state, playlists: newPlaylists, downloads: newDownloads });
        set({ playlists: newPlaylists, downloads: newDownloads });
        return true;
      },

      removeTrackFromPlaylist: (playlistId, trackUid) => set(state => {
        const pl = state.playlists.find(p => p.id === playlistId);
        if (!pl) return state;
        const newTracks = pl.tracks.filter(t => t.uid !== trackUid);
        let newDownloads = state.downloads;
        if (playlistId === SYSTEM_DOWNLOADED_ID) {
          newDownloads = state.downloads.filter(x => x.uid !== trackUid);
        }
        const newPlaylists = state.playlists.map(p => p.id === playlistId ? { ...p, tracks: newTracks } : p);
        saveLibraryToStorage({ ...state, playlists: newPlaylists, downloads: newDownloads });
        return { playlists: newPlaylists, downloads: newDownloads };
      }),

      reorderPlaylistTracks: (playlistId, fromIndex, toIndex) => set(state => {
        const newPlaylists = state.playlists.map(p => {
          if (p.id !== playlistId) return p;
          const tracks = [...p.tracks];
          const [moved] = tracks.splice(fromIndex, 1);
          tracks.splice(toIndex, 0, moved);
          return { ...p, tracks };
        });
        saveLibraryToStorage({ ...state, playlists: newPlaylists });
        return { playlists: newPlaylists };
      }),

      reorderFavorites: (fromIndex, toIndex) => set(state => {
        const newFavorites = [...state.favorites];
        const [moved] = newFavorites.splice(fromIndex, 1);
        newFavorites.splice(toIndex, 0, moved);
        saveLibraryToStorage({ ...state, favorites: newFavorites });
        return { favorites: newFavorites };
      }),

      getPlaylistById: (id) => get().playlists.find(p => p.id === id),
    }),
    {
      name: 'library-store',
      partialize: (state) => ({
        favorites: state.favorites,
        downloads: state.downloads,
        playlists: state.playlists.filter(p => !p.isSystem),
        localTracks: state.localTracks,
      }),
    }
  )
);
