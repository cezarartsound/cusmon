import { FieldSchema } from "@/app/api/db/[tableName]/route"
import { TextFieldProps, TextField, Autocomplete } from "@mui/material"
import { FC, useLayoutEffect, useMemo, useRef } from "react"
import InputMask from 'react-input-mask'
import { Item } from "./types"
import { GridRenderEditCellParams, useGridApiContext } from "@mui/x-data-grid"
import { v4 as uuid } from 'uuid'


const MaskedInput: FC<TextFieldProps & {mask?: string}> = (props) => {
  if (!props.mask) return <TextField {...props} />
  const {mask, value, onChange, ...remmaning} = props
  return (
    <InputMask 
      value={value as any} 
      onChange={onChange} 
      mask={mask} 
      maskChar={' '}
    >
      {((inputProps: any) => <TextField {...inputProps} {...remmaning}/>) as any}
    </InputMask>

  )
}

export const CellEditor: FC<{
  field: string, 
  schema: FieldSchema,
  row: Item,
  onRowChange?: (item: Item) => void,
  refTablesData: Record<string, Item[]>,
  readOnly?: boolean, 
  label?: string,
} & Partial<GridRenderEditCellParams<Item, unknown>>> = ({
  label,
  refTablesData,
  schema,
  value,
  row,
  field,
  id,
  readOnly,
  hasFocus,
  onRowChange,
}) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- id never changes to this is safe
  const apiRef = id ? useGridApiContext() : undefined
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (hasFocus) {
      ref.current?.focus()
    }
  }, [hasFocus])

  const onChange = (newValue: string|string[]|number|undefined) => {
    apiRef?.current.setEditCellValue({ id: id!, field, value: newValue })
    onRowChange && onRowChange({...row, [field]: newValue})
  };

  const base: Partial<TextFieldProps & {mask?: string}> = { 
    className: 'w-full',
    size: 'small',
    label,
    ref,
    placeholder: schema.appearance.placeholder,
    mask: schema.appearance.mask,
    value,
    disabled: readOnly,
    onChange: e => onChange(e.target.value),
  } 

  const referenceOptionsById: Record<string, string> = useMemo(() => {
    const table = schema.reference?.table
    const columns = schema.reference?.fields
    if (!table || !columns) return {}
    return Object.fromEntries(refTablesData[table]?.map(r => [r['_id'], columns.map(c => r[c]).filter(v => !!v).join(', ')]) ?? [])
  }, [schema.reference, refTablesData])

  const referenceOptionsIds: Record<string, string> = useMemo(() => {
    return Object.fromEntries(Object.entries(referenceOptionsById).map(([k, v]) => [v, k]))
  }, [referenceOptionsById])

  switch(schema.type) {
    case 'date': 
      return (<MaskedInput 
        {...base}
        type='date'
      />)
    case 'time': 
      return (<MaskedInput 
        {...base}
        type='time'
      />)
    case 'date-time': 
      return (<MaskedInput 
        {...base}
        type='datetime-local'
      />)
    case 'integer': 
      return (<MaskedInput 
        {...base}
        type='number'
        InputProps={{inputProps: {step: 1, min: schema.validations?.min, max: schema.validations?.max}}}
      />)
    case 'decimal': 
      return (<MaskedInput 
        {...base}
        type='number'
        InputProps={{inputProps: {step: 0.1, min: schema.validations?.min, max: schema.validations?.max}}}
      />)
    case 'currency': 
      return (<MaskedInput 
        {...base}
        type='number'
        InputProps={{inputProps: {step: 0.01, min: schema.validations?.min, max: schema.validations?.max}}}
      />)
    case 'select': 
      return <Autocomplete
        className='w-full'
        size='small'
        placeholder={schema.appearance.placeholder}
        value={value as string|string[]}
        onChange={(_, option) => onChange(option as string[])}
        multiple={schema.validations?.multiple}
        options={schema.validations?.options ?? []}
        renderInput={(params) => <TextField {...params} disabled={readOnly} label={label} />}
      />
    case 'reference':
      return (<Autocomplete
        className='w-full'
        size='small'
        placeholder={schema.appearance.placeholder}
        value={value ? referenceOptionsById[value as string] : undefined}
        onChange={(_, option) => onChange(option ? referenceOptionsIds[option] : undefined)}
        options={Object.values(referenceOptionsById)}
        renderInput={(params) => <TextField {...params} disabled={readOnly} label={label} />}
      />)
    case 'string': 
      return (<MaskedInput 
        {...base}
        type='text'
      />)
  }
}
