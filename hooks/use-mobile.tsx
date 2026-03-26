import * as React from "react"

const MOBILE_BREAKPOINT = 768

function isMobileUserAgent() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT || isMobileUserAgent())
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    mql.addEventListener("change", check)
    check()
    return () => mql.removeEventListener("change", check)
  }, [])

  return !!isMobile
}
