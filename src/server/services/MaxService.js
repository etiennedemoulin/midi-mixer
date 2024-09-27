class MaxService {
  constructor(node, Max) {
    this.node = node;
    this.Max = Max;


    this.init();
  }

  async init() {
    const tracks = await this.node.stateManager.getCollection('tracks');
  }
}


export default MaxService;
