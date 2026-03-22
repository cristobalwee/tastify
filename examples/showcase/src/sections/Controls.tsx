import type { ReactNode } from 'react';

interface ToggleProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

export function Toggle({ label, value, onChange }: ToggleProps) {
  return (
    <label className="control">
      <span className="control__label">{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

export function Select<T extends string>({ label, value, options, onChange }: SelectProps<T>) {
  return (
    <label className="control">
      <span className="control__label">{label}</span>
      <select
        className="control__select"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface NumberInputProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}

export function NumberInput({ label, value, min, max, onChange }: NumberInputProps) {
  return (
    <label className="control">
      <span className="control__label">{label}</span>
      <input
        className="control__number"
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

interface CodeBlockProps {
  children: string;
}

export function CodeBlock({ children }: CodeBlockProps) {
  return <pre className="showcase__code">{children}</pre>;
}

export function ControlPanel({ children }: { children: ReactNode }) {
  return (
    <div className="showcase__controls">
      <h4 className="showcase__controls-title">Props</h4>
      {children}
    </div>
  );
}

export function Preview({ children }: { children: ReactNode }) {
  return <div className="showcase__preview">{children}</div>;
}

export function SectionLayout({
  title,
  description,
  code,
  controls,
  children,
}: {
  title: string;
  description: string;
  code: string;
  controls: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="section">
      <div className="section__header">
        <h2 className="section__title">{title}</h2>
        <p className="section__desc">{description}</p>
      </div>
      <div className="section__content">
        <div className="section__left">
          <Preview>{children}</Preview>
          <CodeBlock>{code}</CodeBlock>
        </div>
        <div className="section__right">
          <ControlPanel>{controls}</ControlPanel>
        </div>
      </div>
    </section>
  );
}
