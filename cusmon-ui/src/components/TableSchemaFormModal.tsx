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
import { Item } from './types'
import { getField } from './Fields/fields'

type Entry = [string, FieldSchema]

const newEntry = (): TableSchema => ({
  ['new-field']: {
    type: 'string', 
    appearance: {displayName: 'New field'},
  },
})

const updateKey = (index: number, newKey: string) => (prev: TableSchema): TableSchema => Object.fromEntries(Object.entries(prev).map(([k, v], i) => i === index ? [newKey, v] : [k,v]))

const updateSchema = (index: number, fn: (schema: FieldSchema) => FieldSchema) => (prev: TableSchema): TableSchema => Object.fromEntries(
  Object.entries(prev).map<Entry>(([k, v], i) => [k, i === index ? fn(v) : v]))

const updateAppearance = (index: number, fn: (a: NonNullable<FieldSchema['appearance']>) => FieldSchema['appearance']) => (prev: TableSchema): TableSchema => Object.fromEntries(
  Object.entries(prev).map<Entry>(([k, v], i) => [k, i === index ? {...v, appearance: fn(v.appearance ?? {})} : v]))

const updateImport = (index: number, fn: (a: NonNullable<FieldSchema['import']>) => FieldSchema['import']) => (prev: TableSchema): TableSchema => Object.fromEntries(
  Object.entries(prev).map<Entry>(([k, v], i) => [k, i === index ? {...v, import: fn(v.import ?? {})} : v]))

const moveUp = (index: number) => (prev: TableSchema): TableSchema => {
  if (index <= 0) return prev 
  const v = Object.entries(prev)
  return Object.fromEntries([...v.filter((_, i) => i < index-1), v[index], v[index-1], ...v.filter((_, i) => i > index)])
}

const moveDown = (index: number) => (prev: TableSchema): TableSchema => {
  const v = Object.entries(prev)
  if (index >= v.length-1) return prev 
  return Object.fromEntries([...v.filter((_, i) => i < index), v[index+1], v[index], ...v.filter((_, i) => i > index+1)])
}

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
  {id: 'copy', label: 'Copy from reference'},
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
    case 'copy': return red[900]
  }
}

export const TableSchemaFormModal: FC<{
  tablesData: Record<string, Item[]>
  tablesSettings: Record<string, TableSettings>
  open: boolean
  value: TableSchema
  onSave: (newValue: TableSchema) => void
  onClose: () => void
}> = ({
  tablesData,
  tablesSettings,
  open,
  value,
  onSave,
  onClose,
}) => {
  const [tableSchema, setTableSchema] = useState<TableSchema>(value)
  const [openFields, setOpenFields] = useState<string[]>([])
  
  useEffect(() => setTableSchema(value), [value, open])

  return (
    <Modal
      open={open}
      onClose={onClose}
    >
      <Box className='absolute max-h-screen overflow-auto flex gap-5 flex-col w-5/6 h-fit p-4 inset-y-1/2 inset-x-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-md'> 
        <Typography variant='h4' color='GrayText'>Schema</Typography>
        <hr/>
        <List>
          {Object.entries(tableSchema).map(([key, schema], index) => {
            const field = getField(schema.type)
            return (<div key={index}>
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
                  <IconButton onClick={() => setTableSchema(moveUp(index))}><UpIcon/></IconButton>
                  <IconButton onClick={() => setTableSchema(moveDown(index))}><DownIcon/></IconButton>
                  <IconButton onClick={() => setTableSchema(v => Object.fromEntries(Object.entries(v).filter((_, i) => i !== index)))}><ClearIcon/></IconButton>
                  <TextField 
                    className='w-full' 
                    size='small' 
                    label='Field name' 
                    value={key} 
                    onChange={e => {
                      setTableSchema(updateKey(index, e.target.value))
                      setOpenFields(p => [...p.filter(v => v !== key), e.target.value])
                    }}
                  />
                  <TextField 
                    className='w-full' 
                    size='small' 
                    label='Display name' 
                    value={schema.appearance.displayName} 
                    onChange={e => setTableSchema(updateAppearance(index, a => ({...a, displayName: e.target.value})))} 
                  />
                  <Autocomplete
                    size='small'
                    className='w-full'
                    options={typeOptions}
                    value={typeOptions.find(o => o.id === schema.type)}
                    onChange={(_, value) => setTableSchema(updateSchema(index, s => ({...s, type: value?.id ?? 'string'})))}
                    renderInput={(params) => <TextField {...params} label='Type'/>}
                  />
                  <FormControlLabel label="Editable" control={<Switch 
                    checked={schema.editable ? true : false} 
                    onChange={e => setTableSchema(updateSchema(index, s => ({...s, editable: e.target.checked})))}
                  />}/>
                  <FormControlLabel label="Hide" control={<Switch 
                    checked={schema.appearance?.hide ? true : false} 
                    onChange={e => setTableSchema(updateAppearance(index, a => ({...a, hide: e.target.checked})))}
                  />}/>
                  <TextField 
                    className='w-full' 
                    size='small' 
                    label='Placeholder' 
                    value={schema.appearance?.placeholder} 
                    onChange={e => setTableSchema(updateAppearance(index, a => ({...a, placeholder: e.target.value})))} 
                  />
                  <field.Editor
                    label={'Default value'}
                    field={key}
                    item={{_id: '', [key]: schema.default}}
                    schema={schema}
                    tableSchema={tableSchema}
                    value={schema.default}
                    tablesItems={tablesData}
                    tablesSettings={tablesSettings}
                    onChange={v => setTableSchema(updateSchema(index, s => ({...s, default: v})))}
                    onItemChange={v => setTableSchema(updateSchema(index, s => ({...s, default: v[key]})))}
                  />
                  <TextField 
                    type='number' 
                    className='w-full' 
                    size='small' 
                    label='Column preferred width (px)' 
                    value={schema.appearance.preferredWidth} 
                    onChange={e => setTableSchema(updateAppearance(index, i => ({...i, preferredWidth: Number(e.target.value)})))} 
                  />
                  <Autocomplete
                    size='small'
                    className='w-full'
                    options={['ASC', 'DESC']}
                    value={schema.sort}
                    onChange={(_, value: any) => setTableSchema(updateSchema(index, r => ({...r, sort: value ?? undefined})))}
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
                    onChange={(_, value) => setTableSchema(updateImport(index, i => ({...i, columnNames: [...value]})))}
                    renderInput={(params) => <TextField {...params} label='Import: Auto mapping column names'/>}
                  />
                  <field.SchemaOptions
                    schema={schema} 
                    tableSchema={tableSchema}
                    tablesSettings={tablesSettings}
                    onChange={s => setTableSchema(updateSchema(index, () => s))}
                  />
                </Box>
              </Collapse>
            </div>)
          })}
        </List>
        <Box>
          <Button onClick={() => setTableSchema(prev => ({...prev, ...newEntry()}))}>Add field</Button>
        </Box>
        <hr/>
        <Box className='flex flex-row-reverse gap-3'>
          <Button variant='outlined' onClick={() => onSave(tableSchema)}>Save</Button>
          <Button variant='outlined' color='secondary' onClick={() => onClose()}>Close</Button>
        </Box>
      </Box>
    </Modal>
  )
}