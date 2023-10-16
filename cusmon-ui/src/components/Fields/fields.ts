import { FieldSchema } from "@/app/api/db/[tableName]/route";
import { CosmonField } from "./types";
import * as stringField from "./string-field";
import * as integerField from "./integer-field";
import * as decimalField from "./decimal-field";
import * as currencyField from "./currency-field";
import * as selectField from "./select-field";
import * as referenceField from "./reference-field";
import * as copyField from "./copy-field";
import * as dateField from "./date-field";
import * as dateTimeField from "./date-time-field";
import * as timeField from "./time-field";

export const getField = (type: FieldSchema['type']): CosmonField => {
  switch (type) {
    case 'string': return stringField
    case 'integer': return integerField
    case 'decimal': return decimalField
    case 'currency': return currencyField
    case 'select': return selectField
    case 'date': return dateField
    case 'date-time': return dateTimeField
    case 'time': return timeField
    case 'reference': return referenceField
    case 'copy': return copyField
  }
}