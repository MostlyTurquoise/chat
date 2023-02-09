import { trace } from "./serverside-ui.js"
import crypto from "node:crypto"
import Database from "@replit/database"
import Packet from "./packet-manager.js"
let db = new Database()

let users = {}

users.create = function(body, cb = () => { }) {
  let userUUID = crypto.randomUUID()
  db.set(userUUID, { username: body.username, password: body.password }).then(() => { cb(userUUID) })
  trace(`Created User "${body.username}" (${userUUID})`, "@userAction")

}

users.clear = {}

users.clear.byId = function(uuid) {
  if (typeof uuid == "string") {
    db.delete(uuid).then(() => {
      trace(`Deleted user (${uuid})`, "@userAction")
    })
  } else if (typeof uuid == "object") {
    for (let i = 0; i < uuid.length; i++) {
      db.delete(uuid[i]).then(() => {
        trace(`Deleted user (${uuid[i]})`, "@userAction")
      })
    }
  } else {
    trace("Unrecognised type", typeof uuid, "@userAction")
  }
}

users.find = async function(uObj, cb) {
  trace("Finding", uObj, "@userAction")
  db.list().then(async function(ulist) {
    trace("Searching", ulist, "@userAction")
    let returnData = new Packet(
      "returnData",
      "userVerification",
      {

      }
    ).setPublic("code", null)

    for (let i = 0; i < ulist.length; i++) {
      let found = false
      trace(`Checking (${ulist[i]})`, "@userAction")
      await db.get(ulist[i]).then((info) => {
        if (info.username == uObj.username) {
          if (info.password == uObj.password) {
            trace("Login Successful", "@login")
            returnData.setPublic("code", "verif")
            returnData._content.user = {
              userId: ulist[i],
              userInfo: info
            }

          } else {
            trace("Password Failure", "@login")
            if (returnData.metadata._public.code == null || returnData.metadata._public.code == "namef") {
              returnData.setPublic("code", "passf")
            }

          }
        } else {
          if (returnData.metadata._public.code == null) {
            returnData.setPublic("code", "namef")
          }
        }
      })
    }

    trace(returnData.send())
    cb(returnData.send())
  })
}

users.get = async function(id, cb) {
  trace("Getting", id, "@userAction")
  db.get(id).then((info) => {
    cb(info)
  })
}

users.list = async function() {
  db.list().then(async function(ulist) {
    trace("Searching", ulist, "@userAction")
    for (let i = 0; i < ulist.length; i++) {
      trace(`Checking (${ulist[i]})`, "@userAction")
      await db.get(ulist[i]).then((info) => {
        trace(info, "@userData")
      })
    }
  })
}

export default users