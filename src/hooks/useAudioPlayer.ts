import { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '../stores/playerStore';

const VOLUME_KEY = 'audify_volume_v1';

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevSrcRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const eqNodesRef = useRef<BiquadFilterNode[]>([]);
  const spatialWetGainRef = useRef<GainNode | null>(null);

  const isPlaying = usePlayerStore(s => s.isPlaying);
  const volume = usePlayerStore(s => s.volume);
  const isMuted = usePlayerStore(s => s.isMuted);
  const eqBands = usePlayerStore(s => s.eqBands);
  const spatialAudio = usePlayerStore(s => s.spatialAudio);
  const currentTrack = usePlayerStore(s => s.currentTrack);

  const { setIsPlaying, setDuration, setCurrentTime, playTrack } = usePlayerStore();

  useEffect(() => {
    const saved = localStorage.getItem(VOLUME_KEY);
    if (saved) {
      const v = parseFloat(saved);
      if (!isNaN(v) && v >= 0 && v <= 1) {
        usePlayerStore.setState({ volume: v });
      }
    }
  }, []);

  const setupAudioContext = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audioContextRef.current) return;

    try {
      const src = audio.src;
      if (!src || src.startsWith('blob:')) {
        const ctx = new (window.AudioContext || (window as unknown as Record<string, unknown>).webkitAudioContext as typeof AudioContext)();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;

        const source = ctx.createMediaElementSource(audio);
        
        // Setup EQ Bands (32Hz, 64Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, 16kHz)
        const freqs = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
        const eqNodes = freqs.map(freq => {
          const filter = ctx.createBiquadFilter();
          filter.type = 'peaking';
          filter.frequency.value = freq;
          filter.Q.value = 1.41;
          filter.gain.value = 0;
          return filter;
        });

        // Routing: source -> eq[0] -> ... -> eq[9] -> (spatial parallel) -> analyser -> destination
        source.connect(eqNodes[0]);
        for (let i = 0; i < eqNodes.length - 1; i++) {
          eqNodes[i].connect(eqNodes[i + 1]);
        }
        
        // Spatial Audio (Haas Effect + slight EQ) Setup
        const lastEq = eqNodes[eqNodes.length - 1];
        
        // Dry path
        const dryGain = ctx.createGain();
        dryGain.gain.value = 1;
        lastEq.connect(dryGain);
        
        // Wet path (Spatial widening via delay)
        const wetGain = ctx.createGain();
        wetGain.gain.value = 0; // Starts off
        
        const splitter = ctx.createChannelSplitter(2);
        const merger = ctx.createChannelMerger(2);
        const delayRight = ctx.createDelay();
        delayRight.delayTime.value = 0.025; // 25ms Haas delay on right channel for wider effect
        
        lastEq.connect(splitter);
        splitter.connect(merger, 0, 0); // Left straight through
        splitter.connect(delayRight, 1); // Right through delay
        delayRight.connect(merger, 0, 1);
        
        merger.connect(wetGain);
        
        dryGain.connect(analyser);
        wetGain.connect(analyser);
        analyser.connect(ctx.destination);

        audioContextRef.current = ctx;
        analyserRef.current = analyser;
        sourceRef.current = source;
        eqNodesRef.current = eqNodes;
        spatialWetGainRef.current = wetGain;
      }
    } catch (e) {
      console.error('Web Audio API setup failed:', e);
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const cur = audio.currentTime || 0;
      const dur = audio.duration || 0;
      setCurrentTime(cur);
      setDuration(dur);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      usePlayerStore.getState().playNext('next');
    };
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [setIsPlaying, setDuration, setCurrentTime]);

  const play = useCallback(async (src: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (prevSrcRef.current && prevSrcRef.current.startsWith('blob:') && prevSrcRef.current !== src) {
      URL.revokeObjectURL(prevSrcRef.current);
    }
    audio.src = src;
    prevSrcRef.current = src;
    setupAudioContext();
    try {
      await audio.play();
    } catch (e) {
      console.error('Playback failed:', e);
    }
  }, [setupAudioContext]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (audio) audio.pause();
  }, []);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = time;
  }, []);

  const setVolumeAudio = useCallback((v: number) => {
    const audio = audioRef.current;
    if (audio) audio.volume = v;
    localStorage.setItem(VOLUME_KEY, String(v));
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Update EQ Node gains when store changes
  useEffect(() => {
    if (eqNodesRef.current.length === eqBands.length) {
      eqBands.forEach((gain, i) => {
        if (eqNodesRef.current[i]) {
          eqNodesRef.current[i].gain.setTargetAtTime(gain, audioContextRef.current?.currentTime || 0, 0.1);
        }
      });
    }
  }, [eqBands]);

  // Update Spatial Audio
  useEffect(() => {
    if (spatialWetGainRef.current) {
      spatialWetGainRef.current.gain.setTargetAtTime(spatialAudio ? 1.0 : 0, audioContextRef.current?.currentTime || 0, 0.1);
    }
  }, [spatialAudio]);

  useEffect(() => {
    if (!currentTrack) return;
    const playAndUpdate = async () => {
      const result = await playTrack(currentTrack);
      if (result && result.src) {
        const audio = audioRef.current;
        if (audio && audio.src !== result.src) {
          audio.src = result.src;
        }
        if (usePlayerStore.getState().isPlaying) {
          await play(result.src);
        }
      }
    };
    playAndUpdate();
  }, [currentTrack?.uid]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  return {
    audioRef,
    audioContextRef,
    analyserRef,
    play,
    pause,
    seek,
    setVolume: setVolumeAudio,
  };
}
