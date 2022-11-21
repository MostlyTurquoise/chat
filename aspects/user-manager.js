import { trace } from "./serverside-ui.js"
import crypto from "node:crypto"
import Database from "@replit/database"
let db = new Database()

let users = {}

users.create = function(body, cb = () => { }) {
  let userUUID = crypto.randomUUID()
  db.set(userUUID, { username: body.username, password: body.password }).then(cb())
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

users.find = async function (uObj, cb) {
  trace("Finding", uObj, "@userAction")
  db.list().then(async function(ulist) {
    trace("Searching", ulist, "@userAction")
    for (let i = 0; i < ulist.length; i++) {
      trace(`Checking (${ulist[i]})`, "@userAction")
      await db.get(ulist[i]).then((info) => {
        if (info.username == uObj.username) {
          if (info.password == uObj.password) {
            trace("Login Successful", "@login")
            cb({
              code: "verif",
              user: {
                userId: ulist[i],
                userInfo: info
              }
            })
          } else {
            trace("Password Failure", "@login")
            cb({
              code: "passf",
            })
          }
        } else {
          cb({
            code: "namef",
          })
        }
      })
    }
  })
}

users.get = async function(id, cb) {
  trace("Getting", id, "@userAction")
  db.get(id).then((info)=>{
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