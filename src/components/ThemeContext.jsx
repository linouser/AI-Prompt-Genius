import { createContext, useEffect } from "react"
import { useLocalStorage } from "@uidotdev/usehooks"

export const ThemeContext = createContext()

export default function ThemeProvider({ children }) {
    const [theme, setTheme] = useLocalStorage("theme", "winter")

    useEffect(() => {
        setTheme(theme)
    }, [])

    async function handleThemeChange(newTheme) {
        setTheme(newTheme)
    }

    const switchTheme = newTheme => {
        handleThemeChange(newTheme)
    }

    return <ThemeContext.Provider value={{ theme, switchTheme }}>{children}</ThemeContext.Provider>
}
