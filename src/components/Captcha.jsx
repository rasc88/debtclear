import { useState, useCallback } from 'react'

function generateQuestion() {
  const a = Math.floor(Math.random() * 10) + 1
  const b = Math.floor(Math.random() * 10) + 1
  const ops = ['+', '-', 'x']
  const op = ops[Math.floor(Math.random() * ops.length)]
  let answer
  if (op === '+') answer = a + b
  else if (op === '-') answer = Math.abs(a - b)
  else answer = a * b
  const displayA = op === '-' ? Math.max(a, b) : a
  const displayB = op === '-' ? Math.min(a, b) : b
  return { question: `${displayA} ${op} ${displayB}`, answer }
}

export default function Captcha({ onPass }) {
  const [{ question, answer }, setQ] = useState(generateQuestion)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    if (parseInt(input, 10) === answer) {
      onPass()
    } else {
      setError(true)
      setInput('')
      setQ(generateQuestion())
      setTimeout(() => setError(false), 2000)
    }
  }, [input, answer, onPass])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
        <div className="text-5xl mb-4">💳</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">DebtClear</h1>
        <p className="text-gray-500 text-sm mb-6">Your personal debt payoff calculator</p>

        <div className="bg-indigo-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-indigo-600 font-medium mb-2">Quick verification</p>
          <p className="text-3xl font-bold text-indigo-800">{question} = ?</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="number"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Your answer"
            autoFocus
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-center text-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          {error && (
            <p className="text-red-500 text-sm">Wrong answer — try this new one!</p>
          )}
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Enter DebtClear →
          </button>
        </form>
      </div>
    </div>
  )
}
