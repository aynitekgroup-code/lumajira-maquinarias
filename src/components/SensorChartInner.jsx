import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { colors } from '../styles/theme';

export default function SensorChartInner({
  data, unit, color, warningLine, criticalLine, domain,
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.borderLight} />
        <XAxis dataKey="time" tick={{ fill: colors.textMuted, fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis tick={{ fill: colors.textMuted, fontSize: 11 }} unit={unit} domain={domain || [0, 'auto']} />
        <Tooltip
          contentStyle={{
            background: colors.bgCard,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            color: colors.text,
          }}
        />
        {warningLine && (
          <ReferenceLine
            y={warningLine.value}
            stroke="#ba7517"
            strokeDasharray="4 4"
            label={{ value: warningLine.label, fill: '#ba7517', fontSize: 11 }}
          />
        )}
        {criticalLine && (
          <ReferenceLine
            y={criticalLine.value}
            stroke="#e24b4a"
            strokeDasharray="4 4"
            label={{ value: criticalLine.label, fill: '#e24b4a', fontSize: 11 }}
          />
        )}
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, fill: color }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
