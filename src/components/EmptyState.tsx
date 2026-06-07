interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex h-full items-center justify-center text-sm italic text-(--text-muted)">
      {message}
    </div>
  );
}
