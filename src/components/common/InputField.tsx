import React from 'react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  unit?: string;
  helper?: string;
  error?: string;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  unit,
  helper,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <label className="font-medium text-slate-700">{label}</label>
        {unit && <span className="font-mono text-slate-400">{unit}</span>}
      </div>
      <div className="relative">
        <input
          className={`w-full bg-white border rounded-lg px-3.5 py-2 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 disabled:bg-slate-50 disabled:text-slate-500 tabular-nums ${
            error ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 hover:border-slate-300'
          } ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p className="mt-1 text-xs text-rose-600">{error}</p>
      ) : helper ? (
        <p className="mt-1 text-xs text-slate-500">{helper}</p>
      ) : null}
    </div>
  );
};

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  helper?: string;
  children: React.ReactNode;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  helper,
  children,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      <label className="block text-xs font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <select
        className={`w-full bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 cursor-pointer ${className}`}
        {...props}
      >
        {children}
      </select>
      {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
    </div>
  );
};
