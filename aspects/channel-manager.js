import fs from "fs"
import {trace} from "./serverside-ui.js"
import Database from "@replit/database"
const db = new Database()

let cm = {}

cm.formatForSend = async function (channelIn, constraint, cb) {
  let channel = channelIn

  delete channel.metadata.private
  
  let pConstraint
  if (constraint == null) {
    pConstraint = channel.messages.length
  } else {
    pConstraint = constraint
  }
  if (channel.messages.length > pConstraint) {
    trace(`Formatting channel ${channel.metadata.name} (${channel.metadata.id}): length ${channel.messages.length}/${constraint} constrained`, "@messageOut")
    channel.messages = channel.messages.splice(channel.messages.length - pConstraint)
  } else {
    trace(`Formatting channel ${channel.metadata.name} (${channel.metadata.id}): length ${channel.messages.length}/${constraint} unconstrained`, "@messageOut")
  }

  let loadedUsers = {}
  for (let i = 0; i < channel.messages.length; i++) {
    let uuid = channel.messages[i].user.uuid
    if (uuid != "undefined" && uuid != "Server") {
      if (!(uuid in loadedUsers)) {
        await db.get(uuid).then((val) => {
          loadedUsers[uuid] = { username: val.username }
        })
      }

      channel.messages[i].user = {
        username: loadedUsers[uuid].username
      }
    } else if (uuid == "Server") {
      channel.messages[i].user = {
        username: "Ɛ>Server<3"
      }

    } else {
      channel.messages[i].user = {
        username: "!"
      }
    }
  }

  cb(channel)
}

cm.get = async function (channelStr, cb) {
  let channelPath = `./channels/${channelStr}.json`
  fs.readFile(channelPath, "utf8", (err, data) => {
    if (err) {
      console.error(err)
    } else {
      let channel = JSON.parse(data)
      if (channel.metadata.private.throw) {
        cb(null)
        throw ("Unauthorised File Access")
      } else {
        for (let i = 0; i < channel.messages.length; i++) {
          channel.messages[i].content.timestamp = new Date(channel.messages[i].content.timestamp)
        }
        cb(channel)
      }
    }
  })
}

cm.sendTo = async function (channelStr, packet, cb) {
  cm.get(channelStr, (channel) => {
    let channelPath = `./channels/${channelStr}.json`
    let returnChannel = channel
    returnChannel.messages = returnChannel.messages.concat([packet])
    let jsonChannel = JSON.stringify(returnChannel,null,2)
    fs.writeFile(channelPath, jsonChannel, () => {
      cb()
    })
  })
}

function jsonReplaceon(json, from, to) {
  let jsonChannelArr = json.split(from)
  let jsonChannel = ""
  for (let i = 0; i < jsonChannelArr.length - 1; i++) {
    jsonChannel += jsonChannelArr[i] + to
  }
  jsonChannel += jsonChannelArr[jsonChannelArr.length - 1]
  return jsonChannel
}

export default cm