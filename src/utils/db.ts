import Dexie, { type EntityTable } from 'dexie';
import type { Track } from '../stores/types';

export interface OfflineTrack {
  uid: string;
  title: string;
  artist: string;
  album: string;
  cover: string | null;
  audioBlob: Blob;
  lrc: string | null;
  savedAt: string;
}

export interface SavedLocalTrack {
  uid: string;
  title: string;
  artist: string;
  album: string;
  cover: string | null;
  audioBlob: Blob;
  lrc: string | null;
  savedAt: string;
}

class OfflineDB extends Dexie {
  tracks!: Dexie.Table<OfflineTrack, string>;
  localTracks!: Dexie.Table<SavedLocalTrack, string>;

  constructor() {
    super('MusicPlayerOfflineDB');
    this.version(1).stores({
      tracks: 'uid, savedAt'
    });
    this.version(2).stores({
      tracks: 'uid, savedAt',
      localTracks: 'uid, savedAt'
    });
  }
}

export const db = new OfflineDB();

export async function saveOfflineTrack(track: Track, audioBlob: Blob, lrcText: string | null) {
  try {
    await db.tracks.put({
      uid: track.uid,
      title: track.title,
      artist: track.artist,
      album: track.album,
      cover: track.cover,
      audioBlob,
      lrc: lrcText || track.lrc,
      savedAt: new Date().toISOString()
    });
  } catch (e) {
    console.error('Failed to save offline track:', e);
  }
}

export async function getOfflineTrack(uid: string): Promise<OfflineTrack | undefined> {
  try {
    return await db.tracks.get(uid);
  } catch (e) {
    return undefined;
  }
}

export async function deleteOfflineTrack(uid: string) {
  try {
    await db.tracks.delete(uid);
  } catch (e) {
    console.error('Failed to delete offline track:', e);
  }
}

export async function getAllOfflineTracks(): Promise<OfflineTrack[]> {
  try {
    return await db.tracks.toArray();
  } catch (e) {
    return [];
  }
}

export async function saveLocalTrackToDB(track: Track, audioBlob: Blob) {
  try {
    await db.localTracks.put({
      uid: track.uid,
      title: track.title,
      artist: track.artist,
      album: track.album,
      cover: track.cover,
      audioBlob,
      lrc: track.lrc || null,
      savedAt: new Date().toISOString()
    });
  } catch (e) {
    console.error('Failed to save local track to DB:', e);
  }
}

export async function getAllLocalTracksFromDB(): Promise<SavedLocalTrack[]> {
  try {
    return await db.localTracks.toArray();
  } catch (e) {
    return [];
  }
}

export async function clearAllLocalTracksFromDB() {
  try {
    await db.localTracks.clear();
  } catch (e) {
    console.error('Failed to clear local tracks from DB:', e);
  }
}

export async function cleanupOldOfflineTracks(maxAgeDays = 30): Promise<number> {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - maxAgeDays);
    const cutoffStr = cutoff.toISOString();
    const oldTracks = await db.tracks.where('savedAt').below(cutoffStr).toArray();
    for (const track of oldTracks) {
      await db.tracks.delete(track.uid);
    }
    return oldTracks.length;
  } catch (e) {
    console.error('Failed to cleanup old tracks:', e);
    return 0;
  }
}
