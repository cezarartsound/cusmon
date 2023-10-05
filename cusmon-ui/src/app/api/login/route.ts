import { NextResponse, NextRequest } from 'next/server'
import z from 'zod'
import { ConnectData, addConnection, getDb, removeConnection } from '../connections'

const TOKEN_EXPIRY_SEC = 1*60*60 // 1 hour

export interface Connected {
  token: string
  expiry: number
  tables: string[]
}

export async function POST(req: NextRequest) {
  const parsed = ConnectData.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json(null, {status: 400})

  const expiry = +new Date + TOKEN_EXPIRY_SEC*1000

  const token = await addConnection(parsed.data, expiry)

  const prevToken = req.cookies.get('token')?.value
  if (prevToken) removeConnection(prevToken)
  req.cookies.set('token', token)

  const db = await getDb(req)

  const collections = (await db?.collections())?.map(c => c.collectionName) ?? []

  const filtered = collections.filter(t => !t.startsWith('_'))

  const response: Connected = { token, expiry, tables: filtered }
  return NextResponse.json(response, { status: 200 })
}