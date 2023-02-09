import cm from "./channel-manager.js"
import sm from "./session-manager.js"
import Packet from "./packet-manager.js"
import { trace } from "./serverside-ui.js"
import { dir, longpoll } from "/home/runner/chat/index.js"

function updateClients(channelLoc) {
  cm.get(channelLoc, (channel) => {
    cm.formatForSend(channel, null, (val) => {
      let channel = val
      let clientUpdate = new Packet("clientUpdate", "Full Channel", channel)
      clientUpdate.setPrivate("target", "All")
      trace(clientUpdate.metadata, "@debug")
      clientUpdate.metadata._public.channel = channelLoc

      trace("@messageOut", "Publishing Changes")
      longpoll.publish("/reciever", clientUpdate)
    })
  })
}

function handle(msg, res) {
  trace("Handling", msg, "@messageIn")
  //constraints to inbound package applied here
  return msg
}

export { updateClients, handle }