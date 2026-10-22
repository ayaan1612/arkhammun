"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { UserProfile, entryPassApi } from "./entry-pass-api"

type AuthContextType = {
  user: UserProfile | null
  token: string | null
  isLoading: boolean
  isAdmin: boolean
  login: (email?: string, password?: string, adminKey?: string, role?: "user" | "admin") => Promise<UserProfile>
  signup: (name: string, email: string, password: string, adminKey?: string, role?: "user" | "admin") => Promise<UserProfile>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = "arkham_auth_token"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function initAuth() {
      if (typeof window === "undefined") return
      const savedToken = localStorage.getItem(TOKEN_KEY)
      if (!savedToken) {
        setIsLoading(false)
        return
      }

      setToken(savedToken)
      try {
        const { user: profile } = await entryPassApi.getMe(savedToken)
        setUser(profile)
      } catch (err) {
        console.warn("Session restore failed, logging out:", err)
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  async function login(email?: string, password?: string, adminKey?: string, role?: "user" | "admin"): Promise<UserProfile> {
    const res = await entryPassApi.login({ email, password, adminKey, role })
    localStorage.setItem(TOKEN_KEY, res.token)
    setToken(res.token)
    setUser(res.user)
    return res.user
  }

  async function signup(name: string, email: string, password: string, adminKey?: string, role?: "user" | "admin"): Promise<UserProfile> {
    const res = await entryPassApi.signup({ name, email, password, adminKey, role })
    localStorage.setItem(TOKEN_KEY, res.token)
    setToken(res.token)
    setUser(res.user)
    return res.user
  }

  function logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY)
    }
    setToken(null)
    setUser(null)
  }

  async function refreshUser() {
    if (!token) return
    try {
      const { user: profile } = await entryPassApi.getMe(token)
      setUser(profile)
    } catch {
      logout()
    }
  }

  const isAdmin = user?.role === "admin"

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAdmin,
        login,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
