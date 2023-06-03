let username, password;

function submit() {
  username = document.getElementById("username").value
  password = document.getElementById("password").value

  const xhr = new XMLHttpRequest()
  xhr.open("POST", "https://chat.mostlyturquoise.repl.co/signup")
  xhr.setRequestHeader('Content-type', 'application/json');
  xhr.onload = () => {
    console.log(xhr.responseText)
    location.href = "https://chat.mostlyturquoise.repl.co/login"
  }
  xhr.send(`{"username":"${username}", "password":"${password}"}`)
}