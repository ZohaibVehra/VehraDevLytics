export default function LoginPage() {
  return (
    <>
      <button onClick={() => {
        window.location.href = "http://localhost:3000/auth/github"
      }}>
        Login with GitHub
      </button>
      <h1 className="text-blue-500">hi</h1>
    </>
  )
}