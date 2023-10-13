import { FieldSchema, TableSchema, TableSettings } from "@/app/api/db/[tableName]/route"
import { FC, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, AreaChart, PieChart, Area, Pie, ReferenceLine } from 'recharts'
import { Item } from "./types"
import { Autocomplete, FormControlLabel, Switch, TextField } from "@mui/material"
import { LineAxis } from "@mui/icons-material"

const colors = [
  "#25CCF7", 
  "#FD7272", 
  "#54a0ff", 
  "#00d2d3",
  "#1abc9c", 
  "#2ecc71", 
  "#3498db", 
  "#9b59b6", 
  "#34495e",
  "#16a085", 
  "#27ae60", 
  "#2980b9", 
  "#8e44ad", 
  "#2c3e50",
  "#f1c40f", 
  "#e67e22", 
  "#e74c3c", 
  "#ecf0f1", 
  "#95a5a6",
  "#f39c12", 
  "#d35400", 
  "#c0392b", 
  "#bdc3c7", 
  "#7f8c8d",
  "#55efc4", 
  "#81ecec", 
  "#74b9ff", 
  "#a29bfe", 
  "#dfe6e9",
  "#00b894", 
  "#00cec9", 
  "#0984e3", 
  "#6c5ce7", 
  "#ffeaa7",
  "#fab1a0", 
  "#ff7675", 
  "#fd79a8", 
  "#fdcb6e", 
  "#e17055",
  "#d63031", 
  "#feca57", 
  "#5f27cd", 
  "#54a0ff", 
  "#01a3a4"
]

const yTypes: FieldSchema['type'][] = [
  'currency',
  'decimal',
  'integer',
]

const round = (val: number): number => Math.round(val*100)/100

const aggregate = (items: Item[], key: string, aggregator: LineDef['aggregator']): number => {
  switch (aggregator) {
    case undefined:
    case 'count': return items.filter(i => !!i[key]).length
    case 'max': 
      return round(items.reduce<number>((acc, curr) => {
        const value = curr[key]
        if (typeof value !== 'number') return acc
        return value > acc ? value : acc
      }, -Infinity))
    case 'min': return round(items.reduce<number>((acc, curr) => {
        const value = curr[key]
        if (typeof value !== 'number') return acc
        return value < acc ? value : acc
      }, Infinity))
    case 'sum': return round(items.reduce<number>((acc, curr) => {
        const value = curr[key]
        if (typeof value !== 'number') return acc
        return acc + value
      }, 0))
    case 'average': 
      const {count, sum} = items.reduce<{count: number, sum: number}>((acc, curr) => {
        const value = curr[key]
        if (typeof value !== 'number') return acc
        return {count: acc.count+1, sum: acc.sum + value}
      }, {count: 0, sum: 0})
      return round(sum / count)
  }
}

interface LineDef {
  key: string, 
  aggregator?: 'sum'|'count'|'average'|'max'|'min',
}

