import fsp from "fs/promises"
import readlineInit from "readline"
import EventEmitter from "events"

const readline = readlineInit.createInterface({
  input: process.stdin,
  output: process.stdout
});

import express from "express"
import bodyParser from "body-parser"
import pkg from "pg"
const { Client } = pkg

const client = new Client(process.env.DATABASE_URL)

import cm from "./channel-manager.js"
import sm from "./session-manager.js"
import User from "./user-manager.js"
import pray from "./religion.js"
import longpoll from "./poll-manager.js"
import { updateClients, handle } from "./request-manager.js"
import { config, updateConfig } from "./config-manager.js"
import { time } from "console";

let consoleContents = []
let updateDev = new EventEmitter()

if(config.devServer){
  const devApp = express()

  devApp.use(bodyParser.json());

  devApp.use("/dev/:anything",(req,res,next)=>{
    express.static(`.././pages-dev/${req.params.anything}`)(req,res,next)
  })

  devApp.get("/dev/console",(req,res)=>{
    res.sendFile(".././pages-dev/console/index.html")
  })

  devApp.post("/dev/console",(req,res)=>{
    if(req.headers["password"]==config.devPassword){
      trace("Client typed:",req.body)
    }
  })

  devApp.get("/dev/consoleContents",(req,res)=>{
    if(req.headers["password"]==config.devPassword){
      res.json(consoleContents)
    }
  })

  devApp.get("/dev/consoleUpdates",(req,res)=>{
    trace("Client Connected")
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    })

    let emitHandler = (message)=>{
      res.write("data: "+message+"\n\n")
    }

    updateDev.on("console",emitHandler)

    req.on("close",()=>{
      trace("Client Disconnected")
      updateDev.removeListener(emitHandler)
    })

    req.on("end",()=>{
      trace("Client Disconnected")
      updateDev.removeListener(emitHandler)
    })

    req.on("error",()=>{
      trace("Client Error")
      updateDev.removeListener(emitHandler)
    })
  })

  devApp.listen(4001,()=>{
    console.log("Developer Access Server started at :4001")
  })

}

let serverSide = {}
serverSide.echo = (val) => {
  trace("echo... echo...", "@server")
}

serverSide.send = (message) => {
  let constructedMessage = {
    user: {
      uuid: "Server"
    },
    content: {
      message: message,
      timestamp: new Date()
    }
  }
  cm.sendTo("main", constructedMessage, () => {
    trace("Sent Server message", "@server")
    updateClients("main")
  })
}

serverSide.user = async function (uuid) {
  let tempUser = await new User().load(uuid)
  trace(tempUser, "@server")
}

serverSide.editUser = async function (uuid) {
  trace(`>------Entering Edit Mode-------<`, "@userEditor")
  this.tempUser = await new User().load(uuid)
  trace(`serverSide.tempUser =`, this.tempUser, "@userEditor")

}

serverSide.editUserSafemode = async function (uuid) {
  trace(`>------Entering Safe Edit Mode-------<`, "@userEditor")
  this.tempUser = await new User.Safe({
    read: ["sensitive", "constant", "data"],
    write: ["sensitive", "data", "constant"]
  }).load(uuid)
  trace(`serverSide.tempUser =`, this.tempUser.getAll(), "@userEditor")

}

serverSide.run = (command) => {
  try {
    eval(command)
    trace("Running", command, "@server")
  } catch (err) {
    trace("Command encountered error:", err, "@server")
  }
}

serverSide.reload = (blank) => {
  updateConfig()
  trace("Config Updated", "@server")
}

function getErrorObject() {
  try { throw Error('') } catch (err) { return err; }
}

