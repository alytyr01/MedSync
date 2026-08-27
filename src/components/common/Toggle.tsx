interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

/* Static switch — thumb jumps instantly between positions */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        flex items-center justify-between gap-4 w-full py-3
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {(label || description) && (
        <div className="text-left">
          {label && (
            <p className="text-[15px] font-medium text-text">{label}</p>
          )}
          {description && (
            <p className="text-[13px] text-secondary mt-0.5">{description}</p>
          )}
        </div>
      )}
      <div
        className={`relative w-[52px] h-[32px] rounded-full shrink-0 ${
          checked ? 'bg-primary' : 'bg-border'
        }`}
      >
        <span
          className="absolute top-[3px] w-[26px] h-[26px] bg-white rounded-full shadow-[0_1px_3px_rgba(23,27,30,0.15)]"
          style={{ left: checked ? 'calc(100% - 29px)' : '3px' }}
        />
      </div>
    </button>
  );
}
