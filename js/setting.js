let todolistbutton = document.querySelector(".todolist");
let pomodorabutton = document.querySelector(".pomodora")
let settingbtn = document.querySelector(".setting")
let dashboardbutton = document.querySelector(".dashboard")

todolistbutton.addEventListener("click", () =>{
    window.location.href = "../html/todolist.html"
})

pomodorabutton.addEventListener("click", () => {
    window.location.href = "../html/pomodora.html"
})

dashboardbutton.addEventListener("click", () => {
    window.location.href = "../html/home.html"
})

