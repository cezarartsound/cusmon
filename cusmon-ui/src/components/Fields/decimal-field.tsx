import TextField from "@mui/material/TextField";
import { CosmonField } from "./types";
import { Item } from "../types";
import Typography from "@mui/material/Typography";

export const parseNumberValue = (value: Item[0]): Item[0] => {
  const unboxed = Array.isArray(value) ? value[0] : value
  return typeof unboxed === 'number' ? unboxed
    : typeof unboxed === 'string' ? Number(unboxed)
    : undefined
}

export const SchemaOptions: CosmonField['SchemaOptions'] = ({schema, onChange}) => (<>
  <TextField 
    className='w-full' 
    size='small' 
    label='Min' 
    type='number' 
    value={schema.validations?.min}
    InputProps={{inputProps: {step: 0.1}}}
    onChange={e => onChange({...schema, validations: {...(schema.validations??{}), min: e.target.value ? Number(e.target.value) : undefined}})}
  />
  <TextField 
    className='w-full' 
    size='small'
    label='Max' 
    type='number' 
    value={schema.validations?.max} 
    InputProps={{inputProps: {step: 0.1}}}
    onChange={e => onChange({...schema, validations: {...(schema.validations??{}), max: e.target.value ? Number(e.target.value) : undefined}})}
  />          
</>)

export const Viewer: CosmonField['Viewer'] = ({value, className}) => (<Typography className={className}>{value}</Typography>)

export const Editor: CosmonField['Editor'] = ({label, schema, readOnly, value, onChange}) => (
  <TextField    
    type='number'
    className='w-full'
    size='small'
    label={label ?? schema.appearance.displayName}
    placeholder={schema.appearance.placeholder}
    disabled={readOnly}
    value={parseNumberValue(value)}
    onChange={e => onChange(parseNumberValue(e.target.value))}
    InputProps={{inputProps: {step: 0.1, min: schema.validations?.min, max: schema.validations?.max}}}
  />
)
