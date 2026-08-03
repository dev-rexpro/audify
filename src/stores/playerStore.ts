import { create } from 'zustand';
import { useSearchStore } from './searchStore';
import { useLibraryStore } from './libraryStore';
import { type Track, type PlayContext, type PlayMode, type Playlist } from './types';
import { ensureTrackDetails, getOfflineTrackFromDB } from '../utils/trackApi';

function parseLRC(txt: string | null) {
  if (!txt) return [];
  const lines = txt.split(/\r?\n/);
  const reg = /\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\]/;
  const out: { time: number; text: string }[] = [];
  for (const line of lines) {
    const m = reg.exec(line);
    if (!m) continue;
    const min = parseInt(m[1], 10) || 0;
    const sec = parseInt(m[2], 10) || 0;
    const ms = m[3] ? parseInt(m[3].padEnd(3, '0'), 10) : 0;
    const time = min * 60 + sec + ms / 1000;
    const text = line.replace(reg, '').trim();
    if (text) out.push({ time, text });
  }
  out.sort((a, b) => a.time - b.time);
  return out;
}

export interface PlayerState {
  currentTrack: Track | null;
  playContext: PlayContext;
  queue: Track[];
  playMode: PlayMode;
  isPlaying: boolean;
  lyricLines: { time: number; text: string }[];
  currentLyricIndex: number;
  volume: number;
  duration: number;
  currentTime: number;
  playTrack: (track: Track, context?: PlayContext) => Promise<{ src: string | null }>;
  playFromList: (type: PlayContext['type'], index: number, plId?: string | null, list?: Track[]) => void;
  playNext: (direction: 'next' | 'prev') => void;
  togglePlayPause: () => void;
  togglePlayMode: (mode?: PlayMode) => void;
  setVolume: (v: number) => void;
  isMuted: boolean;
  toggleMute: () => void;
  eqBands: number[];
  setEqBands: (bands: number[]) => void;
  spatialAudio: boolean;
  toggleSpatialAudio: () => void;
  seek: (time: number) => void;
  addToQueue: (track: Track) => void;
  clearQueue: () => void;
  removeFromQueue: (uid: string) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  setPlayContext: (ctx: PlayContext) => void;
  setCurrentTrack: (track: Track | null) => void;
  setIsPlaying: (v: boolean) => void;
  setLyricLines: (lines: { time: number; text: string }[]) => void;
  setCurrentLyricIndex: (idx: number) => void;
  setDuration: (d: number) => void;
  setCurrentTime: (t: number) => void;
}

function getInterleavedSearchList(searchResults: Track[]): Track[] {
  const grouped: Record<string, Track[]> = { qq: [], joox: [], netease: [], kuwo: [] };
  searchResults.forEach(t => { if (grouped[t.source]) grouped[t.source].push(t); });
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
}

