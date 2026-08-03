import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type ActiveTab, type LibraryView, type PlayMode } from './types';

const AUDIFY_STORAGE_KEY = 'audify_app_state_v2';

export interface UiState {
  activeTab: ActiveTab;
  previousTab: ActiveTab;
  activeLibraryView: LibraryView;
  selectedPlaylistId: string | null;
  language: string;
  enabledSources: Record<string, boolean>;
  perSourceLimit: number;
  playMode: PlayMode;
  lyricsAlt: boolean;
  muted: boolean;
  searchInProgress: boolean;
  noMoreResults: boolean;
  toastMsg: string;
  toastVisible: boolean;
  showProviderModal: boolean;
  showPlaylistModal: boolean;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  setActiveTab: (tab: ActiveTab) => void;
  toggleSearchTab: () => void;
  switchLibraryTab: (tabName: string) => void;
  openPlaylistDetail: (plId: string) => void;
  handleBackNavigation: () => void;
  backToLibraryRoot: () => void;
  backToPlaylistFolders: () => void;
  setSelectedPlaylistId: (id: string | null) => void;
  setEnabledSources: (s: Record<string, boolean>) => void;
  setPerSourceLimit: (n: number) => void;
  setLanguage: (lang: string) => void;
  setPlayMode: (mode: PlayMode) => void;
  setMuted: (m: boolean) => void;
  setSearchInProgress: (v: boolean) => void;
  setNoMoreResults: (v: boolean) => void;
  showToast: (msg: string) => void;
  setToastMsg: (msg: string) => void;
  setToastVisible: (v: boolean) => void;
  openProviderModal: () => void;
  closeProviderModal: () => void;
  openPlaylistModal: () => void;
  closePlaylistModal: () => void;
}

const initialEnabledSources = { qq: true, joox: true, netease: true, kuwo: true };

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      activeTab: 'home',
      previousTab: 'home',
      activeLibraryView: 'root',
      selectedPlaylistId: null,
      language: 'en',
      enabledSources: initialEnabledSources,
      perSourceLimit: 5,
      playMode: 'list',
      lyricsAlt: false,
      muted: false,
      searchInProgress: false,
      noMoreResults: false,
      toastMsg: '',
      toastVisible: false,
      showProviderModal: false,
      showPlaylistModal: false,
      searchInputRef: { current: null },

      setActiveTab: (tab) => {
        set({ activeTab: tab });
        document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
        document.getElementById(`view-${tab}`)?.classList.add('active');
        document.querySelectorAll('.nav-btn').forEach(i => i.classList.toggle('active', i.getAttribute('data-target') === `view-${tab}`));
      },

      toggleSearchTab: () => {
        const prev = get().activeTab;
        if (prev === 'search') {
          const target = get().previousTab || 'home';
          set({ activeTab: target });
          setTimeout(() => get().searchInputRef.current?.blur(), 50);
        } else {
          set({ previousTab: prev, activeTab: 'search' });
          setTimeout(() => get().searchInputRef.current?.focus(), 100);
        }
      },

      switchLibraryTab: (tabName) => set(state => ({
        activeLibraryView: tabName as LibraryView,
        selectedPlaylistId: tabName === 'playlists' ? state.selectedPlaylistId : null,
      })),

      openPlaylistDetail: (plId) => set({ activeLibraryView: 'playlists', selectedPlaylistId: plId }),

      handleBackNavigation: () => set(state => {
        if (state.activeLibraryView === 'playlists' && state.selectedPlaylistId) {
          return { selectedPlaylistId: null };
        }
        return { activeLibraryView: 'root', selectedPlaylistId: null };
      }),

      backToLibraryRoot: () => set({ activeLibraryView: 'root', selectedPlaylistId: null }),
      backToPlaylistFolders: () => set({ selectedPlaylistId: null }),
      setSelectedPlaylistId: (id) => set({ selectedPlaylistId: id }),
      setEnabledSources: (s) => set({ enabledSources: s }),
      setPerSourceLimit: (n) => set({ perSourceLimit: n }),
      setLanguage: (lang) => set({ language: lang }),
      setPlayMode: (mode) => set({ playMode: mode }),
      setMuted: (m) => set({ muted: m }),
      setSearchInProgress: (v) => set({ searchInProgress: v }),
      setNoMoreResults: (v) => set({ noMoreResults: v }),
      showToast: (msg) => {
        set({ toastMsg: msg, toastVisible: true });
        setTimeout(() => set({ toastVisible: false }), 2000);
      },
      setToastMsg: (msg) => set({ toastMsg: msg }),
      setToastVisible: (v) => set({ toastVisible: v }),
      openProviderModal: () => set({ showProviderModal: true }),
      closeProviderModal: () => set({ showProviderModal: false }),
      openPlaylistModal: () => set({ showPlaylistModal: true }),
      closePlaylistModal: () => set({ showPlaylistModal: false }),
    }),
    {
      name: AUDIFY_STORAGE_KEY,
      partialize: (state) => ({
        language: state.language,
        enabledSources: state.enabledSources,
        perSourceLimit: state.perSourceLimit,
        playMode: state.playMode,
      }),
    }
  )
);
