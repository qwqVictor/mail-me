import * as express from "express"
import * as process from "process"
import * as typeorm from "typeorm"
import * as fs from "fs"
import * as path from "path"

const config = {
    port: Number.parseInt(process.env["PORT"]) || 3000,
    db: {
        host: process.env["DB_HOST"],
        username: process.env["DB_USERNAME"],
        password: process.env["DB_PASSWORD"],
        database: process.env["DB_DATABASE"],
    },
    production: true
}
const app = express()
app.use(express.urlencoded())
app.use(express.static(path.join(__dirname, 'static'), { maxAge: config.production ? '1y' : 0 }))
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))
global.app = app

const entities = fs.readdirSync(path.join(__dirname, "entities")).filter((filename) => filename.endsWith(".js")).map((filename) => require("./entities/" + filename).default)
const modules = fs.readdirSync(path.join(__dirname, "modules")).filter((filename) => filename.endsWith(".js")).map((filename) => filename.split('.js')[0])

typeorm.createConnection({
    type: 'mariadb',
    host: config.db.host.split(':')[0],
    port: Number.parseInt(config.db.host.split(':')[1]) || 3306,
    username: config.db.username,
    password: config.db.password,
    database: config.db.database,
    entities: entities,
    synchronize: true,
    logging: !config.production,
    extra: {
      connectionLimit: 50
    }
}).then((connection) => {
    global.db = connection
    modules.forEach(async (module_name: string) => {
        await import("./modules/" + module_name)
    })
    app.listen(config.port, () => console.error(`Mail-me is listening on port ${config.port}...`))
}).catch((reason) => {
    throw reason
})