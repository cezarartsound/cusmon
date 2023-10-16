import TextField, { TextFieldProps } from "@mui/material/TextField";
import { CosmonField } from "./types";
import { type } from "os";
import { FC } from "react";
import InputMask from 'react-input-mask'
import { Item } from "../types";
import Typography from "@mui/material/Typography";

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

export const parseStringValue = (value: Item[0]): Item[0] => {
  const unboxed = Array.isArray(value) ? value[0] : value
  return typeof unboxed === 'string' ? unboxed : unboxed?.toString()
}

export const SchemaOptions: CosmonField['SchemaOptions'] = ({schema, onChange}) => (
  <TextField 
    className='w-full' 
    size='small' 
    label='Mask (eg. 99/99/9999)' 
    value={schema.appearance?.mask} 
    onChange={e => onChange({...schema, appearance: {...schema.appearance, mask: e.target.value}})} 
  />
)

export const Viewer: CosmonField['Viewer'] = ({value, className}) => (<Typography className={className}>{value}</Typography>)

export const Editor: CosmonField['Editor'] = ({label, schema, readOnly, value, onChange}) => (
  <MaskedInput    
    type='text'
    className='w-full'
    size='small'
    label={label ?? schema.appearance.displayName}
    placeholder={schema.appearance.placeholder}
    mask={schema.appearance.mask}
    disabled={readOnly}
    value={parseStringValue(value)}
    onChange={e => onChange(parseStringValue(e.target.value))}
  />
)
