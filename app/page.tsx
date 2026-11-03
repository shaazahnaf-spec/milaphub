import Link from 'next/link'

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)',
      fontFamily: 'sans-serif',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '400px',
        width: '100%',
        background: '#ffffff',
        padding: '32px',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e2e8f0',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '800',
          color: '#312e81',
          marginBottom: '8px',
          letterSpacing: '-0.5px'
        }}>
          Welcome to MilapHub
        </h1>
        <p style={{
          color: '#4b5563',
          fontSize: '14px',
          marginBottom: '24px',
          lineHeight: '1.5'
        }}>
          Connect, fundraise, and build communities seamlessly with Supabase & Next.js.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link
            href="/login"
            style={{
              display: 'block',
              background: '#4f46e5',
              color: '#ffffff',
              padding: '12px 20px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)',
              transition: 'background 0.2s'
            }}
          >
            Login to Account
          </Link>
          <Link
            href="/onboarding"
            style={{
              display: 'block',
              background: '#ffffff',
              color: '#4f46e5',
              padding: '12px 20px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: '600',
              border: '1px solid #c7d2fe',
              transition: 'background 0.2s'
            }}
          >
            Create Profile (Onboarding)
          </Link>
        </div>
      </div>
    </div>
  )
}
