import { usePlayerStore } from '../stores/playerStore';
import { useLibraryStore } from '../stores/libraryStore';
import { getAllLocalTracksFromDB, getOfflineTrack } from './db';
import { Track, PlayMode } from '../stores/types';

const LAST_PLAY_STATE_KEY = 'audify_last_play_state_v2';

function serializeTrack(track: Track | null) {
  if (!track) return null;
  const keys = [
    'uid', 'source', 'displayIndex', 'keyword', 'songid', 'songMid', 'qqId', 'qqSearchKey', 'qqIndex',
    'jooxIndex', 'jooxSongId', 'jooxSongMid', 'title', 'artist', 'album', 'cover', 'pageUrl',
    'quality', 'qualityLabel', 'qqQualityText', 'jooxQualityText', 'pay', 'audioUrl', 'lrc'
  ];
  const out: Record<string, unknown> = {};
  keys.forEach(k => {
    const val = (track as unknown as Record<string, unknown>)[k];
    if (val !== undefined && val !== null && val !== '') out[k] = val;
  });
  return out.uid ? out : null;
}

export function saveLastPlayState() {
  try {
    const player = usePlayerStore.getState();
    if (!player.currentTrack) return;

    const payload = {
      currentTrack: serializeTrack(player.currentTrack),
      playContext: player.playContext,
      queue: (player.queue || []).map(serializeTrack).filter(Boolean),
      playMode: player.playMode,
      currentTime: Math.max(0, player.currentTime || 0)
    };
    localStorage.setItem(LAST_PLAY_STATE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error('Failed to save last play state:', e);
  }
}

export async function restoreAppPersistence() {
  try {
    // 1. Restore local tracks from IndexedDB
    const savedLocal = await getAllLocalTracksFromDB();
    const restoredLocalTracks: Track[] = await Promise.all(
      savedLocal.map(async (s, idx) => {
        const audioUrl = URL.createObjectURL(s.audioBlob);
        let cover = s.cover;
        if (!cover || cover.startsWith('blob:')) {
          try {
            const { parseAudioMetadata } = await import('./audioMetadataParser');
            const file = new File([s.audioBlob], (s.title || 'track') + '.mp3', { type: s.audioBlob.type || 'audio/mpeg' });
            const meta = await parseAudioMetadata(file);
            if (meta.cover) {
              cover = meta.cover;
              const { saveLocalTrackToDB } = await import('./db');
              saveLocalTrackToDB({ ...s, cover }, s.audioBlob).catch(() => {});
            } else {
              cover = null;
            }
          } catch (e) {
            cover = null;
          }
        }
        return {
          uid: s.uid,
          source: 'local',
          displayIndex: idx + 1,
          title: s.title,
          artist: s.artist,
          album: s.album,
          cover,
          pageUrl: '',
          quality: 'local',
          qualityLabel: 'LOCAL',
          qqQualityText: null,
          jooxQualityText: null,
          pay: null,
          detailsLoaded: true,
          audioUrl,
          lrc: s.lrc,
          lrcUrl: null,
          keyword: '',
          songid: '',
          songMid: '',
          qqId: '',
          qqSearchKey: '',
          qqIndex: 0,
          jooxIndex: 0,
          jooxSongId: '',
          jooxSongMid: ''
        };
      })
    );

    if (restoredLocalTracks.length > 0) {
      useLibraryStore.getState().setLocalTracks(restoredLocalTracks);
    }

    // 2. Restore last play state
    const rawState = localStorage.getItem(LAST_PLAY_STATE_KEY);
    if (!rawState) return;

    const data = JSON.parse(rawState);
    if (!data || !data.currentTrack) return;

    let track: Track = data.currentTrack;

    // If local track, match with restored blob URL
    if (track.source === 'local') {
      const matched = restoredLocalTracks.find(t => t.uid === track.uid);
      if (matched) {
        track = matched;
      }
    } else {
      // Check offline DB for downloaded tracks
      const offline = await getOfflineTrack(track.uid);
      if (offline && offline.audioBlob) {
        track.audioUrl = URL.createObjectURL(offline.audioBlob);
      }
    }

    const restoredQueue: Track[] = (data.queue || []).map((q: Track) => {
      if (q.source === 'local') {
        const found = restoredLocalTracks.find(t => t.uid === q.uid);
        return found || q;
      }
      return q;
    });

    const playerStore = usePlayerStore.getState();
    playerStore.setCurrentTrack(track);
    if (data.playContext) playerStore.setPlayContext(data.playContext);
    if (restoredQueue.length) usePlayerStore.setState({ queue: restoredQueue });
    if (data.playMode) playerStore.togglePlayMode(data.playMode as PlayMode);

    const currentTime = Math.max(0, Number(data.currentTime) || 0);
    playerStore.setCurrentTime(currentTime);
    playerStore.setIsPlaying(false);

    // Set audio element source & position
    const audio = document.getElementById('audio') as HTMLAudioElement;
    if (audio && track.audioUrl) {
      audio.src = track.audioUrl;
      audio.pause();
      try {
        audio.currentTime = currentTime;
      } catch (e) {}
    }
  } catch (e) {
    console.error('Failed to restore app persistence:', e);
  }
}
