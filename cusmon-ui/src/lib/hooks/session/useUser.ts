import { useCookies } from "react-cookie"

export const useUser = () => {
  const [cookies] = useCookies(['token'])
  return [{loggedIn: !!cookies['token']}]
}
