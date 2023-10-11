'use client'
import { TableSchema, TableSettings } from '@/app/api/db/[tableName]/route'
import 'react'
import { FC, Fragment, useEffect, useState } from 'react'
import Modal from '@mui/material/Modal'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { CellEditor } from './CellEditor'
import { v4 as uuid } from 'uuid'
import { Item } from './types'

export const NewItemFormModal: FC<{
  tableSchema: TableSchema,
  refTablesData: Record<string, Item[]>
  refTablesSettings: Record<string, TableSettings>
  readOnly: boolean,
  open: boolean,
  onSave: (item: Item) => void,
  onClose: () => void,
}> = ({
  tableSchema,
  refTablesData,
  refTablesSettings,
  readOnly,
  open,
  onSave,
  onClose,
}) => {
  const [currValue, setValue] = useState<Item>({_id: uuid()})

  useEffect(() => {
    const val = {
      ...Object.fromEntries(Object.entries(tableSchema).map(([key, schema]) => [key, schema.default]).filter(([_, v]) => !!v)),
      _id: uuid(),
    }
    setValue(val)
  }, [open, tableSchema])
  
  return (
    <Modal
      open={open}
      onClose={onClose}
    >
      <Box className='absolute max-h-screen overflow-auto flex gap-5 flex-col w-5/6 h-fit p-4 inset-y-1/2 inset-x-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-md'> 
        <Typography variant='h4' color='GrayText'>New Item</Typography>
        <hr/>
        <Box className='flex gap-3 w-full flex-row mt-5 mb-5 flex-wrap'>
          {Object.entries(tableSchema).map(([key, schema]) => (<Fragment key={key}>
            <Typography>{schema.appearance.displayName}</Typography>
            <CellEditor 
              schema={schema}
              tableSchema={tableSchema} 
              field={key} 
              value={currValue[key]} 
              row={currValue} 
              refTablesData={refTablesData} 
              refTablesSettings={refTablesSettings}
              onRowChange={setValue} 
            />
          </Fragment>))}
        </Box>
        <hr/>
        <Box className='flex flex-row-reverse gap-3'>
          <Button disabled={readOnly} variant='outlined' onClick={() => onSave(currValue)}>Save</Button>
          <Button variant='outlined' color='secondary' onClick={() => onClose()}>Close</Button>
        </Box>
      </Box>
    </Modal>
  )
}