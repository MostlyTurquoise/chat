import { trace } from "./serverside-ui.js"

class Packet {
  #metadatapublic
  #metadataprivate
  content
  
  constructor(id, method, content = {}) {
    this.#metadataprivate= {
      permissions: {

      }
    }
    
    this.#metadatapublic= {
      method: method,
      id: id
    }
    
    this.content = content
    this._content = null


  }

  send(opts = null) {
    let publicMetadata = this.#metadatapublic
    let content;
    if(this.content=={} && this._content){
      trace("Deprecated Packet Usage!","@WARNING")
      content = this._content
    } else {
      content = this.content
    }
    
    return {
      metadata: {
        public: publicMetadata
      },
      content: content
    }
  }

  json(opts = null) {
    return JSON.stringify(this.send(opts))
  }

  private(field){
    return this.#metadataprivate[field]
  }

  public(field){
    return this.#metadatapublic[field]
  }

  setPrivate(para1,para2=null){
    if(para2){
      this.#setPrivateKV(para1,para2)
    } else if(typeof para1=="object"){
      this.#setPrivateObj(para1)
    }
    return this
  }

  setPublic(para1, para2=null){
    if(para2){
      this.#setPublicKV(para1,para2)
    } else if(typeof para1=="object"){
      this.#setPublicObj(para1)
    }
    return this
  }

  #setPrivateObj(obj){
    this.#metadataprivate = {...this.#metadataprivate, ...obj}
    return this
  }

  #setPublicObj(obj){
    this.#metadatapublic = {...this.#metadataprivate, ...obj}
    return this
  }

  #setPrivateKV(key, value) {
    this.#metadataprivate[key] = value
    return this
  }

  #setPublicKV(key,value) {
    this.#metadatapublic[key] = value
    return this
  }
}

//make poll system robust V
//build a two way comms system from client to server that has the same send api on both ends, even if the underlying system is different. Recieving will be handled uniquely. 
//Add packet format to client side

export default Packet