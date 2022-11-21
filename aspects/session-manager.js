import crypto from "node:crypto"
import { trace } from "./serverside-ui.js"



let sm = {}

sm.sessions = {}

sm.verify = function(session) {
  if (sm.sessions[session]) {
    return (true)
  } else {
    return (false)
  }
}

sm.clear = function() {
  sm.sessions = {}
}

sm.create = function(uuuid) {
  let existingSessions = []
  for (let i = 0; i < Object.keys(sm.sessions).length; i++) {
    if (sm.sessions[Object.keys(sm.sessions)[i]] == uuuid) {
      existingSessions.push(Object.keys(sm.sessions)[i])
    }
  }
  if (existingSessions.length == 0) {
    let sessionId = crypto.randomUUID()
    sm.sessions[sessionId] = uuuid
    trace(`Session (${sessionId}) created for user (${uuuid})`, "@login")
    return (`${sessionId}`)
  } else if (existingSessions.length == 1) {
    return (existingSessions[0])
  } else if (existingSessions.length > 1) {
    for (let i = 1; i < existingSessions.length; i++) {
      sm.sessions.splice(existingSessions[i], 1)
    }
    return (existingSessions[0])
  }
}

export default sm 