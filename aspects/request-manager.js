import cm from "./channel-manager.js"
import sm from "./session-manager.js"
import {trace} from "./serverside-ui.js"
import {dir, longpoll} from "/home/runner/chat/index.js"

function updateClients(channelLoc) {
  cm.get(channelLoc, (channel) => {
    cm.formatForSend(channel, null, (val) => {
      let channel = val
      let packet = {
        type: 50,
        chat: channelLoc,
        updates: channel
      }
      trace("@messageOut", "Publishing Changes")
      Object.keys(sm.sessions).forEach(key => {
        longpoll.publish("/reciever/:id", packet, key)
      })
    })
  })
}

function handle(msg, res) {
  trace("Handling", msg, "@messageIn")
  //constraints to inbound package applied here
  return msg
}

export { updateClients, handle }