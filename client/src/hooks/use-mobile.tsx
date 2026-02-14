import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(true)

  React.useEffect(() => {
    const checkIsMobile = () => {
      const result = window.innerWidth < MOBILE_BREAKPOINT
      setIsMobile(result)
    }

    // Initial check
    checkIsMobile()

    // Listen for resize
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = checkIsMobile
    mql.addEventListener("change", onChange)

    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
