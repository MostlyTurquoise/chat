import crypto from "node:crypto"
import Database from "@replit/database"
let userDB = new Database()

import pkg from "pg"
const { Client } = pkg
const client = new Client(process.env.DATABASE_URL)

import { trace } from "./serverside-ui.js"
import { config } from "./config-manager.js"
import Packet from "./packet-manager.js"

class User {
  constructor(userData) {

  }

  static get(uuid) {
    if (typeof uuid == "string") {
      return {
        username: async () => {
          try {
            let response = await client.query("SELECT UserId, Username FROM Public WHERE UserId = $1", [uuid])
            let user = response.rows[0]
            let username = user.username
            trace(`Task Successful: User "${uuid}" has Username "${username}"`,  "@userManager")
            return username
          } catch (err) {
            trace("Task Failed:", err, "@userManager")
          }
        },
        data: async(value) => {
          try {
            trace("@WARNING","Please ensure that safe column names are used.")
            let response = await client.query(`SELECT UserId, ${value} FROM Data WHERE UserId = $1`, [uuid])
            let user = response.rows[0]
            let data = user[value.toLowerCase()]
            trace(`Task Successful: User "${uuid}" has Data "${value}" of "${data}"`,  "@userManager")
            return data
          } catch (err) {
            trace("Task Failed:", err, "@userManager")
          }
        }
      }
    } else if (typeof uuid == "object") {
      return {
        username: async () => {
          try {
            let username = await client.query("SELECT UserId, Username FROM Public WHERE ")
          } catch (err) {
            throw err
          }
        }
      }
    }
  }

  static async bulkGet(uuid, params = "*") {
    if (typeof uuid == "string") {
      try {
        let data = await client.query("SELECT * FROM ClientData WHERE UserId = $1", [uuid]).rows[0]
        trace(`Task Successful: User ${uuid} has data ${data}`, "@userManager")
        return data
      } catch (err) {
        trace("Task Failed:", err, "@userManager")
      }
    } else if(typeof uuid=="object"){
      try {
        let data = await client.query("SELECT * FROM ClientData WHERE UserId = $1", [uuid]).rows[0]
        trace(`Task Successful: User ${uuid} has data ${data}`, "@userManager")
        return data
      } catch (err) {
        trace("Task Failed:", err, "@userManager")
      }
    }
  }

  static async connect(tries = 3) {
    return new Promise(async (resolve, reject) => {
      try {
        await client.connect()
        resolve()
      } catch (err) {
        let timeout = 5
        trace("User Database Error:", err.message, "@WARNING")
        throw err
        if (tries > 0) {
          trace(`User Database: retrying connection in ${timeout}s`, "@WARNING")
          setTimeout(() => { this.connect(tries - 1) }, timeout * 1000)
        } else {
          trace("User Database: connection failed", "@WARNING")
          reject(err)
        }
      }
    })
  }

  static async disconnect() {
    return new Promise(async (resolve, reject) => {
      try {
        await client.end()
        resolve()
      } catch (err) {
        reject(err)
      }
    })
  }

  static async find(user) {
    try {
      let userQ = await client.query("SELECT Public.UserId, Public.Username, Settings.Password FROM Public FULL OUTER JOIN Settings ON Public.UserId=Settings.UserId WHERE Public.Username=$1 and Settings.Password=$2", [user.username, user.password])
      return userQ.rows[0] ? userQ.rows[0] : "Not Found"
    } catch (err) {
      throw err
    }
  }

  static async list(withData = false) {
    if (withData) {
      let responses = await client.query("SELECT Public.UserId, Public.Username, Settings.Password FROM Public FULL OUTER JOIN Settings ON Public.UserId=Settings.UserId")
      trace(responses.rows, "@userManager")
    } else {
      let responses = await client.query("SELECT UserId FROM Usernames")
      trace(responses.rows, "@userManager")
    }
  }
}

class UserDepr {
  #uuid;

  constructor(userData = { username: null, password: null, }) {
    trace("@WARNING", "UNSAFE USER OBJECT, DEPRECATED USER CLASS")
    this.username = userData.username
    this.password = userData.password
    this.#uuid = crypto.randomUUID()
    this.creationDate = new Date()
    trace(`User "${this.username}" created in RAM`, "@userAction")

  }

