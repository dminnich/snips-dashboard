export function LoadingSpinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-(--bg)">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-(--border-light) border-t-white" />
    </div>
  )
}
