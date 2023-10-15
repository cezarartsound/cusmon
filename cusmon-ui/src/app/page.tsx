'use client'
import { Connect } from '@/components/Connect'
import { useUser } from '@/lib/hooks/session/useUser'
import { TabContext, TabList, TabPanel } from '@mui/lab'
import { Box, IconButton, Tab, TextField } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import CancelIcon from '@mui/icons-material/Cancel'
import { useEffect, useState } from 'react'
import { TableEditor } from '@/components/TableEditor'
import { CreateTable, DeleteTable } from './api/db/route'
import { AlertProvider, useAlert, useFetch } from '@/components/AlertProvider'
import { Item } from '@/components/types'
import { TableSchema, TableSettings } from './api/db/[tableName]/route'

export default function Home() {
  const [user] = useUser()
  const [tab, setTab] = useState<string>('new')
  const [loading, setLoading] = useState(false)
  const [tables, setTables] = useState<string[]>([])
  const [tablesItems, setTablesItems] = useState<Record<string, Item[]>>({})
  const [tablesSettings, setTablesSettings] = useState<Record<string, TableSettings>>({})
  const [newTable, setNewTable] = useState<string|null>(null)
  const {fetch} = useFetch()
  const {error} = useAlert()

  useEffect(() => {
    if (user.loggedIn && !tables.length) {
      fetch('/api/db')
        .then(async res => {
          if (res.ok) {
            setTables((await res.json()).tables ?? [])
          }
        })
    }
  }, [])

  const onCreateTable = () => {
    if (!newTable?.length) return 
    
    const payload: CreateTable =  {tableName: newTable}

    fetch('/api/db', {method: 'POST', body: JSON.stringify(payload)})
      .then(res => {
        if (res.ok) {
          setTables(t => [...t, newTable])
          setNewTable(null)
        }
      })
  }

  const onRefreshTable = async (tableName: string, force: boolean = false, alreadyRefreshed: string[] = []): Promise<boolean> => {
    if (alreadyRefreshed.includes(tableName)) return true

    let schema = tablesSettings[tableName]?.schema

    // Refresh settings
    if (force || !tablesSettings[tableName]) {
      const settingsRes = await fetch(`/api/db/${tableName}`)
      if (!settingsRes.ok) return false
      
      const settings = await settingsRes.json() as TableSettings
      setTablesSettings(prev => ({...prev, [tableName]: settings}))
      
      schema = settings.schema
    }

    // Refresh items
    if (force || !tablesItems[tableName]) {
      const itemsRes = await fetch(`/api/db/${tableName}/items`)
      if (!itemsRes.ok) return false

      const items = await itemsRes.json() as Item[]
      setTablesItems(i => ({...i, [tableName]: [...(i[tableName] ?? []).filter(ii => !items.some(it => ii['_id'] === it['_id'])), ...items]}))
    }

    // Refresh refereced tables
    setTimeout(() => {
      if (!schema) return
      const refTables = new Set(Object.entries(schema)
        .map(([_, s]) => s.reference?.table)
        .filter((v): v is string => !!v)
        .filter(refTable => !tablesItems[refTable]))
      Promise.all([...refTables].map(t => onRefreshTable(t, force, [...alreadyRefreshed, tableName])))
    }, 2000)

    return true
  }
    
  const onDeleteTable = (tableName: string) => async (): Promise<boolean> => {
    const payload: DeleteTable =  {tableName: tableName}
    
    if(loading) return false
    setLoading(true)

    console.log(`Deleting table ${tableName}`)

    const res = await fetch('/api/db', {method: 'DELETE', body: JSON.stringify(payload)}).finally(() => setLoading(false))
    if (res.ok) return false
    
    setTables(prev => prev.filter(tt => tt !== tableName))
    return true 
  }

  const onSaveSchema = (tableName: string) => async (schema: TableSchema): Promise<boolean> => {
    const prevSettings = tablesSettings[tableName]
    if (!prevSettings) { error('Unable to get table settings'); return false }
    const newSettings = {...prevSettings, schema}

    if (loading) return false
    setLoading(true)
    
    console.log(`Saving schema for table ${tableName}`)

    const res = await fetch(`/api/db/${tableName}`, {method: 'PUT', body: JSON.stringify(newSettings)}).finally(() => setLoading(false))
    if (!res.ok) return false

    setTablesSettings(prev => ({...prev, [tableName]: newSettings}))
    return true
  }

  const onSaveItem = (tableName: string) => async (row: Item): Promise<boolean> => {
    if (loading) return false
    setLoading(true)

    console.log(`Updating row ${row._id} of table ${tableName}`)
    
    const res = await fetch(`/api/db/${tableName}/items/${row['_id']}`, {method: 'PUT', body: JSON.stringify(row)}).finally(() => setLoading(false))
    if (!res.ok) return false

    setTablesItems(i => ({...i, [tableName]: (i[tableName] ?? []).map(r => r._id === row._id ? row : r)}))
    return true
  }

  const onSaveNewItem = (tableName: string) => async (item: Item): Promise<boolean> => {
    if (loading) return false
    setLoading(true)

    console.log(`Updating item ${item._id} of table ${tableName}`)
    
    const res = await fetch(`api/db/${tableName}/items`, {method: 'POST', body: JSON.stringify(item)}).finally(() => setLoading(false))
    if (!res.ok) return false
    
    setTablesItems(i => ({...i, [tableName]: [...(i[tableName] ?? []).filter(ii => item['_id'] !== ii['_id']), item]}))
    return true
  }

  const onSaveNewItems = (tableName: string) => async (items: Item[]): Promise<boolean> => {
    if (loading) return false
    setLoading(true)

    console.log(`Saving ${items.length} on table ${tableName}`)
    
    const res = await fetch(`api/db/${tableName}/items/bulk`, {method: 'POST', body: JSON.stringify(items)}).finally(() => setLoading(false))
    if (!res.ok) return false

    setTablesItems(i => ({...i, [tableName]: [...(i[tableName] ?? []).filter(ii => !items.some(it => ii['_id'] === it['_id'])), ...items]}))
    return true
  }

  const onDeleteItems = (tableName: string) => async (items: string[]): Promise<boolean> => {
    if (loading) return false
    setLoading(true)

    console.log(`Deleting ${items.length} on table ${tableName}`)

    const res = await Promise.all(items.map(rowId => 
      fetch(`api/db/${tableName}/items/${rowId}`, {method: 'DELETE'})
        .then(res => {
          res.ok && setTablesItems(i => ({...i, [tableName]: (i[tableName] ?? []).filter(ii => ii['_id'] !== rowId)}))
          return res.ok
        })
    )).finally(() => setLoading(false))

    return !res.some(v => !v)
  }

  return (
    <main className="flex min-h-screen flex-col justify-between p-2 gap-5 gone">
      <AlertProvider><>

        <Connect onConnected={t => {setTables(t); if (t.length) setTab(t[0])}} />

        {user.loggedIn && <>
          <hr/>
          <div className='grow flex flex-col'>
            <TabContext value={tab}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <TabList onChange={(_, t) => setTab(t)} aria-label="lab API tabs example">
                  {tables.map(t => (<Tab label={t} key={t} value={t} />))}
                  <Tab value='new' label={newTable === null
                    ? (<IconButton size='small' onClick={() => setNewTable('')}><AddIcon/></IconButton>)
                    : (
                      <div className='flex gap-2'>
                        <TextField size='small' value={newTable} onChange={(e => setNewTable(e.target.value))}/>
                        <IconButton size='small' onClick={onCreateTable}><CheckIcon/></IconButton>
                        <IconButton size='small' onClick={() => setNewTable(null)}><CancelIcon/></IconButton>
                      </div>
                    )
                  }/>
                </TabList>
              </Box>

              <TabPanel value='new'></TabPanel>

              {tables.map(t => (
                <TabPanel value={t} key={t} style={{paddingLeft: 0, paddingRight: 0}}>
                  <TableEditor 
                    tableName={t}
                    tablesItems={tablesItems}
                    tablesSettings={tablesSettings}
                    loading={loading}
                    onRefresh={onRefreshTable}
                    onDeleteItems={onDeleteItems(t)}
                    onDeleteTable={onDeleteTable(t)}
                    onSaveItem={onSaveItem(t)}
                    onSaveNewItem={onSaveNewItem(t)}
                    onSaveNewItems={onSaveNewItems(t)}
                    onSaveSchema={onSaveSchema(t)}
                  />
                </TabPanel>
              ))}

            </TabContext>
          </div>
        </>}
      </></AlertProvider>
    </main>
  )
}
