// serialisation to db is ok, but reconstructing the array and processing it is just terrible

const fs = require("fs");
const http = require("http");
const https = require("https");
const express = require("express");
const redis = require("redis");
const fetch = require("node-fetch");

const false_data = require("./false_data.json")

httpsOptions = {
	cert: fs.readFileSync("./ssl/back_textedit_dev.crt"),
	ca: fs.readFileSync("./ssl/back_textedit_dev.ca-bundle"),
	key: fs.readFileSync("./ssl/back_textedit_dev.key")
}

// express app config
const app = express();
app.use(express.static("./public"));
app.use((req, res, next) => {
	if(req.protocol === "http") {
		res.redirect(301, `https://${req.headers.host}${req.url}`)
	}
	next()
})

// redis app config
const rclient = redis.createClient("redis://some-redis:6379");
rclient.on("error", function(error) {
  console.error(error);
});

// end points
// im too cool for error handling. if the api responds with unexpected data, LET THE APP CRASH

// core api end point for front end
app.get("/API", (req, res) => {
	let dataObj = { "temp": { "history": [] } }
	rclient.KEYS("WEATHER:TEMP:HISTORY:*", (err, reply) => { // returns array of keys
		let keyList = reply
		// awful bubble sort copied from other code
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
		keyList.map((x) => rclient.GET(x, (y, z) => { dataObj.temp.history.push({ "date": x, "data": z }) }))
		setTimeout(() => res.json(dataObj), 1000)
	})
})

function historyfetch(callback) {
	function yeah(data) {
		// data object generation struc
		// newdata; head of the object
		// temp; object; temperature data
		// overtime; an array of objects; {temp(int), date(string)}; air temp polled every 30 minutes
		// ... date(string) is formatted year/month/day/hour/minute/second with each being two digets except year
		// ... example being 20210426213000
		let newData = {
			"temp": {
				"overtime": [] // {temp, date}
			}
		}
		for(i in data.observations.data) {
			newData.temp.overtime.push({ "temp": data.observations.data[i].air_temp, "date": data.observations.data[i].local_date_time_full })
		}
		// redis db struc
		// db_name:element:type
		// type history uses :date with the data being the temp
		for(i in newData.temp.overtime) {
			rclient.set(`WEATHER:TEMP:HISTORY:${newData.temp.overtime[i].date}`, `${newData.temp.overtime[i].temp}`)
		}
		callback()
	}; yeah(false_data);
}

setInterval(historyfetch, 1800000) // every 30 minutes

historyfetch(() => {
	setTimeout(() => {
		rclient.KEYS("WEATHER:TEMP:HISTORY:*", (err, reply) => { // returns array of keys
			reply.map(x => rclient.GET(x, (y, x) => console.log(x)))
			// map is NOT to be used like this. it is for generating
			// new arrays. but uh ... operateor wouldnt work.
		})
	}, 2000)
})

// status server polling
setInterval(() => {
	fetch("http://interstatus:50001/update", {
		method: "post",
		body: JSON.stringify({ name: "wback" }),
		headers: { 'Content-Type': 'application/json' }
	}).catch(e => { console.log("status server down") })
}, 20000)

// server initialisation
const httpsServer = https.createServer(httpsOptions, app)
httpsServer.listen(50300, "0.0.0.0", () => console.log("listening 433"))
// const httpServer = http.createServer(app)
// httpServer.listen(3000, () => console.log("listening"))
