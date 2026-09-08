// Utility function to safely parse JWT tokens
export function parseJWT(token: string) {
  try {
    if (!token || !token.includes('.')) return null;
    
    // Check if we're in the browser
    if (typeof window !== 'undefined') {
      // Browser environment - use atob
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
          })
          .join('')
      )
      return JSON.parse(jsonPayload)
    } else {
      // Server environment - use Buffer
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        Buffer.from(base64, 'base64')
          .toString('binary')
          .split('')
          .map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
          })
          .join('')
      )
      return JSON.parse(jsonPayload)
    }
  } catch (error) {
    console.error('Error parsing JWT token:', error)
    return null
  }
}

// Unified token retriever (checks localStorage and Cookies)
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  // 1. Try localStorage
  const localToken = localStorage.getItem('token');
  if (localToken) return localToken;
  
  // 2. Try Cookies
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
  if (tokenCookie) {
    return tokenCookie.split('=')[1].trim();
  }
  
  return null;
}

// Unified Logout helper
export async function logout() {
  if (typeof window === 'undefined') return;

  // 1. Clear local
  localStorage.removeItem('token');

  // 2. Clear cookie via API
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {
    console.error('Logout API failed, but local token cleared');
  }

  // 3. Disassociate this browser from the signed-out user's OneSignal
  // identity — otherwise a shared/reused device keeps getting push
  // notifications meant for whoever was logged in before.
  if ((window as any).OneSignalDeferred) {
    ;(window as any).OneSignalDeferred.push(function (OneSignal: any) {
      OneSignal.logout()
    })
  }

  // 4. Redirect
  window.location.href = '/login';
}
