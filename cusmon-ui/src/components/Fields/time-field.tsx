import { CosmonField } from "./types";
import { parseStringValue } from "./string-field";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

export const SchemaOptions: CosmonField['SchemaOptions'] = () => (<></>)

export const Viewer: CosmonField['Viewer'] = ({value, className}) => (<Typography className={className}>{value}</Typography>)

export const Editor: CosmonField['Editor'] = ({label, schema, readOnly, value, onChange}) => (
  <TextField    
    type='time'
    className='w-full'
    size='small'
    label={label ?? schema.appearance.displayName}
    placeholder={schema.appearance.placeholder}
    disabled={readOnly}
    value={parseStringValue(value)}
    onChange={e => onChange(parseStringValue(e.target.value))}
  />
)
