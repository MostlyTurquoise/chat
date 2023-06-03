import fs from "fs"
import fsp from 'fs/promises';
import { trace } from "./serverside-ui.js"
import Database from "@replit/database"
const db = new Database()
import User from "./user-manager.js"
import Packet from "./packet-manager.js"
import Event from "events"
import _ from "lodash"

class Channel {
  constructor(channelStr) {
    this.path = `/home/runner/chat/channels/${channelStr}`
  }

  async backup() {
    return new Promise(async (resolve, reject) =>{
      let contents = await fsp.open(this.path + "/contents.json")
      let index = await fsp.open(this.path + "/contents.index")
      let backupDate = new Date()
      let backupFileName = backupDate.toISOString().replaceAll(" ","_")
      let backupContents = await fsp.open(this.path+`/backups/${backupFileName}.json`,"wx")
      let backupIndex = await fsp.open(this.path+`/backups/${backupFileName}.index`,"wx")
      
      let contentsFile = await contents.readFile("utf8")
      let indexFile = await index.readFile("utf8")
      backupContents.writeFile(contentsFile,"utf8")
      backupIndex.writeFile(indexFile,"utf8")

      contents.close()
      index.close()
      backupContents.close()
      backupIndex.close()
      resolve()
    })
  }

  async metadata(withPrivate = false) {
    return new Promise((resolve, reject) => {
      const charStream = fs.createReadStream(this.path + "/contents.json", { start: 1, end: 300 });
      charStream.on("data", (chunk) => {
        let readData = chunk.toString()
        let metadataEnd = readData.match(/"messages"/)
        let metadataObj = JSON.parse(
          `{${readData.substring(0, metadataEnd.index - 4)}\n}`
        )
        if (!withPrivate) {
          delete metadataObj.metadata.private
        }
        trace(metadataObj.metadata)
        resolve(metadataObj.metadata)
      });

      charStream.on("error", (error) => {
        reject(error)
      })
    })

  }

  async index(opts = { type: "object", last:50 }) {
    return new Promise(async (resolve, reject) => {
      _.defaults(opts,{type:"object", last:50})
      let fd = await fsp.open(this.path + "/contents.index")
      let charStream = fd.createReadStream({ start: 0, end: 5 })
      let metadata = ""
      charStream.on("data", (data) => {
        metadata += data.toString()
      })

      charStream.on("end", async () => {
        fd.close()
        fd = await fsp.open(this.path + "/contents.index")
        let stats = await fd.stat()
        let chars = stats.size

        let metadataVal = metadata.split("|")[0]

        let charsPerVal = parseInt(metadataVal, 16)
        let charsPerBlock = (charsPerVal * 2) + 2

        let settings;

        if (!("last" in opts)) {
          let calcEnd = ("end" in opts)
            ? { end: ((opts.end + 1) * charsPerBlock) + metadataVal.length + 1 }
            : {}

          let calcStart = "start" in opts
            ? (opts.start * charsPerBlock) + metadataVal.length + 1
            : metadataVal.length + 1

          settings = {
            start: calcStart,
            ...calcEnd
          }
        } else {
          trace("@channelDebug",chars, opts.last, charsPerBlock, metadata, metadataVal, charsPerVal)
          let startPoint = chars - (opts.last * charsPerBlock)
          trace("@channelDebug",startPoint)
          settings = {
            start: startPoint
          }
          
        }

        trace("@channelDebug",settings)

        // trace(metadataVal, charsPerVal, charsPerBlock, calcEnd, calcStart,settings, "@metadata")

        let stream = fd.createReadStream(settings)

        let dataOutput = ""

        stream.on("data", (data) => {
          dataOutput += data.toString()
        })

        stream.on("end", () => {
          let dataStrPairs = dataOutput.split(";")
          dataStrPairs.pop()
          let returnIndex
          if (opts.type == "object") {
            returnIndex = {}
          } else if (opts.type == "array") {
            returnIndex = []
          } else {
            trace("@WARNING", "Unexpected Type Requested!")
          }

          for (let string = 0; string < dataStrPairs.length; string++) {
            if (opts.type == "object") {
              let pair = dataStrPairs[string].split(":")
              pair[0] = parseInt(pair[0], 16)
              pair[1] = parseInt(pair[1], 16)
              // trace(pair)
              returnIndex[pair[0]] = pair[1]
            } else if (opts.type == "array") {
              let pair = dataStrPairs[string].split(":")
              pair[0] = parseInt(pair[0], 16)
              pair[1] = parseInt(pair[1], 16)
              returnIndex.push(pair)
            } else {
              continue;
            }
          }
          //trace(returnIndex)
          fd.close()
          resolve(returnIndex)
        })
      })
    })
  }

  async clean() {
    return new Promise(async (resolve, reject) => {
      const channelWrite = await fsp.open(this.path + "/contents.json", "w")
      const channelRead = await fsp.open(this.path + "/contents.json")
      let file = await channelRead.readFile("utf8")
      let cleanFile = cleanString(file)
      trace(file, cleanFile)
      channelWrite.close()
      channelRead.close()
      resolve(cleanFile)
    })
  }

