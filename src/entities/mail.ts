import { Column, Connection, Entity, PrimaryGeneratedColumn } from "typeorm"
import ScheduledTask from "./scheduledTask"
import SMTPTransport from "./smtpTransport"

@Entity("mail")
export default class Mail {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    from: string

    @Column()
    to: string

    @Column({ nullable: true })
    subject: string

    @Column('longtext', { nullable: true })
    text: string

    @Column('longtext', { nullable: true })
    html: string

    @Column('boolean', { default: false, nullable: true })
    isolateReceivers: boolean

    @Column('boolean', { default: false, nullable: true })
    isSent: boolean

    @Column('boolean', { default: false, nullable: true })
    isScheduled: boolean

    @Column('datetime', { nullable: true })
    sendTime: Date

    @Column()
    transportId: number

    transport: SMTPTransport
    inScheduledTask: boolean

    async loadRelationships(connection: Connection) {
        this.transport = await connection.getRepository(SMTPTransport).findOne(this.transportId)
        this.inScheduledTask = await connection.getRepository(ScheduledTask).createQueryBuilder("task")
                                    .where("mailId = :id", { id: this.id })
                                    .getCount() > 0
    }

    getMailOptions(): Array<any> {
        let ret = []
        let plaintext: boolean = (this.text && !(this.html))
        let partial: any = {}

        if (plaintext)
            partial = { ...partial , text: this.text }
        else
            partial = { ...partial , html: this.html }
        
        let to = this.to.match(/\S+@[\w\.]+/g), tos: string[] = []
        if (this.isolateReceivers) {
            tos = to
        } else {
            tos = [to.join(",")]
        }
        let matchSender = this.from.match(/(\S+) <(\S+@[\w\.]+)>/)
        if (matchSender) {
            partial = { ...partial, from: this.from }
        }
        else {
            partial = { ...partial, from: `${this.from} <${this.transport.address}>` }
        }
        ret = tos.map((to) => Object.assign({}, partial, {
            to: to,
            subject: this.subject
        }))
        return ret
    }
}