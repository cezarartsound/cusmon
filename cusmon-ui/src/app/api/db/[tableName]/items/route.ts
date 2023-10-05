import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '../../../connections'

export async function GET(req: NextRequest, {params}: {params: {tableName?: string}}) {
  const {tableName} = params
  if (typeof tableName !== 'string') return NextResponse.json(null, {status: 400})

  const db = await getDb(req)
  if (!db) return NextResponse.json(null, {status: 403})
  
  const values = await db.collection(tableName).find().limit(100).toArray()

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