import { trace } from "./serverside-ui.js"
import longpollInit from "./poll-manager.js"
import { config } from "./config-manager.js"
import Packet from "./packet-manager.js"

class Communicatey {
  constructor(expApp, subdir = "/comm"){
    const longpoll = new longpollInit(expApp);
    longpoll.create(subdir+"/out")

    
  }

  pass(data, target="All"){
    if(typeof target=="object"){
      
    } else if(typeof target=="number"){
      
    } else if(target=="All"){
      
    } else {
      trace("Unexpected Target selection","@communicatey")
    }
  }

  in() {
    
  }
  
  
}

export default Communicatey