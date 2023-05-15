import { trace } from "./serverside-ui.js"
import Packet from "./packet-manager.js"
import Event from "events"

class Communicatey {
  #app
  #publishLock
  #publishCooldown
  #trigger
  #dataQueue
  #dataInHandle = []

  constructor(app, subDir, inDir, outDir) {

    this.#app = app

    this.#publishLock = false
    this.#publishCooldown = 50
    this.#dataQueue = []

    this.#trigger = new Event("message")

    this.#trigger.addListener("message", (data) => {
      trace("Message Published", data, "@messageOut")
    })

    for (let key in outDir) {
      this.#app.post(subDir + key, (req, res) => {

        let listen = function(data) {
          let applies;

          applies = (
            typeof data.public("target") == "object"
            && Object.values(data.public("target")).includes(req.body.sessionId)
          ) || (
            data.public("target") == req.body.sessionId
          ) || (
            data.public("target") == "All"
          )

          if (applies) {
            res.send(data.send())
          }
        }


        this.#trigger.addListener("data", listen)
      })
    }

    for(let key in inDir){
      this.#app.post(subDir + key, inDir[key])
    }
  }


    
  pass(data, target = "All") {
    
  }

  in (func) {
    this.#dataInHandle.push(func)
  }


}

// let day = 2

// switch(day){
//   case 1:
//     console.log("monday")
//   case 2:
//     console.log("tuesday")
//   default:
//     console.log(any day)
// }

export default Communicatey