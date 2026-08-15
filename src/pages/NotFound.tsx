import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'
import { NotFoundState } from '@/components/NotFoundState'
import { DocumentColumn } from '@/components/page-shells'

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname)
  }, [location.pathname])

  return (
    <>
      <Helmet>
        <title>Page Not Found | PowerProof</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <DocumentColumn className="flex min-h-[55dvh] flex-col items-center justify-center py-16">
        <NotFoundState size="hero" message="Oops! Page not found">
          <a href="/" className="text-primary underline hover:text-primary/90">
            Return to Home
          </a>
        </NotFoundState>
      </DocumentColumn>
    </>
  )
}

export default NotFound
