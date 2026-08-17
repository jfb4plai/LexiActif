import { useId, cloneElement, type ReactElement, type CSSProperties } from 'react';

type FieldChildProps = {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  required?: boolean;
};

interface FormFieldProps {
  label: string;
  help?: string;
  error?: string;
  required?: boolean;
  style?: CSSProperties;
  children: ReactElement<FieldChildProps>;
}

export function FormField({ label, help, error, required, style, children }: FormFieldProps) {
  const id = useId();
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;

  const field = cloneElement(children, {
    id,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    required: required || children.props.required,
  });

  return (
    <div className="plai-field" style={style}>
      <label className="plai-label" htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {field}
      {help && (
        <p id={helpId} className="text-xs text-[var(--text3)] mt-1">
          {help}
        </p>
      )}
      {error && (
        <div id={errorId} className="plai-error mt-1" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
