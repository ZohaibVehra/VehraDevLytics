import { useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

    useEffect(() => {
        const token = searchParams.get("token")
        const githubAccessToken = searchParams.get("githubAccessToken")

        if (!token || !githubAccessToken) {
            navigate("/")
            return
        }

        localStorage.setItem("token", token)
        localStorage.setItem("githubAccessToken", githubAccessToken)

        navigate("/dashboard")
    }, [searchParams, navigate])

  return <div>Logging you in...</div>
}