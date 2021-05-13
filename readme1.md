
https://weather.textedit.dev/

# A refection and justifcation on the project

My inital goal was to create a website at weather.textedit.dev that would report to you the current temperature, chance of rain and have a pretty background. Obviously this doesn't satisfy the goal of the unit - data analysis. In response, an extra feature was planned; a weather prediction and actual temperature logger to determine accuracy of forecasting services. 

# The tech stack
- nodejs
- docker
- redis
- express
- vultr/netlify
client side:
- vanilla js
- css
- html
- highcharts

# The aritecture

## Server hosting
Static file hosting is seperated from the main backend server to both simplify and divide the codebase and to reduce load on the main backend. If this website had more than about one user a month, than it would save my main backend server a great deal of load to serve static files on through netlify. I added the backend contains into my existing VPS.

## Docker
The main program runs inside of a docker container linked with two other containers - one is the redis database and the other is my personal status server. The status server is a custom built solution for quickly checking the status of all my webapps from a publically facing interface, saving the hastle of logging into the VPS and running docker commands. Unfortuately its rather unstable and likes to exit with no log on why. That system and codebase is documented in a different repo. The redis database container is built from a docker image distributed by the redis team, and has no configuration applied other than instructing it to rebuild itself from a log file if the container goes down. All the containers are hooked into a private network bridge, allowing them to communicate internally in a simulated data center. Docker's user defined bridges also allow for internal domain resolution with no configuration, so linking the containers within the code itself is easy. The main backend server has a port that is linked to an external port facing the actual web. Through this, traffic is served. 

## Domain structure
Netlify is setup with weather.textedit.dev and the backend is on back.textedit.dev:50300. The choice of ports binded to different services was one of economic choice - I did not wish to pay for an SSL certificate for every container I ran.

## Database structure
In half-way-through-the-project-retrospect, redis was not what I should have used. The only justification for its use was that I already knew how to use its nodejs library. The system I used involved setting keys representing a piece of data, and value being the relevant temperature. See below.
```js
rclient.set(`WEATHER:TEMP:HISTORY:FORECAST:TMR:${new Date(parseInt(newData.temp.forecastHistory.tomorrow.date*1000)).toISOString().split("T")[0]}`, `${newData.temp.forecastHistory.tomorrow.temp.max}`)
```
That code is offensive to look at, though it works.\
Accessing the database and constructing the data to return on the API is at least as equally offensive, considering it uses a redis method for retriving keys that is meant to be reserved for debugging purposes only.\
```js
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
```
As undenibly sad as this code is, it does what I wish it to.

## Main control flow
The control flow of program is event driven, with a functional program approach taken within the trigger statements themselves. I do not know if this is good or bad, as I have never taken a proper programming class in my life, but it is how I normally program.
### event triggers
The event triggers are handled by expressjs, a nodejs library for building 
### timers

# Issues
## CORS
Though I had heard of great pains in Cross Orgin Resource Sharing before starting this project, the issues I had were brief and quickly resolved. Simply adding in a wildcard header to my api endpoint fixed it. CORS prevents different domains from using resources without explict permissions configured in the headers, and my backend being hosted on a different domain this was an issue.

## VPS ram issue with redis
My VPS runs out of ram. I'm not sure about the frequency - I havent tested. I think its because of the redis instance I have though Im not too sure. For safety in case my VPS dies and you can't view the KLT I produced, I attached screenshots. Upon launching the containers everything is operable with minimal usage and then it increases. Pressumably a memory leak or some kind of caching in the redis server that slowly builds up in size. 

## BOM api issue
I spent, to no exaggeration, upward of seven hours on this. Considering that I ended up using open weather anyway, the effort was completed wasted and worst of all - I didn't actually learn anything directly related to programming. The inital issue was where to fetch the data. BOM likes XML and RSS and a lot of old tech that just isn't supported easily with my tech stack. There is also a fairly large lack of documentation beyond "yeah you can fetch some data here in these folders over ftp". Exploring this web of an ftp server didn't clarify much, knowing almost nothing about short hand weather terms myself. I also investigated use of XML parsing tools for nodejs, but nothing easy and well documented appeared. I then quickly googled for other endpoints and a stackoverflow post from a few years ago with two upvotes pointed to a new endpoint, one with nothing but path parameters. It was in JSON format! Loading the endpoint in my browser returned the last 72 hours of weather data. I converted it to js code and fetched the point, but only to be returned with "sorry we dont allow webscraping on our api endpoints anymore." So I spoofed my user agent into being a regular browser request and it worked again. Unfortunately, when executing the code on my VPS it would think I was a scraper no matter what degree of spoofing I tried. Each one of these issues I spent multiple hours working through and strongly contributed toward my burnout on the project. My key learning from this was "don't spend hours working around the issue, redesign the code to avoid the issue in the first place". The scale of this issue did not equate well to the hours I invested into it.