export class FinancesClient {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    this.apiKey = apiKey
  }

  async get(path: string) {
    return this.request('GET', path)
  }

  async post(path: string, body?: unknown) {
    return this.request('POST', path, body)
  }

  async delete(path: string) {
    return this.request('DELETE', path)
  }

  async request(method: string, path: string, body?: unknown) {
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = {
      'X-API-Key': this.apiKey,
    }

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    const data = await response.json()

    if (!response.ok) {
      const message =
        data?.error || data?.issues?.[0]?.message || `HTTP ${response.status}`
      throw new Error(message)
    }

    return data
  }
}
