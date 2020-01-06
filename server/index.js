const express = require('express');
const socketio = require('socket.io');
const http = require('http');

//require functions from users.js file
const { addUser, removeUser, getUser, getUsersInRoom } = require('./users.js');

const PORT = process.env.PORT || 5000;

const router = require('./router');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// on function takes two parameters, a string, and an arrow function

io.on('connection', (socket) => {
  // console.log('a user connected');
  socket.on('join', ({ name, room }, callback) => {
    console.log('New user, ' + name + ', joined ' + room);

    const { error, user } = addUser({ id: socket.id, name, room });
    // if error, exit function
    if(error) return callback(error);
    // otherwise, continue

    // sends welcome message to user
    socket.emit('message', {user: 'admin', text: `${user.name}, welcome to the room ${user.room}`});
    // broadcast method sends a message to everyone in the room except specific user
    socket.broadcast.to(user.room).emit('message', {user:'admin', text: `${user.name} has joined!`});

    // join function joins a user to a room, takes room from the user array, room item
    socket.join(user.room);

    io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room)});

    callback();
  })

  // expecting event "on" something happening
  socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id);

    io.to(user.room).emit('message', {user: user.name, text: message});
    io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room)});

    callback();
  });



  socket.on('disconnect', () => {
    console.log('a user disconnected');
    const user = removeUser(socket.id); // remove the user from socket instance

    // announce to room that specific user has left chat room
    if(user) {
      io.to(user.room).emit('message', { user: 'Admin', text: `${user.name} has left.` });
      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room)});
    }
  });
});

app.use(router);

server.listen(PORT, () => console.log(`Server has started on port ${PORT}`));
