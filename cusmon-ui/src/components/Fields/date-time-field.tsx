import { CosmonField } from "./types";
import * as dateField from "./date-field";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { parseStringValue } from "./string-field";

export const SchemaOptions: CosmonField['SchemaOptions'] = dateField.SchemaOptions

export const Viewer: CosmonField['Viewer'] = ({value, className}) => (<Typography className={className}>{value}</Typography>)

export const Editor: CosmonField['Editor'] = ({label, schema, readOnly, value, onChange}) => (
  <TextField    
    type='datetime-local'
    className='w-full'
    size='small'
    label={label ?? schema.appearance.displayName}
    placeholder={schema.appearance.placeholder}
    disabled={readOnly}
    value={parseStringValue(value)}
    onChange={e => onChange(parseStringValue(e.target.value))}
  />
)
