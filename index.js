import express from "express"
const app = express();

import longpollInit from "./aspects/poll-manager.js"
const longpoll = new longpollInit(app);

import Communicatey from "./aspects/Communicatey.js"

import bodyParser from "body-parser"
import cookieParser from "cookie-parser"

import process from "node:process"

import { trace, serverCommands } from "./aspects/serverside-ui.js"
import cm from "./aspects/channel-manager.js"
import {Channel} from "./aspects/channel-manager.js"
import { updateClients, handle } from "./aspects/request-manager.js"
import User from "./aspects/user-manager.js"
import sm from "./aspects/session-manager.js"
import pray from "./aspects/religion.js"
import { config } from "./aspects/config-manager.js"
import Packet from "./aspects/packet-manager.js"

import crypto from "crypto"
import cors from "cors"
import EventEmitter from "events"

const dir = process.cwd()

// User.list()

serverCommands()

sm.clear(true)

//middleware
app.use(cors()) //and effect
app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.set({ "X-Clacks-Overhead": "GNU Terry Pratchett" })
  next()
})

app.use(express.static('./pages/public'));

longpoll.create("/reciever")


setInterval(() => {
  longpoll.publish("/reciever", new Packet("audienceCheck","Audience Check", null).setPrivate("target","All"))
  trace("Longpoll Audience Check", "@audience")
}, config.audienceCheckDelay)

//pray()

//Testing

let cat = new Communicatey(app,"/update",(req,res)=>{
  req.computed = {
    id:"test"
  }
},{debug:true})

let iterator = 0
// setInterval(()=>{
//   User.Safe.get("f9e50e7e-bee8-42c9-92fc-e2e538c29e50")
//     .then((user)=>{
//       iterator++
//     let clientUpdate = new Packet(
//       "clientUpdate",
//       "message-new",
//       {
//         user:user, 
//         message:{
//           user:{
//             uuid:"f9e50e7e-bee8-42c9-92fc-e2e538c29e50"
//           },
//           content:{
//             message:"This message is fake",
//             timestamp: `${new Date()}`
//           },
//           id:1000+iterator
//         }
//       }
//     )
//     clientUpdate.setPrivate({target:Communicatey.ALL})
//     cat.publish(clientUpdate)
//   })
// },10000)

//Endpoints

app.get('/', (req, res) => {
  res.sendFile(dir + '/pages/lander.html')
});

app.get('/login', (req, res) => {
  res.sendFile(dir + '/pages/login.html')
});

app.get("/file/:loc", (req, res) => {
  res.sendFile(dir + `/pages/public/${req.params.loc}`)
})

app.get('/signup', (req, res) => {
  res.sendFile(dir + '/pages/signup.html')
});

app.get('/chat', (req, res) => {
  res.sendFile(dir + '/pages/chat.html')
});

app.post("/send/:channel", (req, res) => {
  if (config.stopMessages) {
    res.sendStatus(406)
  } else {
    let msg = handle(req.body, res)
    if ((req.cookies.sessionId != 'null' || !config.strictSessionId)) {
      let constructedMessage = {
        user: {
          uuid: sm.sessions[req.cookies.sessionId] ? sm.sessions[req.cookies.sessionId] : "undefined"
        },
        content: {
          message: msg.val,
          timestamp: new Date()
        }
      }

      let message = new Packet(
        crypto.randomUUID(),
        "message",
        {
          message: msg.val,
          timestamp: new Date()
        }
      ).setPublic("hidden",false)
        .setPublic("userUUID",)


      trace(constructedMessage, "@messageIn")

      if (msg.loc == "latest") {
        cm.sendTo(req.params.channel, constructedMessage, () => {
          res.status(200)
          updateClients(req.params.channel)
        })
      } else {
        res.status(503)
      }
      res.send()
    } else {
      let packet = {
        error: "Strict Session Id is enabled - please Log In."
      }
      res.status(401).send(JSON.stringify(packet))
    }
  }
})

app.post("/login", (req, res) => {
  let body = req.body

  trace("Login request recieved for", body, "@login")

  User.find(body).then((userRes)=>{
    trace(userRes, "@debug")
    if (userRes.metadata.public.code == "verif") {
      let sessionId = sm.create(userRes.content.user.userId)
      res.send(sessionId)
    } else if (userRes.metadata.public.code == "passf" || userRes.metadata.public.code == "namef") {
      trace(userRes.metadata.public.code, "@login")
    } else {
      trace("Unexpected Response", "@login")
    }
  })

})

app.post("/signup", (req, res) => {
  trace(req.body)
  User.find({ username: req.body.username, password: req.body.password }).then((pak) => {
    if (pak.metadata.public.code == "namef") {
      let newUser = new User({ username: req.body.username, password: req.body.password }).save()
        .then((userUUID) => {
        User.get(userUUID).then((value) => {
          trace(value)
          res.send(value)
        })
      })
    } else {
      trace(pak.metadata.public.code)
      let packet = {
        error: "User Exists Already"
      }
      res.status(405).send(JSON.stringify(packet))
    }
  })


})

