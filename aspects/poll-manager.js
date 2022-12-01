import { trace } from "./serverside-ui.js"
import sm from "./session-manager.js"
import { config } from "./config-manager.js"
import Event from "events"

function longpoll(app) {



  let exportObj = {
    _trigger: new Event("message"),
    // _awaiting: {},

    create: function(url, mode = "POST") {
      if (mode == "POST") {
        this._createAsPost(url)
      } else {
        trace("Unsupported/Unrecognised Poll mode.", "@longpoll")
      }
    },

    _createAsPost: function(url) {
      trace("POST Longpoll created", url, "@longpoll")
      app.post(url, (req, res) => {
        trace("Post request Longpoll",url,"triggered.","@longpoll")
        const responseHandler = (data) => {
          // if(sm.verify(req.body.sessionId)){
          //   trace("Listener",req.body.sessionId,"triggered successfully", "@messageOut")
          //   res.json(data)
          // }
          res.json(data)
          trace("Listener",req.body.sessionId,"triggered", "@messageOut")
          this._trigger.removeListener("message", responseHandler)
        }
        const listener = this._trigger.on("message", responseHandler)

      })
    },

    // _createAsGet: function(url) {
    //   this._app.get(url, (req,res)=>{

    //   })
    // },

    publish: function(url, data, opts) {
      trace("Publishing to", url, "@messageOut")
      this._trigger.emit("message",data)
    }
  }

  exportObj._trigger.addListener("message", (data) => {
      trace("Message Published", data, "@messageOut")
  })

  return exportObj
}

export default longpoll