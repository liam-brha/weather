
# Poorly executed school project, not much to see here

https://weather.textedit.dev/

# A refection on the project

My initial goal was to create a website at weather.textedit.dev that would report to you the current temperature, the chance of rain and have a pretty background. This doesn't satisfy the goal of the unit - data analysis. In response, an extra feature was planned; a weather prediction and actual temperature logger to determine the accuracy of forecasting services. 

# The tech stack
- Nodejs
- Docker
- Redis
- Express
- Vultr/Netlify\
Client side:
- vanilla js
- CSS
- HTML
- Highcharts

# workflow
The "Doc" file in the repo is a small script I wrote for rebuilding and executing the container. My workflow was:
1. edit code
2. run script
3. manually test changes and hope you clicked enough things to verify nothing broke\
A key issue with rebuilding the docker container every single time was speed. My MacBook and server take multiple seconds to build the container, though my PC is blazing fast. But then on my pc the terminal kind of dies because wsl + windows terminal sucks so I can't test anything properly there anyway.

# The architecture

## Server hosting
Static file hosting is separated from the main backend server to both simplify and divide the codebase and to reduce the load on the main backend. If this website had more than about one user a month then it would save my main backend server a great deal of load to serve static files through netlify. I added the backend contains into my existing VPS.

## Docker
The main program runs inside of a docker container linked with two other containers - one is the Redis database and the other is my status server. The status server is a custom-built solution for quickly checking the status of all my web apps from a publically facing interface, saving the hassle of logging into the VPS and running docker commands. Unfortunately, it's rather unstable and likes to exit with no log on why. That system and codebase is documented in a different repo. The Redis database container is built from a docker image distributed by the Redis team and has no configuration applied other than instructing it to rebuild itself from a log file if the container goes down. All the containers are hooked into a private network bridge, allowing them to communicate internally in a simulated data centre. Docker's user-defined bridges also allow for internal domain resolution with no configuration, so linking the containers within the code itself is easy. The main backend server has a port that is linked to an external port facing the actual web. Through this, traffic is served. 

## Container structure
Docker builds the container from the `Dockerfile` file. It gets the latest alpine node image, copies in my code and executes `index.js`. 

## Domain structure
Netlify is setup with weather.textedit.dev and the backend is on back.textedit.dev:50300. The choice of ports bound to different services was one of economic choice - I did not wish to pay for an SSL certificate for every container I ran.

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
As undeniably sad as this code is, it does what I wish it to.

## Main control flow
The control flow of the program is event-driven, with a functional program approach taken within the trigger statements themselves. I do not know if this is good or bad, as I have never taken a proper programming class in my life, but it is how I normally program.
### event triggers
The event triggers are handled by expressjs, a nodejs framework for serving requests. The framework isn't verbose at all if you don't want it to be, which is great for me as it greatly simplifies my job. There is only one actual endpoint for my website, handled by `app.get` with a string and a callback. The only other event trigger is `rclient.on` which is just for configuring the handling of the Redis database.
#### /API/ walkthrough
Initially, the skeleton of the object we wish to resolve the request to is constructed. We then fetch the current weather data from the moment and incorporate the relevant fields into the object. The historical data is also fetched, and then the object is refined into its final form and served to the request. The style of chaining callbacks is rather awkward in my eyes, but I have not been taught not to do it like this so I shall. In retrospect, I really should have used a function for this. Rather than copying and pasting the code three times. This is like the most elementry use of a function possible and I didn't do it. In fact, asynchronously fetching the data from all three of the db keys would have made so much more sense. JS is litterally built for this.
#### /API/ object structure
```json
{
	"temp": {
		"history": {
			"svn": [{
				"time": "ISOSTRING",
				"value": "2 DECIMAL POINT NUMBER IN STRING FORM"
			}],
			"tmr": [{
				"time": "ISOSTRING",
				"value": "2 DECIMAL POINT NUMBER IN STRING FORM"
			}],
			"trueData": [{
				"time": "ISOSTRING",
				"value": "2 DECIMAL POINT NUMBER IN STRING FORM"
			}]
		},
		"current": "2 DECIMAL POINT NUMBER IN STRING FORM"
	}
}
```
The use of strings in the return values is because of the way I stored values in the redisdb. Everything is a string.
### timers
A timer is set to execute once an hour that fetches the weather data of the time and writes it into the database. Another timer polls the internal status server.

## Front end

### inital loading and structure of document
==============

# Issues
## CORS
Though I had heard of great pains in Cross-Origin Resource Sharing before starting this project, the issues I had were brief and quickly resolved. Simply adding in a wildcard header to my API endpoint fixed it. CORS prevents different domains from using resources without explicit permissions configured in the headers, and my backend being hosted on a different domain creates this issue.

## VPS ram issue with Redis
My VPS runs out of ram. I'm not sure about the frequency - I haven't tested. I think it's because of the Redis instance I have though I'm not too sure. For safety in case my VPS dies and you can't view the assessment I produced, I attached screenshots. Upon launching the containers everything is operable with minimal usage and then it increases. Presumably a memory leak or some kind of caching in the Redis server that slowly builds up in size. 

