import { Connect, Connected } from "@/app/api/login/route"
import { useFetch } from "@/components/AlertProvider"
import { useCookies } from "react-cookie"

export const useLogin = () => {
  const [_, setCookie, removeCookie] = useCookies(['token'])
  const {fetch} = useFetch()


  const login = async (username: string, password: string, server: string, parameters?: string) => {
    const payload: Connect = {username, password, server, parameters}
    const res = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      const {token, expiry, tables} = await res.json() as Connected
      setCookie('token', token, {expires: new Date(expiry)})
      return tables
    } else {
      removeCookie('token')
    }
  }
  return [login]
}