function getActiveList(type: PlayContext['type'], searchResults: Track[], favorites: Track[], localTracks: Track[], playlists: Playlist[], playlistId: string | null): Track[] {
  if (type === 'results') {
    let list = getInterleavedSearchList(searchResults);
    if (!list.length && searchResults.length) {
      list = [...searchResults];
    }
    return list;
  }
  if (type === 'favorites') return favorites;
  if (type === 'local') return localTracks;
  if (type === 'playlist') {
    const pl = playlists.find(p => p.id === playlistId);
    return pl ? pl.tracks : [];
  }
  return getInterleavedSearchList(searchResults);
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  playContext: { type: 'results', index: -1, playlistId: null },
  queue: [],
  playMode: 'list',
  isPlaying: false,
  lyricLines: [],
  currentLyricIndex: -1,
  volume: 0.8,
  isMuted: false,
  eqBands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 10 bands
  spatialAudio: false,
  duration: 0,
  currentTime: 0,

  setCurrentTrack: (track) => set({ currentTrack: track }),
  setPlayContext: (ctx) => set({ playContext: ctx }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  setLyricLines: (lines) => set({ lyricLines: lines, currentLyricIndex: -1 }),
  setCurrentLyricIndex: (idx) => set({ currentLyricIndex: idx }),
  setDuration: (d) => set({ duration: d }),
  setCurrentTime: (t) => set({ currentTime: t }),

  playTrack: async (track, context) => {
    if (!track) return { src: null };

    let finalTrack = track;
    if (track.source !== 'local' && !track.audioUrl) {
      const searchState = useSearchStore.getState();
      await ensureTrackDetails(track, (updated) => {
        const newMap = new Map(searchState.trackMap);
        newMap.set(updated.uid, updated);
        searchState.setTrackMap(newMap);
      });
      finalTrack = useSearchStore.getState().trackMap.get(track.uid) || track;
    }

    const ctx = context || get().playContext;
    set({ currentTrack: finalTrack, playContext: ctx });

    let playSrc = finalTrack.audioUrl;
    if (finalTrack.source !== 'local') {
      const offlineRecord = await getOfflineTrackFromDB(finalTrack.uid);
      if (offlineRecord && offlineRecord.audioBlob) {
        playSrc = URL.createObjectURL(offlineRecord.audioBlob);
      }
    }
    const searchState = useSearchStore.getState();
    const updated = searchState.trackMap.get(finalTrack.uid) || finalTrack;
    const lines = updated.lrc ? parseLRC(updated.lrc) : [];
    set({ lyricLines: lines, currentLyricIndex: -1 });
    return { src: playSrc };
  },

  playFromList: (type, index, plId, list) => {
    const searchState = useSearchStore.getState();
    const libState = useLibraryStore.getState();
    const activeList = list || getActiveList(type, searchState.searchResults, libState.favorites, libState.localTracks, libState.playlists, plId || get().playContext.playlistId);
    if (!activeList.length) return;
    if (index < 0) index = activeList.length - 1;
    if (index >= activeList.length) index = 0;
    const track = activeList[index];
    const context: PlayContext = { type, index, playlistId: plId || null };
    set({ isPlaying: true });
    get().playTrack(track, context);
  },

  playNext: (direction) => {
    const currentState = get();
    set({ isPlaying: true });
    if (direction === 'next' && currentState.queue.length > 0) {
      const nextTrack = currentState.queue[0];
      const newQueue = currentState.queue.slice(1);
      set({ queue: newQueue });
      currentState.playTrack(nextTrack, { ...currentState.playContext, index: currentState.playContext.index + 1 });
      return;
    }

    const searchState = useSearchStore.getState();
    const libState = useLibraryStore.getState();
    const list = getActiveList(currentState.playContext.type, searchState.searchResults, libState.favorites, libState.localTracks, libState.playlists, currentState.playContext.playlistId);
    if (!list.length) return;
    let idx = currentState.playContext.index ?? -1;
    if (idx < 0 || idx >= list.length) idx = 0;

    if (currentState.playMode === 'single') {
      return;
    }

    if (currentState.playMode === 'shuffle') {
      if (list.length === 1) {
        idx = 0;
      } else {
        let newIdx;
        do { newIdx = Math.floor(Math.random() * list.length); } while (newIdx === idx);
        idx = newIdx;
      }
    } else {
      idx = (idx + (direction === 'prev' ? -1 : 1) + list.length) % list.length;
    }

    const track = list[idx];
    const context = { ...currentState.playContext, index: idx };
    currentState.playTrack(track, context);
  },

  togglePlayPause: () => set(state => ({ isPlaying: !state.isPlaying })),

  togglePlayMode: (mode) => {
    const current = get().playMode;
    const newMode = mode || (current === 'list' ? 'single' : current === 'single' ? 'shuffle' : 'list');
    set({ playMode: newMode });
  },

  setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)) }),
  toggleMute: () => set(state => ({ isMuted: !state.isMuted })),
  setEqBands: (bands) => set({ eqBands: bands }),
  toggleSpatialAudio: () => set(state => ({ spatialAudio: !state.spatialAudio })),
  seek: (time) => set({ currentTime: Math.max(0, time) }),

  addToQueue: (track) => set(state => ({ queue: [...state.queue, track] })),
  clearQueue: () => set({ queue: [] }),
  removeFromQueue: (uid) => set(state => ({ queue: state.queue.filter(t => t.uid !== uid) })),
  reorderQueue: (fromIndex: number, toIndex: number) => set(state => {
    const queue = [...state.queue];
    const [moved] = queue.splice(fromIndex, 1);
    queue.splice(toIndex, 0, moved);
    return { queue };
  }),
}));
