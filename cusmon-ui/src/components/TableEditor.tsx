'use client'
import 'react'
import 'react-data-grid/lib/styles.css'

import { GridColDef, GridRenderCellParams, GridRenderEditCellParams, DataGrid as DataGrid, GridSortItem, useGridApiContext } from '@mui/x-data-grid'
import { Button, ButtonGroup, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material'
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
import { GridInitialStateCommunity } from '@mui/x-data-grid/models/gridStateCommunity'
import { Dashboard } from './Dashboard'
import { Refresh } from '@mui/icons-material'
import { getField } from './Fields/fields'

const cellEditor = (
  schema: FieldSchema,
  tableSchema: TableSchema, 
  tablesItems: Record<string, Item[]>,
  tablesSettings: Record<string, TableSettings>
): FC<GridRenderEditCellParams<Item, Item[0]>> => {
  const inner: FC<GridRenderEditCellParams<Item, Item[0]>> = ({
    value,
    row,
    field,
    id,
    readOnly,
    onRowChange,
  }) => {
    
    // eslint-disable-next-line react-hooks/rules-of-hooks -- id never changes to this is safe
    const apiRef = id ? useGridApiContext() : undefined
  
    const fieldComp = getField(schema.type) 

    return <fieldComp.Editor 
      {...{
        field,
        schema,
        tableSchema,
        readOnly,
        value,
        onChange: v => {
          apiRef?.current.setEditCellValue({ id: id!, field, value: v })
          onRowChange && onRowChange({...row, [field]: v})
        },
        item: row,
        onItemChange: v => {
          apiRef?.current.setEditCellValue({ id: id!, field, value: v[field] })
          onRowChange && onRowChange(v)
        },
        tablesItems,
        tablesSettings,
      }}
    />
  }
  return inner
}

const cellViewer = (
  schema: FieldSchema, 
  tablesItems: Record<string, Item[]>,
  tablesSettings: Record<string, TableSettings>,
): FC<GridRenderCellParams<Item, unknown>> => {
  
  const inner: FC<GridRenderCellParams<Item, unknown>> = ({
    row,
    field,
  }) => {
    const fieldComp = getField(schema.type)

    return <fieldComp.Viewer
      className='align-middle h-fit w-full inline'
      schema={schema}
      value={row[field]}
      tablesItems={tablesItems}
      tablesSettings={tablesSettings}
    />
  }
  return inner
}

export const TableEditor: FC<{
  className?: string,
  tableName: string,
  tablesItems: Record<string, Item[]>,
  tablesSettings: Record<string, TableSettings>,
  loading: boolean,
  onRefresh: (tableName: string, force?: boolean) => Promise<boolean>,
  onSaveSchema: (schema: TableSchema) => Promise<boolean>,
  onSaveItem: (item: Item) => Promise<boolean>
  onSaveNewItem: (item: Item) => Promise<boolean>,
  onSaveNewItems: (items: Item[]) => Promise<boolean>,
  onDeleteItems: (ids: string[]) => Promise<boolean>,
  onDeleteTable: () => Promise<boolean>,
}> = ({
  className,
  tableName,
  tablesItems,
  tablesSettings,
  loading,
  onRefresh,
  onSaveSchema,
  onSaveItem,
  onSaveNewItem,
  onSaveNewItems,
  onDeleteItems,
  onDeleteTable,
}) => {

  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [schemaOpen, setSchemaOpen] = useState<boolean>(false)
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null)
  const [addingNew, setAddingNew] = useState<boolean>(false)
  const [importingFile, setImportingFile] = useState<boolean>(false)
  const [view, setView] = useState<'charts'|'table'>('table')

  const items = tablesItems[tableName] ?? []
  const tableSchema = tablesSettings[tableName]?.schema ?? {}

  useEffect(() => {onRefresh(tableName)}, [])
  
  const initialGridState: GridInitialStateCommunity = useMemo(() => ({
    sorting: {
      sortModel: Object.entries(tableSchema)
        .filter(([_, s]) => s.sort)
        .map(([k, s]): GridSortItem => ({field: k, sort: s.sort === 'ASC' ? 'asc' : 'desc'})),
    },
    pagination: {
      paginationModel: {
        page: 0,
        pageSize: 50,
      },
    },
    // filter: {
    //   filterModel: {
    //     items: [{
    //       field: 'date',
    //       operator: 'startsWith',
    //       value: dayjs(new Date).format('YYYY-MM'),
    //     }],
    //   },
    // },
  }), [tableSchema])

  const columns = Object.entries(tableSchema)
    .filter(([_, schema]) => !schema.appearance?.hide)
    .map(([fieldName, schema]): GridColDef<Item> => ({
      field: fieldName,
      headerName: schema.appearance.displayName,
      editable: schema.editable ?? false,
      hideable: schema.appearance.hide,
      sortable: true,
      resizable: true,
      renderEditCell: cellEditor(schema, tableSchema, tablesItems, tablesSettings),
      renderCell: cellViewer(schema, tablesItems, tablesSettings),
      width: schema.appearance.preferredWidth ?? 150,
    })) || []

  const onRefreshAutoColumns = () => {
    const autoColumns = Object.entries(tableSchema ?? {}).filter(([_, s]) => 
      s.type === 'reference' && s.reference?.table && s.import?.columnNames?.length && s.import.searchReferenceColumn)

    if (!autoColumns) return

    items.filter(i => selectedRows.includes(i._id)).forEach(item => {
      
      const refCols = Object.fromEntries(autoColumns.map<[string, keyof Item|undefined]>(([k, s]) => {
        if (s.type !== 'reference' || !s.reference) throw new Error('Auto column must be reference type')
        const refTableData = tablesItems[s.reference.table]
        const refColumn = s.import?.searchReferenceColumn
        const value = s.import?.columnNames?.map(c => item[c]).find(v => v !== undefined)       
        if (!refTableData || !refColumn || typeof value !== 'string') return [k, undefined]
        const refId = refTableData.find(d => typeof d[refColumn] === 'string' && new RegExp(d[refColumn] as string, 'u').test(value))?.['_id']
        return [k, refId]
      }).filter(([k, v]) => !!v && item[k] !== v))
      
      const itemWithNewRefCols = {...item, ...refCols}

      const fromCopy = Object.fromEntries(Object.entries(tableSchema)
        .filter(([_, s]) => s.type === 'copy' && s.import?.copyFromReference)
        .map(([k, schema]) => {
          const refTable = schema.reference?.table
          const refField = schema.reference?.fields?.[0]
          const refRow = refTable && tablesItems[refTable]
            ?.find(i => schema.import?.copyFromReference && i._id === itemWithNewRefCols[schema.import.copyFromReference]) || undefined
          const refValue = refRow && refField && refRow[refField] || undefined
          return [k, refValue]
        }))

      if (Object.keys(refCols).length || Object.keys(fromCopy).length) {
        onSaveItem({...item, ...fromCopy, ...refCols})
      }
    })
  }
  
  const onDeleteSelected = () => selectedRows.length && onDeleteItems(selectedRows)

  return (<>
    <div className={`flex flex-col gap-3 ${className ?? ''}`}>
      <div className='flex gap-3 flex-row-reverse'>
        <Button variant='outlined' onClick={e => setActionsMenuAnchor(e.currentTarget)}>Actions</Button>
        <Button variant='outlined' onClick={() => setSchemaOpen(true)}>Schema</Button>
        <Button variant='outlined' onClick={() => onRefresh(tableName, true)}><Refresh/></Button>
        <ButtonGroup>
          <Button variant={view === 'charts' ? 'contained' : 'outlined'} onClick={() => setView('charts')}>Charts</Button>
          <Button variant={view === 'table' ? 'contained' : 'outlined'} onClick={() => setView('table')}>Table</Button>
        </ButtonGroup>
        
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
      {view === 'table' && !!columns.length && <div className='min-h-[500px]'>
        <DataGrid 
          editMode='row'
          rowHeight={30}
          initialState={initialGridState}
          loading={loading}
          rows={items}
          columns={columns}
          checkboxSelection
          rowSelectionModel={selectedRows}
          getRowId={item => item._id}
          onRowSelectionModelChange={e => setSelectedRows(e as string[])}
          processRowUpdate={newItem => {onSaveItem(newItem); return newItem}}
        />
      </div>}
      {view === 'charts' && 
        <Dashboard 
          items={items} 
          tableSchema={tableSchema} 
          refTablesItems={tablesItems} 
          refTablesSettings={tablesSettings} 
        />
      }
    </div>

    <TableSchemaFormModal 
      tablesData={tablesItems}
      tablesSettings={tablesSettings}
      open={schemaOpen} 
      onClose={() => setSchemaOpen(false)} 
      value={tableSchema}
      onSave={(schema) => onSaveSchema(schema).then(res => res && setSchemaOpen(false))}
    />
  
    <NewItemFormModal
      tableSchema={tableSchema}
      refTablesData={tablesItems}
      refTablesSettings={tablesSettings}
      readOnly={loading}
      open={addingNew}
      onSave={(item) => onSaveNewItem(item).then(res => res && setAddingNew(false))}
      onClose={() => setAddingNew(false)}
    />

    <ImportFileModal
      tableSchema={tableSchema}
      refTablesData={tablesItems}
      refTablesSettings={tablesSettings}
      readOnly={loading}
      open={importingFile}
      onSave={items => onSaveNewItems(items).then(res => res && setImportingFile(false))}
      onClose={() => setImportingFile(false)}
    />
  </>)
} 
