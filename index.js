const fs = require("fs");
const http = require("http");
const https = require("https");
const express = require("express");

httpsOptions = {
	cert: fs.readFileSync("./ssl/back_textedit_dev.crt"),
	ca: fs.readFileSync("./ssl/back_textedit_dev.ca-bundle"),
	key: fs.readFileSync("./ssl/back_textedit_dev.key")
}

const app = express();

app.use((req, res, next) => {
	if(req.protocol === "http") {
		res.redirect(301, `https://${req.headers.host}${req.url}`)
	}
	next()
})

app.use(express.static("./public"));

app.get("/API", (req, res) => {
	res.json("awesome")
})

setInterval(() => {
	fetch("http://interstatus:50001/update", {
		method: "post",
		body: JSON.stringify({ name: "wback" }),
		headers: { 'Content-Type': 'application/json' }
	}).catch(e => { console.log("status server down") })
}, 20000)

const httpsServer = https.createServer(httpsOptions, app)
httpsServer.listen(50250, "0.0.0.0", () => console.log("listening 433"))