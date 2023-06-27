import { Client as OscClient, Server as OscServer, Bundle } from 'node-osc';


export function removeMaxTrack(track) {
  const channel = track.get('channel');
  const bundle = new Bundle([`/track/${channel}/remove`, 0]);
  const oscClient = new OscClient('127.0.0.1', 3334);
  oscClient.send(bundle, () => oscClient.close());
  console.log(`* remove Max Track ${channel}`);
}

export function createMaxTrack(track) {
  const channel = track.get('channel');
  const bundle = new Bundle([`/track/${channel}}/create`, 0]);
  const oscClient = new OscClient('127.0.0.1', 3334);
  oscClient.send(bundle, () => oscClient.close());
  console.log(`* create Max Track ${channel}`)
}

export function nameMaxTrack(track) {
  const channel = track.get('channel');
  const name = track.get('name');
  const bundle = new Bundle([`/track/${channel}}/name`, name]);
  const oscClient = new OscClient('127.0.0.1', 3334);
  oscClient.send(bundle, () => oscClient.close());
  console.log(`* name max track ${channel}`)
}

export function dumpMaxTrack(track) {
  const channel = track.get('channel');
  const name = track.get('name');
  const bundle = new Bundle(
    [`/track/${channel}/create`, 0],
    [`/track/${channel}/name`, name]
  );
  const oscClient = new OscClient('127.0.0.1', 3334);
  oscClient.send(bundle, () => oscClient.close());
}
