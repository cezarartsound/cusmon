import { useCookies } from "react-cookie"

export const useLogout = () => {
  const [_, __, removeCookie] = useCookies(['token'])

  const logout = () => {
    removeCookie('token')
  }

  return [logout]
}
