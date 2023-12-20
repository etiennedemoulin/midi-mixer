let Max;

export function createMaxEnvironment(app) {
  // import Max
  Max = require('max-api');


  // create handlers
  Max.addHandlers({
    [Max.MESSAGE_TYPES.BANG]: () => {},
    [Max.MESSAGE_TYPES.LIST]: () => {},
    [Max.MESSAGE_TYPES.NUMBER]: () => {},
    [Max.MESSAGE_TYPES.DICT]: (dict) => {
      app.core.set({
        config: {
          name: null,
          target: dict.array
        }
      })
    },
    maxId: (maxId) => app.max.id = maxId,
    done: () => bootstrap(app),
    dictName: async (name) => {
      let dict;
      try {
        dict = await Max.getDict(name);
      } catch(err) {
        console.log(`no dict ${name}`);
      }
      app.core.set({
        config: {
          active: name,
          target: dict.array
        }
      });
    },
    table: (update) => {
      const table = app.core.get('table');
      if (table.list.includes(update)) {
        table.active = update;
      }
      app.core.set({
        table: table
      });
    },
    [Max.MESSAGE_TYPES.ALL]: (handled, ...args) => onMaxMessage(handled, ...args),
  });

  Max.outletBang();
};

function onMaxMessage(handled, ...args) {
  if (handled) {
    return;
  }
  console.log(...args);
}

async function bootstrap(app) {
  try {
    Max.post(`maxID : ${app.max.id} || target-config : ${app.core.get('config')} || table : ${app.core.get('table').active}`);
  } catch(err) {
    console.log(err);
  }

  Max.post(`> client is ready!`);
  app.max.boxes = await Max.getDict(`${app.max.id}_midi-mixer-boxes`);

}


