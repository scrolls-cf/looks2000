type SecretBinding = { get(): Promise<string> } | undefined

export async function getMatrixSharedSecret(binding: SecretBinding): Promise<string> {
  if (!binding) return ''
  try {
    const v = await binding.get()
    return typeof v === 'string' ? v.trim() : ''
  } catch {
    return ''
  }
}