  // async messagesWithoutReadStream(opts = { last: 50 }) {
  //   return new Promise(async (resolve, reject) => {
  //     trace("@WARNING", "This method is deprecated and may return innacurate results.")
  //     let fd = await fsp.open(this.path + "/contents.json")
  //     let fileStats = await fd.stat()

  //     let index = await this.index({ ...opts, type: "object" })
  //     trace(index)
  //     let indexKeys = Object.keys(index)
  //     trace(indexKeys[0], index[indexKeys[0]])

  //     let startPosition = index[indexKeys[0]]
  //     trace(startPosition)
  //     let endObj = {}

  //     if ("end" in opts) {
  //       endObj = { end: index[indexKeys.at(-1)] }
  //     }

  //     let file = await fd.readFile("utf8")
  //     fd.close()
  //     resolve(file.substring(startPosition, endObj.end))
  //   })
  // }

  async messages(opts = { last: 50 }) {
    return new Promise(async (resolve, reject) => {
      let fd = await fsp.open(this.path + "/contents.json")

      let fileStats = await fd.stat()

      let index = await this.index({ ...opts})
      // trace(index)
      let indexKeys = Object.keys(index)
      // trace(indexKeys[0],index[indexKeys[0]])

      let startPosition = index[indexKeys[0]]
      trace(startPosition)
      let endObj = {}

      if ("end" in opts) {
        endObj = { end: index[indexKeys.at(-1)] }
      }

      let charStream = fs.createReadStream(this.path + "/contents.json", { start: startPosition, ...endObj })

      let readData = ""

      charStream.on("data", (chunk) => {
        readData += chunk.toString()
      })

      charStream.on("end", async () => {
        let validWithStart;
        if ("end" in opts) {
          validWithStart = `{"messages":[${readData.slice(0, -3)}]}`
        } else {
          validWithStart = `{"messages":[${readData}`
        }
        // trace(validWithStart)
        let objArr = JSON.parse(validWithStart).messages

        resolve(objArr)
        fd.close()
      })

      charStream.on("error", (error) => {
        reject(error)
        fd.close()
      })


    })
  }

  async restructure(metadataHandler, msgHandler) {
    trace("@WARNING", "Handling an entire file may result in high RAM or CPU usage.")
    const fileToRead = await fsp.open(this.path + "/contents.json")
    let fileContents = await fileToRead.readFile("utf8")
    let fileObject = JSON.parse(fileContents)
    fileObject.metadata = metadataHandler(fileObject.metadata)
    for (let msg in fileObject.messages) {
      fileObject.messages[msg] = msgHandler(msg, fileObject.messages[msg])
    }
    let jsonOutput = JSON.stringify(fileObject, null, 2)
    fileToRead.close()

    let fileToWrite = await fsp.open(this.path + "/contents.json", "w")
    await fileToWrite.writeFile(jsonOutput, "utf8")
    fileToWrite.close()

    return jsonOutput
  }

  async reIndex() {
    return new Promise(async (resolve, reject) => {
      trace("@WARNING", "Handling an entire file may result in high RAM or CPU usage.")
      const indexR = await fsp.open(this.path + "/contents.index")
      const indexW = await fsp.open(this.path + "/contents.index", "w")
      const channelR = await fsp.open(this.path + "/contents.json")
      let channelRaw = await channelR.readFile("utf8")
      let indexRaw = await indexR.readFile("utf8")
      let channelObj = JSON.parse(channelRaw)

      let indexMapWithoutFormatting = new Map()
      let largestCharLength = 0
      trace("First Pass (get matches), starting with")
      for (let i = 0; i < channelObj.messages.length; i++) {
        let message = channelObj.messages[i]
        let messageWithIndent = {
          tada: [
            message
          ]
        }
        let jsonStringWithFluff = JSON.stringify(messageWithIndent, null, 2)
        let jsonString = jsonStringWithFluff.substring(14, jsonStringWithFluff.length - 6)
        let regex = new RegExp(escapeRegExp(jsonString))
        let matchChars = channelRaw.match(regex).index
        let channelUpToIndex = channelRaw.substring(0, matchChars)
        let indexInBytes = Buffer.byteLength(channelUpToIndex, 'utf8')
        let match = indexInBytes
        let msgIdHex = parseInt(message.id).toString(16)
        indexMapWithoutFormatting.set(msgIdHex, match.toString(16))
        // trace(parseInt(match.toString(16),16),indexMapWithoutFormatting.get(msgIdHex))
        if (Math.max(msgIdHex.length, match.toString(16).length) > largestCharLength) {
          largestCharLength = Math.max(msgIdHex.length, match.toString(16).length)
        }
      }

      // trace(indexMapWithoutFormatting, largestCharLength)

      let indexUnformattedKeys = [...indexMapWithoutFormatting.keys()]

      trace("Second Pass (format matches)")
      let indexMapToWrite = new Map()
      let hexLength = largestCharLength.toString(16)
      let outputString = `${hexLength}|`
      for (let i = 0; i < indexUnformattedKeys.length; i++) {
        let inKey = indexUnformattedKeys[i]
        let outKey = "0".repeat(largestCharLength - inKey.length) + inKey
        let inVal = indexMapWithoutFormatting.get(inKey)
        let outVal = "0".repeat(largestCharLength - inVal.length) + inVal
        outputString += `${outKey}:${outVal};`
      }

      // trace("Done", outputString)

      indexW.writeFile(outputString, "utf8")
      resolve()


      indexR.close()
      indexW.close()
      channelR.close()
    })
  }

