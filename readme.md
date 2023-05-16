
# Weather

## Stack

- Nodejs
- Docker
- Redis
- Express
- Vultr/Netlify
- vanilla JS
- CSS
- HTML
- Highcharts

## Hosting

- `./netlify` contains static files
- `./index.js` for the server

## Docker

```sh
docker network create my-net
```

```sh
docker run --name some-redis --network my-net redis redis-server --appendonly yes
```

```sh
docker run --name wback --env-file .env --network my-net -p 50300:50300 wback
```

## Domain structure

| Domain | Service |
| - | - |
| weather.textedit.dev | Netlify |
| back.textedit.dev | wback |

## Database

- Redis
- Most definitely should not have used Redis

#### /API/ structure

```json
{
	"temp": {
		"history": {
			"svn": [{
				"time": "ISODATESTRING",
				"value": "2 DECIMAL POINT NUMBER IN STRING FORM"
			}],
			"tmr": [{
				"time": "ISODATESTRING",
				"value": "2 DECIMAL POINT NUMBER IN STRING FORM"
			}],
			"trueData": [{
				"time": "ISODATESTRING",
				"value": "2 DECIMAL POINT NUMBER IN STRING FORM"
			}]
		},
		"current": "2 DECIMAL FLOAT"
	}, 
	"background": "url"
}
```

### timers

Data is scraped once an hour.

## Quirky graph errors

![messed up graph](https://media.discordapp.net/attachments/772767870513840129/843114341540167730/unknown.png?width=402&height=348)

![sorted graph](https://media.discordapp.net/attachments/843359734660726815/843359755354243082/unknown.png?width=464&height=348)

## screenshots

### Home page

![Home page](https://cdn.discordapp.com/attachments/843359734660726815/843362246859423794/unknown.png)

### Home page with expanded bar

![Home page with expanded bar](https://cdn.discordapp.com/attachments/843359734660726815/843362827900289024/unknown.png)

### Graph page

![Graph page](https://cdn.discordapp.com/attachments/843359734660726815/843363010319220786/unknown.png)
