import { useRegisterActions } from 'kbar';
import { useTheme } from 'next-themes';

const useThemeSwitching = () => {
  const { theme, setTheme } = useTheme();

  const themeActions = [
    {
      id: 'toggleDarkLight',
      name: 'Toggle Dark/Light Mode',
      shortcut: ['m', 'm'],
      section: 'Theme',
      perform: () => setTheme(theme === 'light' ? 'dark' : 'light')
    },
    {
      id: 'setLightTheme',
      name: 'Set Light Theme',
      section: 'Theme',
      perform: () => setTheme('light')
    },
    {
      id: 'setDarkTheme',
      name: 'Set Dark Theme',
      section: 'Theme',
      perform: () => setTheme('dark')
    }
  ];

  useRegisterActions(themeActions, [theme]);
};

export default useThemeSwitching;
