class MidiService {
  constructor(node) {
    this.node = node;



    this.init();
  }

  async init() {
    const tracks = await this.node.stateManager.getCollection('tracks');
  }
}


export default MidiService;
