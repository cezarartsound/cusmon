'use client'
import { FieldSchema, FieldType, TableSchema, TableSettings } from '@/app/api/db/[tableName]/route'
import 'react'
import { FC, useEffect, useState } from 'react'
import Modal from '@mui/material/Modal'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Button from '@mui/material/Button'
import Autocomplete from '@mui/material/Autocomplete'
import Typography from '@mui/material/Typography'
import List from '@mui/material/List'
import Collapse from '@mui/material/Collapse'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import { ExpandLess, ExpandMore } from '@mui/icons-material'
import Avatar from '@mui/material/Avatar'
import { green, orange, blue, red, grey } from '@mui/material/colors'
import Tooltip from '@mui/material/Tooltip'
import { IconButton } from '@mui/material'
import UpIcon from '@mui/icons-material/ArrowUpward'
import DownIcon from '@mui/icons-material/ArrowDownward'
import ClearIcon from '@mui/icons-material/Clear'
import { CellEditor } from './CellEditor'

type Entry = [string, FieldSchema]

const newEntry = (): Entry => ['new-field', {
  type: 'string', 
  appearance: {displayName: 'New field'},
}]

const updateKey = (index: number, newKey: string) => (prev: Entry[]): Entry[] => prev.map(([k, v], i) => i === index ? [newKey, v] : [k,v])

const updateSchema = (index: number, fn: (schema: FieldSchema) => FieldSchema) => (prev: Entry[]): Entry[] => 
  prev.map<Entry>(([k, v], i) => [k, i === index ? fn(v) : v])

const updateAppearance = (index: number, fn: (a: NonNullable<FieldSchema['appearance']>) => FieldSchema['appearance']) => (prev: Entry[]): Entry[] => 
  prev.map<Entry>(([k, v], i) => [k, i === index ? {...v, appearance: fn(v.appearance ?? {})} : v])

const updateValidations = (index: number, fn: (a: NonNullable<FieldSchema['validations']>) => FieldSchema['validations']) => (prev: Entry[]): Entry[] => 
  prev.map<Entry>(([k, v], i) => [k, i === index ? {...v, validations: fn(v.validations ?? {})} : v])

const updateReference = (index: number, fn: (a: NonNullable<FieldSchema['reference']>) => FieldSchema['reference']) => (prev: Entry[]): Entry[] => 
  prev.map<Entry>(([k, v], i) => [k, i === index ? {...v, reference: fn(v.reference ?? {table: '', fields: []})} : v])

const updateImport = (index: number, fn: (a: NonNullable<FieldSchema['import']>) => FieldSchema['import']) => (prev: Entry[]): Entry[] => 
  prev.map<Entry>(([k, v], i) => [k, i === index ? {...v, import: fn(v.import ?? {})} : v])

const typeOptions: {id: FieldType, label: string}[] = [
  {id: 'string', label: 'String'},
  {id: 'select', label: 'Select'},
  {id: 'decimal', label: 'Decimal'},
  {id: 'integer', label: 'Integer'},
  {id: 'currency', label: 'Currency'},
  {id: 'date', label: 'Date'},
  {id: 'time', label: 'Time'},
  {id: 'date-time', label: 'Date Time'},
  {id: 'reference', label: 'Reference'},
]

const getTypeColor = (type: FieldType): string => {
  switch (type) {
    case 'string': return grey[600]
    case 'select': return orange[900]
    case 'date': return green[700]
    case 'time': return green[500]
    case 'date-time': return green[300]
    case 'integer': return blue[800]
    case 'decimal': return blue[600]
    case 'currency': return orange[500]
    case 'reference': return red[600]
  }
}

