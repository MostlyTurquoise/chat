import { trace } from "./serverside-ui.js"

class Packet {
  constructor(id, method, content = {}) {
    this.metadata = {
      _private: {
        permissions: {

        }
      },
      _public: {
        method: method,
        id: id
      }
    }
    this._content = content


  }

  send(opts = null) {
    let publicMetadata = this.metadata._public
    let content = this._content
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

  setPrivate(key, value) {
    this.metadata._private[key] = value
    return this
  }

  setPublic(key,value) {
    this.metadata._public[key] = value
    return this
  }
}

//make poll system robust V
//build a two way comms system from client to server that has the same send api on both ends, even if the underlying system is different. Recieving will be handled uniquely. 
//Add packet format to client side

export default Packet