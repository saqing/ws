const express = require('express')
const http = require('http')
const sio = require('socket.io')
const compression = require('compression')

const app = express()

let port = process.env.PORT || 9999

// let server = https.createServer(options, app).listen(port)
let server = http.createServer(app).listen(port)
let io = sio(server)
// compress all requests
app.use(compression())
app.disable('x-powered-by')
io.sockets.on('connection', socket => {
  let room = ''
  const create = err => {
    if (err) {
      return console.log(err)
    }
    socket.join(room)
    socket.emit('create')
  }
  // sending to all clients in the room (channel) except sender
  socket.on('message', message => {
    console.log(message)
    socket.broadcast.to(room).emit('message', message)
  })
  socket.on('find', () => {
    const url = socket.request.headers.referer.split('/')
    room = url[url.length - 1]
    const sr = io.sockets.adapter.rooms[room]
    if (sr === undefined) {
      // no room with such name is found so create it
      socket.join(room)
      socket.emit('create')
    } else if (sr.length === 1) {
      socket.emit('join')
    } else { // max two clients
      socket.emit('full', room)
    }
  })
  socket.on('auth', data => {
    data.sid = socket.id
    // sending to all clients in the room (channel) except sender
    socket.broadcast.to(room).emit('approve', data)
  })
  socket.on('accept', id => {
    io.sockets.connected[id].join(room)
    // sending to all clients in 'game' room(channel), include sender
    io.in(room).emit('bridge')
  })
  socket.on('reject', () => socket.emit('full'))
  socket.on('leave', () => {
    // sending to all clients in the room (channel) except sender
    socket.broadcast.to(room).emit('hangup')
    socket.leave(room)
  })
})
