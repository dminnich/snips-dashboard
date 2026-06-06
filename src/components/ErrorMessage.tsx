interface ErrorMessageProps {
  message: string
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="flex h-screen items-center justify-center bg-(--bg)">
      <div className="rounded border border-red-500 bg-red-500/10 p-4 text-red-400">
        {message}
      </div>
    </div>
  )
}
