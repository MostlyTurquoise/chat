document.getElementById("content").appendChild(document.createTextNode("Loading Developer Console..."))

let password = prompt("Please enter developer access password:")

let contents = document.getElementById("contents")

axios({
    url:"/dev/consoleContents",
    method:"post",
    headers:{
        password:password
    }
}).then((res)=>{
    console.log(res.data)
})

let fin = document.getElementById("fin")
fin.addEventListener("keypress",(e)=>{
    if(e.key=="Enter"){
        console.log(e.target.value)
        axios({
            url:"/dev/console",
            method:"post",
            headers:{
                password:password
            },
            body:e.target.value
        }).then((res)=>{
            console.log(res.data)
        })
        e.target.value = ""
    }
})