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
      } else if(mode=="GET"){
        this._createAsGet(url)
      }
    },

    _createAsPost: function(url) {
      this._app.post(url, (req,res)=>{
        if(sm.verify(req.body.sessionId) || !config.strictSessionId) {
          let id = req.body.sessionId
          this._awaiting[id]=res
        }
        
      })
    },

    _createAsGet: function(url) {
      this._app.get(url, (req,res)=>{
        
      })
    }
  }

  return exportObj
}