function trace(...args) {
  if (config.trace.general) {
    let outputArgs = []
    let preface = []
    let flag = "[anonymous]"
    let rule = ""
    let time = `${new Date().toLocaleTimeString()}`
    let line = "unknown"
    for (let arg in args) {
      if (typeof args[arg] == "string" && args[arg].substring(0, 1)=="@") {
        flag = `[${args[arg].substring(1)}]`
        rule = args[arg].substring(1)
      } else {
        outputArgs.push(args[arg])
      }
    }

    let errStack = getErrorObject().stack
    let caller = ""
    try {
      caller = [...errStack.match(/\n    at file:.*/)]
    }catch(err){
      caller = "err"
    }

    switch (config.trace.lineMode) {
      case "full":
        line = errStack
        break;
      case true:
        line = errStack
        break;
      case "path":
        line = caller[0].toString()
        break;
      case "file":
        line = caller[0].toString().split("/").at(-1)
        break;
    }


    if (config.trace.lineMode && config.trace.lineMode!="none") preface.push(line)
    if (config.trace.timestamp) preface.push(time)
    if (config.trace.consoleFlags) preface.push(flag)

    if(config.trace.rules[rule] != false){
      if(config.devServer){
        consoleContents.push([...preface,...outputArgs])
      }
      
      console.log(...preface, ...outputArgs)
    }
  }
}

function traceOld(...args) {

  let err = getErrorObject();
  let caller = err.stack.match(/\n    at file:[a-zA-Z0-9\/:\-\._=\(\)\s]*/)
  let clean = "unknown"

  if (caller) {
    let end = caller.toString().split("/").at(-1)
    clean = config.trace.rules.fullLine ? err.stack : end
  }

  let typeFlag = null
  let typeFlagFrmt = ""
  let time = ""
  let line = ""
  let command;
  if (typeof args[0] == "string" && args[0].substring(0, 1) == "@") {
    typeFlag = args[0].substring(1, args[0].length)
    command = `console.log(line+time+typeFlagFrmt, `
  } else {
    command = `console.log(line+typeFlagFrmt, args[0], `
  }
  for (let i = 1; i < args.length; i++) {
    if (typeof args[i] == "string" && args[i].substring(0, 1) == "@") {
      typeFlag = args[i].substring(1, args[i].length)
    } else {
      command += `args[${i}], `
    }
  }
  command += `"")`

  if (config.trace.rules.consoleFlags) {
    typeFlagFrmt = `[${typeFlag}]`
  }

  if (config.trace.rules.timestamp) {
    time = `|${new Date().toLocaleTimeString()}| `
  }

  if (config.trace.rules.line) {
    line = `@${clean} `
  }

  if (config.trace.general) {
    if (config.trace.rules[typeFlag] != false) {
      eval(command)
    }
  }
}

async function serverCommands() {
  readline.question("", command => {
    command = command.split(":")
    try {
      serverSide[command[0]](command[1])
    } catch (err) {
      trace(`"${command}" is not a recognised command.`, err, "@server")
    }
    serverCommands()
  });
}

serverSide.sqlOpen = async (q) => {
  try {
    await client.connect()
    trace("Client Connected", "@sqldb")
  } catch (err) {
    trace("Connection Failed:", err, "@sqldb")
  }

}

serverSide.sqlQuery = async (q) => {
  try {
    let response = await client.query(q)
    trace("Query Made, Response:", response.rows, "@sqldb")
  } catch (err) {
    trace("Query Failed:", err.message, err.detail, err, "@sqldb")
  }
}

serverSide.sql = serverSide.sqlQuery

serverSide.sqlClose = async (q) => {
  try {
    await client.end()
    trace("Client Connection Ended", "@sqldb")
  } catch (err) {
    trace("Connection End Failed:", err, "@sqldb")
  }

}

serverSide.end = (e) => {
  process.exit(parseInt(e))
}

