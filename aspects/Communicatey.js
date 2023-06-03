import { trace } from "./serverside-ui.js"
import _ from "lodash"
import Packet from "./packet-manager.js"
import Event from "events"

class Communicatey {
  constructor(app, location, ider, config={}){
    this.#config = config
    this.#app = app
    this.#location = location
    this.#ider = ider
    _.defaults(this._config,{debug:false})
    
    this.#app.get(this.#location,(req,res)=>{
      this.#ider(req,res)
      
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      })

      let updateHandler = (update)=>{
        switch(typeof update.private("target")){
          case "object":
            if(update.private("target").includes(req.computed.id)){
              this.#consolelog("[Communicatey]",`Pushing event to ${req.computed.id}`)
              res.write("data: "+JSON.stringify(update.send())+"\n\n")
            }
            break;
          case "string":
            if(update.private("target")==req.computed.id){
              this.#consolelog("[Communicatey]",`Pushing event to "${req.computed.id}"`)
              res.write("data: "+JSON.stringify(update.send())+"\n\n")
            } else if(update.private("target")=="All"){
              this.#consolelog("[Communicatey]",`Pushing event to "${req.computed.id}"`)
              res.write("data: "+JSON.stringify(update.send())+"\n\n")
            }
            break;
          default:
            console.error("Invalid Update Object")
        }
      }
      
      this.#emitter.on("update",updateHandler)

      req.on("close",()=>{
        console.log("[Communicatey]",`Connection to client "${req.computed.id}" closed.`)
        this.#emitter.removeListener("update",updateHandler)
      })

      req.on("end",()=>{
        console.log("[Communicatey]",`Connection to client "${req.computed.id}" ended.`)
        this.#emitter.removeListener("update",updateHandler)
      })

      req.on("error",()=>{
        console.error("[Communicatey]",`Unexpected Error on connection to client "${req.computed.id}".`)
        this.#emitter.removeListener("update",updateHandler)
      })
    })

  }

  #emitter = new Event("update")
  #app
  #config
  #location
  #ider

  
  #consolelog(...args){
    if(this.#config.debug){
      console.log(...args)
    }
  }

  publish(packet){
    this.#consolelog("[Communicatey] Publishing packet")
    this.#emitter.emit("update",packet)
  }

  static ALL = "All"
}

// class Communicatey {
//   #app
//   #publishLock
//   #publishCooldown
//   #trigger
//   #dataQueue
//   #dataInHandle = []

//   constructor(app, subDir, inDir, outDir) {

//     this.#app = app

//     this.#publishLock = false
//     this.#publishCooldown = 50
//     this.#dataQueue = []

//     this.#trigger = new Event("message")

//     this.#trigger.addListener("message", (data) => {
//       trace("Message Published", data, "@messageOut")
//     })

//     for (let key in outDir) {
//       this.#app.post(subDir + key, (req, res) => {

//         let listen = function(data) {
//           let applies;

//           applies = (
//             typeof data.public("target") == "object"
//             && Object.values(data.public("target")).includes(req.body.sessionId)
//           ) || (
//             data.public("target") == req.body.sessionId
//           ) || (
//             data.public("target") == "All"
//           )

//           if (applies) {
//             res.send(data.send())
//           }
//         }


//         this.#trigger.addListener("data", listen)
//       })
//     }

//     for(let key in inDir){
//       this.#app.post(subDir + key, inDir[key])
//     }
//   }


    
//   pass(data, target = "All") {
    
//   }

//   in (func) {
//     this.#dataInHandle.push(func)
//   }


// }

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