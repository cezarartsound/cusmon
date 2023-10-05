import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getDb } from "../connections"

const CreateTable = z.object({
  tableName: z.string()
})

export type CreateTable = z.infer<typeof CreateTable>

export async function POST(req: NextRequest) {
  const parsed = CreateTable.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json(null, {status: 400})
  
  const db = await getDb(req)
  if (!db) return NextResponse.json(null, {status: 403})
  
  const {tableName} = parsed.data
  await db.createCollection(tableName)

  return NextResponse.json(null)
}

const DeleteTable = z.object({
  tableName: z.string()
})

export type DeleteTable = z.infer<typeof DeleteTable>

export async function DELETE(req: NextRequest) {
  const parsed = CreateTable.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json(null, {status: 400})
  
  const db = await getDb(req)
  if (!db) return NextResponse.json(null, {status: 403})
  
  const {tableName} = parsed.data
  await db.dropCollection(tableName)

  return NextResponse.json(null)
}
