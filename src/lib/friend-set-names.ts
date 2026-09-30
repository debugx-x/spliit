// Names for friend sets (hidden groups for expenses with friends outside
// groups). No server imports: also used by client components.

// "Alex", "Alex & Sam", "Priya, Alex & Sam"
export function listNames(names: string[]) {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`
}

// How a member sees the set: "You & Alex", "You, Alex & Sam"
export function friendSetTitle(otherNames: string[]) {
  return listNames(['You', ...otherNames])
}
