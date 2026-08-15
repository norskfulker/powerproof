import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Applies `data-war-room` on `<html>` for dedicated War Room routes only (not room tab switch). */
export function WarRoomThemeSync() {
  const location = useLocation()

  const active =
    location.pathname.startsWith('/war-room') ||
    location.pathname.startsWith('/playbook/')

  useEffect(() => {
    if (active) {
      document.documentElement.setAttribute('data-war-room', 'true')
    } else {
      document.documentElement.removeAttribute('data-war-room')
    }
    return () => {
      document.documentElement.removeAttribute('data-war-room')
    }
  }, [active])

  return null
}
