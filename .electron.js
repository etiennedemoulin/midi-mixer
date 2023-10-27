const pkg = require('./package.json');

const config = {
  productName: "Midi Mixer",
  // keep versionning synchronized with the current repo
  buildVersion: pkg.version,
  appId: 'fr.ircam.ismm.midi-mixer',
  icon: './public/favicon.ico',
  // to be fixed confirmed...
  publish: [
    {
      provider: 'github',
      owner: 'etiennedemoulin',
      repo: 'midi-mixer',
    }
  ],
  // list of files or directories that we don't want to include in the binary
  // by default the whole application except the .git directory is copied
  exclude: [
    'resources',
    // ...
  ]
  // @todos
  // icons, etc.
}

module.exports = config;
