import { info } from 'console';
import express from 'express';
import { createServer } from 'http';
import { Server } from "socket.io";
import { User } from './User.js'


var adress = "127.0.0.1";
var port = 2551;


const app = express();

const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origins: ['http://localhost:4200']
    }
});



var users = [];


io.on('connection', (socket) => {

    console.log("new user connected");

    //user connects sends id and public key 
    socket.on('setup_user', (id, key) => {
        console.log("New user setup")
        users.push(new User(id, key, socket));

        //broadcast new user list to everyone
        broadcastUserList();
    });


    //user has sent a message to dest_id
    socket.on('message', (sender_id, dest_id, msg) => {
        console.log(sender_id + " -> " + dest_id + " : " + msg);

        for (var i in users) {
            if (dest_id == users[i].id) {
                users[i].send_message(sender_id, msg);
            }
        }

    });


    //remove user from users list
    socket.on('disconnect', () => {

        for (var i in users) {
            if (socket == users[i].socket) {
                console.log("User " + users[i].id + " disconnected");
                users.splice(i, 1);
            }
        }

        //broadcast new user list to everyone
        broadcastUserList();
    });

});


//send users list to all users
function broadcastUserList() {
    var info = [];
    for (var i in users) {
        info.push(users[i].get_info());
    }

    io.sockets.emit('get_users', JSON.stringify(info))
}


httpServer.listen(port, adress, function() {
    console.log('Server listening on ' + adress + ":" + port);
});