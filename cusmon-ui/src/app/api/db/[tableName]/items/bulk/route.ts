import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '../../../../connections'

export async function POST(req: NextRequest, {params}: {params: {tableName?: string}}) {
  const {tableName} = params
  if (typeof tableName !== 'string') return NextResponse.json(null, {status: 400})

  const data = await req.json()
  if (!Array.isArray(data)) return NextResponse.json({msg: 'Data must be array'}, {status: 400})
  if (data.some(d => typeof d['_id'] !== 'string')) return NextResponse.json({msg: 'Field _id is missing'}, {status: 400})

  const db = await getDb(req)
  if (!db) return NextResponse.json(null, {status: 403})

  db.collection(tableName).insertMany(data)

  return NextResponse.json(null, {status: 200})
}