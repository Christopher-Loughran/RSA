import {Component, OnInit} from '@angular/core';
import {io} from 'socket.io-client';
import {environment} from 'src/environments/environment';
import * as prime from 'prime-functions'
import * as bigInt from "big-integer";
import {Md5} from "md5-typescript";


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title: "rsa-front";

  id: String;
  public_key;
  private_key;
  socket;

  //list of other users
  userList: Array<any> = [];
  chatHistory = [];

  currentMessage: string = ""
  currentInterlocutor: string = ""
  currentChat = [];


  constructor() {
  }


  ngOnInit(): void {
    this.socket = io(environment.SOCKET_ENDPOINT);

    this.id = this.generateId(6);

    let seeds = this.generateSeeds(2); //generate p and q
    this.generateKeys(seeds.p, seeds.q);

    console.log("public key: " + JSON.stringify(this.public_key));
    console.log("private key: " + JSON.stringify(this.private_key));

    this.socket.emit('setup_user', this.id, this.public_key);

    this.socket.on('message', (sender_id, msg) => {
      console.log("From " + sender_id + " : " + msg);
      this.receiveMessage(sender_id, msg);
    });


    this.socket.on('get_users', (users) => {
      console.log(users);
      this.updateUsers(JSON.parse(users));
    });
  }


  ngOnDestroy(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  generateId(length: Number) {
    var result = '';
    var vowels = 'aeiouy';
    var consonants = 'bcdfghjklmnpqrstvwxz'
    for (var i = 0; i < length; i++) {
      if (i % 2 == 0) {
        result += consonants.charAt(Math.floor(Math.random() * consonants.length));
      } else {
        result += vowels.charAt(Math.floor(Math.random() * vowels.length));
      }
    }
    return result;
  }

  //choose another user to talk to
  chatWith(user_id) {
    this.currentInterlocutor = user_id;
    this.updateCurrentChat(user_id);
    for (var i in this.chatHistory) {
      if (this.chatHistory[i].id == user_id) {
        return;
      }
    }
    this.chatHistory.push({'id': user_id, 'chat': []});
  }


  //encode and send message
  sendMessage(dest_id, message) {

    if (message != "") {
      if (dest_id != "") {

        //encode message
        let dest_key = this.getPublicKey(dest_id);
        let cipher = JSON.stringify(this.encrypt(dest_key, message));

        //send message
        this.socket.emit('message', this.id, dest_id, cipher);

        for (let i in this.chatHistory) {
          if (this.chatHistory[i].id == dest_id) {


            this.chatHistory[i].chat.push({'sender': "you", 'message': message});
            this.updateCurrentChat(dest_id);
            this.currentMessage = "";
            return;
          }
        }

        //add new user to chat history
        this.chatHistory.push({'id': dest_id, 'chat': []});
        this.updateCurrentChat(dest_id);
      } else {
        alert("Please choose another user to talk to.")
      }
    }
  }


  getPublicKey(user_id){

    for(let i in this.userList){
      if(this.userList[i].id == user_id){
        return this.userList[i].public_key
      }
    }
    throw new Error("No user with that id exists");
  }



  //decode and display message
  receiveMessage(sender_id, message) {

    //decode message

    let decrypted_message = this.decrypt(this.private_key, message);
    if(!decrypted_message){
      return;
    }

    for (var i in this.chatHistory) { //check if user already has a chat history with sender
      if (this.chatHistory[i].id == sender_id) {
        this.chatHistory[i].chat.push({'sender': "them", 'message': decrypted_message});
        this.updateCurrentChat(sender_id);
        return;
      }
    }

    //add new user to chat history and insert first message
    this.chatHistory.push({'id': sender_id, 'chat': [{'sender': "them", 'message': decrypted_message}]});
    this.updateCurrentChat(sender_id);
  }


  updateCurrentChat(user_id) {

    if (this.currentInterlocutor == user_id) {

      for (var i in this.chatHistory) {
        if (this.chatHistory[i].id == user_id) {
          this.currentChat = this.chatHistory[i].chat;
          return;
        }
      }
      this.currentChat = [];
    }
  }


  updateUsers(userlist) {
    this.userList = userlist;

    for (var i in this.userList) {
      if (this.currentInterlocutor == this.userList[i].id) {//current user has not left
        return;
      }
    }
    this.currentInterlocutor = "";
    this.currentChat = [];
  }


  generateKeys(p, q){
    const n = p * q;
    const m = (p - 1) * (q - 1);

    let e;
    const candidates = [3, 5, 17, 257, 65537];

    for(let i in candidates){ //choose e from candidates
      if(candidates[i] < m && this.greatestCommonDivisor(candidates[i], m) == 1 && this.checkCoPrime(candidates[i], m)){
        e = candidates[i];
        break;
      }
    }

    this.public_key = {'n': n, 'e': e};

    let d = this.modInverse(e, m);

    this.private_key = {'n': n, 'd': d};

  }

  modInverse(a, m) {
    for(let x = 1; x < m; x++){
      if (((a % m) * (x % m)) % m == 1){
        return x;
      }
    }
    return 0;
  }


  checkCoPrime(a, b){

    let factors = this.findFactors(a);
    factors.concat(this.findFactors(b));//create a table containing all the factors of a and b

    factors = factors.sort();

    for(let i = 0; i < factors.length-1; i++){
      if(factors[i] == factors[i+1]){//a and b share a common factor
        return false;
      }
    }
    return true;
  }


  findFactors(num){
    var factors = [];

    for(let i = 1; i < (num/2)+1; i++) {
      // check if number is a factor
      if(num % i == 0) {
        factors.push(i);
      }
    }
    return factors;
  }

  greatestCommonDivisor(a, b) {
    if (!b) {
      return a;
    }
    return this.greatestCommonDivisor(b, a % b);
  }

  generateSeeds(size){

    let min = 10**size
    let max = 10**(size+1)

    let p = prime.randomPrime(min, max)
    let q = prime.randomPrime(min, max)

    return {'p': p, 'q': q}
  }


  encrypt(public_key, message){
    let e = bigInt(public_key.e);
    let n = bigInt(public_key.n);

    let cipher = []

    for(let i in message){
      let code = bigInt(message[i].charCodeAt(0));
      let c = code.pow(e).mod(n).toJSNumber();

      console.log(message[i] + " -> (" + message[i].charCodeAt(0) +  "**" + e + ") mod " + n + " -> " + c );
      cipher.push(c)
    }

    return {'cipher' : cipher, 'hash': Md5.init(message)};
  }


  decrypt(private_key, encrypted_message_json){
    let received = JSON.parse(encrypted_message_json);
    let encrypted_message = received.cipher;
    let hash = received.hash;

    let d = private_key.d;
    let n = private_key.n;

    console.log("started decrypt");

    let message = ""

    for(let i in encrypted_message){
      let c = bigInt(encrypted_message[i]);
      let value = c.pow(d).mod(n).toJSNumber();
      let char = String.fromCharCode(value)
      console.log("(" + c + "**" + d + ") mod " + n + " -> " + value + " -> " + char);
      message += char

      c = null; //optimised
      value = null;
      char = null;
    }

    console.log("decrypt finished");

    if(Md5.init(message) == hash){
      console.log("Message hashes identical, decrypt successful.")
      return message;
    }
    else{
      console.error("Message hashes not identical, decrypt failed.")
      return false;
    }
  }
}



