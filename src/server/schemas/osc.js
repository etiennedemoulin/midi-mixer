export const oscSchema = {
  ip: {
    type: 'any',
    default: '127.0.0.1',
    nullable: false,
  },
  port: {
    type: 'any',
    default: {
      server: 4002,
      client: 4001
    },
    nullable: false,
  }
}
