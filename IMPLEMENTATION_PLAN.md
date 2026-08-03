# Implementation Plan: Audify → Powerful Music App

## PHILOSOPHY
- **Jangan robohkan UI/UX yang sudah ada.** Semua Apple Music-inspired design, warna, spacing, font, dan interaksi tetap dipertahankan.
- **Powerful = stabil, cepat, fitur lengkap, mudah dipakai.** Bukan cuma tambah library, tapi juga perbaiki bug, kurangi memory leak, dan tingkatkan reliability.
- **API saat ini tetap dipakai** (QQ, JOOX, Netease, Kuwo proxy). Tidak diganti, tapi ditambahkan caching + error handling agar lebih robust.

---

## PILLAR 1: STATE MANAGEMENT REFACTOR (Monolith → Modular)
**File target:** `src/context/MusicPlayerContext.tsx` (1.818 baris → pecah menjadi manageable chunks)

### A. Pecah Context menjadi Domain Stores
Gunakan **Zustand** (ringan, TypeScript-first, no boilerplate) untuk memecah monolithic context:

| Store | Tanggung Jawab | Methods |
|-------|---------------|---------|
| `usePlayerStore` | Playback, queue, audio ref, play mode, volume | play, pause, next, prev, seek, setVolume, togglePlayMode |
| `useLibraryStore` | Favorites, downloads, playlists, local tracks | toggleFavorite, addToPlaylist, removeFromPlaylist, createPlaylist, deletePlaylist |
| `useSearchStore` | Search state, results, per-source config | search, loadMore, setSources, setLimit |
| `useUiStore` | Modals, toasts, active tab, full player | showToast, openModal, closeModal, setActiveTab |

**Keuntungan:**
- Setiap store < 300 baris, mudah di-maintain
- Components hanya subscribe ke state yang dibutuhkan (less re-renders)
- Lebih mudah test secara terpisah

### B. Tambah Error Boundary
Buat `ErrorBoundary.tsx` yang menangkap crash dan menampilkan fallback UI ("Something went wrong, tap to retry").

---

## PILLAR 2: PLAYBACK ENGINE UPGRADE
**File target:** `src/context/` + `src/hooks/`

### A. Audio Hook Kustom (`useAudioPlayer.ts`)
- Wrap raw `<audio>` element dalam custom hook
- Expose: `play`, `pause`, `seek`, `setVolume`, `currentTime`, `duration`, `isPlaying`, `ended`
- Tambah **blob URL cleanup** — track semua blob URL yang dibuat dan revoke saat track di-ganti/di-clear
- Tambah **volume persistence** — simpan volume ke localStorage, restore saat app dibuka
- Tambah **crossfade logic** — saat track berganti, fade out 500ms lalu fade in (bisa di-toggle via settings)

### B. Audio Visualization
- Tambah **Web Audio API AnalyserNode** di dalam `useAudioPlayer`
- Buat komponen `Visualizer.tsx` (Canvas-based minimal spectrum/waveform)
- Integrasi di FullPlayer header area (saat ini bilang "Visualizer" tapi kosong)
- Style: minimal, subtle, matching Apple Music aesthetic (bisa di-toggle)

### C. Queue Improvements
- Tambah **queue drag handle** dengan logic reorder (tanpa library dulu, pakai native drag events agar lightweight)
- Queue sekarang hanya append; tambah ability untuk remove specific queue item
- Auto-advance queue: saat track played, auto-remove dari queue

---

## PILLAR 3: PLAYLIST MANAGEMENT POWER-UPS
**File target:** `src/components/PlaylistPanel.tsx`, `src/context/` (library store)

### A. Fitur yang Ditambahkan
| Fitur | Deskripsi |
|-------|-----------|
| **Rename Playlist** | Long-press atau klik tombol edit pada playlist header |
| **Duplicate Playlist** | Buat salinan playlist yang sudah ada |
| **Track Reorder** | Drag-and-drop track dalam playlist (pakai native HTML5 drag events, tanpa library tambahan) |
| **Playlist Import/Export** | Implementasi JSON export/import. Format: `{ name, tracks: [{ uid, title, artist, source }] }` |
| **Smart Sort** | Sort tracks by: Title, Artist, Date Added, Duration (jika ada) |
| **Empty State** | Saat playlist kosong, tampilkan ilustrasi + "Add songs from search" CTA |

