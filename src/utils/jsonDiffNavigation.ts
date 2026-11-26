/** Stable indices into the type-filtered result; query is literal JSON Pointer text. */
export function matchJsonPaths(changes: readonly { path: string }[], query: string): number[] {
  const indices: number[] = []
  for (let index = 0; index < changes.length; index++) {
    if (changes[index]!.path.includes(query)) indices.push(index)
  }
  return indices
}
