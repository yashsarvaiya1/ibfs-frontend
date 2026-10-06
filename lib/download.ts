/** Save an authenticated response locally, allowing browsers time to start it. */
export function downloadBlob(blob: Blob, filename: string) {
  const safeName = filename.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').slice(0, 180)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = safeName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return safeName
}