  async load(uuid) {
    let loadedUser = await userDB.get(uuid)
    if (loadedUser && (loadedUser.format == "v1" || !loadedUser.format)) {
      this.username = loadedUser.username
      this.password = loadedUser.password
      this.#uuid = uuid
      this.creationDate = loadedUser.creationDate
      this.data = loadedUser.data
    } else if (loadedUser && loadedUser.format == "v2") {
      this.username = loadedUser.sensitive.username
      this.password = loadedUser.sensitive.password
      this.#uuid = uuid
      this.creationDate = loadedUser.constant.creationDate
      this.data = loadedUser.data
    }
    return this
  }

  uuid() {
    return this.#uuid
  }

  async save() {
    await userDB.set(this.#uuid, { username: this.username, password: this.password, creationDate: this.creationDate, data: this.data })
    trace(`Saved User "${this.username}" (${this.#uuid})`, "@userAction")
    return this.uuid
  }

  //SAFE CLASS

  static Safe = class {
    #constant
    #sensitive
    #data
    #permission

    constructor(
      permission = {
        read: ["sensitive", "data", "constant"],
        write: []
      },
      userData = {
        sensitive: {
          username: null,
          password: null
        },
        constant: {
          creationDate: null
        },
        data: {}
      }
    ) {
      trace("@WARNING", "DEPRECATED USER CLASS")
      this.#sensitive = userData.sensitive
      this.#constant = userData.constant
      this.#data = userData.data
      this.#permission = permission
    }

    setUnsafeData(obj) {
      if (this.#permission.write.includes("sensitive")) {
        for (let key in obj) {
          this.#sensitive[key] = obj[key]
        }
      }
    }

    setData(obj) {
      if (this.#permission.write.includes("data")) {
        for (let key in obj) {
          this.#data[key] = obj[key]
        }
      }
    }

    setConstant(obj) {
      if (this.#permission.write.includes("constant")) {
        for (let key in obj) {
          this.#constant[key] = obj[key]
        }
      }
    }

    getUnsafeData(val) {
      if (this.#permission.read.includes("sensitive")) {
        return this.#sensitive[val]
      }
    }

    getData(val) {
      if (this.#permission.read.includes("data")) {
        return this.#data[val]
      }
    }

    getAll() {
      if (this.#permission.read.includes("sensitive") && this.#permission.read.includes("constant") && this.#permission.read.includes("data")) {
        return {
          sensitive: this.#sensitive,
          constant: this.#constant,
          data: this.#data
        }
      } else {
        return "Incorrect Permissions"
      }
    }

    async load(uuid, version = null) {
      trace("Loading User", "@userEditor")
      let loadedUser = await userDB.get(uuid)
      if ((loadedUser && loadedUser.format != "v2")) {
        trace("Format v1", loadedUser, "@userEditor")
        this.#sensitive = {
          username: loadedUser.username,
          password: loadedUser.password,
        }
        this.#constant = {
          creationDate: loadedUser.creationDate ? loadedUser.creationDate : null,
          uuid: uuid
        }
        this.#data = loadedUser.data ? loadedUser.data : null
      } else if ((loadedUser && loadedUser.format == "v2")) {
        trace("Format v2", loadedUser, "@userEditor")
        this.#sensitive = loadedUser.sensitive
        this.#constant = loadedUser.constant
        this.#data = loadedUser.data
      } else if (!loadedUser) {
        trace("User not found")
      }
      return this
    }

    uuid() {
      return this.#constant.uuid
    }

    async save(version = "v1") {
      if (version == "v1") {
        await userDB.set(this.#constant.uuid, { format: "v1", username: this.#sensitive.username, password: this.#sensitive.password, creationDate: this.#constant.creationDate, data: this.#data })

      } else if (version == "v2") {
        await userDB.set(this.#constant.uuid, {
          sensitive: this.#sensitive,
          constant: this.#constant,
          data: this.#data,
          format: "v2"
        })
      }

      trace(`Saved ${version} User "${this.#sensitive.username}" (${this.#constant.uuid})`, "@userAction")
      return this.#constant.uuid
    }

