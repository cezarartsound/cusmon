import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '../../connections'
import { z } from 'zod'

const settingsTableName = '_settings'
const settingsTableId = (tableName: string) => `table#${tableName}`

const FieldType = z.enum(['string', 'select', 'decimal', 'integer', 'currency', 'date', 'time', 'date-time', 'reference', 'copy'])

const FieldSchema = z.object({
  type: FieldType,
  editable: z.boolean().optional(),
  default: z.union([z.string(), z.number(), z.null(), z.array(z.string())]).optional(),
  appearance: z.object({
    displayName: z.string(),
    placeholder: z.string().optional(),
    mask: z.string().optional(),
    hide: z.boolean().optional(),
    preferredWidth: z.number().optional(),
  }),
  validations: z.object({
    options: z.array(z.string()).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    multiple: z.boolean().optional(),
  }).optional(),
  reference: z.object({
    table: z.string(),
    fields: z.array(z.string()),
  }).optional(),
  import: z.object({
    columnNames: z.array(z.string()).optional(),
    dateFormat: z.string().optional(),
    searchReferenceColumn: z.string().optional(),
    copyFromReference: z.string().optional(),
  }).optional(),
  sort: z.enum(['ASC', 'DESC']).optional(),
})

const TableSchema = z.record(z.string(), FieldSchema)

const TableSettings = z.object({
  schema: TableSchema.optional(),
})

export type FieldType = z.infer<typeof FieldType>
export type FieldSchema = z.infer<typeof FieldSchema>
export type TableSchema = z.infer<typeof TableSchema>
export type TableSettings = z.infer<typeof TableSettings> 

type DbItem = TableSettings & {
  _id: string
}

export async function GET(req: NextRequest, {params}: {params: {tableName?: string}}) {
  const {tableName} = params
  if (typeof tableName !== 'string') return NextResponse.json(null, {status: 400})

  const db = await getDb(req)
  if (!db) return NextResponse.json(null, {status: 403})
  
  const {_id, ...value} = (await db.collection<DbItem>(settingsTableName).findOne({_id: settingsTableId(tableName)})) ?? {}

  return NextResponse.json(value, {status: 200})
}

export async function PUT(req: NextRequest, {params}: {params: {tableName?: string}}) {
  const {tableName} = params
  if (typeof tableName !== 'string') return NextResponse.json(null, {status: 400})

  const bodyParsed = TableSettings.safeParse(await req.json())
  if (!bodyParsed.success) return NextResponse.json(null, {status: 400})

  const db = await getDb(req)
  if (!db) return NextResponse.json(null, {status: 403})

  const item: DbItem = {
    ...bodyParsed.data,
    _id: settingsTableId(tableName),
  }

  await db.collection<DbItem>(settingsTableName).replaceOne({_id: item._id}, item, {upsert: true})

  return NextResponse.json(null, {status: 200})
}