export const Dashboard: FC<{
  items: Item[],
  tableSchema: TableSchema,
  refTablesItems: Record<string, Item[]>,
  refTablesSettings: Record<string, TableSettings>
}> = ({
  items,
  tableSchema,
  refTablesItems,
  refTablesSettings,
}) => {

  const [chartType, setChartType] = useState<'line'|'bar'|'area'>('bar')

  const [xAxis, setXAxis] = useState<string|undefined>(Object.entries(tableSchema)
    .find(([_, s]) => s.type === 'date' || s.type === 'date-time')?.[0])
  
  const [lines, setLines] = useState<LineDef[]>(Object.entries(tableSchema)
    .filter(([_, s]) => s.type === 'currency').map(([key]): LineDef => ({key, aggregator: 'sum'})).slice(0, 1))

  const [xByMonth, setXByMonth] = useState(false)

  const itemsGroupByX = items.reduce<Record<string, Item[]>>((acc, curr) => {
    if (!xAxis) return acc

    const value = ['date', 'date-time'].includes(tableSchema[xAxis].type) && xByMonth 
      ? (curr[xAxis] as string).substring(0, 7)
      : curr[xAxis]

    if (!value) return acc
    return Array.isArray(value)
      ? value.reduce((a, v) => ({...a, [v]: [...(a[v] ?? []), curr]}), acc)
      : {...acc, [value]: [...(acc[value] ?? []), curr]}
  }, {})

  const itemsLines = Object.entries(itemsGroupByX).map<Record<string, number|string>>(([x, data]) => Object.fromEntries([
    [xAxis, x],
    ...lines.map(({key, aggregator}) => [key, aggregate(data, key, aggregator)])
  ]))

  const Chart = chartType === 'bar' ? BarChart
    : chartType === 'area' ? AreaChart
    : LineChart 

  const ChartItem = chartType === 'bar' ? Bar
  : chartType === 'area' ? Area
  : Line 

  return (<>
    <ResponsiveContainer height={400} children={(
      <Chart
        data={itemsLines}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xAxis} />
        <YAxis  />
        <Tooltip />
        <Legend />
        <ReferenceLine stroke='#333' y={0}/>

        {lines.map(({key, aggregator}, i) => 
          chartType === 'bar' ? 
            <Bar 
              key={key} 
              type="monotone" 
              fill={colors[i]}
              dataKey={key} 
              unit={tableSchema[key].type === 'currency' && aggregator !== 'count' ? '€' : undefined}
              name={tableSchema[key].appearance.displayName}
            />
          : chartType === 'area' ? 
            <Area
              key={key} 
              type="monotone" 
              fill={colors[i]}
              dataKey={key} 
              unit={tableSchema[key].type === 'currency' && aggregator !== 'count' ? '€' : undefined}
              name={tableSchema[key].appearance.displayName}
            />
          : <Line 
              key={key} 
              type="monotone" 
              stroke={colors[i]}
              dataKey={key}
              unit={tableSchema[key].type === 'currency' && aggregator !== 'count' ? '€' : undefined}
              name={tableSchema[key].appearance.displayName}
            />
          )
        }
      </Chart>
    ) as any}/>

    <Autocomplete 
      size="small"
      options={['bar', 'line', 'area']}
      value={chartType}
      onChange={(_, value) => value && setChartType(value as any)}
      renderInput={params => (<TextField {...params} label={'Chart type'}/>)}
    />

    <div className="flex gap-2 flex-row w-full">
      <Autocomplete 
        className="grow"
        size="small"
        options={Object.values(tableSchema).map(s => s.appearance.displayName)}
        value={xAxis && tableSchema[xAxis].appearance.displayName || ''}
        onChange={(_, value) => value && setXAxis(Object.entries(tableSchema).find(([_, s]) => s.appearance.displayName === value)?.[0])}
        renderInput={params => (<TextField {...params} label='X axis'/>)}
      />
      {xAxis && ['date', 'date-time'].includes(tableSchema[xAxis].type) && 
        <FormControlLabel control={<Switch checked={xByMonth} onChange={e => setXByMonth(e.target.checked)}/>} label="By month" />
      }
    </div>

    {lines.map(({key, aggregator}, i) => (<div className="flex gap-2 flex-row w-full" key={i}>
      <Autocomplete 
        className="grow"
        size="small"
        options={Object.entries(tableSchema).filter(([k, s]) => yTypes.includes(s.type) && !lines.some(l => l.key === k)).map(([_, s]) => s.appearance.displayName)}
        value={tableSchema[key].appearance.displayName}
        onChange={(_, value) => {
          const key = Object.entries(tableSchema).find(([_, s]) => s.appearance.displayName === value)?.[0]
          setLines(ls => key ? ls.map((l, ii) => ii !== i ? l : {...l, key}) : ls.filter((_, ii) => ii !== i))
        }}
        renderInput={params => (<TextField {...params} label={`Line ${i+1} column`}/>)}
      />
      <Autocomplete 
        className="grow"
        size="small"
        options={['max', 'min', 'count', 'average', 'sum']}
        value={aggregator}
        onChange={(_, value) => setLines(ls => ls.map((l, ii) => ii !== i ? l : {...l, aggregator: value as LineDef['aggregator']}))}
        renderInput={params => (<TextField {...params} label={`Line ${i+1} aggregator`}/>)}
      />
    </div>))}
    
    <Autocomplete 
        size="small"
        options={Object.entries(tableSchema).filter(([k, s]) => yTypes.includes(s.type) && !lines.some(l => l.key === k)).map(([_, s]) => s.appearance.displayName)}
        value=''
        onChange={(_, value) => {
          const key = value && Object.entries(tableSchema).find(([_, s]) => s.appearance.displayName === value)?.[0]
          key && setLines(ls => [...ls, {key}])
        }}
        renderInput={params => (<TextField {...params} label={`Line ${lines.length+1} column`}/>)}
      />
  </>)
}
