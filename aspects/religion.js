import { trace } from "./serverside-ui.js"

import axios from "axios"

function pray() {
  trace("Praying...", "@religion")
  axios.post("https://perpetuator.mostlyturquoise.repl.co", {
    url: "https://chat.mostlyturquoise.repl.co/perpetuator"
  }).then((response) => {
    trace("The Perpetuator responded:", response.data, "@religion")
  })
}

export default pray