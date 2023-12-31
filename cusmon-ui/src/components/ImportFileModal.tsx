'use client'
import { FieldSchema, TableSchema, TableSettings } from '@/app/api/db/[tableName]/route'
import 'react'
import { FC, Fragment, useEffect, useState } from 'react'
import Modal from '@mui/material/Modal'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import xlsx from 'node-xlsx'
import { Autocomplete, FormControlLabel, Switch, TextField } from '@mui/material'
import sha256 from 'crypto-js/sha256'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { Item } from './types'
import { v4 as uuid } from 'uuid'
import { getField } from './Fields/fields'

dayjs.extend(customParseFormat)

const findTableFirstCell = (table: any[][]): [number, number] => {
  let r = 0, c = 0
  
  // search for square 2x2 with values
  for (r = 1; r < table.length-1; r++) {
    for (c = 0; c < table[r].length-1; c++) {
      if (table[r][c] && table[r+1][c] && table[r][c+1] && table[r+1][c+1]) {
        return [r, c] 
      }
    }
  }

  
  // search for square 2x1 with values
  for (r = 1; r < table.length-1; r++) {
    for (c = 0; c < table[r].length; c++) {
      if (table[r][c] && table[r+1][c]) {
        return [r, c] 
      }
    }
  }
  
  // search for square 1x1 with values
  for (r = 1; r < table.length-1; r++) {
    for (c = 0; c < table[r].length-1; c++) {
      if (table[r][c]) {
        return [r, c] 
      }
    }
  }
    
  return [0, 0] 
}

function* getColumns(table: any[][], row: number, col: number): Generator<string> {
  for (let c = col; c < table[row].length && !!table[row][c]; c++) {
    yield table[row][c].toString()
  }
}

function* getData(table: any[][], row: number, col: number, nrCols: number): Generator<string[]> {
  for(let r = row+1 ; r < table.length ; r++) {
    const val = [...table[r]].splice(col, nrCols)
    if (!val.some(v => !!v?.toString().trim())) break;
    yield val
  }
}

const mapValue = (value: any, schema: FieldSchema, refTableData?: Item[]): string|number|undefined => {
  switch (schema.type) {
    case 'date':
    case 'date-time':
      return dayjs(value as string, schema.import?.dateFormat ?? 'DD-MM-YYYY').format('YYYY-MM-DD')
    case 'reference':
      const refColumn = schema.import?.searchReferenceColumn
      if (!refTableData || !refColumn) return undefined
      return refTableData.find(d => typeof d[refColumn] === 'string' && new RegExp(d[refColumn] as string, 'u').test(value))?.['_id'] as string
    default:
      return value as string
  }
}

function* getAndMapData(
  input: {
    table: any[][], 
    firstRow: number, 
    firstCol: number, 
    columnsNames: string[],
  },
  config: {
    tableSchema: TableSchema,
    mapping: Record<number, string[]>,
    refTablesData: Record<string, Item[]>,
    autoFill: Record<string, any>,
    advancedAutoFill: Record<string, AdvancedAutoFill|undefined>, 
  },
  maxItems: number = Infinity,
): Generator<Item> {

  const {table, firstRow, firstCol, columnsNames: columnNames} = input
  const {mapping, tableSchema, refTablesData, autoFill, advancedAutoFill} = config

  console.log('Getting data...')

  let count = 0

  for (const inputItem of getData(table, firstRow, firstCol, columnNames.length)) {
    if(++count > (maxItems ?? Infinity)) break

    const fromMapping = Object.fromEntries(Object.entries(mapping)
      .filter(([_, v]) => !!v)
      .flatMap(([k, v]) => v!.map(i => ([k, i])))
      .map(([colIndex, key]) => [key, mapValue(
        inputItem[Number(colIndex)], 
        tableSchema[key as string],
        tableSchema[key as string]?.reference?.table ? refTablesData[tableSchema[key as string]!.reference!.table!] : undefined,
      )]))

    const fromAutoFillBasic = Object.fromEntries(Object.entries(autoFill)
      .filter(([key, value]) => !!value && !Object.keys(advancedAutoFill).includes(key)))

    const fromAutoFillAdvanced = Object.fromEntries(Object.entries(advancedAutoFill)
      .filter(([_, method]) => !!method)
      .map(([key, method]) => {
        switch(method) {
          case 'InputRowHash':
            return [key, sha256(inputItem.join('#')).toString()]
          default: 
            return [key, undefined]
        }
      }))

    const value: Item = {
      _id: uuid(),
      ...fromMapping,
      ...fromAutoFillBasic,
      ...fromAutoFillAdvanced,
    }

    const fromCopy = Object.fromEntries(Object.entries(tableSchema)
      .filter(([_, s]) => s.type === 'copy' && s.import?.copyFromReference)
      .map(([k, schema]) => {
        const refTable = schema.reference?.table
        const refField = schema.reference?.fields?.[0]
        const refRow = refTable && refTablesData[refTable]
          ?.find(i => schema.import?.copyFromReference && i._id === value[schema.import.copyFromReference]) || undefined
        const refValue = refRow && refField && refRow[refField] || undefined
        return [k, refValue]
      }))

    console.log(`Processed: ${count}`)

    yield {
      ...fromCopy,
      ...value,
    }
  }
}

