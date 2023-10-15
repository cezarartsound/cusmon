import { Snackbar, Alert, AlertProps } from "@mui/material"
import { FC, createContext, useCallback, useContext, useState } from "react"

interface AlertHook {
  success: (msg: string) => void,
  warn: (msg: string) => void,
  error: (msg: string) => void,
  info: (msg: string) => void,
}

const AlertContext = createContext<AlertHook>({
  success: () => {},
  warn: () => {},
  error: () => {},
  info: () => {},
})

export const useAlert = (): AlertHook => useContext(AlertContext) 

export const useFetch = (): {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
} => {
  const alert = useAlert()
  return {
    fetch: (input, init) => fetch(input, init)
      .then(async r => {
        if (r.ok && (!init || init.method === 'GET')) return r
        switch(r.status) {
          case 200:
            alert.success('Success')
            break
          case 400: 
            alert.warn('Invalid request')
            break
          case 500: 
            alert.error('Internal error')
            break
        }
        return r
      })
  }
} 

export const AlertProvider: FC<{children: JSX.Element|JSX.Element[]}> = (props) => {

  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<string>('')
  const [severity, setSeverity] = useState<AlertProps['severity']>('warning')

  const handleClose = useCallback(() => setOpen(false), [setOpen])

  const success = (msg: string) => {console.log(msg); setSeverity('success'); setMessage(msg); setOpen(true)}
  const warn = (msg: string) => {console.log(msg); setSeverity('warning'); setMessage(msg); setOpen(true)}
  const error = (msg: string) => {console.log(msg); setSeverity('error'); setMessage(msg); setOpen(true)}
  const info = (msg: string) => {console.log(msg); setSeverity('info'); setMessage(msg); setOpen(true)}

  return (
    <AlertContext.Provider value={{success, warn, error, info}}>
      <Snackbar open={open} autoHideDuration={1000 + message.length * 1000/10} onClose={handleClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleClose} severity={severity} sx={{ width: '100%' }}>
          {message}
        </Alert>
      </Snackbar>
      {props.children}
    </AlertContext.Provider>
  )
}