  static async create(name){
    return new Promise(async (resolve, reject)=>{
      let path = `/home/runner/chat/channels/${name}`
      fsp.access(path).then(()=>{
        reject("Already Exists")
      }).catch((err)=>{
        if(err.code=="ENOENT"){
          resolve("Channel Can Be Made")
        } else {
          console.error(err)
          resolve(err)
        }
      })
    })
  }

  // async setIndexJSON(goOn = false) {
  //   return new Promise(async (resolve, reject) => {
  //     trace("@WARNING", "Handling an entire file may result in high RAM or CPU usage.")
  //     trace("@WARNING", "This method is deprecated")
  //     if (goOn) {
  //       const indexR = await fsp.open(this.path + "/index.json")
  //       const indexW = await fsp.open(this.path + "/index.json", "w")
  //       const channelR = await fsp.open(this.path + "/contents.json")
  //       let channelRaw = await channelR.readFile("utf8")
  //       let indexRaw = await indexR.readFile("utf8")
  //       let channelObj = JSON.parse(channelRaw)
  //       let indexObj = indexRaw ? JSON.parse(indexRaw) : {
  //         index: {

  //         }
  //       }
  //       let indexMapWithoutFormatting = {}
  //       for (let i = 0; i < channelObj.messages.length; i++) {
  //         let message = channelObj.messages[i]
  //         let messageWithIndent = {
  //           tada: [
  //             message
  //           ]
  //         }
  //         let jsonStringWithFluff = JSON.stringify(messageWithIndent, null, 2)
  //         let jsonString = jsonStringWithFluff.substring(14, jsonStringWithFluff.length - 6)
  //         let match = channelRaw.indexOf(jsonString)
  //         indexMapWithoutFormatting[message.id] = match
  //         // trace(message.id , match)
  //       }

  //       // trace(indexMapWithoutFormatting)
  //       let indexObjToWrite = indexObj
  //       indexObjToWrite.index = indexMapWithoutFormatting

  //       let indexStringToWrite = JSON.stringify(indexObjToWrite, null, 2)
  //       indexW.writeFile(indexStringToWrite, "utf8")
  //       indexR.close()
  //       indexW.close()
  //       channelR.close()
  //     }
  //   })
  // }
}

function cleanString(input) {
  var output = "";
  for (var i = 0; i < input.length; i++) {
    if (input.charCodeAt(i) <= 255) {
      output += input.charAt(i);
    } else {
      output += String.fromCharCode(239)
    }
  }
  return output;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readUserIdsFromChannel(file) {
  let channelRaw = file

  let usersDuplicatesRaw = [...channelRaw.matchAll(/"uuid": ?"([^"]+)"/gm)]
  let usersDuplicates = []
  for (let i = 0; i < usersDuplicatesRaw.length; i++) {
    usersDuplicates.push([...usersDuplicatesRaw[i]][1])
  }

  function onlyUnique(value, index, array) {
    return array.indexOf(value) === index;
  }

  let userIds = usersDuplicates.filter(onlyUnique)
  trace(userIds)
  let users = []
  let sendTrigger = new Event("userlistUpdate")

  sendTrigger.on("added", (length) => {
    trace("User added")
    if (length == userIds.length) {
      trace(users)
      return new Packet("", "channelData", {
        channelJSON: channelRaw,
        users: users
      })
    }
  })

  for (let i = 0; i < userIds.length; i++) {
    let thisUser = new User.Safe({
      read: ["sensitive", "data", "constant"],
      write: []
    }).load(userIds[i]).then((user) => {
      trace(user)
      users.push(user)
      sendTrigger.emit("added", users.length)
    })
  }
}

// OLD VERSION

let cm = {}

cm.formatForSend = async function(channelIn, constraint, cb) {
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
      // 	Ɛ 
      channel.messages[i].user = {
        username: ">Server<3"
      }

    } else {
      channel.messages[i].user = {
        username: "!"
      }
    }
  }

  trace(channel.messages[3])

  cb(channel)
}

cm.get = async function(channelStr, cb) {
  let channelPath = `./channels/${channelStr}/contents.json`
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

cm.sendTo = async function(channelStr, packet, cb) {
  cm.get(channelStr, (channel) => {
    let channelPath = `./channels/${channelStr}/contents.json`
    let returnChannel = channel
    returnChannel.messages = returnChannel.messages.concat([{...packet, id:parseInt(returnChannel.messages.at(-1).id)+1}])
    let jsonChannel = JSON.stringify(returnChannel, null, 2)
    fs.writeFile(channelPath, jsonChannel, () => {
      let ch = new Channel(channelStr)
      ch.reIndex().then(()=>{
        cb()
      })
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
export { Channel }