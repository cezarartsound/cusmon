import { MongoClient, Db, ServerApiVersion } from "mongodb"
import { NextRequest } from "next/server"
import z from 'zod'
import fs from 'fs'
import { randomUUID } from "crypto"

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

const connections = new Map<string, Connection & {client?: MongoClient}>()
let _initialized = false
const init = (): void => {
  if(!_initialized) {
    _initialized = true
    try {
      const storedRaw = fs.readFileSync('./connections.json', 'utf8')
      const storedParsed = z.record(z.string(), Connection).safeParse(JSON.parse(storedRaw))
      if (storedParsed.success) {
        Object.entries(storedParsed.data).forEach(([token, connection]) => connections.set(token, connection))
      } else {
        console.error('ERROR PARSING CONNECTIONS FILE')
      }
    } catch(error) {
      console.log(error)
    }
  }
}
const flush = (): void => {
  const data = z.record(z.string(), Connection).parse(Object.fromEntries(Array.from(connections.entries()).map<[string, Connection]>((([token, data]) => [token, {
    expiry: data.expiry,
    connect: data.connect,
  }]))))
  fs.writeFileSync('./connections.json', JSON.stringify(data))
  console.log('File updated ./connections.json')
}

const createClient = async (connect: ConnectData): Promise<MongoClient> => {
  const {username, password, server, parameters} = connect
  const uri = `mongodb+srv://${username}:${password}@${server}/?${parameters ?? ''}`
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
  }}) 

  await client.connect()

  return client
}

export const addConnection = async (connect: ConnectData, expiry: number): Promise<string> => {
  const client = await createClient(connect)
  await client.connect()
  
  const token = randomUUID()
  connections.set(token, {connect, expiry, client})
  flush()

  return token
}

export const removeConnection = (token: string): void => {
  connections.delete(token)
  flush()
}

export const getDb = async (req: NextRequest): Promise<Db|undefined> => {
  init()
  
  const token = req.cookies.get('token')?.value
  if (!token || !connections.has(token)) return undefined
  
  let {expiry, client, connect} = connections.get(token) ?? {}
  if (!connect || !expiry || expiry < +new Date) {
    connections.delete(token)  
    return undefined
  }

  if (!client) {
    client = await createClient(connect)
    connections.set(token, {expiry, client, connect})
  }

  return client.db('cusmon')
}

