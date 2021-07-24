import { Column, Connection, Entity, PrimaryGeneratedColumn } from "typeorm"
import Mail from "./mail"

@Entity("scheduledtask")
export default class ScheduledTask {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    mailId: number

    mail: Mail

    async loadRelationships(connection: Connection) {
        this.mail = await connection.getRepository(Mail).findOne(this.mailId)
    }
}