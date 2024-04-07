
const packet =  async (ctx, next) => {
  // console.log(ctx)
  ctx.socket.emit('res', `server >> ${ctx.socket.id} packet received!`)
  console.log('server >> packet >> ', ctx.packet)
  await next()
}

module.exports = () => packet;