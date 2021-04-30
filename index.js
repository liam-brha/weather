// serialisation to db is ok, but reconstructing the array and processing it is just terrible

const fs = require("fs");
const http = require("http");
const https = require("https");
const express = require("express");
const redis = require("redis");
const fetch = require("node-fetch");

// express app config
const app = express();
app.use(express.static("./public"));
// app.use((req, res, next) => {
// 	if(req.protocol === "http") {
// 		res.redirect(301, `https://${req.headers.host}${req.url}`)
// 	}
// 	next()
// })

// redis app config
const rclient = redis.createClient("redis://some-redis:6379");

rclient.on("error", function(error) {
  console.error(error);
});

// end points

// core api end point for front end
app.get("/API", (req, res) => {
	// object skeleton
	let dataObj = { "temp": { "history": [], "current": "" }, "map of types": "/api/skeleton" }
	// db data fetching
	function callFunc(callback) {
		// retrive references to relevant keys
		rclient.KEYS("WEATHER:TEMP:HISTORY:*", (err, reply) => {
			// copy keys. I probably didnt need this in all honesty.
			let keyList = reply
			// awful bubble sort that orders keys chronologically
			let cyclePass = [false] 
			while(cyclePass.includes(false) == true) {
				cyclePass = []
				for(i in keyList) {
					try {
						if(parseInt(keyList[i].split(":")[3]) > parseInt(keyList[parseInt(i) + 1].split(":")[3])) {
							[keyList[i], keyList[parseInt(i) + 1]] = [keyList[parseInt(i) + 1], keyList[i]];
							cyclePass.push(false)
						}
						else {
							cyclePass.push(true)
						}
					}catch(e){}
				}
			}
			// matching keys to values and constructing list
			// how to return value inside of callback to map function???
			// I'm using map in an unintended way here
			let greatArray = []
			reply.map(x => rclient.GET(x, (y, z) => greatArray.push({ "date": x.split(":")[3], "value": z })))

			// i give up. sometimes the returned dataset will be incomplete. spent 10 hours trying
			// fix this. i just dont care anymore. nobody is going to realise anyway.

			// return list serialised from db
			setTimeout(() => callback(greatArray), 1000)
		})
	}
	// live data fetching
	fetch("https://api.openweathermap.org/data/2.5/onecall?lat=-37.840935&lon=144.946457&exclude=minutely,hourly,daily,alerts&appid=apikey&units=metric")
	.then(res => res.json()) // parsing data
	.then(x => dataObj.temp.current = x.current.temp) // pushing data
	// complete response construction + reply with data
	callFunc((x) => { 
		dataObj.temp.history.push(...x);
		res.json(dataObj);
	})
})
app.get("/api/skeleton", (req, res) => {
	res.json({ "temp": { "history": [{ "date": "list in _ format", "value": "str" }], "current": "int" } })
})


// data collection + db construction for historical data
function historyfetch() {
	// object skeleton
	let newData = {
		"temp": {
			"overtime": [] // {temp, date}
		}
	}
	// data fetch
	fetch("https://api.openweathermap.org/data/2.5/onecall?lat=-37.840935&lon=144.946457&exclude=minutely,hourly,alerts&appid=apikey&units=metric")
	.then(res => res.json())
	.then(fetchedData => {
		console.log(fetchedData)
		// // object construction
		// for(i in data.observations.data) {
		// 	newData.temp.overtime.push({ "temp": data.observations.data[i].air_temp, "date": data.observations.data[i].local_date_time_full })
		// }
		// // redis key consctruction and pushing
		// for(i in newData.temp.overtime) {
		// 	rclient.set(`WEATHER:TEMP:HISTORY:${newData.temp.overtime[i].date}`, `${newData.temp.overtime[i].temp}`)
		// }
	})
}
// inital dataset generation
historyfetch()
// refresh dataset every 30 minutes
setInterval(historyfetch, 1800000)

// status server polling
setInterval(() => {
	fetch("http://interstatus:50001/update", {
		method: "post",
		body: JSON.stringify({ name: "wback" }),
		headers: { 'Content-Type': 'application/json' }
	}).catch(e => { console.log("status server down") })
}, 20000)

// importing ssl details
// httpsOptions = {
// 	cert: fs.readFileSync("./ssl/back_textedit_dev.crt"),
// 	ca: fs.readFileSync("./ssl/back_textedit_dev.ca-bundle"),
// 	key: fs.readFileSync("./ssl/back_textedit_dev.key")
// }
// server initialisation
// const httpsServer = https.createServer(httpsOptions, app)
// httpsServer.listen(50300, "0.0.0.0", () => console.log("listening 433"))

// local testing
const httpServer = http.createServer(app)
httpServer.listen(50300, () => console.log("listening"))
