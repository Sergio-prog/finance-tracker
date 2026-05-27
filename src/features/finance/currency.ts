export const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
] as const

export type CurrencyCode = (typeof currencies)[number]['code']

const currencySymbols = new Map<string, string>(
  currencies.map((currency) => [currency.code, currency.symbol]),
)

export function getCurrencySymbol(currency: string) {
  return currencySymbols.get(currency.toUpperCase()) ?? currency.toUpperCase()
}
