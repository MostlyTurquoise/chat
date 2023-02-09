import { trace } from "./serverside-ui.js"
import sm from "./session-manager.js"
import { config } from "./config-manager.js"
import Event from "events"
import Packet from "./packet-manager.js"

class longpoll {
  constructor(app) {

    this._app = app

    this._publishLock = false
    this._publishCooldown = 50
    this.dataQueue = []

    this._trigger = new Event("message")

    this._trigger.addListener("message", (data) => {
      trace("Message Published", data, "@messageOut")
    })

  }
  // _awaiting: {},

  create(url, mode = "POST") {
    if (mode == "POST") {
      this._createAsPost(url)
    } else {
      trace("Unsupported/Unrecognised Poll mode.", "@longpoll")
    }
  }

  _createAsPost(url) {
    trace("POST Longpoll created", url, "@longpoll")
    this._app.post(url, (req, res) => {
      trace("Post request Longpoll", url, "triggered.", "@longpoll")

      const responseHandler = (packet) => {        
        let applies;
        
        if (typeof packet.metadata._private.target == "object") {
          for(let i = 0; i<packet.metadata._private.target.length; i++){
            if(packet.metadata._private.target[i]==req.body.sessionId){
              applies = true
            }
          }
        } else if (typeof packet.metadata._private.target == "number" && packet.metadata._private.target == req.body.sessionId) {
          applies = true
        } else if (packet.metadata._private.target == "All") {
          applies = true
        } else {
          trace("Unexpected Target selection",packet.metadata._private, "@Communicatey")
          applies = null
        }

        if (applies) {
          res.json(packet.send())
          trace("Listener", req.body.sessionId, "triggered", "@messageOut")
          this._trigger.removeListener("message", responseHandler)
        } else if (!applies) {
          //something here maybe
        } else {
          trace("Unexpected evaluation of whether client should be updated:", applies, "@messageOut")
        }
      }

      this._trigger.on("message", responseHandler)

    })
  }

  publish(url, data) {

    if (this._publishLock == true) {
      this.dataQueue.push(data)
      trace("Data Queued to", url, "@messageOut")

    } else if (this._publishLock == false) {
      trace("Publishing to", url, "@messageOut")

      let packetOut = data

      this._trigger.emit("message", packetOut)
      this._publishLock = true

      setTimeout(() => {
        this._publishLock = false

        if (this.dataQueue.length > 0) {
          this.publish("/reciever", new Packet("packetOut", opts.method + "--Bundle", this.dataQueue).send())
          this.dataQueue = []
        }
      }, this._publishCooldown)
    }
  }
}

export default longpoll