// serialisation to db is ok, but reconstructing the array and processing it is just terrible

const fs = require("fs");
const http = require("http");
const https = require("https");
const express = require("express");
const redis = require("redis");
const fetch = require("node-fetch");

console.log(process.env.opentoken)

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

// core api end point for front end
// i dont know how to write async stuff synchronously without being an absolute fucking mess
app.get("/API", (req, res) => {
	// object skeleton
	let tempNum = Math.floor(Math.random() * 36).toString()
	while(tempNum == 0) {
		tempNum = Math.floor(Math.random() * 36).toString()
	}
	let dataObj = { "temp": { "history": { "svn": [], "tmr": [], "trueData": [] }, "current": "" },
		"background": "https://tetr.io/res/bg/" + tempNum.toString()  + ".jpg"
	}
	// fetch live data
	fetch(`https://api.openweathermap.org/data/2.5/onecall?lat=-37.840935&lon=144.946457&exclude=minutely,hourly,daily,alerts&appid=${process.env.opentoken}&units=metric`)
	.then(res => res.json()) // parsing data
	.then(x => dataObj.temp.current = x.current.temp) // pushing data
	.then(() => {
		// db data fetching
		function callFunc(callback) {
			let forecast_tmr = []
			// retrive references to relevant keys
			rclient.KEYS("WEATHER:TEMP:HISTORY:FORECAST:TMR:*", (err, reply) => {
				// temp data store
				let keyList = reply
				// mass fetch values for relevant keys
				rclient.MGET(keyList, (err, reply) => {
					// construct array
					for(i in reply) {
						forecast_tmr.push({ "time": keyList[i].split(":")[5], "value": reply[i]})
					}
					callback(forecast_tmr)
				})
			})
		}
		// complete response construction + reply with data
		callFunc((tmr) => { 
			function callFunc2(callback) {
				let forecast_svn = []
				// retrive references to relevant keys
				rclient.KEYS("WEATHER:TEMP:HISTORY:FORECAST:SVN:*", (err, reply) => {
					// temp data store
					let keyList = reply
					// mass fetch values for relevant keys
					rclient.MGET(keyList, (err, reply) => {
						// construct array
						for(i in reply) {
							forecast_svn.push({ "time": keyList[i].split(":")[5], "value": reply[i]})
						}
						callback(forecast_svn)
					})
				})
			}
			callFunc2(svn => {
				function callFunc3(callback) {
					let trueData = []
					// retrive references to relevant keys
					rclient.KEYS("WEATHER:TEMP:HISTORY:REAL:*", (err, reply) => {
						// temp data store
						let keyList = reply
						// mass fetch values for relevant keys
						rclient.MGET(keyList, (err, reply) => {
							// construct array
							for(i in reply) {
								trueData.push({ "time": keyList[i].split(":")[4], "value": reply[i]})
							}
							callback(trueData)
						})
					})
				}
				callFunc3((trueData) => {
					dataObj.temp.history.svn.push(...svn);
					dataObj.temp.history.tmr.push(...tmr);
					dataObj.temp.history.trueData.push(...trueData); // took me 30 minutes to realise i copied ...tmr
					res.header("Access-Control-Allow-Origin", "*")
					res.json(dataObj);
				})
			})	
		})
	})
})

app.get("/dbInjection", (req, res) => {
	rclient.set(`WEATHER:TEMP:HISTORY:FORECAST:TMR:2021-05-16`, 20)
	rclient.set(`WEATHER:TEMP:HISTORY:FORECAST:TMR:2021-05-17`, 22)
	rclient.set(`WEATHER:TEMP:HISTORY:FORECAST:TMR:2021-05-18`, 23)

	rclient.set(`WEATHER:TEMP:HISTORY:FORECAST:SVN:2021-05-16`, 25)
	rclient.set(`WEATHER:TEMP:HISTORY:FORECAST:SVN:2021-05-17`, 27)
	rclient.set(`WEATHER:TEMP:HISTORY:FORECAST:SVN:2021-05-18`, 19)

	rclient.set(`WEATHER:TEMP:HISTORY:REAL:2021-05-16`, 23)
	rclient.set(`WEATHER:TEMP:HISTORY:REAL:2021-05-17`, 25)
	rclient.set(`WEATHER:TEMP:HISTORY:REAL:2021-05-18`, 22)

	res.json("OK")
})

// data collection + db construction for historical data
function historyfetch() {
	// object skeleton
	let newData = {
		"temp": {
			"forecastHistory": {
				"tomorrow": undefined,
				"sevenday": undefined
			},
			"history": undefined
		}
	}
	// data fetch for future weather
	fetch(`https://api.openweathermap.org/data/2.5/onecall?lat=-37.840935&lon=144.946457&exclude=minutely,hourly,alerts&appid=${process.env.opentoken}&units=metric`)
	.then(res => res.json())
	.then(fetchedData => {
		// object construction
		newData.temp.forecastHistory.tomorrow = { "temp": fetchedData.daily[1].temp, "date": fetchedData.daily[1].dt }
		newData.temp.forecastHistory.sevenday = { "temp": fetchedData.daily[fetchedData.daily.length - 1].temp, "date": fetchedData.daily[fetchedData.daily.length - 1].dt }
		newData.temp.history = { "temp": fetchedData.current.temp, "date": fetchedData.current.dt }
		// redis key consctruction and pushing
		rclient.set(`WEATHER:TEMP:HISTORY:FORECAST:TMR:${new Date(parseInt(newData.temp.forecastHistory.tomorrow.date*1000)).toISOString().split("T")[0]}`, `${newData.temp.forecastHistory.tomorrow.temp.max}`)
		rclient.set(`WEATHER:TEMP:HISTORY:FORECAST:SVN:${new Date(parseInt(newData.temp.forecastHistory.sevenday.date*1000)).toISOString().split("T")[0]}`, `${newData.temp.forecastHistory.sevenday.temp.max}`)
		let relevantKey = `WEATHER:TEMP:HISTORY:REAL:${new Date(parseInt(newData.temp.history.date*1000)).toISOString().split("T")[0]}`
		rclient.exists(relevantKey, (err, reply) => {
			// inilise key if non existant and update value if max temp for that day increased
			if(reply == 1) {
				rclient.get(relevantKey, (err, reply) => {
					if(parseInt(reply) < fetchedData.current.temp) {
						rclient.set(relevantKey, `${newData.temp.history.temp}`)
					}
				})
			} else {
				rclient.set(relevantKey, `${newData.temp.history.temp}`)
			}
		})
	})
}
// inital dataset generation
historyfetch()
// refresh dataset every hour
setInterval(historyfetch, 600000)

// status server polling
setInterval(() => {
	fetch("http://interstatus:50001/update", {
		method: "post",
		body: JSON.stringify({ name: "wback" }),
		headers: { 'Content-Type': 'application/json' }
	}).catch(e => { console.log("status server down") })
}, 20000)

// importing ssl details
httpsOptions = {
	cert: fs.readFileSync("./ssl/back_textedit_dev.crt"),
	ca: fs.readFileSync("./ssl/back_textedit_dev.ca-bundle"),
	key: fs.readFileSync("./ssl/back_textedit_dev.key")
}
// server initialisation
const httpsServer = https.createServer(httpsOptions, app)
httpsServer.listen(50300, "0.0.0.0", () => console.log("listening 433"))

// local testing
// const httpServer = http.createServer(app)
// httpServer.listen(50300, () => console.log("listening"))