serverSide.sqlRun = (e) => {
  let oldDb = {
    '00d155ef-62c3-49ab-98f7-dfcd96ac306c': { username: 'thomas_hobro', password: 'supersecurepassword' },
    '065f7322-cf72-4a72-a5d0-093e484fbb23': {
      username: 'Party Poison',
      password: 'FabulousKilljoys',
      creationDate: '2023-03-07T14:05:12.751Z'
    },
    '0be6be8a-d57c-46e5-9230-000372911163': { username: '18laxa@sawstonvc.org', password: 'wardscottage' },
    '0e85af09-f7df-46ce-b841-56ddea923226': { username: 'Holly', password: 'BeansOnToast' },
    '2523c417-fe19-4d12-b784-5d7a787dc60e': {
      username: 'Tim',
      password: 'mh',
      creationDate: '2023-03-23T11:37:47.488Z'
    },
    '34d69341-ec38-4582-b563-48fc957d5050': { username: 'Kai', password: 'hello' },
    '35858279-ac58-44d0-a00a-249096921e0d': { username: 'Test2', password: 'zxcv' },
    '3b605c54-993f-4569-8f83-3c31fe520738': {
      username: 'Michael',
      password: 'Eb',
      creationDate: '2023-03-06T11:28:49.096Z'
    },
    '483df911-f32b-4188-add1-26c04c7de7f1': { username: 'Theo', password: 'TW' },
    '6b98647d-8306-4199-8395-72d6250c1deb': { username: 'Test3', password: 'Happiness' },
    '74c1b70e-e5ee-49a6-85ce-46a6dcca5a92': {
      username: 'Etho',
      password: 'etho',
      creationDate: '2023-05-10T08:34:25.806Z'
    },
    '7ad46649-5483-49e3-a5db-03125c44f81d': { username: 'Ruby', password: 'purplecat' },
    '879b4b0c-75cc-4ddf-b5ae-d108a1f6aef4': {
      username: 'TestAccount',
      password: 'Test',
      creationDate: '2023-05-17T10:40:43.302Z'
    },
    '9936a4b3-2dd3-49ff-854a-4f83b106b335': { username: 'j', password: 'jip' },
    'ac4f5bf4-4f5f-4101-9156-17edeedcbbe6': { username: 'greetings', password: '321drowssap' },
    'd021d7e8-6ad2-4c44-b780-9240877d3f37': { username: 'Hëster', password: 'WaddonMarsch' },
    'd1182952-6cc0-4397-9ce4-655ddb019382': {
      username: 'Lance',
      password: 'vt',
      creationDate: '2023-03-30T11:19:13.907Z'
    },
    'd71440f5-b282-45d4-a86b-45a06c08d44f': { username: 'Kit', password: 'cat' },
    'e5138ba6-910f-43dc-8cf7-8f3568ba2fd1': {
      username: 'Test4', password: 'qwer',
      creationDate: null,
      uuid: 'e5138ba6-910f-43dc-8cf7-8f3568ba2fd1',
      data: null,
      format: 'v2'
    },
    'e781ebe2-b863-4d72-a6ba-af078b382675': {
      username: 'Xanthus',
      password: 'ex',
      creationDate: '2023-05-03T10:14:58.042Z'
    },
    'eaae686e-22ae-436f-ab9c-c7efe26a3f69': {
      username: 'Test5', password: 'uiop',
  
        creationDate: '2023-03-01T09:58:56.469Z',
        uuid: 'eaae686e-22ae-436f-ab9c-c7efe26a3f69',
  
      data: null,
      format: 'v2'
    },
    'f1e448e5-fcae-4d89-8f41-056730c85fa9': { username: 'Isaac', password: 'tw1' },
    'f53262db-2534-48b6-921d-4c771159cf2f': {
      username: 'Etho',
      password: 'etho',
      creationDate: '2023-05-10T08:34:23.445Z'
    },
    'f56ccbd9-2e19-4287-ba6d-2793a4573c78': { username: 'Ivy', password: '1234' },
    'f9e50e7e-bee8-42c9-92fc-e2e538c29e50': { username: 'Test', password: 'asdf', creationDate: 'cry' }
  }

  for (let key in oldDb) {
    let field1 = 0
    client.query("INSERT INTO Data VALUES ( $1, $1 )", [key, field1]).then(() => {
      trace(`${key} (${oldDb[key].username}) loaded`)
    }).catch((err) => {
      console.error(err)
    })
  }

  //Settings, Permissions, Public, Data
}

export { trace, serverCommands, serverSide }