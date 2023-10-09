'use client'
import 'react'
import 'react-data-grid/lib/styles.css'

import { GridColDef, GridRenderCellParams, GridRenderEditCellParams, DataGrid as DataGrid, useGridApiContext, GridSortItem } from '@mui/x-data-grid'
import { DeleteTable } from '@/app/api/db/route'
import { Button, Chip, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from '@mui/material'
import { FC, useEffect, useMemo, useState } from 'react'
import { FieldSchema, TableSchema, TableSettings } from '@/app/api/db/[tableName]/route'
import { TableSchemaFormModal } from './TableSchemaFormModal'
import DeleteIcon from '@mui/icons-material/Delete'
import NoteAddIcon from '@mui/icons-material/NoteAdd'
import BackupTableIcon from '@mui/icons-material/BackupTable'
import ContentPasteIcon from '@mui/icons-material/ContentPaste'
import RepartitionIcon from '@mui/icons-material/Repartition'
import { NewItemFormModal } from './NewItemFormModal'
import { ImportFileModal } from './ImportFileModal'
import { Item } from './types'
import { CellEditor, stringToColour } from './CellEditor'
import { GridInitialStateCommunity } from '@mui/x-data-grid/models/gridStateCommunity'
import dayjs from 'dayjs'
import { useFetch } from './AlertProvider'

const cellEditor = (
  schema: FieldSchema, 
  tables: Record<string, Item[]>,
): FC<GridRenderEditCellParams<Item, Item[0]>> => {
  const inner: FC<GridRenderEditCellParams<Item, Item[0]>> = 
    (props) => <CellEditor schema={schema} refTablesData={tables} {...props}/>
  return inner
}

const cellViewer = (
  schema: FieldSchema, 
  refTablesItems: Record<string, Item[]>,
): FC<GridRenderCellParams<Item, unknown>> => {
  const inner: FC<GridRenderCellParams<Item, unknown>> = ({
    row,
    field,
  }) => {
    const raw = row[field]
    const classes = 'align-middle h-fit w-full inline'
  
    switch (schema.type) {
      case 'currency':
        const currencyColor = (raw === undefined ? '' : Number(raw) > 0 ? 'text-green-600' : Number(raw) < 0 ? 'text-red-600' : '')
        return <Typography className={`${classes} ${currencyColor}`}>{raw === undefined ? '-' : `${Number(raw).toFixed(2)} €`}</Typography>
      case 'reference':
        const refItem = raw === undefined ? undefined : refTablesItems[schema.reference?.table ?? '']?.find(i => i['_id'] === raw)
        const refValues = refItem ? (schema.reference?.fields ?? []).map(field => refItem[field]?.toString()) : []
        return <Typography className={classes}>{refValues.length ? refValues.join(', ') : raw?.toString()}</Typography>
      case 'select': 
        if (schema.validations?.multiple) {
          return (raw as string[])?.map(val => <Chip style={stringToColour(val)} variant='filled' size='small' key={val} label={val}/>)
        }
      default:
        return <Typography className={classes}>{raw?.toString()}</Typography>
    }
  }
  return inner
}

export const TableEditor: FC<{
  tableName: string,
  allTables: string[],
  onDeleted: () => void,
  className?: string,
}> = ({
  tableName,
  allTables,
  onDeleted,
  className,
}) => {

  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [refTablesItems, setRefTablesItems] = useState<Record<string, Item[]>>({})
  const [tableSettings, _setTableSettings] = useState<TableSettings>({})
  const [schemaOpen, setSchemaOpen] = useState<boolean>(false)
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null)
  const [addingNew, setAddingNew] = useState<boolean>(false)
  const [importingFile, setImportingFile] = useState<boolean>(false)
  const {fetch} = useFetch()

  const setTableSettings = (settings: TableSettings) => {
    _setTableSettings(settings)

    if (settings?.schema) {
      new Set(Object.entries(settings.schema)
        .filter(([_, s]) => s.type === 'reference')
        .map(([_, s]) => s.reference?.table ?? '')
        .filter(refTable => !Object.keys(refTablesItems).includes(refTable)))
        .forEach(refTable => fetch(`/api/db/${refTable}/items`)
          .then(async res => {if (res.ok) { const v = await res.json(); setRefTablesItems(r => ({...r, [refTable]: v}))}}))
    }
  }

  useEffect(() => {
    fetch(`/api/db/${tableName}`)
      .then(async res => {if (res.ok) {
        const settings = await res.json() as TableSettings
        setTableSettings(settings)
      }})
    fetch(`/api/db/${tableName}/items`)
      .then(async res => {if (res.ok) setItems(await res.json())})
    
  }, [tableName])
  
  const initialGridState: GridInitialStateCommunity = useMemo(() => ({
    sorting: {
      sortModel: tableSettings.schema && Object.entries(tableSettings.schema)
        .filter(([_, s]) => s.sort)
        .map(([k, s]): GridSortItem => ({field: k, sort: s.sort === 'ASC' ? 'asc' : 'desc'})),
    },
    filter: {
      filterModel: {
        items: [{
          field: 'date',
          operator: 'startsWith',
          value: dayjs(new Date).format('YYYY-MM'),
        }],
      },
    },
  }), [tableSettings])

  const onDeleteTable = () => {
    const payload: DeleteTable =  {tableName: tableName}
    
    if(loading) return
    setLoading(true)
    fetch('/api/db', {method: 'DELETE', body: JSON.stringify(payload)})
      .then(res => {if (res.ok) onDeleted()})
      .finally(() => setLoading(false))
  }

  const onSaveSchema = (schema: TableSchema) => {
    const newSettings = {...tableSettings, schema}
    fetch(`/api/db/${tableName}`, {method: 'PUT', body: JSON.stringify(newSettings)})
      .then(res => {
        if (res.ok) {
          setTableSettings(newSettings)
          setSchemaOpen(false)
        }
      })
  }

  const onRowChanged = (row: Item) => {
    console.log(`Updating row ${row._id}`)
    setItems(i => i.map(r => r._id === row._id ? row : r))
    fetch(`/api/db/${tableName}/items/${row['_id']}`, {method: 'PUT', body: JSON.stringify(row)})
  }

  const columns = tableSettings.schema && Object.entries(tableSettings.schema)
    .filter(([_, schema]) => !schema.appearance?.hide)
    .map(([fieldName, schema]): GridColDef<Item> => ({
      field: fieldName,
      headerName: schema.appearance.displayName,
      editable: schema.editable ?? false,
      hideable: schema.appearance.hide,
      sortable: true,
      resizable: true,
      renderEditCell: cellEditor(schema, refTablesItems),
      renderCell: cellViewer(schema, refTablesItems),
      width: schema.appearance.preferredWidth ?? 150,
    })) || []
    
  const onSaveNewItem = (item: Item) => {
    setLoading(true)
    fetch(`api/db/${tableName}/items`, {method: 'POST', body: JSON.stringify(item)})
      .then(res => {
        if (res.ok) {
          setItems(i => [...i.filter(ii => item['_id'] !== ii['_id']), item])
          setAddingNew(false)
        }
      })
      .finally(() => setLoading(false))
  }

  const onSaveNewItems = (items: Item[]) => {
    setLoading(true)
    fetch(`api/db/${tableName}/items/bulk`, {method: 'POST', body: JSON.stringify(items)})
      .then(res => {
        if (res.ok) {
          setItems(i => [...i.filter(ii => !items.some(it => ii['_id'] === it['_id'])), ...items])
          setImportingFile(false)
        }
      })
      .finally(() => setLoading(false))
  }

  const onDeleteSelected = () => {
    setLoading(true)
    Promise.all(selectedRows.map(rowId => 
      fetch(`api/db/${tableName}/items/${rowId}`, {method: 'DELETE'})
        .then(() => setItems(i => i.filter(ii => ii['_id'] !== rowId)))
    )).finally(() => setLoading(false))
  }

  const onRefreshAutoColumns = () => {
    const autoColumns = Object.entries(tableSettings.schema ?? {}).filter(([_, s]) => 
      s.type === 'reference' && s.reference?.table && s.import?.columnNames?.length && s.import.searchReferenceColumn)

    if (!autoColumns) return

    items.filter(i => selectedRows.includes(i._id)).forEach(item => {
      const newAutoCols = autoColumns.map(([k, s]) => {
        if (s.type !== 'reference' || !s.reference) throw new Error('Auto column must be reference type')
        const refTableData = refTablesItems[s.reference.table]
        const refColumn = s.import?.searchReferenceColumn
        const value = s.import?.columnNames?.map(c => item[c]).find(v => v !== undefined)       
        if (!refTableData || !refColumn || typeof value !== 'string') return [k, undefined]
        const refId = refTableData.find(d => typeof d[refColumn] === 'string' && new RegExp(d[refColumn] as string, 'u').test(value))?.['_id']
        return [k, refId]
      })

      if (newAutoCols.some(([k, v]) => k && item[k] !== v)) {
        onRowChanged({...item, ...Object.fromEntries(newAutoCols)})
      }
    })
  }

  return (<>
    <div className={`flex flex-col gap-3 ${className ?? ''}`}>
      <div className='flex gap-3 flex-row-reverse'>
        <Button variant='outlined' onClick={e => setActionsMenuAnchor(e.currentTarget)}>Actions</Button>
        <Button variant='outlined' onClick={() => setSchemaOpen(true)}>Schema</Button>
        
        <Menu
          anchorEl={actionsMenuAnchor}
          open={!!actionsMenuAnchor}
          onClose={() => setActionsMenuAnchor(null)}
          onClick={() => setActionsMenuAnchor(null)}
          MenuListProps={{
            'aria-labelledby': 'basic-button',
          }}
        >
          <MenuItem disabled={!selectedRows.length || !selectedRows[0]} onClick={() => navigator.clipboard.writeText(selectedRows[0])}>
            <ListItemIcon><ContentPasteIcon/></ListItemIcon>
            <ListItemText>Copy ID</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => setAddingNew(true)}>
            <ListItemIcon><NoteAddIcon/></ListItemIcon>
            <ListItemText>Add row</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => setImportingFile(true)}>
            <ListItemIcon><BackupTableIcon/></ListItemIcon>
            <ListItemText>Import file</ListItemText>
          </MenuItem>
          <MenuItem disabled={!selectedRows.length || !selectedRows[0]} onClick={onRefreshAutoColumns}>
            <ListItemIcon><RepartitionIcon/></ListItemIcon>
            <ListItemText>Refresh auto columns</ListItemText>
          </MenuItem>
          <MenuItem disabled={!selectedRows.length || !selectedRows[0]} onClick={onDeleteSelected}>
            <ListItemIcon><DeleteIcon/></ListItemIcon>
            <ListItemText>Delete item(s)</ListItemText>
          </MenuItem>
          <MenuItem onClick={onDeleteTable}>
            <ListItemIcon><DeleteIcon className='text-red-600'/></ListItemIcon>
            <ListItemText className='text-red-600'>Delete table</ListItemText>
          </MenuItem>
        </Menu>
      </div>
      {!!columns.length && <DataGrid 
        editMode='row'
        initialState={initialGridState}
        loading={loading}
        rows={items}
        columns={columns}
        checkboxSelection
        rowSelectionModel={selectedRows}
        getRowId={item => item._id}
        onRowSelectionModelChange={e => setSelectedRows(e as string[])}
        processRowUpdate={newItem => {onRowChanged(newItem); return newItem}}
      />}
    </div>

    <TableSchemaFormModal 
      tables={allTables.filter(t => t !== tableName)}
      tablesData={refTablesItems}
      open={schemaOpen} 
      onClose={() => setSchemaOpen(false)} 
      value={tableSettings.schema ?? {}}
      onSave={onSaveSchema}
    />
    
    {!!tableSettings.schema && <>
      <NewItemFormModal
        tableSchema={tableSettings.schema}
        refTablesData={refTablesItems}
        readOnly={loading}
        open={addingNew}
        onSave={onSaveNewItem}
        onClose={() => setAddingNew(false)}
      />
      <ImportFileModal
        tableSchema={tableSettings.schema}
        refTablesData={refTablesItems}
        readOnly={loading}
        open={importingFile}
        onSave={onSaveNewItems}
        onClose={() => setImportingFile(false)}
      />
    </>}
  </>)
} 
