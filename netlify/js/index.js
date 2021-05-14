
// initalising components
let page = document.getElementById("page")
let bar = document.getElementById("bar")
let arrow = document.getElementById("arrow")
let github = document.getElementById("github")
let barbox = document.getElementById("barbox")
let arrowleft = document.getElementById("leftArrow")
let arrowright = document.getElementById("rightArrow")
let tempBox = document.getElementById("CurrentTempBox")
let graph = document.getElementById("graph")

// bar animation handling
barbox.addEventListener("mouseenter", (event) => {
	bar.style.height = "40px"
	barbox.style.height = "60px"
	barbox.style.bottom = "40px"
	arrow.style.width = "20px"
	arrowleft.style.bottom = "-7px"
	arrowright.style.bottom = "-7px"	
	github.style.bottom = "0px"
});

page.addEventListener("mouseenter", (event) => {
	bar.style.height = "12px"
	barbox.style.height = "100px"
	barbox.style.bottom = "0px"
	arrow.style.width = "9px"
	arrowleft.style.bottom = "-40px"
	arrowright.style.bottom = "-40px"
	github.style.bottom = "-40px"
})

// api data handling
fetch("http://localhost:50300/api")
.then(res => res.json())
.then(response => {
	// background loading
	document.body.style.backgroundImage = `url(${response.background})`;
	// current temperature display
	let tempString = `${response.temp.current}°`
	document.getElementById("CurrentTemp").innerHTML = tempString
})

// slide logic handling

let currentStatus = {
	"off": graph,
	"mid": tempBox	
}
let moveLock = false

arrowleft.addEventListener("click", (event) => {
	if(moveLock == false) {
		moveLock = true
		currentStatus.off.style.right = "0px"
		currentStatus.mid.style.right = "1200px"

		setTimeout(() => {
			currentStatus.mid.style.transition = "all 0s"
			currentStatus.mid.style.right = "-1200"
			setTimeout(() => {
				currentStatus.mid.style.transition = "all 1.5s"
				let newCurrentStatus = {
					"off": currentStatus.mid,
					"mid": currentStatus.off
				}
				currentStatus = newCurrentStatus
				moveLock = false
			}, 10)
		}, 1500)
	}
})

arrowright.addEventListener("click", (event) => {
	if(moveLock == false) {
		moveLock = true
		currentStatus.off.style.transition = "all 0s"
		currentStatus.off.style.right = "1200"
		setTimeout(() => {
			currentStatus.off.style.transition = "all 1.5s"
			currentStatus.off.style.right = "0"
			currentStatus.mid.style.right = "-1200"
			setTimeout(() => {
				let newCurrentStatus = {
					"off": currentStatus.mid,
					"mid": currentStatus.off
				}
				currentStatus = newCurrentStatus
				moveLock = false
			}, 1500)
		}, 0) // due to the way js handles tasks, this is stupid shit is required.
	}
})
