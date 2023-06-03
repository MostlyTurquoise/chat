function redirect(value) {
  location.href = "https://chat.mostlyturquoise.repl.co/" + value
}

function test() {
  let xhr = new XMLHttpRequest()
  xhr.open("GET", "https://chat.mostlyturquoise.repl.co/channel/main")
  xhr.setRequestHeader('sessionid', 'tester');
  xhr.onload = () => {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        console.log(xhr.responseText)
      }
    }
  }
  xhr.send()
}