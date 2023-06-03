let lastMessage = "";
let selectedChat = "main"
let chats = {
  main: ["Channel Loaded"]
}

let updateObjEx = {
  chat: "main",
  updates: [
    {
      loc: 1,
      val: "hello"
    },
    {
      loc: 5,
      val: "Goodbye"
    }
  ]
}
asyncTriggers()
let permission

async function asyncTriggers() {
  permission = await Notification.requestPermission()
}
let build = { loaded: false }
let goon = false

const buildCheck = new XMLHttpRequest()
buildCheck.open("GET", "https://chat.mostlyturquoise.repl.co/build")
buildCheck.onload = () => {
  build = JSON.parse(buildCheck.responseText).content.build
  if (!build.stable) {
    console.log(build.description)
    if(build.password){
      goon = prompt(`${build.description}\n
      Version: ${build.version}
      Restrict Messages: ${build.restrictMessages}`)==build.password
    } else {
      goon = confirm(
      `${build.description}\n
      Version: ${build.version}
      Restrict Messages: ${build.restrictMessages}`
    )
    }
    
  } else {
    goon = true
  }
  if (goon) {
    getChannelContents("main")
    updateChannel()
    buildUpdate()
  } else {
    location.href = "about:blank"
  }
}
buildCheck.send()

function buildUpdate() {
  if (build.stable) {
    document.getElementById("stable").innerHTML = "Stable Build"
    document.getElementById("stable").setAttribute("class", "stableBuild")
  } else {
    document.getElementById("stable").innerHTML = "Unstable Build"
    document.getElementById("stable").setAttribute("class", "unstableBuild")
  }
}

async function updateChannel() {
  if (goon) {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", `https://chat.mostlyturquoise.repl.co/reciever`)
    xhr.setRequestHeader('Content-type', 'application/json');
    xhr.onload = () => {
      updateMessages(JSON.parse(xhr.responseText))
      updateChannel()
    }
    xhr.onerror = (err) => {
      console.error(err)
    }
    xhr.ontimeout = () => {
      updateChannel()
    }
    xhr.send(JSON.stringify({ sessionId: lib.cookie.get("sessionId") }))
  } else {
    setTimeout(() => {
      updateChannel()
    }, s(1))
  }
}

addEventListener('resize', (event) => {
  scrollToBottom("content")
});

function scrollToBottom(id) {
  const element = document.getElementById(id);
  element.scrollTop = element.scrollHeight;
}

function updateMessages(objIn) {
  //OTHER PACKET METHOD HANDLING
  console.log(objIn)
  if (typeof objIn == "object" && objIn.metadata.public.method == "Audience Check") {

    console.log("Audience Check Arrived.")

  } else if (typeof objIn == "object" && objIn.type == "update") {
    var obj = objIn
    for (var update in obj.updates) {
      let chatLength;
      chatLength = chats[obj.chat].length
      while (update.loc > chatLength) {
        chatLength = chats[obj.chat].push("")
        chatLength = chats[obj.chat].length
      }
      chats[obj.chat][update.loc] = update.val
    }
    updateDisplay()
    notifQuery()
  } else if (typeof objIn == "object" && objIn.metadata.public.method == "Full Channel") {
    chats[objIn.metadata.public.channel] = objIn.content
    console.log(chats)
    updateDisplay()
    notifQuery()
  } else {
    console.log("unexpected response", objIn)
  }
}

async function notifQuery() {
  if (!document.hasFocus()) {
    let notif = new Notification("Chat", {
      body: "You have new messages.",
      icon: "/images/blubScaled.png",
      vibrate: [1000, 1, 1000]
    })
    setTimeout(() => {
      notif.close();
    }, s(10));
  }
}

function updateDisplay() {
  channelFrmt = formatChannel(chats[selectedChat])
  if (typeof chats[selectedChat] == "object" && chats[selectedChat].messages.length > 0) {
    console.groupCollapsed("Display Update: " + selectedChat)
    console.log("Updating display as " + selectedChat)
    document.getElementById("content").innerHTML = channelFrmt
    console.log(channelFrmt)
    scrollToBottom("content")
    console.log("Display updated as " + selectedChat)
    console.groupEnd()
  }
}

