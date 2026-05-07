import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  GithubAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { getFirebaseAuth, isFirebaseConfigured } from '../firebase/config'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const auth = getFirebaseAuth()
    if (!auth) {
      setLoading(false)
      return undefined
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  const signUp = useCallback(async (email, password, username) => {
    const auth = getFirebaseAuth()
    if (!auth) throw new Error('Firebase is not configured.')
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
    const name = username?.trim()
    if (name) {
      await updateProfile(cred.user, { displayName: name })
      await reload(cred.user)
    }
    setUser(cred.user)
  }, [])

  const signIn = useCallback(async (email, password) => {
    const auth = getFirebaseAuth()
    if (!auth) throw new Error('Firebase is not configured.')
    await signInWithEmailAndPassword(auth, email.trim(), password)
  }, [])

  const signOutUser = useCallback(async () => {
    const auth = getFirebaseAuth()
    if (!auth) return
    await signOut(auth)
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const auth = getFirebaseAuth()
    if (!auth) throw new Error('Firebase is not configured.')
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    await signInWithPopup(auth, provider)
  }, [])

  const signInWithGithub = useCallback(async () => {
    const auth = getFirebaseAuth()
    if (!auth) throw new Error('Firebase is not configured.')
    await signInWithPopup(auth, new GithubAuthProvider())
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      configured: isFirebaseConfigured(),
      signUp,
      signIn,
      signOutUser,
      signInWithGoogle,
      signInWithGithub,
    }),
    [user, loading, signUp, signIn, signOutUser, signInWithGoogle, signInWithGithub],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
