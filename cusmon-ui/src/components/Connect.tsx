'use client'
import 'react'
import { useLogin } from '@/lib/hooks/session/useLogin'
import { useUser } from '@/lib/hooks/session/useUser'
import { Button, TextField } from '@mui/material'
import { FC, useState } from 'react'
import { useLogout } from '@/lib/hooks/session/useLogout'
import { useCookies } from 'react-cookie'

const expiryDate = new Date
expiryDate.setHours(expiryDate.getHours() + 8)

export const Connect: FC<{
  onConnected: (tables: string[]) => void,
}> = ({
  onConnected,
}) => {

  const [login] = useLogin()
  const [logout] = useLogout()
  const [user] = useUser()
  const [cookies, setCookie] = useCookies()

  const [username, setUsername] = useState(cookies['USERNAME'] ?? 'cusmon-app')
  const [password, setPassword] = useState(cookies['PASSWORD'])
  const [server, setServer] = useState(cookies['SERVER'] ?? 'cluster0.aaaa.mongodb.net')
  const [parameters, setParameters] = useState(cookies['SERVER_PARAMETERS'] ?? 'retryWrites=true&w=majority')
  
  const [connecting, setConnecting] = useState(false)  

  const onClick = async () => {
      if (!user.loggedIn) {
        setConnecting(true)
        login(username, password, server, parameters)
          .then(t => {
            t && onConnected(t)
            setCookie('USERNAME', username)
            setCookie('PASSWORD', password, {secure: true, expires: expiryDate})
            setCookie('SERVER', server, {secure: true})
            setCookie('SERVER_PARAMETERS', parameters)
          })
          .finally(() => setConnecting(false))
      } else {
        logout()
      }
  }

  const cnHideIfLoggedIn = user.loggedIn ? 'hidden lg:inline-flex' : ''

  return (
    <div className={`flex gap-3 flex-col lg:flex-row`}>
      <TextField size='small' label='Username' onChange={e => setUsername(e.target.value)} value={username}/>
      <TextField className={cnHideIfLoggedIn} type='password' size='small' label='Password' onChange={e => setPassword(e.target.value)} value={password}/>
      <TextField className={`grow ${cnHideIfLoggedIn}`} size='small' label='Server' onChange={e => setServer(e.target.value)} value={server}/>
      <TextField className={`grow ${cnHideIfLoggedIn}`} size='small' label='Parameters' onChange={e => setParameters(e.target.value)} value={parameters}/>
      <Button disabled={connecting} variant='outlined' onClick={onClick}>{user.loggedIn ? 'Disconnect' : 'Connect'}</Button>
    </div> 
  )
}
