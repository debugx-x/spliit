import { getRequestConfig } from 'next-intl/server'

// Split Karega is English-only: the app is used by one English-speaking
// friend group. To add a language back, add its messages/<locale>.json file,
// list it here and pick the locale per request again.
export const localeLabels = {
  'en-US': 'English',
} as const

export const locales: (keyof typeof localeLabels)[] = Object.keys(
  localeLabels,
) as any
export type Locale = keyof typeof localeLabels
export type Locales = ReadonlyArray<Locale>
export const defaultLocale: Locale = 'en-US'

export default getRequestConfig(async () => ({
  locale: defaultLocale,
  messages: (await import(`../../messages/${defaultLocale}.json`)).default,
}))
