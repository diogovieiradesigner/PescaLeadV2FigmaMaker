import { useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage for saved theme
    const savedTheme = localStorage.getItem('crm-theme') as Theme;
    return savedTheme || 'dark';
  });

  useEffect(() => {
    // Apply theme to body and html
    if (theme === 'light') {
      document.body.classList.add('light-theme');
      document.documentElement.classList.remove('dark');
    } else {
      document.body.classList.remove('light-theme');
      document.documentElement.classList.add('dark');
    }

    // Save to localStorage
    localStorage.setItem('crm-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return { theme, toggleTheme, setTheme };
}
