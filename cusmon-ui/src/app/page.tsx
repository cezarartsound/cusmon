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
import { CreateTable } from './api/db/route'
import { AlertProvider, useFetch } from '@/components/AlertProvider'

export default function Home() {
  const [user] = useUser()
  const [tab, setTab] = useState<string>('new')
  const [tables, setTables] = useState<string[]>([])
  const [newTable, setNewTable] = useState<string|null>(null)
  const {fetch} = useFetch()

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

  return (
    <main className="flex min-h-screen flex-col justify-between p-5 gap-5 gone">
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
                    allTables={tables}
                    tableName={t} 
                    onDeleted={() => setTables(prev => prev.filter(tt => tt !== t))}
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
