import { createTransport } from "nodemailer"
import { Connection } from "typeorm"
import Mail from "../entities/mail"

const db: Connection = global.db,
      mailRepository = db.getRepository(Mail)

export async function sendMail(mail: Mail) {
    mail.isSent = true
    if (!mail.sendTime) {
        mail.sendTime = new Date()
    }
    await mailRepository.save(mail)
    let transport = createTransport(mail.transport.getTransportBundle())
    for (let bundle of mail.getMailOptions()) {
        transport.sendMail(bundle)
    }
}