## BOM API issue
I spent, to no exaggeration, upward of seven hours on this. Considering that I ended up using open weather anyway, the effort was completed wasted and worst of all - I didn't learn anything directly related to programming. The initial issue was where to fetch the data. BOM likes XML and RSS and a lot of old tech that just isn't supported easily with my tech stack. There is also a fairly large lack of documentation beyond "yeah you can fetch some data here in these folders over FTP". Exploring this web of an FTP server didn't clarify much, knowing almost nothing about shorthand weather terms myself. I also investigated the use of XML parsing tools for nodejs, but nothing easy and well documented appeared. I then quickly googled for other endpoints and a StackOverflow post from a few years ago with two upvotes pointed to a new endpoint, one with nothing but path parameters. It was in JSON format! Loading the endpoint in my browser returned the last 72 hours of weather data. I converted it to js code and fetched the point, but only to be returned with "sorry we don't allow web scraping on our API endpoints anymore." So I spoofed my user agent into being a regular browser request and it worked again. Unfortunately, when executing the code on my VPS it would think I was a scraper no matter what degree of spoofing I tried. Each one of these issues I spent multiple hours working through and strongly contributed toward my burnout on the project. My key learning from this was "don't spend hours working around the issue, redesign the code to avoid the issue in the first place". The scale of this issue did not equate well to the hours I invested into it.

## Control flow pains
I spent over a day thinking about how I could use a workaround to ensure my initial 10 lines of code I had already written would work and ended up just deleting the original code and starting again. Within the style of work I use (completely unplanned development), this doesn't work. Deleting the code and rewriting the control flow for the function was initially what I should have done, but I was unable to see that as an option. This, in conjunction with my issues on the bom api, has forced me to reflect on workflow and decision making efficiency. My "scope of thought" tends to match the scope of the program that I'm currently working in, and this particular issue has expanded my "scope of thought". I coined that term just now, no clue if it's correct to write.\
\
Oh yeah, the actual issue was to do with asynchronous module execution and needing it to be executed synchronously and returning the value with a callback to a higher function. It was dumb and stupid and just didn't make sense. My head struggles to keep track of such a web of scopes.

## Version control
This shouldn't have delayed me as much as I did. For a segment of the project, I was working on a different branch as I was reluctant to delete my bom API code having worked on it for several hours. I was repeatedly executing the wrong commands in the wrong order trying to sync the code between my three machines.

## Container health
Containers are not auto restarted when they go down or anything like that, causing problematic service reliability. Learning and implementing Kubernetes would solve this, though I am not in the state of mind right now to continue working on this godforsaken project. It went downhill as soon as I didn't properly write a design doc beforehand.

## Dates
Dates suck. It was problematic. As of writing, it is still problematic. The whole world should just use utc and abolish time zones. Even better lets just use unix time.

# Testing
Yeah no I didn't test properly. That's all I have to say for this heading. I don't know how to test things properly.

# Time distribution and delayed submission
Consistently distributing time on this project was difficult. Prototyping and laying out the relevant services and architecture was an intriguing and motivating exercise, in which I was forced to consider the amount of time I had and what skills I could use to effectively implement my goal before the due date. The next day I got out of bed ready to work and it suddenly occurred to me to read up on boot processes and Linux distros. I spent three days working around the clock to customise three different machines. Post that momentary endeavour, I worked on the project around the clock. Multiple hours a day for an entire week. My time mismanagement within this stage was to do with exploring features and methods of doing things that I didn't end up using. Really in retrospect, this inefficiency could be almost exclusively mitigated by working to a proper design doc. I did not. After working for a week straight, I was completely burnt out and in no position to submit. So the only progress I made in the following week was CORS and a little bit of work on the front end. Oh yeah in the midst of all this I also had to start and finish three other assessments, further decreasing the number of hours I could cope with working on the project.\

The final week I had was tasked with finishing the API endpoint, all of the boilerplate front end and learning a graph library.

# Final words
This project was regrettable. I learnt honestly not nearly as much I should have for the amount of time I spent on it, but it is done now.
## Assessment
Under analysis of data, I performed to a medium. Very little actual reflection on the data collection occurred. The data collection also kind of sucked cause there is like four points of data. Though the amount of data will build up over time.\
Design-wise, a medium here. A generous medium.\
Development, a generous medium again. Proper testing methods were not implemented again. The only complex part of this project was the messy control flow. Which isn't even a good thing. The impressive and cool part is the tech stack I used, though it was so poorly implemented I don't think it deserves to increase my mark.\
"Evaluation" wise, I don't know how to interpret this one. Presumably, the project performs to a very low level if I didn't deliberately implement anything to reflect it.
The work I performed throughout the project kind of didn't reflect the point of the unit overall, which is disappointing and due to my lack of capacity for building full-stack apps efficiently.