export const TableSchemaFormModal: FC<{
  tables: string[]
  open: boolean
  value: TableSchema
  onSave: (newValue: TableSchema) => void
  onClose: () => void
}> = ({
  tables,
  open,
  value,
  onSave,
  onClose,
}) => {
  const [currValue, setValue] = useState<Entry[]>(Object.entries(value))
  const [tablesSettings, setTablesSettings] = useState<Record<string, TableSettings>>({})
  const [openFields, setOpenFields] = useState<string[]>([])

  useEffect(() => setValue(Object.entries(value)), [value])

  const fetchTableSettings = (tableName: string) => {
    if (tablesSettings[tableName]) return 
    setTablesSettings(p => ({...p, [tableName]: {}}))

    fetch(`/api/db/${tableName}`)
      .then(async res => {
        if (res.ok) {
          const settings = await res.json()
          setTablesSettings(p => ({...p, [tableName]: settings}))
        }
      })
      .catch(() => setTablesSettings(({[tableName]: a, ...rest}) => rest))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
    >
      <Box className='absolute max-h-screen overflow-auto flex gap-5 flex-col w-5/6 h-fit p-4 inset-y-1/2 inset-x-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-md'> 
        <Typography variant='h4' color='GrayText'>Schema</Typography>
        <hr/>
        <List>
          {currValue.map(([key, schema], index) => (<div key={key}>
            <ListItemButton onClick={() => setOpenFields(p => p.includes(key) ? p.filter(v => v !== key) : [...p, key])}>
              <ListItemIcon>
                <Tooltip title={typeOptions.find(o => o.id === schema.type)?.label}>
                  <Avatar sx={{bgcolor: getTypeColor(schema.type)}}>{schema.type.substring(0, 1).toUpperCase()}</Avatar>
                </Tooltip>
              </ListItemIcon>
              <ListItemText primary={(schema.appearance.displayName) + (schema.editable ? ' (editable)' : '')} />
              {openFields.includes(key) ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={openFields.includes(key)} timeout="auto" unmountOnExit>
              <Box className='flex gap-3 w-full flex-row mt-5 mb-5 flex-wrap'>
                <IconButton onClick={() => setValue(v => [...v.filter((_, i) => i < index-1), v[index], v[index-1], ...v.filter((_, i) => i > index)])}><UpIcon/></IconButton>
                <IconButton onClick={() => setValue(v => [...v.filter((_, i) => i < index), v[index+1], v[index], ...v.filter((_, i) => i > index+1)])}><DownIcon/></IconButton>
                <IconButton onClick={() => setValue(v => v.filter((_, i) => i !== index))}><ClearIcon/></IconButton>
                <TextField className='w-full' size='small' label='Field name' value={key} onChange={e => {
                  setValue(updateKey(index, e.target.value))
                  setOpenFields(p => [...p.filter(v => v !== key), e.target.value])
                }}/>
                <TextField className='w-full' size='small' label='Display name' value={schema.appearance.displayName} onChange={e => setValue(updateAppearance(index, a => ({...a, displayName: e.target.value})))} />
                <Autocomplete
                  size='small'
                  className='w-full'
                  options={typeOptions}
                  value={typeOptions.find(o => o.id === schema.type)}
                  onChange={(_, value) => setValue(updateSchema(index, s => ({...s, type: value?.id ?? 'string'})))}
                  renderInput={(params) => <TextField {...params} label='Type'/>}
                />
                <FormControlLabel label="Editable" control={
                  <Switch checked={schema.editable ? true : false} onChange={e => setValue(updateSchema(index, s => ({...s, editable: e.target.checked})))}/>
                }/>
                <FormControlLabel label="Hide" control={
                  <Switch checked={schema.appearance?.hide ? true : false} onChange={e => setValue(updateAppearance(index, a => ({...a, hide: e.target.checked})))}/>
                }/>
                <TextField className='w-full' size='small' label='Placeholder' value={schema.appearance?.placeholder} onChange={e => setValue(updateAppearance(index, a => ({...a, placeholder: e.target.value})))} />
                <CellEditor schema={schema} row={{value: schema.default}} label='Default value' column={{key} as any} onClose={() => {}} onRowChange={({value}) => setValue(updateSchema(index, s => ({...s, default: value as string})))} />
                {['string'].includes(schema.type) && 
                  <TextField className='w-full' size='small' label='Mask (eg. 99/99/9999' value={schema.appearance?.mask} onChange={e => setValue(updateAppearance(index, a => ({...a, mask: e.target.value})))} />
                }
                {(schema.type === 'decimal' || schema.type === 'integer') && (<>
                  <TextField className='w-full' size='small' label='Min' type='number' value={schema.validations?.min} onChange={e => setValue(updateValidations(index, v => ({...v, min: e.target.value ? Number(e.target.value) : undefined})))} />
                  <TextField className='w-full' size='small' label='Max' type='number' value={schema.validations?.max} onChange={e => setValue(updateValidations(index, v => ({...v, max: e.target.value ? Number(e.target.value) : undefined})))} />
                </>)}
                {schema.type === 'select' && (<>
                  <Autocomplete
                    size='small'
                    multiple
                    freeSolo
                    className='w-full'
                    options={[]}
                    value={schema.validations?.options}
                    onChange={(_, value) => setValue(updateValidations(index, r => ({...r, options: [...value ?? []]})))}
                    renderInput={(params) => <TextField {...params} label='Options'/>}
                  />
                  <FormControlLabel label="Multiple" control={
                    <Switch checked={schema.validations?.multiple ? true : false} onChange={e => setValue(updateValidations(index, s => ({...s, multiple: e.target.checked})))}/>
                  }/>
                </>)}
                {schema.type === 'reference' && (<>
                  <Autocomplete
                    size='small'
                    className='w-full'
                    options={tables}
                    value={schema.reference?.table}
                    onChange={(_, value) => {
                      setValue(updateReference(index, r => value ? {...r, table: value} : undefined))
                      value && fetchTableSettings(value)
                    }}
                    renderInput={(params) => <TextField {...params} label='Reference table'/>}
                  />
                  {!!schema.reference?.table &&
                    <Autocomplete
                      size='small'
                      multiple
                      className='w-full'
                      options={Object.keys(tablesSettings[schema.reference.table]?.schema ?? {})}
                      value={schema.reference?.fields}
                      onChange={(_, value) => setValue(updateReference(index, r => ({...r, fields: [...value ?? []]})))}
                      renderInput={(params) => <TextField {...params} label='Reference fields'/>}
                    />
                  }
                </>)}
                <Autocomplete
                  size='small'
                  className='w-full'
                  options={['ASC', 'DESC']}
                  value={schema.sort}
                  onChange={(_, value: any) => setValue(updateSchema(index, r => ({...r, sort: value ?? undefined})))}
                  renderInput={(params) => <TextField {...params} label='Default sorting'/>}
                />
                <Autocomplete
                  size='small'
                  multiple
                  freeSolo
                  className='w-full'
                  options={[]}
                  placeholder='Insert the columns names from possiple importing file'
                  value={schema.import?.columnNames}
                  onChange={(_, value) => setValue(updateImport(index, i => ({...i, columnNames: [...value]})))}
                  renderInput={(params) => <TextField {...params} label='Import: Auto mapping column names'/>}
                />
                {(schema.type === 'date' || schema.type === 'date-time') && (
                  <TextField className='w-full' size='small' label='Import: Date format' placeholder='YYYY-MM-DD' value={schema.import?.dateFormat} onChange={e => setValue(updateImport(index, i => ({...i, dateFormat: e.target.value})))} />
                )}
                {schema.type === 'reference' && !!schema.reference?.table && <>
                  <Autocomplete
                    size='small'
                    className='w-full'
                    options={Object.keys(tablesSettings[schema.reference?.table ?? '']?.schema ?? {})}
                    placeholder='Insert the column name of reference table where value will be searched (regex pattern supported)'
                    value={schema.import?.searchReferenceColumn}
                    onChange={(_, value) => setValue(updateImport(index, r => ({...r, searchReferenceColumn: value ?? undefined})))}
                    renderInput={(params) => <TextField {...params} label='Import: Search regex column'/>}
                  />
                </>}
              </Box>
            </Collapse>
          </div>))}
        </List>
        <Box>
          <Button onClick={() => setValue(prev => [...prev, newEntry()])}>Add field</Button>
        </Box>
        <hr/>
        <Box className='flex flex-row-reverse gap-3'>
          <Button variant='outlined' onClick={() => onSave(Object.fromEntries(currValue))}>Save</Button>
          <Button variant='outlined' color='secondary' onClick={() => onClose()}>Close</Button>
        </Box>
      </Box>
    </Modal>
  )
}