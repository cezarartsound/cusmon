import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '../../../connections'
import { getTableSettings } from '../route'

export async function GET(req: NextRequest, {params}: {params: {tableName?: string}}) {
  const {tableName} = params
  if (typeof tableName !== 'string') return NextResponse.json(null, {status: 400})

  const db = await getDb(req)
  if (!db) return NextResponse.json(null, {status: 403})
  
  const schema = (await getTableSettings(db, tableName))?.schema
  if (!schema) return NextResponse.json(null, {status: 404})

  const values = await db.collection(tableName)
    .find()
    .sort(Object.fromEntries(Object.entries(schema).filter(([_, s]) => !!s.sort).map(([k, s]) => [k, s.sort === 'ASC' ? 1 : -1])))
    .limit(1000)
    .toArray()

  return NextResponse.json(values, {status: 200})
}

export async function POST(req: NextRequest, {params}: {params: {tableName?: string}}) {
  const {tableName} = params
  if (typeof tableName !== 'string') return NextResponse.json(null, {status: 400})

  const data = await req.json()
  if (typeof data['_id'] !== 'string') return NextResponse.json({msg: 'Field _id is missing'}, {status: 400})

  const db = await getDb(req)
  if (!db) return NextResponse.json(null, {status: 403})

  db.collection(tableName).insertOne(data)

  return NextResponse.json(null, {status: 200})
}