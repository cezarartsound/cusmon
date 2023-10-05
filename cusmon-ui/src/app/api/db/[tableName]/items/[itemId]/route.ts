import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '../../../../connections'

export async function PUT(req: NextRequest, {params}: {params: {tableName?: string, itemId?: string}}) {
  const {tableName, itemId} = params
  if (typeof tableName !== 'string') return NextResponse.json({msg: 'PathParam tableName missing'}, {status: 400})
  if (typeof itemId !== 'string') return NextResponse.json({msg: 'PathParam itemId missing'}, {status: 400})

  const data = await req.json()
  if (typeof data['_id'] !== 'string') return NextResponse.json({msg: 'Field _id is missing'}, {status: 400})
  if (data['_id'] !== itemId) return NextResponse.json({msg: 'Field _id does not match itemId'}, {status: 400})

  const db = await getDb(req)
  if (!db) return NextResponse.json(null, {status: 403})

  db.collection(tableName).replaceOne({_id: itemId}, data)

  return NextResponse.json(null, {status: 200})
}

export async function DELETE(req: NextRequest, {params}: {params: {tableName?: string, itemId?: string}}) {
  const {tableName, itemId} = params
  if (typeof tableName !== 'string') return NextResponse.json({msg: 'PathParam tableName missing'}, {status: 400})
  if (typeof itemId !== 'string') return NextResponse.json({msg: 'PathParam itemId missing'}, {status: 400})

  const db = await getDb(req)
  if (!db) return NextResponse.json(null, {status: 403})

  db.collection(tableName).deleteOne({_id: itemId})

  return NextResponse.json(null, {status: 200})
}


