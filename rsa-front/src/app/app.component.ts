import { Component, OnInit } from '@angular/core';
import { io } from 'socket.io-client';
import { environment } from 'src/environments/environment';




@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{

  id: String;
  public_key = 165246;
  private_key;
  socket;


  userlist: Array<any> = [];
  chatHistory = [];

  currentMessage: string = ""
  currentInterlocutor: string = ""
  currentChat = [];


  constructor() {
  }


  ngOnInit(): void {
    this.socket = io(environment.SOCKET_ENDPOINT);

    this.id = this.generateId(6);

    //generate public / private keys

    this.generatePublicKey(53, 61);

    this.socket.emit('setup_user', this.id, this.public_key);

    this.socket.on('message', (sender_id, msg) => {
      console.log("From " + sender_id + " : " + msg);
      this.recieveMessage(sender_id, msg);
    });


    this.socket.on('get_users', (users) => {
      console.log(users);
      this.updateUsers(JSON.parse(users));
    });
  }

  ngOnDestroy(): void {
    if(this.socket){
      this.socket.disconnect();
    }
  }

  displayError(error: Error) {
    console.error(error.message);
  }


  generateId(length: Number){
    var result = '';
    var vowels = 'aeiouy';
    var consonants = 'bcdfghjklmnpqrstvwxz'
    for ( var i = 0; i < length; i++ ) {
      if(i % 2 == 0){
        result += consonants.charAt(Math.floor(Math.random() * consonants.length));
      }
      else{
        result += vowels.charAt(Math.floor(Math.random() * vowels.length));
      }
   }
   return result;
  }

  chatWith(user_id){
    this.currentInterlocutor = user_id;
    this.updateCurrentChat(user_id);
    for(var i in this.chatHistory){
      if(this.chatHistory[i].id == user_id){
        return;
      }
    }
    this.chatHistory.push({'id': user_id, 'chat': []});
  }

  sendMessage(dest_id, message){

    if(message != ""){
      if(dest_id != ""){

      //encode message

      //send message
      this.socket.emit('message', this.id, dest_id, message);

      for(var i in this.chatHistory){
        if(this.chatHistory[i].id == dest_id){


          this.chatHistory[i].chat.push({'sender': "you", 'message': message});
          this.updateCurrentChat(dest_id);
          this.currentMessage = "";
          return;
        }
      }

        //add new user to chat history
        this.chatHistory.push({'id': dest_id, 'chat': []});
        this.updateCurrentChat(dest_id);
      }
      else{
        alert("Please choose another user to talk to.")
      }
    }
  }

  recieveMessage(sender_id, message){

    //decode message

    for(var i in this.chatHistory){ //check if user already has a chat history with sender
      if(this.chatHistory[i].id == sender_id){
        this.chatHistory[i].chat.push({'sender': "them", 'message': message});
        this.updateCurrentChat(sender_id);
        return;
      }
    }

    //add new user to chat history
    this.chatHistory.push({'id': sender_id, 'chat': []});
    this.recieveMessage(sender_id, message);
    this.updateCurrentChat(sender_id);
  }


  updateCurrentChat(user_id){

    if(this.currentInterlocutor == user_id){

      for(var i in this.chatHistory){
        if(this.chatHistory[i].id == user_id){
          this.currentChat = this.chatHistory[i].chat;
          return;
        }
      }
      this.currentChat = [];
    }
  }


  updateUsers(userlist){
    this.userlist = userlist;

    for(var i in this.userlist){
      if(this.currentInterlocutor == this.userlist[i].id){//current user has not left
        return;
      }
    }
    this.currentInterlocutor = "";
    this.currentChat = [];
  }


  generatePublicKey(p, q){
    var n = p*q;
    var m = (p-1)*(q-1);


    var e = 0;

    var i = 1; //iterator
    while(e == 0){

      let candidate = (m*i)+1; //generate e candidate
      this.checkCoPrime(candidate, m);

      e = 1;

      i++;
    }

  }


  checkCoPrime(a, b){

    console.log("co prime" + a + " " + b)
    let factors = this.findFactors(a);
    factors.concat(this.findFactors(b));//create a table containing all the factors of a and b

    factors = factors.sort();

    console.log(factors);
  }


  checkIsPrime(num){
    for(var i = 2; i < num; i++)
      if(num % i === 0) return false;
    return num > 1;
  }


  findFactors(num){
    var factors = [];

    for(let i = 1; i < num; i++) {//TODO: optimize
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


}
