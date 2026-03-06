let dashboardbtn = document.querySelector(".dashboard");
let todolistbtn = document.querySelector(".todolist");
let settingbtn = document.querySelector(".setting");

dashboardbtn.addEventListener("click", () =>{
    window.location.href = "../html/home.html"
})

todolistbtn.addEventListener("click", () => {
    window.location.href = "../html/todolist.html"
})

settingbtn.addEventListener("click", () => {
    window.location.href = "../html/setting.html"
})
