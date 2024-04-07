
const connection = async (ctx, next) => {
  ctx.socket.emit('res', `server >> ${ctx.socket.id} connected!`)
  console.log('server >> socket connected', ctx.socket.id)
  await next()
}

module.exports = () => connection;