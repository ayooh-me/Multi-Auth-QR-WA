const { default: Socket, useMultiFileAuthState, makeInMemoryStore, DisconnectReason, delay } = (await import('baileys')).default
import { Boom } from '@hapi/boom'
import * as ws from 'ws'
import p from 'pino'
import fs from 'fs'
const logger = p({ level: 'silent' })
const store = makeInMemoryStore({ logger })

const connect = async () => {
   try {
      const { state, saveCreds } = await useMultiFileAuthState('Auth')
      const client = Socket({
         browser: ['multi Auth', 'safari', '3.1.0'],
         printQRInTerminal: true,
         logger,
         auth: state
      })
      store.bind(client.ev)
      client.ev.on('connection.update', async (update) => {
         const {
            lastDisconnect,
            connection
         } = update
         try {
            if (connection == 'close') {
               if (new Boom(lastDisconnect.error).output?.statusCode === DisconnectReason.loggedOut) connect()
               else connect()
            } else if (connection == 'open') {
               console.log('Connected!')
               await delay(1000 * 5)
               client.sendMessage(client.user.id, {
                  document: {
                     url: `./Auth/creds.json`
                  },
                  fileName: 'creds.json',
                  mimetype: 'application/json'
               }).then(async () => {
                  fs.unlinkSync(`./Auth/creds.json`)
                  await delay(1000 * 10)
                  process.exit(0)
               })
            }
         } catch (e) {
            console.log(e)
         }
      })
      client.ev.on('creds.update', saveCreds)
   } catch (e) {
      console.log(e)
   }
}

connect().catch(() => connect())