let username, password, sessionId;

function submit() {
  username = document.getElementById("username").value
  password = document.getElementById("password").value

  const xhr = new XMLHttpRequest()
  xhr.open("POST", "https://chat.mostlyturquoise.repl.co/login")
  xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
  xhr.onload = () => {
    lib.cookie.set("sessionId",xhr.responseText)
    console.log(xhr.responseText)
    location.href = "https://chat.mostlyturquoise.repl.co/chat"
  }
  xhr.send(`{username:"${username}", password:"${password}"}`)
}