import { createTheme } from '@material-ui/core';
import { ThemeProvider } from '@material-ui/core/styles';
import { useEffect, useMemo, useState } from 'react';

import { isDarkMode } from '$lib/helpers';
import AppStore from '$stores/AppStore';

interface Props {
    children?: React.ReactNode;
}

/**
 * sets and provides the MUI theme for the app
 */
export default function AppThemeProvider(props: Props) {
    const [darkMode, setDarkMode] = useState(isDarkMode());

    useEffect(() => {
        const handleThemeToggle = () => {
            setDarkMode(isDarkMode());
        };

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemThemeChange = (e: MediaQueryListEvent) => {
            if (AppStore.getTheme() === 'auto') {
                setDarkMode(e.matches);
            }
        };

        AppStore.on('themeToggle', handleThemeToggle);
        mediaQuery.addEventListener('change', handleSystemThemeChange);

        return () => {
            AppStore.removeListener('themeToggle', handleThemeToggle);
            mediaQuery.removeEventListener('change', handleSystemThemeChange);
        };
    }, []);

    const theme = useMemo(() => {
        const htmlFontSize = parseInt(
            window.getComputedStyle(document.documentElement).getPropertyValue('font-size'),
            10
        );

        return createTheme({
            overrides: {
                MuiCssBaseline: {
                    '@global': {
                        a: {
                            color: darkMode ? 'dodgerblue' : 'blue',
                        },
                    },
                },
            },
            typography: {
                htmlFontSize,
                fontSize: htmlFontSize * 0.9,
            },
            palette: {
                type: darkMode ? 'dark' : 'light',
                primary: {
                    light: '#5191d6',
                    main: '#305db7',
                    dark: '#003a75',
                    contrastText: '#fff',
                },
                secondary: {
                    light: '#ffff52',
                    main: '#ffffff',
                    dark: '#c7a100',
                    contrastText: '#000',
                },
            },
            spacing: 4,
        });
    }, [darkMode]);

    return <ThemeProvider theme={theme}>{props.children}</ThemeProvider>;
}
