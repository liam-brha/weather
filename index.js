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

const httpsServer = https.createServer(httpsOptions, app)
httpsServer.listen(433, "0.0.0.0", () => console.log("listening 433"))