import { FieldSchema } from "@/app/api/db/[tableName]/route"
import { TextFieldProps, TextField, Autocomplete } from "@mui/material"
import { FC } from "react"
import { RenderEditCellProps } from "react-data-grid"
import InputMask from 'react-input-mask'


const MaskedInput: FC<TextFieldProps & {mask?: string}> = (props) => {
  if (!props.mask) return <TextField {...props} />
  const {mask, value, onChange, ...remmaning} = props
  return (
    <InputMask 
      value={value as any} 
      onChange={onChange} 
      mask={mask} 
      maskChar={' '}
      children={((inputProps: any) => <TextField {...inputProps} {...remmaning}/>) as any}
    />
  )
}

export const CellEditor: FC<{schema: FieldSchema, readOnly?: boolean, label?: string} & RenderEditCellProps<Record<string, unknown>, unknown>> = ({
  label,
  schema,
  row,
  column,
  readOnly,
  onRowChange,
}) => {
  const base: Partial<TextFieldProps & {mask?: string}> = { 
    className: 'w-full',
    size: 'small',
    label,
    placeholder: schema.appearance.placeholder,
    mask: schema.appearance.mask,
    value: row[column.key],
    disabled: readOnly,
    onChange: e => onRowChange({...row, [column.key]: e.target.value}),
  } 

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
        value={row[column.key]}
        onChange={(_, value) => onRowChange({...row, [column.key]: value})}
        multiple={schema.validations?.multiple}
        options={schema.validations?.options ?? []}
        renderInput={(params) => <TextField {...params} disabled={readOnly} label={label} />}
      />
    case 'reference':
    case 'string': 
      return (<MaskedInput 
        {...base}
        type='text'
      />)
  }
}
