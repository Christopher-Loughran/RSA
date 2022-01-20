import { Socket } from "socket.io";

class User {

    constructor(id, public_key, socket) {
        this.id = id;
        this.public_key = public_key;
        this.socket = socket;
    }

    //sends a message to this user from sender_id
    send_message(sender_id, message) {
        this.socket.emit('message', sender_id, message);
    }

    //socket cannot be stringified by JSON so we use this instead
    get_info() {
        return { 'id': this.id, 'public_key': this.public_key }
    }
}



export {
    User
}