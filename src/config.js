// Every tunable number lives here, so game feel can be adjusted in one place.
export const config = {
  loop: {
    // Longest frame step we simulate at once (see game/time.js).
    maxDeltaSeconds: 1 / 30,
  },
  render: {
    antialias: true,
    shadowMapSize: 2048,
    // Sky dome gradient. The horizon color is also the fog color so distant ground fades out.
    sky: { zenith: '#5b8fd8', horizon: '#cfdfee' },
    // Linear fog, in meters from the camera. Hides the edge of the world.
    fog: { start: 45, end: 120 },
    // Direction the sunlight travels. Keep x/z small-ish so faces get distinct brightness.
    // Sun + fill should add up to roughly 1 on sunlit ground, or colors wash out to white.
    sun: { direction: [-0.4, -1, 0.9], intensity: 0.85, color: '#fff3dc' },
    // Soft light from the sky above and bounced light from the ground below.
    fill: { intensity: 0.5, skyColor: '#dbe8f5', groundColor: '#7d8a62' },
  },
  debug: {
    showFps: true,
    // KeyboardEvent.code that toggles the Babylon Inspector (the ` key, left of 1).
    inspectorKey: 'Backquote',
  },
};
