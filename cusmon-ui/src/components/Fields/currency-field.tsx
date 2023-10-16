import { CosmonField } from "./types";
import * as decimalField from "./decimal-field";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

export const SchemaOptions: CosmonField['SchemaOptions'] = decimalField.SchemaOptions

export const Viewer: CosmonField['Viewer'] = ({value, className}) => {
  const currencyColor = (value === undefined ? '' : Number(value) > 0 ? 'text-green-600' : Number(value) < 0 ? 'text-red-600' : '')
  return <Typography className={`${className} ${currencyColor}`}>{value === undefined ? '-' : `${Number(value).toFixed(2)} €`}</Typography>  
}

export const Editor: CosmonField['Editor'] = ({label, schema, readOnly, value, onChange}) => (
  <TextField    
    type='number'
    className='w-full'
    size='small'
    label={label ?? schema.appearance.displayName}
    placeholder={schema.appearance.placeholder}
    disabled={readOnly}
    value={decimalField.parseNumberValue(value)}
    onChange={e => onChange(decimalField.parseNumberValue(e.target.value))}
    InputProps={{inputProps: {step: 0.01, min: schema.validations?.min, max: schema.validations?.max}}}
  />
)

