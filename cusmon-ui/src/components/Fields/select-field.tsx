import TextField from "@mui/material/TextField";
import { CosmonField } from "./types";
import Autocomplete from "@mui/material/Autocomplete";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { FieldSchema } from "@/app/api/db/[tableName]/route";
import { Item } from "../types";
import { stringToColour } from "@/lib/utils";
import Typography from "@mui/material/Typography";

const parseSelectValue = (value: Item[0], schema: FieldSchema): Item[0] => {
  const unboxed = Array.isArray(value) ? value[0] : value
  if (schema.validations?.multiple) {
    if (!value) return []
    return Array.isArray(value) ? value : [value.toString()]
  }
  return typeof unboxed === 'string' ? unboxed : unboxed?.toString()
} 

export const SchemaOptions: CosmonField['SchemaOptions'] = ({schema, onChange}) => (<>
  <Autocomplete
    size='small'
    multiple
    freeSolo
    className='w-full'
    options={[]}
    value={schema.validations?.options}
    onChange={(_, value) => onChange({...schema, validations: {...(schema.validations??{}), options: [...value ?? []]}})}
    renderInput={(params) => <TextField {...params} label='Options'/>}    
    renderTags={(value, getTagProps) =>
      value.map((v, index) => (
        <Chip
          style={stringToColour(v as string)} 
          variant='filled'
          label={v as string}
          size='small'
          {...getTagProps({ index })}
        />
      ))
    }
  />
  <FormControlLabel label="Multiple" control={
    <Switch 
      checked={schema.validations?.multiple ? true : false} 
      onChange={e => onChange({...schema, validations: {...(schema.validations??{}), multiple: e.target.checked}})}
    />
  }/>
</>)

export const Viewer: CosmonField['Viewer'] = ({value, className, schema}) => schema.validations?.multiple
  ? (value as string[])?.map(val => <Chip style={stringToColour(val)} variant='filled' size='small' key={val} label={val}/>)
  : (<Typography className={className}>{value}</Typography>)
  
export const Editor: CosmonField['Editor'] = ({label, schema, readOnly, value, onChange}) => (<Autocomplete   
  className='w-full'
  size='small'
  placeholder={schema.appearance.placeholder}
  disabled={readOnly}
  value={parseSelectValue(value, schema)}
  onChange={(_, option) => onChange(option as string[])}
  multiple={schema.validations?.multiple}
  options={schema.validations?.options ?? []}
  renderInput={(params) => (
    <TextField 
      label={label ?? schema.appearance.displayName}
      placeholder={schema.appearance.placeholder}
      {...params}
    />
  )}
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
/>)