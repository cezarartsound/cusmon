'use client'
import 'react'
import 'react-data-grid/lib/styles.css'

import DataGrid, { ColumnOrColumnGroup, RenderCellProps, RenderEditCellProps, RowsChangeData, SortColumn } from 'react-data-grid'
import { DeleteTable } from '@/app/api/db/route'
import { Button, Chip, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from '@mui/material'
import { FC, useEffect, useState } from 'react'
import { FieldSchema, TableSchema, TableSettings } from '@/app/api/db/[tableName]/route'
import { TableSchemaFormModal } from './TableSchemaFormModal'
import DeleteIcon from '@mui/icons-material/Delete'
import NoteAddIcon from '@mui/icons-material/NoteAdd'
import BackupTableIcon from '@mui/icons-material/BackupTable'
import ContentPasteIcon from '@mui/icons-material/ContentPaste'
import { CellEditor } from './CellEditor'
import { NewItemFormModal } from './NewItemFormModal'
import { ImportFileModal } from './ImportFileModal'

const cellEditor = (schema: FieldSchema): FC<RenderEditCellProps<Record<string, unknown>, unknown>> => 
  (props) => <CellEditor {...props} schema={schema}/>

const cellViewer = (
  schema: FieldSchema, 
  refTablesItems: Record<string, Record<string, unknown>[]>,
): FC<RenderCellProps<Record<string, unknown>, unknown>> => ({
  row,
  column,
}) => {
  const raw = row[column.key]
  const classes = 'align-middle h-full w-full inline'

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
        return (raw as string[])?.map(val => <Chip size='small' key={val} label={val}/>)
      }
    default:
      return <Typography className={classes}>{raw?.toString()}</Typography>
  }
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
  const [items, setItems] = useState<Record<string, unknown>[]>([])
  const [selectedRows, setSelectedRows] = useState<Record<string, unknown>[]>([])
  const [refTablesItems, setRefTablesItems] = useState<Record<string, Record<string, unknown>[]>>({})
  const [tableSettings, _setTableSettings] = useState<TableSettings>({})
  const [schemaOpen, setSchemaOpen] = useState<boolean>(false)
  const [sortColumns, setSortColumns] = useState<SortColumn[]>([])
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null)
  const [addingNew, setAddingNew] = useState<boolean>(false)
  const [importingFile, setImportingFile] = useState<boolean>(false)


  const sortItems = (cols: SortColumn[]) => {
    if(cols.length) {
      setItems(i => i.sort((a, b) => {
        for (const c of cols) {
          if (a[c.columnKey] === b[c.columnKey]) continue;
          if ((a[c.columnKey]?.toString() ?? '') > (b[c.columnKey]?.toString() ?? '')) return c.direction === 'ASC' ? 1 : -1
          else return c.direction === 'ASC' ? -1 : 1
        }
        return 0
      }))
    }
    setSortColumns(cols)
  }

  const setTableSettings = (settings: TableSettings) => {
    _setTableSettings(settings)

    if (settings?.schema) {
      new Set(Object.entries(settings.schema)
        .filter(([_, s]) => s.type === 'reference')
        .map(([_, s]) => s.reference?.table ?? '')
        .filter(refTable => !Object.keys(refTablesItems).includes(refTable)))
        .forEach(refTable => fetch(`/api/db/${refTable}/items`)
          .then(async res => {if (res.ok) { const v = await res.json(); setRefTablesItems(r => ({...r, [refTable]: v}))}}))
      
      sortItems(Object.entries(settings.schema)
        .filter(([_, s]) => s.sort)
        .map(([key, s]): SortColumn => ({columnKey: key, direction: s.sort!})))
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

  const columns = tableSettings.schema && Object.entries(tableSettings.schema)
    .filter(([_, schema]) => !schema.appearance?.hide)
    .map(([fieldName, schema]): ColumnOrColumnGroup<Record<string, unknown>> => ({
      key: fieldName,
      name: schema.appearance.displayName,
      editable: schema.editable ?? false,
      renderEditCell: cellEditor(schema),
      renderCell: cellViewer(schema, refTablesItems),
      sortable: true,
    })) || []

  const onRowsChanged = (rows: Record<string, unknown>[], data: RowsChangeData<Record<string, unknown>, unknown>) => {
    setItems(rows)
    Promise.all(data.indexes.map(i => 
      fetch(`/api/db/${tableName}/items/${rows[i]['_id']}`, {method: 'PUT', body: JSON.stringify(rows[i])})
    ))
  }

  const onSaveNewItem = (item: Record<string, unknown>) => {
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

  const onSaveNewItems = (items: Record<string, unknown>[]) => {
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
    Promise.all(selectedRows.map(row => 
      fetch(`api/db/${tableName}/items/${row['_id']}`, {method: 'DELETE'})
        .then(() => setItems(i => i.filter(ii => ii['_id'] !== row['_id'])))
    )).finally(() => setLoading(false))
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
          <MenuItem disabled={!selectedRows.length || !selectedRows[0]['_id']} onClick={() => navigator.clipboard.writeText(selectedRows[0]['_id'] as any)}>
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
          <MenuItem disabled={!selectedRows.length || !selectedRows[0]['_id']} onClick={onDeleteSelected}>
            <ListItemIcon><DeleteIcon/></ListItemIcon>
            <ListItemText>Delete item(s)</ListItemText>
          </MenuItem>
          <MenuItem onClick={onDeleteTable}>
            <ListItemIcon><DeleteIcon className='text-red-600'/></ListItemIcon>
            <ListItemText className='text-red-600'>Delete table</ListItemText>
          </MenuItem>
        </Menu>
      </div>
      <div className='grow drop-shadow border border-solid border-gray-400 rounded-md min-h-[70vh]'>
        <DataGrid
          className='h-full rdg-light'
          columns={columns}
          defaultColumnOptions={{
            resizable: true,
            sortable: true,
          }}
          onCellClick={({row}) => setSelectedRows([row])}
          rows={items}
          onRowsChange={onRowsChanged}
          onSortColumnsChange={sortItems}
          sortColumns={sortColumns}
        />
      </div>
    </div>

    <TableSchemaFormModal 
      tables={allTables.filter(t => t !== tableName)}
      open={schemaOpen} 
      onClose={() => setSchemaOpen(false)} 
      value={tableSettings.schema ?? {}}
      onSave={onSaveSchema}
    />
    
    {!!tableSettings.schema && <>
      <NewItemFormModal
        tableSchema={tableSettings.schema}
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
