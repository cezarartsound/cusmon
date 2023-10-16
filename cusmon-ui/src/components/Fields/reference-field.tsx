import TextField from "@mui/material/TextField";
import { CosmonField } from "./types";
import Autocomplete from "@mui/material/Autocomplete";
import { TableSettings } from "@/app/api/db/[tableName]/route";
import { useMemo, useState } from "react";
import Typography from "@mui/material/Typography";
import { CircularProgress } from "@mui/material";

export const SchemaOptions: CosmonField['SchemaOptions'] = ({schema, onChange, tablesSettings}) => {
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
        multiple
        className='w-full'
        options={Object.keys(allTablesSettings[schema.reference.table]?.schema ?? {})}
        value={schema.reference?.fields}
        onChange={(_, value) => schema.reference && onChange({...schema, reference: {...schema.reference, fields: [...value ?? []]}})}
        renderInput={(params) => <TextField {...params} label='Reference fields'/>}
      />
    }
    {!!schema.reference?.table && <>
      <Autocomplete
        size='small'
        className='w-full'
        options={Object.keys(allTablesSettings[schema.reference?.table ?? '']?.schema ?? {})}
        placeholder='Insert the column name of reference table where value will be searched (regex pattern supported)'
        value={schema.import?.searchReferenceColumn}
        onChange={(_, value) => onChange({...schema, import: {...(schema.import??{}), searchReferenceColumn: value ?? undefined}})}
        renderInput={(params) => <TextField {...params} label='Import: Search regex column'/>}
      />
    </>}
  </>)
}

export const Viewer: CosmonField['Viewer'] = ({value, schema, tablesItems, className}) => {
  const refItem = value === undefined ? undefined : tablesItems[schema.reference?.table ?? '']?.find(i => i['_id'] === value)
  if (!!value && !refItem) return <CircularProgress />
  const refValues = refItem ? (schema.reference?.fields ?? []).map(field => refItem[field]?.toString()) : []
  return <Typography className={className}>{refValues.length ? refValues.join(', ') : value?.toString()}</Typography>
}

export const Editor: CosmonField['Editor'] = ({label, field, schema, tableSchema, readOnly, value, item, tablesItems, onItemChange}) => {
  const table = schema.reference?.table
  const columns = schema.reference?.fields
  
  const referenceOptionsById: Record<string, string> = useMemo(() => {
    if (!table || !columns) return {}
    return Object.fromEntries(tablesItems[table]?.map(r => [r['_id'], columns.map(c => r[c]).filter(v => !!v).join(', ')]) ?? [])
  }, [schema.reference, tablesItems])

  const referenceOptionsIds: Record<string, string> = useMemo(() => {
    return Object.fromEntries(Object.entries(referenceOptionsById).map(([k, v]) => [v, k]))
  }, [referenceOptionsById])

  const onChange = (newValue: string|undefined) => {
    let newItem = {...item, [field]: newValue}

    // Find columns which should be copied from this reference
    const dependants = Object.entries(tableSchema).filter(([_, s]) => s.import?.copyFromReference === field)

    for(let [key, schema] of dependants) {
      const refTable = schema.reference?.table
      const refField = schema.reference?.fields?.[0]
      const refRow = refTable && tablesItems[refTable]?.find(i => i._id === newValue) || undefined
      const refValue = refRow && refField && refRow[refField] || undefined
      if (refValue) newItem = {...newItem, [key]: refValue}
    }

    onItemChange(newItem)
  }

  return (<Autocomplete
    className='w-full'
    size='small'
    placeholder={schema.appearance.placeholder}
    disabled={readOnly}
    value={value ? referenceOptionsById[value as string] : undefined}
    onChange={(_, option) => onChange(option ? referenceOptionsIds[option] : undefined)}
    options={Object.values(referenceOptionsById)}
    renderInput={(params) => (
      <TextField 
        label={label ?? schema.appearance.displayName}
        placeholder={schema.appearance.placeholder}
        {...params}
    />)}
  />)
}
