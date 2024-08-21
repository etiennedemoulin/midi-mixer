import configParser from '../utils/config-parser.js';
import generateSchemaFromConfig from '../utils/generate-schema-from-config.js';
import getDefaultFromConfig from '../utils/get-default-from-config.js';


export default async function updateTracks(server, config) {
  // delete schema
  await server.stateManager.deleteSchema('tracks');

  // parse new config
  const staticAppConfig = configParser(config);
  const trackSchema = generateSchemaFromConfig(staticAppConfig);
  // create collection & schema
  const tracks = [];
  await server.stateManager.registerSchema('tracks', trackSchema);

  const channels = staticAppConfig.tracks.map(tracks => parseInt(tracks.channel))
  const maxTrackIndex = Math.max(...channels);

  if (maxTrackIndex + 1 > tracks.length) {
    // console.log(`- create tracks from ${tracks.length} to ${maxTrackIndex}`);

    for (let i = tracks.length; i < maxTrackIndex + 1; i++) {
      tracks[i] = await server.stateManager.create('tracks');
      tracks[i].onUpdate(values => {
        // console.log(values);
      });

      if (!channels.includes(i)) {
        // create enabled track
        await tracks[i].set({
          channel: i,
          disabled: true
        });
      } else {
        // create disabled track
        await tracks[i].set({
          channel: i,
          disabled: false
        });
      }
    }
  } else {
    // console.log(`- delete tracks from ${maxTrackIndex + 1} to ${tracks.length -1}`);

    for (let i = tracks.length -1; i > maxTrackIndex; i--) {
      const track = tracks.find(s => s.get('channel') === i);
      await track.delete();
      tracks.pop();
    }
  }

  // remove old tracks
  tracks.forEach(async track => {
    const channel = track.get('channel');
    if (track.get('disabled') === true) { return };
    if (!channels.includes(channel)) {
      const defaults = track.getDefaults();
      await track.set(defaults);
    }
  });

  // apply updates on changed tracks
  channels.forEach(async channel => {
    const track = tracks.find(s => s.get('channel') === channel);
    // console.log(`update channel ${track.get('channel')}`);
    const updates = getDefaultFromConfig(staticAppConfig, channel);
    // console.log(updates);
    await track.set(updates);
  })

  return tracks;

}
