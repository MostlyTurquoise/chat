import {trace} from "./serverside-ui.js"
import sm from "./session-manager.js"
import {config} from "./config-manager.js"

function longpoll(app) {
  


  let exportObj = {
    _app: app,
    _awaiting:{},
    
    create: function(url, mode="POST") {
      if(mode=="POST"){
        this._createAsPost(url)
      } else {
        trace("Unsupported/Unrecognised Poll mode.", "@longpoll")
      }
    },

    _createAsPost: function(url) {
      this._app.post(url, (req,res)=>{
        if(sm.verify(req.body.sessionId) || !config.strictSessionId) {
          let id = req.body.sessionId
          this._awaiting[url][id]=res
        }
        
      })
    },

    // _createAsGet: function(url) {
    //   this._app.get(url, (req,res)=>{
        
    //   })
    // },

    publish: function(url, data, opts) {
      keys = Object.keys(this._awaiting[url])
      for(let i = 0; i<keys.length; i++){
        this._awaiting[url][keys[i]].send(data)
      }
    }
  }

  return exportObj
}