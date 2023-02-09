import express from "express"
const app = express();

import longpollInit from "./aspects/poll-manager.js"
const longpoll = new longpollInit(app);

import CommunicateyInit from "./aspects/Communicatey.js"
const Communicatey = new CommunicateyInit(app)

import bodyParser from "body-parser"

import { trace, serverCommands } from "./aspects/serverside-ui.js"
import cm from "./aspects/channel-manager.js"
import { updateClients, handle } from "./aspects/request-manager.js"
import users from "./aspects/user-manager.js"
import sm from "./aspects/session-manager.js"
import pray from "./aspects/religion.js"
import { config } from "./aspects/config-manager.js"
import Packet from "./aspects/packet-manager.js"

const dir = "/home/runner/chat"

trace(typeof users.list)
users.list()

serverCommands()

sm.clear()

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

pray()

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

app.get("/build", (req, res) => {
  let sender = new Packet("channel-update", "updateChannel", {
    build: config.build
  })
  res.json(sender.send())
})

app.post("/send/:channel", (req, res) => {
  if (config.stopMessages) {
    res.sendStatus(406)
    throw ("error")
  } else {

    let msg = handle(req.body, res)
    if ((msg.sessionId != 'null' || !config.strictSessionId)) {
      users.get(sm.sessions[msg.sessionId], (user) => {
        let constructedMessage = {
          user: {
            uuid: sm.sessions[msg.sessionId] ? sm.sessions[msg.sessionId] : "undefined"
          },
          content: {
            message: msg.val,
            timestamp: new Date()
          }
        }


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
      })
    } else {
      let packet = {
        error: "Strict Session Id is enabled - please Log In."
      }
      res.status(401).send(JSON.stringify(packet))
    }
  }
})

app.post("/login", (req, res) => {
  let body
  for (let key in req.body) {
    eval(`body = ${key}`)
  }

  trace("Login request recieved for", body, "@login")

  users.find(body, (userRes) => {
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
  users.find({ username: req.body.username, password: req.body.password }, (pak) => {
    if (pak.metadata.public.code == "namef") {
      users.create({ username: req.body.username, password: req.body.password }, (userUUID) => {
        users.get(userUUID).then((value) => {
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

app.listen(3000, () => {
  trace('Server Started', "@server");
});

export { dir, longpoll }