import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  if (response.status === 403 || response.status === 500) {
    console.log('Deleting token')
    cookies().delete('token')
  }

  return response
}
