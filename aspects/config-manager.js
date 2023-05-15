import {trace} from "./serverside-ui.js"
import fs from "fs"

let config = JSON.parse(fs.readFileSync(`./server-config.json`))
trace(config, "@config")

function updateConfig(){
  config = JSON.parse(fs.readFileSync(`./server-config.json`))
}

export {config, updateConfig}