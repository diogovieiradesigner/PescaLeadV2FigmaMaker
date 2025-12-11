import { Toaster as Sonner, ToasterProps } from "sonner@2.0.3";
import { useTheme } from "../../hooks/useTheme";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Sonner
      theme={isDark ? "dark" : "light"}
      className="toaster group"
      position="bottom-right"
      richColors
      expand={false}
      visibleToasts={4}
      toastOptions={{
        classNames: {
          toast: isDark 
            ? 'group toast group-[.toaster]:bg-[#1A1A1A] group-[.toaster]:text-white group-[.toaster]:border-white/10 group-[.toaster]:shadow-lg'
            : 'group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-900 group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg',
          description: isDark ? 'group-[.toast]:text-white/60' : 'group-[.toast]:text-gray-500',
          actionButton: isDark
            ? 'group-[.toast]:bg-[#0169D9] group-[.toast]:text-white'
            : 'group-[.toast]:bg-[#0169D9] group-[.toast]:text-white',
          cancelButton: isDark
            ? 'group-[.toast]:bg-white/10 group-[.toast]:text-white/60'
            : 'group-[.toast]:bg-gray-100 group-[.toast]:text-gray-600',
          error: isDark
            ? 'group-[.toaster]:bg-red-950/90 group-[.toaster]:text-red-200 group-[.toaster]:border-red-900'
            : 'group-[.toaster]:bg-red-50 group-[.toaster]:text-red-900 group-[.toaster]:border-red-200',
          success: isDark
            ? 'group-[.toaster]:bg-green-950/90 group-[.toaster]:text-green-200 group-[.toaster]:border-green-900'
            : 'group-[.toaster]:bg-green-50 group-[.toaster]:text-green-900 group-[.toaster]:border-green-200',
          warning: isDark
            ? 'group-[.toaster]:bg-yellow-950/90 group-[.toaster]:text-yellow-200 group-[.toaster]:border-yellow-900'
            : 'group-[.toaster]:bg-yellow-50 group-[.toaster]:text-yellow-900 group-[.toaster]:border-yellow-200',
          info: isDark
            ? 'group-[.toaster]:bg-blue-950/90 group-[.toaster]:text-blue-200 group-[.toaster]:border-blue-900'
            : 'group-[.toaster]:bg-blue-50 group-[.toaster]:text-blue-900 group-[.toaster]:border-blue-200',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
