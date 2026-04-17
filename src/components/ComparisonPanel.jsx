import { formatCurrency, formatDate } from '../engine/formatters'

function Col({ title, months, interest, accent }) {
  return (
    <div className={`flex-1 rounded-xl p-4 ${accent ? 'bg-indigo-600 text-white' : 'bg-gray-50 border border-gray-200'}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${accent ? 'text-indigo-200' : 'text-gray-400'}`}>
        {title}
      </p>
      <div className="space-y-2">
        <div>
          <p className={`text-2xl font-bold ${accent ? 'text-white' : 'text-gray-800'}`}>
            {months} <span className="text-sm font-normal">mo</span>
          </p>
          <p className={`text-xs ${accent ? 'text-indigo-200' : 'text-gray-400'}`}>
            {formatDate(months)}
          </p>
        </div>
        <p className={`text-sm font-medium ${accent ? 'text-indigo-100' : 'text-gray-600'}`}>
          {formatCurrency(interest)} total interest
        </p>
      </div>
    </div>
  )
}

export default function ComparisonPanel({ without: wo, with: wi }) {
  if (!wo || !wi) return null

  const monthsSaved = wo.totalMonths - wi.totalMonths
  const interestSaved = wo.totalInterest - wi.totalInterest

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Loan Impact Comparison</h3>

      <div className="flex gap-3 mb-4">
        <Col title="Without loan" months={wo.totalMonths} interest={wo.totalInterest} />
        <Col title="With loan" months={wi.totalMonths} interest={wi.totalInterest} accent />
      </div>

      {(monthsSaved > 0 || interestSaved > 0) ? (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
          The loan saves you{' '}
          {monthsSaved > 0 && <strong>{monthsSaved} month{monthsSaved !== 1 ? 's' : ''}</strong>}
          {monthsSaved > 0 && interestSaved > 0 && ' and '}
          {interestSaved > 0 && <strong>{formatCurrency(interestSaved)} in interest</strong>}.
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          With these loan terms the payoff is slower or costs more interest.
          Consider a lower loan payment or higher lump sum.
        </div>
      )}
    </div>
  )
}
