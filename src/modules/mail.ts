import { Express } from "express-serve-static-core"
import { Connection } from "typeorm"
import * as nodeSchedule from "node-schedule"
import { sendMail } from "../functions/mailsend"
import Mail from "../entities/mail"
import ScheduledTask from "../entities/scheduledTask"
import SMTPTransport from "../entities/smtpTransport"

const app: Express = global.app,
      db: Connection = global.db

const mailRepository = db.getRepository(Mail),
      smtpTransportRepository = db.getRepository(SMTPTransport),
      scheduledTaskRepository = db.getRepository(ScheduledTask)
    

app.get('/mail', async (req, res) => {
    const PAGESIZE = 50
    let pagesize = parseInt(req.query.pagesize?.toString()) || PAGESIZE
    let page = parseInt(req.query.page?.toString()) || 1
    let [mails, count] = await mailRepository.createQueryBuilder("mail")
                .skip(pagesize * page - pagesize)
                .take(pagesize)
                .orderBy('mail.id', 'DESC')
                .getManyAndCount()
    for (let mail of mails) {
        await mail.loadRelationships(db)
    }
    res.render('mails', {
        mails: mails,
        count: count <= 1 ? 1 : Math.ceil(count / pagesize),
        page: page,
        pagesize: pagesize
    })
})

app.get('/mail/:id', async (req, res) => {
    let smtpTransports = await smtpTransportRepository.createQueryBuilder("smtp").getMany()
    let mail = await mailRepository.findOne(req.params.id)
    await mail?.loadRelationships(db)
    res.render('mail', {
        id: req.params.id,
        mail: mail,
        smtpTransports: smtpTransports
    })
})

app.post('/mail/:id', async (req, res) => {
    let mail
    if (parseInt(req.params.id.toString())) {
        mail = await mailRepository.findOne(req.params.id)
    } else {
        mail = mailRepository.create()
    }
    req.body.isScheduled = req.body.scheduled == "on"
    req.body.sendTime = (req.body.isScheduled) ? new Date(req.body.date + " " + req.body.time) : null
    if (req.body.usehtml == "on") {
        req.body.text = null
        req.body.html = req.body.content
    }
    else {
        req.body.html = null
        req.body.text = req.body.content
    }
    req.body.transportId = parseInt(req.body.transportId?.toString())
    mail = mailRepository.merge(mail, req.body)
    await mailRepository.save(mail)
    let id = mailRepository.getId(mail)
    if (id) {
        if (req.query.mode == "ajax") {
            res.status(200)
            res.end(`{"id": ${id}}`)
        }
        else {
            res.status(302)
            res.setHeader("Location", "../")
            res.end('302 Found')
        }
    } else {
        res.status(500).render("error", {
            message: "添加时出错"
        })
    }
})

app.get('/mail/:id/delete', async (req, res) => {
    let mail = await mailRepository.findOne(req.params.id)
    let task = await scheduledTaskRepository.createQueryBuilder("task")
                            .where("mailId = :id", { id: req.params.id })
                            .getOne()
    if (task) {
        nodeSchedule.cancelJob(task.id.toString())
        await scheduledTaskRepository.remove(task)
    }
    await mailRepository.remove(mail)
    res.render('message', {
        title: "编辑邮件",
        message: "删除成功",
        referer: req.headers.referer
    })
})

app.get('/mail/:id/send', async (req, res) => {
    let mail = await mailRepository.findOne(req.params.id)
    mail.loadRelationships(db)
    await sendMail(mail)
    res.status(302)
    res.setHeader("Location", "../")
    res.end('302 Found')
})

app.get('/mail/:id/schedule', async (req, res) => {
    let mail = await mailRepository.findOne(req.params.id)
    let task: ScheduledTask
    if (parseInt(req.params.id.toString())) {
        task = await scheduledTaskRepository.createQueryBuilder("task")
                        .where("mailId = :id", { id: mail.id })
                        .getOne()
        nodeSchedule.rescheduleJob(mail.id.toString(), mail.sendTime)
    } else {
        task = scheduledTaskRepository.create()
        task.mailId = mail.id
        nodeSchedule.scheduleJob(mail.id.toString(), mail.sendTime, async () => {
            await sendMail(mail)
        })
    }
    res.status(302)
    res.setHeader("Location", "../")
    res.end('302 Found')
})