type AdvancedAutoFill = 'InputRowHash'
const advancedAutoFillOptions: AdvancedAutoFill[] = ['InputRowHash'] 

export const ImportFileModal: FC<{
  tableSchema: TableSchema,
  refTablesData: Record<string, Item[]>, 
  refTablesSettings: Record<string, TableSettings>,
  readOnly: boolean,
  open: boolean,
  onSave: (items: Item[]) => void,
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
  const [loading, setLoading] = useState<boolean>(false)
  const [items, setItems] = useState<Item[]>([])
  const [fileName, setFileName] = useState<string|undefined>(undefined)
  const [fileContent, setFileContent] = useState<{name: string, data: any[][]}[]>([])
  const [selectedSheet, setSelectedSheet] = useState<{name: string, data: any[][]}>()
  const [columnsFound, setColumnsFound] = useState<{names: string[], firstRow: number, firstCol: number}|undefined>()
  const [mapping, setMapping] = useState<Record<number, string[]>>({}) // file-col-offset > schema-keys
  const [autoFill, setAutoFill] = useState<Record<string, any>>({}) // schema-key > value
  const [advancedAutoFill, setAdvancedAutoFill] = useState<Record<string, AdvancedAutoFill|undefined>>({}) // schema-key > advanced-method
   

  const selectSheet = (sheetName?: string) => {
    const sheet = sheetName ? fileContent.find(s => s.name === sheetName) : undefined

    setSelectedSheet(sheet)
    setColumnsFound(undefined)
    setMapping({})
    setAutoFill({})
    setAdvancedAutoFill({'_id': 'InputRowHash'})
    setItems([])

    if (!sheet) return

    setLoading(true)

    new Promise(resolve => {
      if (sheet) { 
        const [r, c] = findTableFirstCell(sheet.data)
        const names = [...getColumns(sheet.data, r, c)]
        const newMapping = Object.fromEntries(names
          .map((columnName, columnIndex): [number, string[]] => [
            columnIndex, 
            Object.entries(tableSchema).filter(([_, s]) => s.import?.columnNames?.includes(columnName) ?? false).map(([k]) => k),
          ])
          .filter(([_, val]) => !!val.length))
        const newAutoFill = Object.fromEntries(Object.entries(tableSchema)
          .filter(([key]) => !Object.values(mapping).flat().includes(key))
          .map(([key, schema]) => [key, schema.default]))

        setColumnsFound({names, firstRow: r, firstCol: c})
        setMapping(newMapping)
        setAutoFill(newAutoFill)
      }
      resolve(true)
    })
    .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (fileContent && fileContent[0]) selectSheet(fileContent[0].name)
    else setSelectedSheet(undefined)
  }, [fileContent])

  const openFile = (file: File) => {
    setFileName(file.name)
    setLoading(true)

    file.arrayBuffer()
      .then(buffer => setFileContent(xlsx.parse(buffer)))
      .finally(() => setLoading(false))
  }

  const close = () => {
    setLoading(false)
    onClose()
  }
  
  const importData = (totalItems?: number): Promise<Item[]> => {
    if (!selectedSheet || !columnsFound) return Promise.resolve([])
    
    setLoading(true)

    return new Promise<Item[]>(resolve => {
      const {firstRow, firstCol, names: columnsNames} = columnsFound

      const data = getAndMapData(
        {
          table: selectedSheet.data,
          firstRow,
          firstCol,
          columnsNames,
        },
        {
          tableSchema,
          refTablesData,
          mapping,
          autoFill,
          advancedAutoFill,
        },
        totalItems)

      const output = [...data]

      resolve(output)
    })
    .finally(() => setLoading(false))
  }

  const testImport = () => importData(5).then(setItems)

  const importAndSave = () => {
    importData().then(newItems => onSave(newItems))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
    >
      <Box className='absolute max-h-screen overflow-auto flex gap-5 flex-col w-[95%] h-fit p-4 inset-y-1/2 inset-x-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-md'> 
        <Typography variant='h4' color='GrayText'>Import file</Typography>
        <hr/>

        <div className='flex gap-5 items-center'>
          <input
            accept=".xls,.xlsx,.csv"
            style={{ display: 'none' }}
            id="raised-button-file"
            multiple
            type="file"
            onChange={e => e.target.files && openFile(e.target.files[0])}
          />
          <label htmlFor="raised-button-file">
            <Button disabled={loading} variant="outlined" component="span">Upload</Button>
          </label>
          <Typography className='h-fit'>{fileName}</Typography>
          {loading && <CircularProgress />}
        </div>

        {!!fileContent.length && <>
          <Autocomplete 
            size='small'
            options={fileContent.map(c => c.name)}
            value={selectedSheet?.name ?? ''}
            onChange={(_, value) => selectSheet(value ?? undefined)}
            renderInput={(params) => <TextField {...params}/>}
          />
          {!!selectedSheet && !!columnsFound && <>
            <hr/>
            <Typography variant='h5'>Mapping</Typography>
            {columnsFound.names.map((columnName, colIndex) => (<div key={columnName} className='flex gap-2'>
              <div className='w-1/3'>
                <Typography>{columnName}</Typography>
                <Typography className='text-gray-400 text-ellipsis whitespace-nowrap overflow-hidden' variant='subtitle2'>
                  eg. {selectedSheet?.data[columnsFound.firstRow+1][colIndex]?.toString()}
                </Typography>
              </div>
              <Typography variant='h4'>{'>'}</Typography>
              <Autocomplete
                className='grow'
                size='small'
                multiple
                options={Object.values(tableSchema).map(s => s.appearance.displayName)}
                value={mapping[colIndex]?.map(key => tableSchema[key]?.appearance.displayName) ?? []}
                onChange={(_, displayNames) => setMapping(m => ({
                  ...m, 
                  [colIndex]: displayNames
                    .map(displayName => Object.entries(tableSchema).find(([_, s]) => displayName === s.appearance.displayName)?.at(0) as string)
                }))}
                renderInput={(params) => <TextField {...params}/>}
              />
            </div>))}
            
            <hr/>

            <Typography variant='h5'>Auto fill</Typography>
            {
              Object.entries(tableSchema)
                .filter(([key]) => !Object.values(mapping).flat().includes(key))
                .map(([key, schema]) => {
                  const field = getField(schema.type)
                  return (
                    <div key={key} className='flex gap-2'>
                      <Typography className='w-1/3'>{schema.appearance.displayName}</Typography>
                      {!advancedAutoFill[key]
                        ? <field.Editor
                            schema={schema}
                            tableSchema={tableSchema}
                            field={key}
                            value={autoFill[key]}
                            item={autoFill as Item}
                            tablesItems={refTablesData}
                            tablesSettings={refTablesSettings}
                            onChange={v => setAutoFill(a => ({...a, [key]: v}))}
                            onItemChange={v => setAutoFill(a => ({...a, [key]: v[key]}))}
                          />
                        : <Autocomplete 
                            className='w-full'
                            size='small'
                            options={advancedAutoFillOptions}
                            value={advancedAutoFill[key]}
                            onChange={(_, value) => setAdvancedAutoFill(v => ({...v, [key]: value ?? undefined}))}
                            renderInput={(params) => <TextField {...params}/>}
                          />
                      }
                      <FormControlLabel label="Advanced" control={
                        <Switch checked={!!advancedAutoFill[key]} onChange={e => setAdvancedAutoFill(a => ({...a, [key]: e.target.checked ? 'InputRowHash' : undefined}))}/>
                      }/>
                    </div>)
                  }
                )
            }

            <hr/>

            <Button disabled={readOnly || loading} variant='outlined' onClick={testImport}>Test mapping</Button>

            {!!items.length && 
              items.map(item => (
                <div key={item._id}>
                  { 
                    Object.entries(tableSchema).map(([key, schema]) => {
                      const field = getField(schema.type)
                      return (
                        <Fragment key={key}>
                          <Typography className='w-1/3'>{schema.appearance.displayName}</Typography>
                          <field.Editor 
                            readOnly={true}
                            schema={schema}
                            tableSchema={tableSchema}
                            field={key}
                            value={autoFill[key]}
                            item={autoFill as Item}
                            tablesItems={refTablesData}
                            tablesSettings={refTablesSettings}
                            onChange={v => setAutoFill(a => ({...a, [key]: v}))}
                            onItemChange={v => setAutoFill(a => ({...a, [key]: v[key]}))}
                          />
                        </Fragment>
                      )
                    })
                  } 
                </div>
              ))
            }

          </>}
        </>}

        <hr/>

        {!!items.length && <Button disabled={readOnly || loading} variant='outlined' onClick={importAndSave}>Import data into DB</Button>}

        <hr/>
        <Box className='flex flex-row-reverse gap-3'>
          <Button variant='outlined' color='secondary' onClick={close}>Close</Button>
        </Box>
      </Box>
    </Modal>
  )
}