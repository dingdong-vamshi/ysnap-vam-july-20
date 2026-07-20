import { useEffect, useState } from 'react';
import { getGlobalPlaybackSpeed, subscribePlaybackSpeed } from '../lib/playbackSpeed';

export const useGlobalPlaybackSpeed = () => {
  const [speed, setSpeed] = useState(() => getGlobalPlaybackSpeed());

  useEffect(() => subscribePlaybackSpeed(setSpeed), []);

  return speed;
};
