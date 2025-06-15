"use client";

interface Props {
  onChange: () => void;
  children?: React.ReactNode;
  checked: boolean;
}

export const Toggle = ({ onChange, checked, children }: Props) => {
  return (
    <>
      <label className="inline-flex items-center cursor-pointer gap-3">
        <input
          type="checkbox"
          onChange={onChange}
          checked={checked}
          name="disableregister"
          className="sr-only peer"
        />

        <div className="relative w-11 h-6 min-w-11 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>

        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {children}
        </span>
      </label>
    </>
  );
};
