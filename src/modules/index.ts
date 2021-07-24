import { Express } from "express-serve-static-core"
const app: Express = global.app

app.get('/', async (req, res) => {
    res.status(302)
    res.setHeader("Location", "/mail")
    res.end('302 Found')
})