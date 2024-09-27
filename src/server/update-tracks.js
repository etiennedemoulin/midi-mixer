import { parseTrackConfig } from '../utils/config-parser.js';
import generateSchemaFromConfig from '../utils/generate-schema-from-config.js';
import getDefaultFromConfig from '../utils/get-default-from-config.js';


export default async function updateTracks(server, globals, config) {
  // delete schema
  await server.stateManager.deleteSchema('tracks');

  // to store globally
  const parameterNames = Object.keys(config.parameters);
  const mapping = config.mapping;

  globals.set({ parameterNames, mapping });

  // parse new config
  const trackConfig = parseTrackConfig(config);
  const trackSchema = generateSchemaFromConfig(trackConfig);
  console.log(trackSchema);
  await server.stateManager.registerSchema('tracks', trackSchema);

  const tracks = [];

  const channels = trackConfig.map(t => t.channel);
  const maxTrackIndex = Math.max(...channels);

  for (let i = 0; i <= maxTrackIndex; i++) {
    const track = await server.stateManager.create('tracks');

    if (channels.includes(i)) {
      const initValues = getDefaultFromConfig(trackConfig, i);
      // create enabled track
      await track.set({
        channel: i,
        disabled: false,
        ...initValues,
      });
    } else {
      // create disabled track
      await track.set({
        channel: i,
        disabled: true
      });
    }

    tracks[i] = track;
  }

  return tracks;
}
