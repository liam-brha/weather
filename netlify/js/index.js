
function apiPoll() {
	fetch("https://back.textedit.dev:60000/", {
	})
	.then(data => data.json())
	.then(data => {
		let x = document.getElementById("datadiv");
		let newData = document.createElement("p");
		var textData = document.createTextNode("uh");
		console.log(data.data)
		newData.appendChild(textData);
		x.appendChild(newData)
	})
}