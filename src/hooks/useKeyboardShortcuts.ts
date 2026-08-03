import { useEffect, useRef } from 'react';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { usePlayerStore } from '../stores/playerStore';

export function useKeyboardShortcuts() {
  const { togglePlayPause, playNext, toggleFavoriteCurrent } = useMusicPlayer();
  const prevVolumeRef = useRef<number>(0.8);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const code = e.code;

      if (code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (code === 'ArrowRight') {
        e.preventDefault();
        const audio = document.getElementById('audio') as HTMLAudioElement;
        const dur = usePlayerStore.getState().duration;
        const cur = usePlayerStore.getState().currentTime;
        if (audio && dur > 0) {
          const newTime = Math.min(dur, cur + 5);
          audio.currentTime = newTime;
          usePlayerStore.getState().setCurrentTime(newTime);
        }
      } else if (code === 'ArrowLeft') {
        e.preventDefault();
        const audio = document.getElementById('audio') as HTMLAudioElement;
        const cur = usePlayerStore.getState().currentTime;
        if (audio) {
          const newTime = Math.max(0, cur - 5);
          audio.currentTime = newTime;
          usePlayerStore.getState().setCurrentTime(newTime);
        }
      } else if (code === 'ArrowUp') {
        e.preventDefault();
        const curVol = usePlayerStore.getState().volume;
        const newVol = Math.min(1, curVol + 0.05);
        usePlayerStore.getState().setVolume(newVol);
        const audio = document.getElementById('audio') as HTMLAudioElement;
        if (audio) audio.volume = newVol;
      } else if (code === 'ArrowDown') {
        e.preventDefault();
        const curVol = usePlayerStore.getState().volume;
        const newVol = Math.max(0, curVol - 0.05);
        usePlayerStore.getState().setVolume(newVol);
        const audio = document.getElementById('audio') as HTMLAudioElement;
        if (audio) audio.volume = newVol;
      } else if (key === 'n') {
        playNext('next');
      } else if (key === 'p') {
        playNext('prev');
      } else if (key === 'f') {
        toggleFavoriteCurrent();
      } else if (key === 'm') {
        const curVol = usePlayerStore.getState().volume;
        const audio = document.getElementById('audio') as HTMLAudioElement;
        if (curVol > 0) {
          prevVolumeRef.current = curVol;
          usePlayerStore.getState().setVolume(0);
          if (audio) audio.volume = 0;
        } else {
          const rest = prevVolumeRef.current || 0.8;
          usePlayerStore.getState().setVolume(rest);
          if (audio) audio.volume = rest;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, playNext, toggleFavoriteCurrent]);
}
