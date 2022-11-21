import {trace} from "./serverside-ui.js"
import fs from "fs"

let config = JSON.parse(fs.readFileSync(`./server-config.json`))
trace(config, "@config")

export {config}