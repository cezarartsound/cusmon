import TextField from "@mui/material/TextField";
import { CosmonField } from "./types";
import Autocomplete from "@mui/material/Autocomplete";
import { TableSettings } from "@/app/api/db/[tableName]/route";
import { useState } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import { getField } from "./fields";

export const SchemaOptions: CosmonField['SchemaOptions'] = ({
  schema, 
  onChange, 
  tablesSettings, 
  tableSchema,
}) => {
  const [moreTablesSettings, setMoreTablesSettings] = useState<Record<string, TableSettings>>({})

  const allTablesSettings = {...tablesSettings, ...moreTablesSettings}

  const fetchTableSettings = (tableName: string) => {
    if (allTablesSettings[tableName]) return 
    setMoreTablesSettings(p => ({...p, [tableName]: {}}))

    fetch(`/api/db/${tableName}`)
      .then(async res => {
        if (res.ok) {
          const settings = await res.json()
          setMoreTablesSettings(p => ({...p, [tableName]: settings}))
        }
      })
      .catch(() => setMoreTablesSettings(({[tableName]: a, ...rest}) => rest))
  }

  const referenceColumns = Object.entries(tableSchema).filter(([_, schema]) => schema.type === 'reference')

  return (<>
    <Autocomplete
      size='small'
      className='w-full'
      options={Object.keys(allTablesSettings)}
      value={schema.reference?.table}
      onChange={(_, value) => {
        onChange({...schema, reference: value ? {table: value, fields: []} : undefined})
        value && fetchTableSettings(value)
      }}
      renderInput={(params) => <TextField {...params} label='Reference table'/>}
    />
    {!!schema.reference?.table &&
      <Autocomplete
        size='small'
        className='w-full'
        options={Object.keys(allTablesSettings[schema.reference.table]?.schema ?? {})}
        value={schema.reference?.fields?.[0]}
        onChange={(_, value) => schema.reference && onChange({...schema, reference: {...schema.reference, fields: value ? [value] : []}})}
        renderInput={(params) => <TextField {...params} label='Reference field'/>}
      />
    }
    {!!referenceColumns.length && <>
      <Autocomplete
        size='small'
        className='w-full'
        options={referenceColumns.map(([_, s]) => s.appearance.displayName)}
        placeholder='Insert the column name of type reference from where this column will be copied from'
        value={referenceColumns.find(([k]) => k === schema.import?.copyFromReference)?.[1].appearance.displayName}
        renderInput={(params) => <TextField {...params} label='Import: Copy from reference column'/>}
        onChange={(_, value) => onChange({
          ...schema, 
          import: {
            ...(schema.import??{}), 
            copyFromReference: referenceColumns.find(([_, s]) => s.appearance.displayName === value)?.[0],
          },
        })}
      />
    </>}
  </>)
}


export const Viewer: CosmonField['Viewer'] = (props) => {
  const {schema, tablesSettings} = props
  const refTableSchema = schema.reference?.table && tablesSettings[schema.reference.table]?.schema
  const refColumnSchema = refTableSchema && schema.reference?.fields?.[0] && refTableSchema[schema.reference.fields[0]]
  if (!refColumnSchema) return <CircularProgress />
  const field = getField(refColumnSchema.type)
  return <field.Viewer {...props} schema={refColumnSchema} />
}

export const Editor: CosmonField['Editor'] = (props) => {
  const {schema, tablesSettings} = props
  const refTableSchema = schema.reference?.table && tablesSettings[schema.reference.table]?.schema
  const refColumnSchema = refTableSchema && schema.reference?.fields?.[0] && refTableSchema[schema.reference.fields[0]]
  if (!refColumnSchema) return <CircularProgress />
  const field = getField(refColumnSchema.type)
  return <field.Editor {...props} schema={refColumnSchema} />
}
