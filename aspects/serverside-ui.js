import fs from "fs"
import readlineInit from "readline"

const readline = readlineInit.createInterface({
  input: process.stdin,
  output: process.stdout
});

import cm from "./channel-manager.js"
import sm from "./session-manager.js"
import User from "./user-manager.js"
import pray from "./religion.js"
import longpoll from "./poll-manager.js"
import { updateClients, handle } from "./request-manager.js"
import {config, updateConfig} from "./config-manager.js"

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

serverSide.user = async function(uuid) {
  let tempUser = await new User().load(uuid)
  trace(tempUser,"@server")
}

serverSide.editUser = async function(uuid) {
  trace(`>------Entering Edit Mode-------<`,"@userEditor")
  this.tempUser = await new User().load(uuid)
  trace(`serverSide.tempUser =`, this.tempUser, "@userEditor")
  
}

serverSide.editUserSafemode = async function(uuid) {
  trace(`>------Entering Safe Edit Mode-------<`,"@userEditor")
  this.tempUser = await new User.Safe({
    read:["sensitive","constant","data"],
    write:["sensitive","data","constant"]
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

function getErrorObject(){
      try { throw Error('') } catch(err) { return err; }
  }

function trace(...args) {
  
  let err = getErrorObject();
  let caller = err.stack.match(/\n    at file:[a-zA-Z0-9\/:\-\._]*/)
  let clean = "unknown"

  if(caller) {
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

  if(config.trace.rules.line){
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

export { trace, serverCommands, serverSide }