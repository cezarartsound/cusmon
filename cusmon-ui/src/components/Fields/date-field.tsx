import TextField from "@mui/material/TextField";
import { CosmonField } from "./types";
import { parseStringValue } from "./string-field";
import Typography from "@mui/material/Typography";

export const SchemaOptions: CosmonField['SchemaOptions'] = ({schema, onChange}) => (
  <TextField 
    className='w-full' 
    size='small' 
    label='Import: Date format' 
    placeholder='YYYY-MM-DD' 
    value={schema.import?.dateFormat} 
    onChange={e => onChange({...schema, import: {...(schema.import??{}), dateFormat: e.target.value}})} 
  />
)

export const Viewer: CosmonField['Viewer'] = ({value, className}) => (<Typography className={className}>{value}</Typography>)

export const Editor: CosmonField['Editor'] = ({label, schema, readOnly, value, onChange}) => (
  <TextField    
    type='date'
    className='w-full'
    size='small'
    label={label ?? schema.appearance.displayName}
    placeholder={schema.appearance.placeholder}
    disabled={readOnly}
    value={parseStringValue(value)}
    onChange={e => onChange(parseStringValue(e.target.value))}
  />
)
