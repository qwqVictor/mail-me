import { Express } from "express-serve-static-core"
import { Connection } from "typeorm"
import Mail from "../entities/mail"
import SMTPTransport from "../entities/smtpTransport"
const app: Express = global.app,
      db: Connection = global.db

const mailRepository = db.getRepository(Mail),
      smtpTransportRepository = db.getRepository(SMTPTransport)

app.get('/settings', async (req, res) => {
    let [smtpTransports, count] = await smtpTransportRepository.createQueryBuilder("smtp")
                .getManyAndCount()
    res.render('settings', {
        smtpTransports: smtpTransports,
        count: count
    })
})

app.get('/settings/smtp/:id', async (req, res) => {
    let smtpTransport = await smtpTransportRepository.findOne(req.params.id)
    res.render('settings-smtp', {
        title: "编辑 SMTP 发件帐户",
        reqid: req.params.id,
        smtpTransport: smtpTransport,
    })
})

app.get('/settings/smtp/:id/delete', async (req, res) => {
    let transport = await smtpTransportRepository.findOne(req.params.id)
    let usedCount = await mailRepository.createQueryBuilder("mail")
                            .where("transportId = :transportId", { transportId: req.params.id })
                            .andWhere("isSent = 0")
                            .getCount()
    if (usedCount == 0) {
        await smtpTransportRepository.remove(transport)
        res.render('message', {
            title: "编辑 SMTP 发件帐户",
            message: "删除成功",
            referer: req.headers.referer
        })
    } else {
        res.render('message', {
            title: "编辑 SMTP 发件帐户",
            message: "删除失败，不能删除正在使用或即将使用的帐户",
            referer: req.headers.referer
        })
    }
})

app.post('/settings/smtp/:id', async (req, res) => {
    let smtpTransport: SMTPTransport
    if (parseInt(req.params.id.toString())) {
        smtpTransport = await smtpTransportRepository.findOne(req.params.id)
    } else {
        smtpTransport = smtpTransportRepository.create()
    }
    if (!req.body.username) req.body.username = req.body.address
    req.body.secure = req.body.secure == 'on'
    smtpTransport = smtpTransportRepository.merge(smtpTransport, req.body)
    await smtpTransportRepository.save(smtpTransport)
    let id = smtpTransportRepository.getId(smtpTransport)
    if (id) {
        res.status(302)
        res.setHeader("Location", "../")
        res.end('302 Found')
    } else {
        res.status(500).render("error", {
            message: "添加时出错"
        })
    }
})