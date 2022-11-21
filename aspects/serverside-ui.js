import fs from "fs"
import readlineInit from "readline"

const readline = readlineInit.createInterface({
  input: process.stdin,
  output: process.stdout
});

import cm from "./channel-manager.js"
import {updateClients} from "./request-manager.js"

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

serverSide.run = (command) => {
  try {
    eval(command)
    trace("Running", command, "@server")
  } catch (err) {
    trace("Command encountered error:", err, "@server")
  }
}

serverSide.reload = (blank) => {
  config = JSON.parse(fs.readFileSync(`./server-config.json`))
  trace("Config Updated", "@server")
}

let config = JSON.parse(fs.readFileSync(`./server-config.json`))

function trace(...args) {
  let typeFlag = null
  let typeFlagFrmt = ""
  let command;
  if (typeof args[0] == "string" && args[0].substring(0, 1) == "@") {
    typeFlag = args[0].substring(1, args[0].length)
    command = `console.log(typeFlagFrmt, `
  } else {
    command = `console.log(typeFlagFrmt, args[0], `
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