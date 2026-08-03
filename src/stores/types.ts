export interface Track {
  uid: string;
  source: string;
  displayIndex: number;
  keyword: string;
  songid: string;
  songMid: string;
  qqId: string;
  qqSearchKey: string;
  qqIndex: number;
  jooxIndex: number;
  jooxSongId: string;
  jooxSongMid: string;
  title: string;
  artist: string;
  album: string;
  cover: string | null;
  pageUrl: string;
  quality: string | null;
  qualityLabel: string | null;
  qqQualityText: string | null;
  jooxQualityText: string | null;
  pay: string | null;
  detailsLoaded: boolean;
  audioUrl: string | null;
  lrc: string | null;
  lrcUrl: string | null;
  fileObject?: File;
}

export interface Playlist {
  id: string;
  name: string;
  isSystem: boolean;
  tracks: Track[];
}

export interface PlayContext {
  type: 'results' | 'favorites' | 'local' | 'playlist';
  index: number;
  playlistId: string | null;
}

export type PlayMode = 'list' | 'single' | 'shuffle';

export type ActiveTab = 'home' | 'search' | 'local' | 'playlist';
export type LibraryView = 'root' | 'playlists' | 'downloaded' | 'favorites' | 'results';

export const SYSTEM_DOWNLOADED_ID = 'pl-downloaded';
