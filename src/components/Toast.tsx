import { useMusicPlayer } from '../context/MusicPlayerContext';

export default function Toast() {
  const { toastMsg, toastVisible } = useMusicPlayer();

  return (
    <div id="toast" className={toastVisible ? 'show' : ''}>
      {toastMsg}
    </div>
  );
}
