import { FieldSchema } from "@/app/api/db/[tableName]/route"
import { TextFieldProps, TextField, Autocomplete, Chip } from "@mui/material"
import { FC, useMemo } from "react"
import InputMask from 'react-input-mask'
import { Item } from "./types"
import { GridRenderEditCellParams, useGridApiContext } from "@mui/x-data-grid"
import { CSSProperties } from "@mui/material/styles/createMixins"


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

const parseValue = (value: Item[0], schema: FieldSchema): Item[0] => {
  const unboxed = Array.isArray(value) ? value[0] : value
  switch (schema.type) {
    case 'currency':
    case 'decimal':
    case 'integer':
      return typeof unboxed === 'number' ? unboxed
        : typeof unboxed === 'string' ? Number(unboxed)
        : undefined
    case 'select': 
      if (schema.validations?.multiple) {
        if (!value) return []
        return Array.isArray(value) ? value : [value.toString()]
      }
    default: 
      return typeof unboxed === 'string' ? unboxed : unboxed?.toString()
  }
} 

export const stringToColour = (str: string): Pick<CSSProperties, 'color'|'backgroundColor'> => {
  let hash = 0;
  str.split('').forEach(char => {
    hash = char.charCodeAt(0) + ((hash << 5) - hash)
  })
  const rgb = [0, 0, 0].map((_, i) => (hash >> (i * 8)) & 0xff)
  const luma = ((0.299 * rgb[0]) + (0.587 * rgb[1]) + (0.114 * rgb[2])) / 0xff;

  return {
    backgroundColor: `#${rgb.map(v => v.toString(16).padStart(2, '0')).join('')}`,
    color: luma > 0.5 ? '#000': '#FFF'
  }
}

export const CellEditor: FC<{
  field: string, 
  schema: FieldSchema,
  row: Item,
  onRowChange?: (item: Item) => void,
  refTablesData: Record<string, Item[]>,
  readOnly?: boolean, 
  label?: string,
} & Partial<GridRenderEditCellParams<Item, Item[0]>>> = ({
  label,
  refTablesData,
  schema,
  value,
  row,
  field,
  id,
  readOnly,
  onRowChange,
}) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- id never changes to this is safe
  const apiRef = id ? useGridApiContext() : undefined

  const onChange = (newValue: Item[0]) => {
    apiRef?.current.setEditCellValue({ id: id!, field, value: newValue })
    onRowChange && onRowChange({...row, [field]: newValue})
  };

  const base: Partial<Pick<TextFieldProps, 'className'|'size'|'label'|'placeholder'|'disabled'|'value'|'onChange'> & {mask?: string}> = { 
    className: 'w-full',
    size: 'small',
    label,
    placeholder: schema.appearance.placeholder,
    mask: schema.appearance.mask,
    disabled: readOnly,
    value: parseValue(value, schema),
    onChange: e => onChange(parseValue(e.target.value, schema)),
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
        {...base}
        value={parseValue(value, schema) ?? [] as any}
        onChange={(_, option) => onChange(option as string[])}
        multiple={schema.validations?.multiple}
        options={schema.validations?.options ?? []}
        renderInput={(params) => <TextField {...base} {...params} />}
        renderTags={(value, getTagProps) =>
          value.map((v, index) => (
            <Chip
              style={stringToColour(v as string)} 
              variant='filled'
              label={v}
              size='small'
              {...getTagProps({ index })}
            />
          ))
        }
      />
    case 'reference':
      return (<Autocomplete
        {...base}
        value={value ? referenceOptionsById[value as string] : undefined}
        onChange={(_, option) => onChange(option ? referenceOptionsIds[option] : undefined)}
        options={Object.values(referenceOptionsById)}
        renderInput={(params) => <TextField {...base} {...params}/>}
      />)
    case 'string': 
      return (<MaskedInput 
        {...base}
        type='text'
      />)
  }
}