### B. Fix Bug
- Import/Export button saat ini **tidak ada handler** — akan diimplementasikan
- `removeTrackFromCurrentPlaylist` menggunakan `splice` yang mutates array sebelum spread — sudah OK tapi bisa diperbaiki jadi immutable

---

## PILLAR 4: SEARCH & API ROBUSTNESS
**File target:** `src/context/MusicPlayerContext.tsx` (search functions), `src/hooks/`

### A. Search Hook Kustom (`useSearch.ts`)
- **Debounce** — search tidak langsung fire, tunggu 300ms setelah user berhenti ketik (hanya untuk "load more", search utama tetap on-enter)
- **AbortController** — cancel previous request jika search baru di-trigger
- **Error handling** — tidak lagi `catch(e){}`. Tampilkan error toast: "QQ Music unavailable, try another source"
- **Retry logic** — auto-retry 1x dengan exponential backoff (500ms) jika fetch gagal
- **Source status indicator** — di UI, tampilkan dot hijau/merah di setiap source pill untuk menunjukkan apakah source tersebut responding

### B. Track Cache
- Tambah `trackCache` di search store. Jika user search lagu yang sama dalam 5 menit, pakai cached results.
- Cache key: `${keyword}-${source}-${limit}`

---

## PILLAR 5: OFFLINE & LOCAL FILE IMPROVEMENTS
**File target:** `src/context/MusicPlayerContext.tsx`, `src/components/LocalPanel.tsx`

### A. IndexedDB dengan Dexie.js
- Ganti raw IndexedDB API dengan **Dexie.js** (type-safe, promise-based, lebih kecil dari idb)
- Tambah: track metadata indexing, search by title/artist di local tracks
- Tambah: auto-cleanup — hapus blob yang tidak di-play > 30 hari (opsional, bisa di-toggle)

### B. Local File Handling
- Tambah **folder drag-and-drop** — user bisa drag folder ke app untuk import semua audio di dalamnya
- Tambah **recently scanned** — ingat folder terakhir yang discan, auto-rescan saat dibuka lagi
- Tambah **batch metadata edit** — user bisa pilih multiple local tracks dan edit artist/album sekaligus

---

## PILLAR 6: UI/UX IMPROVEMENTS (Tanpa Ubah Design System)
**File target:** `src/styles/music-player.css`, various components

### A. Animasi dengan CSS Transitions (tanpa library)
- FullPlayer slide-up/down: sudah ada, diperhalus
- Track list item hover/active: tambah subtle scale + shadow
- Toast notification: slide-in dari top + fade-out
- Modal: fade + scale in

### B. Visual Improvements
- **Album art shadow/glow** di FullPlayer — saat track playing, tambah subtle glow di belakang cover (match dengan bg color)
- **Lyrics styling** — tambah option untuk "Karaoke mode" (highlight current word, bukan current line)
- **Mini player** — tambah swipe left untuk "skip next", swipe right untuk "prev" (native touch events)
- **Search results** — tambah loading skeleton shimmer saat fetching

### C. Accessibility (a11y)
- Tambah `aria-label` pada semua buttons (play, pause, skip, favorite, etc.)
- Tambah `role="status"` + `aria-live="polite"` pada toast
- Focus management: saat modal dibuka, focus ke first interactive element. Saat ditutup, focus kembali ke trigger.
- Keyboard navigation: Tab order yang masuk akal, Enter/Space untuk activate buttons

---

## PILLAR 7: PERFORMANCE & RELIABILITY
**File target:** All files

### A. Bundle Optimization
- Code splitting: `React.lazy()` untuk FullPlayer, PlaylistPanel, SearchPanel (hanya load saat tab dibuka)
- Tree-shaking: pastikan lucide-react hanya import icons yang dipakai (sudah OK)
- Vite config: tambah `rollup` options untuk manualChunks (react, lodash-style split)

### B. Memory Management
- Revoke blob URL saat track berganti/di-clear (sudah ada di `clearLocalTracks`, ditambahkan ke `playTrack`)
- Cleanup `URL.createObjectURL` di `handleLocalFilesSelect`
- `useEffect` cleanup yang konsisten (cek semua useEffect di context, pastikan cleanup ada)

### C. Network Resilience
- Service Worker (opsional) untuk caching app shell (HTML/CSS/JS) agar bisa di-load offline
- Add `nx` header + cache-control untuk static assets
- Detect offline mode: tampilkan banner "You're offline" dan batalkan search, tapi allow local playback + downloaded tracks