function formatChannel(chatIn) {
  let chat = chatIn
  let returner = `This is the beginning of <b>${chatIn.metadata.name}</b><br/>`
  for (i = 0; i < chat.messages.length; i++) {
    try {
      let msg = chat.messages[i]
      let timestamp = dater(msg.content.timestamp)
      returner += `<div class=username>[${msg.user.username}] ${msg.content.message}</div> <div class=undate>${timestamp}</div><br>`
    } catch (err) {
      console.warn(err)
    }
  }
  return returner
}

// function formatChannel(textArr) {
//   var originalText, length;
//   originalText = textArr
//   var formattedText = ""
//   var maxLength = 50
//   if (originalText.length - maxLength >= 0) {
//     length = maxLength
//   } else {
//     length = originalText.length - maxLength
//   }
//   for (i = 0; i < length; i++) {
//     try {
//       let msg = originalText[i + (originalText.length - maxLength)]
//       let timestamp = dater(msg.content.timestamp)
//       formattedText += `<div class=username>[${msg.user.username}] ${msg.content.message}</div> <div class=undate>${timestamp}</div><br>`
//     } catch (err) {
//       console.log(err)
//     }
//   }
//   if (originalText[0].user == "Server") {
//     formattedText = "#" + formattedText
//   }
//   return (formattedText)
// }

function dater(dateStr) {
  let msgTimestamp = new Date(dateStr)
  let timestampRaw = msgTimestamp.toLocaleTimeString()
  let stamp = timestampRaw.split(" ")[1]
  let time = timestampRaw.split(" ")[0]
  time = time.split(":")
  time[0] = parseInt(time[0])
  time[1] = parseInt(time[1])
  time[2] = parseInt(time[2])
  if (stamp == "PM") {
    time[0] = time[0] + 12
  }
  if (time[1] < 10) {
    returner = `${time[0]}:0${time[1]}`
  } else {
    returner = `${time[0]}:${time[1]}`
  }
  return (returner)
}

function getChannelContents(channel) {
  if (goon) {
    var req = new XMLHttpRequest()
    req.open("POST", `https://chat.mostlyturquoise.repl.co/load`);
    req.setRequestHeader('Content-type', 'application/json');
    req.onload = () => {
      if (req.status == 200) {
        arrival = JSON.parse(req.responseText)
        chats[channel] = arrival
        console.log(chats[channel])
        updateDisplay()
      } else if (req.status == 401) {
        location.href = "https://chat.mostlyturquoise.repl.co"
      }
    };
    package = {
      sessionId: lib.cookie.get("sessionId"),
      channel: channel
    }
    req.send(JSON.stringify(package))
  } else {
    setTimeout(1000, () => {
      getChannelContents(channel)
    })
  }
}

function sendMessage(channel, message) {
  if (goon) {
    var req = new XMLHttpRequest()
    req.open("POST", `https://chat.mostlyturquoise.repl.co/send/${channel}`);
    req.setRequestHeader('Content-type', 'application/json');
    req.onload = () => {
      if (req.status == 401) {
        location.href = "https://chat.mostlyturquoise.repl.co"
      }
    };
    req.send(`{"sessionId": "${lib.cookie.get("sessionId")}", "loc": "latest", "val": "${message}"}`)
  } else {
    setTimeout(1000, () => {
      sendMessage(channel, message)
    })
  }
}

function sendButton() {
  const message = document.getElementById('fin').value
  document.getElementById("fin").value = ""
  sendMessage("main", message)
}

document.addEventListener("keypress", (e) => {
  if (e.keyCode == 13) {
    sendButton()
  }
})

function s(m) {
  return (m * 1000)
}

let pushes = 0
if (lib.cookie.get("pushes")) {
  pushes = lib.cookie.get("pushes")
  document.getElementById("countbutton").value = pushes
}


document.getElementById("countbutton").addEventListener("click", (e)=>{
  pushes++
  document.getElementById("countbutton").value = pushes
  lib.cookie.set("pushes", pushes)
})

document.getElementById("countbutton").addEventListener('contextmenu', function (e) { 
  pushes--
  document.getElementById("countbutton").value = pushes
  lib.cookie.set("pushes", pushes)
  e.preventDefault(); 
});