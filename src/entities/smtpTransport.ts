import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity("smtptransport")
export default class SMTPTransport {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    address: string

    @Column()
    host: string

    @Column()
    port: number

    @Column({ default: false })
    secure: boolean

    @Column({ nullable: true })
    username: string

    @Column({ nullable: true })
    password: string

    @Column({ nullable: true })
    rejectUnauthorized: boolean

    getTransportBundle() {
        return {
            id: this.id,
            host: this.host,
            port: (this.port > 0 && this.port < 65536) ? this.port : 465,
            secure: this.secure, // use TLS
            auth: {
              user: this.username ?? this.address,
              pass: this.password
            },
            tls: {
              rejectUnauthorized: this.rejectUnauthorized ?? true
            }
        }
    }
}