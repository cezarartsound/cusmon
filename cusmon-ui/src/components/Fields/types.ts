import { FieldSchema, TableSchema, TableSettings } from "@/app/api/db/[tableName]/route";
import { FC } from "react";
import { Item } from "../types";

export interface CosmonField {
  SchemaOptions: FC<{
    schema: FieldSchema
    onChange: (schema: FieldSchema) => void
    tableSchema: TableSchema
    tablesSettings: Record<string, TableSettings>
  }>
  Editor: FC<{
    label?: string
    field: string
    schema: FieldSchema
    value: Item[0]
    onChange: (value: Item[0]) => void
    item: Item
    onItemChange: (value: Item) => void
    readOnly?: boolean
    tableSchema: TableSchema,
    tablesItems: Record<string, Item[]>
    tablesSettings: Record<string, TableSettings>
  }>
  Viewer: FC<{
    className: string
    schema: FieldSchema
    value: Item[0]
    tablesItems: Record<string, Item[]>
    tablesSettings: Record<string, TableSettings>
  }>
}
