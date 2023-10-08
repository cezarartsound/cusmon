import { MongoClient, Db, ServerApiVersion } from "mongodb"
import { NextRequest } from "next/server"
import z from 'zod'
import jwt, { JwtPayload } from 'jsonwebtoken'
import CryptoJS from 'crypto-js'

export const TOKEN_EXPIRY_SEC = 1*60*60 // 1 hour

const secret = process.env['COSMON_SECRET'] ?? 'MY_FUCKING_SECRET'
const issuer = process.env['COSMON_ISSUER'] ?? 'cosmon'
const audience = process.env['COSMON_AUDIENCE'] ?? 'cusmon'
const subject = process.env['COSMON_SUBJECT'] ?? 'auth'

export const ConnectData = z.object({
  username: z.string(),
  password: z.string(),
  server: z.string(),
  parameters: z.string().optional(),
})
export type ConnectData = z.infer<typeof ConnectData> 

const Connection = z.object({ 
  expiry: z.number(),
  connect: ConnectData,
})

type Connection = z.infer<typeof Connection>

const connections = new Map<string, MongoClient>()

const createClient = async (token: string, connect: ConnectData): Promise<MongoClient> => {
  const {username, password, server, parameters} = connect
  const uri = `mongodb+srv://${username}:${password}@${server}/?${parameters ?? ''}`
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
  }}) 

  await client.connect()

  connections.set(token, client)

  return client
}

export const addConnection = async (connect: ConnectData): Promise<string> => {
  const payload = {data: CryptoJS.AES.encrypt(JSON.stringify(connect), secret).toString()}
  const token = jwt.sign(payload, secret, {
    issuer,
    audience,
    subject,
    expiresIn: TOKEN_EXPIRY_SEC,
  })
  
  await createClient(token, connect)

  return token
}

export const removeConnection = (token: string): void => {
  connections.delete(token)
}

export const getDb = async (req: NextRequest): Promise<Db|undefined> => {
  const token = req.cookies.get('token')?.value
  if (!token) return undefined

  let payload: JwtPayload

  try {
    payload = jwt.verify(token, secret, {
      issuer,
      audience,
      subject,
    }) as JwtPayload
  } catch(e: unknown) {
    console.log('Invalid token', e)
    connections.delete(token)
    return undefined
  }

  if (typeof payload?.data !== 'string') {
    console.log('Invalid token payload', payload)
    return undefined
  }

  const data = JSON.parse(CryptoJS.AES.decrypt(payload.data, secret).toString(CryptoJS.enc.Utf8))
  const connect = ConnectData.parse(data)

  const client = connections.get(token) ?? await createClient(token, connect)
  
  return client.db('cusmon')
}