---

## PILLAR 8: NEW LIBRARIES TO INSTALL
**Semua dipilih agar ringan, TypeScript-friendly, dan tidak merusak existing code.**

| Library | Why | Size Impact |
|---------|-----|-------------|
| `zustand@^4` | State management (ganti monolithic context) | ~2KB gzipped |
| `dexie@^4` | IndexedDB wrapper | ~8KB gzipped |
| `uuid@^9` | Safe ID generation | ~1KB gzipped |
| `@tanstack/react-query@^5` | Data fetching, caching, dedup | ~12KB gzipped |
| `wavesurfer.js@^7` | Audio waveform visualization | ~45KB gzipped (atau custom canvas: 0KB) |

**Total tambahan: ~68KB gzipped** (acceptable untuk "powerful" app)

---

## IMPLEMENTATION ORDER (Sprint Breakdown)

### Sprint 1: Foundation (Day 1-2)
1. Install libraries: `zustand`, `dexie`, `uuid`, `@tanstack/react-query`
2. Setup project structure: `src/stores/`, `src/hooks/`, `src/utils/`
3. Migrate context ke Zustand stores (4 stores)
4. Add Error Boundary
5. Update all components untuk consume stores (jangan ubah UI)

### Sprint 2: Playback & Audio (Day 3-4)
1. Create `useAudioPlayer.ts` hook
2. Blob URL cleanup + volume persistence
3. Audio visualization (Visualizer.tsx, integrate ke FullPlayer)
4. Queue improvements (reorder, remove specific item)

### Sprint 3: Playlist Power-Up (Day 5)
1. Implement rename/duplicate playlist
2. Implement track reorder dalam playlist
3. Implement import/export JSON
4. Empty state + smart sort

### Sprint 4: Search Robustness (Day 6)
1. Create `useSearch.ts` hook dengan debounce + AbortController
2. Error handling + retry + source status indicator
3. Track cache (5 min TTL)

### Sprint 5: Offline & Local (Day 7)
1. Migrate IndexedDB ke Dexie
2. Drag-and-drop folder import
3. Recently scanned folders + auto-rescan

### Sprint 6: Polish & Performance (Day 8)
1. Code splitting (React.lazy)
2. CSS animations + accessibility
3. Memory leak audit + cleanup
4. Offline detection banner

### Sprint 7: Testing & QA (Day 9)
1. Manual testing semua flows (search, play, playlist, download, local, offline)
2. Memory profiling (Chrome DevTools)
3. Network throttling test (slow 3G, offline)
4. Cross-browser check (Chrome, Edge, Safari, Firefox)

---

## WHAT STAYS EXACTLY THE SAME
- Apple Music design system (colors, fonts, spacing, border-radius)
- Tab navigation (Home, Search, Local, Library)
- FullPlayer slide-up overlay design
- MiniPlayer floating bar
- Bottom navigation
- iOS-style modals (wheel picker, popover menus)
- Search bar pill design
- Track list card design
- Color palette: `#FA243C` accent, white background, gray secondary

## WHAT GETS BETTER (User-Facing)
- Search lebih stabil (error handling, retry, source status)
- Playlist lebih powerful (rename, reorder, import/export)
- Offline lebih reliable (Dexie, blob cleanup, auto-cleanup)
- Visualizer yang sebenarnya bekerja
- Volume tersimpan antar sesi
- Queue yang bisa di-reorder
- Drag-and-drop local file import
- Auto-play similar tracks (placeholder logic yang bisa di-expand)
- Keyboard shortcuts tetap ada, ditambah accessibility

---

## RISK & MITIGATION
| Risk | Mitigation |
|------|-----------|
| Zustand migration bug | Incremental migration: keep context sebagai fallback selama transisi, hapus setelah verified |
| Dexie migration data loss | Backup localStorage dulu, migrate dengan fallback ke localStorage jika Dexie gagal |
| API proxy down | Source status indicator + fallback message, user bisa pilih source lain |
| Bundle size terlalu besar | Code splitting + dynamic import, wavesurfer bisa diganti custom canvas |
| Browser compatibility | Test di Chrome/Edge/Safari/Firefox, polyfill jika perlu (dexie sudah handle IDB) |

---

## APPROVAL REQUIRED
Setiap sprint akan di-review. Gw mulai dari **Sprint 1** setelah approval.