app.post('/load', (req, res) => {
  if (sm.verify(req.body.sessionId)) {
    cm.get("main", (data) => {
      cm.formatForSend(data, 50, (val) => {
        res.send(val)
      })
    })
  } else {
    res.sendStatus(401)
  }
})

// FINAL ENDPOINTS

app.get("/build", (req, res) => {
  let sender = new Packet("channel-update", "updateChannel", {
    build: config.build
  })
  res.json(sender.send())
})

app.get("/reindex/:channel",(req,res)=>{
  trace("@api-Debug","Re-indexing")
  let channel = new Channel(req.params.channel)
  channel.reIndex().then(()=>{
    res.send("Re-indexed")
  })
})

app.get("/create/:type/:title",(req,res)=>{
  trace("@api-Create","Create Request")
  if(!config.strictSessionId || sm.verify(req.headers.sessionid)){
    if(req.params.type=="channel"){
      Channel.create(req.params.title).then((name)=>{
        res.send(name)
      }).catch((err)=>{
        res.status(400).send(err)
      })
      
    } else {
      res.sendStatus(404)
    }
    
  } else {
    res.sendStatus(401)
  }
})

app.get('/channel/:channel', (req, res) => {
  trace("@api-Channel","Channel request from",req.headers.sessionid)
  if (sm.verify(req.headers.sessionid) || !config.strictSessionId) {
    
    let channel = new Channel(req.params.channel)

    // channel.setIndex().then(()=>{
    //   trace("stuff")
    // })
    
    // channel.metadata().then((metadata)=>{
    //   trace("@metadataReturned",metadata)
    // })

    let start, end

    trace(req.query)

    if("start" in req.query && "end" in req.query){
      trace("@api-Channel-debug","Specific Range Requested")
      start = parseInt(req.query.start)
      end = parseInt(req.query.end)
      if(start>=0 && end>=0 && start<end){
        channel.messages({
          start:start, 
          end:end
        }).then((messages)=>{
          trace(messages[0].id)
          continuing(messages)
        })
      } else {
        trace("@api-Channel-WARNING","Invalid Range Request")
        res.status(400).send("Invalid range specified")
      }
      
    } else if(!("start" in req.query || "end" in req.query)){
      trace("@api-Channel-debug","No Range Requested")
      channel.messages({last:50}).then((messages)=>{
        continuing(messages)
      })
      
    } else {
      res.status(400).send("Missing range value")
    }

    function continuing(messages){
      let packetToSend = new Packet("packetToSend","channel-&-users",{
        users:[],
        messages:messages
      })
      
      let uniqueUsers = []

      for(let msg in messages){
        if(!uniqueUsers.includes(messages[msg].user.uuid)) {
          uniqueUsers.push(messages[msg].user.uuid)
        }
      }
      
      let updateEmitter = new EventEmitter("Update")
      
      updateEmitter.on("update",(usr)=>{
        if(packetToSend.content.users.length==uniqueUsers.length){
          // trace(packetToSend.content.users, packetToSend.content.messages)
          res.json(packetToSend.send())
        }
      })

      trace("@uniqueUsers",uniqueUsers)
      
      for(let usr in uniqueUsers){
        User.Safe.get(uniqueUsers[usr]).then((user)=>{
            packetToSend.content.users.push(user)
            updateEmitter.emit("update",usr)
          })
      }
      
    }

    // trace(start,end)    
    
    // channel.reIndex().then(()=>{
    //   trace("stuff")
    // }).catch((err)=>{
    //   console.warn(err)
    // })

    // channel.index({start:800, end:810, type:"object"}).then((index)=>{
    //   trace("Returned",index)
    // }).catch((err)=>{
    //   console.error(err)
    // })

    // channel.restructure((metadata)=>{
    //     return metadata
    //   },
    //   (index,content)=>{
    //     let obj = content
    //     // obj.content.message = cleanString(obj.content.message)
    //     obj.id = index
    //     return obj
    //   }).then(file=>{
    //     trace(file)
    //   })
    
  } else {
    res.sendStatus(401)
  }
})

app.get("/user/:userId",(req,res)=>{
  trace("@api-User","User request from",req.headers.sessionid)
  if(sm.verify(req.headers.sessionid)){
    
    User.get(req.params.userId).then((user)=>{
      if(user.format!="v2"){
        delete user.password
        res.json(user)
      } else if(user.format=="v2"){
        
      }
      
    })
  } else {
    res.sendStatus(401)
  }
})

// FOR REVIEW

app.get("/ping", (req, res) => {
  trace("pinged!")
  res.status(200).send("pong")
})

app.post("/perpetuator", (req, res) => {
  res.status(200).send("Yes, my liege?");
  trace("Divine Command Recieved", "@religion")
  setTimeout(() => {
    pray()
  }, 60000)
})

// NO

app.get("/reactpage", (req,res)=>{
  console.log("react?")
  res.sendFile(dir+"/client/build/index.html")
})

app.listen(3001, () => {
  trace('Server Started', "@server");
});

export { dir, longpoll }