    static async get(id) {
      trace("Getting", id, "@userAction")
      let user = await userDB.get(id)
      if (user) {
        try {
          delete user.password
        } catch (err) {
          delete user.sensitive.password
        }
        user.uuid = id
      } else {
        user = {
          uuid: "undefined",
          username: "Unknown"
        }
      }



      return user
    }
  }

  //STATIC USER MANAGER

  static clear = class {
    static async byId(uuid) {
      if (typeof uuid == "string") {
        userDB.delete(uuid).then(() => {
          trace(`Deleted user (${uuid})`, "@userAction")
        })
      } else if (typeof uuid == "object") {
        for (let i = 0; i < uuid.length; i++) {
          userDB.delete(uuid[i]).then(() => {
            trace(`Deleted user (${uuid[i]})`, "@userAction")
          })
        }
      } else {
        trace("Unrecognised type", typeof uuid, "@userAction")
      }
    }
  }

  static async find(param) {
    let value = await this._findStr(param)
    return value
  }

  static async _findStr(uObj) {
    let returnData = new Packet(
      "returnData",
      "userVerification",
      {

      }
    ).setPublic("code", "namef")

    let tempUserDB = await userDB.getAll()
    for (let key in tempUserDB) {
      if (tempUserDB[key].username === uObj.username) {
        returnData.setPublic("code", "passf")
        if (tempUserDB[key].password === uObj.password) {
          returnData.setPublic("code", "verif")
          returnData.content = {
            user: {
              userId: key,
              info: tempUserDB[key]
            }
          }
        }
      }
    }

    return returnData.send()
  }

  static async list(releaseData = false) {
    if (config.trace.rules.userData || releaseData) {
      userDB.getAll().then(db => {
        trace(db, releaseData ? "@userDataOVERRIDDEN" : "@userData")
      })
    } else {
      userDB.getAll().then(db => {
        trace(Object.keys(db), "@userAction")
      })
    }
  }

  static async get(id) {
    trace("Getting", id, "@userAction")
    return await userDB.get(id)
  }

  static raw = userDB
}

/*
User Manager:
.create(user{body,password})    y (As constructor)
.clear                          y
  .byId(id)                     y
.find(user)                     y
.get(id)                        y
.list()                         y
*/

let users = {}

users.create = function (body, cb = () => { }) {
  let userUUID = crypto.randomUUID()
  userDB.set(userUUID, { username: body.username, password: body.password }).then(() => { cb(userUUID) })
  trace(`Created User "${body.username}" (${userUUID})`, "@userAction")

}

users.clear = {}

users.clear.byId = function (uuid) {
  if (typeof uuid == "string") {
    userDB.delete(uuid).then(() => {
      trace(`Deleted user (${uuid})`, "@userAction")
    })
  } else if (typeof uuid == "object") {
    for (let i = 0; i < uuid.length; i++) {
      userDB.delete(uuid[i]).then(() => {
        trace(`Deleted user (${uuid[i]})`, "@userAction")
      })
    }
  } else {
    trace("Unrecognised type", typeof uuid, "@userAction")
  }
}

users.find = async function (uObj, cb) {
  trace("Finding", uObj, "@userAction")
  userDB.list().then(async function (ulist) {
    trace("Searching", ulist, "@userAction")
    let returnData = new Packet(
      "returnData",
      "userVerification",
      {

      }
    ).setPublic("code", null)
    trace(returnData)

    for (let i = 0; i < ulist.length; i++) {
      let found = false
      trace(`Checking (${ulist[i]})`, "@userAction")
      await userDB.get(ulist[i]).then((info) => {
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

users.get = async function (id, cb) {
  trace("Getting", id, "@userAction")
  userDB.get(id).then((info) => {
    cb(info)
  })
}

users.list = async function () {
  userDB.list().then(async function (ulist) {
    trace("Searching", ulist, "@userAction")
    for (let i = 0; i < ulist.length; i++) {
      trace(`Checking (${ulist[i]})`, "@userAction")
      await userDB.get(ulist[i]).then((info) => {
        trace(info, "@userData")
      })
    }
  })
}

export default User
export { users } 