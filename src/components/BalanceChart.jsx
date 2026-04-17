import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '../engine/formatters'

const COLORS = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#7c3aed']

const formatYAxis = (v) => {
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`
  return `$${v}`
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-600 mb-1">Month {label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.stroke }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function BalanceChart({ timeline, debts }) {
  if (!timeline?.length || !debts?.length) return null

  // Sample data for large timelines to keep chart performant (max 120 points)
  const step = Math.ceil(timeline.length / 120)
  const data = timeline
    .filter((_, i) => i % step === 0 || i === timeline.length - 1)
    .map(({ month, balances }) => {
      const point = { month }
      debts.forEach((d) => { point[d.id] = Math.max(0, Math.round(balances[d.id] * 100) / 100) })
      return point
    })

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Balance Evolution</h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            label={{ value: 'Month', position: 'insideBottom', offset: -2, fontSize: 11 }}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fontSize: 11 }}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(_, entry) => debts.find((d) => d.id === entry.dataKey)?.name ?? entry.dataKey}
          />
          {debts.map((d, i) => (
            <Line
              key={d.id}
              type="monotone"
              dataKey={d.id}
              name={d.name}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
